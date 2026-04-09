# PRD 26 - Chapter 3 Simulations: יציבות (Stability) ⚖️

## Introduction
4 interactive simulations for Chapter 3 (Stability), modules 15-18.
Topics: inflation, psychology of money, kupat gemel, robo-advisor.

## Design Philosophy — "Million Dollar Simulators"
Every simulator MUST feel like a premium, standalone mini-game:
- **60FPS animations** via `react-native-reanimated` shared values
- **Layered gradients** via `expo-linear-gradient` for depth
- **Haptic choreography** — `successHaptic`, `heavyHaptic` on milestones, `tapHaptic` everywhere
- **Particle effects** — `ConfettiExplosion` on achievements
- **Micro-animations** — every number animates (spring), every card uses `fadeInUp`/`fadeInScale`
- **Premium typography** — `THEME` colors, gold accents, neon-violet highlights
- **Immersive fullscreen** — hide tab bar and economy header during gameplay

## Shared Context
- Pattern: `xxxTypes.ts` → `xxxData.ts` → `useXxx.ts` → `XxxScreen.tsx`
- Dir: `src/features/chapter-3-content/simulations/`
- Create `simulations/index.ts` barrel export
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- RTL: `{ writingDirection: 'rtl', textAlign: 'right' }`
- Integration: `LessonFlowScreen.tsx` — module IDs `mod-3-15` through `mod-3-18`
- Ignore pre-existing TS errors in FeedSidebar and useClashStore

---

## SIM 15: מירוץ הקניות (Inflation Race) — Module 15

Concept: A dramatic shopping race. The player has ₪10,000 sitting in their checking account. On a scrolling timeline (years), product prices rise visibly each year while their money stays flat. An "investment shield" option lets them grow their money to beat inflation. The visual contrast between "money under the mattress" (shrinking purchasing power) vs "invested money" (growing) should be jaw-dropping.

### US-001: Define types for Inflation Race
**Acceptance Criteria:**
- [x] Create `inflationRaceTypes.ts` in `simulations/`
- [x] `Product`: id, name (Hebrew), emoji, basePrice (₪), category
- [x] `InflationRaceConfig`: initialMoney (₪10,000), inflationRate (0.035), investmentReturn (0.08), years (1-20 slider), products array
- [x] `InflationRaceState`: currentYear, moneyValue (stays same), purchasingPower (declines), investedValue (grows), products (with inflated prices), affordableItems count, isComplete
- [x] `InflationRaceScore`: purchasingPowerLost (%), investmentGain (%), itemsLostAccess count
- [x] Typecheck passes

### US-002: Create product and pricing data
**Acceptance Criteria:**
- [x] Create `inflationRaceData.ts` in `simulations/`
- [x] 8 Israeli products with 2024 base prices: קפה הפוך (₪15), מנת שווארמה (₪55), כרטיס קולנוע (₪45), מנוי חדר כושר (₪250/mo), שכירות חדר (₪3,000/mo), מכולת שבועית (₪400), כרטיס הופעה (₪200), ארוחת מסעדה (₪120)
- [x] Inflation rate: 3.5% annual
- [x] Investment return: 8% annual
- [x] Typecheck passes

### US-003: Build simulation hook
**Acceptance Criteria:**
- [x] Create `useInflationRace.ts` in `simulations/`
- [x] Year slider (1-20): recalculate all product prices at `basePrice × (1.035)^years`
- [x] Calculate purchasing power: `initialMoney / currentPriceLevel × 100`
- [x] Calculate invested value: `initialMoney × (1.08)^years`
- [x] Track how many items the player can no longer afford at each year
- [x] Auto-play mode for dramatic year-by-year progression
- [x] Typecheck passes

### US-004: Build Inflation Race screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `InflationRaceScreen.tsx` in `simulations/`
- [x] **Top**: Two money displays — left "כסף בעו״ש" (stays ₪10,000 but fades/shrinks visually), right "כסף מושקע" (grows with golden glow, number counting up)
- [x] **Center**: Product grid showing all 8 items. As years progress, prices animate upward. Items that become unaffordable get a red "❌" overlay and gray out
- [x] **Year slider**: neon-styled, dramatic. As it moves, products visually "inflate" — their cards grow slightly, prices pulse red on each increase
- [x] **Running counter**: "כוח הקנייה שלך: XX%" — shrinks with each year, turns yellow then red
- [x] **Invested path**: toggle to see "if you invested" — all affordable items glow green
- [x] **Cinematic auto-play**: plays 20 years in 10 seconds with dramatic music placeholder hooks
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Results and integration
**Acceptance Criteria:**
- [x] Dramatic reveal: "אחרי 20 שנה, הכסף שלך שווה רק ₪X (במקום ₪10,000)" vs "אם היית משקיע: ₪Y"
- [x] Products you can no longer afford listed with crossed-out emojis
- [x] Key lesson: "אם הכסף לא צומח, הוא נעלם. אינפלציה היא הגנב השקט."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-3-15` triggers `InflationRaceScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 16: מדד הפאניקה (Panic Index) — Module 16

Concept: A stock market graph runs across the screen. Scary headlines flash: "CRASH!", "RECESSION!", "SELL NOW!". A giant red "מכור הכל!" button pulses temptingly. The player must HOLD a green "החזק בסבלנות" button and resist the urge to sell. If they hold through the dip, the market recovers and they earn bonus points. If they panic-sell, they lock in losses and miss the recovery. Pure psychological warfare.

### US-006: Define types for Panic Index
**Acceptance Criteria:**
- [x] Create `panicIndexTypes.ts` in `simulations/`
- [x] `MarketEvent`: id, year, headline (Hebrew), marketChange (%), sentiment ('fear' | 'greed' | 'neutral'), historicalContext
- [x] `PanicIndexConfig`: initialInvestment (₪50,000), events array, recoveryBonus
- [x] `PanicIndexState`: currentEventIndex, portfolioValue, hasSold, holdStreak, panicMoments (times player almost sold), isComplete
- [x] `PanicIndexScore`: grade, finalValue, holdDuration, panicResistance (0-100)
- [x] Typecheck passes

### US-007: Create market event data
**Acceptance Criteria:**
- [x] Create `panicIndexData.ts` in `simulations/`
- [x] 8 events based on real history: (1) שוק שוורי +15%, (2) קורקציה -10%, (3) כותרת פאניקה: "מיתון בפתח!", (4) ירידה חדה -25%, (5) "מומחה מזהיר: תמכרו הכל!", (6) תחתית — שוק שטוח, (7) התאוששות +20%, (8) שיא חדש +35%
- [x] Each event has scary/calming headline in Hebrew
- [x] Total journey: ₪50K → dip to ₪32K → recover to ₪72K (if held)
- [x] Selling at any point locks the value at that moment
- [x] Typecheck passes

### US-008: Build game logic hook
**Acceptance Criteria:**
- [x] Create `usePanicIndex.ts` in `simulations/`
- [x] Events play sequentially (auto-advance every 3 seconds)
- [x] At each event: player can HOLD (continue) or SELL (lock in current value)
- [x] Track "panic moments" — when player hovers/taps the sell button but doesn't confirm
- [x] If held through all events: final portfolio value reflects full recovery
- [x] If sold: portfolio frozen at sale price, player watches remaining events as spectator
- [x] Grade: S (held through everything, never tapped sell), A (held, tapped sell 1-2x), B-F based on when/if they sold
- [x] Typecheck passes

### US-009: Build Panic Index screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `PanicIndexScreen.tsx` in `simulations/`
- [x] **Hero element**: animated stock chart line graph drawing in real time across the screen. Green when up, red when down. Smooth bezier curves
- [x] **Headlines**: flash across screen like breaking news ticker — red text during crashes, green during recovery. Dramatic font size
- [x] **The Sell Button**: large, pulsing RED button at bottom. Gets bigger and more tempting during crashes. Has a subtle "gravitational pull" animation
- [x] **The Hold Button**: green, steady, reliable. Player must press and hold it during each event to "hold their position"
- [x] **Portfolio counter**: large animated number showing current value. Drops dramatically during crashes (red flash + screen shake), climbs during recovery (gold glow)
- [x] **If player sells**: chart continues playing in grayscale. Player watches helplessly as market recovers without them. Their frozen value shown in red next to the green recovery line
- [x] **Sound hooks**: placeholders for tension music during crashes, relief music during recovery
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: Results and integration
**Acceptance Criteria:**
- [x] If held: "ברכות! עמדת בלחץ. ₪50,000 → ₪72,000 (+44%)" with gold confetti
- [x] If sold: "מכרת ב-₪X. אם היית מחזיק מעמד, היית ב-₪72,000" with gray tone
- [x] Panic resistance score shown as percentage
- [x] Key lesson: "האויב הכי גדול הוא הרגשות שלך. קור רוח = כסף."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-3-16` triggers `PanicIndexScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 17: מסלול המכשולים (Investment Obstacle Course) — Module 17

Concept: The player's money walks along a path (kupat gemel track). Obstacles appear: market dips, temptation to withdraw, tax events. Player chooses: withdraw (pay tax, exit) or continue (ride through). Shows the power of kupat gemel's liquidity + tax advantage at age 60.

### US-011: Define types
**Acceptance Criteria:**
- [x] Create `investmentPathTypes.ts` in `simulations/`
- [x] `PathEvent`: id, year, description (Hebrew), emoji, type ('dip' | 'temptation' | 'growth' | 'milestone'), options PathOption[]
- [x] `PathOption`: id, label, effect ('withdraw' | 'continue' | 'add-more'), taxImplication (%), feedback
- [x] `InvestmentPathConfig`: initialDeposit (₪10,000), monthlyDeposit (₪500), annualReturn (0.07), events array
- [x] `InvestmentPathState`: balance, totalDeposited, totalGains, year, hasWithdrawn, withdrawnAmount, taxPaid, isComplete
- [x] Typecheck passes

### US-012: Create path event data
**Acceptance Criteria:**
- [x] Create `investmentPathData.ts` in `simulations/`
- [x] 8 events over 15 years: (1) Year 1: steady growth, (2) Year 3: market drops 15%, (3) Year 4: friend says "withdraw and invest in crypto", (4) Year 6: kupat becomes liquid, (5) Year 8: market drops 20%, (6) Year 10: car breakdown temptation, (7) Year 12: big growth +25%, (8) Year 15: summary/retirement
- [x] Early withdrawal = 25% tax on gains. Post-60 withdrawal = 0% tax
- [x] Typecheck passes

### US-013: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useInvestmentPath.ts` in `simulations/`
- [x] Year-by-year growth with compound interest
- [x] At each event: player chooses to continue, withdraw, or add more
- [x] Withdraw: receive balance minus 25% tax on gains portion
- [x] Continue: balance grows to next event
- [x] Compare: "what if you withdrew" vs "what if you stayed" shown at end
- [x] Typecheck passes

### US-014: Build Investment Path screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `InvestmentPathScreen.tsx` in `simulations/`
- [x] **Path visualization**: winding road/path on screen with waypoints. Character (money bag with legs) walks along it
- [x] **Waypoint events**: each stop shows event card sliding in from side
- [x] **Growth sections**: path glows green, money bag gets bigger
- [x] **Dip sections**: path turns red, money bag shrinks temporarily with worried expression
- [x] **Choice UI**: two doors or path fork — "המשך" (green path) vs "משוך" (red exit ramp)
- [x] **Balance display**: animated counter following the money bag
- [x] **If withdrawn**: "ghost path" shows what would have happened if they stayed (dotted green line continuing up)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-015: Results and integration
**Acceptance Criteria:**
- [x] Side-by-side comparison: "withdrew at year X" vs "held to year 15"
- [x] Tax difference highlighted dramatically
- [x] Key lesson: "קופת גמל = נזילות + צמיחה. אחרי 60 = פטור ממס. סבלנות משתלמת."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-3-17` triggers `InvestmentPathScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 18: שגר ושכח (Set & Forget — Robo-Advisor) — Module 18

Concept: Player fills a risk questionnaire (3 fun questions). Robo-advisor builds a portfolio pie chart based on answers. Then fast-forward 10 years: the portfolio auto-rebalances through 2 market crashes. Manual investor (who panic-sells) shown alongside for comparison. "Set & forget" wins.

### US-016: Define types
**Acceptance Criteria:**
- [x] Create `roboAdvisorTypes.ts` in `simulations/`
- [x] `RiskQuestion`: id, question (Hebrew), emoji, options RiskOption[]
- [x] `RiskOption`: id, label, riskScore (1-5)
- [x] `PortfolioAllocation`: stocks (%), bonds (%), cash (%)
- [x] `MarketYear`: year, stockReturn (%), bondReturn (%), headline
- [x] `RoboAdvisorConfig`: questions array, marketHistory MarketYear[], rebalanceThreshold (5%)
- [x] `RoboAdvisorState`: phase ('quiz' | 'building' | 'simulating' | 'results'), riskProfile (1-5), allocation, roboBalance, manualBalance, currentYear, isPlaying, isComplete
- [x] Typecheck passes

### US-017: Create risk quiz and market data
**Acceptance Criteria:**
- [x] Create `roboAdvisorData.ts` in `simulations/`
- [x] 3 fun risk questions: (1) "השוק ירד 30%. מה אתה עושה?" (2) "מתי תצטרך את הכסף?" (3) "מה יותר כואב — להפסיד ₪1,000 או לפספס רווח של ₪1,000?"
- [x] 10 years of market data (inspired by real 2014-2024): mix of good years (+15%, +20%) and crashes (-30%, -15%) and recoveries
- [x] Risk profile → allocation mapping: Conservative (30/50/20), Balanced (60/30/10), Aggressive (85/10/5)
- [x] "Manual investor" behavior: sells 50% during crashes, buys back 3 months later (always at higher price)
- [x] Typecheck passes

### US-018: Build robo-advisor hook
**Acceptance Criteria:**
- [x] Create `useRoboAdvisor.ts` in `simulations/`
- [x] Quiz → compute risk score (average of answers) → determine allocation
- [x] Simulate 10 years: apply returns per asset class per year
- [x] Robo: auto-rebalance when allocation drifts >5% from target
- [x] Manual: sell stocks during crashes (defined by >15% stock drop), buy back next year
- [x] Track year-by-year balances for both approaches
- [x] Compare final outcomes
- [x] Typecheck passes

### US-019: Build Robo-Advisor screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `RoboAdvisorScreen.tsx` in `simulations/`
- [x] **Phase 1 — Quiz**: fun, swipeable question cards with emoji. Each answer nudges a "risk meter" with spring animation
- [x] **Phase 2 — Portfolio Build**: dramatic animation of robo-arm building a pie chart. Slices fly in and settle with bounce. Allocation percentages appear with counting animation
- [x] **Phase 3 — Simulation**: split screen — left "🤖 רובוט" portfolio, right "😰 משקיע ידני". Both show animated bar charts growing year by year
- [x] Year counter auto-advances. During crashes: manual investor's bar drops sharply (red flash), robo's drops less (rebalance indicator). During recovery: robo catches up faster
- [x] **Rebalance indicator**: small ⚖️ icon appears when robo rebalances — tooltip: "הרובוט מאזן: מוכר מניות, קונה אג״ח"
- [x] **Speed controls**: 1x / 3x / 5x
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-020: Results and integration
**Acceptance Criteria:**
- [x] Final comparison: robo balance vs manual balance, difference in ₪ and %
- [x] "הרובוט הרוויח X% יותר כי הוא לא פחד"
- [x] Number of rebalances shown
- [x] Key lesson: "לא חייבים להיות מומחים. שגר ושכח עם רובוט = פחות טעויות, יותר כסף."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-3-18` triggers `RoboAdvisorScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## Technical Notes
- All files in `src/features/chapter-3-content/simulations/`
- Create `simulations/index.ts` barrel export for all 4 screens
- Module IDs: `mod-3-15` through `mod-3-18`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- `react-native-reanimated` for all animations — 60FPS target
- `expo-haptics` aggressively
- All text Hebrew RTL, numbers with `toLocaleString('he-IL')`
