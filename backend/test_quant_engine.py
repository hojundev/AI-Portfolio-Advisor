"""Unit tests for the Role 1 quant engine.

These tests are deterministic and do NOT hit the network: price data is
injected directly, so they run fast and reliably in CI / during the sprint.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import quant_engine as qe
import presets
import tickers as tk


# --------------------------------------------------------------------------- #
# Fixtures: synthetic price data
# --------------------------------------------------------------------------- #
def _make_prices(n_days: int = 300, cols=("A", "B", "C"), seed: int = 0) -> pd.DataFrame:
    """Random-walk price frame so covariance/returns are well-defined."""
    rng = np.random.default_rng(seed)
    daily = rng.normal(loc=0.0005, scale=0.01, size=(n_days, len(cols)))
    prices = 100 * np.cumprod(1 + daily, axis=0)
    idx = pd.date_range("2022-01-01", periods=n_days, freq="B")
    return pd.DataFrame(prices, columns=list(cols), index=idx)


# --------------------------------------------------------------------------- #
# compute_metrics
# --------------------------------------------------------------------------- #
def test_compute_metrics_shape_and_contract():
    prices = _make_prices()
    result = qe.compute_metrics(["A", "B", "C"], [0.5, 0.3, 0.2], prices=prices)

    assert set(result) == {"allocations", "metrics"}
    assert set(result["metrics"]) == {"expected_return", "volatility", "sharpe_ratio"}
    for a in result["allocations"]:
        assert set(a) == {"ticker", "weight"}


def test_compute_metrics_weights_sum_to_one():
    prices = _make_prices()
    result = qe.compute_metrics(["A", "B", "C"], [2.0, 1.0, 1.0], prices=prices)  # unnormalized
    total = sum(a["weight"] for a in result["allocations"])
    assert total == pytest.approx(1.0, abs=1e-3)


def test_compute_metrics_length_mismatch_raises():
    prices = _make_prices()
    with pytest.raises(ValueError):
        qe.compute_metrics(["A", "B"], [1.0], prices=prices)


# --------------------------------------------------------------------------- #
# Optimizer: long-only guarantees
# --------------------------------------------------------------------------- #
def _optimize_from_prices(prices: pd.DataFrame) -> dict:
    """Run the optimizer's math directly on a price frame (no network)."""
    returns = qe.daily_returns(prices)
    cov = returns.cov().to_numpy()
    raw = qe.spectral_select_weights(cov)
    weights = qe._to_long_only(raw)
    return {
        "allocations": qe._allocations(list(prices.columns), weights),
        "metrics": qe._portfolio_metrics(weights, returns),
        "_weights": weights,
    }


def test_optimizer_long_only_no_negative_weights():
    prices = _make_prices(cols=("A", "B", "C", "D"), seed=7)
    res = _optimize_from_prices(prices)
    assert np.all(res["_weights"] >= -1e-12)
    for a in res["allocations"]:
        assert a["weight"] >= 0


def test_optimizer_weights_sum_to_one():
    prices = _make_prices(cols=("A", "B", "C", "D"), seed=7)
    res = _optimize_from_prices(prices)
    assert res["_weights"].sum() == pytest.approx(1.0, abs=1e-9)
    assert sum(a["weight"] for a in res["allocations"]) == pytest.approx(1.0, abs=1e-3)


def test_to_long_only_clips_and_renormalizes():
    w = np.array([0.8, -0.5, 0.7])
    out = qe._to_long_only(w)
    assert np.all(out >= 0)
    assert out.sum() == pytest.approx(1.0)
    assert out[1] == 0.0


def test_to_long_only_all_negative_falls_back_to_equal_weight():
    w = np.array([-0.3, -0.5, -0.2])
    out = qe._to_long_only(w)
    assert out == pytest.approx(np.array([1 / 3, 1 / 3, 1 / 3]))


# --------------------------------------------------------------------------- #
# Spectral selection behaviour
# --------------------------------------------------------------------------- #
def test_spectral_single_asset_is_full_weight():
    cov = np.array([[0.04]])
    w = qe.spectral_select_weights(cov)
    assert w == pytest.approx(np.array([1.0]))


def test_spectral_handles_correlated_assets_without_blowup():
    # Two nearly-identical assets + one independent. Naive Sigma^{-1} would
    # produce huge offsetting bets; spectral selection + long-only must not.
    cov = np.array([
        [0.04, 0.039, 0.0],
        [0.039, 0.04, 0.0],
        [0.0, 0.0, 0.05],
    ])
    w = qe._to_long_only(qe.spectral_select_weights(cov))
    assert w.sum() == pytest.approx(1.0)
    assert np.all(w >= 0)
    assert np.all(w <= 1.0 + 1e-9)


# --------------------------------------------------------------------------- #
# Presets & ticker universe config
# --------------------------------------------------------------------------- #
def test_presets_have_required_fields_and_weights_sum_to_one():
    for p in presets.get_presets():
        assert {"id", "name", "description", "allocations"} <= set(p)
        total = sum(a["weight"] for a in p["allocations"])
        assert total == pytest.approx(1.0, abs=1e-6), f"{p['id']} weights != 1"


def test_all_preset_baskets_returns_ticker_lists():
    baskets = presets.all_preset_baskets()
    assert len(baskets) == len(presets.get_presets())
    assert all(isinstance(b, list) and b for b in baskets)


def test_ticker_universe_nonempty_and_shaped():
    universe = tk.get_ticker_universe()
    assert len(universe) > 0
    for t in universe:
        assert set(t) == {"symbol", "name"}


def test_is_known_ticker():
    assert tk.is_known_ticker("aapl")   # case-insensitive
    assert not tk.is_known_ticker("NOTATICKER")
