import os

from dotenv import load_dotenv

load_dotenv()  # reads .env into environment variables before anything else runs

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.quant_engine import calculate_optimal_portfolio, compute_metrics
from app.presets import get_presets as _get_presets, get_preset
from app.ai_insight import generate_insight
from app.data import DataError
from app.tickers import get_ticker_universe

app = FastAPI(title="AI Portfolio Optimizer API")

# Wide open for the hackathon demo. Tighten allow_origins to your deployed
# frontend URL before the final demo if you want to be tidy about it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "portfolio-optimizer-api"}


@app.get("/api/presets")
def get_presets():
    """List the fixed company presets for the frontend's left-panel tabs."""
    return {"presets": _get_presets()}


@app.get("/api/tickers")
def get_tickers():
    """Return the curated ticker universe for the frontend search bar."""
    return {"tickers": get_ticker_universe()}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    # --- Run the quant engine depending on mode ---
    #   preset : FIXED firm allocation, scored as-is (not optimized)
    #   custom : user tickers, optimized via spectral selection
    try:
        if payload.mode == "preset":
            if not payload.preset_id:
                raise HTTPException(
                    status_code=400,
                    detail="preset_id is required when mode is 'preset'",
                )
            preset = get_preset(payload.preset_id)
            if preset is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown preset_id: {payload.preset_id}",
                )
            # Presets are FIXED firm allocations: score them, don't optimize.
            tickers = [a["ticker"] for a in preset["allocations"]]
            weights = [a["weight"] for a in preset["allocations"]]
            result = compute_metrics(tickers, weights)

        elif payload.mode == "custom":
            if not payload.tickers or len(payload.tickers) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="tickers list is required when mode is 'custom'",
                )
            tickers = [t.upper().strip() for t in payload.tickers]
            result = calculate_optimal_portfolio(tickers)

        else:
            raise HTTPException(status_code=400, detail="mode must be 'custom' or 'preset'")

    except HTTPException:
        raise
    except (DataError, ValueError) as e:
        # Bad tickers / insufficient history / invalid input -> client error.
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quant engine failed: {e}")

    # --- Translate to plain English via Gemini ---
    ai_insight = generate_insight(tickers, result["allocations"], result["metrics"])

    return {
        "allocations": result["allocations"],
        "metrics": result["metrics"],
        "ai_insight": ai_insight,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
