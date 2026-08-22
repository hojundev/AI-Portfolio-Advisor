import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createAccount, getAccount, oauthSignIn, unlock } from "../lib/session.js";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/*
 * Sign-in page — Resend-style anatomy (theme-aware centered column under a
 * glowing top beam, SSO buttons, divider, email continue), Folio-branded, honest:
 * accounts are local profiles guarded by a hashed PIN, so SSO is gated until
 * the cloud deploy. Flow: email → PIN unlock, or name + new PIN for new emails.
 */

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-panel2/60 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-linestrong";

export default function Login({ onSignedIn, onGuest, onBack }) {
  const [stage, setStage] = useState("email"); // email | pin | create
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [known, setKnown] = useState(null); // existing account for this email
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pinValid = /^\d{4,6}$/.test(pin);
  const canSubmit =
    stage === "email" ? emailValid : stage === "pin" ? pinValid : pinValid && name.trim().length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setNotice(null);

    if (stage === "email") {
      if (!emailValid) return setNotice("Enter a valid email to continue.");
      const account = getAccount(email);
      setPin("");
      if (account && !account.hasPin) {
        return setNotice("That profile uses Google sign-in. Use the Google button above.");
      }
      if (account) {
        setKnown(account);
        setStage("pin");
      } else {
        setStage("create");
      }
      return;
    }

    if (!pinValid) return setNotice("PINs are 4 to 6 digits.");
    setBusy(true);
    try {
      if (stage === "pin") {
        const res = await unlock({ email, pin });
        if (!res.ok) return setNotice("Wrong PIN. Try again.");
        onSignedIn(res.session);
      } else {
        if (!name.trim()) return setNotice("Add your name to create the profile.");
        const res = await createAccount({ name, email, pin });
        if (!res.ok) return setNotice("That email already has a profile. Go back and sign in.");
        onSignedIn(res.session);
      }
    } catch {
      // crypto.subtle needs a secure context (https or localhost)
      setNotice("Sign-in needs a secure connection. Use the deployed site or continue as guest.");
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = () => {
    setStage("email");
    setKnown(null);
    setPin("");
    setNotice(null);
  };

  // Real Google sign-in via Google Identity Services; needs a client ID
  // authorized for this origin (VITE_GOOGLE_CLIENT_ID at build time).
  const googleSso = () => {
    if (!GOOGLE_CLIENT_ID) {
      return setNotice("Google sign-in activates once a Google client ID is configured for this site; continue with email below.");
    }
    const start = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            try {
              const b64 = resp.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
              const payload = JSON.parse(atob(b64));
              onSignedIn(oauthSignIn({ name: payload.name, email: payload.email, provider: "google" }));
            } catch {
              setNotice("Google sign-in failed. Continue with email below.");
            }
          },
        });
        window.google.accounts.id.prompt();
      } catch {
        setNotice("Google sign-in failed to start. Continue with email below.");
      }
    };
    if (window.google?.accounts?.id) return start();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = start;
    s.onerror = () => setNotice("Couldn't reach Google. Continue with email below.");
    document.head.appendChild(s);
  };

  const githubSso = () => {
    setNotice("GitHub sign-in needs the backend's OAuth callback, which isn't deployed yet. Continue with email below.");
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-ink">
      {/* top beam, Resend-style */}
      <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">
        <div
          className="glow-drift absolute left-1/2 top-[-320px] h-[520px] w-[820px] rounded-full opacity-[0.16] blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--accent), transparent 70%)" }}
        />
        <div
          className="absolute left-1/2 top-0 h-px w-[560px] -translate-x-1/2"
          style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)", opacity: 0.5 }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-ink3 transition hover:text-ink"
        >
          <ArrowLeft size={13} aria-hidden="true" /> Back
        </button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="anim-fade-up w-full max-w-[360px]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ink font-serif text-xl italic text-bg" aria-hidden="true">
            F
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold tracking-tight">Sign in to Folio</h1>
          <p className="mt-1.5 text-center text-[13px] text-ink3">
            Your portfolios, briefings, and settings, saved to your profile.
          </p>

          <div className="mt-7 space-y-2.5">
            <button
              onClick={googleSso}
              className="press flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-panel py-2.5 text-sm font-medium text-ink transition hover:border-linestrong"
            >
              <GoogleMark /> Continue with Google
            </button>
            <button
              onClick={githubSso}
              className="press flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-panel py-2.5 text-sm font-medium text-ink transition hover:border-linestrong"
            >
              <GithubMark /> Continue with GitHub
            </button>
          </div>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" style={{ background: "var(--line)" }} />
            <span className="text-[11px] uppercase tracking-wider text-ink3">or</span>
            <span className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {stage === "email" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink2">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@example.com"
                  autoComplete="email"
                  autoFocus
                  className={inputClass}
                />
              </label>
            )}

            {stage === "pin" && (
              <>
                <p className="rounded-lg bg-panel2/60 px-3 py-2 text-[12px] leading-5 text-ink2">
                  Welcome back, <span className="font-semibold text-ink">{known?.name}</span>. Enter your PIN to
                  unlock this profile.
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink2">PIN</span>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    aria-label="Profile PIN, 4 to 6 digits"
                    className={`${inputClass} tnum tracking-[0.4em]`}
                  />
                </label>
              </>
            )}

            {stage === "create" && (
              <>
                <p className="rounded-lg bg-panel2/60 px-3 py-2 text-[12px] leading-5 text-ink2">
                  New profile for <span className="font-semibold text-ink">{email.trim().toLowerCase()}</span>.
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink2">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    autoFocus
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink2">Create a PIN (4-6 digits)</span>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label="Create a PIN, 4 to 6 digits"
                    className={`${inputClass} tnum tracking-[0.4em]`}
                  />
                </label>
              </>
            )}

            {/* always-mounted live region so screen readers hear notices */}
            <p
              className={`rounded-lg text-[12px] leading-5 ${notice ? "px-3 py-2" : "sr-only"}`}
              style={notice ? { background: "var(--accent-soft)", color: "var(--accent-text)" } : undefined}
              role="status"
              aria-live="polite"
            >
              {notice}
            </p>

            <button
              type="submit"
              disabled={busy}
              className={`press w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-bg transition hover:opacity-85 ${canSubmit && !busy ? "" : "opacity-60"}`}
            >
              {stage === "email" ? "Continue with Email" : stage === "pin" ? "Unlock profile" : "Create profile"}
            </button>

            {stage !== "email" && (
              <button
                type="button"
                onClick={changeEmail}
                className="w-full text-center text-[12px] text-ink3 underline decoration-linestrong underline-offset-4 transition hover:text-ink"
              >
                Use a different email
              </button>
            )}
          </form>

          <button
            onClick={onGuest}
            className="mt-4 w-full text-center text-[12px] text-ink3 underline decoration-linestrong underline-offset-4 transition hover:text-ink"
          >
            Skip for now, continue as guest
          </button>

          <p className="mt-8 text-center text-[11px] leading-5 text-ink3">
            Profiles and PINs live in this browser only, PINs stored hashed. No server, nothing leaves your
            machine.
          </p>
        </div>
      </main>

      <footer className="relative z-10 pb-5 text-center text-[10px] text-ink3">
        Folio · educational portfolio analytics, not financial advice
      </footer>
    </div>
  );
}
