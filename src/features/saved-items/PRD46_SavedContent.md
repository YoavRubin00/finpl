# PRD 46: Saved Content (PRO) — פריטים שמורים

## Introduction

משתמשי PRO רוצים לשמור תכנים (שיעורים, סימולציות, פריטי פיד) לגישה מהירה. PRD זה מוסיף מערכת bookmarks עם Zustand store, כפתורי שמירה בממשקי הלמידה והפיד, ומסך "פריטים שמורים" נגיש מ"עוד".

## Goals

- מערכת סימניות מלאה עם persist
- כפתור bookmark בשיעורים ובפיד
- מסך "פריטים שמורים" עם ניווט ישיר לתוכן
- גייטינג PRO — משתמשי חינם רואים upsell, PRO שומרים

## User Stories

### US-001: SavedItem Types + Zustand Store
**Description:** As a developer, I want a store for saved items so that bookmarks persist across sessions.

**Acceptance Criteria:**
- [x] Create `src/features/saved-items/savedItemTypes.ts` with `SavedItem` interface: `id: string`, `type: "lesson" | "sim" | "feed"`, `title: string`, `chapterId?: number`, `moduleId?: string`, `feedItemId?: string`, `savedAt: string` (ISO)
- [x] Create `src/features/saved-items/useSavedItemsStore.ts` with Zustand + persist (AsyncStorage)
- [x] Actions: `addItem(item: Omit<SavedItem, "savedAt">)`, `removeItem(id: string)`, `isSaved(id: string): boolean`, `getByType(type: SavedItem["type"]): SavedItem[]`
- [x] Max 50 saved items (oldest auto-removed when exceeded)
- [x] Typecheck passes

### US-002: SavedItemsScreen — מסך פריטים שמורים
**Description:** As a PRO user, I want a screen showing my saved content so I can quickly access it.

**Acceptance Criteria:**
- [x] Create `src/features/saved-items/SavedItemsScreen.tsx`
- [x] Create route `app/saved-items.tsx`
- [x] Three sections with Lottie headers: "שיעורים" (book), "סימולציות" (gaming), "פיד" (news)
- [x] Each item row: title + saved date + delete (trash icon) + tap to navigate
- [x] Empty state: Lottie bookmark animation + "עדיין לא שמרת תכנים" text
- [x] RTL layout (`writingDirection: 'rtl'`, `textAlign: 'right'`)
- [x] Light theme matching SettingsScreen (white bg, green `#16a34a` accents)
- [x] Back button (expo-router back)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-003: Bookmark Button on LessonFlowScreen
**Description:** As a PRO user, I want to bookmark lessons so I can return to them later.

**Acceptance Criteria:**
- [x] Add bookmark icon (Bookmark from lucide) in LessonFlowScreen header area
- [x] Tap toggles save/unsave via `useSavedItemsStore`
- [x] Filled icon when saved, outline when not
- [x] Non-PRO tap: open UpgradeModal via `useUpgradeModalStore.open("saved_items")`
- [x] Save with `type: "lesson"`, `title` from module data, `chapterId` + `moduleId`
- [x] Typecheck passes

### US-004: Bookmark Button on FinFeed Items
**Description:** As a PRO user, I want to save feed items for later reference.

**Acceptance Criteria:**
- [x] Add bookmark icon on each FeedVideoItem and FeedQuoteItem
- [x] Positioned top-left (RTL), semi-transparent background
- [x] Tap toggles save/unsave via `useSavedItemsStore`
- [x] Non-PRO tap: open UpgradeModal via `useUpgradeModalStore.open("saved_items")`
- [x] Save with `type: "feed"`, `title` from feed item, `feedItemId`
- [x] Typecheck passes

### US-005: Wire MoreScreen + Navigation
**Description:** As a user, I want "פריטים שמורים" in More to open the saved items screen.

**Acceptance Criteria:**
- [x] MoreScreen "פריטים שמורים" row: replace Alert with `router.push("/saved-items")`
- [x] Keep PRO badge on the row
- [x] SavedItemsScreen: if not PRO, show full-screen upsell overlay (Lottie Pro Animation + "שדרג ל-PRO" button → `/pricing`)
- [x] If PRO, show saved items list normally
- [x] Tap on saved lesson → navigate to `/lesson-flow` with correct chapter/module params
- [x] Tap on saved feed item → navigate to main FinFeed tab
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals

- Cloud sync of saved items (local-only for now)
- Saved items in search results
- Sharing saved items
- Folders/categories for saved items
- Saving from chat or simulator screens

## Technical Notes

- **Existing stores:** `useSubscriptionStore` (`isPro()`), `useUpgradeModalStore` (`.open(feature)`)
- **Existing patterns:** `useProFeature` hook for PRO gating
- **MoreScreen row:** Currently shows `Alert.alert("פיצ'ר PRO", ...)` — replace with navigation
- **LessonFlowScreen:** `src/features/chapter-1-content/LessonFlowScreen.tsx` — add bookmark to header
- **Feed items:** `src/features/finfeed/FeedVideoItem.tsx`, `FeedQuoteItem.tsx`
- **Lottie assets:** bookmark (`wired-flat-400-bookmark-hover-flutter.json`), book (`wired-flat-779-books-hover-hit.json`), gaming (`gaming.json`), news (`wired-flat-411-news-newspaper-hover-pinch.json`)
- **Route pattern:** `app/saved-items.tsx` → re-export from `src/features/saved-items/SavedItemsScreen.tsx`
- **Pre-existing TS errors (safe to ignore):** FeedSidebar.tsx, useClashStore.ts, GlassOverlay.tsx, AssetsScreen.tsx
