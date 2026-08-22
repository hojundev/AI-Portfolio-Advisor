# Folio: AI Portfolio Optimizer (Fintech Track) - Mobbin, Render, and ElevenLabs track

An AI-powered fintech platform that uses institutional-grade quantitative risk modeling to evaluate investment portfolios, filtering out market noise to optimize asset weights. It then uses generative AI to translate these complex risk metrics into personalized, plain-English financial guidance for beginners.

## 🚀 Features
* **Math Engine**: Implements the spectral selection method with an $L_1$ penalty to build a robust Maximum Sharpe Ratio (MSR) portfolio.
* **1-Click Presets**: Instantly analyze pre-engineered templates (e.g., Berkshire Hathaway, ARK Innovation).
* **Custom Sandbox**: Select a basket of tickers, and the quant engine calculates the optimal risk-adjusted weights.
* **AI Insights**: Gemini API acts as a translation layer, turning complex risk metrics into simple, beginner-friendly explanations.
* **Sleek UI**: Built with React, Tailwind CSS, and Recharts, inspired by top fintech apps.

## 🛠 Tech Stack
* **Frontend**: React, Tailwind CSS, Recharts, Vite
* **Backend**: Python, FastAPI, NumPy, SciPy
* **Data**: `yfinance` (for historical adjusted close prices)
* **AI/LLM**: Gemini API

---

## 💻 Local Development Setup

To run this project locally, you will need to start both the Python backend and the React frontend.

### Prerequisites
* Python 3.10+
* Node.js (v18+)

### 1. Backend Setup (FastAPI + Quant Engine)
Open a terminal and navigate to the backend folder:
```bash
cd backend

# Install the Python dependencies
pip install -r requirements.txt

# Create an environment file
cp .env.example .env
```
**Important:** Open the `.env` file in the `backend/` folder and add your Gemini API key:
`GEMINI_API_KEY=your_actual_api_key_here`

Start the backend server:
```bash
uvicorn app.main:app --reload
```
*The backend will now be running on `http://localhost:8000`.*

### 2. Frontend Setup (React + Vite)
Open a **second** terminal window and navigate to the frontend folder:
```bash
cd frontend

# Install the Node dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend will now be running (usually on `http://localhost:5173`).*

**Note:** The frontend uses a Vite proxy (`vite.config.js`) during development, which automatically forwards all requests starting with `/api` to the backend running on `localhost:8000`. You do not need to deal with CORS issues locally.

---

## 🚀 Deployment Instructions

### Deploying the Backend (Render)
This repository includes a `render.yaml` at the root for easy deployment to Render.
1. Connect your repository to Render.
2. Render will automatically detect the `render.yaml` and configure the backend web service.
3. Add your `GEMINI_API_KEY` to the environment variables in the Render dashboard.

### Deploying the Frontend (Vercel)
If deploying the frontend to a production host like Base44 or Vercel:
1. In the `frontend/` directory, create a `.env` file and set the URL of your live backend:
   ```env
   VITE_API_URL=https://your-live-backend-url.onrender.com
   ```
2. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
3. Deploy the resulting `dist/` directory to your hosting provider.
