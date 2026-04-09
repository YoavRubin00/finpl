# PRD 17: Learning Page Arena Integration & Gamification

## Introduction
While the base components for the Clash Royale-style Arena redesign (PRD 15) were developed, they were never assembled into the main `PyramidScreen`. Furthermore, to match the app's high standards of gamification and Gen-Z aesthetics, these components need an upgrade with rich haptics, intense glowing animations, and deep user feedback.

We are handling this implementation utilizing the tight "Ralph" execution loop methodology found in the BASE folder: one task per cycle, strict tracking in `progress17.txt`, and verifiable success.

## Goals
- Assemble the `PyramidScreen` using the previously built Arena components but applying a "million dollar app" aesthetic (wealthy, deep gold/green colors, 3D glinting effects).
- Rename Arenas to match Chapter themes (Survival, Security, Stability, Growth, Freedom).
- Add new localized Bear Mascots (`ASSETS` animations) to each Arena stage card.
- Introduce dynamic Chest Drops: Reguler chests for module completion, Premium chests for chapter/arena completion, featuring randomized drops (Gems, Coins, XP).
- Display a random "Wisdom Flash" (Financial Insight) immediately upon completing any module.
- Ensure execution follows the Ralph process constraint (Task -> Test -> Progress Log -> Commit).

## User Stories

### US-001: Establish & Connect Arena Layout
**Description:** As a user, I want to see the Arena components instead of the old Visual Pyramid when I open the Learning tab.

**Acceptance Criteria:**
- [x] In `PyramidScreen.tsx`, remove `<VisualPyramid />`.
- [x] Import and assemble: `ArenaRankBadge`, `ArenaStatsBar`, `DailyChallengePrompt`, and map over the arenas using `ArenaConnector` and `ArenaStageCard`.
- [x] Run typescript typecheck safely.

### US-002: Gamify Arena Stage Cards & Mascots
**Description:** As a user, I want the arena stage representations to feel heavy, tactile, and feature a companion bear mascot so it feels like a high-end game.

**Acceptance Criteria:**
- [x] In `ArenaStageCard.tsx`, add an `onPressIn` and `onPressOut` scaling animation so the card physically depresses when touched.
- [x] Add the animated Bear Mascot (from assets folder) to the card layout (sitting on or beside the arena).
- [x] Inject `successHaptic()` whenever an unlocked arena is pressed, before navigating to the chapter.
- [x] Make the "Locked" arenas trigger an error haptic if tapped.
- [x] Run typescript typecheck safely.

### US-003: Sub-Chapter & Arena Chest Rewards
**Description:** As a user, I want to receive a Loot Chest when I finish a sub-module (regular) or an entire arena (premium), with random drops like a true mobile game.

**Acceptance Criteria:**
- [x] Create/Update a post-module flow to trigger a Loot Box presentation.
- [x] If completing a module: Award *Regular Chest*. If completing an Arena: Award *Premium Chest*.
- [x] Implement a randomized reward drop logic giving varying amounts of Coins, XP, and potentially Premium Currency (Gems/Diamonds).
- [x] Provide a rich, 3D-feeling unboxing effect using existing Confetti/Shaking animations.
- [x] Run typescript typecheck safely.

### US-004: End-of-Module Wisdom Flashes
**Description:** As a user, I want to see a random financial insight immediately following module completion to reinforce my learning.

**Acceptance Criteria:**
- [x] After the module/quiz completes (and after rendering the chest), display a rich modal/card with a "Wisdom Flash" (תובנה פיננסית).
- [x] The text should be pulled randomly from a predefined list of golden rules (e.g., compound interest, 50/30/20).
- [x] The UI must match the "Million Dollar App" aesthetic with gold foil borders or dark rich gradients.
- [x] Run typescript typecheck safely.

## Execution Rules (Ralph Protocol)
- Do exactly ONE checked task at a time.
- Update `progress17.txt` continuously.
- Validate via `npx tsc --noEmit` before marking complete.
