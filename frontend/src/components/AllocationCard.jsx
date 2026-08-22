import React, { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Check, Cloud, Cpu, Sparkles, X } from "lucide-react";
import { lookup } from "../data/universe.js";
import { getSettings } from "../lib/api.js";
import { fmtMoney, fmtPct } from "../lib/format.js";
import { computeMetrics, portfolioWalk } from "../lib/quant.js";
import { Card, CardHeader, PrimaryButton, GhostButton, useThemeColors } from "./ui.jsx";

const BASE = 10000;

const REDUCED_MOTION =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Sub-1% slices show one decimal so they don't read as phantom "0%" rows. */
function fmtSlice(v) {
  return v > 0 && v < 1 ? v.toFixed(1) : v.toFixed(0);
}

/* --------------------------- optimize comparison --------------------------- */

function CompareRow({ ticker, yours, optimized, color, grown }) {
  const delta = optimized - yours;
  return (
    <div className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-3 py-1.5">
      <span className="tnum text-xs font-semibold text-ink">{ticker}</span>
      <div className="space-y-1" aria-hidden="true">
        <div className="h-1 overflow-hidden rounded-full bg-panel2">
          <div className="h-full rounded-full opacity-40 transition-all duration-700 ease-out" style={{ width: grown ? `${Math.min(yours, 100)}%` : "0%", background: "var(--ink-3)" }} />
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-panel2">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: grown ? `${Math.min(optimized, 100)}%` : "0%", background: color }} />
        </div>
      </div>
      <span className="tnum text-right text-xs">
        <span className="text-ink3">{yours.toFixed(0)}%</span>
        <span className="mx-1 text-ink3" aria-hidden="true">→</span>
        <span className={`font-semibold ${Math.abs(delta) < 1 ? "text-ink2" : delta > 0 ? "text-up" : "text-down"}`}>
          {optimized.toFixed(0)}%
        </span>
      </span>
    </div>
  );
}

function MetricDelta({ label, before, after, fmt, higherIsBetter = true }) {
  const improved = higherIsBetter ? after >= before : after <= before;
  return (
    <div className="rounded-xl border border-line bg-panel2/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3">{label}</p>
      <p className="tnum mt-1 text-[13px] text-ink2">
        {fmt(before)} <span className="text-ink3" aria-hidden="true">→</span>{" "}
        <span className={`font-semibold ${improved ? "text-up" : "text-down"}`}>{fmt(after)}</span>
      </p>
    </div>
  );
}

function RunningState({ count }) {
  // stage the message: a Render free-tier engine takes a while to cold-start
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="mx-5 mb-5 rounded-xl border border-line bg-panel2/60 p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-ink2">
        <Sparkles size={15} className="pulse-dot" aria-hidden="true" />
        {slow
          ? "Waking the cloud engine (free tiers nap, the math doesn't)…"
          : `Analyzing a year of price history for ${count} assets…`}
      </div>
      <div className="mt-3 space-y-2">
        <div className="shimmer h-2 w-3/4 rounded-full" />
        <div className="shimmer h-2 w-1/2 rounded-full" />
      </div>
    </div>
  );
}

function OptimizePanel({ optimization, portfolio, metrics, colorFor, onApply, onDismiss }) {
  const { status, result } = optimization;
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (status !== "done") {
      setGrown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [status]);

  const rows = useMemo(() => {
    if (status !== "done" || !result) return [];
    const yoursBy = Object.fromEntries(portfolio.holdings.map((h) => [h.s, h.w]));
    const total = portfolio.holdings.reduce((s, h) => s + h.w, 0) || 1;
    const optimizedBy = Object.fromEntries(result.allocations.map((a) => [a.ticker, a.weight]));
    // include holdings the engine zeroed out (spectral selection drops dust),
    // so "TLT 40% → 0%" is visible instead of the row silently vanishing
    const tickers = [
      ...result.allocations.map((a) => a.ticker),
      ...portfolio.holdings.filter((h) => h.w > 0 && !(h.s in optimizedBy)).map((h) => h.s),
    ];
    return tickers.map((ticker) => ({
      ticker,
      yours: ((yoursBy[ticker] || 0) / total) * 100,
      optimized: (optimizedBy[ticker] || 0) * 100,
    }));
  }, [status, result, portfolio.holdings]);

  // apples-to-apples: score BOTH weight vectors with the same local engine,
  // so the delta shows the effect of the weights — not a change of estimator
  const localAfter = useMemo(() => {
    if (status !== "done" || !result) return null;
    return computeMetrics(result.allocations.map((a) => ({ s: a.ticker, w: a.weight * 100 })));
  }, [status, result]);

  if (status === "running") return <RunningState count={portfolio.holdings.length} />;
  if (status !== "done" || !result || !localAfter) return null;

  return (
    <div className="anim-fade-up mx-5 mb-5 rounded-xl border border-line bg-panel2/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3">Your weights → risk-balanced</p>
        <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-ink3">
          {result.source === "cloud" ? <Cloud size={11} aria-hidden="true" /> : <Cpu size={11} aria-hidden="true" />}
          {result.source === "cloud"
            ? `Cloud engine${getSettings().backendUrl.includes("onrender.com") ? " · Render" : ""} · live data`
            : "Local engine · offline"}
        </span>
      </div>

      <div className="mt-2">
        {rows.map((r) => (
          <CompareRow key={r.ticker} {...r} color={colorFor(r.ticker)} grown={grown} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricDelta label="Return" before={metrics.expReturn} after={localAfter.expReturn} fmt={(x) => fmtPct(x)} />
        <MetricDelta label="Volatility" before={metrics.vol} after={localAfter.vol} fmt={(x) => fmtPct(x)} higherIsBetter={false} />
        <MetricDelta label="Sharpe" before={metrics.sharpe} after={localAfter.sharpe} fmt={(x) => x.toFixed(2)} />
      </div>

      <p className="mt-2 text-[10px] leading-4 text-ink3">
        The engine sizes positions by risk structure only. It never forecasts returns, so any return change
        comes from trailing-year data and may not repeat.
        {result.source === "cloud" && (
          <span className="tnum">
            {" "}Cloud engine's own read: {fmtPct(result.metrics.expected_return)} return · {fmtPct(result.metrics.volatility)} vol · Sharpe {result.metrics.sharpe_ratio.toFixed(2)}.
          </span>
        )}
      </p>

      {result.ai_insight && (
        <p className="mt-3 border-t border-line pt-3 font-serif text-[15px] leading-6 text-ink2">
          {result.ai_insight}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <PrimaryButton onClick={onApply} className="flex flex-1 items-center justify-center gap-2">
          <Check size={15} aria-hidden="true" /> Apply optimized weights
        </PrimaryButton>
        <GhostButton onClick={onDismiss} className="flex items-center gap-1.5">
          <X size={14} aria-hidden="true" /> Keep mine
        </GhostButton>
      </div>
    </div>
  );
}

/* --------------------------------- donut ---------------------------------- */

export default function AllocationCard({ portfolio, metrics, colorFor, theme, budget = BASE, onBudgetChange, optimization, onOptimize, onApplyOptimization, onDismissOptimization }) {
  const [hovered, setHovered] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const themeColors = useThemeColors(theme);

  const commitBudget = () => {
    const n = Math.round(Number(budgetDraft.replace(/[^0-9.]/g, "")));
    if (Number.isFinite(n) && n >= 100 && n <= 10000000) onBudgetChange?.(n);
    setEditingBudget(false);
  };

  const { chartData, endValue, endReturn } = useMemo(() => {
    const total = portfolio.holdings.reduce((s, h) => s + h.w, 0);
    const rows = portfolio.holdings
      .filter((h) => h.w > 0 && lookup(h.s))
      .sort((a, b) => b.w - a.w);
    // dataviz rule: never more than 8 slices — fold the tail into "Other"
    // (exactly 8 fits without folding; folding a single holding is silly)
    const foldNeeded = rows.length > 8;
    const top = foldNeeded ? rows.slice(0, 7) : rows;
    const rest = foldNeeded ? rows.slice(7) : [];
    const data = top.map((h) => ({
      name: h.s,
      full: lookup(h.s).n,
      value: h.w,
      color: colorFor(h.s),
    }));
    if (rest.length) {
      data.push({
        name: "Other",
        full: `${rest.length} smaller holdings`,
        value: rest.reduce((s, h) => s + h.w, 0),
        color: themeColors.ink3,
      });
    }
    const walk = portfolioWalk(portfolio.holdings, 64);
    const end = walk[walk.length - 1];
    return {
      chartData: data,
      endValue: budget * end,
      endReturn: end - 1,
      totalPct: total,
    };
  }, [portfolio.holdings, colorFor, themeColors, budget]);

  const hoveredSlice = hovered != null ? chartData[hovered] : null;
  const empty = chartData.length === 0;

  return (
    <Card className="relative flex flex-col">
      <CardHeader
        eyebrow="Allocation"
        title="Portfolio composition"
        right={
          portfolio.holdings.length > 0 && (
            <PrimaryButton
              onClick={onOptimize}
              disabled={
                optimization.status === "running" ||
                portfolio.holdings.filter((h) => h.w > 0).length < 2
              }
              className="flex items-center gap-2 !py-2"
            >
              <Sparkles size={14} aria-hidden="true" />
              Optimize with AI
            </PrimaryButton>
          )
        }
      />

      <div className="relative mx-auto h-[264px] w-full max-w-[400px]" aria-hidden={empty ? "true" : undefined}>
        {!empty ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="88%"
                  paddingAngle={2.5}
                  stroke={themeColors.panel}
                  strokeWidth={2}
                  isAnimationActive={!REDUCED_MOTION}
                  animationDuration={600}
                  onMouseEnter={(_, i) => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} style={{ outline: "none", cursor: "pointer" }} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute left-1/2 top-1/2 w-40 -translate-x-1/2 -translate-y-1/2 text-center">
              {editingBudget ? (
                <form
                  className="pointer-events-auto"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitBudget();
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3">Investment</p>
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    <span className="text-sm text-ink3" aria-hidden="true">$</span>
                    <input
                      autoFocus
                      inputMode="numeric"
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      onBlur={commitBudget}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingBudget(false);
                      }}
                      aria-label="Investment amount in dollars"
                      className="tnum w-24 rounded-lg border border-linestrong bg-bg px-2 py-1 text-center text-sm font-semibold text-ink outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[9px] text-ink3">enter to apply</p>
                </form>
              ) : hoveredSlice ? (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3">{hoveredSlice.name}</p>
                  <p className="tnum mt-1 text-2xl font-bold tracking-tight text-ink">
                    {fmtSlice(hoveredSlice.value)}%
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-ink3">{hoveredSlice.full}</p>
                </>
              ) : (
                <>
                  <p className="tnum text-[26px] font-bold tracking-tight text-ink">{fmtMoney(endValue)}</p>
                  <p className={`tnum mt-0.5 text-xs font-medium ${endReturn >= 0 ? "text-up" : "text-down"}`}>
                    {fmtPct(endReturn, { sign: true })} · 1y simulated
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetDraft(String(budget));
                      setEditingBudget(true);
                    }}
                    aria-label={`Change the investment amount, currently ${fmtMoney(budget)}`}
                    className="pointer-events-auto -m-2 mt-1 p-2 text-[10px] text-ink3 underline decoration-dotted underline-offset-2 transition hover:text-ink"
                  >
                    on {fmtMoney(budget)}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-28 w-28 rounded-full border-[10px] border-panel2" aria-hidden="true" />
              <p className="text-sm text-ink3">Add holdings to see the allocation</p>
            </div>
          </div>
        )}
      </div>

      {!empty && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 pb-4" aria-label="Chart legend">
          {chartData.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-xs text-ink2">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} aria-hidden="true" />
              <span className="font-medium text-ink">{d.name}</span>
              <span className="tnum text-ink3">{fmtSlice(d.value)}%</span>
            </span>
          ))}
        </div>
      )}

      <OptimizePanel
        optimization={optimization}
        portfolio={portfolio}
        metrics={metrics}
        colorFor={colorFor}
        onApply={onApplyOptimization}
        onDismiss={onDismissOptimization}
      />
    </Card>
  );
}
