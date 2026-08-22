from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    mode: Literal["custom", "preset"]
    preset_id: Optional[str] = None
    tickers: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "mode": "custom",
                "preset_id": None,
                "tickers": ["AAPL", "MSFT", "TSLA"],
            }
        }


class Allocation(BaseModel):
    ticker: str
    weight: float


class Metrics(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float


class AnalyzeResponse(BaseModel):
    allocations: List[Allocation]
    metrics: Metrics
    ai_insight: str
