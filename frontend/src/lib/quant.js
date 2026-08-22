/*
 * Client-side quant engine.
 *
 * Computes real portfolio math (expected return, volatility via a
 * correlation model, Sharpe, beta, yield, diversification, sector mix)
 * instantly as the user drags sliders. Mirrors the backend contract so the
 * cloud engine (/api/analyze) and this local engine are interchangeable in
 * shape — the cloud engine estimates from live 1-year history, this one
 * from the baked snapshot, so figures won't agree to the decimal.
 */

import { lookup } from "../data/universe.js";

// Cash isn't free: Sharpe is excess return over ~T-bill yield.
export const RISK_FREE = 0.04;

/* ------------------------------ correlations ----------------------------- */

// Funds that hold (nearly) the same exposure — owning two of them is not
// diversification, and the model must say so.
const SAME_EXPOSURE = [
  ["SPY", "VOO", "VTI", "IVV"],
  ["GLD", "IAU"],
  ["BND", "AGG"],
  ["VEA", "EFA"],
];
const EXPOSURE_GROUP = new Map();
SAME_EXPOSURE.forEach((group, gi) => group.forEach((s) => EXPOSURE_GROUP.set(s, gi)));

// Credit trades with equities far more than Treasuries do.
const CREDIT = new Set(["HYG", "LQD"]);

function assetClass(t) {
  if (t.cls === "bond") return "bond";
  if (t.cls === "gold") return "gold";
  if (t.cls === "cmdty") return "cmdty";
  if (t.cls === "crypto") return "crypto";
  return "equity";
}

/** Pairwise correlation from a sector/asset-class model.
 *  Note: this block model is not guaranteed positive semi-definite over the
 *  full universe (min eigenvalue ≈ −5 across the full list), but w'Σw was
 *  verified non-negative over the entire long-only simplex; the sqrt clamp
 *  below is a belt-and-braces guard, not a load-bearing fix. */
export function correlation(a, b) {
  if (a.s === b.s) return 1;
  const ga = EXPOSURE_GROUP.get(a.s);
  if (ga !== undefined && ga === EXPOSURE_GROUP.get(b.s)) return 0.98;

  const ca = assetClass(a);
  const cb = assetClass(b);

  // high-yield / IG credit vs equity behaves like diluted equity risk
  if ((CREDIT.has(a.s) && cb === "equity") || (CREDIT.has(b.s) && ca === "equity")) return 0.55;

  const pair = [ca, cb].sort().join("|");
  switch (pair) {
    case "bond|bond":
      return 0.85;
    case "bond|equity":
      return -0.1;
    case "bond|gold":
      return 0.2;
    case "equity|gold":
      return 0.05;
    case "cmdty|equity":
      return 0.25;
    case "bond|cmdty":
      return -0.05;
    case "cmdty|gold":
      return 0.35;
    case "cmdty|cmdty":
      return 0.6;
    case "gold|gold":
      return 0.9;
    case "crypto|equity":
      return 0.5;
    case "crypto|gold":
      return 0.1;
    case "bond|crypto":
      return 0.0;
    case "cmdty|crypto":
      return 0.25;
    case "crypto|crypto":
      return 0.9;
    default: {
      // equity vs equity
      const broadA = a.cls === "etf" && (a.sec === "Broad Market" || a.sec === "International" || a.sec === "Dividend");
      const broadB = b.cls === "etf" && (b.sec === "Broad Market" || b.sec === "International" || b.sec === "Dividend");
      if (broadA || broadB) return 0.75;
      if (a.sec === b.sec) return 0.68;
      return 0.38;
    }
  }
}

/* -------------------------------- metrics -------------------------------- */

/**
 * holdings: [{ s, w }] with w in percent (0-100).
 * Returns the full metric set for the UI. Weights are treated as fractions
 * of the *allocated* portion for risk math, so a half-built portfolio still
 * shows sane numbers.
 */
export function computeMetrics(holdings) {
  const rows = holdings
    .map((h) => ({ ...h, t: lookup(h.s) }))
    .filter((h) => h.t && h.w > 0);

  const totalPct = holdings.reduce((sum, h) => sum + (h.w || 0), 0);
  if (rows.length === 0) {
    return {
      empty: true,
      zeroWeights: holdings.length > 0, // has rows, but everything sits at 0%
      totalPct,
      expReturn: 0, vol: 0, sharpe: 0, beta: 0, yld: 0,
      divScore: 0, effN: 0, hhi: 0,
      sectors: [], flags: [], grade: "–", topHolding: null,
    };
  }

  const allocated = rows.reduce((sum, h) => sum + h.w, 0);
  const w = rows.map((h) => h.w / allocated);

  const expReturn = rows.reduce((sum, h, i) => sum + w[i] * h.t.r, 0);
  const beta = rows.reduce((sum, h, i) => sum + w[i] * h.t.b, 0);
  const yld = rows.reduce((sum, h, i) => sum + w[i] * h.t.y, 0);

  // volatility via w' Σ w with the correlation model
  let variance = 0;
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      variance +=
        w[i] * w[j] * correlation(rows[i].t, rows[j].t) * rows[i].t.v * rows[j].t.v;
    }
  }
  const vol = Math.sqrt(Math.max(variance, 0));
  const sharpe = vol > 0 ? (expReturn - RISK_FREE) / vol : 0;

  // concentration & diversification
  const hhi = w.reduce((sum, x) => sum + x * x, 0);
  const effN = 1 / hhi;
  const sectorMap = new Map();
  for (let i = 0; i < rows.length; i++) {
    const sec = rows[i].t.sec;
    sectorMap.set(sec, (sectorMap.get(sec) || 0) + w[i]);
  }
  const sectors = [...sectorMap.entries()]
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => b.weight - a.weight);

  const classes = new Set(rows.map((h) => assetClass(h.t)));
  // 0-100: equal-weight-equivalent holdings (up to ~8), sector spread, multi-asset bonus
  const divScore = Math.round(
    Math.min(effN / 8, 1) * 55 +
      Math.min(sectors.length / 5, 1) * 30 +
      Math.min((classes.size - 1) / 2, 1) * 15
  );

  const sorted = [...rows].sort((a, b) => b.w - a.w);
  const topHolding = { s: sorted[0].s, pct: (sorted[0].w / allocated) * 100 };

  // concentration rules only bite on single companies — a 60% total-market
  // fund is itself diversified, so funds are exempt
  const sortedStocks = sorted.filter((h) => h.t.cls === "stock");
  const topStock = sortedStocks.length
    ? { s: sortedStocks[0].s, pct: (sortedStocks[0].w / allocated) * 100 }
    : null;

  // "Broad Market" & friends are fund buckets, not real sectors
  const FUND_BUCKETS = new Set(["Broad Market", "International", "Dividend", "Bonds", "Gold", "Commodities", "Crypto"]);
  const realSectors = sectors.filter((s) => !FUND_BUCKETS.has(s.name));
  const topSector = realSectors[0];

  /* health flags */
  const flags = [];
  if (Math.round(totalPct) !== 100) {
    flags.push({
      level: "warn",
      text:
        totalPct > 100
          ? `Allocations add up to ${Math.round(totalPct)}%; trim ${Math.round(totalPct - 100)}%.`
          : `${Math.round(100 - totalPct)}% of the portfolio is still unallocated.`,
    });
  }
  if (topStock && topStock.pct > 35)
    flags.push({
      level: "risk",
      text: `${topStock.s} is ${topStock.pct.toFixed(0)}% of the portfolio; a single company above 35% dominates your risk.`,
    });
  if (topSector && topSector.weight > 0.55 && rows.length > 1)
    flags.push({
      level: "warn",
      text: `${(topSector.weight * 100).toFixed(0)}% sits in ${topSector.name}; a sector shock would hit most of the portfolio at once.`,
    });
  if (rows.length < 3)
    flags.push({
      level: "warn",
      text: "Fewer than 3 holdings; most of the benefit of diversification comes from the first 8-10 positions.",
    });
  if (vol > 0.3)
    flags.push({
      level: "risk",
      text: `Volatility of ${(vol * 100).toFixed(0)}% is high; expect swings of roughly ±${(vol * 100).toFixed(0)}% in a typical year.`,
    });
  if (!classes.has("bond") && !classes.has("gold") && vol > 0.18)
    flags.push({
      level: "info",
      text: "No bonds or gold; adding a defensive sleeve usually cuts volatility more than it costs in return.",
    });
  if (flags.length === 0)
    flags.push({ level: "good", text: "Balanced allocation with no concentration red flags." });

  const riskCount = flags.filter((f) => f.level === "risk").length;
  const warnCount = flags.filter((f) => f.level === "warn").length;
  const grade = riskCount > 0 ? "C" : warnCount > 1 ? "B−" : warnCount === 1 ? "B+" : "A";

  return {
    empty: false,
    totalPct, expReturn, vol, sharpe, beta, yld,
    divScore, effN, hhi, sectors, flags, grade, topHolding,
    holdingsCount: rows.length,
  };
}

/* --------------------------- deterministic walks -------------------------- */

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand) {
  return (rand() + rand() + rand() + rand() + rand() + rand() - 3) / Math.sqrt(0.5);
}

const MARKET_VOL = 0.13; // ≈ S&P 500 trailing-year vol in the snapshot

// One shared market shock series: assets co-move through it (beta-scaled),
// so the drawn paths exhibit the same correlation structure the risk model
// computes, instead of one independent walk per ticker.
const marketShockCache = new Map();
function marketShocks(n) {
  if (marketShockCache.has(n)) return marketShockCache.get(n);
  const rand = mulberry32(hashSeed("__MARKET__"));
  const shocks = Array.from({ length: n }, () => gauss(rand));
  marketShockCache.set(n, shocks);
  return shocks;
}

const walkCache = new Map();

/**
 * Deterministic 1y price path for a symbol (n points, starts at 1.0, ends
 * exactly at 1 + r). Volatility is honest: each step mixes the shared market
 * shock (by the asset's beta-implied correlation) with idiosyncratic noise
 * at the asset's full vol; the endpoint is pinned by a constant drift shift,
 * which preserves the path's volatility instead of squeezing it.
 */
export function priceWalk(symbol, n = 64) {
  const key = `${symbol}:${n}`;
  if (walkCache.has(key)) return walkCache.get(key);
  const t = lookup(symbol);
  const r = t ? t.r : 0.05;
  const v = t ? t.v : 0.2;
  const b = t ? t.b : 1;
  const rand = mulberry32(hashSeed(symbol));
  const market = marketShocks(n);

  // beta-implied correlation to the market factor (signed, clamped)
  const rho = Math.max(-0.95, Math.min(0.95, (b * MARKET_VOL) / Math.max(v, 0.01)));
  const idioScale = Math.sqrt(1 - rho * rho);
  const step = v / Math.sqrt(n);
  const drift = Math.log(1 + r) / n;

  const logP = [0];
  for (let i = 1; i < n; i++) {
    const shock = rho * market[i] + idioScale * gauss(rand);
    logP.push(logP[i - 1] + drift + step * shock);
  }
  // pin the endpoint with a linear drift correction (constant per-step shift
  // — volatility of the increments is untouched)
  const target = Math.log(1 + r);
  const correction = target - logP[n - 1];
  const points = logP.map((lp, i) => Math.exp(lp + (correction * i) / (n - 1)));
  walkCache.set(key, points);
  return points;
}

/** Weighted portfolio walk (growth of $1) from the holdings' walks. */
export function portfolioWalk(holdings, n = 64) {
  const rows = holdings
    .map((h) => ({ ...h, t: lookup(h.s) }))
    .filter((h) => h.t && h.w > 0);
  if (rows.length === 0) return Array.from({ length: n }, () => 1);
  const allocated = rows.reduce((sum, h) => sum + h.w, 0);
  const walks = rows.map((h) => priceWalk(h.s, n));
  const out = [];
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let j = 0; j < rows.length; j++) v += (rows[j].w / allocated) * walks[j][i];
    out.push(v);
  }
  return out;
}

/* ----------------------------- local optimizer ---------------------------- */

/**
 * Inverse-volatility (risk-balanced) weighting — the offline twin of the
 * cloud engine. It sizes positions by stability only; it never sees returns.
 */
export function optimizeLocal(symbols) {
  const rows = symbols.map(lookup).filter(Boolean);
  if (rows.length === 0) return null;
  const invVol = rows.map((t) => 1 / Math.max(t.v, 0.01));
  const sum = invVol.reduce((a, b) => a + b, 0);
  const allocations = rows.map((t, i) => ({
    ticker: t.s,
    weight: invVol[i] / sum,
  }));
  const metrics = computeMetrics(
    allocations.map((a) => ({ s: a.ticker, w: a.weight * 100 }))
  );
  return {
    allocations,
    metrics: {
      expected_return: metrics.expReturn,
      volatility: metrics.vol,
      sharpe_ratio: metrics.sharpe,
    },
  };
}

/* ------------------------------ narrative -------------------------------- */

const LEVEL_WORDS = [
  [0.12, "conservative"],
  [0.18, "moderate"],
  [0.26, "growth-oriented"],
  [1, "aggressive"],
];

export function riskWord(vol) {
  for (const [cap, word] of LEVEL_WORDS) if (vol <= cap) return word;
  return "aggressive";
}

/** "a moderate profile" but "an aggressive profile". */
export function article(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/** Plain-English recap of the current portfolio for the briefing card. */
export function buildNarrative(portfolio, m) {
  if (m.empty) {
    return m.zeroWeights
      ? "Every holding in this portfolio sits at 0%; raise a slider to bring it to life and the numbers will follow."
      : "This portfolio is empty. Search for a ticker on the left to start building, or ask the advisor where to begin.";
  }
  const parts = [];
  const top = m.topHolding;
  const topSector = m.sectors[0];
  parts.push(
    `${portfolio.name} is ${article(riskWord(m.vol))} ${riskWord(m.vol)} portfolio of ${m.holdingsCount} holdings with an expected return near ${(m.expReturn * 100).toFixed(1)}% and volatility of ${(m.vol * 100).toFixed(1)}%.`
  );
  if (top)
    parts.push(
      `Its largest position is ${top.s} at ${top.pct.toFixed(0)}%${
        topSector ? `, and ${(topSector.weight * 100).toFixed(0)}% of the book sits in ${topSector.name}` : ""
      }.`
    );
  const sharpeRead =
    m.sharpe >= 0.8
      ? "strong risk-adjusted efficiency"
      : m.sharpe >= 0.4
        ? "reasonable risk-adjusted efficiency"
        : "thin reward over cash for the risk taken";
  parts.push(`A Sharpe ratio of ${m.sharpe.toFixed(2)} (over a 4% cash rate) suggests ${sharpeRead}.`);
  const firstIssue = m.flags.find((f) => f.level === "risk" || f.level === "warn");
  if (firstIssue) parts.push(firstIssue.text);
  return parts.join(" ");
}

/** Local stand-in for the backend's Gemini insight, in the same friendly voice. */
export function explainOptimization(allocations, metrics) {
  if (!allocations?.length) return "";
  const sorted = [...allocations].sort((a, b) => b.weight - a.weight);
  const biggest = sorted[0];
  const smallest = sorted[sorted.length - 1];
  const bigT = lookup(biggest.ticker);
  const smallT = lookup(smallest.ticker);
  const sentences = [
    `The engine sized positions by stability: steadier assets absorb more capital, jumpier ones less.`,
  ];
  if (bigT)
    sentences.push(
      `${biggest.ticker} gets the largest slice (${(biggest.weight * 100).toFixed(1)}%) because its ${(bigT.v * 100).toFixed(0)}% volatility is among the lowest in your basket.`
    );
  if (smallT && smallest.ticker !== biggest.ticker)
    sentences.push(
      `${smallest.ticker} is trimmed to ${(smallest.weight * 100).toFixed(1)}%; at ${(smallT.v * 100).toFixed(0)}% volatility it would otherwise dominate the portfolio's swings.`
    );
  sentences.push(
    `Together that lands at roughly ${(metrics.expected_return * 100).toFixed(1)}% expected return for ${(metrics.volatility * 100).toFixed(1)}% volatility (Sharpe ${metrics.sharpe_ratio.toFixed(2)}).`
  );
  return sentences.join(" ");
}
