"""
Quant engine interface.

This is a WORKING STUB so the backend/API can be built and tested end-to-end
without waiting on Role 1. It does real data fetching + a simple inverse-
volatility weighting (not the full L1-penalized spectral selection method
from the paper). Swap the body of `calculate_optimal_portfolio` for Role 1's
real implementation once it's ready — the function signature and return
shape below are the contract the rest of the backend depends on, so keep
them the same.

Expected return shape (matches the API response contract):
{
    "allocations": [{"ticker": "AAPL", "weight": 0.45}, ...],
    "metrics": {
        "expected_return": 0.085,
        "volatility": 0.12,
        "sharpe_ratio": 0.70,
    },
}
"""

import numpy as np
import yfinance as yf


def calculate_optimal_portfolio(tickers: list[str]) -> dict:
    if not tickers or len(tickers) < 1:
        raise ValueError("At least one ticker is required")

    # --- 1. Fetch historical adjusted close prices ---
    data = yf.download(tickers, period="1y", auto_adjust=True, progress=False)["Close"]

    # yfinance returns a Series instead of a DataFrame for a single ticker
    if not hasattr(data, "columns"):
        data = data.to_frame(name=tickers[0])

    data = data.dropna()
    if data.empty:
        raise ValueError("No price data returned for the given tickers")

    returns = data.pct_change().dropna()

    # --- 2. STUB WEIGHTING: inverse-volatility (placeholder for spectral selection) ---
    vol = returns.std()
    inv_vol = 1 / vol
    weights = inv_vol / inv_vol.sum()

    # --- 3. Portfolio metrics ---
    mean_daily_returns = returns.mean()
    cov_matrix = returns.cov()

    expected_return = float(np.dot(weights, mean_daily_returns) * 252)
    volatility = float(
        np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
    )
    risk_free_rate = 0.0
    sharpe_ratio = (
        float((expected_return - risk_free_rate) / volatility) if volatility > 0 else 0.0
    )

    allocations = [
        {"ticker": ticker, "weight": round(float(weights[ticker]), 4)}
        for ticker in weights.index
    ]

    return {
        "allocations": allocations,
        "metrics": {
            "expected_return": round(expected_return, 4),
            "volatility": round(volatility, 4),
            "sharpe_ratio": round(sharpe_ratio, 4),
        },
    }
