"""
AI Translation Layer — turns quant output into a beginner-friendly explanation
using the Gemini API. Role 4 owns refining the actual prompt wording (test it
in Google AI Studio); this module just handles the API call plumbing.
"""

import os
import google.generativeai as genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = genai.GenerativeModel("gemini-3.6-flash")
    return _model


FALLBACK_INSIGHT = (
    "Your portfolio was optimized to balance risk and return based on how "
    "each asset has historically moved. Assets with higher volatility were "
    "given smaller weights to help protect you from big swings."
)


def generate_insight(tickers: list[str], allocations: list[dict], metrics: dict) -> str:
    """
    Calls Gemini to translate allocations + risk metrics into a short,
    beginner-friendly explanation. Falls back to a generic message if the
    API key is missing or the call fails, so a demo never breaks on stage.
    """
    if not GEMINI_API_KEY:
        return FALLBACK_INSIGHT

    allocation_lines = "\n".join(
        f"- {a['ticker']}: {a['weight'] * 100:.1f}%" for a in allocations
    )

    prompt = f"""You are a friendly financial educator explaining a portfolio
optimization result to a complete beginner investor. Do not give financial
advice or tell them to buy/sell. Just explain, in 2-3 plain-English sentences,
why the optimizer chose these weights based on the risk metrics below.

Tickers analyzed: {', '.join(tickers)}

Optimized allocations:
{allocation_lines}

Risk metrics:
- Expected annual return: {metrics['expected_return'] * 100:.1f}%
- Annual volatility: {metrics['volatility'] * 100:.1f}%
- Sharpe ratio: {metrics['sharpe_ratio']:.2f}

Keep it concise, warm, and jargon-free. Mention at least one specific ticker
by name and why its weight makes sense."""

    try:
        model = _get_model()
        response = model.generate_content(prompt)
        text = (response.text or "").strip()
        return text if text else FALLBACK_INSIGHT
    except Exception as e:
        # Never let an AI hiccup take down the demo
        print(f"[ai_insight] Gemini call failed: {e}")
        return FALLBACK_INSIGHT
