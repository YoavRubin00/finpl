# PRD 51: סימולטורים למודולות החדשות (9 Sims)

## Context
9 מודולות חדשות (mod-3-18, mod-4-25..30, mod-5-30..31) קיבלו תוכן מלא (כרטיסיות, שאלות, simConcept). עכשיו צריך לבנות את הסימולטורים שלהן — 9 משחקים אינטראקטיביים חדשים.

## Design Philosophy — "Million Dollar Simulators"
- **60FPS animations** via `react-native-reanimated` shared values
- **Layered gradients** via `expo-linear-gradient`
- **Haptic choreography** — `successHaptic`, `heavyHaptic`, `tapHaptic`
- **Particle effects** — `ConfettiExplosion` on achievements
- **RTL** — `{ writingDirection: 'rtl', textAlign: 'right' }`

## Shared Infrastructure
- Pattern: `xxxTypes.ts` → `xxxData.ts` → `useXxx.ts` → `XxxScreen.tsx`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `SimLottieBackground`, `FlyingRewards`
- Economy: `useEconomyStore` → `addXP(20-30, 'sim_complete')` + `addCoins(30-40)`
- Grade system: S (≥90) / A (≥75) / B (≥55) / C (≥35) / F (<35) — `GRADE_COLORS`, `GRADE_HEBREW` from simTheme
- Theme: `getChapterTheme('chapter-N')` → `SIM3`/`SIM4`/`SIM5` from each chapter's simTheme.ts
- Ignore pre-existing TS errors in skills/stitch-skills/

## Integration Points (Final Step for Each Sim)
1. Export from `simulations/index.ts` (chapter 3/4/5)
2. Add entry in `SimulatorLoader.tsx` (SIM_LOADERS map)
3. Add module ID to `MODULES_WITH_SIM` set in `LessonFlowScreen.tsx`

---

## SIM 3-18: בוחר המסלולים (Track Selector) — mod-3-18

**Concept:** המשתמש בוחר מסלול השקעה (מנייתי / מאוזן / שמרני) ורואה סימולציה של 30 שנה עם אירועי שוק. בסוף משווה תוצאות + השפעת דמי ניהול.

**Dir:** `src/features/chapter-3-content/simulations/`

### US-001: Types (trackSelectorTypes.ts)
**Acceptance Criteria:**
- [x] Create `trackSelectorTypes.ts` in `simulations/`
- [x] `InvestmentTrack`: id, name, emoji, stockPercent, bondPercent, annualFeePercent
- [x] `MarketYear`: year, stockReturn, bondReturn
- [x] `TrackSelectorConfig`: tracks InvestmentTrack[], marketYears MarketYear[], initialInvestment (100000)
- [x] `TrackSelectorState`: selectedTrackId string | null, yearIndex, balanceByTrack Record<string, number[]>, isPlaying, isComplete
- [x] `TrackSelectorScore`: balances Record<string, number>, feesLost Record<string, number>, bestTrack string, grade 'S'|'A'|'B'|'C'|'F', gradeLabel string
- [x] Typecheck passes

### US-002: Data (trackSelectorData.ts)
**Acceptance Criteria:**
- [x] Create `trackSelectorData.ts` in `simulations/`
- [x] 3 tracks: מנייתי (80/20, 0.15% fee, 📈), מאוזן (50/50, 0.25% fee, ⚖️), שמרני (20/80, 0.4% fee, 🛡️)
- [x] 30 years market data inspired by real Israeli/US markets (include crashes in years 8, 18, 25)
- [x] Stocks: avg 8% with range -35% to +35%; Bonds: avg 3% with range -5% to +8%
- [x] Pre-compute expected outcomes per track
- [x] Typecheck passes

### US-003: Hook (useTrackSelector.ts)
**Acceptance Criteria:**
- [x] Create `useTrackSelector.ts` in `simulations/`
- [x] `selectTrack(id)` → sets chosen track
- [x] `play()` / `pause()` auto-advance (750ms interval per year)
- [x] Each year: blended return = (stockReturn × stockPct + bondReturn × bondPct) − annualFee; compound on balance
- [x] Computes all 3 tracks simultaneously for comparison
- [x] Score on completion: compare final balances, calculate total fees lost per track
- [x] `reset()` function to replay
- [x] Typecheck passes

### US-004: Screen (TrackSelectorScreen.tsx)
**Acceptance Criteria:**
- [x] Create `TrackSelectorScreen.tsx` in `simulations/`
- [x] **Selection phase**: 3 GlowCard track cards with emoji, name, allocation description
- [x] **Simulation phase**: animated line chart showing 30-year growth for all 3 tracks simultaneously (3 colored lines)
- [x] Year counter at top + current balance for selected track (animated number, spring)
- [x] Auto-play button: "▶️ הרץ 30 שנה"
- [x] Fee impact callout card at bottom: "דמי ניהול גבוהים עלו לך X ש"ח"
- [x] SimLottieBackground with chapter-3 blue theme (SIM3)
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Score + Integration
**Acceptance Criteria:**
- [x] ScoreScreen: grade display, 3-track comparison table, fee difference insight card
- [x] Lesson card: "אפילו הפרש קטן בדמי ניהול הופך לסכום עצום לאורך 30 שנה"
- [x] Reward: +25 XP (sim_complete), +30 Coins
- [x] Export `TrackSelectorScreen` from `chapter-3-content/simulations/index.ts`
- [x] Add `"mod-3-18": () => require("../chapter-3-content/simulations").TrackSelectorScreen` to SimulatorLoader SIM_LOADERS
- [x] Add `"mod-3-18"` to MODULES_WITH_SIM in LessonFlowScreen
- [x] Typecheck passes

---

## SIM 4-25: בלש הדוחות (Statement Detective) — mod-4-25

**Concept:** המשתמש מקבל קטעים מדוחות כספיים וצריך לזהות דגלים אדומים ולהחליט: להשקיע או לברוח.

**Dir:** `src/features/chapter-4-content/simulations/`

### US-006: Types (statementDetectiveTypes.ts)
**Acceptance Criteria:**
- [x] `FinancialSnippet`: id, companyName, emoji, revenue, netIncome, cashFlow, totalAssets, totalLiabilities, equity, peRatio, debtEquityRatio, redFlags string[]
- [x] `DetectiveRound`: snippet FinancialSnippet, correctVerdict 'invest' | 'avoid', explanation string
- [x] `DetectiveConfig`: rounds DetectiveRound[], timePerRound (30)
- [x] `DetectiveState`: currentRoundIndex, playerVerdicts ('invest'|'avoid')[], showingFeedback, isComplete
- [x] `DetectiveScore`: correctCount, totalRounds, missedRedFlags string[], grade, gradeLabel
- [x] Typecheck passes

### US-007: Data (statementDetectiveData.ts)
**Acceptance Criteria:**
- [x] 5 company cases in Hebrew:
  - "טק-גרואו בע"מ" — positive profit but negative cash flow (avoid)
  - "בנק יציב" — strong balance sheet, low D/E (invest)
  - "פאשן פלוס" — declining revenue 3 years straight, high D/E (avoid)
  - "מזון ישראלי" — stable revenue, positive cash flow, fair P/E (invest)
  - "קריפטו-טק" — huge revenue jump but D/E of 4.5, negative equity (avoid)
- [x] Each with realistic numbers and Hebrew explanations
- [x] Typecheck passes

### US-008: Hook (useStatementDetective.ts)
**Acceptance Criteria:**
- [x] Present round → user votes invest/avoid → compare to correctVerdict
- [x] Track correct/incorrect per round
- [x] Calculate grade: 5/5=S, 4/5=A, 3/5=B, 2/5=C, ≤1=F
- [x] Collect missed red flags for score screen
- [x] `reset()` function
- [x] Typecheck passes

### US-009: Screen (StatementDetectiveScreen.tsx)
**Acceptance Criteria:**
- [x] Company card: name + emoji at top, grid of financial metrics (revenue, profit, cash flow, D/E, P/E)
- [x] Red metrics highlighted in red, green metrics in green
- [x] Two big buttons: "להשקיע 📈" (green) / "לברוח 🏃" (red)
- [x] After vote: reveal correct answer + missed red flags with FadeInUp animation
- [x] SimFeedbackBar with explanation
- [x] Progress dots (5 rounds)
- [x] SIM4 indigo theme
- [x] Typecheck passes; verify in browser

### US-010: Score + Integration
**Acceptance Criteria:**
- [x] ScoreScreen with grade, per-company breakdown
- [x] Reward: +25 XP, +30 Coins
- [x] Export `StatementDetectiveScreen` from `chapter-4-content/simulations/index.ts`
- [x] SimulatorLoader: `"mod-4-25"`, MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 4-26: השוואת ברוקרים (Broker Compare) — mod-4-26

**Concept:** המשתמש בוחר פרופיל השקעה ומשווה 3 פלטפורמות מסחר.

### US-011: Types (brokerCompareTypes.ts)
**Acceptance Criteria:**
- [x] `Broker`: id, name, emoji, tradeFeePercent, tradeFeeMin, custodyFeePercent, fxFeePercent, inactivityFee
- [x] `UserProfile`: investmentAmount, tradesPerMonth, isInternational boolean
- [x] `BrokerCompareConfig`: brokers Broker[]
- [x] `BrokerCompareState`: profile UserProfile, yearlyCosts Record<string, number>, selectedBroker string | null, isComplete
- [x] `BrokerCompareScore`: cheapestBroker string, yearlyDifference number, totalSavings10Y number, grade, gradeLabel
- [x] Typecheck passes

### US-012: Data (brokerCompareData.ts)
**Acceptance Criteria:**
- [x] 3 brokers: בנק לאומי 🏦 (0.3% trade, 0.35% custody, 0.5% FX), מיטב 📊 (0.08% trade, 0% custody, 0.3% FX), Interactive Brokers 🌍 ($1 flat, 0% custody, 0.02% FX)
- [x] Realistic fee structures
- [x] Typecheck passes

### US-013: Hook (useBrokerCompare.ts)
**Acceptance Criteria:**
- [x] Reactive calculation: whenever profile changes, recalculate yearly cost per broker
- [x] Formula: (tradesPerMonth × 12 × tradeFee) + (investmentAmount × custodyFee) + (isInternational ? fxCost : 0) + inactivityFee
- [x] Rank brokers by total cost
- [x] Grade: chose cheapest=S, 2nd cheapest=B, most expensive=F
- [x] Typecheck passes

### US-014: Screen (BrokerCompareScreen.tsx)
**Acceptance Criteria:**
- [x] Top: sliders for investment amount (₪10K-₪1M) + trades/month (1-20) + Israel/International toggle
- [x] Middle: 3 broker cards with fee breakdown and total annual cost
- [x] Bottom: animated horizontal bar chart comparing costs, cheapest glows
- [x] "Choose your broker" button → marks completion
- [x] SIM4 theme
- [x] Typecheck passes; verify in browser

### US-015: Score + Integration
**Acceptance Criteria:**
- [x] Summary card: "בחרת X, חסכת Y ש"ח בשנה לעומת הבנק"
- [x] 10-year projection
- [x] Reward: +20 XP, +30 Coins
- [x] Export, SimulatorLoader ("mod-4-26"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 4-27: מנהל המשבר (Crisis Manager) — mod-4-27

**Concept:** ניהול תיק דרך 5 משברים היסטוריים. בכל שלב: למכור/להחזיק/לקנות.

### US-016: Types (crisisManagerTypes.ts)
**Acceptance Criteria:**
- [x] `CrisisEvent`: id, title, emoji, year, headline string, marketDropPercent, recoveryMonths, postRecoveryGainPercent
- [x] `PlayerAction`: 'sell' | 'hold' | 'buy'
- [x] `CrisisRound`: event CrisisEvent, action PlayerAction | null, playerBalanceAfter, holdBalanceAfter
- [x] `CrisisConfig`: initialBalance (100000), events CrisisEvent[]
- [x] `CrisisState`: currentEventIndex, playerBalance, holdBalance, rounds CrisisRound[], showingResult, isComplete
- [x] `CrisisScore`: finalBalance, holdStrategyBalance, difference, beatHoldStrategy boolean, grade, gradeLabel
- [x] Typecheck passes

### US-017: Data (crisisManagerData.ts)
**Acceptance Criteria:**
- [x] 5 events chronologically: Dot-com 2000 (💻 -45%, 7y recovery), 2008 GFC (🏚️ -38%, 4y), Oct 7 2023 (🇮🇱 -8%, 12mo), 2020 COVID (🦠 -34%, 5mo), 2022 Inflation (📈 -20%, 18mo)
- [x] Each with Hebrew headline and description
- [x] Post-recovery gains calculated
- [x] Typecheck passes

### US-018: Hook (useCrisisManager.ts)
**Acceptance Criteria:**
- [x] Present crisis → user picks action → calculate impact:
  - Sell: lock in marketDropPercent loss, miss recovery
  - Hold: take the drop, then recover + gain postRecoveryGainPercent
  - Buy: double down at bottom, get 2× the postRecoveryGainPercent on the additional investment
- [x] Track holdBalance in parallel (always holds)
- [x] Grade: final > holdBalance*1.1 = S, > hold = A, > 80% hold = B, > 60% hold = C, else F
- [x] Typecheck passes

### US-019: Screen (CrisisManagerScreen.tsx)
**Acceptance Criteria:**
- [x] Dramatic crisis card: big emoji, year, headline, drop percentage in red
- [x] Simple mini-chart showing the crash shape
- [x] 3 action buttons: "למכור 📉" (red) / "להחזיק ✊" (yellow) / "לקנות 🛒" (green)
- [x] After action: animated result comparison (your balance vs hold), SimFeedbackBar
- [x] Progress: 5 event dots
- [x] SIM4 theme
- [x] Typecheck passes; verify in browser

### US-020: Score + Integration
**Acceptance Criteria:**
- [x] ScoreScreen: "Your portfolio: ₪X vs Hold strategy: ₪Y"
- [x] Lesson: "Time in the market beats timing the market"
- [x] Reward: +30 XP, +40 Coins
- [x] Export, SimulatorLoader ("mod-4-27"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 4-28: קורא הגרפים (Chart Reader) — mod-4-28

**Concept:** גרפי נרות עם שם חברה נסתר. זהה מגמה והחלט.

### US-021: Types (chartReaderTypes.ts)
**Acceptance Criteria:**
- [x] `CandleData`: date string, open, close, high, low, volume
- [x] `ChartRound`: id, candles CandleData[], volumeData number[], correctAction 'buy'|'sell'|'hold', companyName string, whatHappened string, pattern string
- [x] `ChartReaderConfig`: rounds ChartRound[]
- [x] `ChartReaderState`: currentRoundIndex, playerActions, showingReveal, isComplete
- [x] `ChartReaderScore`: correctCount, totalRounds, grade, gradeLabel
- [x] Typecheck passes

### US-022: Data (chartReaderData.ts)
**Acceptance Criteria:**
- [x] 4 chart scenarios with generated candle data (40 candles each):
  - Uptrend with rising volume → buy (reveal: Nvidia 2023)
  - Broken support with high volume sell-off → sell (reveal: Meta 2022)
  - Sideways range, low volume → hold (reveal: Coca-Cola 2019)
  - Golden cross (50MA crosses 200MA) → buy (reveal: Apple 2020)
- [x] Typecheck passes

### US-023: Hook (useChartReader.ts)
**Acceptance Criteria:**
- [x] Present chart → user picks buy/sell/hold → compare to correctAction
- [x] Score: 4/4=S, 3/4=A, 2/4=B, 1/4=C, 0=F
- [x] Typecheck passes

### US-024: Screen (ChartReaderScreen.tsx)
**Acceptance Criteria:**
- [x] Candlestick chart rendered with reanimated (green/red bars, wicks)
- [x] "מניה מסתורית 🔮" label
- [x] Volume bars below chart
- [x] 3 action buttons
- [x] Reveal: company name + what happened animation (slide down)
- [x] SimFeedbackBar per round
- [x] SIM4 theme
- [x] Typecheck passes; verify in browser

### US-025: Score + Integration
**Acceptance Criteria:**
- [x] Reward: +25 XP, +30 Coins
- [x] Export, SimulatorLoader ("mod-4-28"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 4-29: מיון המניות (Stock Sorter) — mod-4-29

**Concept:** כרטיסי מניות אמיתיות. מיין לקטגוריות.

### US-026: Types (stockSorterTypes.ts)
**Acceptance Criteria:**
- [x] `StockCard`: id, name, emoji, ticker, marketCapB number, peRatio, dividendYield, sector string, isGrowth boolean, isCyclical boolean, capSize 'large'|'mid'|'small'
- [x] `SortQuestion`: card StockCard, questionType 'growth_value'|'cyclical_defensive'|'cap_size', correctAnswer string
- [x] `StockSorterConfig`: questions SortQuestion[]
- [x] `StockSorterState`: currentQuestionIndex, answers string[], isComplete
- [x] `StockSorterScore`: correctCount, totalQuestions, accuracy number, grade, gradeLabel
- [x] Typecheck passes

### US-027: Data (stockSorterData.ts)
**Acceptance Criteria:**
- [x] 8 stocks × 1 question each:
  - Apple 🍎 (growth/large), Bank Hapoalim 🏦 (value/large), Tesla ⚡ (growth/cyclical)
  - Teva 💊 (value/defensive), Nvidia 🎮 (growth/large), Strauss 🥛 (value/defensive)
  - Wix 🌐 (growth/small), Bezeq 📞 (value/defensive)
- [x] Questions alternate between growth/value, cyclical/defensive, cap size
- [x] Typecheck passes

### US-028: Hook (useStockSorter.ts)
**Acceptance Criteria:**
- [x] Present question → user picks category → check
- [x] Score: 8/8=S, 7/8=A, 5-6/8=B, 3-4/8=C, ≤2=F
- [x] Typecheck passes

### US-029: Screen (StockSorterScreen.tsx)
**Acceptance Criteria:**
- [x] Stock card: ticker + name + emoji + metrics
- [x] Question text: "האם זו מניית צמיחה או ערך?"
- [x] 2 choice buttons per question (varies by questionType)
- [x] Correct = green pulse + haptic; incorrect = red shake
- [x] Progress bar (8 rounds)
- [x] SIM4 theme
- [x] Typecheck passes; verify in browser

### US-030: Score + Integration
**Acceptance Criteria:**
- [x] Reward: +20 XP, +30 Coins
- [x] Export, SimulatorLoader ("mod-4-29"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 4-30: המרוץ נגד המדד (Index Race) — mod-4-30

**Concept:** בחר 5 מניות מתוך 12 והתחרה מול S&P 500 ב-10 שנות סימולציה.

### US-031: Types (indexRaceTypes.ts)
**Acceptance Criteria:**
- [x] `StockOption`: id, name, emoji, sector, annualReturns number[] (10 entries)
- [x] `IndexRaceConfig`: stockOptions StockOption[], pickCount (5), years (10), indexReturns number[], initialInvestment (100000)
- [x] `IndexRaceState`: phase 'pick'|'race'|'complete', selectedStockIds string[], portfolioValueByYear number[], indexValueByYear number[], currentYear, isPlaying
- [x] `IndexRaceScore`: portfolioFinal, indexFinal, differencePercent, beatIndex boolean, grade, gradeLabel
- [x] Typecheck passes

### US-032: Data (indexRaceData.ts)
**Acceptance Criteria:**
- [x] 12 stocks with 10-year returns (inspired by 2014-2024):
  - Winners: Apple (+25%avg), Nvidia (+40%avg), Amazon (+20%avg), Microsoft (+22%avg)
  - Average: J&J (+10%avg), Coca-Cola (+8%avg), Procter&Gamble (+9%avg), Bank Leumi (+12%avg)
  - Losers: Intel (-5%avg), GE (-8%avg), Teva (-10%avg), WeWork (-30%avg)
- [x] S&P 500 benchmark: ~12% avg (matching real data)
- [x] Typecheck passes

### US-033: Hook (useIndexRace.ts)
**Acceptance Criteria:**
- [x] Pick phase: toggle stock selection (max 5)
- [x] Race phase: auto-advance years (750ms), equal-weight portfolio (20% each)
- [x] Calculate portfolio value vs index value per year
- [x] Grade: beat by 20%+ = S, beat = A, within 5% = B, lose by ≤20% = C, else F
- [x] Typecheck passes

### US-034: Screen (IndexRaceScreen.tsx)
**Acceptance Criteria:**
- [x] **Pick phase**: scrollable grid of 12 stock cards, selected ones glow, counter "X/5 נבחרו"
- [x] **Race phase**: dual line chart (gold = your portfolio, blue = S&P 500)
- [x] Year counter + animated balance numbers
- [x] Winner reveal: confetti if beat index, "lesson learned" if lost
- [x] SIM4 theme
- [x] Typecheck passes; verify in browser

### US-035: Score + Integration
**Acceptance Criteria:**
- [x] ScoreScreen: "ניצחת/הפסדת את המדד ב-X%"
- [x] Lesson card: "92% ממנהלי ההשקעות המקצועיים לא מצליחים לנצח את המדד לאורך 15 שנה"
- [x] Reward: +30 XP, +40 Coins
- [x] Export, SimulatorLoader ("mod-4-30"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 5-30: סימולטור הקריפטו (Crypto Sim) — mod-5-30

**Concept:** הקצאת 10,000 ש"ח בין BTC, ETH ומזומן. 3 שנות סימולציה מול S&P 500.

**Dir:** `src/features/chapter-5-content/simulations/`

### US-036: Types (cryptoSimTypes.ts)
**Acceptance Criteria:**
- [x] `CryptoAsset`: id 'btc'|'eth'|'cash', name, emoji
- [x] `CryptoAllocation`: btcPercent, ethPercent, cashPercent (must sum to 100)
- [x] `CryptoYear`: year, btcReturn, ethReturn, sp500Return
- [x] `CryptoSimConfig`: initialAmount (10000), yearData CryptoYear[], assets CryptoAsset[]
- [x] `CryptoSimState`: allocation, cryptoBalanceByYear number[], stockBalanceByYear number[], currentYear, maxDrawdownPercent, isPlaying, isComplete
- [x] `CryptoSimScore`: cryptoFinal, stockFinal, maxDrawdown, volatilityRatio, grade, gradeLabel
- [x] Typecheck passes

### US-037: Data (cryptoSimData.ts)
**Acceptance Criteria:**
- [x] 3 years inspired by 2021-2023:
  - Year 1: BTC +60%, ETH +400%, S&P +27% (boom)
  - Year 2: BTC -65%, ETH -67%, S&P -19% (crash)
  - Year 3: BTC +155%, ETH +90%, S&P +24% (recovery)
- [x] Cash return: 0% (inflation-adjusted)
- [x] Typecheck passes

### US-038: Hook (useCryptoSim.ts)
**Acceptance Criteria:**
- [x] 3-way allocation sliders (linked: must sum to 100%)
- [x] Auto-play 3 years
- [x] Calculate crypto portfolio: weighted sum of BTC + ETH + cash returns
- [x] Calculate S&P 500 comparison
- [x] Max drawdown: worst year-end-to-year-end drop
- [x] Typecheck passes

### US-039: Screen (CryptoSimScreen.tsx)
**Acceptance Criteria:**
- [x] 3 allocation sliders: ₿ Bitcoin (orange), Ξ Ethereum (blue), 💵 Cash (green)
- [x] Linked: adjusting one redistributes the others
- [x] Dual chart: crypto portfolio vs S&P 500
- [x] Year animation: screen shakes on big moves (reanimated withSequence scale pulse)
- [x] Max drawdown callout in red
- [x] SIM5 purple theme
- [x] Typecheck passes; verify in browser

### US-040: Score + Integration
**Acceptance Criteria:**
- [x] ScoreScreen: crypto vs stocks comparison, volatility insight
- [x] Lesson card: "קריפטו מעניין כלווין קטן (עד 5%) — לא כליבה של תיק"
- [x] Reward: +25 XP, +30 Coins
- [x] Export from `chapter-5-content/simulations/index.ts`
- [x] SimulatorLoader ("mod-5-30"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## SIM 5-31: בונה ה-IRA (IRA Builder) — mod-5-31

**Concept:** Traditional vs Roth IRA — בחירה, הפקדה וסימולציה של 30 שנה. השוואת נטו אחרי מס.

### US-041: Types (iraBuilderTypes.ts)
**Acceptance Criteria:**
- [x] `IRAType`: 'traditional' | 'roth'
- [x] `IRAConfig`: annualLimit (7000), catchUpLimit (8000), defaultReturn (0.08), defaultTaxNow (0.22), defaultTaxRetirement (0.30), years (30)
- [x] `IRAState`: selectedType IRAType | null, annualContribution, investmentReturn, taxRateNow, taxRateRetirement, traditionalByYear number[], rothByYear number[], isComplete
- [x] `IRAScore`: traditionalGross, traditionalNet, rothGross, rothNet, winner IRAType, differenceNet, grade, gradeLabel
- [x] Typecheck passes

### US-042: Data (iraBuilderData.ts)
**Acceptance Criteria:**
- [x] Default config exported
- [x] Pre-computed comparison for default values
- [x] Helper text strings in Hebrew for each IRA type
- [x] Israeli equivalent callout: "המקבילה הישראלית: קופת גמל להשקעה"
- [x] Typecheck passes

### US-043: Hook (useIRABuilder.ts)
**Acceptance Criteria:**
- [x] Sliders: contribution ($1K-$7K), return (4%-12%), tax now (10%-40%), tax at retirement (10%-40%)
- [x] Calculate both types in parallel for 30 years:
  - Traditional: contribution pre-tax → grows tax-free → taxed at retirement rate on withdrawal
  - Roth: contribution post-tax (contribution × (1 - taxNow)) → grows tax-free → no tax on withdrawal
- [x] Winner = higher net value
- [x] Grade based on whether user identified correct winner
- [x] Typecheck passes

### US-044: Screen (IRABuilderScreen.tsx)
**Acceptance Criteria:**
- [x] IRA type toggle at top (Traditional 📜 / Roth 🔮)
- [x] 4 sliders: contribution, return, tax now, tax at retirement
- [x] Dual animated bar chart: Traditional (blue) vs Roth (purple) after-tax values
- [x] Year-by-year growth animation (auto-play)
- [x] Israeli callout card at bottom
- [x] SIM5 purple theme
- [x] Typecheck passes; verify in browser

### US-045: Score + Integration
**Acceptance Criteria:**
- [x] ScoreScreen: winner revealed, tax savings insight, 30-year projection
- [x] Reward: +25 XP, +30 Coins
- [x] Export from `chapter-5-content/simulations/index.ts`
- [x] SimulatorLoader ("mod-5-31"), MODULES_WITH_SIM
- [x] Typecheck passes

---

## Execution Order (Ralph Loops)

Build sequentially by chapter. Each sim = 5 user stories.

### Phase 1: Chapter 3 (1 sim)
US-001 → US-005: בוחר המסלולים (TrackSelector)

### Phase 2: Chapter 4 (6 sims)
US-006 → US-010: בלש הדוחות (StatementDetective)
US-011 → US-015: השוואת ברוקרים (BrokerCompare)
US-016 → US-020: מנהל המשבר (CrisisManager)
US-021 → US-025: קורא הגרפים (ChartReader)
US-026 → US-030: מיון המניות (StockSorter)
US-031 → US-035: המרוץ נגד המדד (IndexRace)

### Phase 3: Chapter 5 (2 sims)
US-036 → US-040: סימולטור הקריפטו (CryptoSim)
US-041 → US-045: בונה ה-IRA (IRABuilder)

### Phase 4: Final Integration & Verification
- Verify all 9 sims load correctly via SimulatorLoader
- `npx tsc --noEmit` — no new TS errors
- Test each sim end-to-end in Expo Go
