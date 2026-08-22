/*
 * Share layer — Base44 snapshot sync with a zero-config fallback.
 *
 * With a Base44 app configured in Settings, sharing POSTs the portfolio to a
 * `Snapshot` entity in the Base44 app and returns a short ?snap= link that
 * loads for anyone. Without it, the portfolio is compressed into the URL
 * hash so sharing still works with no backend at all.
 */

import { getSettings } from "./api.js";

const B44_BASE = "https://app.base44.com/api/apps";

function b64encode(obj) {
  const json = JSON.stringify(obj);
  return btoa(String.fromCharCode(...new TextEncoder().encode(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64decode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function snapshotPayload(portfolio, metrics) {
  return {
    name: portfolio.name,
    holdings: portfolio.holdings.map((h) => ({ s: h.s, w: h.w })),
    grade: metrics?.grade || null,
    sharpe: metrics?.sharpe ?? null,
    created: new Date().toISOString(),
  };
}

/** Landing swipe-deck handoff: pack picks into a link the app opens like any share. */
export function packedAppLink(name, holdings) {
  const payload = { name, holdings: holdings.map((h) => ({ s: h.s, w: h.w })), created: new Date().toISOString() };
  return `${location.origin}${location.pathname}?p=${b64encode(payload)}#app`;
}

/** Harden anything that arrived from a link or another client. */
function sanitizeShared(data) {
  if (!data || !Array.isArray(data.holdings)) return null;
  const seen = new Set();
  const holdings = [];
  for (const h of data.holdings) {
    const s = String(h?.s || "").toUpperCase().slice(0, 8);
    const w = Number(h?.w);
    if (!s || !Number.isFinite(w) || w <= 0 || seen.has(s)) continue;
    seen.add(s);
    holdings.push({ s, w: Math.min(100, Math.round(w * 10) / 10) });
  }
  if (!holdings.length) return null;
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 60) : "Shared portfolio";
  return { name, holdings };
}

/** Returns { url, via: "base44" | "link" }. Throws only on hard Base44 errors. */
export async function shareSnapshot(portfolio, metrics) {
  const { base44AppId, base44Key } = getSettings();
  const payload = snapshotPayload(portfolio, metrics);

  if (base44AppId && base44Key) {
    try {
      const res = await fetch(`${B44_BASE}/${base44AppId}/entities/Snapshot`, {
        method: "POST",
        headers: { api_key: base44Key, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const id = data.id || data._id;
        if (id) {
          // carry the packed payload too, so the link still opens for viewers
          // who don't have Base44 credentials of their own
          const url = `${location.origin}${location.pathname}?snap=${id}&p=${b64encode(payload)}#app`;
          return { url, via: "base44" };
        }
      }
    } catch {
      /* fall through to link share */
    }
  }

  const url = `${location.origin}${location.pathname}?p=${b64encode(payload)}#app`;
  return { url, via: "link" };
}

/** Check the URL for a shared portfolio. Returns {name, holdings} or null. */
export async function loadShared() {
  // Base44 snapshot id — try the viewer's credentials first, then an
  // anonymous read (works when the Base44 app allows public reads), and
  // finally fall through to the packed payload below.
  const params = new URLSearchParams(location.search);
  const snapId = params.get("snap");
  if (snapId) {
    const { base44AppId, base44Key } = getSettings();
    if (base44AppId) {
      try {
        const headers = base44Key ? { api_key: base44Key } : undefined;
        const res = await fetch(`${B44_BASE}/${base44AppId}/entities/Snapshot/${snapId}`, { headers });
        if (res.ok) {
          const clean = sanitizeShared(await res.json());
          if (clean) return clean;
        }
      } catch {
        /* ignore */
      }
    }
  }
  // URL-packed fallback
  const packed = params.get("p");
  if (packed) {
    try {
      const clean = sanitizeShared(b64decode(packed));
      if (clean) return clean;
    } catch {
      /* ignore malformed payloads */
    }
  }
  return null;
}

export function isBase44Configured() {
  const { base44AppId, base44Key } = getSettings();
  return Boolean(base44AppId && base44Key);
}
