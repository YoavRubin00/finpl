# PRD 16: Module Unlock Fix & Progression UX Enhancement

## Introduction
Modules inside chapters don't unlock after completing the previous module because `currentModuleIndex` never advances automatically. Additionally, the progression experience lacks emotional impact — completing modules and advancing through stages should feel increasingly rewarding with visual feedback that builds excitement toward financial freedom.

## Goals
- Fix: completing a module automatically unlocks the next one
- Enhance progression feel with celebratory feedback that escalates with advancement
- Add "next module" CTA in summary screen to keep flow going
- Show chapter completion celebration when all modules are done

## User Stories

### US-001: Auto-advance currentModuleIndex on module completion
**Description:** As a user, I want the next module to unlock automatically when I complete the current one so I can continue learning without getting stuck.

**Acceptance Criteria:**
- [ ] In `useChapterStore.completeModule()`, after adding moduleId to completedModules, advance `currentModuleIndex` to `completedModules.length` (the next unfinished module)
- [ ] Verify: completing module 0 sets currentModuleIndex to 1, unlocking module 1
- [ ] Verify: completing the last module in a chapter keeps currentModuleIndex at max
- [ ] Existing module completion rewards (XP/coins) still work
- [ ] Typecheck passes

### US-002: "Continue to next module" button in summary screen
**Description:** As a user, I want a "continue to next module" button after completing a module so I stay in flow instead of going back to the map.

**Acceptance Criteria:**
- [ ] In LessonFlowScreen summary phase, add "המשך למודול הבא" button below "חזרה לפרקים"
- [ ] Button navigates to next module in the same chapter (if exists)
- [ ] If last module in chapter, show "סיימת את הפרק!" message instead
- [ ] Button styled with chapter glow color and shimmer effect
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-003: Escalating completion celebration
**Description:** As a user, I want the completion screen to feel more exciting as I progress through later modules and chapters, reinforcing that I'm getting closer to financial freedom.

**Acceptance Criteria:**
- [ ] Summary screen shows module number context ("מודול 3 מתוך 5 הושלם!")
- [ ] Progress bar in summary showing chapter completion percentage
- [ ] Motivational message changes based on progress (25% = "התחלה טובה!", 50% = "באמצע הדרך!", 75% = "כמעט שם!", 100% = "פרק הושלם!")
- [ ] Chapter 5 completion shows special "graduation" message: "השלמת את כל המסע הפיננסי!"
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Chapter completion celebration
**Description:** As a user, I want a special celebration when I complete all modules in a chapter so the achievement feels meaningful.

**Acceptance Criteria:**
- [ ] When last module in chapter is completed, show a full-screen celebration overlay
- [ ] Overlay includes: confetti effect (reuse ConfettiExplosion if exists), chapter name, "פרק הושלם!" title
- [ ] Shows XP bonus text "+50 XP בונוס פרק!" (bonus granted in store)
- [ ] Add `completeChapterBonus` action to useChapterStore that grants 50 bonus XP
- [ ] Auto-dismiss after 3 seconds or on tap
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- No changes to quiz logic or flashcard flow
- No new chapter content
- No backend/API changes
- No arena/pyramid screen changes (covered by PRD 15)

## Technical Notes
- `useChapterStore.completeModule()` is the single mutation point — fix goes there
- `LessonFlowScreen` already has access to chapterId and module index
- Reuse `ConfettiExplosion` from `src/components/ui/ConfettiExplosion.tsx` if it exists
- Reuse `GlowCard`, `AnimatedPressable` for new buttons
- Chapter data accessible via CHAPTER_DATA_MAP in LessonFlowScreen
