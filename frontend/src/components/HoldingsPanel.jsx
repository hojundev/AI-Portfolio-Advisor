import React, { useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { searchUniverse, lookup, POPULAR, UNIVERSE } from "../data/universe.js";
import { fmtPct } from "../lib/format.js";
import { Card, CardHeader } from "./ui.jsx";

function SearchResults({ results, activeIndex, onPick, listId }) {
  return (
    <ul
      id={listId}
      role="listbox"
      aria-label="Ticker results"
      className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-panel py-1"
      style={{ boxShadow: "0 16px 48px rgba(0,0,0,.35)" }}
    >
      {results.map((t, i) => (
        <li
          key={t.s}
          id={`ticker-opt-${i}`}
          role="option"
          aria-selected={i === activeIndex}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(t);
          }}
          className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition ${
            i === activeIndex ? "bg-panel2" : "hover:bg-panel2"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="tnum w-14 shrink-0 text-[13px] font-semibold text-ink">{t.s}</span>
            <span className="truncate text-xs text-ink3">{t.n}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={`tnum text-xs font-medium ${t.r >= 0 ? "text-up" : "text-down"}`}>
              {fmtPct(t.r, { sign: true, digits: 0 })}
            </span>
            <span className="rounded border border-line px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink3">
              {t.ex}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function HoldingRow({ holding, color, index, onChange, onRemove }) {
  const t = lookup(holding.s);
  if (!t) return null;
  const step = (delta) => onChange(Math.max(0, Math.min(100, holding.w + delta)));
  return (
    <li
      className="anim-fade-up group rounded-xl border border-line bg-panel2/60 px-3 py-2.5 transition hover:border-linestrong"
      style={{ animationDelay: `${Math.min(index * 40, 280)}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-ink">{t.s}</span>
            <span className="truncate text-[11px] text-ink3">{t.n}</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${t.s}`}
          className="rounded-lg p-1.5 text-ink3 opacity-0 transition hover:text-down focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => step(-1)}
          aria-label={`Decrease ${t.s} weight`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-ink3 transition hover:text-ink"
        >
          <Minus size={12} aria-hidden="true" />
        </button>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={holding.w}
          aria-label={`${t.s} allocation percent`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1"
          style={{ "--range-track": color ? `color-mix(in srgb, ${color} 45%, var(--line-strong))` : undefined }}
        />
        <button
          onClick={() => step(1)}
          aria-label={`Increase ${t.s} weight`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-ink3 transition hover:text-ink"
        >
          <Plus size={12} aria-hidden="true" />
        </button>
        <label className="flex shrink-0 items-center rounded-md border border-line bg-panel px-1.5">
          <span className="sr-only">{t.s} allocation percent</span>
          <input
            type="number"
            min="0"
            max="100"
            value={holding.w}
            onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            className="tnum w-9 bg-transparent py-1 text-right text-xs font-semibold text-ink outline-none"
          />
          <span className="pl-0.5 text-[10px] text-ink3">%</span>
        </label>
      </div>
    </li>
  );
}

export default function HoldingsPanel({ portfolio, colorFor, onUpdate, onAdd, onRemove, onSplitEvenly, onNormalize }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const owned = portfolio.holdings.map((h) => h.s);
  const results = useMemo(() => {
    if (!focused) return [];
    if (!query.trim()) return POPULAR.filter((t) => !owned.includes(t.s)).slice(0, 6);
    return searchUniverse(query, 8, owned);
  }, [query, focused, owned.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = portfolio.holdings.reduce((sum, h) => sum + h.w, 0);
  const totalState = Math.round(total) === 100 ? "ok" : total > 100 ? "over" : "under";

  const pick = (t) => {
    onAdd(t.s);
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[Math.min(activeIndex, results.length - 1)]);
    } else if (e.key === "Escape") {
      // close the popup but keep focus in the field (combobox pattern)
      setFocused(false);
    }
  };

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader
        eyebrow="Builder"
        title={portfolio.name}
        right={
          <span className="tnum rounded-full border border-line px-2 py-0.5 text-[11px] text-ink3">
            {portfolio.holdings.length} assets
          </span>
        }
      />

      <div className="relative px-5 pt-3">
        <Search size={15} className="pointer-events-none absolute left-8 top-1/2 mt-1.5 -translate-y-1/2 text-ink3" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded={focused && results.length > 0}
          aria-controls="ticker-results"
          aria-autocomplete="list"
          aria-activedescendant={focused && results.length > 0 ? `ticker-opt-${Math.min(activeIndex, results.length - 1)}` : undefined}
          aria-label="Search stocks and funds"
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={`Search ${UNIVERSE.length} stocks & funds…`}
          className="w-full rounded-xl border border-line bg-panel2/60 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-linestrong"
        />
        {focused && results.length > 0 && (
          <div className="relative mx-0">
            <SearchResults listId="ticker-results" results={results} activeIndex={activeIndex} onPick={pick} />
          </div>
        )}
      </div>

      <ul key={portfolio.id} className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 pb-3" aria-label="Holdings">
        {portfolio.holdings.map((h, i) => (
          <HoldingRow
            key={h.s}
            holding={h}
            index={i}
            color={colorFor(h.s)}
            onChange={(w) => onUpdate(h.s, w)}
            onRemove={() => onRemove(h.s)}
          />
        ))}
        {portfolio.holdings.length === 0 && (
          <li className="rounded-xl border border-dashed border-linestrong px-4 py-10 text-center">
            <p className="text-sm font-medium text-ink2">Start building</p>
            <p className="mx-auto mt-1 max-w-[220px] text-xs leading-5 text-ink3">
              Search above, or ask the advisor: “add SPY at 60%”.
            </p>
          </li>
        )}
      </ul>

      <div className="border-t border-line px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink3">Allocated</span>
          <span
            className={`tnum text-xs font-semibold ${
              totalState === "ok" ? "text-up" : totalState === "over" ? "text-down" : "text-warn"
            }`}
          >
            {Math.round(total)}%{totalState === "over" ? ", over" : totalState === "under" ? `, ${100 - Math.round(total)}% left` : ""}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel2" role="progressbar" aria-valuenow={Math.round(total)} aria-valuemin={0} aria-valuemax={100} aria-label="Total allocated">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(total, 100)}%`,
              background: totalState === "ok" ? "var(--up)" : totalState === "over" ? "var(--down)" : "var(--warn)",
            }}
          />
        </div>
        {portfolio.holdings.length > 1 && (
          <div className="mt-2.5 flex gap-2">
            <button onClick={onSplitEvenly} className="flex-1 rounded-lg border border-line py-1.5 text-[11px] font-medium text-ink2 transition hover:border-linestrong hover:text-ink">
              Split evenly
            </button>
            <button
              onClick={onNormalize}
              disabled={totalState === "ok" || total === 0}
              className="flex-1 rounded-lg border border-line py-1.5 text-[11px] font-medium text-ink2 transition hover:border-linestrong hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              Scale to 100%
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
