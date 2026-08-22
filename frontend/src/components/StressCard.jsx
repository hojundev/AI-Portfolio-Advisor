import React, { useEffect, useMemo, useState } from "react";
import { stressTest } from "../lib/stress.js";
import { fmtPct } from "../lib/format.js";
import { Card } from "./ui.jsx";

export default function StressCard({ portfolio, budget = 10000 }) {
  const results = useMemo(() => stressTest(portfolio.holdings, budget), [portfolio.holdings, budget]);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  if (results.length === 0) return null;

  // bar scale: worst loss across scenarios defines full width
  const maxLoss = Math.max(0.05, ...results.map((r) => Math.abs(Math.min(r.impact, 0))));

  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink3">Crash test</p>
        <span className="tnum text-[10px] text-ink3">on ${budget.toLocaleString()}</span>
      </div>

      <ul className="space-y-2.5 px-5 pb-3.5 pt-2.5">
        {results.map((r) => {
          const losing = r.impact < 0;
          return (
            <li key={r.id} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{r.name}</p>
                <p className="truncate text-[10px] text-ink3" title={r.desc}>{r.desc}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel2" aria-hidden="true">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: grown ? `${Math.min(100, (Math.abs(r.impact) / maxLoss) * 100)}%` : "0%",
                    background: losing ? "var(--down)" : "var(--up)",
                    opacity: 0.85,
                  }}
                />
              </div>
              <p className={`tnum text-right text-xs font-semibold ${losing ? "text-down" : "text-up"}`}>
                {fmtPct(r.impact, { sign: true, digits: 1 })}
                <span className="block text-[9px] font-normal text-ink3">
                  {r.dollars < 0 ? "−" : "+"}${Math.abs(r.dollars).toLocaleString()}
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line px-5 py-2 text-[10px] leading-4 text-ink3">
        Beta- and class-based approximations of three classic scenarios. Educational, not a prediction.
      </p>
    </Card>
  );
}
