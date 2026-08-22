"""Temp integration check after restructure. Run from backend/: python3 _verify_integration.py"""
import numpy as np
import pandas as pd

from app import data


def _fake_download(tickers_tuple, period):
    rng = np.random.default_rng(0)
    n = 300
    daily = rng.normal(0.0005, 0.01, size=(n, len(tickers_tuple)))
    prices = 100 * np.cumprod(1 + daily, axis=0)
    idx = pd.date_range("2022-01-01", periods=n, freq="B")
    return pd.DataFrame(prices, columns=list(tickers_tuple), index=idx)


data._download = _fake_download
data.clear_cache()

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("health:", client.get("/").status_code)

r = client.get("/api/presets")
presets = r.json()["presets"]
print("presets:", r.status_code, [p["id"] for p in presets])

pid = presets[0]["id"]
r = client.post("/api/analyze", json={"mode": "preset", "preset_id": pid})
body = r.json()
fixed = {a["ticker"]: a["weight"] for a in presets[0]["allocations"]}
got = {a["ticker"]: a["weight"] for a in body["allocations"]}
print("preset analyze:", r.status_code, "| fixed weights preserved:", fixed == got, "| ai_insight:", bool(body["ai_insight"]))

r = client.post("/api/analyze", json={"mode": "custom", "tickers": ["AAPL", "MSFT", "NVDA"]})
body = r.json()
w = [a["weight"] for a in body["allocations"]]
print("custom analyze:", r.status_code, "| long-only:", all(x >= 0 for x in w), "| sum:", round(sum(w), 4))

data._download = lambda t, p: pd.DataFrame()
data.clear_cache()
r = client.post("/api/analyze", json={"mode": "custom", "tickers": ["ZZZINVALID"]})
print("bad ticker:", r.status_code, "->", r.json().get("detail"))

r = client.post("/api/analyze", json={"mode": "preset", "preset_id": "nope"})
print("unknown preset:", r.status_code, "->", r.json().get("detail"))
print("DONE")
