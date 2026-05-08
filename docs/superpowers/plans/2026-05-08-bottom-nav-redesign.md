# Bottom Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `src/components/ui/AnimatedTabBar.tsx` in a Duolingo / friendly learning-app style: replace the per-tab radial gradient glow with a soft sky-tinted pill on the active tab, swap stroked Lucide icons for multi-color illustrated SVGs (one per tab), and remove the focus-driven size/stroke/scale/translate/weight churn that causes the "wobble" glitch on tab switch.

**Architecture:** Five new self-contained `react-native-svg` icon components live in a new `src/components/ui/tabIcons/` folder, each exporting a single React component with one optional `size` prop. A barrel `index.ts` re-exports them. The tab bar then imports those icons and is restructured around a single `activeOpacity` shared value (drives pill fade + label color via `interpolateColor`) and a separate one-shot `pressScale` for tap feedback. No focus-driven size/scale/translate/weight changes.

**Tech Stack:** React Native 0.83.4, Expo 55, TypeScript 5.9 strict, react-native-reanimated 4.2, react-native-svg 15.15, @react-navigation/bottom-tabs.

**Verification model:** This project has no test runner configured (no Jest, no @testing-library/react-native — confirmed by inspecting `package.json` and the absence of a project-level `jest.config.*`). Per `CLAUDE.md`, the verification gate is **`npx tsc --noEmit`** plus manual visual verification. Adding test infrastructure is out of scope. Each task therefore uses *type-check + commit* as its gate, and Task 6 adds a final manual visual checklist.

**Spec:** [docs/superpowers/specs/2026-05-08-bottom-nav-redesign-design.md](../specs/2026-05-08-bottom-nav-redesign-design.md)

---

## File Structure

**New files (icon components):**

| File | Responsibility |
|---|---|
| `src/components/ui/tabIcons/InvestmentsIcon.tsx` | Gold coin with green leaf sprout |
| `src/components/ui/tabIcons/FeedIcon.tsx` | Multi-color compass |
| `src/components/ui/tabIcons/LearnIcon.tsx` | Open book with bookmark + sparkle |
| `src/components/ui/tabIcons/FriendsIcon.tsx` | Two overlapping avatar heads |
| `src/components/ui/tabIcons/ChatIcon.tsx` | Purple speech bubble with green typing dots |
| `src/components/ui/tabIcons/index.ts` | Barrel export of all 5 icons |

Each icon component:
- Exports a named function component (e.g. `export function InvestmentsIcon`).
- Takes one optional prop: `size?: number` (default `28`).
- Has no theming, no color props, no animation logic — its multi-color identity is hard-coded.
- Uses only primitives from `react-native-svg`: `Svg`, `Path`, `Circle`, `Rect`, `Ellipse`. No external deps.

**Modified files:**

| File | Change |
|---|---|
| `src/components/ui/AnimatedTabBar.tsx` | Full refactor — drop Lucide icons + radial glow, wire new illustrated icons, replace focus-driven scale/translate/strokeWidth/size/weight transitions with a single opacity-driven pill + interpolated label color, keep walkthrough glow + badges + haptics + sound + accessibility intact. |

No other files are touched. Tab navigator config, route names, screen components, params, and theme tokens stay as they are.

---

## Task 1: Create `InvestmentsIcon`

**Files:**
- Create: `src/components/ui/tabIcons/InvestmentsIcon.tsx`

The first icon also establishes the folder layout, the component signature, and the import style every other icon will follow.

- [ ] **Step 1: Create the file**

Path: `src/components/ui/tabIcons/InvestmentsIcon.tsx`

```tsx
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

/**
 * Investments tab icon — gold coin with a green leaf sprouting from the top.
 * "Money growing" visual. Multi-color, hard-coded palette.
 */
export function InvestmentsIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {/* leaf stem (drawn before coin so coin overlaps stem base) */}
      <Path
        d="M 14 9 L 14 4"
        stroke="#22c55e"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      {/* coin rim (darker gold) */}
      <Circle cx={14} cy={18} r={9.5} fill="#d4a017" />
      {/* coin face (gold) */}
      <Circle cx={14} cy={18} r={8} fill="#facc15" />
      {/* coin top-left highlight */}
      <Ellipse cx={11} cy={15} rx={2.5} ry={1.5} fill="#fde047" />
      {/* leaf (teardrop curving to the right) */}
      <Path d="M 14 4 Q 19 5 18 9 Q 16 11 14 9 Z" fill="#22c55e" />
      {/* leaf vein */}
      <Path
        d="M 14 5 L 17 8"
        stroke="#16a34a"
        strokeWidth={0.7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0, no errors mentioning `InvestmentsIcon` or `TabIconProps`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabIcons/InvestmentsIcon.tsx
git commit -m "feat(tab-icons): add InvestmentsIcon (gold coin with green leaf)"
```

---

## Task 2: Create `FeedIcon`

**Files:**
- Create: `src/components/ui/tabIcons/FeedIcon.tsx`

- [ ] **Step 1: Create the file**

Path: `src/components/ui/tabIcons/FeedIcon.tsx`

```tsx
import Svg, { Circle, Path } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

/**
 * Feed (פיד) tab icon — classic compass.
 * Gold ring + white face + red north needle + blue south needle + dark pin.
 */
export function FeedIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {/* outer ring (gold) */}
      <Circle cx={14} cy={14} r={11} fill="#facc15" />
      {/* inner rim (darker gold) */}
      <Circle cx={14} cy={14} r={10} fill="#d4a017" />
      {/* face */}
      <Circle cx={14} cy={14} r={8.5} fill="#ffffff" />
      {/* north needle (red, pointing up) */}
      <Path d="M 14 6 L 12 14 L 16 14 Z" fill="#ef4444" />
      {/* south needle (blue, pointing down) */}
      <Path d="M 14 22 L 12 14 L 16 14 Z" fill="#3b82f6" />
      {/* center pin */}
      <Circle cx={14} cy={14} r={1.5} fill="#1e293b" />
    </Svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0, no errors mentioning `FeedIcon`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabIcons/FeedIcon.tsx
git commit -m "feat(tab-icons): add FeedIcon (multi-color compass)"
```

---

## Task 3: Create `LearnIcon`

**Files:**
- Create: `src/components/ui/tabIcons/LearnIcon.tsx`

- [ ] **Step 1: Create the file**

Path: `src/components/ui/tabIcons/LearnIcon.tsx`

```tsx
import Svg, { Path, Rect } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

/**
 * Learn (למידה) tab icon — open book with gold ribbon bookmark + sparkle.
 * Center / most prominent tab.
 */
export function LearnIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {/* spine (purple, behind pages) */}
      <Rect x={4} y={8} width={20} height={14} rx={1.5} fill="#8b5cf6" />
      {/* left page */}
      <Path d="M 14 8 L 4 9 L 4 21 L 14 22 Z" fill="#22d3ee" />
      {/* right page */}
      <Path d="M 14 8 L 24 9 L 24 21 L 14 22 Z" fill="#22d3ee" />
      {/* page lines (dark cyan, low opacity) */}
      <Rect x={6} y={12} width={6} height={0.7} fill="#0e7490" opacity={0.5} />
      <Rect x={6} y={14} width={5} height={0.7} fill="#0e7490" opacity={0.5} />
      <Rect x={16} y={12} width={6} height={0.7} fill="#0e7490" opacity={0.5} />
      <Rect x={16} y={14} width={5} height={0.7} fill="#0e7490" opacity={0.5} />
      {/* ribbon bookmark (gold, with V cut at bottom) */}
      <Path d="M 18 7 L 20.5 7 L 20.5 17 L 19.25 15 L 18 17 Z" fill="#facc15" />
      {/* small sparkle above book */}
      <Path
        d="M 22 2 L 22.5 4 L 24 4.5 L 22.5 5 L 22 7 L 21.5 5 L 20 4.5 L 21.5 4 Z"
        fill="#facc15"
      />
    </Svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0, no errors mentioning `LearnIcon`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabIcons/LearnIcon.tsx
git commit -m "feat(tab-icons): add LearnIcon (open book with bookmark + sparkle)"
```

---

## Task 4: Create `FriendsIcon`

**Files:**
- Create: `src/components/ui/tabIcons/FriendsIcon.tsx`

- [ ] **Step 1: Create the file**

Path: `src/components/ui/tabIcons/FriendsIcon.tsx`

```tsx
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

/**
 * Friends (חברים) tab icon — two overlapping avatar heads with shoulders.
 * Back: purple. Front: coral. Shoulders are clipped at the bottom of viewBox.
 */
export function FriendsIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {/* back person — shoulders */}
      <Ellipse cx={17} cy={24} rx={7} ry={4} fill="#a78bfa" />
      {/* back person — face */}
      <Circle cx={17} cy={12} r={5} fill="#a78bfa" />
      {/* back person — hair (top half of face) */}
      <Path d="M 12 12 A 5 5 0 0 1 22 12 Z" fill="#4c1d95" />

      {/* front person — shoulders */}
      <Ellipse cx={10} cy={25} rx={7} ry={4} fill="#f97316" />
      {/* front person — face */}
      <Circle cx={10} cy={14} r={5.5} fill="#f97316" />
      {/* front person — hair (top half of face) */}
      <Path d="M 4.5 14 A 5.5 5.5 0 0 1 15.5 14 Z" fill="#7c2d12" />
    </Svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0, no errors mentioning `FriendsIcon`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabIcons/FriendsIcon.tsx
git commit -m "feat(tab-icons): add FriendsIcon (two overlapping avatars)"
```

---

## Task 5: Create `ChatIcon` and barrel `index.ts`

**Files:**
- Create: `src/components/ui/tabIcons/ChatIcon.tsx`
- Create: `src/components/ui/tabIcons/index.ts`

- [ ] **Step 1: Create the icon file**

Path: `src/components/ui/tabIcons/ChatIcon.tsx`

```tsx
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

/**
 * Chat (צ'אט) tab icon — purple speech bubble with three green "typing" dots.
 * Tail at the bottom-right of the bubble.
 */
export function ChatIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {/* bubble body */}
      <Rect x={3} y={4} width={22} height={16} rx={8} fill="#a78bfa" />
      {/* bubble tail (bottom-right) */}
      <Path d="M 16 19 L 16 25 L 22 19 Z" fill="#a78bfa" />
      {/* typing dots */}
      <Circle cx={8} cy={12} r={1.5} fill="#22c55e" />
      <Circle cx={14} cy={12} r={1.5} fill="#22c55e" />
      <Circle cx={20} cy={12} r={1.5} fill="#22c55e" />
    </Svg>
  );
}
```

- [ ] **Step 2: Create the barrel file**

Path: `src/components/ui/tabIcons/index.ts`

```ts
export { InvestmentsIcon } from "./InvestmentsIcon";
export { FeedIcon } from "./FeedIcon";
export { LearnIcon } from "./LearnIcon";
export { FriendsIcon } from "./FriendsIcon";
export { ChatIcon } from "./ChatIcon";
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0, no errors mentioning `ChatIcon` or any of the barrel re-exports.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/tabIcons/ChatIcon.tsx src/components/ui/tabIcons/index.ts
git commit -m "feat(tab-icons): add ChatIcon and barrel index"
```

---

## Task 6: Refactor `AnimatedTabBar.tsx`

**Files:**
- Modify (full rewrite): `src/components/ui/AnimatedTabBar.tsx`

This is the large task. The new file removes the radial-gradient glow, the per-tab `TAB_COLORS` map, the `ICON_SIZE_DEFAULT` / `ICON_SIZE_FOCUSED` swap, the `strokeWidth` swap, the focus-driven `scale 1.15` spring + `translateY -2`, and the `fontWeight` swap. It introduces a single `activeOpacity` shared value (drives the pill fade and the label color via `interpolateColor`) and a separate one-shot `pressScale` for tap feedback. Walkthrough glow, badge, haptics, sound, and accessibility behavior are preserved verbatim.

- [ ] **Step 1: Replace the file in full**

Path: `src/components/ui/AnimatedTabBar.tsx`

```tsx
import { View, Pressable, StyleSheet, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  interpolateColor,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { useEffect, useCallback, type ComponentType } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { tapHaptic } from "../../utils/haptics";
import { CLASH } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { useWalkthroughGlowTab } from "../../features/onboarding/AppWalkthroughOverlay";
import {
  InvestmentsIcon,
  FeedIcon,
  LearnIcon,
  FriendsIcon,
  ChatIcon,
} from "./tabIcons";

// Module-level flag: first session gold flash for learn tab (kept; unused in this file).
let learnTabFlashedThisSession = false;

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

interface TabIconProps {
  size?: number;
}
type TabIconComponent = ComponentType<TabIconProps>;

interface TabConfig {
  key: string;
  label: string;
  Icon: TabIconComponent;
  badge?: number;
}

// Visual L→R ordering in RTL: chat | friends | למידה (center) | פיד | השקעות
// The array reads right-to-left in RTL, so array[0] = rightmost tab visually.
const TABS: TabConfig[] = [
  { key: "investments", label: "השקעות", Icon: InvestmentsIcon },
  { key: "learn",       label: "פיד",    Icon: FeedIcon },
  { key: "index",       label: "למידה",  Icon: LearnIcon },
  { key: "friends",     label: "חברים",  Icon: FriendsIcon },
  { key: "chat",        label: "צ'אט",  Icon: ChatIcon },
];

// Single unified accent (sky-500). Matches existing walkthrough glow.
const ACCENT = "#0ea5e9";
const ACCENT_BG = "#e0f2fe";      // sky-100, pill fill
const ACCENT_BORDER = "#bae6fd";  // sky-200, pill border
const LABEL_INACTIVE = "#64748b"; // slate-500
const TAB_BAR_BG = "#fafafa";
const ICON_SIZE = 28;
const PILL_W = 52;
const PILL_H = 40;

// ---------------------------------------------------------------------------
// Single tab item
// ---------------------------------------------------------------------------

interface TabItemProps {
  config: TabConfig;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  /** True when this tab is the walkthrough glow target */
  walkthroughGlow?: boolean;
  /** True when walkthrough is active but this tab is NOT the target, lock it */
  walkthroughLocked?: boolean;
}

function TabItem({
  config,
  focused,
  onPress,
  onLongPress,
  walkthroughGlow,
  walkthroughLocked,
}: TabItemProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const activeOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // Walkthrough glow pulse — preserved from previous implementation.
  const walkthroughPulse = useSharedValue(0);
  useEffect(() => {
    if (walkthroughGlow) {
      walkthroughPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(walkthroughPulse);
      walkthroughPulse.value = 0;
    }
  }, [walkthroughGlow, walkthroughPulse]);

  const walkthroughGlowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(14, 165, 233, ${walkthroughPulse.value})`,
    borderWidth: walkthroughPulse.value > 0.05 ? 2.5 : 0,
    shadowColor: ACCENT,
    shadowOpacity: walkthroughPulse.value * 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: walkthroughPulse.value > 0.05 ? 12 : 0,
    backgroundColor: `rgba(224, 242, 254, ${walkthroughPulse.value * 0.4})`,
  }));

  // Focus-driven pill fade (no spring, no overshoot).
  useEffect(() => {
    if (reducedMotion) {
      activeOpacity.value = focused ? 1 : 0;
      return;
    }
    activeOpacity.value = withTiming(focused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }, [focused, activeOpacity, reducedMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: activeOpacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeOpacity.value,
      [0, 1],
      [LABEL_INACTIVE, ACCENT],
    ),
  }));

  const iconWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const { playSound } = useSoundEffect();

  const handlePress = useCallback(() => {
    tapHaptic();
    playSound("btn_click_soft_1");
    if (!reducedMotion) {
      pressScale.value = withSequence(
        withTiming(0.92, { duration: 60, easing: Easing.out(Easing.ease) }),
        withTiming(1,    { duration: 60, easing: Easing.out(Easing.ease) }),
      );
    }
    onPress();
  }, [onPress, playSound, pressScale, reducedMotion]);

  const { Icon, label, badge } = config;

  return (
    <Pressable
      onPress={walkthroughLocked ? undefined : handlePress}
      onLongPress={walkthroughLocked ? undefined : onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      accessibilityHint={`עבור ללשונית ${label}`}
      style={styles.tabItem}
    >
      {/* Icon wrapper: holds the pill + icon, takes the press pop and the walkthrough glow. */}
      <Animated.View
        style={[
          styles.iconWrapper,
          iconWrapperStyle,
          walkthroughGlow && walkthroughGlowStyle,
          walkthroughGlow && { borderRadius: 14 },
        ]}
      >
        {/* Pill background — always mounted, opacity-driven. */}
        <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
        {/* Static colorful icon. */}
        <View style={[styles.iconContainer, walkthroughLocked && { opacity: 0.2 }]}>
          <Icon size={ICON_SIZE} />
        </View>
      </Animated.View>

      {/* Label — color-only animation (no weight change). */}
      <Animated.Text
        style={[
          styles.tabLabel,
          labelStyle,
          walkthroughLocked && { opacity: 0.2, color: "#cbd5e1" },
          walkthroughGlow && { color: ACCENT },
        ]}
      >
        {label}
      </Animated.Text>

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badgeContainer, { borderColor: theme.surface }]}>
          <Text style={styles.badgeText}>
            {badge > 99 ? "99+" : String(badge)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main tab bar
// ---------------------------------------------------------------------------

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 8 : 12);

  // Walkthrough glow — visual only, tabs always usable.
  const glowTabKey = useWalkthroughGlowTab();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tabConfig = TABS.find((t) => t.key === route.name);
        if (!tabConfig) return null;

        const focused = state.index === index;
        const isGlowTarget = glowTabKey === route.name;
        const isLocked = false; // Tabs always usable, glow is visual only.

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            config={tabConfig}
            focused={focused}
            onPress={onPress}
            onLongPress={onLongPress}
            walkthroughGlow={isGlowTarget}
            walkthroughLocked={isLocked}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row-reverse",
    backgroundColor: TAB_BAR_BG,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 8,
    minHeight: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
    position: "relative",
  },
  iconWrapper: {
    width: PILL_W,
    height: PILL_H,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PILL_W,
    height: PILL_H,
    borderRadius: 14,
    backgroundColor: ACCENT_BG,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    writingDirection: "rtl",
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: "18%",
    backgroundColor: CLASH.redBadge,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: TAB_BAR_BG,
    zIndex: 10,
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 10,
    lineHeight: 13,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0, no errors. If any error mentions removed Lucide imports (`Compass`, `BookOpen`, `MessageCircle`, `TrendingUp`, `Users`, `LucideIcon`), they must be cleaned up — every Lucide import was removed in Step 1, so this should already be the case.

- [ ] **Step 3: Manual visual verification — start the app**

Run: `npm run start` (or whichever device target you prefer: `npm run ios`, `npm run android`, `npm run web`).

Wait until Metro/the dev server is up and the app is loaded on a device or simulator.

- [ ] **Step 4: Manual visual verification — checklist**

With the app open, confirm each of the following:

- [ ] All 5 tabs render with multi-color illustrated icons (gold coin / compass / open book / two people / purple bubble) — no Lucide outlines remain.
- [ ] Tap each tab in sequence (השקעות → פיד → למידה → חברים → צ'אט and back). The active tab's pill fades in smoothly; the previous tab's pill fades out. **Nothing wobbles, jumps, springs back, or shifts position.**
- [ ] Inactive icons stay fully colorful (no greying).
- [ ] Active label text is sky-blue; inactive labels are slate-grey. Label width does not change between active/inactive (no font-weight reflow).
- [ ] Tap the *already-active* tab — the icon area pops briefly (scale down then back up) on press but the pill does not flicker.
- [ ] On a device with OS reduce-motion enabled, the pill snaps in/out without animation and the press pop is skipped. Tabs still navigate.
- [ ] If the app walkthrough is currently active, the targeted tab still shows the existing pulsing sky-blue border + soft sky bg + glow shadow.
- [ ] If any tab has a badge, the red badge still renders correctly at the top-right of the icon area.
- [ ] RTL order on a Hebrew device is, left-to-right: chat | friends | למידה | פיד | השקעות.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AnimatedTabBar.tsx
git commit -m "refactor(tab-bar): adopt Duolingo-style pill + illustrated icons

- Replace per-tab radial gradient glow with single sky-tinted pill on the active tab
- Swap stroked Lucide icons for multi-color illustrated SVGs (one per tab)
- Drop focus-driven size/strokeWidth/scale/translate/fontWeight transitions
  that caused the wobble glitch on tab switch
- Active state now driven by a single opacity timing animation (180ms)
- Press pop kept as one-shot pressScale on tap
- Walkthrough glow, badges, haptics, sound, accessibility preserved"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Implemented in |
|---|---|
| Bar container styles unchanged | Task 6 — `styles.tabBar` (kept verbatim from current file) |
| Tab item layout (pill + icon + label + badge) | Task 6 — `TabItem` JSX + styles |
| Pill dimensions (52×40, radius 14, sky-100 fill, sky-200 border) | Task 6 — `styles.pill`, `PILL_W`, `PILL_H` |
| Pill always mounted, opacity-driven fade | Task 6 — `pillStyle` `useAnimatedStyle` reading `activeOpacity` |
| Icon size fixed at 28, never resized | Task 6 — `ICON_SIZE = 28` passed once, never re-driven |
| Label fontWeight constant 700, color-only change | Task 6 — `styles.tabLabel.fontWeight: "700"` + `labelStyle` interpolateColor |
| 5 illustrated icons (concept + palette per spec) | Tasks 1-5 — full SVGs |
| Icons in `src/components/ui/tabIcons/` with `index.ts` barrel | Tasks 1-5 |
| Active state: 180ms timing fade | Task 6 — `withTiming(.., { duration: 180, easing: Easing.out(Easing.ease) })` |
| Press pop: 1 → 0.92 → 1 over 120ms | Task 6 — `withSequence(withTiming(0.92, 60), withTiming(1, 60))` |
| Removed: radial gradient glow, TAB_COLORS, ICON_SIZE_FOCUSED, strokeWidth swap, focus scale spring, focus translateY, fontWeight swap | Task 6 — none of these symbols appear in the new file |
| Preserved: 5-tab order, route names, walkthrough glow, badges, haptics, sound, reduced motion, accessibility, learnTabFlashedThisSession flag | Task 6 — kept verbatim |
| Verification gate = `npx tsc --noEmit` + manual checklist | Every task has a type-check step; Task 6 has the manual checklist |

No spec section is missing.

**Placeholder scan:** No "TBD", "TODO", "implement later", "add appropriate error handling", or vague references in the plan. Every code step contains the full code; every command is exact.

**Type / name consistency:**
- `TabIconProps` is defined identically in every icon file (Tasks 1-5) and re-defined in `AnimatedTabBar.tsx` (Task 6) for the local `TabIconComponent` alias. Each icon component matches: `(props: { size?: number }) => JSX.Element`. ✓
- Named exports (`InvestmentsIcon`, `FeedIcon`, `LearnIcon`, `FriendsIcon`, `ChatIcon`) match between each icon file (Tasks 1-5), the barrel `index.ts` (Task 5 Step 2), and the consumer import in Task 6. ✓
- The `TABS` array in Task 6 references each icon component by the same exported name. ✓
- `activeOpacity`, `pressScale`, `walkthroughPulse` shared values are declared once in `TabItem` and used in matching `useAnimatedStyle` hooks — no name drift. ✓
- Color tokens (`ACCENT`, `ACCENT_BG`, `ACCENT_BORDER`, `LABEL_INACTIVE`, `TAB_BAR_BG`) are declared once in Task 6 and referenced consistently in `styles` and animated styles. ✓

No issues found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-08-bottom-nav-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
