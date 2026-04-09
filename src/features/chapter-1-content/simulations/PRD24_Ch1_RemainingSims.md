# PRD 24 - Chapter 1 Remaining Simulations (Modules 5-9) 🏕️

## Introduction
This PRD covers the 5 remaining interactive simulations for Chapter 1 (Survival).
Existing sims (mods 1-4) are already built: BudgetGame, MinusTrap, Snowball, CompoundSim.
Each simulation follows the established pattern: types → data → hook → screen → integration.

## Shared Context
- Follow exact patterns from existing sims: `budgetTypes.ts` → `budgetData.ts` → `useBudgetGame.ts` → `BudgetGameScreen.tsx`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- Hebrew RTL: `{ writingDirection: 'rtl', textAlign: 'right' }`
- Integration point: `LessonFlowScreen.tsx` — each module triggers its sim screen
- Pre-existing TS errors in FeedSidebar and useClashStore — ignore them

---

## SIM 5: נינג'ה תלוש (Payslip Ninja) — Module 5

Concept: Items fly up from the bottom of the screen (payslip line items). The user swipes/taps them to classify: Taxes → Red Bin (מיסים), Pension → Green Savings Bin (חיסכון), Net Salary → Blue Pocket (נטו). Score based on speed and accuracy.

### US-001: Define types for Payslip Ninja game
**Acceptance Criteria:**
- [x] Create `payslipNinjaTypes.ts` in `simulations/`
- [x] Define `PayslipItem` interface: id, label (Hebrew), emoji, category ('tax' | 'pension' | 'net'), amount (₪)
- [x] Define `PayslipNinjaConfig`: items array, timePerRound (ms), totalRounds
- [x] Define `PayslipNinjaState`: score, streak, currentRound, correctCount, wrongCount, isComplete
- [x] Define `PayslipNinjaScore`: accuracy (0-100), grade (S/A/B/C/F), gradeLabel (Hebrew)
- [x] Typecheck passes

### US-002: Create payslip item data
**Acceptance Criteria:**
- [x] Create `payslipNinjaData.ts` in `simulations/`
- [x] 15+ payslip items covering: מס הכנסה, ביטוח לאומי, מס בריאות, הפרשה לפנסיה, קרן השתלמות, שכר בסיס, דמי נסיעות, דמי הבראה, שעות נוספות, בונוס, ניכוי מקדמות, etc.
- [x] Each item properly categorized (tax/pension/net)
- [x] Typecheck passes

### US-003: Build game logic hook
**Acceptance Criteria:**
- [x] Create `usePayslipNinja.ts` in `simulations/`
- [x] Items appear one at a time with a timer (3 seconds default)
- [x] Player taps one of 3 bins to classify
- [x] Correct = +10 points + streak bonus. Wrong = streak reset, -5 points
- [x] After all items, compute accuracy and grade: S (≥95), A (≥80), B (≥65), C (≥50), F (<50)
- [x] Typecheck passes

### US-004: Build Payslip Ninja game screen
**Acceptance Criteria:**
- [x] Create `PayslipNinjaScreen.tsx` in `simulations/`
- [x] Item card appears center-screen with emoji, label, and amount
- [x] 3 colored bins at bottom: Red (מיסים), Green (חיסכון), Blue (נטו)
- [x] Tap a bin → item flies into it with animation
- [x] Correct: green flash + haptic success. Wrong: red shake + haptic warning
- [x] Timer bar counting down per item
- [x] Score counter and streak display at top
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Build score screen and integration
**Acceptance Criteria:**
- [x] Score screen with grade, accuracy %, items correct/total
- [x] Reward: +25 XP + 15 Coins via `useEconomyStore`
- [x] Replay and Continue buttons
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-5` triggers `PayslipNinjaScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

## SIM 6: מירוץ מכוניות (Car Loan Race) — Module 6

Concept: A car drives on a track. As interest accumulates on the loan, the car gets heavier and slower. If interest exceeds the car's value, the bank repossesses it. The player controls spending decisions each round.

### US-006: Define types for Car Loan Race
**Acceptance Criteria:**
- [x] Create `carLoanTypes.ts` in `simulations/`
- [x] Define `CarLoanScenario`: id, description (Hebrew), emoji, options array
- [x] Define `CarLoanOption`: id, label, monthlyPayment, interestEffect ('increase' | 'decrease' | 'neutral'), feedback
- [x] Define `CarLoanConfig`: carValue, loanAmount, baseInterestRate, months (8 rounds), scenarios array
- [x] Define `CarLoanState`: remainingLoan, totalInterestPaid, carCurrentValue (depreciates), month, speed (0-100), isRepossessed, isComplete
- [x] Define `CarLoanScore`: grade, gradeLabel, totalPaid, interestPortion, carFinalValue
- [x] Typecheck passes

### US-007: Create car loan scenario data
**Acceptance Criteria:**
- [x] Create `carLoanData.ts` in `simulations/`
- [x] 8 scenarios: buy new vs used, extend loan term, early repayment offer, interest rate hike, insurance choices, maintenance costs, refinance offer, final assessment
- [x] Config: carValue=₪80,000, loanAmount=₪60,000, baseInterestRate=0.06 (6%/year)
- [x] Each option has realistic financial consequences and Hebrew feedback
- [x] Typecheck passes

### US-008: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useCarLoanGame.ts` in `simulations/`
- [x] Each round: apply monthly interest, depreciate car value (1.5% per month), process player choice
- [x] Track speed (inversely proportional to interest burden), total interest paid
- [x] If loan exceeds car value × 1.5 → repossession (game over early)
- [x] Grade: S (paid off early, minimal interest), A-F based on total interest paid vs loan amount ratio
- [x] Typecheck passes

### US-009: Build Car Loan Race game screen
**Acceptance Criteria:**
- [x] Create `CarLoanRaceScreen.tsx` in `simulations/`
- [x] Top section: animated car on a road, speed indicator. Car slows down as interest grows
- [x] Car visual gets "weighted down" (larger shadow, lower position) with more debt
- [x] Middle: scenario card with options
- [x] Bottom: stats bar (remaining loan, interest paid, car value, month X/8)
- [x] Repossession: dramatic animation of car being towed away
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-010: Build score screen and integration
**Acceptance Criteria:**
- [x] Score screen showing total paid, interest portion, car final value, grade
- [x] Key lesson: "Don't take loans on depreciating assets"
- [x] Reward: +25 XP + 15 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-6` triggers `CarLoanRaceScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

## SIM 7: קרב הבנקאי (Bank Fee Combat) — Module 7

Concept: The bank throws "fee attacks" at the player. The player must choose the right defense (threaten to leave, ask for manager, accept, negotiate). A combat-style UI with health bars.

### US-011: Define types for Bank Fee Combat
**Acceptance Criteria:**
- [x] Create `bankCombatTypes.ts` in `simulations/`
- [x] Define `FeeAttack`: id, feeName (Hebrew), feeAmount, emoji, description
- [x] Define `DefenseOption`: id, label, effectiveness (0-100), counterText (Hebrew)
- [x] Define `BankCombatConfig`: playerHealth (starts at ₪1,000 savings), attacks array, defenses per attack
- [x] Define `BankCombatState`: playerHealth, bankHealth (starts 100), round, feesBlocked, feesAbsorbed, totalSaved, isComplete
- [x] Define `BankCombatScore`: grade, totalSaved, feesBlocked count
- [x] Typecheck passes

### US-012: Create fee attack and defense data
**Acceptance Criteria:**
- [x] Create `bankCombatData.ts` in `simulations/`
- [x] 6 fee attacks: דמי ניהול חשבון (₪25/mo), עמלת פעולות (₪5 each), עמלת הקצאת אשראי (₪150/yr), עמלת פקיד (₪10), דמי כרטיס אשראי (₪15/mo), עמלת העברה בנקאית (₪20)
- [x] Each attack has 3 defenses: optimal (threatens to leave → 90% effective), good (negotiate → 60%), bad (accept → 0%)
- [x] Hebrew text for all labels and feedback
- [x] Typecheck passes

### US-013: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useBankCombat.ts` in `simulations/`
- [x] Each round: fee attack presented, player picks defense
- [x] Effectiveness determines how much of the fee is blocked (savedAmount = feeAmount × effectiveness/100)
- [x] PlayerHealth decreases by unblocked fees
- [x] BankHealth decreases by blocked fees (bank "loses" when you negotiate well)
- [x] After 6 rounds: score based on total saved and fees blocked
- [x] Grade: S (blocked all), A (≥80% saved), B (≥60%), C (≥40%), F (<40%)
- [x] Typecheck passes

### US-014: Build Bank Fee Combat screen
**Acceptance Criteria:**
- [x] Create `BankCombatScreen.tsx` in `simulations/`
- [x] Top: two health bars facing each other (player savings vs bank fee meter)
- [x] Center: fee attack card with emoji, name, monthly cost, annual cost
- [x] Bottom: 3 defense buttons styled as combat moves
- [x] Hit animations: fee blocked = shield effect, fee absorbed = red damage flash
- [x] Heavy haptic feedback on each interaction
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-015: Build score screen and integration
**Acceptance Criteria:**
- [x] Score screen: total saved per year, fees blocked, grade
- [x] Key lesson: "5 minutes on the phone can save ₪3,600/year"
- [x] Reward: +25 XP + 15 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-7` triggers `BankCombatScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

## SIM 8: מירוץ עגלות (Shopping Cart Race) — Module 8

Concept: Player pushes a shopping cart through a supermarket. Must collect essential items while dodging marketing trap items (BOGO, end-cap displays, oversized packages). Score based on staying under budget while getting all essentials.

### US-016: Define types for Shopping Cart Race
**Acceptance Criteria:**
- [x] Create `shoppingCartTypes.ts` in `simulations/`
- [x] Define `ShoppingItem`: id, name (Hebrew), emoji, price, category ('essential' | 'trap' | 'budget-alternative'), trapType? ('bogo' | 'endcap' | 'oversized' | 'decoy-pricing')
- [x] Define `ShoppingCartConfig`: budget (₪), items array, essentialCount (how many essentials must be collected)
- [x] Define `ShoppingCartState`: cart (items[]), totalSpent, budget, essentialsCollected, trapsAvoided, trapsFallen, isComplete
- [x] Define `ShoppingCartScore`: grade, moneyWasted, essentialsMissed, trapsAvoided count
- [x] Typecheck passes

### US-017: Create shopping item data
**Acceptance Criteria:**
- [x] Create `shoppingCartData.ts` in `simulations/`
- [x] 20+ items: 8 essentials (חלב, לחם, ביצים, ירקות, etc.), 8 traps (1+1 שוקולד, מכשיר פונדו במבצע, חטיפים ליד הקופה, etc.), 4 budget alternatives (מותג פרטי vs מותג יקר)
- [x] Budget: ₪200
- [x] Each trap has a `trapType` explaining the psychology behind it
- [x] Typecheck passes

### US-018: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useShoppingCart.ts` in `simulations/`
- [x] Items presented one at a time (simulating walking through store)
- [x] Player: "Add to Cart" or "Skip"
- [x] Track: essentials collected, traps fallen into, money spent vs budget
- [x] Going over budget = penalty. Missing essentials = penalty. Avoiding traps = bonus
- [x] Grade: S (all essentials, no traps, under budget), A-F based on composite score
- [x] Typecheck passes

### US-019: Build Shopping Cart Race screen
**Acceptance Criteria:**
- [x] Create `ShoppingCartScreen.tsx` in `simulations/`
- [x] Top: budget bar showing remaining money (green → yellow → red as spent)
- [x] Center: item card with emoji, name, price, and flashy "מבצע!" badge for traps
- [x] Two buttons: "🛒 הוסף לעגלה" (add) and "👋 דלג" (skip)
- [x] After adding a trap: reveal popup explaining the marketing trick used
- [x] Bottom: mini cart showing items collected
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-020: Build score screen and integration
**Acceptance Criteria:**
- [x] Score screen: budget remaining, essentials collected, traps avoided, money wasted on traps
- [x] Key lesson: "The supermarket is a psychological battlefield"
- [x] Reward: +25 XP + 15 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-8` triggers `ShoppingCartScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

## SIM 9: טרמפולינה (Emergency Fund Trampoline) — Module 9

Concept: Financial emergencies fall from the sky. The player has a safety net (emergency fund) that bounces them away. Without enough fund, emergencies hit directly and force expensive loans. Player decides each round how much to save vs spend.

### US-021: Define types for Emergency Fund game
**Acceptance Criteria:**
- [x] Create `emergencyFundTypes.ts` in `simulations/`
- [x] Define `EmergencyEvent`: id, name (Hebrew), emoji, cost (₪), severity ('minor' | 'major' | 'catastrophic')
- [x] Define `FundRound`: month, income (₪), spendingChoice ('save-more' | 'balanced' | 'spend-more'), savingsRate
- [x] Define `EmergencyFundConfig`: monthlyIncome, monthlyExpenses, events array, totalMonths (12)
- [x] Define `EmergencyFundState`: fundBalance, loansTaken, loanInterest, month, eventsHandled, eventsMissed, isComplete
- [x] Define `EmergencyFundScore`: grade, fundFinalBalance, totalLoanInterest, eventsAbsorbed
- [x] Typecheck passes

### US-022: Create emergency event data
**Acceptance Criteria:**
- [x] Create `emergencyFundData.ts` in `simulations/`
- [x] 6 emergency events scattered across 12 months: פנצ'ר (₪400 minor), שיניים (₪2,000 major), תיקון דוד שמש (₪1,500 major), מכשיר טלפון נשבר (₪800 minor), פיטורים (₪0 income for 2 months — catastrophic), מזגן מתקלקל (₪3,000 major)
- [x] Config: monthlyIncome=₪10,000, monthlyExpenses=₪7,000
- [x] 3 saving choices per non-emergency month affecting savings rate
- [x] Typecheck passes

### US-023: Build game logic hook
**Acceptance Criteria:**
- [x] Create `useEmergencyFund.ts` in `simulations/`
- [x] Each month: player picks savings rate, then random event may hit
- [x] If fund covers emergency: absorb it (fund decreases). Success feedback.
- [x] If fund insufficient: forced to take loan at 12% annual interest. Remaining months pay interest.
- [x] Track: fund balance, loans taken, cumulative loan interest
- [x] After 12 months: grade based on loans avoided and fund health
- [x] Typecheck passes

### US-024: Build Emergency Fund game screen
**Acceptance Criteria:**
- [x] Create `EmergencyFundScreen.tsx` in `simulations/`
- [x] Top: emergency fund "shield" meter (grows with savings, shrinks with emergencies)
- [x] Normal months: choose savings rate (3 options with different save/spend splits)
- [x] Emergency months: dramatic animation of event falling, shield absorbing or breaking through
- [x] If shield breaks: loan popup with interest warning
- [x] Month counter and fund balance display
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-025: Build score screen and integration
**Acceptance Criteria:**
- [x] Score screen: fund final balance, emergencies absorbed, loans taken, loan interest paid
- [x] Key lesson: "3-6 months expenses in a liquid fund = financial armor"
- [x] Reward: +25 XP + 15 Coins
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-9` triggers `EmergencyFundScreen`
- [x] Export from `simulations/index.ts`
- [x] Typecheck passes
- [ ] Verify changes work in browser

---

## Non-Goals
- No real-time physics (keep it simple RN-compatible)
- No multiplayer
- No persistent leaderboard
- No actual swipe gesture detection (use tap-based interactions)

## Technical Notes
- Follow pattern: `xxxTypes.ts` → `xxxData.ts` → `useXxx.ts` → `XxxScreen.tsx` → integrate in `LessonFlowScreen`
- Reuse: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `useEconomyStore`
- Use `react-native-reanimated` for animations
- Use `expo-haptics` for haptic feedback (successHaptic, heavyHaptic, tapHaptic)
- All text in Hebrew RTL
- Export all screens from `simulations/index.ts`
