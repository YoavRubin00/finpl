# Bottom Navigation Redesign — Duolingo-Style

**Date:** 2026-05-08
**Component:** `src/components/ui/AnimatedTabBar.tsx`
**Status:** Design approved, pending implementation plan

## Problem

Two user-reported issues with the current bottom navigation:

1. **"Background effect underneath each button is not UI friendly."** Each focused tab renders a 72×72 SVG radial gradient glow in that tab's *unique* accent color (sky / cyan / blue / indigo / blue at 55% opacity). The bar lights up with a different colored blob per tab, which reads as visually busy and inconsistent.
2. **"Buttons are sort of moving and then coming back to place"** when navigating between some tabs. The focus-state animation simultaneously changes the icon `size` prop (30→34, a real layout change), the icon `strokeWidth` (1.8→2.8, forces SVG path re-render), the container `scale` via a bouncy spring (1×→1.15×), the `translateY` (0→−2), and the label `fontWeight` (600→800, can reflow text width). The spring overshoots while the size/stroke layout-snap, producing a wobble. It does not happen on every tab change — it depends on which tab was previously focused (icons with denser SVG paths reflow more visibly).

## Goal

Redesign the bottom tab bar in a **Duolingo / friendly learning-app** style:

- Replace stroked monochrome Lucide icons with **multi-color illustrated SVG icons**, one per tab.
- Inactive icons stay fully colorful — the bar always feels alive.
- Active state is conveyed *only* by a soft tinted pill behind the icon.
- Eliminate the focus-state layout/transform churn that causes the glitch.

Keep all current tabs, names, RTL order, navigation logic, badge logic, walkthrough-glow logic, and accessibility behavior unchanged. This is a **visual + motion** redesign, not a structural one.

## Visual Design

### Bar container

- Background: `#fafafa` (unchanged).
- Top hairline border: `rgba(0,0,0,0.06)` (unchanged).
- Soft top shadow (unchanged).
- Layout: `flex-direction: row-reverse`, RTL order (unchanged).
- Min height: 80, top padding: 8, bottom padding: `Math.max(insets.bottom, Platform.OS === "web" ? 8 : 12)` (unchanged).

### Tab item layout

Each tab is a vertical stack:

```
[ pill background (active only) wrapping icon ]
[ label                                       ]
[ optional badge, top-right of icon           ]
```

- Pill background dimensions: width `52`, height `40`, `borderRadius: 14`.
- Pill fill (active): `#e0f2fe` (light sky).
- Pill border (active): `1px solid #bae6fd`.
- Pill is always mounted; visibility is controlled by `opacity` driven by reanimated (0 inactive, 1 active) so the active/inactive transition is a smooth fade rather than a mount/unmount.
- Icon: rendered at fixed `28×28`, never resized.
- Label: `fontSize: 11`, `fontWeight: 700`, `marginTop: 4`, `writingDirection: "rtl"`. Weight is **constant** across active/inactive — only color changes.
- Label color: `#64748b` (slate-500) inactive → `#0ea5e9` (sky-500) active.

### The 5 illustrated icons

All icons are inline `react-native-svg` components in a new directory: `src/components/ui/tabIcons/`. Each is a self-contained `<Svg>` with multiple `<Path>` / `<Circle>` / `<Rect>` elements using hard-coded fills. Each icon accepts no color props — its identity is its own multi-color palette.

**Files:**

- `src/components/ui/tabIcons/InvestmentsIcon.tsx`
- `src/components/ui/tabIcons/FeedIcon.tsx`
- `src/components/ui/tabIcons/LearnIcon.tsx`
- `src/components/ui/tabIcons/FriendsIcon.tsx`
- `src/components/ui/tabIcons/ChatIcon.tsx`
- `src/components/ui/tabIcons/index.ts` (barrel export)

Each component signature:

```tsx
interface TabIconProps { size?: number }
export function InvestmentsIcon({ size = 28 }: TabIconProps): JSX.Element
```

**Concept per icon** (final SVG geometry to be drawn during implementation; concepts here are the design contract):

| Tab | Concept | Palette |
|---|---|---|
| השקעות (Investments) | Gold coin (front face) with a small green leaf sprouting from the top — "money growing." Coin shows a ₪ glyph. | Coin face `#facc15`, rim `#d4a017`, glyph `#92400e`, leaf `#22c55e`, leaf highlight `#86efac` |
| פיד (Feed) | Compass — gold outer ring, white face, red north needle, blue south needle, dark center pin. | Ring `#facc15`, face `#ffffff`, north `#ef4444`, south `#3b82f6`, pin `#1e293b` |
| למידה (Learn) — center | Open book — cyan pages, purple spine, gold ribbon bookmark, small gold sparkle above. Visually most prominent. | Pages `#22d3ee`, page highlight `#a5f3fc`, spine `#8b5cf6`, ribbon `#facc15`, sparkle `#facc15` |
| חברים (Friends) | Two overlapping avatar heads — front coral with brown hair, back purple with darker hair. | Front face `#f97316`, front hair `#7c2d12`, back face `#a78bfa`, back hair `#4c1d95` |
| צ'אט (Chat) | Purple speech bubble (with bottom-right tail) containing three green dots ("typing"). | Bubble `#a78bfa`, bubble shadow `#7c3aed`, dots `#22c55e` |

Icons are visually static — the same SVG is rendered active or inactive. No tinting, no stroke-width changes, no size swaps.

### Active-state indicator

Driven by a single shared value `activeOpacity` per tab item, animated via `withTiming(180ms, Easing.out(Easing.ease))` on `focused` change:

- Pill background: `opacity: activeOpacity.value`.
- Label color: interpolated from `#64748b` to `#0ea5e9` via `interpolateColor(activeOpacity.value, [0, 1], [...])`.

### One-shot tap pop

Independent of focus state. On `onPress`, scale animates `1 → 0.92 → 1` over 120ms via `withSequence(withTiming(0.92, {duration: 60}), withTiming(1, {duration: 60}))`. Applied to the inner stack (pill + icon + label) so the entire tab pulses on tap. Does not run on focus changes — only on the actual press event.

### What gets removed

| Removed | Why |
|---|---|
| 72×72 SVG radial gradient glow | The "not UI friendly" background effect. Replaced by the soft pill. |
| Per-tab `TAB_COLORS` map (sky/cyan/blue/indigo/blue) | Unified to single sky accent. Less visual noise. |
| `ICON_SIZE_DEFAULT` / `ICON_SIZE_FOCUSED` (30→34) | Layout reflow on focus change → glitch. |
| Icon `strokeWidth` change (1.8→2.8) | SVG path re-render on focus → glitch. (Custom icons don't expose stroke anyway.) |
| Focus-driven `scale 1.15` spring | Spring overshoot was a primary cause of the wobble. |
| Focus-driven `translateY -2` | Combined with scale spring, contributed to wobble. |
| Label `fontWeight` swap (600→800) | Bold weight reflows text width → wobble in adjacent tabs. |

## Behavioral preservation (must not change)

- 5 tabs, exact route names: `investments`, `learn` (= פיד), `index` (= למידה), `friends`, `chat`.
- RTL `flexDirection: row-reverse` array order: `[investments, learn, index, friends, chat]` so visual L→R in RTL becomes: chat | friends | למידה | פיד | השקעות.
- `useWalkthroughGlowTab()` glow logic — when active, target tab still pulses with the existing sky-blue walkthrough glow (border + shadow + bg pulse). Sky accent matches new design palette. Non-target tabs are not locked — `walkthroughLocked = false` stays.
- Badge rendering — top-right of icon, red bg `CLASH.redBadge`, white border matching bar bg, count formatting (`99+`).
- Haptics on press (`tapHaptic()`) and sound (`playSound('btn_click_soft_1')`).
- Reduced-motion fallback: when `useReducedMotion()` is true, `activeOpacity` is set directly (no timing), and the press pop is skipped.
- Accessibility: `accessibilityRole="tab"`, `accessibilityState={{ selected: focused }}`, `accessibilityLabel`, `accessibilityHint` — all preserved.
- `learnTabFlashedThisSession` module flag — currently declared but unused in the visible file. Keep as-is unless implementation reveals it's used elsewhere.

## File-level changes

1. **New folder:** `src/components/ui/tabIcons/` with 5 icon components + `index.ts`.
2. **Modified:** `src/components/ui/AnimatedTabBar.tsx`
   - Drop Lucide imports (`Compass`, `BookOpen`, `MessageCircle`, `TrendingUp`, `Users`, `LucideIcon`).
   - Drop SVG glow imports (`Defs`, `RadialGradient`, `Rect`, `Stop`) — but keep `Svg` if needed by icons (it isn't, icons import their own).
   - Drop `withSpring`, keep `withTiming`, `withSequence`, `Easing`.
   - Replace `TabConfig.Icon: LucideIcon` with `Icon: ComponentType<{ size?: number }>`.
   - Wire each tab to its new illustrated icon.
   - Remove `TAB_COLORS`, `ICON_SIZE_DEFAULT`, `ICON_SIZE_FOCUSED`, `SPRING_FAST`.
   - Replace `scale` / `translateY` / `activeGlow` shared values with `activeOpacity` (focus-driven) and `pressScale` (one-shot tap-driven).
   - Replace the SVG glow layer with the pill background View, opacity-driven by `activeOpacity`.
   - Update label color via `interpolateColor`.
   - Keep walkthrough-glow block, badge block, accessibility props, haptics, sound.

No changes to:
- Tab navigator config (`createBottomTabNavigator` setup wherever it lives).
- Route names, screen components, params.
- Theme tokens in `src/constants/theme.ts`.

## Trade-offs and known limitations

- **Icon polish:** Hand-written SVG illustrations will look clean and on-brand, but they will not match Duolingo's exact illustrative polish (their icons have hand-tuned curves and shading). Acceptable for v1; any individual icon can later be swapped for a generated/imported asset without changing the bar's structure (each icon is its own file).
- **Single accent color:** Removing per-tab unique colors loses a small amount of visual differentiation. The trade is justified — the per-tab glow was the user's stated complaint.
- **No focus-state pop:** Some apps animate a small bounce when the active indicator moves between tabs. Skipping this is deliberate — every focus-state animation we tested in the current code contributes to the glitch.

## Testing

- Manual: tap through every tab, verify no wobble, verify pill fades smoothly, verify tap pop fires on every press (including the already-active tab).
- `npx tsc --noEmit` — must pass with no new errors (project uses `strict: true`, no `any`).
- Walkthrough flow — start the app walkthrough and confirm the targeted tab's existing glow effect still renders correctly on top of the new design.
- Reduced motion — toggle OS reduce-motion; pill should still appear/disappear (instantly), no animations should run.
- RTL order — confirm visual order on a Hebrew device locale matches the documented L→R sequence.
