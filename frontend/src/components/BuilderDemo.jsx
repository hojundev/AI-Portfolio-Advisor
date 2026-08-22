import React, { useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { computeMetrics } from "../lib/quant.js";
import { lookup, UNIVERSE } from "../data/universe.js";

/* The landing page's live demo: the real builder pattern wired to the real
   quant engine. Every drag recomputes w'Sigma-w volatility, Sharpe, the
   diversification score, the grade, and the donut. No mock numbers. */

const DEMO_ROWS = [
  { s: "VTI", color: "#2563eb" },
  { s: "TLT", color: "#f97316" },
  { s: "IEF", color: "#10b981" },
  { s: "GLD", color: "#eab308" },
  { s: "DBC", color: "#8b5cf6" },
];

const START_WEIGHTS = { VTI: 30, TLT: 40, IEF: 15, GLD: 7.5, DBC: 7.5 };

function Donut({ slices }) {
  // r chosen so the circumference is exactly 100 units: dasharray in percent
  let start = 0;
  return (
    <svg viewBox="0 0 42 42" className="h-16 w-16 shrink-0" aria-hidden="true">
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" strokeWidth="5" />
      {slices.map((sl) => {
        const offset = 25 - start;
        start += sl.pct;
        return (
          <circle
            key={sl.s}
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            stroke={sl.color}
            strokeWidth="5"
            strokeDasharray={`${Math.max(sl.pct, 0)} ${Math.max(100 - sl.pct, 0)}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dasharray 0.25s ease, stroke-dashoffset 0.25s ease" }}
          />
        );
      })}
    </svg>
  );
}

export default function BuilderDemo() {
  const [weights, setWeights] = useState(START_WEIGHTS);

  const setW = (s, w) =>
    setWeights((prev) => ({ ...prev, [s]: Math.min(60, Math.max(0, Math.round(w * 2) / 2)) }));

  const holdings = DEMO_ROWS.map((r) => ({ s: r.s, w: weights[r.s] }));
  const m = useMemo(() => computeMetrics(holdings), [weights]);
  const total = holdings.reduce((sum, h) => sum + h.w, 0);
  const allocated = total || 1;
  const slices = DEMO_ROWS.filter((r) => weights[r.s] > 0).map((r) => ({
    s: r.s,
    color: r.color,
    pct: (weights[r.s] / allocated) * 100,
  }));

  return (
    <div
      className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-linestrong bg-panel"
      style={{ boxShadow: "var(--shadow-pop)" }}
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-line bg-panel2/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-down opacity-60" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn opacity-60" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-up opacity-60" aria-hidden="true" />
        <span className="ml-3 hidden truncate rounded-md bg-bg/60 px-2 py-0.5 text-[10px] text-ink3 sm:block" aria-hidden="true">
          folio.app
        </span>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
        >
          Live demo, try the sliders
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink3">Builder</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-ink">All-Weather</p>
          </div>
          <span
            className={`tnum rounded-full border border-line px-3 py-1 text-xs font-medium ${
              Math.round(total) === 100 ? "text-ink2" : "text-warn"
            }`}
          >
            {DEMO_ROWS.filter((r) => weights[r.s] > 0).length} assets · {Math.round(total)}%
          </span>
        </div>

        {/* decorative search, matching the app */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-bg px-4 py-3 text-[13.5px] text-ink3" aria-hidden="true">
          <Search size={15} />
          Search {UNIVERSE.length} stocks &amp; funds...
        </div>

        {/* holdings */}
        <div className="mt-3 space-y-2.5">
          {DEMO_ROWS.map((r) => {
            const t = lookup(r.s);
            const w = weights[r.s];
            return (
              <div key={r.s} className="rounded-xl border border-line bg-bg px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                  <span className="text-[15px] font-bold tracking-tight text-ink">{r.s}</span>
                  <span className="min-w-0 truncate text-[13px] text-ink3">{t.n}</span>
                  <span className={`ml-auto text-[11px] font-semibold tnum ${t.r >= 0 ? "text-up" : "text-down"}`}>
                    {t.r >= 0 ? "+" : ""}{Math.round(t.r * 100)}% 1y
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    onClick={() => setW(r.s, w - 5)}
                    aria-label={`Decrease ${r.s} weight`}
                    className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink2 transition hover:border-linestrong hover:text-ink"
                  >
                    <Minus size={13} aria-hidden="true" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="0.5"
                    value={w}
                    onChange={(e) => setW(r.s, Number(e.target.value))}
                    aria-label={`${r.s} weight, percent`}
                    className="demo-range min-w-0 flex-1"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${r.color} ${(w / 60) * 100}%, var(--line) ${(w / 60) * 100}%)`,
                    }}
                  />
                  <button
                    onClick={() => setW(r.s, w + 5)}
                    aria-label={`Increase ${r.s} weight`}
                    className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink2 transition hover:border-linestrong hover:text-ink"
                  >
                    <Plus size={13} aria-hidden="true" />
                  </button>
                  <span className="tnum w-[68px] shrink-0 rounded-lg border border-line py-1.5 text-center text-sm font-semibold text-ink">
                    {w}
                    <span className="ml-0.5 text-[11px] font-normal text-ink3">%</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* live metrics: straight from the same engine the app runs */}
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-line bg-bg px-4 py-3.5">
          <Donut slices={slices} />
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {[
              ["Volatility", `${(m.vol * 100).toFixed(1)}%`],
              ["Sharpe", m.sharpe.toFixed(2)],
              ["Diversification", `${m.divScore}/100`],
              ["Grade", m.grade],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-wider text-ink3">{label}</p>
                <p className="tnum mt-0.5 text-[15px] font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
