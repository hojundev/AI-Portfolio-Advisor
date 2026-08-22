import React, { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioWalk, priceWalk } from "../lib/quant.js";
import { fmtMoney } from "../lib/format.js";
import { Card, CardHeader, useThemeColors } from "./ui.jsx";

const BASE = 10000;
const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2 text-xs" style={{ boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
      <p className="mb-1 font-medium text-ink3">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tnum flex items-center gap-2 text-ink">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.stroke }} aria-hidden="true" />
          <span className="text-ink2">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold">{fmtMoney(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function PerformanceCard({ portfolio, theme, budget = BASE }) {
  const colors = useThemeColors(theme);

  const { data, endPortfolio, endSpy } = useMemo(() => {
    const n = 64;
    const port = portfolioWalk(portfolio.holdings, n);
    const spy = priceWalk("SPY", n);
    const rows = port.map((v, i) => ({
      label: MONTHS[Math.min(Math.floor((i / n) * 12), 11)],
      portfolio: Math.round(v * budget),
      sp500: Math.round(spy[i] * budget),
    }));
    return { data: rows, endPortfolio: rows[n - 1].portfolio, endSpy: rows[n - 1].sp500 };
  }, [portfolio.holdings, budget]);

  const empty = portfolio.holdings.every((h) => !h.w);

  return (
    <Card>
      <CardHeader
        eyebrow="Performance"
        title={`Illustrative growth of ${fmtMoney(budget)}`}
        right={
          !empty && (
            <div className="flex items-center gap-3 text-xs" aria-label="Chart legend">
              <span className="flex items-center gap-1.5 text-ink2">
                <span className="h-1.5 w-4 rounded-full" style={{ background: colors.series[0] }} aria-hidden="true" />
                {portfolio.name}
                <span className="tnum font-semibold text-ink">{fmtMoney(endPortfolio)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-ink2">
                <span className="h-1.5 w-4 rounded-full" style={{ background: colors.ink3 }} aria-hidden="true" />
                S&P 500 (simulated)
                <span className="tnum font-semibold text-ink">{fmtMoney(endSpy)}</span>
              </span>
            </div>
          )
        }
      />
      <div className="h-[168px] px-3 pb-2 pt-2">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-ink3">
            The growth simulation appears once you add holdings.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.ink3, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: colors.line }}
                interval={10}
              />
              <YAxis
                tick={{ fill: colors.ink3, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.ink3, strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Line type="monotone" dataKey="portfolio" name={portfolio.name} stroke={colors.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="sp500" name="S&P 500 (simulated)" stroke={colors.ink3} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="border-t border-line px-5 py-2 text-[10px] leading-4 text-ink3">
        A simulated path drawn from each holding's trailing-year statistics (assets co-move through a shared
        market factor), an educational illustration, not history and not a prediction.
      </p>
    </Card>
  );
}
