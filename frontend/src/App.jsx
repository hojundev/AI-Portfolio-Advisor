import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  ChevronDown,
  CircleDollarSign,
  Loader2,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchPresets, fetchTickers, analyzePortfolio } from "./api";

// ── Palette for the donut chart slices ──────────────────────────────────────
const COLORS = [
  "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b",
  "#ec4899", "#3b82f6", "#ef4444", "#14b8a6",
];

// ═══════════════════════════════════════════════════════════════════════════
// App
// ═══════════════════════════════════════════════════════════════════════════
function App() {
  // ── UI chrome ───────────────────────────────────────────────────────────
  const [lightMode, setLightMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [budget, setBudget] = useState(10000);

  // ── Data from the backend ───────────────────────────────────────────────
  const [presets, setPresets] = useState([]);          // from GET /api/presets
  const [tickerUniverse, setTickerUniverse] = useState([]); // from GET /api/tickers

  // ── Portfolio tabs ──────────────────────────────────────────────────────
  // Each tab is { id, name, type:"preset"|"custom", tickers?, description? }
  // Plus analysis results when available:
  //   { ...tab, allocations, metrics, ai_insight }
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // ── Custom portfolio creation ───────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");

  // ── Ticker search (custom flow) ────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Loading & errors ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);   // covers analyze calls
  const [initLoading, setInitLoading] = useState(true); // initial data fetch
  const [error, setError] = useState(null);

  // ── Active tab reference ───────────────────────────────────────────────
  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  // ────────────────────────────────────────────────────────────────────────
  // Boot: fetch presets + ticker universe, set up initial tabs
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [presetData, tickerData] = await Promise.all([
          fetchPresets(),
          fetchTickers(),
        ]);
        if (cancelled) return;
        setPresets(presetData);
        setTickerUniverse(tickerData);

        // Build preset tabs
        const presetTabs = presetData.map((p) => ({
          id: p.id,
          name: p.name,
          type: "preset",
          description: p.description,
          // Preset allocations come pre-loaded (view-only weights)
          allocations: p.allocations,
          tickers: p.allocations.map((a) => a.ticker),
          metrics: null,
          ai_insight: null,
        }));
        setTabs(presetTabs);
        if (presetTabs.length > 0) setActiveId(presetTabs[0].id);
      } catch (e) {
        if (!cancelled) setError(`Failed to load initial data: ${e.message}`);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Auto-analyze: when a preset tab is selected and has no metrics yet,
  // fire the /api/analyze call automatically.
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTab) return;
    if (activeTab.type !== "preset") return;
    if (activeTab.metrics) return; // already analyzed
    runAnalysis(activeTab.id, { mode: "preset", preset_id: activeTab.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // ────────────────────────────────────────────────────────────────────────
  // Core: run /api/analyze and patch the tab with results
  // ────────────────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async (tabId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzePortfolio(payload);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                allocations: result.allocations,
                metrics: result.metrics,
                ai_insight: result.ai_insight,
              }
            : t
        )
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Custom flow: create portfolio, add/remove tickers, optimize
  // ────────────────────────────────────────────────────────────────────────
  const createPortfolio = () => {
    const name = newPortfolioName.trim();
    if (!name) return;
    const id = `custom-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const newTab = {
      id,
      name,
      type: "custom",
      tickers: [],
      allocations: [],
      metrics: null,
      ai_insight: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveId(id);
    setNewPortfolioName("");
    setShowCreate(false);
  };

  const addTicker = (symbol) => {
    if (!activeTab || activeTab.type !== "custom") return;
    if (activeTab.tickers.includes(symbol)) { setSearch(""); return; }
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? { ...t, tickers: [...t.tickers, symbol], allocations: [], metrics: null, ai_insight: null }
          : t
      )
    );
    setSearch("");
  };

  const removeTicker = (symbol) => {
    if (!activeTab || activeTab.type !== "custom") return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? {
              ...t,
              tickers: t.tickers.filter((s) => s !== symbol),
              allocations: [],
              metrics: null,
              ai_insight: null,
            }
          : t
      )
    );
  };

  const optimizeCustom = () => {
    if (!activeTab || activeTab.type !== "custom") return;
    if (activeTab.tickers.length === 0) return;
    runAnalysis(activeTab.id, { mode: "custom", tickers: activeTab.tickers });
  };

  // ────────────────────────────────────────────────────────────────────────
  // Derived data for the UI
  // ────────────────────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return tickerUniverse
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [search, tickerUniverse]);

  const chartData = useMemo(() => {
    if (!activeTab?.allocations?.length) return [];
    return activeTab.allocations.map((a, i) => {
      const info = tickerUniverse.find((t) => t.symbol === a.ticker);
      return {
        name: a.ticker,
        value: a.allocation,
        amount: (a.allocation / 100) * budget,
        color: COLORS[i % COLORS.length],
        company: info?.name || a.ticker,
      };
    });
  }, [activeTab, budget, tickerUniverse]);

  const topAsset = useMemo(() => {
    if (!chartData.length) return { name: "-", value: 0 };
    return chartData.reduce((max, item) => (item.value > max.value ? item : max), chartData[0]);
  }, [chartData]);

  // Metrics from the API (or placeholders)
  const metrics = activeTab?.metrics ?? null;

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen transition-colors duration-300 ${lightMode ? "light-mode bg-slate-100 text-slate-900" : "bg-[#09090b] text-zinc-100"}`}>
      {/* Background blurs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
              <TrendingUp size={21} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PortfolioOS</h1>
              <p className="text-xs text-zinc-500">Intelligent wealth management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400 sm:flex">
              <Activity size={14} className="text-emerald-400" />
              Markets open
            </div>
            <button onClick={() => setLightMode((v) => !v)} className={`rounded-xl border p-2.5 transition ${lightMode ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-200" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`} title={lightMode ? "Switch to dark mode" : "Switch to light mode"}>
              {lightMode ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className={`rounded-xl border p-2.5 transition ${lightMode ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-200" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`}>
              <Sparkles size={17} />
            </button>
            <div className="relative">
              <button onClick={() => setProfileOpen((v) => !v)} className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition ${lightMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-zinc-800 text-white hover:bg-zinc-700"}`}>AM</button>
              {profileOpen && (
                <div className={`absolute right-0 top-12 z-40 w-56 rounded-xl border p-2 shadow-2xl ${lightMode ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#151518] text-white"}`}>
                  <div className="px-3 py-2">
                    <p className={`text-sm font-semibold ${lightMode ? "text-slate-900" : "text-white"}`}>Ahmed Mostafa</p>
                    <p className={`text-xs ${lightMode ? "text-slate-500" : "text-zinc-500"}`}>Portfolio user</p>
                  </div>
                  <div className={`my-1 border-t ${lightMode ? "border-slate-200" : "border-white/10"}`} />
                  <button onClick={() => setLightMode((v) => !v)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${lightMode ? "text-slate-700 hover:bg-slate-100 hover:text-slate-950" : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"}`}>
                    {lightMode ? <Moon size={15} /> : <Sun size={15} />}
                    {lightMode ? "Dark mode" : "Light mode"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Error toast ───────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200"><X size={16} /></button>
          </div>
        )}

        {/* ── Init loading ──────────────────────────────────────────── */}
        {initLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 size={32} className="animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            {/* ── Portfolio tabs ────────────────────────────────────── */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveId(tab.id)}
                    className={`group relative rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                      activeId === tab.id
                        ? "bg-white text-zinc-950 shadow-lg"
                        : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {tab.name}
                    {activeId === tab.id && (
                      <span className="absolute -bottom-[6px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-400" />
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-zinc-500 transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* ── Main 3-column grid ───────────────────────────────── */}
            <main className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(400px,1fr)_390px]">
              {/* ─────────────── LEFT: Holdings / Tickers ───────────── */}
              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Portfolio</p>
                    <h2 className="mt-1 text-lg font-semibold">{activeTab?.name ?? "—"}</h2>
                  </div>
                  <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300"><CircleDollarSign size={17} /></div>
                </div>

                {/* Description for presets */}
                {activeTab?.description && (
                  <div className={`mb-5 rounded-xl border p-3 ${lightMode ? "border-slate-200 bg-slate-50" : "border-white/[0.06] bg-black/10"}`}>
                    <p className={`text-xs leading-5 ${lightMode ? "text-slate-600" : "text-zinc-500"}`}>
                      {activeTab.description}
                    </p>
                  </div>
                )}

                {/* Info banner for custom portfolios */}
                {activeTab?.type === "custom" && (
                  <div className={`mb-5 rounded-xl border p-3 ${lightMode ? "border-slate-200 bg-slate-50" : "border-white/[0.06] bg-black/10"}`}>
                    <p className={`text-xs leading-5 ${lightMode ? "text-slate-600" : "text-zinc-500"}`}>
                      Add tickers below, then click <strong>Optimize</strong> to calculate the best risk-adjusted weights.
                    </p>
                  </div>
                )}

                {/* Ticker search — custom portfolios only */}
                {activeTab?.type === "custom" && (
                  <div className="relative mb-4">
                    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${lightMode ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/20"}`}>
                      <Search size={14} className="text-zinc-500" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tickers (e.g. AAPL)…"
                        className={`min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-600 ${lightMode ? "text-slate-900" : "text-white"}`}
                      />
                      {search && (
                        <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className={`absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border shadow-2xl ${lightMode ? "border-slate-200 bg-white" : "border-white/10 bg-[#151518]"}`}>
                        {searchResults.map((t) => (
                          <button
                            key={t.symbol}
                            onClick={() => addTicker(t.symbol)}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs transition ${lightMode ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"}`}
                          >
                            <div>
                              <span className="font-semibold">{t.symbol}</span>
                              <span className={`ml-2 ${lightMode ? "text-slate-500" : "text-zinc-500"}`}>{t.name}</span>
                            </div>
                            <Plus size={14} className="text-violet-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Holdings list */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Holdings</span>
                  <span className="text-xs text-zinc-600">
                    {activeTab?.allocations?.length || activeTab?.tickers?.length || 0} assets
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Show allocations if we have analysis results */}
                  {activeTab?.allocations?.length > 0
                    ? activeTab.allocations.map((a, index) => {
                        const info = tickerUniverse.find((t) => t.symbol === a.ticker);
                        return (
                          <div key={a.ticker} className="group rounded-xl border border-white/[0.06] bg-black/10 p-3 transition hover:bg-white/[0.035]">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <div>
                                  <p className="text-sm font-semibold">{a.ticker}</p>
                                  <p className="max-w-[150px] truncate text-[11px] text-zinc-500">{info?.name ?? a.ticker}</p>
                                </div>
                              </div>
                              {activeTab.type === "custom" && (
                                <button onClick={() => removeTicker(a.ticker)} className="text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400">
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${lightMode ? "bg-slate-200" : "bg-zinc-800"}`}>
                                <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${a.allocation}%` }} />
                              </div>
                              <div className={`min-w-[58px] rounded-lg border px-2 py-1.5 text-center text-xs font-semibold ${lightMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-black/20 text-white"}`}>
                                {a.allocation.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      })
                    : /* Show pending tickers (custom, not yet optimized) */
                      activeTab?.type === "custom" && activeTab.tickers.length > 0
                      ? activeTab.tickers.map((symbol) => {
                          const info = tickerUniverse.find((t) => t.symbol === symbol);
                          return (
                            <div key={symbol} className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/10 p-3 transition hover:bg-white/[0.035]">
                              <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                                <div>
                                  <p className="text-sm font-semibold">{symbol}</p>
                                  <p className="max-w-[150px] truncate text-[11px] text-zinc-500">{info?.name ?? symbol}</p>
                                </div>
                              </div>
                              <button onClick={() => removeTicker(symbol)} className="text-zinc-600 transition hover:text-red-400">
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })
                      : (
                          <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                            <Search size={24} className="mx-auto mb-3 text-zinc-700" />
                            <p className="text-sm text-zinc-500">No holdings yet</p>
                            <p className="mt-1 text-xs text-zinc-700">
                              {activeTab?.type === "custom" ? "Search for tickers above" : "Select a portfolio tab"}
                            </p>
                          </div>
                        )
                  }
                </div>

                {/* Optimize button — custom portfolios only */}
                {activeTab?.type === "custom" && activeTab.tickers.length >= 1 && (
                  <button
                    onClick={optimizeCustom}
                    disabled={loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/40 disabled:opacity-50"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Optimizing…</>
                    ) : (
                      <><Zap size={16} /> Optimize Portfolio</>
                    )}
                  </button>
                )}
              </section>

              {/* ──────────── CENTER: Donut chart + allocation cards ──── */}
              <section className="relative flex min-h-[600px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Allocation</p>
                    <h2 className="mt-1 text-lg font-semibold">Portfolio composition</h2>
                  </div>
                  <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-zinc-400">
                    24H <ChevronDown size={13} />
                  </button>
                </div>

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="animate-spin text-violet-400" />
                      <p className="text-sm text-zinc-300">Analyzing portfolio…</p>
                    </div>
                  </div>
                )}

                <div className="relative flex flex-1 items-center justify-center">
                  {chartData.length > 0 ? (
                    <div className="h-[350px] w-full max-w-[520px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="63%"
                            outerRadius="82%"
                            paddingAngle={3}
                            stroke="none"
                            isAnimationActive
                            animationDuration={650}
                          >
                            {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "#18181b",
                              border: "1px solid rgba(255,255,255,.1)",
                              borderRadius: "12px",
                              color: "#fff",
                            }}
                            formatter={(value, name, item) => {
                              const amount = item?.payload?.amount ?? 0;
                              const dollars = amount.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              });
                              return [`${value.toFixed(1)}%  ·  ${dollars}`, name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Center label */}
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-3xl font-bold tracking-tight">
                          {budget.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">Investment budget</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                      <div className="rounded-xl bg-violet-500/10 p-4">
                        <TrendingUp size={32} className="text-violet-400" />
                      </div>
                      <p className="text-sm text-zinc-400">
                        {activeTab?.type === "custom" ? "Add tickers and click Optimize to see allocations" : "Select a portfolio to view composition"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Allocation cards grid */}
                {chartData.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {chartData.map((item) => (
                      <div key={item.name} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-semibold">{item.name}</span>
                        </div>
                        <p className="text-lg font-bold">{item.value.toFixed(1)}%</p>
                        <p className="truncate text-[10px] text-zinc-600">{item.company}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Portfolio health */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-emerald-400" />
                    <span className="text-xs text-zinc-400">Portfolio health</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    {metrics ? (metrics.sharpe_ratio >= 1 ? "Excellent" : metrics.sharpe_ratio >= 0.5 ? "Good" : "Fair") : "—"}
                  </span>
                </div>
              </section>

              {/* ──────────── RIGHT: Metrics + AI Insight ──────────── */}
              <section className="grid min-h-[600px] grid-rows-[auto_1fr] gap-5">
                {/* Key Metrics card */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl">
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Overview</p>
                      <h2 className="mt-1 text-lg font-semibold">Key metrics</h2>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Activity size={17} /></div>
                  </div>

                  {/* Budget input */}
                  <div className={`mb-4 rounded-xl border p-3 ${lightMode ? "border-slate-200 bg-slate-50" : "border-white/[0.06] bg-black/10"}`}>
                    <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      Investment budget
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={budget}
                        onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="10,000"
                        className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-600 ${lightMode ? "text-slate-900" : "text-white"}`}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-zinc-600">
                      Hover a pie slice to see its share of your budget.
                    </p>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Exp. return"
                      value={metrics ? `${(metrics.expected_return * 100).toFixed(1)}%` : "—"}
                      secondary="Annualized"
                      positive={metrics?.expected_return > 0}
                      icon={<ArrowUpRight size={16} />}
                    />
                    <MetricCard
                      label="Volatility"
                      value={metrics ? `${(metrics.volatility * 100).toFixed(1)}%` : "—"}
                      secondary="Annualized"
                      icon={<Activity size={16} />}
                    />
                    <MetricCard
                      label="Sharpe ratio"
                      value={metrics ? metrics.sharpe_ratio.toFixed(2) : "—"}
                      secondary={metrics ? (metrics.sharpe_ratio >= 1 ? "Low risk" : metrics.sharpe_ratio >= 0.5 ? "Moderate" : "Higher risk") : ""}
                      icon={<ShieldCheck size={16} />}
                    />
                    <MetricCard
                      label="Top holding"
                      value={topAsset.name}
                      secondary={topAsset.value > 0 ? `${topAsset.value.toFixed(1)}% allocation` : ""}
                      icon={<Zap size={16} />}
                    />
                  </div>
                </div>

                {/* AI Insight card */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-300"><Bot size={18} /></div>
                      <div>
                        <p className="text-sm font-semibold">AI Insight</p>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-zinc-500">Powered by Gemini</span>
                        </div>
                      </div>
                    </div>
                    <Sparkles size={16} className="text-violet-400" />
                  </div>

                  <div className="flex flex-1 items-start overflow-y-auto p-4">
                    {activeTab?.ai_insight ? (
                      <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-xs leading-6 text-zinc-400">
                        {activeTab.ai_insight}
                      </div>
                    ) : (
                      <div className="flex w-full flex-col items-center justify-center gap-3 py-10 text-center">
                        <Bot size={28} className="text-zinc-700" />
                        <p className="text-xs text-zinc-600">
                          {loading ? "Generating insight…" : "Run an analysis to get an AI-generated explanation of your portfolio."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </main>
          </>
        )}
      </div>

      {/* ── Create portfolio modal ──────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151518] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">New portfolio</p>
                <h3 className="mt-1 text-lg font-semibold">Create custom portfolio</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white">
                <X size={17} />
              </button>
            </div>

            <input
              autoFocus
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPortfolio()}
              placeholder="e.g. AI Leaders"
              className="mb-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
            />

            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
                Cancel
              </button>
              <button onClick={createPortfolio} className="flex-1 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition hover:bg-violet-400">
                Create portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MetricCard
// ═══════════════════════════════════════════════════════════════════════════
function MetricCard({ label, value, secondary, positive, icon }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
        <span className={positive ? "text-emerald-400" : "text-zinc-600"}>{icon}</span>
      </div>
      <p className="truncate text-lg font-bold tracking-tight">{value}</p>
      {secondary && (
        <p className={`mt-1 text-[10px] ${positive ? "text-emerald-400" : "text-zinc-600"}`}>{secondary}</p>
      )}
    </div>
  );
}

export default App;