"""Preset portfolios: fixed allocations used by well-known investment firms.

These are NOT optimized. They are trustworthy, real-world templates that a
beginner can mimic on their first time investing. Each preset ships with the
actual tickers and target weights the firm publishes.

IMPORTANT — PLACEHOLDER WEIGHTS
-------------------------------
The weights below are placeholders so the app runs end-to-end today. The
project owner is sourcing the real allocations from each firm and will replace
the `allocations` lists here. Rules when replacing:
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
        "id": "all_weather",
        "name": "All-Weather (Bridgewater-style)",
        "description": "Balanced across stocks, bonds, and commodities to stay "
                       "steady in any market.",
        # TODO(owner): replace with the real published allocation.
        "allocations": [
            {"ticker": "VTI", "weight": 0.30},
            {"ticker": "TLT", "weight": 0.40},
            {"ticker": "IEI", "weight": 0.15},
            {"ticker": "GLD", "weight": 0.075},
            {"ticker": "DBC", "weight": 0.075},
        ],
    },
    {
        "id": "sixty_forty",
        "name": "Classic 60/40",
        "description": "A time-tested mix of 60% stocks for growth and 40% "
                       "bonds for stability.",
        # TODO(owner): replace with the real published allocation.
        "allocations": [
            {"ticker": "VTI", "weight": 0.60},
            {"ticker": "BND", "weight": 0.40},
        ],
    },
    {
        "id": "tech_growth",
        "name": "Tech Growth",
        "description": "Concentrated in high-growth technology leaders. Higher "
                       "risk, higher potential reward.",
        # TODO(owner): replace with the real published allocation.
        "allocations": [
            {"ticker": "AAPL", "weight": 0.25},
            {"ticker": "MSFT", "weight": 0.25},
            {"ticker": "NVDA", "weight": 0.20},
            {"ticker": "GOOGL", "weight": 0.15},
            {"ticker": "AMZN", "weight": 0.15},
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
