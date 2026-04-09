# PRD 39: Duolingo-Style Learning Map

## Overview
Redesign the main PyramidScreen (tab 1) to look and feel exactly like Duolingo's learning path.
White background, colored section banners per arena, circular module nodes arranged in a winding
zigzag path. Each node represents one module and navigates directly to that lesson.

**מטרה חינוכית:** מסלול למידה ויזואלי וברור — המשתמש רואה את ההתקדמות שלו בצורה גרפית ומרגיש מוטיבציה להמשיך.

---

## Visual Reference
Duolingo: white bg → colored section banner → circular nodes winding left/center/right → mascot mascot decoration.

---

## Component Architecture

```
PyramidScreen.tsx
├── GlobalWealthHeader (unchanged)
├── DailyIncomeCard (unchanged)
├── DailyChallengePrompt (unchanged)
└── For each arena (1–5):
    ├── SectionBanner (inline component)
    │   └── arena gradient colors, name, progress count
    └── Module nodes grid (zigzag layout)
        └── ModuleNode (inline component) × N
```

---

## Data Sources

```ts
// Pattern from ChapterMapScreen.tsx
import { chapter1Data } from "../chapter-1-content/chapter1Data";
// ... (all 5 chapters)
import { useChapterStore } from "../chapter-1-content/useChapterStore";

const CHAPTER_MAP = {
  "chapter-1": { data: chapter1Data, storeId: "ch-1" },
  // ...
};
```

---

## User Stories

### US-001: PRD + Progress Files
**Acceptance Criteria:**
- [x] Create `PRD39_DuolingoMap.md`
- [x] Create `progress39.txt`

### US-002: Duolingo Map Layout
**Files:** `PyramidScreen.tsx`
**Acceptance Criteria:**
- [ ] White background (`#f8fafc`) — already done
- [ ] For each of 5 arenas: colored `SectionBanner` with gradient, name, "X/Y הושלמו"
- [ ] Below each banner: module nodes in zigzag positions (9-position offset array)
- [ ] Node states: completed (filled color + ✓), current (pulsing border), locked (gray)
- [ ] Node tap → `router.push('/lesson/${mod.id}?chapterId=${chapterId}')`
- [ ] Locked node tap → Alert with 50-coin unlock (same logic as ChapterMapScreen)
- [ ] Banner tap → `router.push(arena.chapterRoute)` as fallback
- [ ] `DailyIncomeCard` and `DailyChallengePrompt` remain above the map
- [ ] TypeScript passes (no new errors)

---

## Zigzag Pattern

```ts
const ZIGZAG = [0.5, 0.3, 0.1, 0.25, 0.5, 0.7, 0.85, 0.65, 0.5];
// Fraction of (screenWidth - NODE_SIZE) for marginLeft
// index % ZIGZAG.length for chapters with >9 modules
```

## Node Icons by Position

```ts
const NODE_ICONS = ['📖', '❓', '🎮', '⚡', '🏆', '💡', '📊', '🎯', '🔥'];
// index % NODE_ICONS.length
```

---

## Pre-existing TSC errors (safe to ignore):
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — XPSource mismatch
- GlassOverlay.tsx — expo-blur not found
