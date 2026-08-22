/*
 * Searchable ticker universe with baked 1-year statistics.
 *
 * Each entry:
 *   s   symbol            n  name
 *   sec sector            cls asset class: stock | etf | bond | gold | cmdty
 *   ex  exchange          p  last price (USD)
 *   r   trailing-1y total return (decimal)
 *   v   annualized volatility (decimal)
 *   b   beta vs S&P 500   y  dividend yield (decimal)
 *
 * Stats are a static snapshot used for instant client-side math and the
 * offline fallback engine. The cloud engine (backend /api/analyze) pulls
 * live history from yfinance when it is reachable.
 */

/** The snapshot date for every baked statistic below. Shown in the UI. */
export const UNIVERSE_AS_OF = "Aug 1, 2026";

export const UNIVERSE = [
  // --- Mega-cap tech ---
  { s: "AAPL", n: "Apple Inc.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 226.84, r: 0.14, v: 0.24, b: 1.15, y: 0.005 },
  { s: "MSFT", n: "Microsoft Corp.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 522.04, r: 0.21, v: 0.22, b: 1.05, y: 0.007 },
  { s: "NVDA", n: "NVIDIA Corp.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 177.12, r: 0.38, v: 0.46, b: 1.85, y: 0.001 },
  { s: "AVGO", n: "Broadcom Inc.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 289.4, r: 0.31, v: 0.36, b: 1.35, y: 0.012 },
  { s: "AMD", n: "Advanced Micro Devices", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 168.3, r: 0.12, v: 0.48, b: 1.7, y: 0 },
  { s: "TSM", n: "Taiwan Semiconductor", sec: "Technology", cls: "stock", ex: "NYSE", p: 231.7, r: 0.34, v: 0.34, b: 1.25, y: 0.013 },
  { s: "INTC", n: "Intel Corp.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 24.1, r: -0.18, v: 0.42, b: 1.1, y: 0.011 },
  { s: "QCOM", n: "Qualcomm Inc.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 172.6, r: 0.08, v: 0.33, b: 1.2, y: 0.02 },
  { s: "MU", n: "Micron Technology", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 132.8, r: 0.22, v: 0.47, b: 1.55, y: 0.004 },
  { s: "ORCL", n: "Oracle Corp.", sec: "Technology", cls: "stock", ex: "NYSE", p: 241.5, r: 0.42, v: 0.3, b: 1.05, y: 0.007 },
  { s: "CRM", n: "Salesforce Inc.", sec: "Technology", cls: "stock", ex: "NYSE", p: 268.9, r: 0.02, v: 0.31, b: 1.25, y: 0.006 },
  { s: "ADBE", n: "Adobe Inc.", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 372.4, r: -0.14, v: 0.32, b: 1.3, y: 0 },
  { s: "NOW", n: "ServiceNow Inc.", sec: "Technology", cls: "stock", ex: "NYSE", p: 918.2, r: 0.13, v: 0.34, b: 1.25, y: 0 },
  { s: "PLTR", n: "Palantir Technologies", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 158.4, r: 0.62, v: 0.58, b: 2.2, y: 0 },
  { s: "IBM", n: "IBM Corp.", sec: "Technology", cls: "stock", ex: "NYSE", p: 254.7, r: 0.28, v: 0.24, b: 0.75, y: 0.026 },
  { s: "CSCO", n: "Cisco Systems", sec: "Technology", cls: "stock", ex: "NASDAQ", p: 68.9, r: 0.31, v: 0.2, b: 0.85, y: 0.023 },

  // --- Communication ---
  { s: "GOOGL", n: "Alphabet Inc. (Class A)", sec: "Communication", cls: "stock", ex: "NASDAQ", p: 203.71, r: 0.24, v: 0.28, b: 1.1, y: 0.004 },
  { s: "META", n: "Meta Platforms Inc.", sec: "Communication", cls: "stock", ex: "NASDAQ", p: 764.15, r: 0.44, v: 0.35, b: 1.25, y: 0.003 },
  { s: "NFLX", n: "Netflix Inc.", sec: "Communication", cls: "stock", ex: "NASDAQ", p: 1204.3, r: 0.72, v: 0.34, b: 1.25, y: 0 },
  { s: "DIS", n: "Walt Disney Co.", sec: "Communication", cls: "stock", ex: "NYSE", p: 118.6, r: 0.29, v: 0.27, b: 1.15, y: 0.008 },
  { s: "T", n: "AT&T Inc.", sec: "Communication", cls: "stock", ex: "NYSE", p: 28.9, r: 0.48, v: 0.19, b: 0.6, y: 0.038 },
  { s: "VZ", n: "Verizon Communications", sec: "Communication", cls: "stock", ex: "NYSE", p: 43.1, r: 0.09, v: 0.18, b: 0.45, y: 0.063 },
  { s: "SPOT", n: "Spotify Technology", sec: "Communication", cls: "stock", ex: "NYSE", p: 692.5, r: 0.98, v: 0.4, b: 1.5, y: 0 },

  // --- Consumer discretionary ---
  { s: "AMZN", n: "Amazon.com Inc.", sec: "Consumer Discretionary", cls: "stock", ex: "NASDAQ", p: 231.54, r: 0.3, v: 0.31, b: 1.3, y: 0 },
  { s: "TSLA", n: "Tesla Inc.", sec: "Consumer Discretionary", cls: "stock", ex: "NASDAQ", p: 322.05, r: 0.51, v: 0.58, b: 2.1, y: 0 },
  { s: "HD", n: "Home Depot Inc.", sec: "Consumer Discretionary", cls: "stock", ex: "NYSE", p: 386.4, r: 0.09, v: 0.22, b: 1.0, y: 0.024 },
  { s: "MCD", n: "McDonald's Corp.", sec: "Consumer Discretionary", cls: "stock", ex: "NYSE", p: 302.1, r: 0.14, v: 0.16, b: 0.7, y: 0.023 },
  { s: "NKE", n: "Nike Inc.", sec: "Consumer Discretionary", cls: "stock", ex: "NYSE", p: 78.4, r: -0.06, v: 0.32, b: 1.1, y: 0.021 },
  { s: "SBUX", n: "Starbucks Corp.", sec: "Consumer Discretionary", cls: "stock", ex: "NASDAQ", p: 92.6, r: -0.02, v: 0.28, b: 0.95, y: 0.026 },
  { s: "LOW", n: "Lowe's Companies", sec: "Consumer Discretionary", cls: "stock", ex: "NYSE", p: 247.8, r: 0.04, v: 0.23, b: 1.05, y: 0.019 },
  { s: "BKNG", n: "Booking Holdings", sec: "Consumer Discretionary", cls: "stock", ex: "NASDAQ", p: 5488.0, r: 0.36, v: 0.27, b: 1.25, y: 0.007 },
  { s: "ABNB", n: "Airbnb Inc.", sec: "Consumer Discretionary", cls: "stock", ex: "NASDAQ", p: 138.7, r: 0.19, v: 0.35, b: 1.2, y: 0 },
  { s: "F", n: "Ford Motor Co.", sec: "Consumer Discretionary", cls: "stock", ex: "NYSE", p: 11.3, r: 0.06, v: 0.34, b: 1.2, y: 0.053 },

  // --- Consumer staples ---
  { s: "WMT", n: "Walmart Inc.", sec: "Consumer Staples", cls: "stock", ex: "NYSE", p: 101.2, r: 0.38, v: 0.19, b: 0.65, y: 0.009 },
  { s: "COST", n: "Costco Wholesale", sec: "Consumer Staples", cls: "stock", ex: "NASDAQ", p: 972.6, r: 0.14, v: 0.2, b: 0.85, y: 0.005 },
  { s: "PG", n: "Procter & Gamble", sec: "Consumer Staples", cls: "stock", ex: "NYSE", p: 158.3, r: -0.03, v: 0.15, b: 0.45, y: 0.026 },
  { s: "KO", n: "Coca-Cola Co.", sec: "Consumer Staples", cls: "stock", ex: "NYSE", p: 69.8, r: 0.05, v: 0.14, b: 0.5, y: 0.029 },
  { s: "PEP", n: "PepsiCo Inc.", sec: "Consumer Staples", cls: "stock", ex: "NASDAQ", p: 148.9, r: -0.11, v: 0.16, b: 0.5, y: 0.037 },
  { s: "CL", n: "Colgate-Palmolive", sec: "Consumer Staples", cls: "stock", ex: "NYSE", p: 92.4, r: -0.05, v: 0.15, b: 0.4, y: 0.022 },
  { s: "MDLZ", n: "Mondelez International", sec: "Consumer Staples", cls: "stock", ex: "NASDAQ", p: 64.2, r: -0.08, v: 0.18, b: 0.55, y: 0.029 },
  { s: "TGT", n: "Target Corp.", sec: "Consumer Staples", cls: "stock", ex: "NYSE", p: 104.6, r: -0.22, v: 0.3, b: 1.0, y: 0.043 },

  // --- Financials ---
  { s: "JPM", n: "JPMorgan Chase & Co.", sec: "Financials", cls: "stock", ex: "NYSE", p: 296.21, r: 0.32, v: 0.22, b: 1.1, y: 0.019 },
  { s: "BAC", n: "Bank of America Corp.", sec: "Financials", cls: "stock", ex: "NYSE", p: 47.8, r: 0.21, v: 0.24, b: 1.2, y: 0.022 },
  { s: "WFC", n: "Wells Fargo & Co.", sec: "Financials", cls: "stock", ex: "NYSE", p: 82.1, r: 0.36, v: 0.25, b: 1.15, y: 0.019 },
  { s: "GS", n: "Goldman Sachs Group", sec: "Financials", cls: "stock", ex: "NYSE", p: 712.4, r: 0.41, v: 0.26, b: 1.3, y: 0.017 },
  { s: "MS", n: "Morgan Stanley", sec: "Financials", cls: "stock", ex: "NYSE", p: 142.8, r: 0.34, v: 0.25, b: 1.25, y: 0.026 },
  { s: "V", n: "Visa Inc.", sec: "Financials", cls: "stock", ex: "NYSE", p: 352.6, r: 0.24, v: 0.19, b: 0.95, y: 0.007 },
  { s: "MA", n: "Mastercard Inc.", sec: "Financials", cls: "stock", ex: "NYSE", p: 588.2, r: 0.2, v: 0.2, b: 1.0, y: 0.005 },
  { s: "BRK-B", n: "Berkshire Hathaway (B)", sec: "Financials", cls: "stock", ex: "NYSE", p: 472.5, r: 0.11, v: 0.16, b: 0.8, y: 0 },
  { s: "AXP", n: "American Express Co.", sec: "Financials", cls: "stock", ex: "NYSE", p: 318.9, r: 0.29, v: 0.26, b: 1.2, y: 0.011 },
  { s: "BLK", n: "BlackRock Inc.", sec: "Financials", cls: "stock", ex: "NYSE", p: 1094.0, r: 0.26, v: 0.24, b: 1.15, y: 0.019 },
  { s: "SCHW", n: "Charles Schwab Corp.", sec: "Financials", cls: "stock", ex: "NYSE", p: 96.4, r: 0.42, v: 0.27, b: 1.05, y: 0.011 },
  { s: "PYPL", n: "PayPal Holdings", sec: "Financials", cls: "stock", ex: "NASDAQ", p: 71.2, r: 0.04, v: 0.36, b: 1.4, y: 0 },
  { s: "COIN", n: "Coinbase Global", sec: "Financials", cls: "stock", ex: "NASDAQ", p: 312.6, r: 0.44, v: 0.72, b: 2.6, y: 0 },

  // --- Healthcare ---
  { s: "LLY", n: "Eli Lilly & Co.", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 762.3, r: -0.12, v: 0.3, b: 0.85, y: 0.008 },
  { s: "UNH", n: "UnitedHealth Group", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 302.8, r: -0.44, v: 0.34, b: 0.75, y: 0.028 },
  { s: "JNJ", n: "Johnson & Johnson", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 176.4, r: 0.09, v: 0.14, b: 0.5, y: 0.03 },
  { s: "ABBV", n: "AbbVie Inc.", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 204.6, r: 0.08, v: 0.2, b: 0.6, y: 0.032 },
  { s: "MRK", n: "Merck & Co.", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 84.9, r: -0.26, v: 0.22, b: 0.45, y: 0.038 },
  { s: "PFE", n: "Pfizer Inc.", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 25.8, r: -0.09, v: 0.21, b: 0.55, y: 0.066 },
  { s: "TMO", n: "Thermo Fisher Scientific", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 486.2, r: -0.11, v: 0.24, b: 0.85, y: 0.003 },
  { s: "ABT", n: "Abbott Laboratories", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 132.4, r: 0.18, v: 0.17, b: 0.7, y: 0.017 },
  { s: "ISRG", n: "Intuitive Surgical", sec: "Healthcare", cls: "stock", ex: "NASDAQ", p: 468.1, r: 0.02, v: 0.29, b: 1.1, y: 0 },
  { s: "CVS", n: "CVS Health Corp.", sec: "Healthcare", cls: "stock", ex: "NYSE", p: 71.6, r: 0.22, v: 0.28, b: 0.7, y: 0.037 },

  // --- Industrials ---
  { s: "CAT", n: "Caterpillar Inc.", sec: "Industrials", cls: "stock", ex: "NYSE", p: 412.7, r: 0.21, v: 0.25, b: 1.1, y: 0.014 },
  { s: "BA", n: "Boeing Co.", sec: "Industrials", cls: "stock", ex: "NYSE", p: 228.4, r: 0.31, v: 0.34, b: 1.3, y: 0 },
  { s: "HON", n: "Honeywell International", sec: "Industrials", cls: "stock", ex: "NASDAQ", p: 224.8, r: 0.11, v: 0.19, b: 0.95, y: 0.02 },
  { s: "UPS", n: "United Parcel Service", sec: "Industrials", cls: "stock", ex: "NYSE", p: 98.2, r: -0.24, v: 0.26, b: 0.95, y: 0.066 },
  { s: "GE", n: "GE Aerospace", sec: "Industrials", cls: "stock", ex: "NYSE", p: 268.3, r: 0.55, v: 0.28, b: 1.15, y: 0.005 },
  { s: "RTX", n: "RTX Corp.", sec: "Industrials", cls: "stock", ex: "NYSE", p: 152.6, r: 0.28, v: 0.2, b: 0.8, y: 0.017 },
  { s: "DE", n: "Deere & Co.", sec: "Industrials", cls: "stock", ex: "NYSE", p: 512.4, r: 0.29, v: 0.24, b: 1.0, y: 0.012 },
  { s: "LMT", n: "Lockheed Martin", sec: "Industrials", cls: "stock", ex: "NYSE", p: 448.9, r: -0.09, v: 0.19, b: 0.5, y: 0.029 },

  // --- Energy ---
  { s: "XOM", n: "Exxon Mobil Corp.", sec: "Energy", cls: "stock", ex: "NYSE", p: 112.4, r: 0.0, v: 0.21, b: 0.85, y: 0.035 },
  { s: "CVX", n: "Chevron Corp.", sec: "Energy", cls: "stock", ex: "NYSE", p: 156.8, r: 0.08, v: 0.2, b: 0.8, y: 0.043 },
  { s: "COP", n: "ConocoPhillips", sec: "Energy", cls: "stock", ex: "NYSE", p: 98.6, r: -0.08, v: 0.26, b: 1.0, y: 0.032 },
  { s: "SLB", n: "SLB (Schlumberger)", sec: "Energy", cls: "stock", ex: "NYSE", p: 36.4, r: -0.16, v: 0.3, b: 1.1, y: 0.031 },
  { s: "NEE", n: "NextEra Energy", sec: "Utilities", cls: "stock", ex: "NYSE", p: 76.8, r: 0.02, v: 0.22, b: 0.6, y: 0.03 },
  { s: "DUK", n: "Duke Energy Corp.", sec: "Utilities", cls: "stock", ex: "NYSE", p: 121.4, r: 0.09, v: 0.15, b: 0.4, y: 0.035 },
  { s: "SO", n: "Southern Co.", sec: "Utilities", cls: "stock", ex: "NYSE", p: 94.2, r: 0.07, v: 0.16, b: 0.4, y: 0.031 },

  // --- Materials & real estate ---
  { s: "LIN", n: "Linde plc", sec: "Materials", cls: "stock", ex: "NASDAQ", p: 462.8, r: 0.03, v: 0.17, b: 0.85, y: 0.013 },
  { s: "FCX", n: "Freeport-McMoRan", sec: "Materials", cls: "stock", ex: "NYSE", p: 46.2, r: 0.04, v: 0.36, b: 1.6, y: 0.013 },
  { s: "NEM", n: "Newmont Corp.", sec: "Materials", cls: "stock", ex: "NYSE", p: 62.8, r: 0.42, v: 0.32, b: 0.5, y: 0.016 },
  { s: "PLD", n: "Prologis Inc.", sec: "Real Estate", cls: "stock", ex: "NYSE", p: 108.4, r: -0.06, v: 0.24, b: 1.0, y: 0.037 },
  { s: "O", n: "Realty Income Corp.", sec: "Real Estate", cls: "stock", ex: "NYSE", p: 58.6, r: 0.06, v: 0.18, b: 0.7, y: 0.055 },
  { s: "AMT", n: "American Tower Corp.", sec: "Real Estate", cls: "stock", ex: "NYSE", p: 218.2, r: -0.02, v: 0.21, b: 0.75, y: 0.031 },

  // --- Broad-market equity ETFs ---
  { s: "SPY", n: "SPDR S&P 500 ETF Trust", sec: "Broad Market", cls: "etf", ex: "NYSE", p: 642.7, r: 0.15, v: 0.13, b: 1.0, y: 0.012 },
  { s: "VOO", n: "Vanguard S&P 500 ETF", sec: "Broad Market", cls: "etf", ex: "NYSE", p: 591.2, r: 0.15, v: 0.13, b: 1.0, y: 0.012 },
  { s: "VTI", n: "Vanguard Total Stock Market ETF", sec: "Broad Market", cls: "etf", ex: "NYSE", p: 316.8, r: 0.14, v: 0.14, b: 1.0, y: 0.012 },
  { s: "QQQ", n: "Invesco QQQ (Nasdaq-100)", sec: "Broad Market", cls: "etf", ex: "NASDAQ", p: 572.4, r: 0.19, v: 0.18, b: 1.15, y: 0.005 },
  { s: "IWM", n: "iShares Russell 2000 ETF", sec: "Broad Market", cls: "etf", ex: "NYSE", p: 226.1, r: 0.06, v: 0.21, b: 1.15, y: 0.011 },
  { s: "VT", n: "Vanguard Total World Stock ETF", sec: "Broad Market", cls: "etf", ex: "NYSE", p: 132.6, r: 0.13, v: 0.12, b: 0.9, y: 0.018 },
  { s: "VEA", n: "Vanguard FTSE Developed Markets", sec: "International", cls: "etf", ex: "NYSE", p: 58.9, r: 0.12, v: 0.13, b: 0.8, y: 0.028 },
  { s: "VWO", n: "Vanguard FTSE Emerging Markets", sec: "International", cls: "etf", ex: "NYSE", p: 51.4, r: 0.1, v: 0.16, b: 0.85, y: 0.029 },
  { s: "EFA", n: "iShares MSCI EAFE ETF", sec: "International", cls: "etf", ex: "NYSE", p: 89.7, r: 0.11, v: 0.14, b: 0.8, y: 0.027 },

  // --- Sector & style ETFs ---
  { s: "XLK", n: "Technology Select Sector SPDR", sec: "Technology", cls: "etf", ex: "NYSE", p: 264.8, r: 0.2, v: 0.2, b: 1.2, y: 0.006 },
  { s: "XLF", n: "Financial Select Sector SPDR", sec: "Financials", cls: "etf", ex: "NYSE", p: 53.6, r: 0.22, v: 0.16, b: 1.0, y: 0.014 },
  { s: "XLE", n: "Energy Select Sector SPDR", sec: "Energy", cls: "etf", ex: "NYSE", p: 88.4, r: 0.02, v: 0.2, b: 0.85, y: 0.033 },
  { s: "XLV", n: "Health Care Select Sector SPDR", sec: "Healthcare", cls: "etf", ex: "NYSE", p: 136.2, r: -0.08, v: 0.14, b: 0.6, y: 0.016 },
  { s: "SMH", n: "VanEck Semiconductor ETF", sec: "Technology", cls: "etf", ex: "NASDAQ", p: 288.6, r: 0.28, v: 0.31, b: 1.5, y: 0.004 },
  { s: "SCHD", n: "Schwab U.S. Dividend Equity ETF", sec: "Dividend", cls: "etf", ex: "NYSE", p: 27.4, r: 0.04, v: 0.13, b: 0.75, y: 0.038 },
  { s: "VYM", n: "Vanguard High Dividend Yield ETF", sec: "Dividend", cls: "etf", ex: "NYSE", p: 131.8, r: 0.09, v: 0.12, b: 0.75, y: 0.027 },
  { s: "VNQ", n: "Vanguard Real Estate ETF", sec: "Real Estate", cls: "etf", ex: "NYSE", p: 89.2, r: -0.01, v: 0.17, b: 0.85, y: 0.039 },
  { s: "ARKK", n: "ARK Innovation ETF", sec: "Broad Market", cls: "etf", ex: "NYSE", p: 72.6, r: 0.55, v: 0.42, b: 1.9, y: 0 },
  { s: "IBIT", n: "iShares Bitcoin Trust ETF", sec: "Crypto", cls: "crypto", ex: "NASDAQ", p: 66.2, r: 0.35, v: 0.55, b: 1.6, y: 0 },

  // --- Bonds & defensives ---
  { s: "BND", n: "Vanguard Total Bond Market ETF", sec: "Bonds", cls: "bond", ex: "NASDAQ", p: 74.6, r: 0.028, v: 0.055, b: 0.05, y: 0.044 },
  { s: "AGG", n: "iShares Core U.S. Aggregate Bond", sec: "Bonds", cls: "bond", ex: "NYSE", p: 99.8, r: 0.027, v: 0.055, b: 0.05, y: 0.043 },
  { s: "TLT", n: "iShares 20+ Year Treasury Bond", sec: "Bonds", cls: "bond", ex: "NASDAQ", p: 88.9, r: -0.02, v: 0.15, b: -0.1, y: 0.045 },
  { s: "IEF", n: "iShares 7-10 Year Treasury Bond", sec: "Bonds", cls: "bond", ex: "NASDAQ", p: 96.2, r: 0.02, v: 0.07, b: -0.05, y: 0.041 },
  { s: "IEI", n: "iShares 3-7 Year Treasury Bond", sec: "Bonds", cls: "bond", ex: "NASDAQ", p: 118.4, r: 0.03, v: 0.045, b: 0.0, y: 0.039 },
  { s: "SHY", n: "iShares 1-3 Year Treasury Bond", sec: "Bonds", cls: "bond", ex: "NASDAQ", p: 82.7, r: 0.041, v: 0.018, b: 0.0, y: 0.042 },
  { s: "TIP", n: "iShares TIPS Bond ETF", sec: "Bonds", cls: "bond", ex: "NYSE", p: 111.2, r: 0.035, v: 0.05, b: 0.05, y: 0.036 },
  { s: "LQD", n: "iShares Investment Grade Corporate", sec: "Bonds", cls: "bond", ex: "NYSE", p: 110.6, r: 0.03, v: 0.07, b: 0.15, y: 0.045 },
  { s: "HYG", n: "iShares High Yield Corporate Bond", sec: "Bonds", cls: "bond", ex: "NYSE", p: 80.1, r: 0.06, v: 0.06, b: 0.35, y: 0.059 },

  // --- Gold & commodities ---
  { s: "GLD", n: "SPDR Gold Shares", sec: "Gold", cls: "gold", ex: "NYSE", p: 312.4, r: 0.36, v: 0.14, b: 0.05, y: 0 },
  { s: "IAU", n: "iShares Gold Trust", sec: "Gold", cls: "gold", ex: "NYSE", p: 63.8, r: 0.36, v: 0.14, b: 0.05, y: 0 },
  { s: "SLV", n: "iShares Silver Trust", sec: "Gold", cls: "gold", ex: "NYSE", p: 35.2, r: 0.31, v: 0.26, b: 0.3, y: 0 },
  { s: "DBC", n: "Invesco DB Commodity Index", sec: "Commodities", cls: "cmdty", ex: "NYSE", p: 22.8, r: 0.01, v: 0.16, b: 0.4, y: 0.033 },
  { s: "USO", n: "United States Oil Fund", sec: "Commodities", cls: "cmdty", ex: "NYSE", p: 71.4, r: -0.09, v: 0.3, b: 0.6, y: 0 },

  // --- firm-preset holdings (Berkshire / Pershing Square / ARK baskets) ---
  { s: "BN", n: "Brookfield Corp.", sec: "Financials", cls: "stock", ex: "NYSE", p: 64.9, r: 0.18, v: 0.27, b: 1.3, y: 0.007 },
  { s: "UBER", n: "Uber Technologies Inc.", sec: "Technology", cls: "stock", ex: "NYSE", p: 94.6, r: 0.24, v: 0.33, b: 1.3, y: 0 },
  { s: "QSR", n: "Restaurant Brands Intl.", sec: "Consumer Discretionary", cls: "stock", ex: "NYSE", p: 71.2, r: 0.04, v: 0.2, b: 0.8, y: 0.034 },
  { s: "TEM", n: "Tempus AI Inc.", sec: "Healthcare", cls: "stock", ex: "NASDAQ", p: 58.7, r: 0.52, v: 0.68, b: 1.8, y: 0 },
  { s: "CRSP", n: "CRISPR Therapeutics AG", sec: "Healthcare", cls: "stock", ex: "NASDAQ", p: 54.3, r: 0.09, v: 0.56, b: 1.4, y: 0 },
  { s: "TWST", n: "Twist Bioscience Corp.", sec: "Healthcare", cls: "stock", ex: "NASDAQ", p: 33.9, r: -0.14, v: 0.61, b: 1.5, y: 0 },
];

const BY_SYMBOL = new Map(UNIVERSE.map((t) => [t.s, t]));

export function lookup(symbol) {
  return BY_SYMBOL.get(String(symbol || "").toUpperCase()) || null;
}

/** Ranked search: symbol prefix > symbol includes > name includes. */
export function searchUniverse(query, limit = 8, excludeSymbols = []) {
  const q = String(query || "").trim().toUpperCase();
  if (!q) return [];
  const excluded = new Set(excludeSymbols);
  const scored = [];
  for (const t of UNIVERSE) {
    if (excluded.has(t.s)) continue;
    const name = t.n.toUpperCase();
    let score = -1;
    if (t.s === q) score = 100;
    else if (t.s.startsWith(q)) score = 80 - t.s.length;
    else if (t.s.includes(q)) score = 50;
    else if (name.startsWith(q)) score = 40;
    else if (name.includes(q)) score = 20;
    if (score >= 0) scored.push([score, t]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, limit).map(([, t]) => t);
}

/** Popular picks shown before the user types (Fey-style search overlay). */
export const POPULAR = ["NVDA", "AAPL", "TSLA", "SPY", "MSFT", "AMZN", "GLD", "BND"]
  .map(lookup)
  .filter(Boolean);
