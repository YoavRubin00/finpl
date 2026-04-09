# PRD: מרחב הפתעות ופינת כיף — Captain Shark Fun Features

## Introduction
הוספת שכבת הומור, הפתעות ו-Easter Eggs לאפליקציית FinPlay כדי להוריד עומס קוגניטיבי, להעלות מעורבות (engagement/retention), ולהפוך את חוויית הלמידה הפיננסית למהנה יותר. כל הפיצ'רים מבוססי דמות — קפטן שארק (פין) הוא המנחה.

## Goals
- העלאת זמן שהייה יומי ב-15%+ דרך תוכן מפתיע
- הפחתת נטישה במודולים ארוכים באמצעות "הפסקות מם"
- יצירת ויראליות דרך תוכן שניתן לשתף (מדד הפיצות)
- תגמול חקרנות — Easter Eggs במפת הלמידה

## User Stories

### US-001: Zustand Store למצב הפתעות
**Description:** As a developer, I want a centralized store for fun/easter-egg state so that all fun features share a single source of truth.

**Acceptance Criteria:**
- [x] Create `src/stores/useFunStore.ts` with Zustand + persist
- [x] State: `{ hasUnreadMail: boolean, mailContent: { joke: string, fact: string } | null, easterEggNodeId: string | null, lastMailDate: string | null, pizzaIndexSeen: boolean }`
- [x] Actions: `refreshMail()` — picks random joke+fact if lastMailDate !== today
- [x] Actions: `openMail()` — sets hasUnreadMail=false
- [x] Actions: `rollEasterEgg(completedModules: string[])` — 20% chance to place coin on random completed node
- [x] Actions: `claimEasterEgg()` — grants 15 XP + 10 coins, clears easterEggNodeId
- [x] Persisted via AsyncStorage key `fun-store`
- [x] Typecheck passes

### US-002: מאגר בדיחות ועובדות של קפטן שארק
**Description:** As a content creator, I want a data file with Captain Shark's jokes and financial fun facts so that the mail and meme features have content.

**Acceptance Criteria:**
- [x] Create `src/features/fun/finnJokesData.ts`
- [x] Export `FINN_DAD_JOKES: string[]` — 20+ Hebrew dad jokes about money/finance
- [x] Export `FINN_FUN_FACTS: string[]` — 20+ surprising financial trivia facts in Hebrew
- [x] Export `FINN_MEME_REACTIONS: string[]` — 10+ one-liner reactions for meme flashcards
- [x] All content is Hebrew, Gen-Z friendly, financially relevant
- [x] Typecheck passes

### US-003: דואר מקפטן שארק — Mail Icon בהדר
**Description:** As a user, I want to see a mail notification icon in the header when Captain Shark has a message for me so that I'm drawn to open it.

**Acceptance Criteria:**
- [x] In `GlobalWealthHeader.tsx`, add a small mail Lottie icon (16px) next to the settings icon
- [x] Icon only visible when `useFunStore().hasUnreadMail === true`
- [x] Icon has a subtle pulse animation (Reanimated withRepeat)
- [x] Pressing icon opens `FinnMailModal`
- [x] Typecheck passes

### US-004: דואר מקפטן שארק — Modal תוכן
**Description:** As a user, I want to read Captain Shark's daily joke and fun fact in a friendly modal so that I smile and learn something surprising.

**Acceptance Criteria:**
- [x] Create `src/features/fun/FinnMailModal.tsx`
- [x] Modal shows: Finn WebP (FINN_HAPPY, 100x100) + "דואר מקפטן שארק" title
- [x] Body: joke in speech bubble style + fun fact in info card style
- [x] "סגור" button at bottom
- [x] On open: calls `useFunStore().openMail()`
- [x] STITCH design — white card, soft shadow, blue accents
- [x] Typecheck passes

### US-005: הפסקת מם — סוג כרטיסיה חדש
**Description:** As a user, I want occasional meme flashcards between learning content so that I get a humor break during long modules.

**Acceptance Criteria:**
- [x] Add `isMeme?: boolean` and `memeImageUri?: string` to `Flashcard` interface in `types.ts`
- [x] In `LessonFlowScreen.tsx` FlashcardCard, if `card.isMeme`: render dark card with meme image + Finn reaction text
- [x] Meme card has "😂" tap reaction animation + "המשך" button
- [x] No XP/progress from meme cards — purely entertainment
- [x] Add 1 meme card to mod-1-1 (after fc-1-1-3) and mod-1-2 (after fc-1-2-3) as examples
- [x] Typecheck passes

### US-006: Easter Egg מטבע במפת הלמידה
**Description:** As a user, I want to discover hidden coins on the learning map so that I'm rewarded for exploring completed areas.

**Acceptance Criteria:**
- [x] In `DuoLearnScreen.tsx`, after rendering completed ModuleNodes, check `useFunStore().easterEggNodeId`
- [x] If matches a completed node: render a small bouncing gold Lottie coin (24px) above the node
- [x] Lottie: `wired-flat-298-coins-hover-jump.json` with pulse animation
- [x] On press: `claimEasterEgg()` → flying coins animation + "+15 XP +10 coins" toast
- [x] Easter egg rolls on app open (in DuoLearnScreen useFocusEffect) — 20% chance
- [x] Typecheck passes

### US-007: מדד הפיצות — מסך סטטיסטיקה הומוריסטית
**Description:** As a user, I want to see funny financial statistics about my spending in pizza/coffee units so that I can share them with friends.

**Acceptance Criteria:**
- [x] Create `src/features/fun/PizzaIndexScreen.tsx`
- [x] Shows 4 humorous stat cards based on user's XP/coins/streak data:
  - "כמה פיצות שווה ה-XP שלך" (XP / 35 = pizzas)
  - "כמה ימי קפה זה הרצף שלך" (streak days)
  - "אם היית משקיע את המטבעות שלך בריבית דריבית" (compound calc)
  - "הדירוג שלך בין חברי הסקוואד" (mock leaderboard)
- [x] Each card: Lottie icon + funny Hebrew text + big number
- [x] "שתף עם חברים" button (uses Share API)
- [x] Add route `app/pizza-index.tsx` and link from MoreScreen
- [x] Typecheck passes

### US-008: אינטגרציה במסך "עוד"
**Description:** As a user, I want to access Captain Shark's fun features from the More screen so that they're discoverable.

**Acceptance Criteria:**
- [x] In `MoreScreen.tsx`, add new "פינת הכיף" section between Features and Account
- [x] Two rows: "דואר מקפטן שארק" (opens FinnMailModal) + "מדד הפיצות" (navigates to PizzaIndexScreen)
- [x] Use fun Lottie icons for both rows
- [x] Badge on mail row when unread (`useFunStore().hasUnreadMail`)
- [x] Typecheck passes

## Non-Goals
- No real money or IAP tied to fun features
- No social/competitive leaderboard (mock only in Pizza Index)
- No user-generated meme content
- No push notifications for fun features (only in-app)
- No server-side logic — all client-side with Zustand

## Technical Notes
- **Reuse:** `FINN_HAPPY`/`FINN_STANDARD` WebP from `finnMascotConfig.ts`
- **Reuse:** `FlyingRewards` component for Easter egg coin claim
- **Reuse:** `GlowCard` for stat cards in Pizza Index
- **Reuse:** `useSoundEffect` for tap/claim sounds
- **Reuse:** `AnimatedPressable` for all interactive elements
- **Pattern:** Follow existing Zustand store pattern (persist + AsyncStorage)
- **Design:** STITCH design system — soft shadows, blue accents, no emojis in UI text (Lottie icons instead)
- **Existing assets:** `wired-flat-298-coins-hover-jump.json`, `wired-flat-412-gift-hover-squeeze.json`, `wired-flat-411-news-newspaper-hover-pinch.json`
