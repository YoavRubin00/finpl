# PRD 40: Duolingo-Style UI Migration & Adaptive Theme

## Overview
Migrate the FinPL application's design language from "Clash Royale/Cyber-Finance" to a "Duolingo-style" aesthetic. This includes a shift to flat 3D components, high-contrast typography, and an adaptive color scheme (System Dark/Light mode).

**מטרה:** יצירת חווית משתמש נגישה, מודרנית ונקייה יותר, המזכירה אפליקציות למידה מובילות, תוך שמירה על ה-Core הקיים של האפליקציה.

---

## Core Features

### 1. Adaptive Design System (Dark/Light Mode)
- **Automatic Switching**: UI colors must automatically adjust based on the phone's system settings (`useColorScheme`).
- **Palettes**:
  - **Light**: White backgrounds (#FFFFFF), Dark Zinc text (#1F2937), Light Gray borders (#E5E7EB).
  - **Dark**: Deep Gray backgrounds (#1A1A1A), White text (#FFFFFF), Dark Gray borders (#333333).
- **Core Action Colors**: Green (#58CC02), Blue (#1CB0F6), Orange (#FF9600) — these remain vibrant in both modes.

### 2. 3D Flat UI Components
- **Duo-3D Buttons**: Solid background with a 4px bottom border (darker shade of the same color). No gradients.
- **Section Banners**: Flat, rounded-corner banners with distinct "Section/Unit" labeling and helper icons (Notebook).
- **Snake Path**: A winding, organic module path for the `DuoLearnScreen`.

### 3. Quiz Context Preservation
- **Legacy Protection**: All Quiz-related UI (MacroEventCard, LessonFlow, Quiz Buttons) will **RETAIN** their original design to preserve the user's favorite gameplay experience.

---

## Already Completed (Prior Work)

### US-001: Foundation & Theme ✅
- [x] `theme.ts` updated with `DUO` palette (light mode colors)
- [x] `useTheme` hook created at `src/hooks/useTheme.ts` — returns `DUO` or `DARK` based on `useColorScheme()`
- [x] `AppTheme` interface exported from useTheme.ts
- [x] `AppBackground` uses `useTheme()` for adaptive bg color

### US-003: The Snake Path ✅
- [x] `DuoLearnScreen` has unit banners (ArenaHeaderBanner) with "יחידה X" labels
- [x] Zigzag sine-wave snake path via `getNodeOffset()` function
- [x] PathConnector dots between nodes
- [x] Arena-specific icons and colored banners
- [x] Light background (#f8fafc)

---

## Remaining User Stories

### US-002: Header & Navigation — Adaptive Theme
**Description:** As a user, I want the header and tab bar to automatically adapt to my system's dark/light mode.

**Current State:**
- `GlobalWealthHeader` uses hard-coded light colors (#ffffff bg, #e5e7eb borders, #1f2937 text)
- `AnimatedTabBar` uses hard-coded light colors (#fafafa bg, static tab colors)
- Neither imports or uses `useTheme()` hook

**Acceptance Criteria:**
- [x] `GlobalWealthHeader` imports `useTheme()` and replaces all hard-coded colors with theme values
- [x] Background: `theme.bg` (light=#fff, dark=#1a1a1a)
- [x] Text: `theme.text` (light=#1f2937, dark=#ffffff)
- [x] Borders: `theme.border` (light=#e5e7eb, dark=#333333)
- [x] Muted text: `theme.textMuted`
- [x] Currency colors (coins gold, gems purple, hearts red) remain vibrant in both modes
- [x] `AnimatedTabBar` imports `useTheme()` and replaces hard-coded bg/border colors
- [x] Tab bar background: `theme.surface` (light=#fafafa, dark=#242424)
- [x] Tab bar top border: `theme.border`
- [x] Active tab colors remain vibrant (green, blue, orange, etc.) in both modes
- [x] Typecheck passes

### US-004a: SupercellButton Dark Mode
**Description:** As a user, I want the Duo-style buttons to look correct in dark mode.

**Current State:**
- `SupercellButton` has "duo" style with flat 3D design (solid + 4px bottom border) — GOOD
- `DUO_COLORS` object is hard-coded to light theme only
- Does not import `useTheme()`

**Acceptance Criteria:**
- [x] `SupercellButton` imports `useTheme()` hook
- [x] When style is "duo", background colors adapt: light uses current colors, dark uses `theme.surface` base with vibrant action colors
- [x] "duo" default variant: light bg=#e5e7eb / dark bg=#333333, text adapts
- [x] "duo" green/blue/orange/red variants: action colors stay vibrant, text stays white, bottom-border uses darker shade
- [x] "legacy" style remains unchanged (quiz context preservation)
- [x] Typecheck passes

### US-004b: Key Screens Dark Mode Sweep
**Description:** As a user, I want the main non-quiz screens to render correctly in dark mode.

**Current State:**
- Many screens use hard-coded white/light colors instead of `useTheme()`
- Screens to update: ShopScreen, ProfileScreen, MoreScreen, FinFeedScreen, PyramidScreen

**Acceptance Criteria:**
- [x] `ShopScreen` uses `useTheme()` for bg, surface, text, border colors
- [x] `ProfileScreen` uses `useTheme()` for bg, surface, text, border colors
- [x] `MoreScreen` uses `useTheme()` for bg, surface, text, border colors
- [x] `FinFeedScreen` card backgrounds and text use `useTheme()` where applicable
- [x] `PyramidScreen` uses `useTheme()` for bg, text colors
- [x] No changes to quiz/lesson flow screens (preserve Clash style)
- [x] Typecheck passes

### US-004c: Settings & Saved Items Dark Mode
**Description:** As a user, I want recently added screens to also support dark mode.

**Acceptance Criteria:**
- [x] `SavedItemsScreen` uses `useTheme()` for bg, surface, text, border colors
- [x] `SettingsScreen` (in MoreScreen or standalone) uses `useTheme()` for adaptive colors
- [x] `PricingScreen` uses `useTheme()` for bg, surface, text colors
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## Non-Goals
- Changing quiz/lesson UI (preserved as Clash style)
- Adding a manual dark/light toggle (system-only for now)
- Redesigning Lottie animations for dark mode

## Technical Notes

- **useTheme hook:** `src/hooks/useTheme.ts` — returns `AppTheme` with bg, surface, border, text, textMuted, green, greenDark, greenSurface, blue, blueDark, blueSurface, orange, orangeDark, orangeSurface, red, redDark, purple, purpleDark
- **Pattern:** `const theme = useTheme();` then use `theme.bg`, `theme.text`, etc. in styles
- **DUO palette:** Defined in `src/constants/theme.ts` as `DUO` export
- **DARK palette:** Defined inside `useTheme.ts` as local const
- **AppBackground:** Already uses `useTheme()` — reference implementation
- **Quiz preservation:** Do NOT touch `LessonFlowScreen`, `MacroEventCard`, quiz buttons, chapter sim screens
- **Pre-existing TS errors (safe to ignore):** FeedSidebar.tsx, useClashStore.ts, GlassOverlay.tsx, AssetsScreen.tsx
