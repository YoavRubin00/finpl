# PRD 28 - Chapter 5 Simulations: עצמאות (Independence) 🏔️

## Introduction
5 interactive simulations for Chapter 5 (Independence), modules 25-29.
Topics: FIRE movement, mortgage & real estate, REITs, retirement planning, wills & estates.

## Design Philosophy — "Million Dollar Simulators"
Every simulator MUST feel like a premium, standalone mini-game:
- **60FPS animations** via `react-native-reanimated` shared values
- **Layered gradients** via `expo-linear-gradient` for depth
- **Haptic choreography** — `successHaptic`, `heavyHaptic` on milestones, `tapHaptic` everywhere
- **Particle effects** — `ConfettiExplosion` on achievements
- **Micro-animations** — every number animates (spring), every card uses `fadeInUp`/`fadeInScale`
- **Immersive fullscreen** — sims should hide tab bar and economy header during gameplay
- **"Future you" visualization** — this chapter is about independence, every sim should show the player a vision of their financial future

## Shared Context
- Pattern: `xxxTypes.ts` → `xxxData.ts` → `useXxx.ts` → `XxxScreen.tsx`
- Dir: `src/features/chapter-5-content/simulations/`
- Create `simulations/index.ts` barrel export
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- RTL: `{ writingDirection: 'rtl', textAlign: 'right' }`
- Integration: `LessonFlowScreen.tsx` — module IDs `mod-5-25` through `mod-5-29`
- Ignore pre-existing TS errors in FeedSidebar and useClashStore

---

## SIM 25: מחשבון החופש (Freedom Calculator — FIRE) — Module 25

Concept: A single powerful slider: "savings rate" (10% → 70%). As the player slides, a dramatic counter shows "years to financial independence" decreasing. At high savings rates (>50%), a golden "FIRE" badge appears with fireworks. Includes a lifestyle preview: what life looks like at each savings rate (small apartment vs villa, bus vs car). Makes FIRE tangible.

### US-001: Define types for FIRE Calculator
**Acceptance Criteria:**
- [x] Create `fireCalcTypes.ts` in `simulations/`
- [x] `FIREConfig`: monthlyIncome, annualReturn (0.07), withdrawalRate (0.04 — the 4% rule), lifestylePresets LifestylePreset[]
- [x] `LifestylePreset`: savingsRate, label (Hebrew), emoji, description, yearlyExpenses, luxuryLevel (1-5)
- [x] `FIRECalcState`: savingsRate (10-70%), yearsToFIRE, targetPortfolio, monthlyInvestment, currentAge, fireAge, lifestylePreview, isComplete
- [x] `FIRECalcScore`: yearsToFIRE, fireAge, totalInvested, portfolioAtFIRE
- [x] Typecheck passes

### US-002: Create FIRE presets and lifestyle data
**Acceptance Criteria:**
- [x] Create `fireCalcData.ts` in `simulations/`
- [x] monthlyIncome: ₪15,000 (adjustable), currentAge: 25 (adjustable)
- [x] 5 lifestyle presets: 10% ("חיים להיום" — 45yr to FIRE), 20% ("מאוזן" — 35yr), 30% ("חסכן חכם" — 25yr), 50% ("FIRE warrior" — 15yr), 70% ("מינימליסט קיצוני" — 8yr)
- [x] Each preset has description of what life looks like (apartment type, transportation, vacations)
- [x] Typecheck passes

### US-003: Build FIRE simulation hook
**Acceptance Criteria:**
- [x] Create `useFireCalc.ts` in `simulations/`
- [x] Calculate years to FIRE: based on savings rate × income, invested at 7%, target = annual expenses / 0.04
- [x] Calculate target portfolio (25× annual expenses = the 4% rule)
- [x] Support adjustable income and starting age
- [x] Provide year-by-year growth projection
- [x] Typecheck passes

### US-004: Build Freedom Calculator screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `FIRECalcScreen.tsx` in `simulations/`
- [x] **Hero number**: "🔥 FIRE בעוד X שנים" — X is a giant animated number that changes dramatically with slider
- [x] **Savings rate slider**: huge, centered, with gradient track (blue-cold on left → gold-fire on right)
- [x] **Timeline visualization**: horizontal timeline strip showing current age → FIRE age → 120. The "work" section shrinks as slider moves right
- [x] **Lifestyle preview card**: changes content based on savings rate — shows emoji, description, luxury level stars
- [x] **Portfolio counter**: "Target: ₪X,XXX,XXX" with dramatic counting animation
- [x] **FIRE achievement**: at savings rate ≥50%, fire emoji particles + golden glow + heavyHaptic + "FIRE Warrior" badge
- [x] **Income & age inputs**: small steppers to customize personal numbers
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Results and integration
**Acceptance Criteria:**
- [x] Summary: "At XX% savings rate, you'll be free by age YY with ₪Z portfolio"
- [x] Comparison table: different savings rates side by side
- [x] Key lesson: "כל 10% שיעור חיסכון = 5 שנים פחות עבדות. המתמטיקה פשוטה."
- [x] Reward: +35 XP + 25 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-5-25` triggers `FIRECalcScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 26: משחקי הנדל"ן (Real Estate Game) — Module 26

Concept: Player buys an apartment. Chooses mortgage mix (fixed vs variable rate, 15yr vs 30yr). Life events hit over 20 years: interest rate hikes, renovations, tenants leaving, property tax changes. Each choice affects monthly payment and total cost. Shows how a ₪1M apartment can cost ₪2M after mortgage interest.

### US-006: Define types
**Acceptance Criteria:**
- [x] Create `realEstateTypes.ts` in `simulations/`
- [x] `MortgageMix`: fixedPercent, variablePercent, fixedRate, variableRate, years
- [x] `MortgageOption`: id, label (Hebrew), description, fixedPercent, variablePercent, years, monthlyPayment
- [x] `RealEstateEvent`: id, year, description (Hebrew), emoji, effect ('rate-hike' | 'expense' | 'income-change' | 'property-value'), impact number
- [x] `RealEstateConfig`: propertyPrice (₪1,500,000), downPayment (₪300,000), mortgageOptions, events, rentalIncome?
- [x] `RealEstateState`: selectedMortgage, currentYear, monthlyPayment, totalPaid, remainingLoan, propertyValue, events history, isComplete
- [x] `RealEstateScore`: grade, totalPaid, totalInterest, propertyFinalValue, netGainOrLoss
- [x] Typecheck passes

### US-007: Create mortgage options and event data
**Acceptance Criteria:**
- [x] Create `realEstateData.ts` in `simulations/`
- [x] Property: ₪1,500,000, down payment ₪300,000
- [x] 3 mortgage options: (1) 100% fixed 4.5% / 25yr (safe but expensive), (2) 50/50 mix fixed 4%+variable 3.5% / 25yr (balanced), (3) 100% variable 3% / 30yr (risky)
- [x] 6 events: Year 3 — interest rate hike +1.5%, Year 5 — renovation needed ₪80K, Year 8 — property value +20%, Year 12 — rate drops -1%, Year 15 — special tax assessment ₪30K, Year 20 — summary
- [x] Typecheck passes

### US-008: Build mortgage simulation hook
**Acceptance Criteria:**
- [x] Create `useRealEstate.ts` in `simulations/`
- [x] Calculate monthly payment per mortgage option (PMT formula)
- [x] Apply events: rate changes → recalculate variable portion payment
- [x] Track cumulative: total paid, total interest, remaining loan, property value
- [x] Year-by-year progression with auto-play
- [x] Typecheck passes

### US-009: Build Real Estate Game screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `RealEstateScreen.tsx` in `simulations/`
- [x] **Phase 1**: Choose mortgage — 3 beautifully designed mortgage cards with monthly payment preview, total cost preview, risk indicator
- [x] **Phase 2**: Living through events — apartment visual (emoji building) with year counter
- [x] Events appear as "newspaper headline" cards with dramatic entrance
- [x] Rate hike: monthly payment counter jumps up (red flash). Rate drop: counter drops (green glow)
- [x] **Running totals**: monthly payment, total paid so far, remaining loan, property value — all animated
- [x] **"Total interest" counter**: dramatically grows, showing how much is pure interest vs principal
- [x] **Final comparison**: "Your ₪1.2M mortgage will cost ₪X total — that's ₪Y in interest alone"
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: Results and integration
**Acceptance Criteria:**
- [x] Dramatic reveal: total cost breakdown pie chart (principal vs interest vs events)
- [x] Key lesson: "דירה ב-1.5M + משכנתא = 2.5M+. חלק קבוע = שינה שקטה. חלק משתנה = הימור."
- [x] Reward: +35 XP + 25 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-5-26` triggers `RealEstateScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 27: בעל הבית הווירטואלי (Virtual Landlord — REITs) — Module 27

Concept: Instead of buying physical property, player builds a REIT portfolio. Pick sectors (office, residential, commercial, healthcare). World events affect each sector differently. Shows how REITs provide real estate exposure without the hassle of being a landlord. Dividends roll in quarterly.

### US-011: Define types
**Acceptance Criteria:**
- [x] Create `reitTypes.ts` in `simulations/`
- [x] `REITSector`: id, name (Hebrew+English), emoji, annualReturn, dividendYield, volatility, description
- [x] `REITEvent`: id, description (Hebrew), emoji, impacts Record<sectorId, number>
- [x] `REITConfig`: budget (₪100,000), sectors REITSector[], events REITEvent[], years (10)
- [x] `REITState`: allocations Record<sectorId, number>, totalValue, totalDividends, currentYear, eventHistory, isComplete
- [x] Typecheck passes

### US-012: Create REIT sector and event data
**Acceptance Criteria:**
- [x] Create `reitData.ts` in `simulations/`
- [x] 5 sectors: משרדים (5% yield, moderate risk), מגורים (3.5% yield, low risk), מסחרי-קניונים (6% yield, high risk), בריאות (4% yield, low risk), לוגיסטיקה-מחסנים (4.5% yield, moderate risk)
- [x] 5 events: מעבר לעבודה מרחוק (offices -15%, logistics +12%), מגפה (commercial -25%, healthcare +15%, residential +5%), בום טכנולוגי (offices +10%, logistics +20%), עליית ריבית (all -10%, residential -5%), התאוששות (all +15%)
- [x] Budget: ₪100,000
- [x] Typecheck passes

### US-013: Build REIT simulation hook
**Acceptance Criteria:**
- [x] Create `useREIT.ts` in `simulations/`
- [x] Allocate budget across sectors (sliders summing to 100%)
- [x] Simulate year-by-year: apply sector returns + dividends
- [x] Events modify specific sector returns
- [x] Track quarterly dividends (shown as passive income stream)
- [x] Compare with "buying a physical apartment" (₪100K as down payment)
- [x] Typecheck passes

### US-014: Build Virtual Landlord screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `REITScreen.tsx` in `simulations/`
- [x] **Phase 1**: Sector selection — building-themed cards (🏢🏠🏬🏥📦). Allocation sliders. Pie chart visualization
- [x] **Phase 2**: Simulation — miniature cityscape with buildings representing sectors. Buildings grow/shrink based on performance
- [x] **Dividend stream**: golden coins periodically rain down (quarterly) with counter accumulating
- [x] Events: news banner across screen, affected buildings flash red/green
- [x] **Passive income counter**: "הכנסה פסיבית חודשית: ₪X" — grows over time as dividends compound
- [x] **vs Physical comparison**: sidebar showing "Physical apartment: maintenance, tenants, hassle" vs "REIT: click sit collect"
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-015: Results and integration
**Acceptance Criteria:**
- [x] Total portfolio value + total dividends received
- [x] "Your REIT portfolio generated ₪X passive income (₪Y/month average)"
- [x] Key lesson: "REIT = נדל״ן בלי כאב ראש. פיזור, נזילות, ודיבידנדים."
- [x] Reward: +35 XP + 25 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-5-27` triggers `REITScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 28: מחשבון הפרישה (Retirement Calculator) — Module 28

Concept: The player is 67, retired. They have ₪2M in pension. Big choice: take it all as lump sum (קצבה הונית) or monthly payments (קצבה חודשית). Sim fast-forwards 25 years (to age 92) showing how lump sum runs out if mismanaged vs how monthly payments last forever. Tax implications shown for each option.

### US-016: Define types
**Acceptance Criteria:**
- [x] Create `retirementCalcTypes.ts` in `simulations/`
- [x] `WithdrawalStrategy`: type ('lump-sum' | 'monthly-annuity' | 'hybrid'), monthlyAmount?, lumpSum?
- [x] `RetirementYear`: year, age, balance, withdrawal, expenses, taxPaid, netRemaining
- [x] `RetirementCalcConfig`: pensionBalance (₪2,000,000), monthlyExpenses (₪12,000), annuityRate, lumpSumReturn, inflationRate, strategies WithdrawalStrategy[]
- [x] `RetirementCalcState`: selectedStrategy, yearlyProjection RetirementYear[], currentYear, isPlaying, bankruptAge?, isComplete
- [x] Typecheck passes

### US-017: Create retirement data
**Acceptance Criteria:**
- [x] Create `retirementCalcData.ts` in `simulations/`
- [x] Pension: ₪2,000,000 at age 67
- [x] Monthly expenses: ₪12,000 (increasing 3% yearly for inflation)
- [x] 3 strategies: (1) Full lump sum — invest at 5%, withdraw as needed, (2) Full annuity — ₪8,500/mo guaranteed for life, (3) Hybrid — 30% lump (₪600K) + reduced annuity ₪6,000/mo
- [x] Show 25 years (67→92)
- [x] Tax: lump sum → potential 25% tax on gains. Annuity → lower tax bracket
- [x] Typecheck passes

### US-018: Build retirement hook
**Acceptance Criteria:**
- [x] Create `useRetirementCalc.ts` in `simulations/`
- [x] Simulate each strategy over 25 years
- [x] Lump sum: balance depletes over time (invested at 5%, withdrawn ₪12K/mo adjusted for inflation)
- [x] Annuity: guaranteed ₪8,500/mo forever (no depletion risk, but no inheritance)
- [x] Hybrid: combination
- [x] Track: when lump sum runs out (bankruptcy age), total received, tax paid
- [x] Auto-play year-by-year
- [x] Typecheck passes

### US-019: Build Retirement Calculator screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `RetirementCalcScreen.tsx` in `simulations/`
- [x] **Phase 1**: Choose strategy — 3 cards showing strategy name, monthly income, risk level, inheritance possibility
- [x] **Phase 2**: Running simulation — age counter (67→92), balance counter, monthly income display
- [x] **Lump sum path**: balance bar slowly depleting. When it hits zero: alarm, red flash, "💸 נגמר הכסף!" at age X
- [x] **Annuity path**: steady green glow, same amount every month, "guaranteed" badge
- [x] **Hybrid**: combination visualization
- [x] **Side-by-side comparison**: two bars showing remaining balance over time for all strategies
- [x] **Inflation impact**: show how ₪12,000 today = ₪20,000 in purchasing power needed at 85
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-020: Results and integration
**Acceptance Criteria:**
- [x] Comparison table: total received, tax paid, risk of depletion, inheritance potential
- [x] Highlight bankruptcy age for lump sum (if applicable)
- [x] Key lesson: "קצבה = שקט נפשי. הון = גמישות + סיכון. תשלבו בחכמה."
- [x] Reward: +35 XP + 25 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-5-28` triggers `RetirementCalcScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 29: עץ המשפחה (Family Tree — Estate Planning) — Module 29

Concept: Player sets up their family tree (spouse, kids, parents). Then two scenarios play: (1) WITHOUT a will — show who gets what by Israeli inheritance law (messy, slow, frozen bank accounts, family conflicts). (2) WITH a will — clean, fast, exactly as intended. Side-by-side comparison makes the lesson visceral.

### US-021: Define types
**Acceptance Criteria:**
- [x] Create `estateTypes.ts` in `simulations/`
- [x] `FamilyMember`: id, name, relation ('spouse' | 'child' | 'parent' | 'sibling'), age, emoji
- [x] `Asset`: id, name (Hebrew), value, type ('property' | 'savings' | 'investments' | 'insurance')
- [x] `WillDecision`: beneficiary FamilyMember id, asset Asset id, percentage
- [x] `EstateConfig`: familyMembers, assets, legalFees, probateTime
- [x] `EstateState`: phase ('setup' | 'no-will-scenario' | 'with-will-scenario' | 'comparison'), familyMembers, assets, willDecisions, noWillOutcome, withWillOutcome, isComplete
- [x] `EstateOutcome`: distribution Record<memberId, number>, legalFees, timeToResolve, familyConflict (0-100), frozenMonths
- [x] Typecheck passes

### US-022: Create family and asset data
**Acceptance Criteria:**
- [x] Create `estateData.ts` in `simulations/`
- [x] Default family: spouse (45), child1 (20), child2 (16), parent (72)
- [x] Assets: דירה (₪2,000,000), חיסכון (₪500,000), תיק השקעות (₪300,000), ביטוח חיים (₪400,000)
- [x] Total estate: ₪3,200,000
- [x] Without will: Israeli law splits 50% to spouse + 50% to children equally. Property frozen during probate (8-18 months). Legal fees ₪30K-80K
- [x] With will: custom split, faster process (2-4 months), lower fees
- [x] Typecheck passes

### US-023: Build estate planning hook
**Acceptance Criteria:**
- [x] Create `useEstatePlanning.ts` in `simulations/`
- [x] Phase 1: player sets up family (toggle members on/off)
- [x] Phase 2: show no-will scenario — automatic distribution by Israeli law
- [x] Phase 3: player creates will (drag assets to family members, set percentages)
- [x] Phase 4: show with-will scenario — compare outcomes
- [x] Calculate: legal fees, time to resolve, conflict score, freeze period
- [x] Typecheck passes

### US-024: Build Estate Planning screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `EstatePlanningScreen.tsx` in `simulations/`
- [x] **Phase 1 — Family Setup**: visual family tree with emoji nodes. Tap to add/remove members
- [x] **Phase 2 — No Will**: dramatic "❌ אין צוואה" banner. Assets shown as cards. Animated distribution: assets split by law with red confusion lines. "FROZEN" stamp on property. Clock counting months. Family members with angry emojis. Legal fee counter climbing
- [x] **Phase 3 — Create Will**: drag-and-drop assets to family members. Percentage sliders per asset. Clean green lines showing intended distribution
- [x] **Phase 4 — With Will**: "✅ יש צוואה" banner. Same assets distributed cleanly, quickly, peacefully. Family members with happy emojis. Lower fees, faster resolution
- [x] **Side-by-side comparison card**: fees, time, conflict, exact distributions
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-025: Results and integration
**Acceptance Criteria:**
- [x] Comparison: without will (₪X fees, Y months frozen, Z conflict) vs with will (₪A fees, B months, no conflict)
- [x] Key lesson: "צוואה = מתנה אחרונה למשפחה. בלעדיה — המדינה מחליטה בשבילך."
- [x] Also mention: ייפוי כוח מתמשך (lasting power of attorney) as bonus tip
- [x] Reward: +35 XP + 25 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-5-29` triggers `EstatePlanningScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## Technical Notes
- All files in `src/features/chapter-5-content/simulations/`
- Create `simulations/index.ts` barrel export for all 5 screens
- Module IDs: `mod-5-25` through `mod-5-29`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- `react-native-reanimated` for all animations — 60FPS target
- `expo-haptics` aggressively
- Do NOT use `react-native-gesture-handler` unless confirmed available — use `Pressable` and basic touch handling instead
- All text Hebrew RTL, numbers with `toLocaleString('he-IL')`
