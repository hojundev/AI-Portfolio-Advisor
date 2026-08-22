"""Preset portfolios: fixed allocations used by well-known investment firms.

These are NOT optimized. They are trustworthy, real-world templates that a
beginner can mimic on their first time investing. Each preset ships with the
actual tickers and target weights the firm publishes.

Rules when editing an allocation:
  * weights must be floats that sum to 1.0 (within a small tolerance)
  * every ticker must be a valid symbol yfinance can fetch
  * keep the id/name/description fields

Role 1 (Data & Quant Engineer) owns this module.
"""

from __future__ import annotations

# Each preset: id, human-readable name, one-line beginner description, and the
# fixed allocation (ticker -> weight). Replace `allocations` with real data.
PRESETS: list[dict] = [
    {
        "id": "berkshire_hathaway",
        "name": "Berkshire Hathaway",
        "description": "Warren Buffett's concentrated, blue-chip portfolio — "
                       "durable businesses held for the long term.",
        "allocations": [
            {"ticker": "AAPL", "weight": 0.32},
            {"ticker": "AXP", "weight": 0.25},
            {"ticker": "KO", "weight": 0.16},
            {"ticker": "GOOGL", "weight": 0.14},
            {"ticker": "BAC", "weight": 0.13},
        ],
    },
    {
        "id": "pershing_square",
        "name": "Pershing Square",
        "description": "Bill Ackman's concentrated bets on high-quality, "
                       "cash-generative businesses.",
        "allocations": [
            {"ticker": "BN", "weight": 0.23},
            {"ticker": "AMZN", "weight": 0.22},
            {"ticker": "UBER", "weight": 0.20},
            {"ticker": "MSFT", "weight": 0.19},
            {"ticker": "QSR", "weight": 0.16},
        ],
    },
    {
        "id": "ark_innovation",
        "name": "ARK Innovation ETF",
        "description": "Cathie Wood's high-growth bets on disruptive innovation "
                       "— genomics, AI, crypto, and more. Higher risk, higher "
                       "potential reward.",
        "allocations": [
            {"ticker": "TSLA", "weight": 0.32},
            {"ticker": "TEM", "weight": 0.22},
            {"ticker": "CRSP", "weight": 0.17},
            {"ticker": "COIN", "weight": 0.15},
            {"ticker": "TWST", "weight": 0.14},
        ],
    },
]


def get_presets() -> list[dict]:
    """Return the list of preset portfolios for the left-panel tabs."""
    return PRESETS


def get_preset(preset_id: str) -> dict | None:
    """Look up a single preset by id, or None if not found."""
    return next((p for p in PRESETS if p["id"] == preset_id), None)


def all_preset_baskets() -> list[list[str]]:
    """Return each preset's ticker list, for data pre-warming at startup."""
    return [[a["ticker"] for a in p["allocations"]] for p in PRESETS]
