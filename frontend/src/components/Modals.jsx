import React, { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { ELEVEN_VOICES, getSettings, saveSettings } from "../lib/api.js";
import { Modal, PrimaryButton, GhostButton } from "./ui.jsx";

function ModalHeader({ eyebrow, title, onClose }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink3">{eyebrow}</p>
        <h3 className="mt-0.5 text-lg font-semibold text-ink">{title}</h3>
      </div>
      <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink3 transition hover:bg-panel2 hover:text-ink">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-panel2/60 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-linestrong";

/* ------------------------------ create modal ------------------------------ */

export function CreatePortfolioModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const create = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
  };

  return (
    <Modal open={open} onClose={onClose} label="Create portfolio">
      <ModalHeader eyebrow="New" title="Create a portfolio" onClose={onClose} />
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
        placeholder="e.g. AI Leaders, Safe & Steady…"
        aria-label="Portfolio name"
        className={inputClass}
      />
      <div className="mt-4 flex gap-2">
        <GhostButton onClick={onClose} className="flex-1">Cancel</GhostButton>
        <PrimaryButton onClick={create} disabled={!name.trim()} className="flex-1">Create</PrimaryButton>
      </div>
    </Modal>
  );
}

/* ----------------------------- settings modal ----------------------------- */

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-ink">{label}</span>
        {hint && <span className="text-[10px] text-ink3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function SettingsModal({ open, onClose, onSaved, session, onSignOut }) {
  const [form, setForm] = useState(getSettings());
  useEffect(() => {
    if (open) setForm(getSettings());
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = () => {
    saveSettings(form);
    onSaved?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} label="Settings" width="max-w-lg">
      <ModalHeader eyebrow="Configuration" title="Settings" onClose={onClose} />
      <div className="space-y-4">
        {session && (
          <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-bg"
                style={{ background: "var(--accent-text)" }}
                aria-hidden="true"
              >
                {session.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{session.name}</p>
                <p className="truncate text-[11px] text-ink3">{session.email} · profile stored in this browser</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink2 transition hover:border-linestrong hover:text-ink"
            >
              Sign out
            </button>
          </div>
        )}
        <Field label="Quant engine URL" hint="FastAPI backend · falls back to the local engine">
          <input value={form.backendUrl} onChange={set("backendUrl")} placeholder="http://localhost:8000" className={inputClass} spellCheck={false} />
        </Field>

        <div className="rounded-xl border border-line p-3.5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ink3">Voice briefings · ElevenLabs</p>
          <div className="space-y-3">
            <Field label="API key" hint="stored only in this browser">
              <input type="password" value={form.elevenKey} onChange={set("elevenKey")} placeholder="sk_…" className={inputClass} spellCheck={false} autoComplete="off" />
            </Field>
            <Field label="Voice">
              <select value={form.elevenVoice} onChange={set("elevenVoice")} className={inputClass}>
                {ELEVEN_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-line p-3.5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ink3">Share sync · Base44</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="App ID">
              <input value={form.base44AppId} onChange={set("base44AppId")} placeholder="app id" className={inputClass} spellCheck={false} />
            </Field>
            <Field label="API key">
              <input type="password" value={form.base44Key} onChange={set("base44Key")} placeholder="key" className={inputClass} spellCheck={false} autoComplete="off" />
            </Field>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-ink3">
            With a Base44 app configured, Share saves a snapshot to its database and returns a short link. Without one, sharing packs the portfolio into the link itself.
          </p>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <GhostButton onClick={onClose} className="flex-1">Cancel</GhostButton>
        <PrimaryButton onClick={save} className="flex-1">Save settings</PrimaryButton>
      </div>
    </Modal>
  );
}

/* ------------------------------- share modal ------------------------------ */

export function ShareModal({ open, onClose, share }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard denied */
    }
  };

  return (
    <Modal open={open} onClose={onClose} label="Share portfolio">
      <ModalHeader eyebrow="Share" title="Send this portfolio" onClose={onClose} />
      {!share ? (
        <div role="status">
          <span className="sr-only">Generating link</span>
          <div className="shimmer h-10 rounded-xl" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={share.url}
              aria-label="Share link"
              onFocus={(e) => e.target.select()}
              className={`${inputClass} tnum flex-1 truncate text-xs`}
            />
            <button
              onClick={copy}
              aria-label="Copy link"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink2 transition hover:border-linestrong hover:text-ink"
            >
              {copied ? <Check size={15} className="text-up" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-ink3">
            {share.via === "base44"
              ? "Snapshot saved to your Base44 app; anyone with the link sees this exact portfolio."
              : "The whole portfolio is packed into this link: no account, no server. (Connect Base44 in Settings for short links.)"}
          </p>
        </>
      )}
    </Modal>
  );
}
