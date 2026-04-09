# PRD 21 - The Unified Gamification & Retention Ecosystem (Fin-conomy)

## Introduction
Following a comprehensive codebase scan, it is clear that the current retention mechanisms are highly fragmented across different screens:
- `FinFeedScreen`: Shows Streak and Chests, but no Coins or Gems.
- `PyramidScreen` (`ArenaStatsBar`): Shows XP, Coins, and Streak, but no Hearts or Gems.
- `LessonFlowScreen`: Shows Hearts, but no other wealth indicators.
- **Gems** are awarded from Premium Chests, but literally *nowhere in the app* is the user's Gem balance displayed.

This PRD redesigns the entire Gamification ecosystem, ensuring that every action feeds into a cohesive progression loop that encourages daily retention, clear monetization paths (PRO upsell), and makes the rewards feel deeply satisfying on a unified interface.

## Goal
To build a cohesive "Fin-conomy" where:
1. **Hearts/Lives** create a direct monetization loop. If you run out during learning, you are prompted to buy more with Coins or upgrade to PRO.
2. **XP** dictates Player Level and Rank (giving it actual visual meaning).
3. **Coins** are the primary currency used to refill Hearts or buy cosmetics.
4. **Gems** are the premium currency used to instantly unlock chests or buy exclusive items.
5. **Streaks** multiply everything.
6. A single, global **WealthHeader** replaces the fragmented headers.

## User Stories

### US-001: The Global Wealth Header (One Header to Rule Them All)
**Description:** As a user, I want a single, premium header across the main app screens that displays my complete wealth (Hearts, Coins, Gems, Streak).

**Acceptance Criteria:**
- [x] Create `GlobalWealthHeader.tsx`.
- [x] Display `Streak` (fire), `Coins` (gold), `Gems` (diamond), and `Hearts/Lives` (red heart).
- [x] Replace `FeedHeader`'s stat display in `FinFeedScreen` with this.
- [x] Replace `ArenaStatsBar` in `PyramidScreen` with this.
- [x] Ensure `LessonFlowScreen` includes this exact same header layout.
- [x] Ensure number animations (counting up/down) when balances change.
- [x] Tapping any currency opens the Shop Modal.

### US-002: Economy Breakdown & The Shop Upgrade
**Description:** As a user, I need to know what I can actually do with my Coins and Gems, and a place to refill my Hearts.

**Acceptance Criteria:**
- [x] Update the existing `ShopScreen.tsx` / `ShopItemCard.tsx`.
- [x] Show the user's Gem balance (currently missing).
- [x] Add Gem sinks: "Skip Chest Timer - 5 Gems", "Premium Avatar - 50 Gems".
- [x] Ensure Heart refills cost Coins (already there, but needs better UI highlighting).
- [x] Incorporate a glowing "Upgrade to PRO" banner at the top of the shop.

### US-003: Integrated Hearts UX & PRO Upsell in Learning Flow
**Description:** As a user, when I answer incorrectly in a lesson, I need to feel the loss of a heart, leading to a strong PRO upsell if I run out.

**Acceptance Criteria:**
- [x] `LessonFlowScreen` must clearly animate the heart breaking/draining when an answer is wrong.
- [x] Verify `OutOfHeartsModal` triggers correctly and offers the 3 choices:
   1. Pay X Coins to refill.
   2. "Upgrade to PRO for Unlimited Lives".
   3. "Wait X hours".

### US-004: Unified Chest Flow & UI
**Description:** As a user, when I win a chest, it should feel connected to the rest of the game, not just a random popup.

**Acceptance Criteria:**
- [x] In `LessonFlowScreen` summary: animate a chest flying into the `ChestSlot` inventory.
- [x] If slots are full (4/4), prompt the user: "Slots full! Spend 10 Gems to open one now, or discard."
- [x] Integrate gem-spending logic into `ChestsRow.tsx` (allow users to click an unlocking chest and pay Gems to open it immediately).

### US-005: Streak Multiplier System
**Description:** As a user, my daily streak should mathematically matter.

**Acceptance Criteria:**
- [x] Update `chestDrops.ts`: Apply a streak multiplier. For every 7 days of streak, base coin and XP drops from chests increase by 10%.
- [x] Visually show "Streak Bonus +XX%" during the chest unboxing sequence.

### US-006: Leveling Up (XP -> Level)
**Description:** As a user, my XP should translate into a clear level that I can show off.

**Acceptance Criteria:**
- [x] Create logic mapping `XP` to `Level`.
- [x] Add a visual level ring around the user's avatar in the `GlobalWealthHeader`.

### US-007: Emotional UX — The "Finn" Mascot (Lottie)
**Description:** As a user, I want the app to feel alive and empathetic to my learning journey.

**Acceptance Criteria:**
- [x] Install `lottie-react-native` and configure it in the project.
- [x] Obtain/Export Lottie JSON animations for the "Finn" mascot (Idle, Celebrate, Empathy/Sad, Thinking).
- [x] Integrate the Lottie mascot into `InteractiveIntroCard` to greet the user.
- [x] Integrate into `QuizCard` and `LessonFlowScreen` summary, changing state based on correct/wrong answers.

### US-008: Emotional UX — Bouncy Micro-Interactions & Haptics
**Description:** As a user, every button press and interaction should feel satisfying, elastic, and rewarding.

**Acceptance Criteria:**
- [x] Ensure all primary interactive buttons (like quiz options) use `withSpring` (Bounce effect) on press.
- [x] Expand the use of `expo-haptics` to trigger light ticks on small actions, and heavy success bursts on major wins.
- [x] Add visual particle emitters (coin blasts, sparkles) on streak gains and level-ups.

## Execution Rules
- Built in isolated steps using the Ralph protocol.
- Rely heavily on `react-native-reanimated`.
- The UI MUST maintain the "Million Dollar" aesthetic.
