# PRD 29a — MacroEvents Mini-Game ("UP or DOWN?")

## Overview
A bite-sized, swipeable mini-game embedded directly in the FinFeed. The user sees a real
historical market event card and must guess whether the market went UP 📈 or DOWN 📉.
Correct answer reveals the truth with a dramatic animation, awards XP + Coins, and teaches
behavioral finance through lived history.

Inspired by: Duolingo "true/false" stories, Bloomberg headlines, Robinhood snackable news.

## Goal
1. Add a new feed item type `macro-event` to FinFeed.
2. Build the `MacroEventCard` with UP/DOWN voting UI and a reveal animation.
3. Persist answered events so each event appears only once per user.
4. Award XP (10) + Coins (5) per correct answer.
5. Make the card feel premium — dark background, red/green flash, haptics.

---

## User Stories

### US-001: Types & Historical Event Data
**Description:** Define the data schema and populate 20+ historical market macro-events.

**Acceptance Criteria:**
- [ ] Create `src/features/macro-events/types.ts` with `MacroEvent` interface:
  ```ts
  interface MacroEvent {
    id: string;
    year: number;
    headline: string;        // e.g. "לימן ברדרס קרסו"
    context: string;         // short description, 1-2 sentences
    direction: 'up' | 'down';
    magnitude: string;       // e.g. "−38% ב-2008"
    explanation: string;     // revealed after answer
    category: MacroEventCategory;
    difficulty: 1 | 2 | 3;
  }
  type MacroEventCategory = 'crisis' | 'boom' | 'shock' | 'policy' | 'tech';
  ```
- [ ] Create `src/features/macro-events/macroEventsData.ts` with 20+ events spanning:
  - 1929 crash, 1973 oil shock, 1987 Black Monday, 1999 dot-com, 2001 9/11
  - 2008 Lehman, 2010 Flash Crash, 2020 COVID crash, 2020 recovery, 2021 meme stocks
  - 2022 rate hike sell-off, 2023 bank failures (SVB), and more

**Files:** `src/features/macro-events/types.ts`, `src/features/macro-events/macroEventsData.ts`

---

### US-002: MacroEvent Store
**Description:** Zustand store to track which events the user has answered and tally rewards.

**Acceptance Criteria:**
- [ ] Create `src/features/macro-events/useMacroEventStore.ts`
- [ ] State:
  ```ts
  answeredIds: string[];        // events already played
  correctCount: number;
  totalAnswered: number;
  ```
- [ ] Actions:
  - `recordAnswer(id, wasCorrect)` — adds id to answeredIds, updates counters,
    calls `useEconomyStore.getState().addXP(10)` + `addCoins(wasCorrect ? 5 : 0)`
  - `getNextUnanswered(events)` — returns first event not in answeredIds
- [ ] Persisted via `zustand/middleware persist` + AsyncStorage

**Files:** `src/features/macro-events/useMacroEventStore.ts`

---

### US-003: MacroEventCard Component
**Description:** The full-screen feed card with UP/DOWN buttons and reveal animation.

**Acceptance Criteria:**
- [ ] Create `src/features/macro-events/MacroEventCard.tsx`
- [ ] Layout (dark bg, CLASH theme):
  - Top badge: category icon + label (e.g. "🏦 משבר")
  - Year displayed large in gold: `1987`
  - Headline text (RTL, bold, white)
  - Context paragraph (gray, RTL)
  - Bottom row: two large buttons — "📈 עלה" (green border) + "📉 ירד" (red border)
- [ ] On button press:
  - Disable both buttons immediately
  - Animate reveal: correct button flashes green (`withSpring` scale), wrong flashes red
  - Show magnitude overlay: e.g. "−38% 📉 נכון!" or "טעית — עלה ב-+22% 📈"
  - Show explanation text sliding up
  - Light haptic on press, heavy success haptic on correct, error haptic on wrong
- [ ] After 1.5 seconds show "המשך ↓" hint
- [ ] Props: `{ item: FeedMacroEvent; isActive: boolean }`

**Files:** `src/features/macro-events/MacroEventCard.tsx`

---

### US-004: Feed Integration
**Description:** Add `macro-event` as a proper FeedItem type and inject cards into FinFeed.

**Acceptance Criteria:**
- [ ] Add to `src/features/finfeed/types.ts`:
  ```ts
  export interface FeedMacroEvent {
    id: string;
    type: 'macro-event';
    event: MacroEvent;
  }
  export type FeedItem = FeedVideo | FeedQuote | ... | FeedMacroEvent;
  ```
- [ ] In `FinFeedScreen.tsx` `feedItems` useMemo:
  - Import `macroEventsData` and `useMacroEventStore`
  - Pick up to 3 unanswered events, map to `FeedMacroEvent`
  - Add to `pool` before shuffle
- [ ] In `renderItem`: handle `item.type === 'macro-event'` → `<MacroEventCard>`

**Files:** `src/features/finfeed/types.ts`, `src/features/finfeed/FinFeedScreen.tsx`

---

### US-005: Polish — Score Badge & Streak Integration
**Description:** Surface the user's MacroEvent score and tie correct streaks to bonus rewards.

**Acceptance Criteria:**
- [ ] In `MacroEventCard` after reveal: show a small badge "✓ 3 נכון ברציפות 🔥" if
  `correctCount` streak ≥ 3 (track in store as `currentStreak`)
- [ ] Add `currentStreak: number` to store; reset on wrong answer
- [ ] If streak reaches 5: award bonus 15 Coins + heavy haptic + ConfettiExplosion
- [ ] Add a summary pill visible between cards: "📊 המאקרו שלך: X/Y נכון"
  — show as a non-interactive mini-card between events in feed (optional, lowest priority)

**Files:** `src/features/macro-events/useMacroEventStore.ts` (update), `src/features/macro-events/MacroEventCard.tsx` (update)

---

## Execution Order
```
US-001 → types + data (no deps)
US-002 → store (depends on types)
US-003 → MacroEventCard (depends on types + store)
US-004 → feed integration (depends on all above)
US-005 → polish + streak bonus (depends on card + store)
```

## Architecture Notes
- Follows standard sim pattern: types → data → store → UI → integration
- No new navigation routes — purely a feed card
- CLASH theme throughout (DiamondBackground, CLASH.goldBorder, etc.)
- RTL text (writingDirection: 'rtl', textAlign: 'right')
- No `any` types
