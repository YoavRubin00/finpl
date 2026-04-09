# PRD 15: Learn Page Arena Redesign

## Introduction
The current Learn page (PyramidScreen) feels generic and lacks the gaming energy expected from FinPL's Gen-Z audience. This redesign transforms it into a Clash Royale-inspired arena system with 5 financial arenas, replacing the flat bridge/pyramid layout with an immersive, progression-driven experience. The bear mascot and lives system are replaced with an arena rank badge and streak-flame mascot.

## Goals
- Transform the learn page into a visually striking arena-based progression map
- Create a Clash Royale-inspired aesthetic with arena tiers, rank badges, and dramatic transitions
- Add retention features: streak display, daily challenge prompt, XP milestones
- Replace bear mascot with dynamic arena rank badge
- Make progression feel rewarding and status clearly visible

## User Stories

### US-001: Arena types and configuration data
**Description:** As a developer, I want arena tier configuration data so that the UI can render 5 distinct arenas with names, colors, icons, and XP thresholds.

**Acceptance Criteria:**
- [ ] Create `arenaConfig.ts` in `src/features/pyramid/` with ArenaConfig interface
- [ ] 5 arenas: Rookie Camp (green), Shield Fortress (blue), Balance Citadel (purple), Growth Tower (gold), Freedom Summit (platinum/silver)
- [ ] Each arena has: id, name (Hebrew), subtitle, gradient colors, glow color, icon emoji, XP threshold
- [ ] Export ARENAS array and helper `getArenaForXP(xp): ArenaConfig`
- [ ] Typecheck passes

### US-002: Arena rank badge component
**Description:** As a user, I want to see my current arena rank as a prominent badge so I feel a sense of status and achievement.

**Acceptance Criteria:**
- [ ] Create `ArenaRankBadge.tsx` component in `src/features/pyramid/`
- [ ] Displays current arena emoji inside a hexagonal/shield-shaped container
- [ ] Arena glow color used for border and shadow
- [ ] Breathing glow animation on the badge (Reanimated)
- [ ] Shows arena name below the badge in Hebrew
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-003: Arena stage card component
**Description:** As a user, I want each arena displayed as a dramatic card so I can see my progression path clearly.

**Acceptance Criteria:**
- [ ] Create `ArenaStageCard.tsx` in `src/features/pyramid/`
- [ ] Active arenas show gradient background with arena colors, locked arenas show dark/muted
- [ ] Current arena has pulsing glow border and progress bar
- [ ] Completed arenas show trophy/check icon with subtle shimmer
- [ ] Locked arenas show lock icon with "X XP needed" text
- [ ] Card press navigates to chapter route (reuse LAYER_CHAPTER_ROUTE mapping)
- [ ] Entrance animation: staggered fadeInUp per card
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Arena connector component
**Description:** As a user, I want visual connectors between arenas so the progression path feels like a journey.

**Acceptance Criteria:**
- [ ] Create `ArenaConnector.tsx` in `src/features/pyramid/`
- [ ] Vertical connector line between cards
- [ ] Active connectors show gradient matching arena colors with animated energy pulse
- [ ] Inactive connectors show dark muted line
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Stats bar (streak + XP + coins)
**Description:** As a user, I want to see my key stats at the top of the learn page so I know my current standing.

**Acceptance Criteria:**
- [ ] Create `ArenaStatsBar.tsx` in `src/features/pyramid/`
- [ ] Shows streak (flame icon + count), total XP (star icon), coins (coin icon)
- [ ] Data sourced from useEconomyStore
- [ ] Compact horizontal layout with RTL support
- [ ] Subtle entrance animation
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-006: Daily challenge prompt
**Description:** As a user, I want a daily challenge prompt on the learn page so I have a reason to engage every day.

**Acceptance Criteria:**
- [ ] Create `DailyChallengePrompt.tsx` in `src/features/pyramid/`
- [ ] Shows a motivational card: "האתגר היומי שלך" with XP reward preview
- [ ] Pressing navigates to the current active chapter
- [ ] GlowCard-style design with shimmer effect
- [ ] Only shows if daily task not yet completed (from economy store)
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-007: Assemble new PyramidScreen
**Description:** As a user, I want the full arena learn page assembled so I experience the complete redesigned flow.

**Acceptance Criteria:**
- [ ] Replace VisualPyramid content in PyramidScreen with new components
- [ ] Layout order: ArenaRankBadge → ArenaStatsBar → DailyChallengePrompt → Arena cards with connectors
- [ ] Background gradient updated to dark arena theme (#0a0a1a → #1a1035 → #0a0a1a)
- [ ] Remove old bear mascot, LivesDisplay, and BridgeConnector/BridgeStage
- [ ] All navigation routes preserved
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- No backend/API changes — all data from existing Zustand stores
- No new chapter content — only the learn page shell
- No sound effects (future PRD)
- No arena unlock animation sequence (future PRD)
- No leaderboard integration (future PRD)

## Technical Notes
- Reuse `GlowCard` for daily challenge card
- Reuse `useEconomyStore` for XP/coins/streak
- Reuse `getPyramidStatus()` from `src/utils/progression.ts` for layer calculation
- Keep existing chapter navigation routes (`/chapter/chapter-1` through `/chapter/chapter-5`)
- All animations via `react-native-reanimated` + shared animation utils
- RTL support mandatory on all text elements
