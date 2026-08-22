"""Ticker universe for the custom-portfolio search bar.

The frontend search bar queries this list locally (or via /api/tickers) so
typing is instant and doesn't hit yfinance on every keystroke. This is a
curated set of common, liquid US symbols and popular ETFs — enough to build a
sensible portfolio without overwhelming a beginner. Extend as needed.

Role 1 (Data & Quant Engineer) owns this module.
"""

from __future__ import annotations

# (symbol, company/fund name). Kept intentionally curated rather than exhaustive.
TICKER_UNIVERSE: list[dict] = [
    # Mega-cap tech
    {"symbol": "AAPL", "name": "Apple Inc."},
    {"symbol": "MSFT", "name": "Microsoft Corp."},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)"},
    {"symbol": "AMZN", "name": "Amazon.com Inc."},
    {"symbol": "NVDA", "name": "NVIDIA Corp."},
    {"symbol": "META", "name": "Meta Platforms Inc."},
    {"symbol": "TSLA", "name": "Tesla Inc."},
    {"symbol": "AMD", "name": "Advanced Micro Devices Inc."},
    {"symbol": "TSM", "name": "Taiwan Semiconductor Mfg."},
    {"symbol": "AVGO", "name": "Broadcom Inc."},
    # Financials
    {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
    {"symbol": "BAC", "name": "Bank of America Corp."},
    {"symbol": "V", "name": "Visa Inc."},
    {"symbol": "MA", "name": "Mastercard Inc."},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway Inc. (Class B)"},
    # Healthcare
    {"symbol": "JNJ", "name": "Johnson & Johnson"},
    {"symbol": "UNH", "name": "UnitedHealth Group Inc."},
    {"symbol": "LLY", "name": "Eli Lilly & Co."},
    {"symbol": "PFE", "name": "Pfizer Inc."},
    # Consumer
    {"symbol": "KO", "name": "Coca-Cola Co."},
    {"symbol": "PEP", "name": "PepsiCo Inc."},
    {"symbol": "WMT", "name": "Walmart Inc."},
    {"symbol": "MCD", "name": "McDonald's Corp."},
    {"symbol": "NKE", "name": "Nike Inc."},
    {"symbol": "DIS", "name": "Walt Disney Co."},
    # Energy / industrials
    {"symbol": "XOM", "name": "Exxon Mobil Corp."},
    {"symbol": "CVX", "name": "Chevron Corp."},
    {"symbol": "CAT", "name": "Caterpillar Inc."},
    {"symbol": "BA", "name": "Boeing Co."},
    # Broad-market & bond ETFs (useful for balanced portfolios)
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF"},
    {"symbol": "VOO", "name": "Vanguard S&P 500 ETF"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust (Nasdaq-100)"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust"},
    {"symbol": "BND", "name": "Vanguard Total Bond Market ETF"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF"},
    {"symbol": "IEI", "name": "iShares 3-7 Year Treasury Bond ETF"},
    {"symbol": "GLD", "name": "SPDR Gold Shares"},
    {"symbol": "DBC", "name": "Invesco DB Commodity Index Tracking Fund"},
]

_VALID_SYMBOLS = {t["symbol"] for t in TICKER_UNIVERSE}


def get_ticker_universe() -> list[dict]:
    """Return the full searchable ticker list for the frontend search bar."""
    return TICKER_UNIVERSE


def is_known_ticker(symbol: str) -> bool:
    """True if the symbol is in our curated universe."""
    return symbol.strip().upper() in _VALID_SYMBOLS
