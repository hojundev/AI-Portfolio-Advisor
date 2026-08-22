"""Data ingestion layer.

Fetches historical adjusted-close prices via yfinance, computes daily returns,
and caches results in memory so repeat requests (and demo clicks) are instant.

Role 1 (Data & Quant Engineer) owns this module.
"""

from __future__ import annotations

import logging
from functools import lru_cache

import pandas as pd

logger = logging.getLogger(__name__)

# ~2 years of daily data is enough to estimate a stable covariance matrix
# without over-weighting stale regime data.
DEFAULT_PERIOD = "2y"


class DataError(Exception):
    """Raised when price data cannot be fetched or is unusable."""


def _download(tickers_tuple: tuple[str, ...], period: str) -> pd.DataFrame:
    """Raw yfinance download. Separated out so it can be mocked in tests."""
    import yfinance as yf  # imported lazily so tests without network can patch it

    data = yf.download(
        list(tickers_tuple),
        period=period,
        auto_adjust=True,   # adjusted close accounts for splits/dividends
        progress=False,
    )
    if data is None or len(data) == 0:
        raise DataError(f"No data returned for tickers: {tickers_tuple}")

    # yfinance returns a column MultiIndex for multiple tickers; grab Close.
    if isinstance(data.columns, pd.MultiIndex):
        close = data["Close"]
    else:
        # single ticker -> flat columns
        close = data[["Close"]]
        close.columns = list(tickers_tuple)
    return close


@lru_cache(maxsize=256)
def _fetch_prices_cached(tickers_tuple: tuple[str, ...], period: str) -> pd.DataFrame:
    """Cached inner fetch. Key is (sorted tickers tuple, period) so identical
    baskets share a cache entry regardless of input order."""
    close = _download(tickers_tuple, period)

    # Drop tickers that came back completely empty (bad symbol, delisted, etc.).
    close = close.dropna(axis=1, how="all")
    # Forward/back fill small gaps (holidays, sparse trading days).
    close = close.ffill().bfill()
    # Drop any remaining rows with NaNs to keep the covariance well-defined.
    close = close.dropna(axis=0, how="any")

    if close.shape[1] == 0:
        raise DataError("All requested tickers were invalid or had no data.")
    if close.shape[0] < 30:
        raise DataError("Not enough price history to compute reliable metrics.")

    return close


def fetch_prices(tickers: list[str], period: str = DEFAULT_PERIOD) -> pd.DataFrame:
    """Return cleaned adjusted-close prices for the given tickers.

    Args:
        tickers: list of ticker symbols, e.g. ["AAPL", "MSFT"].
        period: yfinance period string (default "2y").

    Returns:
        DataFrame of prices indexed by date, one column per valid ticker.

    Raises:
        DataError: if no usable data could be fetched.
    """
    if not tickers:
        raise DataError("No tickers provided.")
    # Normalize + sort so cache is order-insensitive and case-insensitive.
    key = tuple(sorted({t.strip().upper() for t in tickers if t.strip()}))
    if not key:
        raise DataError("No valid tickers provided.")
    return _fetch_prices_cached(key, period)


def daily_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Simple daily returns from a price frame."""
    return prices.pct_change().dropna(how="any")


def prewarm(baskets: list[list[str]], period: str = DEFAULT_PERIOD) -> None:
    """Pre-fetch a set of baskets (e.g. the presets) at startup so the first
    real request is instant. Failures are logged, not raised, so a single bad
    basket never blocks server startup."""
    for basket in baskets:
        try:
            fetch_prices(basket, period)
        except Exception as exc:  # noqa: BLE001 - startup best-effort
            logger.warning("Pre-warm failed for %s: %s", basket, exc)


def clear_cache() -> None:
    """Clear the in-memory price cache (useful in tests)."""
    _fetch_prices_cached.cache_clear()
