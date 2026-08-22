import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";


/* ------------------------------ theme colors ------------------------------ */

function readThemeColors() {
  const css = getComputedStyle(document.documentElement);
  const read = (name) => css.getPropertyValue(name).trim();
  return {
    series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => read(`--series-${i}`)),
    ink: read("--ink"),
    ink2: read("--ink-2"),
    ink3: read("--ink-3"),
    line: read("--line-strong"),
    panel: read("--panel"),
    up: read("--up"),
    down: read("--down"),
  };
}

/**
 * Resolve CSS custom properties to concrete colors (Recharts sets SVG
 * attributes, which can't resolve var()). The data-theme attribute is
 * stamped synchronously in a layout effect BEFORE reading, so charts are
 * never a theme behind the rest of the UI.
 */
export function useThemeColors(theme) {
  const [colors, setColors] = useState(readThemeColors);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    setColors(readThemeColors());
  }, [theme]);
  return colors;
}

/* --------------------------------- shells --------------------------------- */

export function Card({ children, className = "", ...rest }) {
  return (
    <section
      className={`rounded-2xl border border-line bg-panel ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardHeader({ eyebrow, title, right }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink3">{eyebrow}</p>
        {title && <h2 className="mt-0.5 truncate text-[15px] font-semibold text-ink">{title}</h2>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function Delta({ value, digits = 1, suffix = "%" }) {
  const positive = value >= 0;
  return (
    <span className={`tnum inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-up" : "text-down"}`}>
      <span aria-hidden="true">{positive ? "▲" : "▼"}</span>
      {Math.abs(value * 100).toFixed(digits)}
      {suffix}
      <span className="sr-only">{positive ? " up" : " down"}</span>
    </span>
  );
}

/* ---------------------------------- modal --------------------------------- */

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, children, width = "max-w-md", label }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    // give autoFocus inputs one tick, then ensure focus is inside the dialog
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    }, 0);

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]"
      style={{ background: "var(--overlay)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`anim-fade-up w-full ${width} rounded-2xl border border-line bg-panel p-5 outline-none`}
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.35)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------- toast --------------------------------- */

export function Toast({ toast }) {
  // the live region stays mounted so screen readers reliably announce changes
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2" role="status" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className="anim-fade-up flex items-center gap-2 rounded-full border border-line bg-panel py-2 pl-3 pr-4 text-sm text-ink"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,.3)" }}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]" style={{ background: "var(--up)", color: "#fff" }} aria-hidden="true">
            ✓
          </span>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- buttons -------------------------------- */

export function PrimaryButton({ children, className = "", ...rest }) {
  return (
    <button
      className={`press rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...rest }) {
  return (
    <button
      className={`press rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm font-medium text-ink2 transition hover:border-linestrong hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------- count-up -------------------------------- */

/** Animate a number from 0 → target once, when `run` flips true. */
export function CountUp({ value, run = true, duration = 900 }) {
  const numeric = parseFloat(value);
  const suffix = String(value).replace(/^[\d.]+/, "");
  const [display, setDisplay] = useState(Number.isFinite(numeric) ? 0 : value);

  useEffect(() => {
    if (!run || !Number.isFinite(numeric)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(numeric);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(numeric * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric, run, duration]);

  if (!Number.isFinite(numeric)) return <>{value}</>;
  return (
    <>
      {display}
      {suffix}
    </>
  );
}
