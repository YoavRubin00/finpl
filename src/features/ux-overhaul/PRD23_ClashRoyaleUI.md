# PRD 23 - Clash Royale UI Overhaul: Premium Gaming Skin

## Introduction
שדרוג ויזואלי מלא של כל האפליקציה לסגנון Clash Royale — רקע כחול עם דפוס יהלומים, גבולות זהב עבים, טיפוגרפיה בולטת עם צל, כפתורים ירוקים/כתומים גדולים, ואפקטי ברק.
המטרה: להפוך את FinPlay מאפליקציית למידה פשוטה ל**חוויית גיימינג פרימיום** שמרגישה כמו משחק מובייל AAA.

## Goals
- רקע diamond-pattern כחול בכל מסך (כמו Clash Royale)
- גבולות זהב (#d4a017 → #f5c842) על כל כרטיס ו-container
- טיפוגרפיה bold עם text shadow (Supercell feel)
- כפתורי CTA ירוקים וכתומים עם gradient + border
- Badge-ים עגולים עם גבול זהב (אווטר, אייקונים)
- Banner/ribbon headers עם צורת טרפז וגבולות זהב
- Tab bar תחתון עם אייקונים גדולים ו-notification badges אדומים
- Sparkle/particle effects ברקע
- כרטיסי מבצע עם gradient borders צבעוניים (זהב, כחול, ירוק, סגול)
- שימור מלא של RTL עברית

## User Stories

### US-001: Create DiamondBackground shared component
**Description:** As a player, I want to see the iconic blue diamond-pattern background on every screen, giving the app a premium Clash Royale feel.

**Acceptance Criteria:**
- [x] Create `src/components/ui/DiamondBackground.tsx`
- [x] Renders a full-screen background with blue diagonal diamond/rhombus tiling pattern
- [x] Base color: deep royal blue (#1a3a5c → #0d2847 gradient top to bottom)
- [x] Diamond lines: lighter blue (#2a5a8c) at 10% opacity, rotated 45deg grid
- [x] Implementation: use `react-native-svg` to draw a repeating diamond pattern, OR use a pre-made SVG pattern, OR use `expo-linear-gradient` with overlaid rotated Views
- [x] Component wraps children and fills the screen (position absolute, zIndex -1)
- [x] Export from `src/components/ui/`
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-002: Create GoldBorderCard component
**Description:** As a player, I want every card/container to have thick golden borders like Clash Royale offer cards.

**Acceptance Criteria:**
- [x] Create `src/components/ui/GoldBorderCard.tsx`
- [x] Props: `children`, `variant?: 'gold' | 'blue' | 'green' | 'purple' | 'orange'` (default: gold)
- [x] Each variant has a 2-3px border with matching gradient colors:
  - `gold`: border #d4a017 → #f5c842, inner glow rgba(212,160,23,0.15)
  - `blue`: border #2563eb → #60a5fa, inner glow rgba(37,99,235,0.15)
  - `green`: border #16a34a → #4ade80, inner glow rgba(22,163,74,0.15)
  - `purple`: border #7c3aed → #a78bfa, inner glow rgba(124,58,237,0.15)
  - `orange`: border #ea580c → #fb923c, inner glow rgba(234,88,12,0.15)
- [x] Background: dark semi-transparent (#0a1628 at 85% opacity)
- [x] Border radius: 16px
- [x] Optional `shimmer?: boolean` prop — when true, a subtle gold shimmer sweeps across the border
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-003: Create BannerRibbon header component
**Description:** As a player, I want section headers styled as gold-bordered ribbon banners (trapezoid shape) like Clash Royale's "Offers", "Champion's Path" headers.

**Acceptance Criteria:**
- [x] Create `src/components/ui/BannerRibbon.tsx`
- [x] Renders a horizontal banner with:
  - Background: linear gradient blue (#1e40af → #2563eb)
  - Gold border top and bottom (2px, #d4a017)
  - Left and right edges: small triangular notch/fold (CSS trick or SVG) giving trapezoid effect
- [x] Props: `title: string`, `icon?: ReactNode` (optional right-side icon)
- [x] Text: bold, white, centered, with text shadow (black, 2px offset)
- [x] Font size: 16-18px, uppercase feel (Hebrew doesn't have uppercase, so just bold + letter spacing)
- [x] Full width with 8px horizontal margin
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: Create SupercellButton (green/orange CTA buttons)
**Description:** As a player, I want big, juicy, Clash Royale-style action buttons with gradients, borders, and press animations.

**Acceptance Criteria:**
- [x] Create `src/components/ui/SupercellButton.tsx`
- [x] Props: `label: string`, `variant?: 'green' | 'orange' | 'blue' | 'gold'`, `onPress`, `disabled?`, `icon?: ReactNode`, `size?: 'sm' | 'md' | 'lg'`
- [x] Variant colors (gradient top → bottom):
  - `green`: #4ade80 → #16a34a (like CR's "GO!" button), border #0f5e23
  - `orange`: #fbbf24 → #ea580c (like CR's "Battle" button), border #92400e
  - `blue`: #60a5fa → #2563eb, border #1e3a8a
  - `gold`: #f5c842 → #d4a017, border #92400e
- [x] Each button has:
  - 3px outer border (darker shade)
  - Inner highlight line at top (lighter shade, 1px, 50% opacity)
  - Text: bold white with black text shadow (2px)
  - Border radius: 12px
  - min-height: 48 (sm), 56 (md), 64 (lg)
- [x] Press animation: scale 0.95 + darken slightly (reanimated spring)
- [x] Disabled state: grayscale, opacity 0.5
- [x] Haptic feedback on press
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Create GoldCircleBadge (avatar/icon frames)
**Description:** As a player, I want circular badges/frames with golden borders for avatars, icons, and level indicators.

**Acceptance Criteria:**
- [x] Create `src/components/ui/GoldCircleBadge.tsx`
- [x] Props: `children` (icon/image inside), `size?: number` (default 48), `borderColor?: string` (default gold #d4a017), `glowing?: boolean`
- [x] Renders a circle with:
  - 3px gold border
  - Dark blue/green inner background (#0d2847)
  - When `glowing`: animated pulsing gold shadow (shadowRadius 8→16 loop, reanimated)
- [x] Optional `badge?: number` prop — shows a small red notification circle (like CR's red "1" badges) at top-right with white bold number
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Create SparkleOverlay particle effect component
**Description:** As a player, I want subtle sparkle/particle effects floating across backgrounds and premium cards, like Clash Royale's magic dust.

**Acceptance Criteria:**
- [x] Create `src/components/ui/SparkleOverlay.tsx`
- [x] Renders 8-12 small sparkle dots (2-4px) that float upward and fade in/out
- [x] Each sparkle: random X position, random delay, white/gold color at 30-60% opacity
- [x] Animation: translateY upward (50-100px over 3-5 seconds), opacity pulse (0→0.6→0), looping
- [x] Uses `react-native-reanimated` for performance
- [x] Props: `color?: string` (default gold), `density?: 'low' | 'medium' | 'high'`, `active?: boolean`
- [x] `pointerEvents="none"` so it doesn't block touches
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-007: Update theme.ts with Clash Royale color palette
**Description:** As a developer, I want the shared theme constants updated with the Clash Royale color palette so all screens can reference consistent colors.

**Acceptance Criteria:**
- [x] Update `src/constants/theme.ts` to add a `CLASH` color namespace:
  - `bgPrimary`: '#0d2847' (deep blue)
  - `bgSecondary`: '#1a3a5c' (medium blue)
  - `diamondLine`: '#2a5a8c' (diamond grid line)
  - `goldBorder`: '#d4a017'
  - `goldLight`: '#f5c842'
  - `goldGlow`: 'rgba(212, 160, 23, 0.3)'
  - `greenBtn`: '#16a34a'
  - `greenBtnLight`: '#4ade80'
  - `orangeBtn`: '#ea580c'
  - `orangeBtnLight`: '#fbbf24'
  - `ribbonBlue`: '#1e40af'
  - `ribbonBlueLight`: '#2563eb'
  - `cardBg`: 'rgba(10, 22, 40, 0.85)'
  - `textShadow`: 'rgba(0, 0, 0, 0.8)'
  - `redBadge`: '#ef4444'
- [x] Keep existing THEME colors intact (backward compat)
- [x] Typecheck passes

### US-008: Restyle EconomyHeader with Clash Royale top bar
**Description:** As a player, I want the top header (XP, Coins, Streak, Level) to look like Clash Royale's resource bar — gold-framed badges, bold numbers, dark blue background.

**Acceptance Criteria:**
- [x] Update `EconomyHeader.tsx`:
  - Background: dark blue (#0d2847) with subtle gold bottom border (1px, #d4a017 at 40% opacity)
  - Each resource pill: GoldCircleBadge-style icon frame + bold white number with text shadow
  - XP: purple badge icon, Coins: gold coin icon, Streak: fire icon with orange glow, Level: crown/shield icon
  - Layout: horizontal row, evenly spaced, matching CR's top bar exactly
  - Level badge on far left with gold border circle showing level number
  - "+" buttons next to coins/gems like CR (optional, cosmetic only)
- [x] Text: bold, white, fontSize 14-16, textShadowColor black, textShadowOffset {0, 1}
- [x] All existing functionality preserved (animated counters, level-up flash)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-009: Restyle AnimatedTabBar with Clash Royale bottom nav
**Description:** As a player, I want the bottom tab bar styled like Clash Royale — dark blue background, larger icons in gold circle frames, red notification badges.

**Acceptance Criteria:**
- [x] Update `AnimatedTabBar.tsx`:
  - Background: dark navy (#0d2137) with gold top border (1px, #d4a017 at 30%)
  - Active tab: icon inside a GoldCircleBadge-style circle with gold glow
  - Inactive tab: icon only, dimmed (#71717a)
  - Active indicator: gold dot or crown icon below (instead of violet pill)
  - Shop tab: special gold/orange glow (keep existing Clash Royale gold styling)
- [x] Support `badge?: number` on tabs — red circle notification badge (like CR's "24" on cards tab, "1" on clan tab)
- [x] Tab bar height: slightly taller (64-70px + safe area)
- [x] Haptic feedback preserved
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: Restyle HomeScreen (FinFeed) with diamond background + gold cards
**Description:** As a player, I want the home feed to use the diamond background, gold-bordered cards, and Clash Royale typography.

**Acceptance Criteria:**
- [x] Update `FinFeedScreen.tsx`:
  - Replace background with `DiamondBackground`
  - Greeting section: player name in bold white with text shadow, avatar in GoldCircleBadge
  - Feed cards: wrap in `GoldBorderCard` with appropriate variant per card type
  - Section headers: use `BannerRibbon` for "חדשות", "וידאו", "ציטוט"
  - CTA buttons: use `SupercellButton` variant green/orange
- [x] Keep all existing feed logic (quotes, videos, sidebar)
- [x] RTL preserved
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-011: Restyle LearnScreen (ChapterMapScreen) with diamond background + gold cards
**Description:** As a player, I want the chapter map and module cards styled like Clash Royale's arena progression.

**Acceptance Criteria:**
- [x] Update `ChapterMapScreen.tsx`:
  - Replace background with `DiamondBackground`
  - Chapter header: `BannerRibbon` with chapter name
  - Module cards: `GoldBorderCard` — completed modules get green variant, locked get blue, current gets gold with shimmer
  - Progress indicators: gold stars instead of generic checkmarks
  - Lock icons on locked modules: GoldCircleBadge with lock inside
- [x] Keep all navigation + progress logic
- [x] RTL preserved
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-012: Restyle ShopScreen with Clash Royale offer cards
**Description:** As a player, I want the shop to look like Clash Royale's shop — offer cards with colored gradient borders, price tags, and ribbon headers.

**Acceptance Criteria:**
- [x] Update `ShopScreen.tsx`:
  - Replace background with `DiamondBackground`
  - Section headers: `BannerRibbon` ("חנות", "מבצעים", "פריטים")
  - Shop items: `GoldBorderCard` with variant matching item rarity (gold for legendary, purple for epic, blue for rare, green for common)
  - Price tags: orange/gold pill at bottom of card with coin icon + amount
  - "Buy" buttons: `SupercellButton` variant green
  - Category tabs: restyled as small BannerRibbon-style pills
  - SparkleOverlay on featured/premium items
- [x] Keep all existing shop logic (purchase flow, confirm modal)
- [x] RTL preserved
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-013: Restyle ProfileScreen with Clash Royale player card
**Description:** As a player, I want my profile to look like a Clash Royale player card — avatar in gold frame, stats in gold-bordered sections, dark blue background.

**Acceptance Criteria:**
- [x] Update `ProfileScreen.tsx`:
  - Replace background gradient with `DiamondBackground`
  - Avatar: large GoldCircleBadge (120px) with gold glow
  - Player name: bold, white, text shadow, with level badge next to it
  - Stats sections (XP, Coins, Streak, Chapters completed): `GoldBorderCard` with icon + number
  - Settings/actions: `SupercellButton` variants
  - Companion selection section: each companion in a GoldCircleBadge, selected one has gold glow
- [x] Keep all existing profile logic
- [x] RTL preserved
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-014: Restyle ArenaScreen + PyramidScreen with Clash Royale arena feel
**Description:** As a player, I want the arena/pyramid progression to feel like Clash Royale's trophy road — each stage in a gold-framed card with unlock animations.

**Acceptance Criteria:**
- [x] Update `ArenaScreen.tsx` and related pyramid components:
  - Replace background with `DiamondBackground`
  - Arena stages: `GoldBorderCard` — locked (blue, dimmed), current (gold, shimmer + sparkle), completed (green, star badge)
  - Stage names: `BannerRibbon` style
  - Battle/Challenge button: `SupercellButton` variant orange (like CR's "Battle" button)
  - Trophy/progress bar: gold-themed with crown icons
- [x] Keep all arena logic and navigation
- [x] RTL preserved
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-015: Add text shadow utility and update typography across app
**Description:** As a developer, I want a shared text shadow style and bold typography applied across all screens for the Supercell feel.

**Acceptance Criteria:**
**Acceptance Criteria:**
- [x] Add to theme.ts: `TEXT_SHADOW` style object: `{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }`
- [x] Add `TITLE_TEXT` style: `{ fontWeight: '900', color: '#ffffff', ...TEXT_SHADOW }` for main headers
- [x] Add `SUBTITLE_TEXT` style: `{ fontWeight: '700', color: '#e2e8f0', ...TEXT_SHADOW }` for sub-headers
- [x] Apply to all screen titles, section headers, card titles, and button labels across the app
- [x] Ensure RTL `writingDirection: 'rtl'` is preserved everywhere
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals
- Custom Supercell font (we use system bold — close enough for MVP)
- 3D card tilt/perspective effects (complex, low ROI)
- Sound effects on button press (future PRD)
- Animated background (diamond pattern is static SVG)
- Lottie/confetti on every screen (only SparkleOverlay where relevant)

## Technical Notes
- **Diamond pattern**: Use `react-native-svg` with `<Pattern>` and `<Rect>` for repeating diamond grid. Alternatively, a static PNG tile image (tiny, ~2KB) repeated via `resizeMode="repeat"`.
- **Gradient borders**: RN doesn't support gradient borders natively. Use wrapper View with LinearGradient as background + inner View with margin (fake border technique). Or use `expo-linear-gradient` + padding trick.
- **Text shadow**: Use `textShadowColor`, `textShadowOffset`, `textShadowRadius` — native RN props, works on iOS/Android/Web.
- **Shimmer**: Reuse existing shimmer pattern from GlowCard.tsx (2400ms loop, translateX -width → +width).
- **Performance**: SparkleOverlay particles use `useAnimatedStyle` per particle. Cap at 12 particles max. Use `withRepeat` + `withSequence` for infinite loops.
- **Backward compat**: New components are additive. Existing GlowCard/AnimatedPressable still work. Screens are updated one by one.
- **Color migration**: CLASH namespace in theme.ts sits alongside existing THEME. Gradual migration — no big-bang.
- **SVG dependency**: `react-native-svg` likely already installed (check). If not, install for DiamondBackground.
- **RTL**: All new components must support `writingDirection: 'rtl'` — no hardcoded left/right margins.
