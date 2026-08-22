/*
 * Crash Test — deterministic scenario stress tests.
 *
 * Each scenario shocks every holding by asset class and beta, the same way a
 * first-pass risk desk sizing would: equities move with beta, bonds move with
 * duration, gold and commodities follow their historical crisis behavior.
 * Educational approximations, clearly labeled in the UI.
 */

import { lookup } from "../data/universe.js";

// per-class shock (decimal return) for each scenario; equities scale by beta
const SCENARIOS = [
  {
    id: "crash",
    name: "2008-style crash",
    desc: "Equities −40% (beta-scaled), flight to treasuries, credit sells off",
    shocks: { equityBase: -0.4, bondLong: 0.12, bondCore: 0.06, bondShort: 0.02, bondCredit: -0.2, bondTips: 0.02, gold: 0.05, cmdty: -0.25, crypto: -0.65 },
  },
  {
    id: "rates",
    name: "Rate shock +2%",
    desc: "Long bonds hit hardest, growth stocks compress, value holds better",
    shocks: { equityBase: -0.1, bondLong: -0.18, bondCore: -0.07, bondShort: -0.02, bondCredit: -0.09, bondTips: -0.05, gold: -0.04, cmdty: 0.02, crypto: -0.3 },
  },
  {
    id: "inflation",
    name: "Inflation spike",
    desc: "Real assets shine, bonds suffer, equities wobble",
    shocks: { equityBase: -0.08, bondLong: -0.12, bondCore: -0.06, bondShort: -0.01, bondCredit: -0.07, bondTips: 0.02, gold: 0.18, cmdty: 0.22, crypto: 0.05 },
  },
];

function bondBucket(t) {
  // rough duration/credit buckets by ticker
  if (t.s === "TLT") return "bondLong";
  if (t.s === "SHY" || t.s === "IEI") return "bondShort";
  if (t.s === "HYG" || t.s === "LQD") return "bondCredit"; // credit ≠ Treasuries
  if (t.s === "TIP") return "bondTips";
  return "bondCore"; // BND, AGG, IEF
}

function shockFor(t, shocks) {
  if (t.cls === "bond") return shocks[bondBucket(t)];
  if (t.cls === "gold") return shocks.gold;
  if (t.cls === "cmdty") return shocks.cmdty;
  if (t.cls === "crypto") return shocks.crypto;
  // equities: beta-scaled base shock, capped so low-beta staples still move
  const beta = Math.max(0.3, Math.abs(t.b));
  return shocks.equityBase * beta;
}

/**
 * holdings: [{s, w}] → [{id, name, desc, impact, dollars, worst: {s, hit}}]
 * impact is the portfolio return in the scenario; dollars on `base`.
 */
export function stressTest(holdings, base = 10000) {
  const rows = holdings
    .map((h) => ({ ...h, t: lookup(h.s) }))
    .filter((h) => h.t && h.w > 0);
  if (rows.length === 0) return [];
  const allocated = rows.reduce((sum, h) => sum + h.w, 0);

  return SCENARIOS.map((sc) => {
    let impact = 0;
    let worst = null;
    for (const h of rows) {
      const hit = shockFor(h.t, sc.shocks);
      const contribution = (h.w / allocated) * hit;
      impact += contribution;
      // rank the culprit by loss CONTRIBUTION (weight × shock), not raw shock
      if (!worst || contribution < worst.contribution) worst = { s: h.s, hit, contribution };
    }
    return {
      id: sc.id,
      name: sc.name,
      desc: sc.desc,
      impact,
      dollars: Math.round(impact * base),
      worst,
    };
  });
}

/** One-sentence read for the advisor chat. */
export function stressSummary(holdings, base = 10000) {
  const results = stressTest(holdings, base);
  if (!results.length) return null;
  const crash = results.find((r) => r.id === "crash");
  const best = [...results].sort((a, b) => b.impact - a.impact)[0];
  return { results, crash, best };
}
