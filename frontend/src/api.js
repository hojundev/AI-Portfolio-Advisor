/**
 * Centralized API client for the Portfolio Optimizer backend.
 *
 * In development the Vite dev-server proxy forwards /api/* to localhost:8000.
 * In production set the VITE_API_URL env var to the deployed Render URL
 * (e.g. "https://portfolio-optimizer-api.onrender.com").  If the var is unset
 * the client uses a relative path, which works with the Vite proxy.
 */

const BASE = import.meta.env.VITE_API_URL ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    // Try to pull a `detail` message from FastAPI's error shape.
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) message = body.detail;
    } catch {
      // ignore — use the generic message
    }
    throw new Error(message);
  }
  return res.json();
}

/**
 * Convert a backend allocation (weight 0–1) to the UI shape (allocation 0–100).
 * This is the ONLY place the conversion happens so the rest of the app can
 * treat allocation as a whole-number percentage.
 */
function normalizeAllocations(allocations) {
  return allocations.map((a) => ({
    ticker: a.ticker,
    allocation: Math.round(a.weight * 10000) / 100, // 0.3214 → 32.14
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * GET /api/presets
 * Returns: { presets: [{ id, name, description, allocations: [{ticker, weight}] }] }
 *
 * We normalize allocations to 0–100 on the way in.
 */
export async function fetchPresets() {
  const data = await request("/api/presets");
  return data.presets.map((p) => ({
    ...p,
    allocations: normalizeAllocations(p.allocations),
  }));
}

/**
 * GET /api/tickers
 * Returns: { tickers: [{ symbol, name }] }
 */
export async function fetchTickers() {
  const data = await request("/api/tickers");
  return data.tickers; // [{ symbol, name }]
}

/**
 * POST /api/analyze
 *
 * @param {{ mode: "custom"|"preset", tickers?: string[], preset_id?: string }} payload
 * Returns: { allocations: [{ticker, allocation}], metrics, ai_insight }
 *          (allocations already converted to 0–100)
 */
export async function analyzePortfolio(payload) {
  const data = await request("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    allocations: normalizeAllocations(data.allocations),
    metrics: data.metrics,
    ai_insight: data.ai_insight,
  };
}
