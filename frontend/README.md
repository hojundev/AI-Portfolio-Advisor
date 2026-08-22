# Folio — AI Portfolio Advisor (frontend)

Marketing site + full app in one Vite/React SPA.

- `/` — landing page (V7/Sui/Acctual-style: hero, problem, system, feature deep-dives with real product shots, FAQ, mega footer)
- `/#app` — the dashboard (builder · allocation donut · live metrics · growth simulation · daily briefing with voice · advisor chat)

## Run it

```bash
npm install
npm run dev        # → http://localhost:3502
```

No keys, no backend, no sign-up required — everything has an offline fallback.

## What's real (not mocked)

- **Live metrics** — expected return, volatility (sector-aware correlation model), Sharpe (excess over a 4% cash rate), beta, dividend yield, diversification score, health grade. Recomputed on every slider drag from the 118-ticker universe in `src/data/universe.js` (snapshot dated in-app).
- **Optimizer** — calls the FastAPI backend (`/api/analyze`, live yfinance history) and falls back to an identical in-browser inverse-volatility engine when the backend is unreachable. Result shows your weights vs optimized, metric deltas, and a written rationale; one tap to apply.
- **Advisor chat** (`src/lib/advisor.js`) — deterministic engine grounded in the live portfolio. Structured answers (what I found / items to watch / bottom line), what-if simulations, and action commands: `add NVDA at 10%`, `set AAPL to 20%`, `remove TSLA`, `optimize`.
- **Voice briefings** (`src/lib/voice.js`) — ElevenLabs TTS with Web-Speech fallback. Key goes in Settings (gear icon), stored only in localStorage.
- **Share** (`src/lib/cloud.js`) — snapshots save to a Base44 app (Settings → App ID + key) and return a short `?snap=` link; without Base44 the portfolio is packed into the link itself (`?p=`). Either way the link rebuilds the exact portfolio.

## Structure

```
src/
  App.jsx               state container + hash routing (landing ↔ app)
  components/           Landing, Header, Tabs, HoldingsPanel, AllocationCard,
                        MetricsCard, PerformanceCard, BriefingCard, ChatPanel, Modals, ui
  lib/                  quant.js (math) · advisor.js (chat brain) · api.js (cloud engine client)
                        voice.js (ElevenLabs) · cloud.js (Base44 share) · format.js
  data/universe.js      118 tickers with 1y stats (return, vol, beta, yield, sector)
```

## Design system

Token-based theming in `src/index.css` (`data-theme="dark" | "light"` on `<html>`), Inter for UI + Newsreader for the editorial/AI voice, categorical chart palette validated for color-blind safety and contrast on both surfaces. Charts read resolved hex from `useThemeColors` (SVG attributes can't resolve CSS vars).

## Honest-numbers policy

Baked ticker stats are a static snapshot used for instant math and offline demos; the cloud engine uses live data. The growth chart is a deterministic simulation from trailing-year statistics and is labeled as such in the UI. Folio is an educational tool, not financial advice — the UI says so in the briefing card, chat, and footer.
