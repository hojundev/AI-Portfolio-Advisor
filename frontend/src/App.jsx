import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  ChevronDown,
  CircleDollarSign,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", price: 226.84 },
  { ticker: "NVDA", name: "NVIDIA Corporation", price: 177.12 },
  { ticker: "MSFT", name: "Microsoft Corporation", price: 522.04 },
  { ticker: "TSLA", name: "Tesla Inc.", price: 322.05 },
  { ticker: "AMZN", name: "Amazon.com Inc.", price: 231.54 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 203.71 },
  { ticker: "META", name: "Meta Platforms", price: 764.15 },
  { ticker: "JPM", name: "JPMorgan Chase", price: 296.21 },
];

const COLORS = [
  "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b",
  "#ec4899", "#3b82f6", "#ef4444", "#14b8a6",
];

const INITIAL_PORTFOLIOS = [
  {
    id: "growth",
    name: "Growth",
    stocks: [
      { ticker: "NVDA", allocation: 32 },
      { ticker: "MSFT", allocation: 25 },
      { ticker: "AMZN", allocation: 20 },
      { ticker: "GOOGL", allocation: 13 },
      { ticker: "META", allocation: 10 },
    ],
  },
  {
    id: "dividend",
    name: "Dividend",
    stocks: [
      { ticker: "JPM", allocation: 30 },
      { ticker: "AAPL", allocation: 25 },
      { ticker: "MSFT", allocation: 20 },
      { ticker: "AMZN", allocation: 15 },
      { ticker: "GOOGL", allocation: 10 },
    ],
  },
  {
    id: "tech",
    name: "Tech Heavy",
    stocks: [
      { ticker: "NVDA", allocation: 35 },
      { ticker: "AAPL", allocation: 25 },
      { ticker: "MSFT", allocation: 20 },
      { ticker: "META", allocation: 12 },
      { ticker: "TSLA", allocation: 8 },
    ],
  },
];

function App() {
  const [portfolios, setPortfolios] = useState(INITIAL_PORTFOLIOS);
  const [activeId, setActiveId] = useState("growth");
  const [showCreate, setShowCreate] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [search, setSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [budget, setBudget] = useState(10000);
  const [lightMode, setLightMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Your portfolio is looking healthy. I can help analyze risk, allocations, and possible rebalancing opportunities.",
    },
    {
      sender: "user",
      text: "Should I increase my NVDA allocation?",
    },
    {
      sender: "bot",
      text: "NVDA is already your largest position. Increasing it would raise concentration risk. I'd consider keeping it below 35%.",
    },
  ]);

  const activePortfolio = portfolios.find((p) => p.id === activeId);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return STOCKS.filter(
      (stock) =>
        stock.ticker.toLowerCase().includes(search.toLowerCase()) ||
        stock.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [search]);

  const chartData = useMemo(() => {
    if (!activePortfolio) return [];
    return activePortfolio.stocks.map((stock, index) => {
      const info = STOCKS.find((s) => s.ticker === stock.ticker);
      return {
        name: stock.ticker,
        value: stock.allocation,
        amount: (stock.allocation / 100) * budget,
        color: COLORS[index % COLORS.length],
        company: info?.name || stock.ticker,
      };
    });
  }, [activePortfolio, budget]);

  const totalValue = useMemo(() => {
    if (!activePortfolio) return 0;
    const base = 126840;
    const weighted =
      activePortfolio.stocks.reduce(
        (sum, stock) => sum + stock.allocation * stock.ticker.length,
        0
      ) / 100;
    return base + weighted * 1432;
  }, [activePortfolio]);

  const performance = useMemo(() => {
    if (!activePortfolio) return 0;
    const weightedPerformance = {
      NVDA: 4.8, MSFT: 2.1, AAPL: 1.8, AMZN: 3.4,
      GOOGL: 2.8, META: 4.1, TSLA: -1.9, JPM: 1.2,
    };
    return activePortfolio.stocks.reduce(
      (sum, stock) =>
        sum +
        (weightedPerformance[stock.ticker] || 1.5) *
          (stock.allocation / 100),
      0
    );
  }, [activePortfolio]);

  const profitDollar = totalValue * (performance / 100);

  const topAsset = chartData.reduce(
    (max, item) => (item.value > max.value ? item : max),
    chartData[0] || { name: "-", value: 0 }
  );

  const updateAllocation = (ticker, value) => {
    setPortfolios((prev) =>
      prev.map((portfolio) =>
        portfolio.id === activeId
          ? {
              ...portfolio,
              stocks: portfolio.stocks.map((stock) =>
                stock.ticker === ticker
                  ? { ...stock, allocation: Math.max(0, Math.min(100, Number(value) || 0)) }
                  : stock
              ),
            }
          : portfolio
      )
    );
  };

  const addStock = (stock) => {
    if (!activePortfolio) return;
    if (activePortfolio.stocks.some((item) => item.ticker === stock.ticker)) {
      setSearch("");
      return;
    }

    setPortfolios((prev) =>
      prev.map((portfolio) =>
        portfolio.id === activeId
          ? {
              ...portfolio,
              stocks: [...portfolio.stocks, { ticker: stock.ticker, allocation: 5 }],
            }
          : portfolio
      )
    );
    setSearch("");
  };

  const removeStock = (ticker) => {
    setPortfolios((prev) =>
      prev.map((portfolio) =>
        portfolio.id === activeId
          ? { ...portfolio, stocks: portfolio.stocks.filter((stock) => stock.ticker !== ticker) }
          : portfolio
      )
    );
  };

  const createPortfolio = () => {
    const name = newPortfolioName.trim();
    if (!name) return;

    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setPortfolios((prev) => [...prev, { id, name, stocks: [] }]);
    setActiveId(id);
    setNewPortfolioName("");
    setShowCreate(false);
  };

  const sendMessage = () => {
    const message = chatInput.trim();
    if (!message) return;

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: message },
      {
        sender: "bot",
        text: `Based on your ${activePortfolio?.name || "current"} portfolio, I'd focus on maintaining diversification and keeping individual positions aligned with your risk tolerance.`,
      },
    ]);
    setChatInput("");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${lightMode ? "light-mode bg-slate-100 text-slate-900" : "bg-[#09090b] text-zinc-100"}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
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
            <button onClick={() => setLightMode(v => !v)} className={`rounded-xl border p-2.5 transition ${lightMode ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-200" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`} title={lightMode ? "Switch to dark mode" : "Switch to light mode"}>
              {lightMode ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className={`rounded-xl border p-2.5 transition ${lightMode ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-200" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`}>
              <Sparkles size={17} />
            </button>
            <div className="relative">
              <button onClick={() => setProfileOpen(v => !v)} className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition ${lightMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-zinc-800 text-white hover:bg-zinc-700"}`}>AM</button>
              {profileOpen && (
                <div className={`absolute right-0 top-12 z-40 w-56 rounded-xl border p-2 shadow-2xl ${lightMode ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#151518] text-white"}`}>
                  <div className="px-3 py-2">
                    <p className={`text-sm font-semibold ${lightMode ? "text-slate-900" : "text-white"}`}>Ahmed Mostafa</p>
                    <p className={`text-xs ${lightMode ? "text-slate-500" : "text-zinc-500"}`}>Portfolio user</p>
                  </div>
                  <div className={`my-1 border-t ${lightMode ? "border-slate-200" : "border-white/10"}`} />
                  <button onClick={() => setLightMode(v => !v)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${lightMode ? "text-slate-700 hover:bg-slate-100 hover:text-slate-950" : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"}`}>
                    {lightMode ? <Moon size={15} /> : <Sun size={15} />}
                    {lightMode ? "Dark mode" : "Light mode"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mb-5 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {portfolios.map((portfolio) => (
              <button
                key={portfolio.id}
                onClick={() => setActiveId(portfolio.id)}
                className={`group relative rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeId === portfolio.id
                    ? "bg-white text-zinc-950 shadow-lg"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {portfolio.name}
                {activeId === portfolio.id && (
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

        <main className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(400px,1fr)_390px]">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Portfolio</p>
                <h2 className="mt-1 text-lg font-semibold">{activePortfolio?.name}</h2>
              </div>
              <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300"><CircleDollarSign size={17} /></div>
            </div>

            <div className={`mb-5 rounded-xl border p-3 ${lightMode ? "border-slate-200 bg-slate-50" : "border-white/[0.06] bg-black/10"}`}>
              <p className={`text-xs leading-5 ${lightMode ? "text-slate-600" : "text-zinc-500"}`}>
                Portfolio details are view-only for users. Holdings and allocations cannot be edited from this page.
              </p>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Holdings</span>
              <span className="text-xs text-zinc-600">{activePortfolio?.stocks.length || 0} assets</span>
            </div>

            <div className="space-y-2">
              {activePortfolio?.stocks.map((stock, index) => {
                const info = STOCKS.find((s) => s.ticker === stock.ticker);
                return (
                  <div key={stock.ticker} className="group rounded-xl border border-white/[0.06] bg-black/10 p-3 transition hover:bg-white/[0.035]">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <div>
                          <p className="text-sm font-semibold">{stock.ticker}</p>
                          <p className="max-w-[150px] truncate text-[11px] text-zinc-500">{info?.name}</p>
                        </div>
                      </div>
                      
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${lightMode ? "bg-slate-200" : "bg-zinc-800"}`}>
                        <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${stock.allocation}%` }} />
                      </div>
                      <div className={`min-w-[58px] rounded-lg border px-2 py-1.5 text-center text-xs font-semibold ${lightMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-black/20 text-white"}`}>
                        {stock.allocation}%
                      </div>
                    </div>
                  </div>
                );
              })}

              {activePortfolio?.stocks.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <Search size={24} className="mx-auto mb-3 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No holdings yet</p>
                  <p className="mt-1 text-xs text-zinc-700">Search for a stock above</p>
                </div>
              )}
            </div>
          </section>

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

            <div className="relative flex flex-1 items-center justify-center">
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
                        return [`${value}%  ·  ${dollars}`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-3xl font-bold tracking-tight">
                  {totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Total portfolio</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {chartData.map((item) => (
                <div key={item.name} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-semibold">{item.name}</span>
                  </div>
                  <p className="text-lg font-bold">{item.value}%</p>
                  <p className="truncate text-[10px] text-zinc-600">{item.company}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span className="text-xs text-zinc-400">Portfolio health</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">Good</span>
            </div>
          </section>

          <section className="grid min-h-[600px] grid-rows-[auto_1fr] gap-5">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Overview</p>
                  <h2 className="mt-1 text-lg font-semibold">Key metrics</h2>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Activity size={17} /></div>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Portfolio value"
                  value={totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                  icon={<CircleDollarSign size={16} />}
                />
                <MetricCard
                  label="24h P/L"
                  value={`+${performance.toFixed(2)}%`}
                  secondary={`+$${profitDollar.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  positive
                  icon={<ArrowUpRight size={16} />}
                />
                <MetricCard label="Sharpe ratio" value="1.84" secondary="Low risk" icon={<ShieldCheck size={16} />} />
                <MetricCard label="Top performer" value={topAsset.name} secondary={`${topAsset.value}% allocation`} icon={<Zap size={16} />} />
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-300"><Bot size={18} /></div>
                  <div>
                    <p className="text-sm font-semibold">Portfolio AI</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-zinc-500">Assistant online</span>
                    </div>
                  </div>
                </div>
                <button className="text-zinc-600 transition hover:text-zinc-300"><MessageSquare size={16} /></button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-xs leading-5 ${
                      message.sender === "user"
                        ? "rounded-br-md bg-violet-500 text-white"
                        : "rounded-bl-md border border-white/[0.07] bg-white/[0.04] text-zinc-400"
                    }`}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.07] p-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask about your portfolio..."
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-600"
                  />
                  <button onClick={sendMessage} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white transition hover:bg-violet-400">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

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