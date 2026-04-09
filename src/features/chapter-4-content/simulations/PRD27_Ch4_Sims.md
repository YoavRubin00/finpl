# PRD 27 - Chapter 4 Simulations: צמיחה (Growth) 📈

## Introduction
6 interactive simulations for Chapter 4 (Growth), modules 19-24.
Topics: stock market basics, index funds, ETFs, trade orders, dividends, portfolio diversification.

## Design Philosophy — "Million Dollar Simulators"
Every simulator MUST feel like a premium, standalone mini-game:
- **60FPS animations** via `react-native-reanimated` shared values
- **Layered gradients** via `expo-linear-gradient` for depth
- **Haptic choreography** — `successHaptic`, `heavyHaptic` on milestones, `tapHaptic` everywhere
- **Particle effects** — `ConfettiExplosion` on achievements
- **Micro-animations** — every number animates (spring), every card uses `fadeInUp`/`fadeInScale`
- **Charts and graphs** — smooth, beautiful animated charts. Use reanimated-driven SVG paths where possible
- **Immersive fullscreen** — hide tab bar and economy header during gameplay

## Shared Context
- Pattern: `xxxTypes.ts` → `xxxData.ts` → `useXxx.ts` → `XxxScreen.tsx`
- Dir: `src/features/chapter-4-content/simulations/`
- Create `simulations/index.ts` barrel export
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- RTL: `{ writingDirection: 'rtl', textAlign: 'right' }`
- Integration: `LessonFlowScreen.tsx` — module IDs `mod-4-19` through `mod-4-24`
- Ignore pre-existing TS errors in FeedSidebar and useClashStore

---

## SIM 19: סליידר הסיכון (Risk-Return Slider) — Module 19

Concept: A beautiful allocation slider. Drag between 0% stocks / 100% bonds → 100% stocks / 0% bonds. A dynamic chart shows 10-year historical simulation for the chosen mix. Higher stock % = higher returns but wilder swings. The chart draws live as the slider moves. Addictive "what if" exploration.

### US-001: Define types
**Acceptance Criteria:**
- [x] Create `riskSliderTypes.ts` in `simulations/`
- [x] `AllocationMix`: stockPercent, bondPercent
- [x] `YearReturn`: year, stockReturn, bondReturn, mixedReturn, balance
- [x] `RiskSliderConfig`: initialInvestment (₪100,000), yearlyHistory YearReturn[][] (pre-computed for 0-100% stock range), years (10)
- [x] `RiskSliderState`: allocation AllocationMix, yearHistory YearReturn[], finalBalance, maxDrawdown, bestYear, worstYear, isComplete
- [x] `RiskSliderScore`: riskLevel ('conservative' | 'balanced' | 'aggressive'), expectedReturn, maxVolatility
- [x] Typecheck passes

### US-002: Create market simulation data
**Acceptance Criteria:**
- [x] Create `riskSliderData.ts` in `simulations/`
- [x] 10 years of returns inspired by real market (2014-2024): stocks vary -30% to +30%, bonds vary -5% to +8%
- [x] Pre-computed blend for every 10% step (0/100, 10/90, ... 100/0)
- [x] Initial investment: ₪100,000
- [x] Typecheck passes

### US-003: Build simulation hook
**Acceptance Criteria:**
- [x] Create `useRiskSlider.ts` in `simulations/`
- [x] Slider value (0-100 stocks %) → compute blended return per year
- [x] Calculate: final balance, max drawdown, best/worst year return, average annual return
- [x] Live recalculate on every slider change
- [x] Auto-play mode: slider sweeps from 0% to 100% showing how the chart changes
- [x] Typecheck passes

### US-004: Build Risk Slider screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `RiskSliderScreen.tsx` in `simulations/`
- [x] **Hero chart**: animated line chart showing 10-year portfolio growth. Line redraws smoothly as slider moves. Green sections above starting value, red sections below
- [x] Chart should feel alive — slight glow on the line, area fill below with gradient
- [x] **Allocation slider**: gorgeous horizontal slider. Left = bonds (blue), right = stocks (green). Gradient background changes color as slider moves
- [x] **Pie chart mini**: small animated pie chart above slider showing current split
- [x] **Stats panel**: final value (animated counter), max drawdown (red), best year (green), worst year (red), average return
- [x] **Risk meter**: visual gauge from "שמרני" to "אגרסיבי" with current position highlighted
- [x] **Auto-sweep button**: "🎬 הרץ" — slider sweeps automatically showing all allocations
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Results and integration
**Acceptance Criteria:**
- [x] Summary: "With your chosen XX/XX allocation over 10 years: ₪100K → ₪XXK"
- [x] Max drawdown highlighted: "The worst moment: your portfolio dropped XX%"
- [x] Key lesson: "אין תשואה בלי סיכון. המפתח הוא למצוא את הנקודה שלך."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-4-19` triggers `RiskSliderScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 20: מדד לייב (Index Live — S&P 500 Time Machine) — Module 20

Concept: A time machine slider from 1980 to 2024. Shows ₪10,000 invested in S&P 500 at any starting year and its value today. The key insight: regardless of WHEN you started (even right before a crash), if you held long enough, you made money. "Time in the market beats timing the market."

### US-006: Define types
**Acceptance Criteria:**
- [x] Create `indexLiveTypes.ts` in `simulations/`
- [x] `SP500Year`: year, price, annualReturn, cumulativeReturn
- [x] `IndexLiveConfig`: initialInvestment (₪10,000), yearData SP500Year[], startYear range (1980-2020)
- [x] `IndexLiveState`: selectedStartYear, currentEndYear (2024), investedValue, currentValue, totalReturn, bestStartYear, worstStartYear, isComplete
- [x] Typecheck passes

### US-007: Create S&P 500 historical data
**Acceptance Criteria:**
- [x] Create `indexLiveData.ts` in `simulations/`
- [x] Simplified S&P 500 annual returns 1980-2024 (approximate real data)
- [x] Key crashes included: 1987 (-22%), 2000-2002 (dot-com), 2008 (-38%), 2020 (-34% then recovery)
- [x] Key booms: 1995-1999, 2009-2019, 2021
- [x] Typecheck passes

### US-008: Build simulation hook
**Acceptance Criteria:**
- [x] Create `useIndexLive.ts` in `simulations/`
- [x] Slider selects start year. Calculate value from start year to 2024 using historical returns
- [x] Compute: total return %, average annual return, years invested
- [x] Find best/worst possible start years (for context)
- [x] Typecheck passes

### US-009: Build Index Live screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `IndexLiveScreen.tsx` in `simulations/`
- [x] **Time Machine aesthetic**: dark background with golden timeline at bottom
- [x] **Year slider**: styled as a time machine dial from 1980 to 2020. Moving it changes the start date
- [x] **Main chart**: area chart showing growth from selected start year. Crashes show as dips but always recover
- [x] **Key events on chart**: labeled markers at major events (1987 crash, dot-com, 2008, COVID) with emojis
- [x] **Value counter**: dramatic animated number — "₪10,000 → ₪XXX,XXX" with golden particles when value is high
- [x] **Worst case highlight**: even starting in 2007 (before 2008 crash), by 2024 you're still up significantly. This should be dramatically highlighted
- [x] **Insight banner**: "בכל נקודת התחלה — אם החזקת 15+ שנה — לא הפסדת"
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: Results and integration
**Acceptance Criteria:**
- [x] Summary: best start (₪10K→₪XXK), worst start (₪10K→₪XXK), your choice
- [x] Key lesson: "אי אפשר לתזמן את השוק. אפשר להיות בשוק. S&P 500 = +10% בממוצע."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-4-20` triggers `IndexLiveScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 21: בנה את הסל (Build the ETF Basket) — Module 21

Concept: Player selects ETFs from a shelf (S&P 500, NASDAQ 100, Bond Index, Israeli TA-125, Real Estate REIT, Emerging Markets). For each selected ETF, the internal holdings are revealed with animation ("inside the S&P 500: Apple 7%, Microsoft 6%, Amazon 3%..."). Player sees diversification score improve as they add different ETFs.

### US-011: Define types
**Acceptance Criteria:**
- [x] Create `etfBuilderTypes.ts` in `simulations/`
- [x] `ETFProduct`: id, name (Hebrew+English), emoji, type ('stocks' | 'bonds' | 'real-estate' | 'emerging'), expenseRatio, topHoldings string[], annualReturn, riskLevel (1-5)
- [x] `ETFBuilderConfig`: availableETFs ETFProduct[], maxETFs (5), budget (₪50,000)
- [x] `ETFBuilderState`: selectedETFs (with allocation %), diversificationScore (0-100), estimatedReturn, estimatedRisk, isComplete
- [x] `ETFBuilderScore`: grade, diversification, geographicSpread, assetTypeSpread
- [x] Typecheck passes

### US-012: Create ETF catalog data
**Acceptance Criteria:**
- [x] Create `etfBuilderData.ts` in `simulations/`
- [x] 8 ETFs: S&P 500 (0.03% fee, 10% avg), NASDAQ 100 (0.2%, 14% avg), אג"ח ממשלתי (0.1%, 3% avg), TA-125 (0.25%, 8% avg), REIT Global (0.3%, 7% avg), Emerging Markets (0.4%, 6% avg), Europe STOXX 600 (0.15%, 7% avg), Gold ETF (0.25%, 5% avg)
- [x] Each with 5 top holdings (real companies/assets)
- [x] Typecheck passes

### US-013: Build ETF builder hook
**Acceptance Criteria:**
- [x] Create `useETFBuilder.ts` in `simulations/`
- [x] Select/deselect ETFs (max 5)
- [x] Allocation: equal weight or manual adjustment
- [x] Diversification score: based on number of asset types × geographic regions covered
- [x] Estimate blended return and risk from allocations
- [x] Typecheck passes

### US-014: Build ETF Builder screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `ETFBuilderScreen.tsx` in `simulations/`
- [x] **ETF shelf**: scrollable grid of ETF cards with emoji, name, return, risk stars, expense ratio
- [x] **Tap to add**: ETF card flies from shelf into a "basket" at the bottom with spring animation
- [x] **Holdings reveal**: when ETF is added, a drawer slides open showing top 5 holdings (company logos as emojis, allocation %)
- [x] **Diversification meter**: horizontal bar filling up as more asset types and regions are added
- [x] **Pie chart**: animated pie chart showing current basket allocation. Updates live with smooth transitions
- [x] **Stats panel**: estimated annual return, estimated risk, total expense ratio, diversification score
- [x] **"Too concentrated" warning**: if all ETFs are same type (e.g., all stock), warning badge appears
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-015: Results and integration
**Acceptance Criteria:**
- [x] Score based on diversification quality, not just returns
- [x] Key lesson: "ETF = סל של 500+ מניות בעמלה זעירה. פיזור = הגנה."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-4-21` triggers `ETFBuilderScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 22: סימולטור מסחר (Trading Simulator) — Module 22

Concept: A mock brokerage screen. A stock price line chart updates in real-time (simulated). Player must execute 3 order types: Market Order (buy now), Limit Order (set price target), Stop-Loss (set safety floor). Each order type is a "lesson round" where they see its effect live.

### US-016: Define types
**Acceptance Criteria:**
- [x] Create `tradingSimTypes.ts` in `simulations/`
- [x] `StockTick`: time, price
- [x] `OrderType`: 'market' | 'limit' | 'stop-loss'
- [x] `TradeOrder`: type OrderType, triggerPrice?, executedPrice?, status ('pending' | 'executed' | 'cancelled')
- [x] `TradingRound`: id, instruction (Hebrew), orderType OrderType, stockData StockTick[], targetLesson
- [x] `TradingSimConfig`: rounds TradingRound[], startingCash (₪10,000)
- [x] `TradingSimState`: currentRound, cash, holdings, orders, pnl, isComplete
- [x] `TradingSimScore`: grade, totalPnL, ordersExecuted, lessonsLearned
- [x] Typecheck passes

### US-017: Create trading round data
**Acceptance Criteria:**
- [x] Create `tradingSimData.ts` in `simulations/`
- [x] Round 1 (Market Order): "מניית TSLA נסחרת ב-₪250. קנה עכשיו!" — stock ticks around ₪250, player executes market order, sees immediate fill. Lesson: "instant but no price control"
- [x] Round 2 (Limit Order): "חכה שהמחיר ירד ל-₪230 לפני שתקנה" — stock dips to ₪230 and triggers. Lesson: "patience gets a better price"
- [x] Round 3 (Stop-Loss): "הגן על עצמך — אם המניה יורדת ל-₪200, מכור!" — stock crashes, stop-loss triggers at ₪200 saving from further loss. Lesson: "automatic protection"
- [x] Each round has 30 simulated price ticks
- [x] Typecheck passes

### US-018: Build trading sim hook
**Acceptance Criteria:**
- [x] Create `useTradingSim.ts` in `simulations/`
- [x] Simulate price ticks at 200ms intervals
- [x] Market order: execute immediately at current price
- [x] Limit order: execute when price hits target (or better)
- [x] Stop-loss: execute when price drops below threshold
- [x] Track cash, holdings value, P&L
- [x] Typecheck passes

### US-019: Build Trading Simulator screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `TradingSimScreen.tsx` in `simulations/`
- [x] **Live chart**: animated candlestick-style or line chart updating in real time. Green/red coloring
- [x] **Order panel**: bottom sheet with order type buttons. Each round highlights the relevant type
- [x] **Market Order**: big "קנה עכשיו" button. Tap → instant fill animation, price flash
- [x] **Limit Order**: drag handle on chart to set target price. Horizontal line appears. When price hits it → execution flash
- [x] **Stop-Loss**: similar drag handle but below current price. Red warning zone below it
- [x] **Portfolio display**: cash, holdings, P&L with color animation
- [x] **Instruction bubble**: animated hint explaining what to do each round. Disappears on action
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-020: Results and integration
**Acceptance Criteria:**
- [x] Summary of 3 rounds: which orders executed at what prices, P&L per round
- [x] Key lesson: "Market = מהיר אבל יקר. Limit = חכם אבל אולי לא יתמלא. Stop-Loss = הביטוח שלך."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-4-22` triggers `TradingSimScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 23: עץ הדיבידנדים (Dividend Tree) — Module 23

Concept: A tree represents a stock. Each year it produces "fruit" (dividends). Player chooses: eat the fruit (pocket the cash) or plant it back (DRIP — reinvest). Over 20 years, the reinvested tree grows dramatically larger, with exponentially more fruit. The eat-it tree stays small. Magical visual metaphor for compound dividends.

### US-021: Define types
**Acceptance Criteria:**
- [x] Create `dividendTreeTypes.ts` in `simulations/`
- [x] `DividendYear`: year, treeValue, dividendAmount, reinvested boolean
- [x] `DividendTreeConfig`: initialInvestment (₪10,000), dividendYield (0.03), stockGrowth (0.07), years (20)
- [x] `DividendTreeState`: currentYear, eatTree (value + total dividends taken), plantTree (value growing), isPlaying, isComplete
- [x] `DividendTreeScore`: eatTotal (value + dividends), plantTotal (reinvested value), difference
- [x] Typecheck passes

### US-022: Create dividend data
**Acceptance Criteria:**
- [x] Create `dividendTreeData.ts` in `simulations/`
- [x] Initial: ₪10,000 in a stock with 3% dividend yield and 7% annual growth
- [x] "Eat" path: dividends paid out, stock grows but dividends only on original shares
- [x] "Plant" path: dividends reinvested (DRIP), compound growth on growing share count
- [x] Typecheck passes

### US-023: Build dividend tree hook
**Acceptance Criteria:**
- [x] Create `useDividendTree.ts` in `simulations/`
- [x] Simulate both paths in parallel over 20 years
- [x] Eat: value = initialShares × currentPrice. Dividends paid out yearly
- [x] Plant (DRIP): shares grow each year by (dividendAmount / currentPrice). Value = allShares × currentPrice
- [x] Auto-play mode at configurable speed
- [x] Typecheck passes

### US-024: Build Dividend Tree screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `DividendTreeScreen.tsx` in `simulations/`
- [x] **Two animated trees** side by side. Left: "🍽️ אוכל" (eat), Right: "🌱 שותל" (plant/reinvest)
- [x] Each year: fruits appear on tree. Left tree: fruits drop and disappear (cash out). Right tree: fruits drop and become new branches (tree grows)
- [x] **Tree size**: right tree physically grows larger each year (scale animation). Left stays same size
- [x] **Year counter**: dramatic center display
- [x] **Value counters**: below each tree. Right tree's number grows exponentially with golden glow
- [x] **"Play 20 Years" button**: cinematic auto-advance showing 20 years of growth/eating in 15 seconds
- [x] **Fruit counter**: small counter showing dividends per year. Right tree's annual dividend grows as shares compound
- [x] At year 20: dramatic difference reveal with confetti on the reinvested tree
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-025: Results and integration
**Acceptance Criteria:**
- [x] Side-by-side final comparison with dramatic difference (often 2-3x)
- [x] "אכלת ₪X סה״כ דיבידנדים. אם היית שותל — היה לך ₪Y (פי Z יותר!)"
- [x] Key lesson: "דיבידנד שמחזירים לעץ = ריבית דריבית על סטרואידים."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-4-23` triggers `DividendTreeScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 24: מנהל התיקים (Portfolio Manager) — Module 24

Concept: Player builds a portfolio from 5 asset classes. Then the simulator throws 5 random world events (war, tech boom, pandemic, interest rate hike, commodity crash). After each event, portfolio value changes based on allocation. Well-diversified portfolios ride through all events. Concentrated portfolios swing wildly.

### US-026: Define types
**Acceptance Criteria:**
- [x] Create `portfolioManagerTypes.ts` in `simulations/`
- [x] `AssetClass`: id, name (Hebrew), emoji, color
- [x] `WorldEvent`: id, name (Hebrew), emoji, impacts Record<assetId, number> (% change per asset)
- [x] `PortfolioManagerConfig`: assetClasses AssetClass[], events WorldEvent[], budget (₪200,000)
- [x] `PortfolioManagerState`: allocations Record<assetId, number>, portfolioValue, eventHistory, currentEventIndex, isComplete
- [x] `PortfolioManagerScore`: grade, finalValue, maxDrawdown, volatility, diversificationBonus
- [x] Typecheck passes

### US-027: Create asset and event data
**Acceptance Criteria:**
- [x] Create `portfolioManagerData.ts` in `simulations/`
- [x] 5 asset classes: מניות US (🇺🇸), אג"ח ממשלתי (🏛️), נדל"ן (🏠), זהב (🥇), מניות שווקים מתפתחים (🌍)
- [x] 5 events: (1) מלחמה בתיה"ב → stocks -20%, bonds +5%, gold +15%, (2) בום טכנולוגי → US stocks +25%, EM +10%, bonds -3%, (3) מגפה עולמית → stocks -30%, bonds +8%, gold +20%, REIT -15%, (4) עלייה בריבית → bonds -10%, REIT -8%, stocks -5%, (5) התאוששות גלובלית → stocks +20%, EM +15%, REIT +12%
- [x] Budget: ₪200,000 to allocate
- [x] Typecheck passes

### US-028: Build portfolio manager hook
**Acceptance Criteria:**
- [x] Create `usePortfolioManager.ts` in `simulations/`
- [x] Phase 1: player allocates budget across 5 assets (sliders, must sum to 100%)
- [x] Phase 2: events fire sequentially, portfolio value adjusts per event impacts × allocation
- [x] Track: value after each event, max drawdown, volatility (std dev of changes)
- [x] Diversification bonus: extra points if no single asset >40%
- [x] Grade: S (survived all events, positive overall, diversified), A-F based on final value + volatility
- [x] Typecheck passes

### US-029: Build Portfolio Manager screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `PortfolioManagerScreen.tsx` in `simulations/`
- [x] **Phase 1 — Building**: 5 colored sliders (linked, sum to 100%). Animated donut/pie chart updates live. Each asset class has emoji + name + current %
- [x] **"Lock Portfolio" button**: dramatic animation sealing the portfolio (vault door effect)
- [x] **Phase 2 — Events**: world event cards slam in with dramatic headline. Portfolio value counter jumps (green up / red down). Each asset class shows its individual impact
- [x] **Live donut chart**: allocation adjusts as values change (stocks shrink when they fall, etc.)
- [x] **Shake effects**: heavy haptic + screen shake on big drops. Gold particles on big gains
- [x] **Comparison ghost**: translucent line showing "100% stocks" portfolio for contrast
- [x] All 5 events auto-play with dramatic timing (3s per event)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-030: Results and integration
**Acceptance Criteria:**
- [x] Final portfolio value vs starting ₪200K
- [x] Event-by-event breakdown chart
- [x] Max drawdown highlighted
- [x] Key lesson: "פיזור = הביטוח של המשקיע. אל תשימו הכל בסל אחד."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-4-24` triggers `PortfolioManagerScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## Technical Notes
- All files in `src/features/chapter-4-content/simulations/`
- Create `simulations/index.ts` barrel export for all 6 screens
- Module IDs: `mod-4-19` through `mod-4-24`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- `react-native-reanimated` for all animations — 60FPS target
- `expo-haptics` aggressively
- Chart animations should use shared values mapped to SVG paths where possible
- All text Hebrew RTL, numbers with `toLocaleString('he-IL')`
