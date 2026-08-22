import React from "react";
import { Moon, Settings2, Share2, Sun } from "lucide-react";

function marketOpen() {
  // NYSE hours approximation: Mon-Fri, 9:30-16:00 ET
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
}

export default function Header({ theme, session, onToggleTheme, onShare, onSettings, onSignIn }) {
  const open = marketOpen();
  return (
    <header className="mb-5 flex items-center justify-between gap-4">
      <button
        onClick={() => {
          location.hash = "";
        }}
        className="flex items-center gap-3 text-left"
        aria-label="Back to the Folio home page"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-lg font-semibold text-bg" aria-hidden="true">
          <span className="font-serif italic">F</span>
        </span>
        <span>
          <span className="block text-[17px] font-semibold leading-tight tracking-tight text-ink">Folio</span>
          <span className="block text-[11px] leading-tight text-ink3">AI portfolio advisor</span>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <div className="mr-1 hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink2 sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${open ? "pulse-dot" : ""}`}
            style={{ background: open ? "var(--up)" : "var(--ink-3)" }}
            aria-hidden="true"
          />
          {open ? "Markets open" : "Markets closed"}
        </div>

        <button
          onClick={onShare}
          aria-label="Share portfolio"
          className="flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink2 transition hover:border-linestrong hover:text-ink"
        >
          <Share2 size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink2 transition hover:border-linestrong hover:text-ink"
        >
          {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>

        <button
          onClick={onSettings}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink2 transition hover:border-linestrong hover:text-ink"
        >
          <Settings2 size={16} aria-hidden="true" />
        </button>

        {session ? (
          <button
            onClick={onSettings}
            title={`${session.name} · manage in Settings`}
            aria-label={`Signed in as ${session.name}, open Settings`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-bg transition hover:opacity-85"
            style={{ background: "var(--accent-text)" }}
          >
            {session.name.trim().charAt(0).toUpperCase()}
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="flex h-9 items-center rounded-xl border border-line px-3 text-sm font-medium text-ink2 transition hover:border-linestrong hover:text-ink"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
