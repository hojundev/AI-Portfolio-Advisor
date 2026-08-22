# Preset ticker baskets for Track A (1-click benchmarks).
# The quant engine still runs the spectral selection algorithm on these —
# presets just fix the input basket instead of letting the user type tickers.

PRESETS = {
    "classic_60_40": {
        "label": "The Classic 60/40",
        "tickers": ["VTI", "BND"],
    },
    "dalio_all_weather": {
        "label": "Dalio All-Weather",
        "tickers": ["VTI", "TLT", "IEF", "GLD", "DBC"],
    },
    "tech_growth": {
        "label": "Tech Growth",
        "tickers": ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"],
    },
}


def get_preset_tickers(preset_id: str) -> list[str]:
    if preset_id not in PRESETS:
        raise ValueError(f"Unknown preset_id: {preset_id}")
    return PRESETS[preset_id]["tickers"]
