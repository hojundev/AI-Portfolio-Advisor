import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Landing from "./components/Landing.jsx";
import Login from "./components/Login.jsx";
import Tabs from "./components/Tabs.jsx";
import HoldingsPanel from "./components/HoldingsPanel.jsx";
import AllocationCard from "./components/AllocationCard.jsx";
import PerformanceCard from "./components/PerformanceCard.jsx";
import MetricsCard from "./components/MetricsCard.jsx";
import StressCard from "./components/StressCard.jsx";
import BriefingCard from "./components/BriefingCard.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import { CreatePortfolioModal, SettingsModal, ShareModal } from "./components/Modals.jsx";
import { Toast, useThemeColors } from "./components/ui.jsx";
import { computeMetrics } from "./lib/quant.js";
import { lookup } from "./data/universe.js";
import { respond } from "./lib/advisor.js";
import { analyze } from "./lib/api.js";
import { loadShared, shareSnapshot } from "./lib/cloud.js";
import { budgetStoreKey, firstName, getSession, portfolioStoreKey, signOut } from "./lib/session.js";

const THEME_KEY = "folio:theme";
const GUEST_OK_KEY = "folio:guest-ok";

function loadBudget(key) {
  const n = Number(localStorage.getItem(key));
  return Number.isFinite(n) && n >= 100 && n <= 10000000 ? n : 10000;
}

/* Preset ids intentionally match the backend's presets.py */
const DEFAULT_PORTFOLIOS = [
  {
    id: "classic_60_40",
    name: "Classic 60/40",
    preset: true,
    holdings: [
      { s: "VTI", w: 60, c: 0 },
      { s: "BND", w: 40, c: 1 },
    ],
  },
  {
    id: "dalio_all_weather",
    name: "All-Weather",
    preset: true,
    holdings: [
      { s: "VTI", w: 30, c: 0 },
      { s: "TLT", w: 40, c: 1 },
      { s: "IEF", w: 15, c: 2 },
      { s: "GLD", w: 7.5, c: 3 },
      { s: "DBC", w: 7.5, c: 4 },
    ],
  },
  {
    id: "tech_growth",
    name: "Tech Growth",
    preset: true,
    holdings: [
      { s: "NVDA", w: 25, c: 0 },
      { s: "MSFT", w: 20, c: 1 },
      { s: "AAPL", w: 20, c: 2 },
      { s: "GOOGL", w: 18, c: 3 },
      { s: "AMZN", w: 17, c: 4 },
    ],
  },
  // Real firm allocations (the published weights, not optimized) so users can
  // compare their custom mix against portfolios companies actually run.
  {
    id: "berkshire_hathaway",
    name: "Berkshire",
    preset: true,
    holdings: [
      { s: "AAPL", w: 32, c: 0 },
      { s: "AXP", w: 25, c: 1 },
      { s: "KO", w: 16, c: 2 },
      { s: "GOOGL", w: 14, c: 3 },
      { s: "BAC", w: 13, c: 4 },
    ],
  },
  {
    id: "pershing_square",
    name: "Pershing Sq.",
    preset: true,
    holdings: [
      { s: "BN", w: 23, c: 0 },
      { s: "AMZN", w: 22, c: 1 },
      { s: "UBER", w: 20, c: 2 },
      { s: "MSFT", w: 19, c: 3 },
      { s: "QSR", w: 16, c: 4 },
    ],
  },
  {
    id: "ark_innovation",
    name: "ARK",
    preset: true,
    holdings: [
      { s: "TSLA", w: 32, c: 0 },
      { s: "TEM", w: 22, c: 1 },
      { s: "CRSP", w: 17, c: 2 },
      { s: "COIN", w: 15, c: 3 },
      { s: "TWST", w: 14, c: 4 },
    ],
  },
];

function loadPortfolios(storeKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storeKey) || "null");
    if (stored?.portfolios?.length) {
      // presets shipped after this profile was saved still show up, but a
      // preset the user deleted stays deleted (dismissed list)
      const have = new Set(stored.portfolios.map((p) => p.id));
      const dismissed = new Set(stored.dismissed || []);
      const missing = DEFAULT_PORTFOLIOS.filter((p) => p.preset && !have.has(p.id) && !dismissed.has(p.id));
      if (missing.length) stored.portfolios = [...stored.portfolios, ...missing];
      return stored;
    }
  } catch {
    /* corrupted store — fall back */
  }
  return { portfolios: DEFAULT_PORTFOLIOS, activeId: "classic_60_40" };
}

function nextColorSlot(holdings) {
  const used = new Set(holdings.map((h) => h.c));
  for (let i = 0; i < 8; i++) if (!used.has(i)) return i;
  // all 8 slots taken — keep cycling instead of always reusing slot 0
  return (Math.max(...holdings.map((h) => h.c)) + 1) % 8;
}

let toastSeq = 0;

export default function App() {
  const [session, setSession] = useState(getSession);
  const initial = useMemo(() => loadPortfolios(portfolioStoreKey(getSession())), []);
  const [portfolios, setPortfolios] = useState(initial.portfolios);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  // the investment amount every dollar figure is computed on, per profile
  const [budget, setBudget] = useState(() => loadBudget(budgetStoreKey(getSession())));
  const [modal, setModal] = useState(null); // 'create' | 'settings' | 'share'
  const [share, setShare] = useState(null);
  const [toast, setToast] = useState(null);
  const [optimization, setOptimization] = useState({ status: "idle", result: null });
  const [chatByPortfolio, setChatByPortfolio] = useState({});
  const [thinking, setThinking] = useState(false);
  const routeFromHash = () => {
    const hash = location.hash.replace(/^#/, "");
    if (hash.startsWith("login")) return "login";
    if (hash.startsWith("app")) return "app";
    return "landing";
  };
  const [route, setRoute] = useState(() =>
    new URLSearchParams(location.search).has("snap") || new URLSearchParams(location.search).has("p")
      ? "app"
      : routeFromHash()
  );
  const toastTimer = useRef(null);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goToApp = useCallback(() => {
    // first launch goes through sign-in; guests who skipped once aren't nagged
    location.hash = getSession() || localStorage.getItem(GUEST_OK_KEY) ? "app" : "login";
  }, []);

  const active = portfolios.find((p) => p.id === activeId) || portfolios[0];
  const metrics = useMemo(() => computeMetrics(active.holdings), [active.holdings]);
  const colors = useThemeColors(theme);

  // always-current snapshot for async callbacks (chat replies, optimizer completion)
  const liveRef = useRef({});
  liveRef.current = {
    active,
    metrics,
    activeId: active.id,
    signature: active.holdings.map((h) => `${h.s}:${h.w}`).join("|"),
  };

  const colorFor = useCallback(
    (symbol) => {
      const h = active.holdings.find((x) => x.s === symbol);
      return colors.series[(h?.c ?? 0) % 8];
    },
    [active.holdings, colors]
  );

  /* ------------------------------ persistence ----------------------------- */

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    // same mid-switch guard as the portfolio persist below
    if (portfolioStoreKey(session) !== prevStoreKey.current) return;
    localStorage.setItem(budgetStoreKey(session), String(budget));
  }, [budget, session]);

  // ORDER MATTERS: prevStoreKey is only advanced by the reload effect BELOW,
  // so on the commit where `session` changes, this persist effect still sees
  // the OLD key and skips — otherwise it would write the old profile's
  // portfolios under the new profile's key (data loss both directions).
  const prevStoreKey = useRef(portfolioStoreKey(session));
  useEffect(() => {
    if (portfolioStoreKey(session) !== prevStoreKey.current) return; // mid-switch: don't clobber
    localStorage.setItem(portfolioStoreKey(session), JSON.stringify({ portfolios, activeId }));
  }, [portfolios, activeId, session]);

  // switching profiles swaps in that profile's saved portfolios
  useEffect(() => {
    const key = portfolioStoreKey(session);
    if (key === prevStoreKey.current) return;
    prevStoreKey.current = key;
    const data = loadPortfolios(key);
    setPortfolios(data.portfolios);
    setActiveId(data.activeId);
    setBudget(loadBudget(budgetStoreKey(session)));
    setChatByPortfolio({});
    setOptimization({ status: "idle", result: null });
  }, [session]);

  /* ------------------------------ shared links ---------------------------- */

  const sharedImported = useRef(false);

  useEffect(() => {
    if (sharedImported.current) return; // StrictMode double-invokes effects in dev
    sharedImported.current = true;
    const hadShareParams = /[?&](snap|p)=/.test(location.search);
    if (!hadShareParams) return;
    loadShared().then((shared) => {
      // whatever happens, normalize the URL so the logo/landing routing works
      const bail = (message) => {
        history.replaceState(null, "", `${location.pathname}#app`);
        if (message) showToast(message);
      };
      if (!shared) return bail("Couldn't open that shared portfolio link");
      const id = `shared-${Date.now()}`;
      // keep only symbols our universe knows — unknown ones would become
      // invisible "ghost" rows that count toward totals but can't be removed
      const holdings = shared.holdings
        .filter((h) => lookup(h.s))
        .map((h, i) => ({ s: h.s, w: h.w, c: i % 8 }));
      if (!holdings.length) return bail("That shared link had no recognizable holdings");
      const name = portfolios.some((p) => p.name === shared.name) ? `${shared.name} · shared` : shared.name;
      setPortfolios((prev) => [...prev, { id, name, holdings }]);
      setActiveId(id);
      showToast(`Opened shared portfolio “${name}”`);
      history.replaceState(null, "", `${location.pathname}#app`);
      setRoute("app");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------- toast -------------------------------- */

  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast({ id: ++toastSeq, text });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* ------------------------------ mutations ------------------------------- */

  const mutateActive = useCallback(
    (fn) => {
      setPortfolios((prev) => prev.map((p) => (p.id === activeId ? fn(p) : p)));
    },
    [activeId]
  );

  const updateWeight = (symbol, w) =>
    mutateActive((p) => ({
      ...p,
      holdings: p.holdings.map((h) => (h.s === symbol ? { ...h, w } : h)),
    }));

  const addHolding = (symbol, weight) =>
    mutateActive((p) => {
      if (p.holdings.some((h) => h.s === symbol)) return p;
      const total = p.holdings.reduce((s, h) => s + h.w, 0);
      const w = weight ?? Math.max(5, Math.min(10, Math.round(100 - total)));
      return { ...p, holdings: [...p.holdings, { s: symbol, w: Math.max(1, w), c: nextColorSlot(p.holdings) }] };
    });

  const removeHolding = (symbol) =>
    mutateActive((p) => ({ ...p, holdings: p.holdings.filter((h) => h.s !== symbol) }));

  const splitEvenly = () =>
    mutateActive((p) => {
      const n = p.holdings.length;
      if (!n) return p;
      const even = Math.floor(1000 / n) / 10;
      return {
        ...p,
        holdings: p.holdings.map((h, i) => ({ ...h, w: i === 0 ? Math.round((100 - even * (n - 1)) * 10) / 10 : even })),
      };
    });

  const normalize = () =>
    mutateActive((p) => {
      const total = p.holdings.reduce((s, h) => s + h.w, 0);
      if (!total) return p;
      return { ...p, holdings: p.holdings.map((h) => ({ ...h, w: Math.round((h.w / total) * 1000) / 10 })) };
    });

  /* ------------------------------ optimization ---------------------------- */

  const holdingsSignature = liveRef.current.signature;

  useEffect(() => {
    // any edit or portfolio switch invalidates a pending or shown optimization
    setOptimization((prev) => {
      if (prev.status === "idle") return prev;
      if (prev.forId !== activeId || prev.forSig !== holdingsSignature) {
        return { status: "idle", result: null };
      }
      return prev;
    });
  }, [holdingsSignature, activeId]);

  const runOptimize = useCallback(async () => {
    const { active: current, activeId: forId, signature: forSig } = liveRef.current;
    const symbols = current.holdings.filter((h) => h.w > 0).map((h) => h.s);
    if (symbols.length < 2) {
      showToast("Add at least two holdings to optimize");
      return;
    }
    setOptimization({ status: "running", result: null, forId, forSig });
    const started = Date.now();
    const result = await analyze(symbols);
    const wait = Math.max(0, 900 - (Date.now() - started));
    setTimeout(() => {
      // discard the run if the portfolio was edited or switched while in flight
      if (liveRef.current.activeId !== forId || liveRef.current.signature !== forSig) {
        setOptimization({ status: "idle", result: null });
        return;
      }
      if (!result) {
        setOptimization({ status: "idle", result: null });
        showToast("Optimizer couldn't run; check the tickers");
        return;
      }
      setOptimization({ status: "done", result, forId, forSig });
    }, wait);
  }, [showToast]);

  const applyOptimization = () => {
    const { result, forId } = optimization;
    if (!result || forId !== liveRef.current.activeId) return;
    mutateActive((p) => {
      const bySymbol = Object.fromEntries(p.holdings.map((h) => [h.s, h]));
      const holdings = result.allocations.map((a, i) => ({
        s: a.ticker,
        w: Math.round(a.weight * 1000) / 10,
        c: bySymbol[a.ticker]?.c ?? i % 8,
      }));
      // holdings the engine zeroed out stay in the builder at 0% — Apply
      // must never silently delete a position the user added
      const kept = new Set(holdings.map((h) => h.s));
      for (const h of p.holdings) {
        if (!kept.has(h.s)) holdings.push({ ...h, w: 0 });
      }
      return { ...p, holdings };
    });
    setOptimization({ status: "idle", result: null });
    showToast(`Applied ${result.source === "cloud" ? "cloud" : "local"}-optimized weights`);
  };

  /* --------------------------------- chat --------------------------------- */

  const messages = chatByPortfolio[active.id] || [];

  const sendMessage = (text) => {
    const chatId = active.id;
    setChatByPortfolio((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), { role: "user", text }],
    }));
    const sentPortfolio = active;
    const sentMetrics = metrics;
    setThinking(true);
    setTimeout(() => {
      // answer from the portfolio as it is NOW — unless the user switched
      // tabs mid-thought, in which case answer from the send-time snapshot
      // so portfolio B's numbers never land in portfolio A's chat log
      const stillActive = liveRef.current.activeId === chatId;
      const livePortfolio = stillActive ? liveRef.current.active : sentPortfolio;
      const liveMetrics = stillActive ? liveRef.current.metrics : sentMetrics;
      const reply = respond(text, { portfolio: livePortfolio, metrics: liveMetrics, optimization, budget });
      setChatByPortfolio((prev) => ({
        ...prev,
        [chatId]: [
          ...(prev[chatId] || []),
          { role: "advisor", text: reply.text, structured: reply.structured },
        ],
      }));
      setThinking(false);
      if (reply.action) {
        const { action } = reply;
        if (action.type === "optimize") runOptimize();
        if (action.type === "add") addHolding(action.symbol, action.weight);
        if (action.type === "set") updateWeight(action.symbol, action.weight);
        if (action.type === "remove") removeHolding(action.symbol);
      }
    }, 550 + Math.random() * 450);
  };

  /* ------------------------------- portfolios ------------------------------ */

  const createPortfolio = (name) => {
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    setPortfolios((prev) => [...prev, { id, name, holdings: [] }]);
    setActiveId(id);
    setModal(null);
    showToast(`Created “${name}”. Start adding holdings`);
  };

  const deletePortfolio = (id) => {
    const target = portfolios.find((p) => p.id === id);
    if (target?.holdings.length && !window.confirm(`Delete “${target.name}”? This can't be undone.`)) return;
    setPortfolios((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeId === id && next.length) setActiveId(next[0].id);
      return next;
    });
  };

  const shareReq = useRef(0);

  const openShare = async () => {
    const reqId = ++shareReq.current;
    setShare(null);
    setModal("share");
    const result = await shareSnapshot(active, metrics);
    if (reqId === shareReq.current) setShare(result); // ignore stale responses
  };

  /* --------------------------------- render -------------------------------- */

  if (route === "landing") {
    return (
      <Landing
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onLaunch={goToApp}
        onLogin={() => {
          location.hash = "login";
        }}
      />
    );
  }

  if (route === "login") {
    return (
      <Login
        onSignedIn={(s) => {
          setSession(s);
          location.hash = "app";
          showToast(`Welcome, ${firstName(s)}! Your portfolios are saved to this profile`);
        }}
        onGuest={() => {
          localStorage.setItem(GUEST_OK_KEY, "1");
          location.hash = "app";
        }}
        onBack={() => {
          location.hash = "";
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6">
        <Header
          theme={theme}
          session={session}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onShare={openShare}
          onSettings={() => setModal("settings")}
          onSignIn={() => {
            location.hash = "login";
          }}
        />

        <Tabs
          portfolios={portfolios}
          activeId={active.id}
          onSelect={setActiveId}
          onCreate={() => setModal("create")}
          onDelete={deletePortfolio}
        />

        <main className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:h-[calc(100vh-152px)] xl:min-h-[560px] xl:grid-cols-[330px_minmax(0,1fr)_372px]">
          <HoldingsPanel
            portfolio={active}
            colorFor={colorFor}
            onUpdate={updateWeight}
            onAdd={(s) => {
              addHolding(s);
              showToast(`Added ${s}`);
            }}
            onRemove={removeHolding}
            onSplitEvenly={splitEvenly}
            onNormalize={normalize}
          />

          <div className="flex flex-col gap-4 lg:col-span-1 xl:min-h-0 xl:overflow-y-auto xl:pr-0.5">
            <AllocationCard
              portfolio={active}
              metrics={metrics}
              colorFor={colorFor}
              theme={theme}
              budget={budget}
              onBudgetChange={setBudget}
              optimization={optimization}
              onOptimize={runOptimize}
              onApplyOptimization={applyOptimization}
              onDismissOptimization={() => setOptimization({ status: "idle", result: null })}
            />
            <PerformanceCard portfolio={active} theme={theme} budget={budget} />
            <StressCard portfolio={active} budget={budget} />
            <BriefingCard portfolio={active} metrics={metrics} />
          </div>

          <div className="flex min-h-0 flex-col gap-4 lg:col-span-2 xl:col-span-1">
            <MetricsCard metrics={metrics} budget={budget} />
            <ChatPanel
              portfolio={active}
              metrics={metrics}
              messages={messages}
              onSend={sendMessage}
              thinking={thinking}
            />
          </div>
        </main>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[10px] text-ink3">
          <span>Folio · educational portfolio analytics, not financial advice</span>
          <span>Quant engine: FastAPI + yfinance · Voice: ElevenLabs · Share: Base44</span>
        </footer>
      </div>

      <CreatePortfolioModal open={modal === "create"} onClose={() => setModal(null)} onCreate={createPortfolio} />
      <SettingsModal
        open={modal === "settings"}
        onClose={() => setModal(null)}
        onSaved={() => showToast("Settings saved")}
        session={session}
        onSignOut={() => {
          signOut();
          setSession(null);
          setModal(null);
          showToast("Signed out. Back to the guest workspace");
        }}
      />
      <ShareModal open={modal === "share"} onClose={() => setModal(null)} share={share} />
      <Toast toast={toast} />
    </div>
  );
}
