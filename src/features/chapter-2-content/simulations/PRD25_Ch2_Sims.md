# PRD 25 - Chapter 2 Simulations: ביטחון (Security) 🛡️

## Introduction
5 interactive simulations for Chapter 2 (Security), modules 10-14.
Topics: credit score, tax credits, pension, hishtalmut fund, insurance.

## Design Philosophy — "Million Dollar Simulators"
Every simulator MUST feel like a premium, standalone mini-game:
- **60FPS animations** — all transitions via `react-native-reanimated` shared values
- **Layered gradients** — use `expo-linear-gradient` for depth, never flat solid backgrounds
- **Haptic choreography** — `successHaptic` on correct, `heavyHaptic` on milestones, `tapHaptic` on every interaction
- **Particle effects** — use `ConfettiExplosion` on achievements, custom particle bursts for dramatic moments
- **Sound design ready** — leave hooks for future SFX (e.g. `onScoreChange`, `onMilestone`)
- **Micro-animations** — every number change animates (spring), every card entrance uses `fadeInUp` or `fadeInScale`
- **Premium typography** — use `THEME` colors, gold accents for achievements, neon-violet for highlights
- **Immersive fullscreen** — sims should hide tab bar and economy header for focused gameplay

## Shared Context
- Pattern: `xxxTypes.ts` → `xxxData.ts` → `useXxx.ts` → `XxxScreen.tsx`
- Dir: `src/features/chapter-2-content/simulations/`
- Create `simulations/index.ts` barrel export
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- RTL: `{ writingDirection: 'rtl', textAlign: 'right' }`
- Integration: `LessonFlowScreen.tsx` — module IDs `mod-2-10` through `mod-2-14`
- Ignore pre-existing TS errors in FeedSidebar and useClashStore

---

## SIM 10: בנה את הציון (Build Your Credit Score) — Module 10

Concept: A dramatic credit score gauge (300-1000) dominates the screen. Financial events slam into the player — paying on time, overdraft, guarantor requests, late payments. Each choice ripples through the score with cinematic number animations and color shifts. The gauge should feel alive — pulsing gently, with particle trails when the score moves.

### US-001: Define types for Credit Score game
**Acceptance Criteria:**
- [x] Create `creditScoreTypes.ts` in `simulations/`
- [x] `CreditEvent`: id, description (Hebrew), emoji, options array, severity ('routine' | 'important' | 'critical')
- [x] `CreditOption`: id, label, scoreImpact (number), feedback (Hebrew), isCorrect boolean, explanation (Hebrew — why this affects credit)
- [x] `CreditScoreConfig`: startingScore (650), events array, totalRounds (8)
- [x] `CreditScoreState`: currentScore, round, correctChoices, history array (previous choices+impacts), isComplete
- [x] `CreditScoreScore`: finalScore, grade (S/A/B/C/F), gradeLabel (Hebrew), trend ('improved' | 'stable' | 'declined'), peakScore, lowestScore
- [x] Typecheck passes

### US-002: Create credit event data (8 events)
**Acceptance Criteria:**
- [x] Create `creditScoreData.ts` in `simulations/`
- [x] 8 events with escalating drama: (1) חשבון חשמל שחזר ₪50, (2) חבר מבקש ערבות ל-₪50K הלוואה, (3) תשלום אשראי מלא בזמן, (4) חריגה ממסגרת ב-₪2,000, (5) הלוואה חדשה — הבנק מציע ₪30K, (6) סגירת כרטיס אשראי ותיק, (7) תשלום משכנתא בזמן 12 חודש, (8) איחור של יומיים בתשלום סלולר
- [x] Each has 2-3 options with dramatic score impacts (+30 to -80)
- [x] Rich Hebrew feedback with real-world explanation for each impact
- [x] Typecheck passes

### US-003: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useCreditScore.ts` in `simulations/`
- [x] Score range 300-1000, starts at 650
- [x] Track peak/lowest scores for dramatic stats
- [x] Compute trend (start vs end comparison)
- [x] Grade: S (final ≥850), A (≥750), B (≥650), C (≥500), F (<500)
- [x] `handleChoice(option)` applies impact, records history, advances round
- [x] Typecheck passes

### US-004: Build Credit Score game screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `CreditScoreScreen.tsx` in `simulations/`
- [x] **Hero element**: Large animated semicircle gauge with gradient fill (red-300 → yellow-500 → green-700 → gold-1000). Score number in center with spring animation on every change
- [x] Gauge needle rotates smoothly with `withSpring`. Entire gauge has subtle pulse animation
- [x] **Event card**: slides in from bottom with `fadeInUp`. Shows severity badge (routine=blue, important=yellow, critical=red pulsing)
- [x] **Option buttons**: glass-morphism style cards. Correct → green ripple + score flies up with "+X" particle. Wrong → red shake + score drops with "-X" falling particle
- [x] **After choice**: 2-second explanation overlay with the "why" behind the credit impact
- [x] **Score milestone**: crossing 750 or 800 triggers gold particle burst + haptic
- [x] History rail at bottom showing previous choices as small colored dots
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Build score screen and integration
**Acceptance Criteria:**
- [x] Cinematic score reveal: gauge fills from 0 to final score with dramatic timing
- [x] Stats: peak score, lowest score, trend arrow, choices breakdown
- [x] Grade letter drops in with bounce animation
- [x] Key lesson card: "כל מהלך פיננסי נרשם. תשלום בזמן = ציון שעולה. ערבות = ציון שלך בסיכון"
- [x] Reward: +30 XP + 20 Coins via `useEconomyStore`
- [x] Replay and Continue buttons
- [x] Update `LessonFlowScreen.tsx`: module `mod-2-10` triggers `CreditScoreScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 11: פאזל התלוש (Tax Credit Puzzle) — Module 11

Concept: A character profile card at top (soldier, student, peripheral resident). Below, a payslip showing ברוטו → מס → נטו. At the bottom, a scrollable tray of golden "tax credit coins". Player taps credits to apply — eligible ones slot in and the tax number shrinks with satisfying animation. Ineligible ones bounce off with shake. The net salary climbs up in real time, creating an addictive "number go up" feeling.

### US-006: Define types for Tax Credit Puzzle
**Acceptance Criteria:**
- [x] Create `taxPuzzleTypes.ts` in `simulations/`
- [x] `TaxCredit`: id, name (Hebrew), pointsValue, eligibleFor string[], emoji, description (Hebrew)
- [x] `CharacterProfile`: name, age, emoji, attributes string[], grossSalary, description (Hebrew — e.g. "נטע, 24, חיילת משוחררת מנתיבות שסיימה תואר ראשון")
- [x] `TaxPuzzleConfig`: characters array (3 profiles), allCredits array, pointValue (₪242)
- [x] `TaxPuzzleState`: currentCharacterIndex, appliedCredits id[], rejectedAttempts, grossSalary, taxBefore, taxAfter, netBefore, netAfter, isComplete
- [x] `TaxPuzzleScore`: grade, moneySavedMonthly, moneySavedYearly, correctCredits, wrongAttempts, perfectMatch boolean
- [x] Typecheck passes

### US-007: Create tax credit and character data
**Acceptance Criteria:**
- [x] Create `taxPuzzleData.ts` in `simulations/`
- [x] 10 tax credits: תושב ישראל (2.25pts auto), חייל/ת משוחרר/ת (2pts/36mo), תואר ראשון (1pt/12mo), יישוב מוטב (varies), ילד מתחת 18 (2.5pts), נכות (2pts), עולה חדש (varies), חד הורי (1pt), נסיעה באוטובוס (0.25pt), תרומות מוכרות (varies)
- [x] 3 characters with story: "נטע" (24, soldier+degree+peripheral), "אורי" (30, single parent+disability), "דנה" (26, new immigrant+degree)
- [x] Each character has different grossSalary (₪8K, ₪12K, ₪15K)
- [x] Simplified tax brackets for calculation
- [x] Typecheck passes

### US-008: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useTaxPuzzle.ts` in `simulations/`
- [x] Calculate base tax from gross (simplified progressive brackets)
- [x] Each applied credit: tax -= pointsValue × ₪242. Net += same.
- [x] Validate: credit's `eligibleFor` includes at least one of character's `attributes`
- [x] Track wrong attempts (applying wrong credit = bounce)
- [x] Support cycling through 3 characters (each is a "level")
- [x] Grade: S (perfect on all 3, zero wrong), A (≥90%), B (≥70%), C (≥50%), F (<50%)
- [x] Typecheck passes

### US-009: Build Tax Credit Puzzle screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `TaxPuzzleScreen.tsx` in `simulations/`
- [x] **Character card** at top: photo placeholder (emoji), name, age, story line, attribute badges (pill-shaped)
- [x] **Payslip display** in center: three animated numbers — ברוטו (static), מס הכנסה (shrinks with spring animation), נטו (grows with golden glow). Numbers have counting animation
- [x] **Credit tray** at bottom: horizontal ScrollView of golden coin-styled cards. Each shows emoji + name + point value
- [x] **Apply animation**: tap credit → coin flies up into payslip → tax number shrinks → net number grows → golden particles
- [x] **Reject animation**: tap wrong credit → coin shakes violently → red flash → bounces back to tray
- [x] **"Money saved" counter**: running total saved prominently displayed with gold text
- [x] **Level transition**: after finishing character 1, dramatic slide to character 2 with new profile
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: Build score screen and integration
**Acceptance Criteria:**
- [x] Score reveal: "Total saved this year: ₪XX,XXX" with dramatic counter animation
- [x] Per-character breakdown showing credits applied
- [x] Key lesson: "בדקו נקודות זיכוי כל שנה — אלפי שקלים מחכים לכם"
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-2-11` triggers `TaxPuzzleScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 12: מרוץ הפרישה (Retirement Race) — Module 12

Concept: Split-screen race between "נטע" (starts at 22, ₪500/mo) and "אורי" (starts at 35, ₪1,000/mo). A cinematic fast-forward button plays years like a movie — the bars grow, year counter spins, and at the crossover moment (where Neta overtakes Ori despite depositing less), everything explodes in gold particles. Visceral demonstration that time beats money.

### US-011: Define types
**Acceptance Criteria:**
- [x] Create `retirementRaceTypes.ts` in `simulations/`
- [x] `Runner`: name, emoji, startAge, monthlyDeposit, employerMatch, currentBalance, color, yearData number[]
- [x] `RetirementRaceConfig`: retirementAge (67), annualReturn (0.06), runners Runner[]
- [x] `RetirementRaceState`: currentYear, runners (with updated balances), isPlaying, playSpeed, isComplete, overtakeYear
- [x] Typecheck passes

### US-012: Create runner data
**Acceptance Criteria:**
- [x] Create `retirementRaceData.ts` in `simulations/`
- [x] נטע: age 22, ₪500/mo employee, ₪600/mo employer (6%+6.5% on ₪10K)
- [x] אורי: age 35, ₪1,000/mo employee, ₪1,200/mo employer (on ₪20K)
- [x] Annual return 6% real
- [x] Typecheck passes

### US-013: Build race simulation hook
**Acceptance Criteria:**
- [x] Create `useRetirementRace.ts` in `simulations/`
- [x] Pre-compute year-by-year balances for both runners (age → 67)
- [x] `play()` — auto-advances years at configurable speed (200ms default, 100ms fast)
- [x] `pause()`, `reset()`, `setYear(n)`, `setSpeed(ms)` controls
- [x] Detect `overtakeYear` — the year Neta's balance exceeds Ori's
- [x] Typecheck passes

### US-014: Build Retirement Race screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `RetirementRaceScreen.tsx` in `simulations/`
- [x] **Split layout**: two vertical bars (or animated characters on parallel tracks) growing upward
- [x] נטע in emerald-green, אורי in sapphire-blue
- [x] **Year counter**: large center display spinning through years
- [x] **Balance counters**: animated numbers below each bar with spring counting
- [x] **Cinematic "Play" button**: large, glowing, pulsing. Pressing starts the race with dramatic buildup
- [x] **Overtake moment**: when נטע passes אורי — freeze frame, golden explosion, "💥 הזמן ניצח!" text with heavyHaptic, then resume
- [x] **Speed controls**: 1x / 2x / 5x buttons
- [x] **Interactive slider**: after race completes, user can scrub through years manually
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-015: Results and integration
**Acceptance Criteria:**
- [x] Results: final balances side by side, difference highlighted (often ₪500K+ gap)
- [x] "נטע הפקידה ₪XXK סה״כ. אורי הפקיד ₪XXK. אבל לנטע יש פי X יותר!"
- [x] Key lesson: "המעסיק מכפיל. הזמן משגע. תתחילו היום."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-2-12` triggers `RetirementRaceScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 13: המגרסה (The Tax Grinder) — Module 13

Concept: Two side-by-side investment piles grow over time. A menacing "tax grinder" machine periodically descends on the regular investment pile and shreds 25% of gains with dramatic animation. The hishtalmut pile is protected by a glowing blue shield — the grinder bounces off. The visual gap between the two piles tells the whole story.

### US-016: Define types
**Acceptance Criteria:**
- [x] Create `taxGrinderTypes.ts` in `simulations/`
- [x] `InvestmentTrack`: type ('regular' | 'hishtalmut'), deposits number[], employerBonus, gains number[], taxPaid number[], netBalance, color
- [x] `TaxGrinderConfig`: years (slider 6-20), annualReturn (0.07), regularTaxRate (0.25), tracks Track[]
- [x] `TaxGrinderState`: currentYear, tracks (with computed balances), difference, isPlaying, isComplete
- [x] Typecheck passes

### US-017: Create track data
**Acceptance Criteria:**
- [x] Create `taxGrinderData.ts` in `simulations/`
- [x] Regular: ₪200/mo, no employer match, 25% tax on gains at withdrawal
- [x] Hishtalmut: ₪200/mo employee + ₪600/mo employer, 0% tax after 6yr
- [x] 7% annual return both tracks
- [x] Typecheck passes

### US-018: Build simulation hook
**Acceptance Criteria:**
- [x] Create `useTaxGrinder.ts` in `simulations/`
- [x] Year slider (6-20) controls simulation length
- [x] Compute year-by-year with compound growth
- [x] On withdrawal: regular loses 25% of gains, hishtalmut keeps all
- [x] Calculate net difference and tax saved
- [x] Auto-play mode for cinematic effect
- [x] Typecheck passes

### US-019: Build Tax Grinder screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `TaxGrinderScreen.tsx` in `simulations/`
- [x] **Two golden coin stacks** growing side by side with 3D shadow effect
- [x] **Left (regular)**: periodically, animated "grinder" descends and removes coins (red particles)
- [x] **Right (hishtalmut)**: blue shield dome glows when grinder approaches, grinder bounces off (blue particles)
- [x] **Year slider** with neon track and golden thumb
- [x] **Comparison panel** below: animated numbers for both tracks, difference highlighted in gold
- [x] **"Tax saved" counter**: runs up dramatically as years increase, with golden glow intensity
- [x] When difference exceeds ₪100K: fireworks animation
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-020: Results and integration
**Acceptance Criteria:**
- [x] Total saved from tax exemption prominently displayed
- [x] employer contribution highlighted: "₪600/mo × 12 × years = free money you almost missed"
- [x] Key lesson: "קרן השתלמות = מכונת צמיחה פטורה ממס. לעולם אל תגידו לא."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-2-13` triggers `TaxGrinderScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## SIM 14: מגן הביטוח (Insurance Shield) — Module 14

Concept: Two-phase game. Phase 1: "Insurance Shop" — buy shields within budget. Phase 2: "Obstacle Course" — life events slam into you. Right insurance = shield blocks with satisfying clang. Wrong/missing = devastating hit to your savings. Duplicate insurance = wasted money weighing you down.

### US-021: Define types
**Acceptance Criteria:**
- [x] Create `insuranceShieldTypes.ts` in `simulations/`
- [x] `InsuranceType`: id, name (Hebrew), emoji, monthlyCost, annualCost, covers string[], description
- [x] `LifeEvent`: id, description (Hebrew), emoji, damage (₪), requiredInsurance string[], severity ('minor' | 'major' | 'catastrophic')
- [x] `InsuranceShieldConfig`: availableInsurances, events, monthlyBudget (₪800)
- [x] `InsuranceShieldState`: phase ('shopping' | 'events' | 'results'), activeInsurances, totalPremiums, totalBlocked, totalDamage, duplicatesWasted, round, savingsHealth, isComplete
- [x] `InsuranceShieldScore`: grade, netSavings, duplicatesFound, eventsFullyBlocked, eventsMissed
- [x] Typecheck passes

### US-022: Create insurance and event data
**Acceptance Criteria:**
- [x] Create `insuranceShieldData.ts` in `simulations/`
- [x] 8 insurances with realistic Israeli prices: חובה (₪200), מקיף (₪350), צד ג' (₪80), דירה-מבנה (₪100), בריאות משלים (₪150), ניתוחים פרטי (₪120), נסיעות לחו"ל (₪50), ביטוח חיים (₪200)
- [x] 2 overlapping coverages (duplicate trap): ניתוחים already partly covered by בריאות משלים
- [x] 6 life events with escalating drama: פנצ'ר+תאונה קטנה (₪5K), פריצה לדירה (₪30K), ניתוח ברך (₪80K), טיסה+אשפוז בחו"ל (₪200K), תאונה חמורה+צד ג' (₪500K), פטירה - ביטוח למשפחה (₪1M)
- [x] Budget: ₪800/mo maximum
- [x] Typecheck passes

### US-023: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useInsuranceShield.ts` in `simulations/`
- [x] Phase 1: toggle insurances on/off, track budget remaining, detect duplicates
- [x] Phase 2: events fire one by one. Check if player's insurances cover each event's `requiredInsurance`
- [x] Covered = premium cost only. Not covered = full damage to savings
- [x] Track: premiums, blocked damage, received damage, duplicates
- [x] Start savings at ₪200,000 (life savings). Events can destroy them
- [x] Grade: S (survived all, no duplicates, budget efficient), A-F composite
- [x] Typecheck passes

### US-024: Build Insurance Shield screen — PREMIUM UX
**Acceptance Criteria:**
- [x] Create `InsuranceShieldScreen.tsx` in `simulations/`
- [x] **Phase 1 — Shopping**: grid of insurance cards with glow-toggle. Each shows emoji, name, monthly cost. Budget bar at top (green→yellow→red). Duplicate warning badge pulses orange when detected
- [x] **Transition**: dramatic "shield up" animation when moving to Phase 2
- [x] **Phase 2 — Events**: life event card slams in from top. If insured: shield dome appears with clang sound placeholder + blue particle burst + "מוגן! ✓". If not insured: red explosion + savings counter drops dramatically + screen shake
- [x] **Savings health bar**: depletes with uninsured events, stays stable with insured ones
- [x] **Catastrophic events**: extra dramatic (screen darkens, slow-mo effect, large damage number)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-025: Results and integration
**Acceptance Criteria:**
- [x] Score: premiums paid (annual), damage blocked (₪), damage received (₪), duplicates (₪ wasted)
- [x] Net outcome: "שילמת ₪X ביטוח, חסכת ₪Y. בלי ביטוח, היית מפסיד ₪Z"
- [x] Key lesson: "ביטוח נכון = מגן. כפל ביטוח = בזבוז. תבדקו בהר הביטוח."
- [x] Reward: +30 XP + 20 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-2-14` triggers `InsuranceShieldScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## Technical Notes
- All files in `src/features/chapter-2-content/simulations/`
- Create `simulations/index.ts` barrel export for all 5 screens
- Module IDs: `mod-2-10` through `mod-2-14`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- `react-native-reanimated` for all animations — target 60FPS
- `expo-haptics` aggressively for every interaction
- All text Hebrew RTL, all numbers with `toLocaleString('he-IL')`
