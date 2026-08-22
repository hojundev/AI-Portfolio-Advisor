# AI Portfolio Advisor — Frontend

React + Vite + Tailwind + Recharts frontend for the portfolio advisor.

## Run locally

Terminal 1:

```bash
cd backend
uvicorn app.main:app --reload
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite proxy forwards `/api/*` to `http://localhost:8000`.

## API integration

- `GET /api/presets`
- `GET /api/tickers`
- `POST /api/analyze`

Preset IDs are read from `/api/presets`; they are not hardcoded.

For production, set `VITE_API_URL` in `.env.production` to the deployed backend URL.
