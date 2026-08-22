# Folio · AI Portfolio Advisor

*Paste-ready Devpost description. Screenshots to attach: `frontend/public/shot-hero-light.png`, `shot-optimize-light.png`, `shot-advisor-light.png` (light matches the site's default theme; the `shot-*.png` dark set is there too if you prefer the Fey look).*

---

**Folio shows you what your portfolio would really do: the growth, the swings, even how it survives a 2008-style crash. It explains every number in plain words. Out loud, if you want.**

## Inspiration

A first-time investor with $10,000 in a brokerage account has no way to know whether they're taking 8% risk or 40%. Every investing app shows *what* you own; none of them show *why it's risky*, and the numbers that decide the outcome (Sharpe, beta, volatility) are never explained in words a normal person uses. We built the tool we wished existed the first time we opened a brokerage account.

## What it does

- **Build** a portfolio from 124 real stocks & funds, or start from a preset: Classic 60/40, Dalio's All-Weather, Tech Growth, plus the real published allocations of Berkshire Hathaway, Pershing Square, and ARK Innovation. Six risk metrics (expected return, volatility, Sharpe over a 4% cash rate, beta, yield, diversification) recompute **live on every slider drag**, each with a plain-word verdict ("bumpy swings", "calmer than market"). You always see how your custom mix stacks up against the portfolios the pros actually run.
- **Try it before you open the app**: the landing page embeds a live slice of the real builder. Drag a slider right on the marketing page and the donut, volatility, Sharpe, and grade react, powered by the same engine as the app.
- **Swipe to start**: a card deck on the landing page. Swipe right on tickers you'd own, the engine scores your picks live, and one click opens them in the app as a real portfolio.
- **Crash Test**: replays three named scenarios (2008-style crash, +2% rate shock, inflation spike) against your exact mix, priced in dollars on your investment amount (default $10k, editable in one click on the donut).
- **Optimize with AI**: one click sends your basket to our FastAPI quant engine, which runs **L1-penalized spectral eigen-portfolio selection** (after Guo, Boyle, Weng & Wirjanto) on a year of live market history, then shows its weights next to yours, position by position, with a written rationale. If the network dies, a second engine built into the browser (inverse-volatility risk balancing) answers instead. The panel says which engine replied, and it's honest: both methods size by risk structure and never forecast returns.
- **Ask the advisor**: a chat grounded in your live numbers. "How risky is this?" gets your volatility, your beta, your jumpiest holding, in a structured answer (what I found · items to watch · bottom line). "What if I add GLD?" runs the simulation. "Set GLD to 10%" and it edits the portfolio. You can ask by voice, and it can answer out loud.
- **Listen**: ElevenLabs narrates your daily briefing in a studio voice.
- **Share**: one link rebuilds your exact portfolio anywhere. The snapshot saves to Base44, and the portfolio is packed into the link as a fallback.
- **Profiles**: local accounts with a name, email, and a 4-6 digit PIN (salted, hashed, never sent anywhere). Portfolios and your budget save per profile.

## How we built it

Team roles: quant engine & data (FastAPI, yfinance, numpy, including the spectral optimizer and its 13-test suite), API & AI layer (FastAPI routes, Gemini insight generation), frontend & design (React + Vite + Tailwind + Recharts: landing site, dashboard, in-browser quant twin, advisor engine), integrations & demo (ElevenLabs, Base44, Render blueprint, video).

Architecture in three lines: a React SPA computes every metric locally from a dated 124-ticker statistical snapshot (sector-aware correlation model, w'Σw volatility, deterministic market-factor simulations), so the app is fully functional offline. A FastAPI service on Render pulls live Yahoo Finance history and runs the spectral optimizer; Gemini turns its output into plain English. ElevenLabs voices the briefings; Base44 stores share snapshots.

## Best Use of ElevenLabs

Voice is load-bearing for our thesis: "explained like a human" includes *hearing* it like a human. ElevenLabs narrates the daily briefing (four selectable voices) and can speak every advisor reply, completing a voice loop with the mic input. The UI reports which engine actually spoke (it says "Narrated by ElevenLabs" only when ElevenLabs did) and degrades to the browser voice so the feature never goes silent.

## Best Use of Base44

Base44 is our zero-backend share layer: clicking Share writes a portfolio snapshot to a Base44 app's database and returns a link. The link also carries the portfolio payload itself, so it rebuilds on any machine with zero setup. Base44 gives the durable, queryable record; the packed link gives universal openability.

## Best Use of Render

The repo-root `render.yaml` is a one-click blueprint that deploys both halves, the FastAPI quant engine and the static frontend. The app is built for Render's free tier: a 45-second request window with a "waking the cloud engine" state absorbs cold starts, and the offline twin keeps every feature alive while the dyno wakes.

## Challenges we ran into

Engine parity. The in-browser twin has to return the same three headline metrics as the cloud engine so the fallback is invisible, but one estimates from live covariance and the other from a baked snapshot. We solved it by scoring *both* weight vectors with the same local engine in the compare panel (so deltas are apples-to-apples) and labeling which engine answered. Also: making the simulated growth chart honest. Assets now co-move through a shared market factor so the chart's volatility matches the risk model's number.

## What we learned

That the honest version sells better. Setting the risk-free rate to 4% made our Sharpe numbers smaller and more credible; labeling the growth chart "illustrative" and the optimizer "risk-balanced, never forecasts returns" turned our weakest claims into our most defensible ones.

## What's next

Paste-your-holdings import (analyze what you actually own, not a hypothetical), Base44 read-back features (shared-portfolio wall, view counts), and ElevenLabs Scribe for the voice input so both directions of the conversation run on ElevenLabs.

## Honest-numbers policy

Baked ticker stats are a dated snapshot (shown in-app) used for instant math and offline demos; the cloud engine uses live data. The growth chart is a deterministic simulation from trailing-year statistics and is labeled as such on the chart. Folio is an educational tool, not financial advice. The UI says so in the briefing, the chat, and the footer.

## Try it

1. Live demo: *(deploy via `render.yaml`, then put the URL here first)*
2. Repo: https://github.com/hojundev/AI-Portfolio-Advisor (`cd frontend && npm install && npm run dev`, no keys needed)
3. Video: *(link)*
