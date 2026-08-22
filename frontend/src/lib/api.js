/*
 * Cloud engine client + user settings.
 *
 * analyze() prefers the FastAPI backend (live yfinance history). If it is
 * unreachable or slow, it silently falls back to the local engine so the
 * demo never stalls. The result carries `source: "cloud" | "local"`.
 */

import { optimizeLocal, explainOptimization } from "./quant.js";

const SETTINGS_KEY = "folio:settings";

const DEFAULT_SETTINGS = {
  // The team's Render deploy is the default; VITE_BACKEND_URL / VITE_API_URL
  // override it at build time (e.g. point local dev at localhost:8000), and
  // Settings can override at runtime. Free tier cold-starts ~30-60s after
  // idle — the optimizer's "waking the cloud engine" state absorbs that.
  backendUrl:
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL ||
    "https://portfolio-optimizer-api-xj6p.onrender.com",
  elevenKey: "",
  elevenVoice: "21m00Tcm4TlvDq8ikWAM", // Rachel
  base44AppId: "",
  base44Key: "",
};

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export const ELEVEN_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel · calm, precise" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam · deep, confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella · warm, friendly" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel · broadcast anchor" },
];

/**
 * Run the optimizer for a list of symbols.
 * Returns { allocations:[{ticker,weight}], metrics:{expected_return,volatility,sharpe_ratio}, ai_insight, source }.
 */
export async function analyze(symbols) {
  const { backendUrl } = getSettings();
  if (backendUrl) {
    try {
      // generous timeout: a Render free-tier service takes ~50s to cold-start
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", tickers: symbols }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.allocations) && data.metrics) {
          // Gemini key missing / free-tier quota gone → the backend sends one
          // canned paragraph. Keep the cloud's spectral weights but swap in
          // the on-device explanation so the rationale stays specific.
          if (
            !data.ai_insight ||
            data.ai_insight.startsWith("Your portfolio was optimized to balance risk and return")
          ) {
            data.ai_insight = explainOptimization(data.allocations, data.metrics, "spectral");
          }
          return { ...data, source: "cloud" };
        }
      }
    } catch {
      /* fall through to local */
    }
  }
  const local = optimizeLocal(symbols);
  if (!local) return null;
  return {
    ...local,
    ai_insight: explainOptimization(local.allocations, local.metrics),
    source: "local",
  };
}
