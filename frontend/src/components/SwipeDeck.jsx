import React, { useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { lookup } from "../data/universe.js";
import { article, computeMetrics, riskWord } from "../lib/quant.js";
import { packedAppLink } from "../lib/cloud.js";

/*
 * Swipe-to-start: a drag-a-card deck (the Taste Labs "dragatile" pattern)
 * wired to the real engine. Swipe right to add a ticker, left to pass; the
 * picks become an equal-weight portfolio scored live, and one link opens it
 * in the app through the existing share plumbing.
 */

const DECK = ["NVDA", "VTI", "TLT", "GLD", "KO", "COIN", "SCHD", "AMZN"];
const THRESHOLD = 90;

function CardFace({ t }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight text-ink">{t.s}</p>
          <p className="mt-0.5 text-[13px] text-ink3">{t.n}</p>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-ink2">{t.sec}</span>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink3">Last year</p>
          <p className={`tnum mt-0.5 text-lg font-bold ${t.r >= 0 ? "text-up" : "text-down"}`}>
            {t.r >= 0 ? "+" : ""}
            {Math.round(t.r * 100)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink3">Character</p>
          <p className="mt-0.5 text-lg font-bold capitalize text-ink">{riskWord(t.v)}</p>
        </div>
      </div>
    </>
  );
}

export default function SwipeDeck() {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState([]);
  const [flying, setFlying] = useState(null); // "add" | "pass" while the card exits
  const [drag, setDrag] = useState(null); // {dx, dy}
  const startRef = useRef(null);

  const done = index >= DECK.length;
  // equal weights that sum to exactly 100: the first pick absorbs the remainder
  const base = picks.length ? Math.floor(1000 / picks.length) / 10 : 0;
  const holdings = picks.map((s, i) => ({
    s,
    w: i === 0 ? Math.round((100 - base * (picks.length - 1)) * 10) / 10 : base,
  }));
  const m = picks.length ? computeMetrics(holdings) : null;

  const decide = (dir) => {
    if (done || flying) return;
    setFlying(dir);
    const picked = DECK[index];
    setTimeout(() => {
      if (dir === "add") setPicks((p) => [...p, picked]);
      setIndex((i) => i + 1);
      setFlying(null);
      setDrag(null);
    }, 240);
  };

  const onPointerDown = (e) => {
    if (flying) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!startRef.current || flying) return;
    setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y });
  };
  const onPointerUp = () => {
    if (!startRef.current || flying) return;
    const dx = drag?.dx || 0;
    startRef.current = null;
    if (Math.abs(dx) > THRESHOLD) decide(dx > 0 ? "add" : "pass");
    else setDrag(null);
  };

  const restart = () => {
    setIndex(0);
    setPicks([]);
    setDrag(null);
    setFlying(null);
  };

  const dx = flying === "add" ? 560 : flying === "pass" ? -560 : drag?.dx || 0;
  const dy = flying ? -40 : (drag?.dy || 0) * 0.3;
  const topStyle = {
    transform: `translate(${dx}px, ${dy}px) rotate(${dx * 0.055}deg)`,
    opacity: flying ? 0 : 1,
    transition: flying
      ? "transform 0.26s cubic-bezier(0.3, 0.7, 0.4, 1), opacity 0.26s ease"
      : drag
        ? "none"
        : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
    touchAction: "pan-y",
  };

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      {/* the deck */}
      <div className="relative mx-auto h-[300px] w-full max-w-[340px] select-none">
        {done ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-line bg-panel p-6 text-center" style={{ boxShadow: "var(--shadow-pop)" }}>
            <p className="text-lg font-bold text-ink">Deck done.</p>
            <p className="mt-2 text-[13px] leading-6 text-ink2">
              {picks.length
                ? `${picks.length} pick${picks.length > 1 ? "s" : ""}, scored on the right.`
                : "Nothing caught your eye. Run it back."}
            </p>
            <button
              onClick={restart}
              className="press mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink transition hover:border-linestrong"
            >
              <RotateCcw size={13} aria-hidden="true" /> Swipe again
            </button>
          </div>
        ) : (
          <>
            {/* next two cards peeking behind */}
            {DECK.slice(index + 1, index + 3).map((s, i) => {
              const t = lookup(s);
              return (
                <div
                  key={s}
                  aria-hidden="true"
                  className="absolute inset-0 flex flex-col rounded-2xl border border-line bg-panel p-5"
                  style={{
                    transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.045})`,
                    boxShadow: "var(--shadow-pop)",
                    zIndex: 2 - i,
                  }}
                >
                  <CardFace t={t} />
                </div>
              );
            })}
            {/* top, draggable card */}
            <div
              role="group"
              aria-label={`${DECK[index]}: decide with the Add and Pass buttons below the deck`}
              className="absolute inset-0 z-10 flex cursor-grab flex-col rounded-2xl border border-linestrong bg-panel p-5 active:cursor-grabbing"
              style={{ ...topStyle, boxShadow: "var(--shadow-pop)" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <CardFace t={lookup(DECK[index])} />
              {/* drag verdict stamps */}
              <span
                aria-hidden="true"
                className="absolute left-4 top-4 rounded-lg border-2 px-2 py-0.5 text-sm font-bold"
                style={{ borderColor: "var(--up)", color: "var(--up)", opacity: Math.max(0, Math.min(1, dx / THRESHOLD)), transform: "rotate(-12deg)" }}
              >
                ADD
              </span>
              <span
                aria-hidden="true"
                className="absolute right-4 top-4 rounded-lg border-2 px-2 py-0.5 text-sm font-bold"
                style={{ borderColor: "var(--down)", color: "var(--down)", opacity: Math.max(0, Math.min(1, -dx / THRESHOLD)), transform: "rotate(12deg)" }}
              >
                PASS
              </span>
            </div>
          </>
        )}

        {/* keyboard-friendly controls */}
        {!done && (
          <div className="absolute -bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-3">
            <button
              onClick={() => decide("pass")}
              aria-label={`Pass on ${DECK[index] || ""}`}
              className="press flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel text-ink2 transition hover:border-linestrong hover:text-down"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <span className="text-[11px] text-ink3">drag, or click</span>
            <button
              onClick={() => decide("add")}
              aria-label={`Add ${DECK[index] || ""}`}
              className="press flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel text-ink2 transition hover:border-linestrong hover:text-up"
            >
              <Check size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* the running verdict */}
      <div className="lg:pl-4">
        {/* announces each decision to screen readers without re-reading the chips */}
        <p className="sr-only" role="status">
          {done
            ? `Deck finished, ${picks.length} picks.`
            : picks.length
              ? `${picks[picks.length - 1]} added, ${picks.length} pick${picks.length > 1 ? "s" : ""}.`
              : ""}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3">Your picks, scored live</p>
        <div className="mt-3 flex min-h-[34px] flex-wrap gap-1.5">
          {picks.length === 0 && <span className="text-[13px] text-ink3">Swipe right on anything you'd own.</span>}
          {picks.map((s) => (
            <span key={s} className="tnum rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-ink">
              {s} · {holdings.find((h) => h.s === s)?.w}%
            </span>
          ))}
        </div>

        {m && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ["Volatility", `${(m.vol * 100).toFixed(1)}%`],
                ["Sharpe", m.sharpe.toFixed(2)],
                ["Grade", m.grade],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-panel px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-ink3">{label}</p>
                  <p className="tnum mt-0.5 text-lg font-bold text-ink">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-6 text-ink2">
              Split evenly, that's {article(riskWord(m.vol))} {riskWord(m.vol)} mix. The engine under this page is
              the one in the app.
            </p>
            <a
              href={packedAppLink("Swiped picks", holdings)}
              className="press mt-4 inline-flex items-center rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition hover:opacity-90"
              style={{ background: "var(--cta-bg)", color: "var(--cta-ink)" }}
            >
              Open these {picks.length} in the app
            </a>
          </>
        )}
      </div>
    </div>
  );
}
