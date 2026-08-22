import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3,
  Check, ChevronDown, CircleDollarSign, Clock3, Moon, Plus, Search,
  ShieldCheck, Sparkles, Sun, Target, TrendingUp, X, Zap
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { analyzePortfolio, fetchPresets, fetchTickers } from "./api";
import Spinner from "./components/Spinner";
import ErrorToast from "./components/ErrorToast";

const COLORS = ["#8b5cf6","#06b6d4","#22c55e","#f59e0b","#ec4899","#3b82f6","#ef4444","#14b8a6","#f97316","#a855f7"];

const FALLBACK_INSIGHT = "The optimizer completed successfully. Review concentration, expected return, and volatility before making investment decisions.";

function money(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits
  });
}

function pct(value, digits = 2) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

function normalizePreset(preset, index) {
  const id = preset.id ?? preset.preset_id ?? preset.key ?? `preset-${index}`;
  const name = preset.name ?? preset.title ?? preset.label ?? id;
  return { ...preset, id, name };
}

function normalizeAllocations(analysis, tickers) {
  const raw = analysis?.allocations || [];
  const tickerMap = new Map(tickers.map((t) => [t.symbol, t.name]));
  return raw.map((item, index) => {
    const symbol = item.symbol ?? item.ticker ?? item.name ?? `Asset ${index + 1}`;
    const allocation = Number(item.allocation ?? item.weight ?? item.value ?? 0);
    return {
      symbol,
      name: item.name ?? tickerMap.get(symbol) ?? symbol,
      allocation: Math.max(0, allocation),
      color: COLORS[index % COLORS.length],
    };
  }).filter((item) => item.allocation > 0);
}

function App() {
  const [dark, setDark] = useState(true);
  const [presets, setPresets] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [active, setActive] = useState(null);
  const [customPortfolios, setCustomPortfolios] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const [budget, setBudget] = useState(10000);
  const [analysisById, setAnalysisById] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPresets(), fetchTickers()])
      .then(([presetData, tickerData]) => {
        if (cancelled) return;
        const rawPresets = Array.isArray(presetData) ? presetData : (presetData?.presets || []);
        const normalized = rawPresets.map(normalizePreset);
        const rawTickers = Array.isArray(tickerData) ? tickerData : (tickerData?.tickers || []);
        setPresets(normalized);
        setTickers(rawTickers);
        if (normalized.length) setActive({ type: "preset", id: normalized[0].id });
      })
      .catch((e) => setBootError(e.message))
      .finally(() => !cancelled && setBootLoading(false));
    return () => { cancelled = true; };
  }, []);

  const custom = customPortfolios.find((p) => p.id === active?.id);
  const activePreset = presets.find((p) => p.id === active?.id);
  const isCustom = active?.type === "custom";

  const activeAnalysis = active ? analysisById[active.id] : null;
  const activeAllocations = useMemo(() => {
    if (!activeAnalysis) return [];
    return normalizeAllocations(activeAnalysis, tickers);
  }, [activeAnalysis, tickers]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tickers
      .filter((t) => !selected.includes(t.symbol))
      .filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      .slice(0, 7);
  }, [query, tickers, selected]);

  useEffect(() => setHighlight(0), [query]);

  const loadAnalysis = async (item, payload) => {
    setLoadingId(item.id);
    setError("");
    try {
      const result = await analyzePortfolio(payload);
      setAnalysisById((prev) => ({ ...prev, [item.id]: result }));
    } catch (e) {
      setError(e.message);
      setAnalysisById((prev) => ({ ...prev, [item.id]: { error: e.message } }));
    } finally {
      setLoadingId(null);
    }
  };

  const selectPreset = (preset) => {
    const item = { type: "preset", id: preset.id };
    setActive(item);
    if (!analysisById[preset.id]) {
      loadAnalysis(item, { mode: "preset", preset_id: preset.id });
    }
  };

  const selectCustom = (portfolio) => {
    setActive({ type: "custom", id: portfolio.id });
    setQuery("");
  };

  const createPortfolio = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    const portfolio = { id, name, tickers: [] };
    setCustomPortfolios((prev) => [...prev, portfolio]);
    setActive({ type: "custom", id });
    setSelected([]);
    setNewName("");
    setCreateOpen(false);
    setQuery("");
  };

  const addTicker = (ticker) => {
    if (!custom) return;
    const next = [...selected, ticker.symbol];
    setSelected(next);
    setCustomPortfolios((prev) => prev.map((p) => p.id === custom.id ? { ...p, tickers: next } : p));
    setQuery("");
    searchRef.current?.focus();
  };

  const removeTicker = (symbol) => {
    const next = selected.filter((s) => s !== symbol);
    setSelected(next);
    setCustomPortfolios((prev) => prev.map((p) => p.id === custom?.id ? { ...p, tickers: next } : p));
    setAnalysisById((prev) => {
      const copy = { ...prev };
      delete copy[custom?.id];
      return copy;
    });
  };

  const optimize = () => {
    if (!custom || selected.length === 0 || loadingId) return;
    loadAnalysis(custom, { mode: "custom", tickers: selected });
  };

  const onSearchKeyDown = (e) => {
    if (!searchResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      addTicker(searchResults[highlight]);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  const totalWeight = activeAllocations.reduce((sum, x) => sum + x.allocation, 0);
  const chartData = activeAllocations.map((item) => ({ ...item, dollar: Number(budget || 0) * item.allocation / 100 }));
  const metrics = activeAnalysis?.metrics || {};
  const topAsset = activeAllocations.reduce((best, item) => !best || item.allocation > best.allocation ? item : best, null);
  const insight = activeAnalysis?.ai_insight || FALLBACK_INSIGHT;

  if (bootLoading) {
    return <div className={dark ? "min-h-screen bg-[#09090b] text-zinc-100" : "min-h-screen bg-slate-100 text-slate-900"}><div className="flex min-h-screen items-center justify-center"><Spinner label="Connecting to portfolio API…" /></div></div>;
  }

  return (
    <div className={dark ? "min-h-screen bg-[#09090b] text-zinc-100" : "min-h-screen bg-slate-50 text-slate-900"}>
      <ErrorToast message={error || bootError} onClose={() => { setError(""); setBootError(""); }} />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Portfolio Advisor</h1>
              <p className={dark ? "text-xs text-zinc-500" : "text-xs text-slate-500"}>Optimized portfolios powered by live market data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={dark ? "hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400 sm:flex" : "hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex"}>
              <Activity size={14} className="text-emerald-400" /> API connected
            </div>
            <button onClick={() => setDark((v) => !v)} className={dark ? "rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-zinc-400 hover:text-white" : "rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:text-slate-950"} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="mb-5 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {presets.map((preset) => (
              <button key={preset.id} onClick={() => selectPreset(preset)} className={tabClass(dark, active?.id === preset.id && active?.type === "preset")}>
                {preset.name}
              </button>
            ))}
            {customPortfolios.map((portfolio) => (
              <button key={portfolio.id} onClick={() => selectCustom(portfolio)} className={tabClass(dark, active?.id === portfolio.id)}>
                {portfolio.name}
              </button>
            ))}
            <button onClick={() => setCreateOpen(true)} className={dark ? "flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-white/15 text-zinc-500 hover:border-violet-400/50 hover:text-violet-300" : "flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-500 hover:border-violet-400 hover:text-violet-600"} aria-label="Create custom portfolio"><Plus size={18} /></button>
          </div>
        </div>

        <main className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(400px,1fr)_390px]">
          <section className={panelClass(dark)}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className={eyebrow(dark)}>Portfolio</p>
                <h2 className="mt-1 text-lg font-semibold">{activePreset?.name || custom?.name || "Portfolio"}</h2>
              </div>
              <span className={dark ? "rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-zinc-400" : "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600"}>{isCustom ? "OPTIMIZABLE" : "VIEW ONLY"}</span>
            </div>

            {isCustom ? (
              <>
                <div className="relative mb-4">
                  <Search className={dark ? "absolute left-3 top-3.5 text-zinc-500" : "absolute left-3 top-3.5 text-slate-400"} size={16} />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search ticker or company…"
                    className={inputClass(dark)}
                    aria-label="Search tickers"
                  />
                  {searchResults.length > 0 && (
                    <div className={dropdownClass(dark)}>
                      {searchResults.map((ticker, index) => (
                        <button key={ticker.symbol} onMouseDown={(e) => e.preventDefault()} onClick={() => addTicker(ticker)} className={resultClass(dark, index === highlight)}>
                          <span className="font-semibold">{ticker.symbol}</span>
                          <span className="truncate text-xs opacity-60">{ticker.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {query.trim() && searchResults.length === 0 && (
                    <div className={dropdownClass(dark)}>
                      <div className={dark ? "px-3 py-3 text-xs text-zinc-500" : "px-3 py-3 text-xs text-slate-500"}>No results for “{query.trim()}”.</div>
                    </div>
                  )}
                  <p className={dark ? "mt-2 text-[10px] text-zinc-600" : "mt-2 text-[10px] text-slate-500"}>Use ↑ ↓ and Enter to select. The optimizer decides the weights.</p>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <span className={eyebrow(dark)}>Selected tickers</span>
                  <span className={muted(dark)}>{selected.length} selected</span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {selected.map((symbol) => (
                    <span key={symbol} className={dark ? "inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold" : "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold"}>
                      {symbol}
                      <button onClick={() => removeTicker(symbol)} className="rounded p-0.5 text-zinc-500 hover:text-rose-400" aria-label={`Remove ${symbol}`}><X size={12} /></button>
                    </span>
                  ))}
                  {!selected.length && <div className={dark ? "w-full rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-500" : "w-full rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500"}><Target className="mx-auto mb-2 opacity-50" size={22} />Select at least one ticker to optimize.</div>}
                </div>

                <button disabled={!selected.length || !!loadingId} onClick={optimize} className={`mb-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${!selected.length || loadingId ? (dark ? "cursor-not-allowed bg-zinc-800 text-zinc-600" : "cursor-not-allowed bg-slate-200 text-slate-400") : "bg-violet-500 text-white hover:bg-violet-400"}`}>
                  {loadingId === custom?.id ? <Spinner label="Optimizing…" /> : <><Sparkles size={16} /> Optimize portfolio</>}
                </button>
              </>
            ) : (
              <div className={dark ? "mb-5 rounded-xl border border-white/[0.06] bg-black/10 p-3" : "mb-5 rounded-xl border border-slate-200 bg-white p-3"}>
                <p className={muted(dark)}>Preset allocations are fixed and view-only. Select another preset or create a custom portfolio to run a new optimization.</p>
              </div>
            )}

            <div className="mb-3 flex items-center justify-between">
              <span className={eyebrow(dark)}>Holdings</span>
              <span className={muted(dark)}>{activeAllocations.length} assets</span>
            </div>

            {activeAnalysis?.error ? (
              <div className={dark ? "rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-300" : "rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"}>
                <AlertCircle size={16} className="mb-2" /> {activeAnalysis.error}
              </div>
            ) : activeAllocations.length ? (
              <div className="space-y-2">
                {activeAllocations.map((stock) => (
                  <div key={stock.symbol} className={dark ? "rounded-xl border border-white/[0.06] bg-black/10 p-3" : "rounded-xl border border-slate-200 bg-white p-3"}>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: stock.color }} />
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{stock.symbol}</p><p className={muted(dark)+" truncate text-[11px]"}>{stock.name}</p></div>
                      <span className="text-sm font-bold">{pct(stock.allocation, 1)}</span>
                    </div>
                    <div className={dark ? "h-1.5 overflow-hidden rounded-full bg-zinc-800" : "h-1.5 overflow-hidden rounded-full bg-slate-200"}><div className="h-full rounded-full" style={{ width: `${Math.min(stock.allocation, 100)}%`, background: stock.color }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={dark ? "rounded-xl border border-dashed border-white/10 px-4 py-10 text-center" : "rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center"}>
                {isCustom ? <Target className={dark ? "mx-auto mb-2 text-zinc-700" : "mx-auto mb-2 text-slate-300"} size={25} /> : <Clock3 className={dark ? "mx-auto mb-2 text-zinc-700" : "mx-auto mb-2 text-slate-300"} size={25} />}
                <p className={dark ? "text-sm text-zinc-500" : "text-sm text-slate-500"}>{isCustom ? "Optimize to see allocations" : "Loading allocation data…"}</p>
              </div>
            )}
          </section>

          <section className={panelClass(dark, "min-h-[620px]")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className={eyebrow(dark)}>Allocation</p><h2 className="mt-1 text-lg font-semibold">Portfolio composition</h2></div>
              <label className={dark ? "flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-zinc-400" : "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"}>
                <CircleDollarSign size={14} />
                Budget
                <input type="number" min="0" step="100" value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} className={dark ? "w-24 bg-transparent text-right font-semibold text-white outline-none" : "w-24 bg-transparent text-right font-semibold text-slate-900 outline-none"} />
              </label>
            </div>

            <div className="relative flex min-h-[390px] flex-1 items-center justify-center">
              {loadingId === active?.id ? (
                <Spinner label="Analyzing portfolio…" />
              ) : chartData.length ? (
                <>
                  <div className="h-[360px] w-full max-w-[560px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="allocation" nameKey="symbol" cx="50%" cy="50%" innerRadius="62%" outerRadius="80%" paddingAngle={3} stroke="none" isAnimationActive animationDuration={650}>
                          {chartData.map((entry) => <Cell key={entry.symbol} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<BudgetTooltip dark={dark} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-3xl font-bold">{money(budget)}</p>
                    <p className={muted(dark)+" mt-1 text-xs"}>Portfolio budget</p>
                  </div>
                </>
              ) : (
                <div className="text-center"><BarChart3 className={dark ? "mx-auto mb-3 text-zinc-700" : "mx-auto mb-3 text-slate-300"} size={38} /><p className={muted(dark)}>Your optimized allocation will appear here.</p></div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {chartData.map((item) => (
                <div key={item.symbol} className={dark ? "rounded-xl border border-white/[0.06] bg-black/10 p-3" : "rounded-xl border border-slate-200 bg-white p-3"}>
                  <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} /><span className="text-xs font-semibold">{item.symbol}</span></div>
                  <p className="text-lg font-bold">{pct(item.allocation, 1)}</p>
                  <p className={muted(dark)+" truncate text-[10px]"}>{money(item.dollar)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid min-h-[620px] grid-rows-[auto_1fr] gap-5">
            <div className={panelClass(dark)}>
              <div className="mb-5 flex items-start justify-between"><div><p className={eyebrow(dark)}>Analysis</p><h2 className="mt-1 text-lg font-semibold">Key metrics</h2></div><div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Activity size={17} /></div></div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard dark label="Expected return" value={metrics.expected_return == null ? "—" : pct(metrics.expected_return * (Math.abs(metrics.expected_return) <= 1 ? 100 : 1))} icon={<TrendingUp size={16} />} />
                <MetricCard dark label="Volatility" value={metrics.volatility == null ? "—" : pct(metrics.volatility * (Math.abs(metrics.volatility) <= 1 ? 100 : 1))} icon={<ArrowDownRight size={16} />} />
                <MetricCard dark label="Sharpe ratio" value={metrics.sharpe_ratio == null ? "—" : Number(metrics.sharpe_ratio).toFixed(2)} icon={<ShieldCheck size={16} />} />
                <MetricCard dark label="Top allocation" value={topAsset?.symbol || "—"} secondary={topAsset ? pct(topAsset.allocation, 1) : "—"} icon={<Zap size={16} />} />
              </div>
            </div>

            <div className={panelClass(dark, "overflow-hidden")}>
              <div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-400"><Sparkles size={18} /></div><div><p className="text-sm font-semibold">AI Insight</p><p className={muted(dark)+" text-[10px]"}>One-shot portfolio analysis</p></div></div>
              <div className={dark ? "rounded-2xl border border-violet-500/10 bg-violet-500/[0.05] p-4" : "rounded-2xl border border-violet-200 bg-violet-50 p-4"}>
                <p className={dark ? "text-sm leading-6 text-zinc-300" : "text-sm leading-6 text-slate-700"}>{insight}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className={dark ? "rounded-xl border border-white/[0.06] bg-black/10 p-3" : "rounded-xl border border-slate-200 bg-white p-3"}><p className={eyebrow(dark)}>Assets</p><p className="mt-1 text-lg font-bold">{activeAllocations.length}</p></div>
                <div className={dark ? "rounded-xl border border-white/[0.06] bg-black/10 p-3" : "rounded-xl border border-slate-200 bg-white p-3"}><p className={eyebrow(dark)}>Weight total</p><p className="mt-1 text-lg font-bold">{pct(totalWeight, 1)}</p></div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={dark ? "w-full max-w-md rounded-2xl border border-white/10 bg-[#151518] p-5 shadow-2xl" : "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"}>
            <div className="mb-5 flex items-center justify-between"><div><p className={eyebrow(dark)}>New portfolio</p><h3 className="mt-1 text-lg font-semibold">Create custom portfolio</h3></div><button onClick={() => setCreateOpen(false)} className={muted(dark)}><X size={17} /></button></div>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createPortfolio()} placeholder="e.g. AI Leaders" className={inputClass(dark)+" mb-4"} />
            <div className="flex gap-2"><button onClick={() => setCreateOpen(false)} className={dark ? "flex-1 rounded-xl border border-white/10 py-3 text-sm text-zinc-400 hover:bg-white/5" : "flex-1 rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50"}>Cancel</button><button onClick={createPortfolio} disabled={!newName.trim()} className="flex-1 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Create portfolio</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetTooltip({ active, payload, dark }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className={dark ? "rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 shadow-xl" : "rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl"}>
      <p className="text-xs font-semibold">{item.symbol}</p>
      <p className="mt-1 text-xs text-violet-400">{pct(item.allocation, 1)} · {money(item.dollar)}</p>
    </div>
  );
}

function MetricCard({ dark, label, value, secondary, icon }) {
  return <div className={dark ? "rounded-xl border border-white/[0.06] bg-black/10 p-3.5" : "rounded-xl border border-slate-200 bg-white p-3.5"}>
    <div className="mb-3 flex items-center justify-between"><span className={eyebrow(dark)}>{label}</span><span className="text-violet-400">{icon}</span></div>
    <p className="truncate text-lg font-bold tracking-tight">{value}</p>
    {secondary && <p className={muted(dark)+" mt-1 text-[10px]"}>{secondary}</p>}
  </div>;
}

const panelClass = (dark, extra = "") => dark
  ? `rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl ${extra}`
  : `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${extra}`;
const eyebrow = (dark) => dark ? "text-[10px] font-medium uppercase tracking-wider text-zinc-500" : "text-[10px] font-medium uppercase tracking-wider text-slate-500";
const muted = (dark) => dark ? "text-zinc-500" : "text-slate-500";
const inputClass = (dark) => dark ? "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pl-10 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/60" : "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400";
const dropdownClass = (dark) => dark ? "absolute left-0 right-0 top-[52px] z-30 overflow-hidden rounded-xl border border-white/10 bg-[#151518] shadow-2xl" : "absolute left-0 right-0 top-[52px] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl";
const resultClass = (dark, active) => dark
  ? `flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${active ? "bg-violet-500/15 text-white" : "text-zinc-300 hover:bg-white/5"}`
  : `flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${active ? "bg-violet-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`;
const tabClass = (dark, active) => active
  ? "relative rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg"
  : dark ? "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/[0.07] hover:text-white" : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900";

export default App;
