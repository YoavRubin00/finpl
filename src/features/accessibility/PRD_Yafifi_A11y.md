# PRD: UX Polish — Accessibility + Contrast + Reduced Motion (יפיופי)

**Status:** Active  
**Source:** יפיופי audit 2026-04-16  
**Scope:** Fix WCAG 2.1 AA / תקנה 5568 violations across the main screens, add `useReducedMotion` coverage, improve tappable targets.

All work is UI-ONLY — no logic changes, no new components. Add props, fix colors, wrap animations.

---

## User Stories

### US-001 — Add accessibilityLabel to all Pressables in FinFeedScreen
- [x] Target: `src/features/finfeed/FinFeedScreen.tsx`
- **Problem:** 43 `<Pressable>` components, **zero** `accessibilityLabel`/`accessibilityRole`. Screen unusable with TalkBack/VoiceOver.
- **Fix:** Add `accessibilityRole="button"` and Hebrew `accessibilityLabel` to each interactive Pressable. For decorative Pressables (e.g. wrapping animations), set `accessible={false}`.
- **Acceptance:**
  - [x] Every `<Pressable onPress={...}>` has `accessibilityLabel` (Hebrew) and `accessibilityRole`
  - [x] Pure-decoration Pressables use `accessible={false}`
  - [x] Typecheck passes

### US-002 — Add accessibilityLabel to all Pressables in ProfilingFlow
- [x] Target: `src/features/onboarding/ProfilingFlow.tsx`
- **Problem:** 41 `<Pressable>`, **zero** labels. Onboarding inaccessible — first-touch experience.
- **Fix:** Same pattern as US-001.
- **Acceptance:**
  - [x] Every `<Pressable>` has `accessibilityLabel` + `accessibilityRole`
  - [x] Typecheck passes

### US-003 — Add accessibilityLabel to unlabeled Pressables in LessonFlowScreen
- [ ] Target: `src/features/chapter-1-content/LessonFlowScreen.tsx`
- **Problem:** 118 tappables, ~35 missing labels (SI 5568 §9.2 violation)
- **Fix:** Grep for `<Pressable` / `<TouchableOpacity` / `<AnimatedPressable`, add missing `accessibilityLabel` + `accessibilityRole="button"`
- **Acceptance:**
  - [ ] Every interactive tappable has label + role
  - [ ] Typecheck passes

### US-004 — Fix contrast in LessonFlowScreen (#94a3b8 on white)
- [x] Target: `src/features/chapter-1-content/LessonFlowScreen.tsx` lines 379, 3221, 3496, 3577
- **Problem:** `#94a3b8` text on white = 2.85:1 — fails WCAG AA (requires 4.5:1 for text, 3:1 for large text). Affects actionable labels: "טוען סרטון", "דלג", "אחר כך", "המשך".
- **Fix:** Replace `#94a3b8` with `#64748b` (4.54:1) — adds accessibility without changing visual hierarchy much.
- **Acceptance:**
  - [x] All 4 occurrences use `#64748b` or darker
  - [x] Typecheck passes

### US-005 — Fix locked-chapter contrast in DuoLearnScreen
- [ ] Target: `src/features/pyramid/DuoLearnScreen.tsx` lines 1358, 1365
- **Problem:** Locked icon/text `#cbd5e1` on white = 1.69:1. Even non-text UI needs 3:1 per WCAG AA.
- **Fix:** Replace `#cbd5e1` with `#94a3b8` (3.47:1) for locked state — still visually "locked" but meets contrast.
- **Acceptance:**
  - [ ] Locked elements use `#94a3b8` or darker
  - [ ] Typecheck passes

### US-006 — Fix ProfilingFlow checkbox border
- [x] Target: `src/features/onboarding/ProfilingFlow.tsx` line ~1686
- **Problem:** Unchecked checkbox border `#cbd5e1` on white — invisible to many users.
- **Fix:** Replace with `#64748b` (4.54:1 contrast).
- **Acceptance:**
  - [ ] Checkbox border visible at 3:1+ contrast
  - [ ] Typecheck passes

### US-007 — Gate FinFeed animations on useReducedMotion
- [ ] Target: `src/features/finfeed/FinFeedScreen.tsx` — `BouncingArrow` (line ~127), pulse bubbles (line ~213)
- **Problem:** `withRepeat(..., -1)` runs unconditionally — triggers vestibular issues for reduced-motion users.
- **Fix:** Wrap with `useReducedMotion()` from `react-native-reanimated`. If true, skip the `withRepeat` and set static value.
- **Pattern to follow:** `src/components/ui/AnimatedPressable.tsx:48` (already does this correctly)
- **Acceptance:**
  - [ ] `BouncingArrow` + pulse bubbles respect `useReducedMotion`
  - [ ] Typecheck passes

### US-008 — Fix PulsingGlow in DuoLearnScreen
- [ ] Target: `src/features/pyramid/DuoLearnScreen.tsx:429`
- **Problems:**
  1. Uses `useState(() => {...})` initializer for side effects — should be `useEffect`. The init callback runs during render commit (bug).
  2. No `useReducedMotion` gate.
- **Fix:** Move animation setup to `useEffect`, add `useReducedMotion()` check.
- **Acceptance:**
  - [ ] Animation setup lives in `useEffect`, not `useState`
  - [ ] `useReducedMotion` gate present
  - [ ] Typecheck passes

### US-009 — Add hitSlop to small-target buttons in DuoLearnScreen
- [ ] Target: `src/features/pyramid/DuoLearnScreen.tsx`
- **Problem:** 32 tappables, 0 `hitSlop`. Small icons/dots violate 44×44pt minimum (iOS HIG + WCAG).
- **Fix:** Add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` to any Pressable where the visual target is smaller than 44×44.
- **Acceptance:**
  - [ ] All small-target Pressables have appropriate `hitSlop`
  - [ ] Typecheck passes
