/*
 * The advisor chat brain.
 *
 * A grounded, deterministic engine: every answer is computed from the actual
 * portfolio (no canned replies), and certain messages return an `action` the
 * app executes (optimize, add/set/remove a holding). Big answers use the
 * Quicken-Assist structure: What I found / Items to watch / Bottom line.
 */

import { lookup, searchUniverse, UNIVERSE } from "../data/universe.js";
import { article, computeMetrics, riskWord } from "./quant.js";
import { stressSummary } from "./stress.js";
import { fmtPct } from "./format.js";

const TICKER_RE = /\b([A-Z]{1,5}(?:-[A-Z])?)\b/g;

// Universe symbols that collide with everyday English words. These only count
// as tickers when the user actually typed them in caps (or with a $ prefix).
const AMBIGUOUS = new Set(["T", "SO", "LOW", "COST", "NOW", "CAT", "MA", "V", "F", "O", "DE", "MS", "GS", "BA", "ALL", "IT", "A"]);

function typedAsTicker(raw, sym) {
  return new RegExp(`(?:\\$|\\b)${sym.replace("-", "\\-")}\\b`).test(raw);
}

function findTickers(raw) {
  const upper = raw.toUpperCase();
  const hits = [];
  let m;
  while ((m = TICKER_RE.exec(upper))) {
    const t = lookup(m[1]);
    if (!t || hits.some((h) => h.s === t.s)) continue;
    if (AMBIGUOUS.has(t.s) && !typedAsTicker(raw, t.s)) continue;
    hits.push(t);
  }
  // also try full company names ("apple", "nvidia")
  if (hits.length === 0) {
    const words = raw.toLowerCase().match(/[a-z]{3,}/g) || [];
    for (const w of words) {
      if (["the", "and", "add", "set", "what", "about", "should", "portfolio", "stock", "risk", "with", "have", "how", "much", "more", "less"].includes(w)) continue;
      const found = searchUniverse(w, 1);
      if (found.length && found[0].n.toLowerCase().startsWith(w)) {
        hits.push(found[0]);
        break;
      }
    }
  }
  return hits;
}

function pct(x, digits = 1) {
  return fmtPct(x, { digits });
}

/** Asset classes the portfolio does NOT hold yet — never recommend what they already own. */
function missingClasses(portfolio) {
  const owned = new Set(
    portfolio.holdings
      .map((h) => lookup(h.s))
      .filter(Boolean)
      .map((t) => (t.cls === "bond" ? "bonds" : t.cls === "gold" ? "gold" : t.sec === "International" ? "international" : "equity"))
  );
  return [
    ["bonds", "bonds"],
    ["gold", "gold"],
    ["international", "international funds"],
  ]
    .filter(([key]) => !owned.has(key))
    .map(([, label]) => label);
}

/**
 * respond(input, ctx) → { text?, structured?, action? }
 * ctx: { portfolio, metrics, optimization }
 */
export function respond(input, ctx) {
  const raw = input.trim();
  const q = raw.toLowerCase();
  const { portfolio, metrics: m, budget = 10000 } = ctx;
  const fmtBudget = `$${budget.toLocaleString()}`;
  const has = (...words) => words.some((w) => q.includes(w));
  // questions never mutate the portfolio — they get analysis, not actions
  const isQuestion = /\?|^(?:should|why|what|how|would|could|is|are|do|does|can|will)\b/.test(q);

  /* ------------------------------ actions ------------------------------- */

  if (has("optimize", "optimise", "rebalance", "best weights", "ideal weights")) {
    if (m.empty) return { text: "There's nothing to optimize yet. Add a few holdings first, then ask me again." };
    return {
      text: `Running the optimizer on your ${portfolio.holdings.length} holdings, comparing your weights against the risk-balanced allocation now. Check the center panel for the full breakdown.`,
      action: { type: "optimize" },
    };
  }

  const setMatch = isQuestion
    ? null
    : q.match(/^(?:please\s+)?(?:set|change|make)\s+(?:my\s+)?([a-z-]{1,6})(?:\s+(?:to|at))?\s+(\d{1,3}(?:\.\d+)?)\s*%?/);
  if (setMatch) {
    const t = lookup(setMatch[1]);
    const w = Math.min(100, Math.round(parseFloat(setMatch[2]) * 10) / 10);
    if (t && portfolio.holdings.some((h) => h.s === t.s)) {
      return {
        text: `Done: ${t.s} is now ${w}% of ${portfolio.name}. Watch the metrics update live.`,
        action: { type: "set", symbol: t.s, weight: w },
      };
    }
    if (t) return { text: `${t.s} isn't in this portfolio yet. Say "add ${t.s} at ${w}%" and I'll put it in.` };
  }

  const addMatch = isQuestion
    ? null
    : q.match(/^(?:please\s+)?add\s+(?:my\s+)?([a-z-]{1,6})(?:\s+(?:at|with)\s+(\d{1,3}(?:\.\d+)?)\s*%?)?/);
  if (addMatch) {
    const t = lookup(addMatch[1]) || findTickers(raw)[0];
    if (t) {
      if (portfolio.holdings.some((h) => h.s === t.s)) {
        return { text: `${t.s} is already in ${portfolio.name}. Want me to change its weight instead? Try "set ${t.s} to 15%".` };
      }
      const remaining = Math.round((100 - m.totalPct) * 10) / 10;
      let w;
      if (addMatch[2]) {
        w = Math.min(100, Math.round(parseFloat(addMatch[2]) * 10) / 10);
      } else if (remaining >= 1) {
        w = Math.min(10, remaining);
      } else {
        return {
          text: `${portfolio.name} is already fully allocated (${Math.round(m.totalPct)}%). Trim something first, or tell me the size anyway, like "add ${t.s} at 5%", and then hit "Scale to 100%".`,
        };
      }
      return {
        text: `Added ${t.s} (${t.n}) at ${w}%. It's ${article(riskWord(t.v))} ${riskWord(t.v)} ${t.cls === "stock" ? t.sec + " stock" : "fund"} with ${pct(t.v, 0)} volatility.`,
        action: { type: "add", symbol: t.s, weight: w },
      };
    }
  }

  const removeMatch = isQuestion ? null : q.match(/^(?:please\s+)?(?:remove|drop|delete|sell)\s+([a-z-]{1,6})\b/);
  if (removeMatch) {
    const t = lookup(removeMatch[1]);
    if (t && portfolio.holdings.some((h) => h.s === t.s)) {
      return { text: `Removed ${t.s} from ${portfolio.name}.`, action: { type: "remove", symbol: t.s } };
    }
  }

  /* ---------------------------- empty portfolio -------------------------- */

  if (m.empty) {
    return {
      text: `${portfolio.name} is empty right now. Try "add SPY at 60%" and "add BND at 40%" for a classic starting point, or search any of ${UNIVERSE.length} stocks and funds on the left.`,
    };
  }

  /* ------------------------------- analysis ------------------------------ */

  if (has("crash", "stress", "recession", "2008", "market drop", "market fall", "bear market", "survive")) {
    const s = stressSummary(portfolio.holdings, budget);
    if (s) {
      return {
        structured: {
          found: s.results.map(
            (r) =>
              `${r.name}: ${fmtPct(r.impact, { sign: true })} (${r.dollars < 0 ? "−" : "+"}$${Math.abs(r.dollars).toLocaleString()} on ${fmtBudget})${r.impact < 0 && r.worst ? `; ${r.worst.s} takes the biggest hit` : ""}`
          ),
          watch: s.crash && s.crash.impact < -0.25 ? [`A 2008-style crash costs you over a quarter of the portfolio. Bonds or gold would soften that considerably.`] : [],
          bottom: !s.crash
            ? `Full breakdown is in the Crash Test card.`
            : s.crash.impact > -0.15
              ? `A 2008-style crash costs you ${fmtPct(s.crash.impact)} versus roughly −40% for an all-stock portfolio; your defensive sleeve is doing its job.`
              : s.crash.impact > -0.3
                ? `You'd take a real hit (${fmtPct(s.crash.impact)}) but far less than the market's ~−40%. The Crash Test card has the scenario-by-scenario picture.`
                : (() => {
                    const missing = missingClasses(portfolio);
                    const suggestion = missing.length
                      ? `Try "what if I add ${missing[0] === "bonds" ? "TLT" : missing[0] === "gold" ? "GLD" : "VEA"}?" or run the optimizer.`
                      : `The weights lean too hard into risk assets; run the optimizer to rebalance.`;
                    return `A crash would cost you ${fmtPct(s.crash.impact)}, close to full market damage, so there's little ballast here. ${suggestion}`;
                  })(),
        },
      };
    }
  }

  if (has("risk", "risky", "safe", "danger", "volatile", "how bad")) {
    const worst = [...portfolio.holdings]
      .map((h) => lookup(h.s))
      .filter(Boolean)
      .sort((a, b) => b.v - a.v)[0];
    return {
      structured: {
        found: [
          `Portfolio volatility is ${pct(m.vol)}, ${article(riskWord(m.vol))} ${riskWord(m.vol)} profile. In a typical year, swings of ±${pct(m.vol, 0)} are normal.`,
          `Beta is ${m.beta.toFixed(2)}, so a 10% market drop would historically pull this portfolio down about ${(m.beta * 10).toFixed(1)}%.`,
          worst ? `Your jumpiest holding is ${worst.s} at ${pct(worst.v, 0)} volatility.` : null,
        ].filter(Boolean),
        watch: m.flags.filter((f) => f.level !== "good").map((f) => f.text),
        bottom: `Sharpe ratio of ${m.sharpe.toFixed(2)} means you're earning ${m.sharpe >= 0.8 ? "solid" : m.sharpe >= 0.4 ? "acceptable" : "thin"} return over cash per unit of risk. ${m.sharpe < 0.4 ? "The optimizer can rebalance the risk, though it never promises more return." : "Nice balance."}`,
      },
    };
  }

  if (has("diversif", "spread", "concentrat", "all my eggs")) {
    const secLine = m.sectors
      .slice(0, 3)
      .map((s) => `${s.name} ${pct(s.weight, 0)}`)
      .join(", ");
    return {
      structured: {
        found: [
          `Diversification score: ${m.divScore}/100 across ${m.holdingsCount} holdings.`,
          `Your weights spread like ${m.effN.toFixed(1)} equal-sized positions (equal-weight equivalent).`,
          `Top sector exposure: ${secLine}.`,
        ],
        watch: [
          m.topHolding.pct > 30 ? `${m.topHolding.s} alone is ${m.topHolding.pct.toFixed(0)}% of the book.` : null,
          m.sectors[0]?.weight > 0.5 ? `Over half the portfolio rides on ${m.sectors[0].name}.` : null,
        ].filter(Boolean),
        bottom: (() => {
          const missing = missingClasses(portfolio);
          if (m.divScore >= 70) return "Genuinely well spread; most of the diversification benefit is captured.";
          if (m.divScore >= 45)
            return missing.length
              ? `Decent spread; adding ${missing.join(" or ")} would raise it fastest.`
              : "Decent spread; you already span the major asset classes, so evening out position sizes is the next lever.";
          return missing.length
            ? `Concentrated. The first fix: no single position above ~25%, then add ${missing[0]}.`
            : "Concentrated. You span the asset classes but the weights are lopsided; no single position above ~25% is the fix.";
        })(),
      },
    };
  }

  if (has("sharpe")) {
    return {
      text: `Sharpe ratio measures return earned per unit of risk: your return above a 4% cash rate, divided by volatility. Yours is ${m.sharpe.toFixed(2)}: ${pct(m.expReturn)} expected return against ${pct(m.vol)} volatility. Above 0.8 is strong, 0.4–0.8 is typical, near zero means cash almost beat you.`,
    };
  }

  if (has("volatility", "standard deviation")) {
    return {
      text: `Volatility is the size of your portfolio's typical swings. At ${pct(m.vol)}, a normal year could swing the portfolio up or down by roughly that much, and a bad year can be worse. It's computed from each holding's volatility plus how they move together (correlations).`,
    };
  }

  if (has("beta")) {
    return {
      text: `Beta measures sensitivity to the overall market. Yours is ${m.beta.toFixed(2)}: if the S&P 500 moves 1%, your portfolio historically moves about ${m.beta.toFixed(2)}%. Below 1 = defensive, above 1 = amplified.`,
    };
  }

  if (has("expected return", "return", "make money", "how much will")) {
    return {
      text: `Based on trailing 1-year statistics, the expected return is ${pct(m.expReturn)}, a weighted average of what each holding returned. One honest caveat: past returns are a rough guide, not a promise. The volatility number (${pct(m.vol)}) tells you how wide the range around that average really is.`,
    };
  }

  if (has("yield", "dividend", "income")) {
    return {
      text: `The portfolio yields about ${pct(m.yld)} in dividends, roughly $${Math.round(m.yld * budget).toLocaleString()} a year on ${fmtBudget} invested. ${m.yld < 0.015 ? "That's growth-portfolio territory; add dividend payers like SCHD, VYM, or JNJ if income matters to you." : "A meaningful income stream on top of price returns."}`,
    };
  }

  if (has("sector", "industries", "breakdown")) {
    const lines = m.sectors.slice(0, 5).map((s) => `${s.name}: ${pct(s.weight, 0)}`);
    return {
      text: `Sector mix: ${lines.join(" · ")}.${m.sectors[0]?.weight > 0.5 ? ` ${m.sectors[0].name} dominates; a shock there hits most of the book at once.` : " Reasonably spread across sectors."}`,
    };
  }

  if (has("biggest", "largest", "top holding", "top position")) {
    const top = m.topHolding;
    const t = lookup(top.s);
    return {
      text: `Your largest position is ${top.s} (${t?.n}) at ${top.pct.toFixed(1)}% of the portfolio. ${top.pct > 30 ? "That's a concentration risk: above ~30%, one company's bad quarter becomes your bad year." : "A healthy size, no single point of failure."}`,
    };
  }

  /* ------------------------------- what-if ------------------------------- */

  const whatIf = q.match(/what (?:if|about|happens)|should i (?:add|buy)/);
  if (whatIf) {
    const candidates = findTickers(raw).filter((t) => !portfolio.holdings.some((h) => h.s === t.s));
    if (candidates.length) {
      const t = candidates[0];
      const simulated = computeMetrics([
        ...portfolio.holdings.map((h) => ({ s: h.s, w: h.w * 0.9 })),
        { s: t.s, w: m.totalPct * 0.1 || 10 },
      ]);
      const dVol = simulated.vol - m.vol;
      const dRet = simulated.expReturn - m.expReturn;
      return {
        structured: {
          found: [
            `Simulated a 10% position in ${t.s} (${t.n}), trimming everything else proportionally.`,
            `Expected return: ${pct(m.expReturn)} → ${pct(simulated.expReturn)} (${dRet >= 0 ? "+" : ""}${(dRet * 100).toFixed(1)}pp).`,
            `Volatility: ${pct(m.vol)} → ${pct(simulated.vol)} (${dVol >= 0 ? "+" : ""}${(dVol * 100).toFixed(1)}pp).`,
          ],
          watch: [t.v > 0.4 ? `${t.s} itself runs ${pct(t.v, 0)} volatility; it will move the needle on risk.` : null].filter(Boolean),
          bottom: `Sharpe would go ${m.sharpe.toFixed(2)} → ${simulated.sharpe.toFixed(2)}. ${simulated.sharpe > m.sharpe ? `Adding ${t.s} improves risk-adjusted return; say "add ${t.s}" to do it.` : `Slightly worse risk-adjusted; only add ${t.s} if you have conviction beyond the numbers.`}`,
        },
      };
    }
  }

  if (has("60/40", "60 40", "classic")) {
    const bench = computeMetrics([
      { s: "VTI", w: 60 },
      { s: "BND", w: 40 },
    ]);
    return {
      text: `Versus the classic 60/40 (VTI/BND): your portfolio expects ${pct(m.expReturn)} at ${pct(m.vol)} volatility, the 60/40 expects ${pct(bench.expReturn)} at ${pct(bench.vol)}. Sharpe: yours ${m.sharpe.toFixed(2)} vs ${bench.sharpe.toFixed(2)}. ${m.sharpe > bench.sharpe ? "You're beating the benchmark on efficiency; the extra complexity is earning its keep." : "The boring benchmark is more efficient right now; worth asking what each extra holding is adding."}`,
    };
  }

  if (has("what should i", "improve", "advice", "suggest", "recommend", "fix")) {
    const issues = m.flags.filter((f) => f.level !== "good");
    return {
      structured: {
        found: [
          `Grade ${m.grade}: ${pct(m.expReturn)} expected return, ${pct(m.vol)} volatility, Sharpe ${m.sharpe.toFixed(2)}.`,
          `Diversification ${m.divScore}/100 across ${m.holdingsCount} holdings.`,
        ],
        watch: issues.length ? issues.map((f) => f.text) : ["No structural issues found."],
        bottom: issues.length
          ? `Start with the first item, then hit "Optimize with AI" and I'll show you the risk-balanced weights side by side. (Educational analysis, not financial advice.)`
          : `This is a clean allocation. Run "Optimize with AI" to see if the math finds marginal gains.`,
      },
    };
  }

  if (/\b(hi|hello|hey|yo|help)\b/.test(q) || has("what can you")) {
    return {
      text: `Hey, I'm your portfolio advisor, grounded in the live numbers of ${portfolio.name}. Ask me things like "how risky is this?", "what if I add GLD?", "compare to 60/40", or tell me to act: "add NVDA at 10%", "set AAPL to 20%", "optimize".`,
    };
  }

  /* ------------------------------- fallback ------------------------------ */

  return {
    text: `Here's where ${portfolio.name} stands: ${pct(m.expReturn)} expected return, ${pct(m.vol)} volatility, Sharpe ${m.sharpe.toFixed(2)}, grade ${m.grade}. Ask about risk, diversification, sectors, income, or try "what if I add GLD?".`,
  };
}

/** Suggestion chips for the empty state, tailored to the portfolio. */
export function suggestions(portfolio, m) {
  if (m.empty) {
    return ["Add SPY at 60%", "Add BND at 40%", "What can you do?"];
  }
  const chips = ["How risky is this?", "Would I survive a crash?"];
  if (!portfolio.holdings.some((h) => h.s === "GLD")) chips.push("What if I add GLD?");
  else chips.push("Compare to 60/40");
  chips.push("Optimize my portfolio");
  return chips;
}
