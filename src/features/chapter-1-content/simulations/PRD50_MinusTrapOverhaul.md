# PRD 50: Minus Trap Simulator Overhaul — מלכודת המינוס (טינדר הוצאות)

## Vision
הסימולטור הקיים של "מלכודת המינוס" הוא משחק מרובה-ברירות יבש עם 4 תרחישים. המטרה: להפוך אותו ל-**Tinder for Expenses** — חוויה מהירה, אמוציונלית וויזואלית שמדמה חודש בחיי צעיר ישראלי. המשתמש מחליק קלפי הוצאות ימינה (קנה) או שמאלה (וותר), כשהמטרה היא לסיים את החודש בלי לקפוץ למינוס.

**המסר הפדגוגי:** פיתויים "קטנים" במצטבר דוחפים למינוס. מינוס = מפלצת ריבית שאוכלת כסף בלי שתשים לב.

---

## What Already Exists
- `minusTrapTypes.ts` — types (MinusOption, MinusScenario, MinusTrapGameState, MinusTrapScore) — **REWRITE needed** for swipe card model
- `minusTrapData.ts` — 4 scenarios with 3 options each — **REWRITE needed** → 15-20 swipe cards
- `useMinusTrapGame.ts` — game logic hook — **REWRITE needed** for swipe balance mechanics
- `MinusTrapGameScreen.tsx` — button-based UI — **FULL REWRITE** to Tinder swipe

### Swipe Pattern Reference (REUSE)
- `src/features/myth-or-tachles/MythCardDeck.tsx` — card deck with `Gesture.Pan()`, `SWIPE_THRESHOLD=100`, rotation, overlays, spring-back
- `src/components/ui/DoubleOrNothingModal.tsx` — swipe right/left with animated overlays

---

## Game Rules
1. **Starting Balance:** ₪3,000
2. **Minus Threshold:** ₪0 (screen flashes red, interest monster appears)
3. **Game Over (Block):** ₪-5,000 (screen shatters, "כרטיס נחסם")
4. **Interest mechanic:** When below ₪0, every swipe-right costs extra 5% penalty (ריבית חריגה)
5. **Mandatory expenses:** Some cards are "must pay" — skipping them adds a penalty later
6. **Installment trap:** iPhone ב-36 תשלומים adds ₪150 auto-deduct on every future card
7. **Win condition:** Survive all 18 cards without hitting -5000. Score based on final balance + interest paid

---

## Expense Cards (18 cards)

### Wants (פיתויים) — can skip safely
| # | Card | Amount | Emoji |
|---|------|--------|-------|
| 1 | סושי מ-Wolt ב-23:00 | -₪150 | 🍣 |
| 2 | סייל זארה חורף 50% | -₪350 | 👗 |
| 3 | חופשה בסופ"ש בפאפוס | -₪800 | ✈️ |
| 4 | מנוי חדר כושר שנתי | -₪250 | 💪 |
| 5 | קונסולת PS5 במבצע | -₪1,200 | 🎮 |
| 6 | ארוחת חוץ יום שישי | -₪200 | 🍽️ |
| 7 | קניות בסופר מפנק | -₪400 | 🛒 |

### Needs/Musts (חובה) — skipping = penalty later
| # | Card | Amount | Penalty if skipped | Emoji |
|---|------|--------|-------------------|-------|
| 8 | חשבון חשמל | -₪400 | +₪450 penalty | ⚡ |
| 9 | שכר דירה | -₪2,800 | Game Over | 🏠 |
| 10 | ביטוח בריאות | -₪180 | +₪500 emergency | 🏥 |
| 11 | דו"ח חנייה עירייה | -₪100 | +₪250 doubled | 🚗 |
| 12 | החתול בלע לגו — חדר מיון | -₪600 | חייב — אין ברירה | 🐱 |

### Credit Traps (מלכודות אשראי) — hidden cost
| # | Card | Visible Cost | Real Effect | Emoji |
|---|------|-------------|-------------|-------|
| 13 | אייפון 16 ב-36 תשלומים | -₪150 | +₪150 auto-deduct on ALL future cards | 📱 |
| 14 | הלוואה מהירה "בלי ריבית" | +₪2,000 | -₪200 per remaining card | 💸 |
| 15 | שדרוג חבילת סלולר | -₪80 | recurring -₪80 every 3 cards | 📶 |

### Income/Positive events
| # | Card | Amount | Emoji |
|---|------|--------|-------|
| 16 | משכורת נכנסה! | +₪4,500 | 💰 |
| 17 | בונוס מהעבודה | +₪1,000 | 🎉 |
| 18 | החזר מס הכנסה | +₪800 | 📄 |

---

## Execution Order

### US-001 — Types rewrite (minusTrapTypes.ts)
- [x] Define `SwipeCard` interface: `id, title, emoji, amount, cardType: 'want' | 'need' | 'trap' | 'income', isMandatory, skipPenalty?, recurringCost?, penaltyDelay?`
- [x] Define `MinusTrapSwipeState`: `balance, cardsPlayed, interestPaid, monthsInMinus, activeRecurring: {id, costPerCard}[], penalties: {cardId, amount, applied}[], isGameOver, isComplete`
- [x] Define `MinusTrapSwipeScore`: `finalBalance, grade, gradeLabel, totalSpent, totalSkipped, interestPaid, penaltiesHit, cardsSwipedRight, cardsSwipedLeft`
- [x] Keep existing `MinusTrapScore` grade type ('S'|'A'|'B'|'C'|'F') for compatibility
- Files: `minusTrapTypes.ts`

### US-002 — Data rewrite (minusTrapData.ts)
- [x] Create array of 18 `SwipeCard` objects from the table above
- [x] Shuffle order: mix wants/needs/traps — don't group by type
- [x] Suggested order: salary first (card 16), then mixed, rent mid-game (card 9)
- [x] Export `minusTrapSwipeConfig` with `startingBalance: 3000`, `gameOverThreshold: -5000`, `overdraftInterestRate: 0.05`, `cards: SwipeCard[]`
- Files: `minusTrapData.ts`

### US-003 — Game logic hook rewrite (useMinusTrapGame.ts)
- [x] `useMinusTrapSwipe()` hook managing `MinusTrapSwipeState`
- [x] `swipeRight(card)`: deduct amount, apply recurring costs, apply interest if negative, check game over
- [x] `swipeLeft(card)`: if `isMandatory` → queue penalty for later; else skip
- [x] Process penalties: check if any queued penalty triggers (based on `penaltyDelay` cards elapsed)
- [x] Recurring cost logic: for each item in `activeRecurring`, deduct on every swipeRight
- [x] Interest: if balance < 0, add `abs(balance) * overdraftInterestRate` to `interestPaid` and deduct from balance on every swipe
- [x] Game over detection: balance <= gameOverThreshold
- [x] Score computation: grade based on final balance + interest paid + penalties hit
- [x] `currentCard`: derived from `cardsPlayed` index
- [x] `resetGame()` function
- Files: `useMinusTrapGame.ts`

### US-004 — Swipe Card Deck UI (MinusTrapGameScreen.tsx — part 1)
- [x] Rewrite screen with Tinder card deck using `Gesture.Pan()` from react-native-gesture-handler
- [x] Reuse swipe physics from MythCardDeck: `SWIPE_THRESHOLD=100`, `SWIPE_OUT_X=SCREEN_W*1.4`, `damping:15, stiffness:200`
- [x] Card design: large emoji (64px), title, amount badge, card type indicator (want/need/trap)
- [x] Swipe overlays: ימינה = "קונה 💳" (green), שמאלה = "מוותר ✋" (red)
- [x] Card rotation during drag: ±18° interpolated from translateX
- [x] Deck depth: show 2-3 stacked cards behind active card
- [x] RTL layout throughout
- Files: `MinusTrapGameScreen.tsx`

### US-005 — Balance Bar + Interest Monster (MinusTrapGameScreen.tsx — part 2)
- [x] Animated balance bar at top: green → yellow → red gradient based on balance
- [x] Balance amount display: ₪X,XXX with color coding
- [x] When balance < 0: full-screen red flash, heavy haptic, pulsing red glow on bar
- [x] "מפלצת ריבית" indicator: small animated badge showing interest penalty per swipe
- [x] When balance <= -5000: "Game Over" screen — screen shatter effect, "כרטיס נחסם 🚫" stamp
- [x] Card counter: X/18 showing progress
- Files: `MinusTrapGameScreen.tsx`

### US-006 — Mandatory card warnings + penalty system UI
- [x] Mandatory cards (`isMandatory: true`): show warning label "חובה!" on card
- [x] If user swipes left on mandatory: show brief warning toast "⚠️ דילגת על חשבון חובה!"
- [x] When penalty triggers (N cards later): dramatic popup "📨 התראה מהבנק! קנס ₪XXX"
- [x] Installment trap feedback: after swiping right on trap card, show recurring cost badge near balance
- [x] Recurring cost visual: small repeating "−₪150" chip below balance bar
- Files: `MinusTrapGameScreen.tsx`

### US-007 — Receipt-style End Screen (סיכום חודש)
- [x] "קבלה מודפסת" design: cream/white card with dashed border
- [x] Header: "סיכום החודש — מלכודת המינוס" with date
- [x] Stats: יתרת סגירה, סה"כ הוצאות, סה"כ ריבית, קנסות, קלפים שנקנו vs שנדחו
- [x] Each purchase listed as receipt line item (emoji + title + amount)
- [x] Grade stamp (S/A/B/C/F) rotated at angle
- [x] Educational takeaway box: lesson about overdraft interest
- [x] Replay + Continue buttons
- Files: `MinusTrapGameScreen.tsx`

### US-008 — Haptics, Sound & Polish
- [x] Swipe right: `tapHaptic()` + balance drop animation
- [x] Swipe left: light `tapHaptic()`
- [x] Enter minus: `heavyHaptic()` + red flash
- [x] Penalty hit: `errorHaptic()` + warning sound
- [x] Game over: `heavyHaptic()` × 3 rapid
- [x] Game complete: `successHaptic()` + confetti if grade ≥ A
- [x] Award 20 XP + 30 coins on completion
- Files: `MinusTrapGameScreen.tsx`

### US-009 — TypeScript validation + integration
- [x] Run `npx tsc --noEmit` — fix all errors
- [x] Verify `MinusTrapGameScreen` is exported from `simulations/index.ts`
- [x] Verify `SimulatorLoader.tsx` maps `mod-1-2` → `MinusTrapGameScreen`
- [x] Clean up unused imports and old code
- Files: all modified files

---

## Design Reference
- **Theme:** `getChapterTheme('chapter-1')` — Chapter 1 palette
- **RTL:** `writingDirection: 'rtl', textAlign: 'right'` on all Hebrew text
- **Swipe physics:** Copy from MythCardDeck (`SWIPE_THRESHOLD=100`, spring `damping:15, stiffness:200`)
- **Animations:** Reanimated 3, `Gesture.Pan()` from react-native-gesture-handler
- **Haptics:** `tapHaptic`, `successHaptic`, `errorHaptic`, `heavyHaptic` from `utils/haptics`
- **Economy:** `useEconomyStore` → `addXP(20, 'sim_complete')`, `addCoins(30)`
- **SimLottieBackground** wraps the sim
- **ConfettiExplosion** for high grades
