const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Keep the original status for non-JSON failures.
  }

  if (!response.ok) {
    const message =
      body?.detail ||
      body?.message ||
      body?.error ||
      `Request failed (${response.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return body;
}

export async function fetchPresets() {
  return request("/api/presets");
}

export async function fetchTickers() {
  return request("/api/tickers");
}

export async function analyzePortfolio(payload) {
  const result = await request("/api/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    ...result,
    allocations: (result.allocations || []).map((item) => {
      if (typeof item === "object" && item !== null) {
        const symbol = item.symbol ?? item.ticker ?? item.name;
        const raw = Number(item.allocation ?? item.weight ?? item.value ?? 0);
        return { ...item, symbol, allocation: raw <= 1 ? raw * 100 : raw };
      }
      return null;
    }).filter(Boolean),
  };
}