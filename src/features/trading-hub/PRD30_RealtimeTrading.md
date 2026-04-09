# PRD 30 - Investment Simulator (Daily Close Prices) 📈💰

## Introduction
Users invest in-app coins in a paper-trading environment connected to real market data.
Prices update **once per day** using end-of-day closing prices — not real-time.
This is intentional: teaches long-term thinking over day-trading anxiety.

## Design Philosophy — "Million Dollar App"
- **Aesthetic**: Mimics professional trading apps, maintains gamified UI.
- **Header**: Coin balance + disclaimer ("This is not real money").
- **Asset Carousel**: Horizontal scroll of circular icons per asset.
- **The Chart**: Animated line chart. Historical close prices (1D = last 30 closes, 1W = last 52 weeks).
- **Timeframes**: `1D` (30-day closes), `1W` (52-week closes), `1M` (12-month closes), `1Y` (5-year closes).
- **Price Tag**: Shows yesterday's close price. Updates once at market close each day.
- **Action Buttons**: `[ ↓ SELL ]` and `[ ↑ BUY ]` — positions open at today's close.

## ⚙️ Data Refresh Strategy — Daily Close Only
- **Stocks / Indices / Commodities**: Fetch via API once per day (after 18:00 Israel time for US markets)
- **Crypto**: Fetch daily close (00:00 UTC), not live
- **Caching**: Store last close price + date in AsyncStorage. If today's close cached → use it, skip API
- **No websockets, no polling** — single fetch per day per asset
- **Fallback**: If fetch fails, use most recent cached price

## Curated Asset List (14 Assets)
1. **The Magnificent 7**: Apple (AAPL), Microsoft (MSFT), NVIDIA (NVDA), Alphabet (GOOGL), Amazon (AMZN), Meta (META), Tesla (TSLA)
2. **Major Indices**: S&P 500 (SPY), Nasdaq 100 (QQQ), תל אביב 125 (TA125.TA)
3. **Commodities**: Gold (XAU), Silver (XAG)
4. **Crypto**: Bitcoin (BTC), Ethereum (ETH)

## Data Structure & State

### US-001: Define types inside `features/trading-hub`
**Acceptance Criteria:**
- [x] Create `tradingHubTypes.ts`
- [x] `AssetType`: 'stock' | 'index' | 'commodity' | 'crypto'
- [x] `TradableAsset`: id (ticker), name, symbol/emoji, type, description (Hebrew explanation)
- [x] `ChartDataPoint`: timestamp, price
- [x] `ActivePosition`: id, assetId, type ('buy' | 'sell'), entryPrice, amountInvested (coins), timestamp
- [x] `TradingState`: selectedAsset, currentTimeframe, chartData, activePositions, isMarketOpen
- [x] Typecheck passes

### US-002: Curate Asset Metadata & Explanations
**Acceptance Criteria:**
- [x] Create `tradingHubData.ts` with the 14 assets + Hebrew descriptions
- [x] Typecheck passes
- [ ] Add `volatilityRating: 'low' | 'medium' | 'high' | 'extreme'` to `TradableAsset`
- [ ] Add `educationalTag: string` linking to the chapter concept it teaches

### US-003: Daily Close Price API Service
**Acceptance Criteria:**
- [x] Create `marketApiService.ts`
- [x] Fetch historical chart data by timeframe
- [x] Fallback to realistic mock data on API failure
- [ ] **Update**: Cache key includes today's ISO date — fetch only once per calendar day
- [ ] **Update**: Remove polling / WebSocket code entirely
- [ ] **Update**: `fetchLatestPrice()` returns yesterday's close, not live tick
- [ ] `isCacheStale(assetId)` — returns true if cached date < today

### US-004: Build the UI Components
**Acceptance Criteria:**
- [x] Asset Selector (horizontal scroll + glow on selected)
- [x] Asset Info Bottom Sheet with Hebrew description
- [x] Line chart (react-native-svg / Skia)
- [x] Trading Interface (coin input + BUY/SELL)
- [ ] Add **volatility badge** on each asset card (🟢 נמוך / 🟡 בינוני / 🔴 גבוה / 🚀 קיצוני)
- [ ] Add **"נלמד בפרק X"** tooltip linking educational concept to chapter

### US-005: Buy/Sell Logic & Portfolio Tracking
**Acceptance Criteria:**
- [x] purchaseAsset deducts coins from `useEconomyStore`
- [x] "My Positions" section
- [x] P&L calculation based on price delta
- [x] "Close Position" → return coins, show P&L overlay
- [ ] **Update**: P&L updates once per day (on price refresh), not live

## Technical Requirements
- **API**: Yahoo Finance unofficial (`query1.finance.yahoo.com`) or Alpha Vantage free tier
  - Historical closes: `?interval=1d&range=1mo`
  - Single request per asset per day
- **Rate limits**: Free tier = 5 req/min. Stagger fetches. Cache aggressively.
- **Market Hours display**: Show "שוק סגור — מחיר אחרון: [date]" label — no realtime open/close detection needed
- **Recommended API for this model**: **Alpha Vantage** (free, 25 req/day, historical daily OHLCV)
  - Endpoint: `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=KEY`
  - Crypto: `DIGITAL_CURRENCY_DAILY`
