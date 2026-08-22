import os

from dotenv import load_dotenv

load_dotenv()  # reads .env into environment variables before anything else runs

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.quant import calculate_optimal_portfolio
from app.presets import get_preset_tickers
from app.ai_insight import generate_insight

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


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    # --- Resolve tickers from either mode ---
    if payload.mode == "preset":
        if not payload.preset_id:
            raise HTTPException(status_code=400, detail="preset_id is required when mode is 'preset'")
        try:
            tickers = get_preset_tickers(payload.preset_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif payload.mode == "custom":
        if not payload.tickers or len(payload.tickers) == 0:
            raise HTTPException(status_code=400, detail="tickers list is required when mode is 'custom'")
        tickers = [t.upper().strip() for t in payload.tickers]
    else:
        raise HTTPException(status_code=400, detail="mode must be 'custom' or 'preset'")

    # --- Run the quant engine (Role 1's function) ---
    try:
        result = calculate_optimal_portfolio(tickers)
    except ValueError as e:
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
