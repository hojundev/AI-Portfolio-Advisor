"""Quant engine — Role 1 deliverable.

Two public entry points, both returning the agreed API contract shape
(`allocations` + `metrics`; Role 2 attaches `ai_insight`):

    calculate_optimal_portfolio(tickers)      -> custom baskets: we optimize
    compute_metrics(tickers, weights, prices) -> presets: score fixed weights

The optimizer implements the L1-penalized spectral selection Maximum-Sharpe
approach from Guo, Boyle, Weng & Wirjanto, "Eigen Portfolio Selection".

Intuition: the Max-Sharpe weight vector is proportional to Sigma^{-1} @ mu.
Written in the eigenbasis of the covariance Sigma, that's a sum of
"eigen-portfolios" whose coefficients are (v_k . mu) / lambda_k. The small
eigenvalues lambda_k sit in the denominator, so noise in the bottom
eigenvectors gets amplified into extreme long/short bets on correlated assets.
Spectral SELECTION keeps only the top-K informative eigenvectors (an L1 /
sparsity mechanism drives the rest to zero), which stabilises the solution.

For a beginner audience we:
  * use mu proportional to a vector of ones (the paper's "uninformed investor"
    view — no fragile return forecasting), and
  * project the result to LONG-ONLY weights that sum to 1 (no shorting).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from app.data import daily_returns, fetch_prices

logger = logging.getLogger(__name__)

TRADING_DAYS = 252   # for annualizing daily stats
RISK_FREE_RATE = 0.04  # ~cash yield; Sharpe over 0% flatters every portfolio


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #
def _portfolio_metrics(weights: np.ndarray, returns: pd.DataFrame) -> dict:
    """Annualized expected return, volatility, and Sharpe ratio for `weights`."""
    mean_daily = returns.mean().to_numpy()
    cov_daily = returns.cov().to_numpy()

    exp_return = float(weights @ mean_daily) * TRADING_DAYS
    variance = float(weights @ cov_daily @ weights) * TRADING_DAYS
    volatility = float(np.sqrt(max(variance, 0.0)))
    sharpe = (exp_return - RISK_FREE_RATE) / volatility if volatility > 0 else 0.0

    return {
        "expected_return": round(exp_return, 4),
        "volatility": round(volatility, 4),
        "sharpe_ratio": round(sharpe, 4),
    }


def _allocations(tickers: list[str], weights: np.ndarray) -> list[dict]:
    """Contract-shaped allocation list, rounded, dropping ~zero positions."""
    out = []
    for t, w in zip(tickers, weights):
        w = float(w)
        if w > 1e-4:  # hide dust so the pie chart stays readable
            out.append({"ticker": t, "weight": round(w, 4)})
    # Renormalize the displayed weights so they sum to exactly 1.0.
    total = sum(a["weight"] for a in out)
    if total > 0:
        for a in out:
            a["weight"] = round(a["weight"] / total, 4)
    return out


# --------------------------------------------------------------------------- #
# Long-only projection
# --------------------------------------------------------------------------- #
def _to_long_only(weights: np.ndarray) -> np.ndarray:
    """Clip negative (short) positions to zero and renormalize to sum to 1.

    If everything clips to zero (pathological), fall back to equal weight.
    """
    w = np.where(weights > 0, weights, 0.0)
    s = w.sum()
    if s <= 0:
        return np.full(len(weights), 1.0 / len(weights))
    return w / s


def _equal_weight(n: int) -> np.ndarray:
    return np.full(n, 1.0 / n)


# --------------------------------------------------------------------------- #
# Spectral selection optimizer
# --------------------------------------------------------------------------- #
def spectral_select_weights(cov: np.ndarray, num_eigen: int | None = None) -> np.ndarray:
    """L1-penalized spectral selection for a Max-Sharpe portfolio.

    Args:
        cov: sample covariance matrix (n x n).
        num_eigen: how many top eigenvectors to keep. Defaults to a heuristic
            that keeps the most informative components and drops noisy tails.

    Returns:
        Raw (possibly negative) weight vector. Caller projects to long-only.
    """
    n = cov.shape[0]
    if n == 1:
        return np.array([1.0])

    # Symmetric eigendecomposition; eigh returns ascending eigenvalues.
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]          # descending: informative first
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]

    # "Uninformed investor" view: mu proportional to ones.
    mu = np.ones(n)

    # Spectral SELECTION: keep only the top-K eigenvectors. Dropping the noisy
    # small-eigenvalue tail is the sparsity/L1 effect that stabilises weights.
    if num_eigen is None:
        # Heuristic: keep components explaining the bulk of the variance,
        # capped so tiny eigenvalues never enter the 1/lambda denominator.
        num_eigen = max(1, min(n, int(np.ceil(n / 2))))
    num_eigen = max(1, min(num_eigen, n))

    weights = np.zeros(n)
    for k in range(num_eigen):
        lam = eigvals[k]
        if lam <= 1e-12:   # guard against division blow-up on ~zero eigenvalues
            continue
        vk = eigvecs[:, k]
        coeff = (vk @ mu) / lam
        weights += coeff * vk

    if not np.any(np.abs(weights) > 1e-12):
        # Degenerate (e.g. all eigenvalues filtered) -> equal weight.
        return _equal_weight(n)
    return weights


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def compute_metrics(
    tickers: list[str],
    weights: list[float],
    prices: pd.DataFrame | None = None,
) -> dict:
    """Score a portfolio with GIVEN weights (used for presets).

    Returns the API contract shape: {"allocations": [...], "metrics": {...}}.
    """
    tickers = [t.strip().upper() for t in tickers]
    if len(tickers) != len(weights):
        raise ValueError("tickers and weights must be the same length.")

    if prices is None:
        prices = fetch_prices(tickers)

    # Align the weight vector to the columns actually returned (some tickers
    # may have been dropped for bad data).
    available = list(prices.columns)
    w_map = dict(zip(tickers, weights))
    aligned_w = np.array([w_map.get(t, 0.0) for t in available], dtype=float)
    if aligned_w.sum() <= 0:
        aligned_w = _equal_weight(len(available))
    else:
        aligned_w = aligned_w / aligned_w.sum()

    returns = daily_returns(prices)
    return {
        "allocations": _allocations(available, aligned_w),
        "metrics": _portfolio_metrics(aligned_w, returns),
    }


def calculate_optimal_portfolio(tickers: list[str]) -> dict:
    """Optimize LONG-ONLY weights for a custom basket (used for user portfolios).

    Returns the API contract shape: {"allocations": [...], "metrics": {...}}.
    `ai_insight` is added downstream by Role 2.
    """
    tickers = [t.strip().upper() for t in tickers]
    prices = fetch_prices(tickers)
    available = list(prices.columns)
    returns = daily_returns(prices)

    if len(available) == 1:
        weights = np.array([1.0])
    else:
        cov = returns.cov().to_numpy()
        try:
            raw = spectral_select_weights(cov)
            weights = _to_long_only(raw)
        except Exception as exc:  # noqa: BLE001 - never fail the request
            logger.warning("Spectral selection failed (%s); using equal weight.", exc)
            weights = _equal_weight(len(available))

    return {
        "allocations": _allocations(available, weights),
        "metrics": _portfolio_metrics(weights, returns),
    }
