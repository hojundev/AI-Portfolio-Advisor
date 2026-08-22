import React, { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { CountUp } from "./ui.jsx";
import {
  AudioLines,
  Check,
  ChevronDown,
  Cloud,
  Link2,
  MessageCircleQuestion,
  Moon,
  Play,
  Sun,
} from "lucide-react";
import { UNIVERSE } from "../data/universe.js";
import BuilderDemo from "./BuilderDemo.jsx";
import SwipeDeck from "./SwipeDeck.jsx";

const N_TICKERS = UNIVERSE.length;

/* ------------------------------ scroll reveal ------------------------------ */

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* --------------------------------- pieces --------------------------------- */

function LaunchButton({ onLaunch, children = "Build my portfolio", className = "" }) {
  return (
    <button
      onClick={onLaunch}
      className={`press inline-flex items-center rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition hover:opacity-90 ${className}`}
      style={{ background: "var(--cta-bg)", color: "var(--cta-ink)" }}
    >
      {children}
    </button>
  );
}

function Shot({ src, alt, className = "", imgClass = "", eager = false, width, height }) {
  return (
    <figure className={`overflow-hidden rounded-2xl border border-linestrong bg-panel ${className}`} style={{ boxShadow: "var(--shadow-pop)" }}>
      <div className="flex items-center gap-1.5 border-b border-line bg-panel2/80 px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-down opacity-60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn opacity-60" />
        <span className="h-2.5 w-2.5 rounded-full bg-up opacity-60" />
        <span className="ml-3 hidden truncate rounded-md bg-bg/60 px-2 py-0.5 text-[10px] text-ink3 sm:block">
          folio.app
        </span>
      </div>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchpriority={eager ? "high" : undefined}
        width={width}
        height={height}
        className={`block h-auto w-full ${imgClass}`}
      />
    </figure>
  );
}

function NumberStat({ n, label, delay }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-reveal className="reveal px-4 py-10 text-center" style={{ transitionDelay: delay }}>
      <p className="tnum text-5xl font-semibold tracking-tight text-ink">
        <CountUp value={n} run={seen} />
      </p>
      <p className="mt-2 text-xs uppercase tracking-wider text-ink3">{label}</p>
    </div>
  );
}

/* ---------------------------------- data ---------------------------------- */

const STACK = [
  { n: "01", name: "Builder", body: `${N_TICKERS} stocks & funds, weighted with sliders, steppers, and one-tap presets: Classic 60/40, All-Weather, Tech Growth.` },
  { n: "02", name: "Risk engine", body: "Six numbers recomputed live on every drag, using how your assets really move together, plus a Crash Test that replays 2008, a rate shock, and an inflation spike against your exact mix." },
  { n: "03", name: "Optimizer", body: "A cloud engine studies a year of real market history and suggests better weights; a second engine built into the browser keeps answering when the Wi-Fi dies." },
  { n: "04", name: "Advisor", body: "A chat grounded in your actual numbers. It answers what-ifs with simulations, and it edits the portfolio on command." },
  { n: "05", name: "Voice", body: "ElevenLabs turns every briefing into studio narration. Your portfolio, read to you like the morning news." },
  { n: "06", name: "Share", body: "One link, synced through Base44, opens your exact portfolio on any machine. No account, no export, no screenshots." },
];

const PROBLEMS = [
  { word: "Blind", body: "Most apps show you what you own, not that 60% of your risk is sitting in one sector, waiting for a bad quarter." },
  { word: "Jargon", body: "Sharpe, beta, volatility. The numbers that decide your outcome are never explained in words you'd actually use." },
  { word: "Frozen", body: "Generic advice that doesn't move when your portfolio does. Your risk changes in real time; guidance should too." },
];

/* Acctual-style feature rows: header split (title left, prose right), then a
   full-width product image, then a serif pull-line. */
const FEATURES = [
  {
    kicker: "Build",
    title: "Build it like a pro.",
    body: "Start from a preset the pros argue about (the Classic 60/40, Dalio's All-Weather, a tech tilt) or search the universe and build your own. Every weight is a slider, a stepper, and a keyboard away, and you always see how your custom mix stacks up against the portfolios the pros actually run.",
    bullets: ["Live totals and a plain-word verdict on every holding", "Split evenly, scale to 100%, allocation guard-rails", "Everything persists: close the tab, keep the work"],
    demo: true,
    pull: "That was the real engine. The app adds the growth curve, crash tests, and an advisor on top.",
  },
  {
    kicker: "Optimize",
    title: "One click. Risk-balanced weights.",
    body: "The engine weighs a year of history and shows its answer next to yours, position by position, delta by delta. Apply it in one tap, or keep your conviction. Either way, you see exactly what changes, and why, in plain English.",
    bullets: ["Risk-adjusted score nearly doubled on the demo portfolio", "Real engine on live market data, offline twin as a safety net", "No return predictions, ever. And it says so"],
    shot: "/shot-optimize",
    alt: "Folio's optimizer comparing your weights against risk-balanced weights",
    w: 859,
    h: 1532,
    cropBottom: true, // the compare panel is the story; crop off the donut
    pull: "Your weights and the machine's, side by side, with the reasoning written out.",
  },
  {
    kicker: "Understand",
    title: "An advisor that knows your numbers.",
    body: "Ask how risky the portfolio is and it answers with your volatility, your beta, your jumpiest holding. Ask “what if I add GLD?” and it runs the simulation. Tell it to add NVDA at 10% and it just does it. Ask by voice, and ElevenLabs reads the answer aloud.",
    bullets: ["Structured answers: what I found · items to watch · bottom line", "What-if simulations and crash tests computed on the spot", "Voice in, voice out"],
    shot: "/shot-advisor",
    alt: "Folio's advisor chat answering a risk question with structured findings",
    w: 651,
    h: 1810,
    tall: true,
    pull: "Not a chatbot next to a dashboard. An advisor with its hands on the controls.",
  },
];

const NUMBERS = [
  { n: String(N_TICKERS), label: "tickers indexed" },
  { n: "6", label: "metrics, recomputed live" },
  { n: "2", label: "quant engines, cloud + offline" },
  { n: "0", label: "sign-ups required" },
];

const FAQS = [
  {
    q: "Is this financial advice?",
    a: "No. Folio is an educational simulator built for Ignition Hacks 2026. It computes real portfolio math and explains it in plain language, but it doesn't know you, your goals, or your taxes, and it never tells you to buy or sell. Think of it as a gym for portfolio intuition.",
  },
  {
    q: "Where do the numbers actually come from?",
    a: `The cloud engine (FastAPI on Render) pulls a year of adjusted price history from Yahoo Finance and computes returns, volatility, and correlations from it. The in-browser engine carries a dated statistical snapshot of all ${N_TICKERS} tickers so every metric still works with zero network. Both return the same three headline fields, estimated from different data, so they won't agree to the decimal; the result always says which engine answered.`,
  },
  {
    q: "What does “Optimize with AI” really do?",
    a: "The cloud engine runs L1-penalized spectral eigen-portfolio selection (after Guo, Boyle, Weng & Wirjanto): it keeps the informative correlation patterns in a year of market history and suppresses the noisy ones. The offline twin uses inverse-volatility risk balancing. Both size positions by risk only and never forecast returns; you always see the before/after and a written rationale before deciding to apply.",
  },
  {
    q: "Does it work offline?",
    a: "Yes, deliberately. Search, metrics, the optimizer's local twin, the advisor chat, and sharing via link all run entirely in your browser. The cloud engine and studio voice are upgrades, not dependencies. Demos die on conference Wi-Fi; Folio doesn't.",
  },
  {
    q: "What are ElevenLabs and Base44 doing in a portfolio app?",
    a: "ElevenLabs narrates your daily briefing: the serif paragraph that explains your portfolio gets read aloud in a studio voice (with a browser-voice fallback). Base44 is the share layer: a snapshot of your portfolio is saved to a Base44 app's database and comes back as a link that recreates it anywhere.",
  },
  {
    q: "Is the growth chart a prediction?",
    a: "No, and it says so on the chart. It's a deterministic simulation built from each holding's trailing-year statistics, so you can compare allocations on equal footing. Same portfolio, same curve, every time. It's a comparison tool, not a crystal ball.",
  },
];

const MARQUEE = [
  "Spectral eigen-portfolio selection",
  "w'Σw risk, live on every drag",
  "2008, replayed in dollars",
  "Sharpe over a 4% cash rate",
  "Two engines, zero downtime",
  "No return forecasts, by design",
  `${N_TICKERS} tickers, dated stats`,
  "Voice in, voice out",
];

/* --------------------------------- landing --------------------------------- */

export default function Landing({ theme, onToggleTheme, onLaunch, onLogin, session }) {
  const ref = useReveal();
  // product shots match the page theme (light site gets light screenshots)
  const shotSrc = (base) => `${base}${theme === "light" ? "-light" : ""}.png`;

  // Acctual-style inertial scrolling, landing only; native scroll under reduced motion
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: true });
    return () => lenis.destroy();
  }, []);

  // hero preview flips from screenshot to the REAL app in a scaled frame
  const [live, setLive] = useState(false);
  const [frameScale, setFrameScale] = useState(0.66);
  const frameRef = useRef(null);
  useEffect(() => {
    if (!live) return;
    const measure = () => setFrameScale((frameRef.current?.clientWidth || 950) / 1440);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [live]);

  return (
    <div ref={ref} className="min-h-screen bg-bg text-ink">
      {/* compact floating nav — logo + links clustered left, actions right */}
      <nav className="intro-nav sticky top-3 z-40 px-4">
        <div
          className="mx-auto flex max-w-[1070px] items-center justify-between rounded-full border border-line bg-panel/95 py-1.5 pl-3 pr-1.5 backdrop-blur-xl"
          style={{ boxShadow: "0 8px 24px rgba(13,17,27,.07)" }}
        >
          <div className="flex items-center gap-5">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2"
              aria-label="Back to top"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-serif text-sm italic text-bg" aria-hidden="true"><span className="logo-f">F</span></span>
              <span className="text-[15px] font-semibold tracking-tight">Folio</span>
            </button>
            <div className="hidden items-center gap-0.5 text-[13.5px] font-medium text-ink2 md:flex">
              {[
                ["Product", "#product"],
                ["How it works", "#how"],
                ["FAQ", "#faq"],
              ].map(([label, href]) => (
                <a key={label} href={href} className="rounded-full px-3 py-1.5 transition hover:bg-panel2 hover:text-ink">
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="press flex h-8 w-8 items-center justify-center rounded-full text-ink2 transition hover:bg-panel2 hover:text-ink"
            >
              {theme === "dark" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            </button>
            {session ? (
              <>
                <span className="hidden px-2 text-[13px] font-medium text-ink2 sm:block">
                  Hi, {session.name.split(/\s+/)[0]}
                </span>
                <button
                  onClick={onLaunch}
                  className="press rounded-full px-4 py-2 text-[13px] font-semibold transition hover:opacity-90"
                  style={{ background: "var(--cta-bg)", color: "var(--cta-ink)" }}
                >
                  Open Folio
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="press rounded-full px-3.5 py-2 text-[13px] font-medium text-ink2 transition hover:bg-panel2 hover:text-ink"
                >
                  Log in
                </button>
                <button
                  onClick={onLaunch}
                  className="press rounded-full px-4 py-2 text-[13px] font-semibold transition hover:opacity-90"
                  style={{ background: "var(--cta-bg)", color: "var(--cta-ink)" }}
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* hero — Acctual centered layout with edge-prop collage */}
      <header className="relative overflow-hidden">
        {theme === "dark" ? (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="glow-drift absolute left-1/2 top-[-260px] h-[560px] w-[900px] rounded-full opacity-[0.14] blur-3xl" style={{ background: "radial-gradient(closest-side, var(--accent), transparent 70%)" }} />
            {/* the SAME photos as light, dimmed, with their paper grounds
                removed (baked alpha) so only the objects sit on the black */}
            <div className="hidden xl:block">
              <img src="/props/laptop-dark.webp" alt="" className="prop-tr absolute right-[-100px] top-[-60px] w-[460px]" loading="lazy" fetchpriority="low" />
              <img src="/props/money-dark.webp" alt="" className="absolute left-[-190px] top-[-30px] w-[440px] rotate-[-8deg]" loading="lazy" fetchpriority="low" />
              <img src="/props/keyboard-dark.webp" alt="" className="prop-bl absolute left-[-160px] top-[430px] w-[460px] rotate-[18deg]" loading="lazy" fetchpriority="low" />
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 55%, var(--bg))" }} />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
            {/* photographic props framing the edges, Acctual-style (Pexels, free
                license): one consistent bird's-eye perspective across all three.
                All lazy + low priority: hidden below xl (never fetched there),
                and on xl they must not compete with the LCP hero screenshot */}
            <img src="/props/laptop.jpg" alt="" className="prop-fade prop-crisp prop-tr absolute right-[-100px] top-[-60px] w-[460px]" loading="lazy" fetchpriority="low" />
            <img src="/props/money-edge.jpg" alt="" className="prop-fade prop-bright prop-l absolute left-[-200px] top-[-70px] w-[400px] rotate-[-8deg]" loading="lazy" fetchpriority="low" />
            <img src="/props/keyboard.jpg" alt="" className="prop-fade prop-bl absolute left-[-160px] top-[430px] w-[460px] rotate-[18deg]" loading="lazy" fetchpriority="low" />
          </div>
        )}

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-16">
          <p className="intro-rise mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent-text)", animationDelay: "0.05s" }}>
            Built for Ignition Hacks 2026 · {N_TICKERS} stocks &amp; funds · no sign-up
          </p>

          <h1 className="mx-auto mt-5 max-w-2xl text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[58px]">
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="intro-line" style={{ animationDelay: "0.12s" }}>Real quant math.</span>
            </span>
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="intro-line" style={{ animationDelay: "0.22s" }}>Explained like a human.</span>
            </span>
          </h1>

          <p className="intro-rise mx-auto mt-4 max-w-md text-[14.5px] leading-6 text-ink3" style={{ animationDelay: "0.34s" }}>
            Build a portfolio and watch what it would really do: the growth, the swings,
            even a 2008-style crash. All of it in plain words.
          </p>

          <div className="intro-rise mt-7 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.42s" }}>
            <LaunchButton onLaunch={onLaunch}>{session ? "Open my portfolio" : "Build my portfolio"}</LaunchButton>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium" style={{ color: "var(--accent-text)" }}>
            {["Risk, live", "Return, live", "Crash test, in dollars", "Diversification, scored"].map((m, i) => (
              <span key={m} className="intro-rise flex items-center gap-1.5" style={{ animationDelay: `${0.5 + i * 0.07}s` }}>
                <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true">
                  <Check size={10} color="#fff" strokeWidth={3.5} />
                </span>
                {m}
              </span>
            ))}
          </div>

          {/* product preview — a screenshot until clicked, then the REAL app
              running in a scaled frame. Tilt/float pause while it's live. */}
          <div
            className="relative mx-auto mt-14 max-w-5xl"
            onMouseMove={(e) => {
              if (live) return;
              const el = e.currentTarget;
              if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
              const r = el.getBoundingClientRect();
              const x = (e.clientX - r.left) / r.width - 0.5;
              const y = (e.clientY - r.top) / r.height - 0.5;
              el.style.setProperty("--tx", `${(x * 5).toFixed(2)}deg`);
              el.style.setProperty("--ty", `${(-y * 4).toFixed(2)}deg`);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty("--tx", "0deg");
              e.currentTarget.style.setProperty("--ty", "0deg");
            }}
          >
            <div
              className="anim-sheet-in img-blend absolute inset-x-10 top-6 h-full rounded-[22px] border border-line bg-panel"
              style={{ boxShadow: "var(--shadow-pop)" }}
              aria-hidden="true"
            />
            <div className="anim-card-in relative z-10">
              <div className={live ? "" : "float-slow"}>
                <div
                  className={`${live ? "" : "hero-tilt img-blend"} rounded-[22px] border border-line bg-panel p-2 sm:p-2.5`}
                  style={{ boxShadow: "var(--shadow-pop)" }}
                >
                  {live ? (
                    <div ref={frameRef} className="relative w-full overflow-hidden rounded-[14px]" style={{ aspectRatio: "1440 / 900" }}>
                      <iframe
                        src="/#app"
                        title="Folio live dashboard"
                        className="absolute left-0 top-0 origin-top-left border-0"
                        style={{ width: 1440, height: 900, transform: `scale(${frameScale})` }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLive(true)}
                      aria-label="Load the live dashboard right here"
                      className="group relative block w-full cursor-pointer"
                    >
                      <img
                        src={theme === "light" ? "/shot-hero-light.webp" : "/shot-hero.webp"}
                        alt="The Folio dashboard: builder, allocation donut, live metrics, briefing and advisor chat"
                        width={3840}
                        height={2571}
                        loading="eager"
                        fetchpriority="high"
                        className="block h-auto w-full rounded-[14px]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/0 transition group-hover:bg-black/10" aria-hidden="true">
                        <span
                          className="flex translate-y-1 items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                          style={{ background: "var(--cta-bg)", color: "var(--cta-ink)" }}
                        >
                          <Play size={13} fill="currentColor" /> Drive it live
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
      {/* marquee */}
      <section className="border-y border-line py-5" aria-labelledby="marquee-caption">
        <p id="marquee-caption" className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-ink3">The method, at a glance</p>
        <div className="marquee-mask overflow-hidden">
          <div className="marquee flex w-max items-center">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((name, i) => (
              <span key={i} className="flex items-center whitespace-nowrap text-sm font-medium tracking-wide text-ink2" aria-hidden={i >= MARQUEE.length ? "true" : undefined}>
                {name}
                <span className="mx-5 text-xs" style={{ color: "var(--accent)" }} aria-hidden="true">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div data-reveal className="reveal max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3">The problem</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl">
            Investing apps show you what you own.
            <br className="hidden sm:block" /> Never why it's risky.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <div key={p.word} data-reveal className="reveal lift rounded-2xl border border-line bg-panel p-6 hover:border-linestrong" style={{ transitionDelay: `${i * 70}ms` }}>
              <p className="text-2xl font-bold tracking-tight text-ink">{p.word}.</p>
              <p className="mt-3 text-sm leading-6 text-ink2">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* manifesto */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p data-reveal className="reveal text-3xl font-bold leading-snug tracking-[-0.02em] sm:text-5xl">
            Don't trust vibes.
            <br />
            Trust the math.
          </p>
          <p data-reveal className="reveal mx-auto mt-6 max-w-2xl text-[15px] leading-7 text-ink2">
            Every number in Folio is computed, not narrated: expected return, volatility, correlations,
            concentration. The AI only opens its mouth when the math backs it up, and it shows the working
            every time.
          </p>
        </div>
      </section>

      {/* swipe-to-start deck */}
      <section className="mx-auto max-w-6xl px-4 py-20 pb-28 sm:px-6" aria-labelledby="swipe-heading">
        <div data-reveal className="reveal max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3">Try it</p>
          <h2 id="swipe-heading" className="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl">
            Not sure where to start?
            <br className="hidden sm:block" /> Swipe.
          </h2>
        </div>
        <div data-reveal className="reveal mt-10">
          <SwipeDeck />
        </div>
      </section>

      {/* stack 01-06 */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 border-t border-line px-4 py-20 sm:px-6">
        <div data-reveal className="reveal flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3">The system</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Six pieces. One advisor.</h2>
          </div>
          <LaunchButton onLaunch={onLaunch} className="!py-2.5" />
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s, i) => (
            <div key={s.n} data-reveal className="reveal bg-panel p-6 transition duration-300 hover:bg-panel2" style={{ transitionDelay: `${i * 55}ms` }}>
              <p className="tnum text-xs font-semibold" style={{ color: "var(--accent-text)" }}>{s.n}</p>
              <p className="mt-2 text-[15px] font-semibold text-ink">{s.name}</p>
              <p className="mt-2 text-[13px] leading-6 text-ink2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* feature deep-dives — Acctual stacked pattern */}
      <section id="product" className="scroll-mt-24 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`py-16 ${i < FEATURES.length - 1 ? "border-b border-line" : ""}`}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
                <div data-reveal className="reveal">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3">{f.kicker}</p>
                  <h3 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl">{f.title}</h3>
                </div>
                <div data-reveal className="reveal">
                  <p className="text-[15px] leading-7 text-ink2">{f.body}</p>
                  <ul className="mt-4 space-y-2">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-ink2">
                        <Check size={14} className="mt-1 shrink-0" style={{ color: "var(--accent-text)" }} aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div data-reveal className="reveal mt-10">
                {f.demo ? (
                  <BuilderDemo />
                ) : (
                  <Shot
                    src={shotSrc(f.shot)}
                    alt={f.alt}
                    width={f.w}
                    height={f.h}
                    className={f.tall ? "mx-auto max-w-xl" : "mx-auto max-w-4xl"}
                    imgClass={
                      f.tall
                        ? "max-h-[640px] object-cover object-top"
                        : f.cropBottom
                          ? "max-h-[660px] object-cover object-bottom"
                          : ""
                    }
                  />
                )}
              </div>

              <p data-reveal className="reveal mx-auto mt-8 max-w-xl text-center text-lg font-medium leading-7 text-ink2">
                “{f.pull}”
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* numbers strip */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-0 sm:px-6 lg:grid-cols-4">
          {NUMBERS.map((s, i) => (
            <NumberStat key={s.label} n={s.n} label={s.label} delay={`${i * 60}ms`} />
          ))}
        </div>
      </section>

      {/* integrations */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div data-reveal className="reveal max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3">Under the hood</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Partner tech, pulling real weight.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div data-reveal className="reveal lift rounded-2xl border border-line bg-panel p-6 hover:border-linestrong">
            <AudioLines size={20} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
            <p className="mt-3 font-semibold">ElevenLabs</p>
            <p className="mt-2 text-[13px] leading-6 text-ink2">
              Studio narration for every briefing. Four voices, one key, and a browser-voice fallback so the
              feature never goes silent.
            </p>
          </div>
          <div data-reveal className="reveal lift rounded-2xl border border-line bg-panel p-6 hover:border-linestrong" style={{ transitionDelay: "70ms" }}>
            <Link2 size={20} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
            <p className="mt-3 font-semibold">Base44</p>
            <p className="mt-2 text-[13px] leading-6 text-ink2">
              The share layer. Snapshots save to a Base44 app's database, and every link also carries the
              portfolio itself, so it rebuilds anywhere, even with zero setup on the other end.
            </p>
          </div>
          <div data-reveal className="reveal lift rounded-2xl border border-line bg-panel p-6 hover:border-linestrong" style={{ transitionDelay: "140ms" }}>
            <Cloud size={20} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
            <p className="mt-3 font-semibold">Render + Gemini</p>
            <p className="mt-2 text-[13px] leading-6 text-ink2">
              The FastAPI quant engine deploys on Render and Gemini writes the cloud-side insight, while the
              offline twin keeps every demo alive.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ — Acctual-style colored panel with a question card */}
      <section id="faq" className="scroll-mt-24 px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl px-5 py-12 sm:px-10" style={{ background: "var(--faq-panel)", border: "1px solid var(--faq-line)" }}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              <h2 data-reveal className="reveal text-3xl font-bold tracking-[-0.02em] sm:text-4xl" style={{ color: "var(--faq-ink)" }}>Fair questions, straight answers.</h2>
              <div className="mt-8 space-y-2">
                {FAQS.map((f) => (
                  <details key={f.q} data-reveal className="reveal group rounded-xl px-5 transition" style={{ border: "1px solid var(--faq-line)" }}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden" style={{ color: "var(--faq-ink)" }}>
                      {f.q}
                      <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" style={{ color: "var(--faq-ink-2)" }} aria-hidden="true" />
                    </summary>
                    <p className="pb-5 text-sm leading-7" style={{ color: "var(--faq-ink-2)" }}>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div data-reveal className="reveal lg:pt-16">
              <div className="rounded-2xl border border-line bg-panel p-6" style={{ boxShadow: "var(--shadow-pop)" }}>
                <MessageCircleQuestion size={22} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
                <p className="mt-3 text-lg font-semibold">Got a question for us?</p>
                <p className="mt-2 text-[13px] leading-6 text-ink2">
                  The whole build is open: read the code, run it locally, or poke the live app. Everything
                  needed to judge it is in the repo.
                </p>
                <a
                  href="https://github.com/hojundev/AI-Portfolio-Advisor"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-linestrong"
                >
                  View the repository
                </a>
                <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-ink3">
                  No accounts, no fees, no advice. An educational build for Ignition Hacks 2026.
                </p>
                <button onClick={onLaunch} className="press mt-3 w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-bg transition hover:opacity-85">
                  Start building
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <h2 data-reveal className="reveal text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-6xl">
            See your portfolio
            <br />
            clearly.
          </h2>
          <p data-reveal className="reveal mx-auto mt-5 max-w-md text-[15px] leading-7 text-ink2">
            Six presets, a search bar, and an advisor that shows its working. Thirty seconds to your first
            briefing.
          </p>
          <div data-reveal className="reveal mt-8">
            <LaunchButton onLaunch={onLaunch} className="!px-8 !py-4 !text-base" />
          </div>
        </div>
      </section>
      </main>

      {/* footer */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-serif text-base italic text-bg" aria-hidden="true"><span className="logo-f">F</span></span>
                <span className="text-[15px] font-semibold tracking-tight">Folio</span>
              </div>
              <p className="mt-3 max-w-xs text-[13px] leading-6 text-ink3">
                An AI portfolio advisor that computes real risk math and explains it like a human. Built in a
                weekend for Ignition Hacks 2026.
              </p>
              <button onClick={onLaunch} className="press mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition hover:opacity-85">
                Build my portfolio
              </button>
            </div>
            {[
              { title: "Product", links: [["Launch app", null], ["Presets", null], ["Optimizer", "#product"], ["Advisor", "#product"]] },
              { title: "Method", links: [["Correlation model", "#how"], ["Spectral selection", "#faq"], ["Diversification score", "#how"], ["Health grades", "#how"]] },
              { title: "Hackathon", links: [["Ignition Hacks 2026", null], ["FinTech track", null], ["GitHub repo", "https://github.com/hojundev/AI-Portfolio-Advisor"]] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3">{col.title}</p>
                <ul className="mt-3 space-y-2 text-[13px] text-ink2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      {href?.startsWith("http") ? (
                        <a href={href} target="_blank" rel="noreferrer" className="transition hover:text-ink">{label}</a>
                      ) : href ? (
                        <a href={href} className="transition hover:text-ink">{label}</a>
                      ) : (
                        <button onClick={onLaunch} className="transition hover:text-ink">{label}</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[11px] text-ink3">
            <span>© 2026 the Folio team · an educational simulation, not financial advice</span>
            <span className="tnum">React · FastAPI · ElevenLabs · Base44 · Render</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
