# PRD 4: UX/UI Overhaul — Premium EdTech Gaming Experience

## Introduction
Transform FinPL from a functional app into a premium, addictive EdTech gaming experience. Inspired by Duolingo's engagement loops and Clash Royale's epic visual impact. Every screen should feel alive — animated transitions, particle effects, glowing elements, haptic feedback, and a sense of progression that makes users want to come back daily.

The goal: when a user opens FinPL, it should feel like opening a AAA mobile game, not a learning app.

## Goals
- Install and configure `@shopify/react-native-skia` for high-performance 2D/3D canvas rendering
- Install `lottie-react-native` for rich micro-animations
- Add haptic feedback (`expo-haptics`) on every meaningful interaction
- Create a shared animation system (spring configs, timing presets, entrance/exit patterns)
- Redesign tab bar with animated icons, glow effects, and active indicator
- Add XP/Coin earn animations (floating numbers, particle bursts)
- Redesign the Pyramid as a visual 3D-like tower with glow, layers, and unlock effects
- Add streak celebration screen (Duolingo-style) with fire animation
- Add entrance animations to every screen (staggered fade-in, slide-up)
- Add pull-to-refresh with custom animation on FinFeed
- Micro-interactions: button press scales, card hover glow, toggle bounce

## Design Language

### Visual Pillars
- **Dark & Epic**: Deep blacks (#09090b) with neon glow accents — like Clash Royale's dark UI
- **Depth via Glow**: Shadows, glows, and gradients create perceived depth without true 3D
- **Motion = Feedback**: Every tap, swipe, and state change has a visible response
- **Particle Celebration**: XP gains, level-ups, purchases, and streaks trigger particle bursts
- **Bear-Driven Personality**: The purple bear mascot appears contextually with different poses to guide and celebrate

### Color System (FinPlay Brand Palette)
- **Purple Intense** (#FP29P8 / #7c3aed) — Primary brand color, XP, level progression
- **Violet Glow** (#a78bfa at 30% opacity) — Soft glow halos
- **Alpha Blue** — Info, links, secondary actions, wisdom star icon
- **Abundance Green** (#GA5EE0 / #22c55e) — Success, gains, correct answers, growth icon
- **Achievement Gold** (#CEFFFF) — Coins, rewards, premium feel, achievement badges
- **FinPlay Gold** — Coin store, purchase highlights, crown/medal icons
- **Fire Orange** (#f97316) — Streaks, urgency
- **Deep Red** (#ef4444) — Errors, losses, warnings

### Typography
- **FinPlay Sans** — Primary display font for English titles, headings, and UI labels
- **Hebrew text font** — For all Hebrew content (body, descriptions, onboarding)
- Bold + text shadow on headings for depth

### Mascot: Purple Bear (דב סגול)
The purple bear is the brand mascot and appears throughout the app in 3 poses:
- **Running pose (תנוחת ריצה)** — Activity/progress contexts: lesson completion, streak active, navigating → `assets/images/bear-running.png`
- **Thinking pose (תנוחת חשיבה)** — Thinking/learning contexts: quiz questions, chat advisor, pyramid exploration → `assets/images/bear-thinking.png`
- **Celebrating pose (תנוחת חגיגה)** — Achievement contexts: level-up, challenge completed, purchase confirmed, streak milestone → `assets/images/bear-celebrating.png`
- Bear appears with sparkle/glow effects — never static, always slightly animated (breathing/bobbing)

### Iconography System (FinPlay Icons)
From the brand guide, use these themed icons consistently:
- **Achievement** (הישג) — Medal/trophy icon for milestones and leaderboard
- **Treasure** (אוצר) — Chest icon for shop and rewards
- **Growth** (צמיחה) — Arrow-up icon for XP and progression
- **Idea** (רעיון) — Lightbulb icon for tips and AI chat
- **Savings** (חיסכון) — Piggy bank icon for coins and economy
- **Wisdom Star** (כוכב חכמה) — Star icon for knowledge/quiz completion
- **Growth Sprout** (נבט צמיחה) — Sprout icon for beginner levels
- Icons should have a consistent card-frame style with golden/bronze borders (like the brand guide cards)

### UI Elements (from Brand Guide)
- **Tab bar**: 4 tabs — Home (בית), Learning (למידה), Quests (משימות), Profile (פרופיל) with bear-themed icons
- **Quest medals (מדליות משימות)**: Bronze → Silver → Gold → Diamond progression badges
- **Expertise medals (מדליות מומחיות)**: Level 3 → Level 4 → Level 10 → Level 18 tier badges with increasing glow
- **Card frames**: Golden/bronze ornamental borders on feature cards (Clash Royale style)

## User Stories

### US-001: Install animation dependencies
**Description:** As a developer, I want the required animation libraries installed so all subsequent stories can use them.

**Acceptance Criteria:**
- [x] Install `@shopify/react-native-skia` (Skia canvas for particle effects, gradients, blur)
- [x] Install `lottie-react-native` + `lottie-ios` (for Lottie JSON animations)
- [x] Install `expo-linear-gradient` (for gradient backgrounds/buttons)
- [x] Verify all packages resolve correctly with `npx expo install`
- [x] Typecheck passes

### US-002: Shared animation utilities
**Description:** As a developer, I want a shared animation config so all screens use consistent motion.

**Acceptance Criteria:**
- [x] Create `src/utils/animations.ts` with:
  - Spring presets: `SPRING_BOUNCY` (damping 10, stiffness 150), `SPRING_SMOOTH` (damping 20, stiffness 120), `SPRING_SNAPPY` (damping 15, stiffness 200)
  - Timing presets: `TIMING_FAST` (200ms), `TIMING_NORMAL` (350ms), `TIMING_SLOW` (500ms)
  - Entrance configs: `fadeInUp`, `fadeInScale`, `slideInLeft`, `slideInRight`
  - Shared values factory: `useEntranceAnimation()` hook returning animated style
- [x] Create `src/utils/haptics.ts` with wrapper functions: `tapHaptic()`, `successHaptic()`, `errorHaptic()`, `heavyHaptic()` using `expo-haptics`
- [x] Typecheck passes

### US-003: Animated Tab Bar
**Description:** As a user, I want a visually impressive tab bar that feels like a gaming navigation.

**Acceptance Criteria:**
- [x] Replace current text-only tab bar in `app/(tabs)/_layout.tsx` with custom animated tab bar component
- [x] 4 tabs matching brand guide: Home (בית), Learning (למידה), Quests (משימות/מסע), Profile (פרופיל)
- [x] Each tab has a FinPlay-branded icon (bear-themed or from brand icon set) + Hebrew label
- [x] Active tab: icon scales up (1.2x) with spring animation, purple glow halo behind icon, label visible in Purple Intense
- [x] Inactive tabs: icon at 1x scale, zinc-500 color, label hidden
- [x] Tab switch triggers haptic feedback (`tapHaptic`)
- [x] Tab bar background: dark with golden/bronze top border accent (brand card-frame style) or solid zinc-950/95
- [x] Floating indicator dot or pill slides between tabs with spring animation
- [x] Small purple bear icon as the center "Quest" tab accent (like the brand guide shows)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: XP & Coin earn animations
**Description:** As a user, I want to see satisfying visual feedback when I earn XP or Coins.

**Acceptance Criteria:**
- [x] Create `src/components/ui/RewardPopup.tsx` — floating animated component
- [x] When XP is earned: purple "+25 XP" text floats up from trigger point with fade-out, scale-up spring
- [x] When Coins are earned: gold "+50" with coin icon floats up similarly
- [x] Create `src/components/ui/ParticleBurst.tsx` using Skia Canvas — small colored circles burst outward from a point, fade, and disappear (configurable color: violet for XP, gold for Coins)
- [x] Both components exposed via a global `useRewardAnimation()` hook that can be triggered from any screen
- [x] Integrate with `useEconomyStore` — auto-trigger on `addXP` and `addCoins`
- [x] Haptic feedback: `successHaptic()` on earn
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Economy Header redesign
**Description:** As a user, I want the persistent header to feel premium and alive.

**Acceptance Criteria:**
- [x] Redesign `src/components/ui/EconomyHeader.tsx`:
  - XP display: violet pill with glow shadow, animated number counter (counts up when XP changes)
  - Coin display: gold pill with subtle shimmer animation, animated counter
  - Streak: fire icon with pulsing orange glow when streak ≥ 3
  - XP progress bar: animated fill with gradient (violet → violet-light), subtle particle trail at the leading edge
- [x] Number changes animate with `withSpring` (old value → new value over 600ms)
- [x] Level-up triggers a special flash effect on the entire header
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Screen entrance animations
**Description:** As a user, I want screens to feel dynamic when I navigate to them.

**Acceptance Criteria:**
- [x] Add staggered entrance animation to FinFeedScreen: cards slide in from bottom with 50ms stagger delay each
- [x] Add entrance animation to ArenaScreen: challenge cards scale in from 0.8 → 1.0 with spring, staggered
- [x] Add entrance animation to ShopScreen: items fade in with slight upward drift, staggered by grid position
- [x] Add entrance animation to PyramidScreen: layers build up from bottom to top sequentially (like building a tower)
- [x] Add entrance animation to ProfileScreen: avatar bounces in, stat cards slide in from sides
- [x] All entrance animations use `useEntranceAnimation()` from shared utils
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-007: 3D-style Pyramid visualization
**Description:** As a user, I want the financial pyramid to look like an epic tower I'm building, not a list of text rows.

**Acceptance Criteria:**
- [x] Redesign `src/features/pyramid/VisualPyramid.tsx` using Skia Canvas:
  - Isometric/perspective pyramid shape (wider at bottom, narrow at top)
  - Each layer is a distinct 3D-looking block with gradient fill
  - Unlocked layers glow with their theme color (layer 1=green, 2=blue, 3=violet, 4=gold, 5=diamond/white)
  - Locked layers are dark/translucent with a lock icon overlay
  - Current layer pulses with a breathing glow animation
  - Stars or particles float around the unlocked portion
- [x] Tapping a layer shows its name and progress in a tooltip bubble
- [x] When a new layer is unlocked: dramatic reveal animation (flash, particles, layer lights up from dark)
- [x] Haptic feedback on layer tap
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-008: Streak celebration screen
**Description:** As a user, I want to feel rewarded for maintaining my daily streak (Duolingo-style).

**Acceptance Criteria:**
- [x] Create `src/features/streak/StreakCelebrationScreen.tsx`
- [x] Shows on app open when streak is active (after first lesson/action of the day)
- [x] Large animated streak number (scale-in with bounce spring)
- [x] Fire animation around the number (Skia or animated SVG — orange/red gradient flames)
- [x] "day streak!" text below with fade-in
- [x] Purple bear mascot in celebrating pose (`assets/images/bear-celebrating.png`) with sparkle effects
- [x] Weekly calendar row showing completed days (checkmarks) and remaining days
- [x] "Keep going!" motivational text
- [x] Auto-dismiss after 3 seconds or tap to dismiss
- [x] Streak milestones (7, 30, 100 days) get extra-dramatic animation (bigger particles, gold flash)
- [x] Haptic: `heavyHaptic()` on appearance
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-009: Button & card micro-interactions
**Description:** As a user, I want every interaction to feel responsive and satisfying.

**Acceptance Criteria:**
- [x] Create `src/components/ui/AnimatedPressable.tsx` — drop-in replacement for Pressable:
  - Press: scale down to 0.95 with `SPRING_SNAPPY`
  - Release: scale back to 1.0 with overshoot bounce
  - Haptic: `tapHaptic()` on press
- [x] Create `src/components/ui/GlowCard.tsx` — card wrapper with:
  - Subtle border glow (configurable color, default neon-violet)
  - On press: glow intensifies briefly
  - Optional shimmer sweep animation (for premium/Pro items)
- [x] Replace all `Pressable` in main screens with `AnimatedPressable`
- [x] Replace all card containers in Shop, Arena, and Profile with `GlowCard`
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: FinFeed card redesign
**Description:** As a user, I want the lesson feed cards to look like epic game cards.

**Acceptance Criteria:**
- [x] Redesign `src/features/finfeed/LessonCard.tsx`:
  - Full-screen card with gradient background (category-based color)
  - Category badge at top with glow effect
  - Title in bold, large font with subtle text shadow
  - XP reward badge: golden pill with "+X XP" and sparkle icon
  - Difficulty indicator: 1-5 stars with filled/empty states
  - Bottom: "Start Lesson" animated CTA button with pulsing glow border
- [x] Card transition between snaps has a scale/fade effect (active card = 1.0, adjacent = 0.9 + dimmed)
- [x] Pull-down on first card triggers a spin-refresh animation
- [x] Haptic on snap to new card
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-011: Arena screen epic redesign
**Description:** As a user, I want the arena to feel like entering a battle zone.

**Acceptance Criteria:**
- [ ] Redesign `src/features/arena/ArenaScreen.tsx` header:
  - "ARENA" title in large bold with metallic/golden gradient text effect (Skia shader or SVG gradient)
  - Subtitle: "אתגרים יומיים" with glow
  - Background: subtle dark pattern or grid (Clash Royale style)
- [ ] Redesign `src/features/arena/ChallengeCard.tsx`:
  - Card has border glow (green=available, gold=completed, red=failed)
  - Coin reward displayed as golden badge with animated sparkle
  - Timer countdown for daily reset with animated progress ring
  - Completion animation: card flips or explodes into particles, revealing "COMPLETED" stamp
- [ ] Leaderboard section: entries slide in staggered, top 3 have quest medals (Gold/Silver/Bronze from brand guide) with matching glow, Achievement (הישג) trophy icon for #1
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-012: Shop premium feel
**Description:** As a user, I want the shop to feel like a treasure marketplace.

**Acceptance Criteria:**
- [ ] Redesign `src/features/shop/ShopScreen.tsx` header with FinPlay Gold gradient title "SHOP" (FinPlay Sans), Treasure (אוצר) chest icon, and coin balance with Savings piggy icon + shimmer
- [ ] Redesign `src/features/shop/ShopItemCard.tsx`:
  - Card with rarity-based border glow (common=blue, rare=violet, legendary=gold)
  - Item icon centered with floating animation (subtle up/down bob)
  - Price tag: golden coin icon + amount with "Buy" button
  - Sold out / owned items: grayscale + "OWNED" stamp overlay
- [ ] Purchase animation: coins fly from balance to item, item pulses, then "OWNED" stamp slams down with haptic
- [ ] Category tabs: animated underline slides between categories
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-013: Chat screen gaming feel
**Description:** As a user, I want the AI chat to feel like talking to a game NPC advisor.

**Acceptance Criteria:**
- [ ] Redesign `src/features/chat/ChatScreen.tsx`:
  - Bot messages: dark card with violet left border, purple bear in thinking pose (`bear-thinking.png`) as avatar on left
  - User messages: violet gradient bubble on right
  - Typing indicator: three dots with bouncing animation (staggered scale)
  - Message appear animation: slide in from side with spring
- [ ] Suggestion chips at bottom: pill buttons with glow border, horizontal scroll
- [ ] Input bar: dark background with violet focus border glow, send button with pulse animation when text is entered
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-014: Profile screen with avatar effects
**Description:** As a user, I want my profile to feel like a character stats page in a game.

**Acceptance Criteria:**
- [ ] Redesign `src/features/profile/ProfileScreen.tsx`:
  - Avatar: purple bear in running pose with animated rotating glow ring (Skia or SVG), tier-based ring color (basic=violet, pro=FinPlay Gold)
  - Display name in FinPlay Sans bold with level badge (expertise medal tier) next to it
  - Stats section: XP, Coins, Streak displayed as animated counters in GlowCards with brand icons (Growth for XP, Savings/piggy for Coins, fire for Streak)
  - "Achievements" preview row: quest medals (Bronze → Silver → Gold → Diamond) with lock/unlock states and glow on unlocked
- [ ] Expertise tier display: show current expertise medal (Level 3/4/10/18) with matching glow intensity
- [ ] Pyramid mini-preview: small visual pyramid showing current layer (tappable → navigates to full pyramid)
- [ ] Bear companion display: purple bear with idle breathing/bobbing animation, holding a Wisdom Star when user has high streak
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- True WebGL/OpenGL 3D rendering (we use 2D techniques to create depth illusion)
- Custom sound effects / background music (future PRD)
- Lottie animation creation (use programmatic animations for now, Lottie ready for future designer assets)
- Redesigning the Onboarding flow (covered in PRD-7)
- Backend changes (this is purely frontend UX)

## Technical Notes
- **Skia**: `@shopify/react-native-skia` provides Canvas, Paint, shaders, blur, gradients — runs on GPU. Use for particle effects, glow halos, gradient text, pyramid rendering. Falls back gracefully on web.
- **Reanimated**: Already installed. Use `useAnimatedStyle`, `withSpring`, `withTiming`, `useSharedValue` for all UI animations. Worklet-based — 60fps guaranteed.
- **Haptics**: `expo-haptics` already installed. Wrap in `haptics.ts` utility. On web, haptics are silently no-op.
- **Performance**: Keep particle count low (<50 per burst). Use `cancelAnimation` on unmount. Avoid running animations on hidden screens.
- **Skia web support**: `@shopify/react-native-skia` supports web via CanvasKit WASM. May increase bundle size ~2MB. Acceptable for premium feel.
- **Gradients**: `expo-linear-gradient` for simple gradient backgrounds. Skia for complex/animated gradients.
- **Existing patterns**: All new components follow NativeWind + named exports + kebab-case files. Extend, don't replace, the existing color palette.
- **Brand Assets**:
  - `assets/images/mascot.png` — Original mascot (golden bull)
  - `assets/images/vision.png` — Brand design language guide reference
  - Purple bear pose images (already in assets): `bear-running.png`, `bear-thinking.png`, `bear-celebrating.png`
  - FinPlay icon set (Achievement, Treasure, Growth, Idea, Savings, Wisdom Star, Growth Sprout) — use lucide-react-native closest matches or custom SVG
- **Font**: FinPlay Sans for English display text. Load via `expo-font` if custom, or use closest system match (bold sans-serif).
