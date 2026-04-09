# PRD 50: Credit Score Simulator Overhaul — סימולטור 2: בנה את הציון

## Vision
הסימולטור הקיים של דירוג האשראי (פרק 2, מודולה 2-10) מרגיש כמו שאלון טריוויה לינארי. המטרה של השדרוג הזה היא להפוך אותו לחוויית Gamification מהירה ולוחצת, המדמה סמארטפון אמיתי שמקבל "התראות פוש" מגופים פיננסיים.

**המסר הפדגוגי:** ציון אשראי הוא דינמי ונבנה או נהרס מהחלטות יומיומיות תמימות למראה.

---

## What Already Exists (DO NOT REWRITE)
- `creditScoreTypes.ts` — types: `NotificationSource`, `CreditEvent`, `CreditOption`, `CreditScoreState`, `CreditScoreScore` ✅
- `creditScoreData.ts` — 5 PRD-aligned scenarios with `senderName`, `sourceType`, severity ✅
- `useCreditScore.ts` — game logic hook (state machine, scoring, grade computation) ✅
- `CreditScoreScreen.tsx` — working UI (overhaul target)

---

## Execution Order

### US-001 — NotificationCard component (replace EventCard)
- [x] Replace `EventCard` with `NotificationCard` — mimics phone push notification
- Layout: rounded card with sender icon (left), sender name + notification text (right, RTL)
- Source icons: 🏦 bank, 💬 whatsapp, 💳 credit_card, 🏢 bdi (map from `sourceType` on `CreditEvent`)
- Show `senderName` as bold header above description
- Severity badge stays (routine/important/critical) with existing `SEVERITY_CFG` colors
- Round counter as subtle pill badge top-right
- Card slides in from top (`FadeInDown`) like a real push notification
- **FIX TS BUG:** Remove `emoji` prop from EventCard call (line 493) — `CreditEvent` type has no `emoji` field
- Files: `CreditScoreScreen.tsx`

### US-002 — Floating Score Numbers animation
- [x] After each choice, show floating number that flies upward from gauge center
- Green "+XX 📈" for positive impact, Red "−XX 📉" for negative
- Use `useSharedValue` + `withTiming` for `translateY` (0 → -80) and `opacity` (1 → 0)
- Duration: 1200ms
- Triggered in `onOptionPress` callback — store `lastImpact` state, render `FloatingNumber` component
- Component auto-hides after animation completes
- Files: `CreditScoreScreen.tsx`

### US-003 — Red/Green Flash overlay on score change
- [x] Add a full-screen color flash overlay after each choice (0.3s total)
- Green flash (`rgba(34,197,94,0.15)`) for correct choice, red flash (`rgba(239,68,68,0.2)`) for wrong
- Use `useSharedValue` for opacity: 0 → peak → 0 with `withSequence(withTiming, withTiming)`
- Layer it as `pointerEvents="none"` absolute overlay, `position: 'absolute', top: 0, left: 0, right: 0, bottom: 0`
- Triggered alongside floating number in `onOptionPress`
- Files: `CreditScoreScreen.tsx`

### US-004 — Enhanced Haptics per severity
- [x] On event render: `heavyHaptic()` for `critical` severity events
- Wrong choice: `errorHaptic()` then 200ms delay then `heavyHaptic()`
- Right choice: `successHaptic()` (already exists)
- Milestone crossing (750/800): double `heavyHaptic()` with 100ms gap + confetti (partially exists)
- Files: `CreditScoreScreen.tsx`

### US-005 — Option cards restyling (Action Cards)
- [x] Restyle `OptionButton` to look like frosted glass action cards
- Each option: source icon (match event's sourceType) + label text + severity-tinted border
- `borderRadius: 16`, semi-transparent background `rgba(255,255,255,0.08)`
- Active press state: scale `0.97` (AnimatedPressable already handles this)
- Add subtle gradient or glow matching severity color
- Files: `CreditScoreScreen.tsx`

### US-006 — Receipt-style End Screen (דוח ריכוז נתוני אשראי)
- [x] Redesign `ScoreScreen` as a printed credit report receipt
- Cream/white background card with dashed border (receipt paper feel) — `borderStyle: 'dashed'`
- Header: "דוח ריכוז נתונים — בנק ישראל" with date and official look
- Credit gauge (existing `CreditGauge` component) centered at top
- Stats table: ציון סופי, שיא, שפל, מגמה, בחירות נכונות X/5
- Each of the 5 decisions listed as a line item (icon + short label + impact: +/- colored)
- Use `state.history` + `creditScoreConfig.events` to build the line items
- Educational takeaway in a highlighted box at bottom (existing lesson text)
- "חותמת" (stamp) overlay: grade letter (S/A/B/C/F) rotated 15° with grade color, semi-transparent
- Replay + Continue buttons remain
- Files: `CreditScoreScreen.tsx`, may need to pass `history` to `ScoreScreen`

### US-007 — History data access in ScoreScreen
- [x] Pass `history` array from `useCreditScore` to `ScoreScreen`
- Map each `ChoiceRecord` to its event title (from `creditScoreConfig.events`) for receipt line items
- Update `ScoreScreen` props to accept `history: ChoiceRecord[]`
- Files: `CreditScoreScreen.tsx`

### US-008 — TypeScript validation + cleanup
- [x] Run `npx tsc --noEmit` — fix any new errors from changes
- [x] Remove unused imports/styles from old `EventCard` component
- [x] Ensure no `any` types, all strict TypeScript
- Files: `CreditScoreScreen.tsx`

---

## Design Reference
- **Theme:** `getChapterTheme('chapter-2')` → ocean blue palette (already in `CH2` const)
- **RTL:** `writingDirection: 'rtl', textAlign: 'right'` on all Hebrew text
- **Animations:** Reanimated 3 (`FadeIn`, `FadeInDown`, `withSpring`, `withTiming`, `withSequence`)
- **Haptics:** `tapHaptic`, `successHaptic`, `errorHaptic`, `heavyHaptic` from `utils/haptics`
- **Lottie:** existing assets in `assets/lottie/` (chart, growth, cross, check, trophy, etc.)
- **SimLottieBackground** wraps the entire sim
- **Shared UI:** `AnimatedPressable`, `GlowCard`, `LottieIcon`, `SimFeedbackBar`, `ConfettiExplosion`

## Source Type Icons (for NotificationCard + OptionButton)
```typescript
const SOURCE_ICONS: Record<NotificationSource, { emoji: string; color: string }> = {
    bank: { emoji: '🏦', color: '#0369a1' },
    whatsapp: { emoji: '💬', color: '#25D366' },
    credit_card: { emoji: '💳', color: '#7c3aed' },
    bdi: { emoji: '🏢', color: '#64748b' },
};
```
