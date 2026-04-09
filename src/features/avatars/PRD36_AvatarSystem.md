# PRD 36: Avatar System

## Overview
Users choose a personal avatar at registration. The avatar appears on the Profile screen and as a greeting in the home header. Premium avatars can be purchased with Gems in the Shop. The avatar creates identity and a sense of progression.

## Goal
1. **Identity** — User picks an avatar during onboarding.
2. **Visibility** — Avatar is displayed in ProfileScreen header and GlobalWealthHeader greeting.
3. **Monetization** — Premium avatars purchasable in Shop (new "Avatars" category).

## Data Model

`avatarId: string` stored in `useAuthStore` profile.

Avatar definitions live in `src/features/avatars/avatarData.ts`:

| avatarId | emoji | name (Hebrew) | gemCost |
|----------|-------|---------------|---------|
| lion | 🦁 | הלוחם | 0 (free) |
| fox | 🦊 | החכם | 0 (free) |
| wolf | 🐺 | הצייד | 0 (free) |
| eagle | 🦅 | החזון | 0 (free) |
| dolphin | 🐬 | החברותי | 0 (free) |
| turtle | 🐢 | הסבלני | 0 (free) |
| king | 👑 | המלוכה | 50 (premium) |
| robot | 🤖 | FinBot AI | 75 (premium) |
| unicorn | 🦄 | הנדיר | 100 (premium) |
| diamond | 💎 | הפרימיום | 150 (premium) |

## User Stories

### US-001: Avatar Selection Step in Onboarding
**Description:** As a new user, after profiling I should choose my avatar before entering the app.

**Acceptance Criteria:**
- [x] Add `avatarId: string | null` to `UserProfile` in `src/features/auth/types.ts`.
- [x] Add `setAvatar(id: string)` action to `useAuthStore`.
- [x] Create `avatarData.ts` with AVATAR_LIST (emoji, name, gemCost, isLocked).
- [x] Add `AvatarPickerStep` screen in `ProfilingFlow.tsx` — displayed as the last step before `completeOnboarding`.
- [x] Grid of 6 free avatars displayed; selecting one animates a scale bounce and gold border highlight.
- [x] "Continue" button calls `setAvatar(id)` then `completeOnboarding`.

### US-002: Show Avatar in ProfileScreen
**Description:** As a user, my chosen avatar should appear at the top of my Profile page.

**Acceptance Criteria:**
- [x] Replace the generic placeholder/icon at the top of `ProfileScreen.tsx` with a large avatar bubble (80×80, gold border, shadow glow).
- [x] Show avatar emoji centered in a styled circle (DiamondBackground colors).
- [x] Show the avatar's Hebrew name below it (e.g., "הלוחם").
- [x] If no avatar set (null), show default 🎮 emoji.

### US-003: Show Avatar in GlobalWealthHeader
**Description:** As a user, my avatar should greet me in the home feed top bar.

**Acceptance Criteria:**
- [x] Add a small (32×32) avatar bubble in `GlobalWealthHeader.tsx` — positioned at the right edge (RTL: leading side).
- [x] Tapping it navigates to `/(tabs)/profile`.
- [x] If no avatar selected, show default 🎮 emoji.

### US-004: Premium Avatars in Shop
**Description:** As a user, I can purchase premium avatars in the Shop to personalize my identity.

**Acceptance Criteria:**
- [x] Add `'avatars'` to `ShopCategory` type in `src/features/shop/types.ts`.
- [x] Add `'🦸 אווטארים'` tab to `SHOP_CATEGORIES` in `shopItems.ts`.
- [x] Add premium avatars (king, robot, unicorn, diamond) to `SHOP_ITEMS` with `gemCost`.
- [x] When purchased, call `setAvatar(avatarId)` — equips immediately.
- [x] Show "מצויד" (equipped) badge if currently active, "רכוש" button otherwise.
- [x] If user already owns it (tracked via `ownedAvatars: string[]` in `useAuthStore`), show "החלף" instead of cost.

## Execution Rules
- All new files in `src/features/avatars/` except store changes (go in `useAuthStore`)
- `AvatarPickerStep` is a new exported component inside `ProfilingFlow.tsx`
- Shop avatar items use `id` format: `avatar-king`, `avatar-robot`, etc.
- Premium avatars require `ownedAvatars` array in useAuthStore to track purchases without repeating gem cost
