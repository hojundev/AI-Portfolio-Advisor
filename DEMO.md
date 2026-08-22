# 3-minute demo script (Ignition Hacks 2026 · FinTech)

Rule this script lives by: **show, then claim.** Frame 1 is the product, action 1 is a computation, and every spoken claim is on screen when it's said. Judges skim async and often watch muted — burn in captions.

## The spine (2:50)

**0:00–0:12 — COLD OPEN: product, in motion.**
Open directly on `/#app`, All-Weather loaded, cursor already resting on TLT's slider. No landing page yet.
> "This is a ten-thousand-dollar portfolio. Watch what happens to its risk when I move one position."
> *(drag TLT 40 → 15 → 40 over ~4 seconds — six metric tiles, the donut, the health grade, and the growth curve all move)*
> "Every number on this screen just recomputed. Volatility, Sharpe, beta, diversification — real portfolio math, live in a browser tab."

**0:12–0:22 — Name + thesis, spoken over one more drag.**
> "Folio is an AI portfolio advisor. It does the quant — then explains it like a human."

**0:22–0:50 — Build fast, then the stake in dollars.**
One preset click as a scene change: "Start from a preset the pros argue about — this is Dalio's All-Weather." Type "coin" in search (hold one beat on *"Search 124 stocks & funds"*), add COIN, watch the grade react. Then point at the **Crash Test card**:
> "And here's the part no investing app shows you: what a 2008 replay actually costs. Minus 7.8% — about $780 on ten thousand — versus roughly minus forty for an all-stock portfolio. That's what the bond sleeve is buying you."

**0:50–1:25 — Optimize + the offline flip (the money shot).**
Click **Optimize with AI**. While it runs:
> "That's our FastAPI engine crunching a year of live market history — it runs spectral eigen-portfolio selection, a published method, and it never forecasts returns."
Panel lands (badge: *Cloud engine · live data*). Point at the before/after bars and the Sharpe delta. Then, **on camera**, kill the network (DevTools → Offline, or stop the backend) and click Optimize again:
> "Now watch — same click, no internet. A second engine, built into the browser, answers instead." *(badge flips to Local engine · offline)* "The demo can't break. Neither can the product."
> *(Honesty note: never say "identical" — the cloud engine runs spectral selection, the browser twin runs inverse-volatility. "A second engine" is both true and just as impressive.)*

**1:25–2:00 — The advisor acts (the uniqueness beat).**
Frame BOTH the chat and the builder column. Press the mic and **say**: "what if I add gold?" → the simulation renders. Then type: `set GLD to 10%` — hold the frame as the slider appears and the donut re-slices.
> "I asked by voice. It ran the simulation. Then I told it to act — and it edited the portfolio. This isn't a chatbot bolted onto a dashboard; it's an advisor with its hands on the controls."

**2:00–2:20 — Listen (ElevenLabs), ~3s of audio over motion.**
Press **Listen**, keep scrolling/hovering while it plays:
> "ElevenLabs reads the briefing in a studio voice — that's Rachel. Your portfolio as the morning news."

**2:20–2:40 — Share (Base44), second window pre-opened.**
Second browser window already open beside the app. Click **Share**, zoom one beat on the modal's Base44 line, paste into the waiting window — the exact portfolio rebuilds.
> "Share writes the snapshot to Base44's database — and the link carries the portfolio too, so it opens anywhere, no account, no setup."

**2:40–2:50 — End card: the landing hero + numbers strip.**
> "React. FastAPI on Render. ElevenLabs. Base44. Built in a weekend. Folio — see your portfolio clearly."
Add one human line over the close: "For someone with their first ten thousand dollars and no way to know if they're taking 8% risk or 40 — this is the answer, in thirty seconds, for free."

## Recording checklist

- Reset state first: DevTools → `localStorage.clear()` → reload (fresh presets, empty chat). Clear it in EVERY open tab of the app (another tab can re-save old state).
- 1440×900, 100% zoom. Pick ONE theme and stay in it for the whole take: light is now the site default (what judges see first); dark is the moodier Fey look. If the Crash Test card sits below the center column's fold, pre-scroll that column or record at 90% browser zoom so it's in frame at 0:40.
- Record during market hours if possible — the header pill then reads "Markets open." Otherwise keep the header out of tight frames.
- Start the backend before rolling (`uvicorn app.main:app` in `backend/`) and run one warm-up Optimize off-camera. Same for one Listen (warms the ElevenLabs request).
- Set the ElevenLabs key in Settings before the take. For the Share beat, configure the Base44 App ID + key first — the modal then shows the Base44 wording on camera.
- With a GEMINI_API_KEY set, verify the model id in `backend/app/ai_insight.py` actually resolves (run one Optimize and check the insight text isn't the canned fallback) — a bad id silently falls back forever.
- Rehearse the offline flip once so the badge change lands in a single unbroken take. No cut = no doubt.
- **Burn in captions.** Muted viewing loses every spoken claim otherwise.
- The optimizer's numbers come from live data and will differ day to day — say what's on screen, don't pre-script the digits.

## Submission form

- Category: **FinTech**
- Tracks: general + **Best Use of ElevenLabs / Base44 / Render** (voice briefings + chat voice replies; snapshot share layer; quant-engine deploy blueprint at repo-root `render.yaml`)
- Repo: https://github.com/hojundev/AI-Portfolio-Advisor — run instructions in `frontend/README.md`; Devpost text in `DEVPOST.md`.
