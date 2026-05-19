import { View, Pressable, StyleSheet, Text, Platform } from "react-native";
import {
  Compass,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { useEffect, useCallback } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { tapHaptic } from "../../utils/haptics";
import { CLASH, DUO, STITCH } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { useWalkthroughGlowTab } from "../../features/onboarding/AppWalkthroughOverlay";
import { useFriendsModeStore } from "../../features/friends-hub/useFriendsModeStore";
import { FriendsTabRow } from "../../features/friends-hub/FriendsTabRow";

import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

// Module-level flag: first session gold flash for learn tab
let learnTabFlashedThisSession = false;

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

interface TabConfig {
  key: string;
  label: string;
  Icon: LucideIcon;
  badge?: number;
  isNew?: boolean;
}

// Visual L→R ordering in RTL: chat | friends | למידה (center) | פיד | השקעות | כלים
// The array reads right-to-left in RTL, so array[0] = rightmost tab visually.
const TABS: TabConfig[] = [
  { key: "tools",       label: "כלים",    Icon: Wrench,        isNew: true },
  { key: "investments", label: "השקעות",  Icon: TrendingUp },
  { key: "learn",       label: "פיד",     Icon: Compass },
  { key: "index",       label: "למידה",   Icon: BookOpen },
  { key: "friends",     label: "חברים",   Icon: Users },
  { key: "chat",        label: "צ'אט",   Icon: MessageCircle },
];

// Single accent for active state — DUO blue (Duolingo-style premium)
const ACTIVE_COLOR = DUO.blue;
const ACTIVE_PILL_BG = DUO.blueSurface;
const INACTIVE_COLOR = STITCH.outline;
const INACTIVE_LABEL = STITCH.onSurfaceVariant;
const NEW_BADGE_BG = DUO.green;

const TAB_BAR_BG = "#ffffff";
const ICON_SIZE_DEFAULT = 26;
const ICON_SIZE_FOCUSED = 28;
const SPRING_FAST = { damping: 20, stiffness: 400 };

// ---------------------------------------------------------------------------
// Single tab item, Clash Royale inspired
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

function TabItem({ config, focused, onPress, onLongPress, walkthroughGlow, walkthroughLocked }: TabItemProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const activeGlow = useSharedValue(0);
  const pillScale = useSharedValue(0);
  const indicatorScale = useSharedValue(0);

  // Walkthrough glow animation, fast dramatic pulse
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
    shadowColor: "#0ea5e9",
    shadowOpacity: walkthroughPulse.value * 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: walkthroughPulse.value > 0.05 ? 12 : 0,
    backgroundColor: `rgba(224, 242, 254, ${walkthroughPulse.value * 0.4})`,
  }));

  useEffect(() => {
    if (reducedMotion) {
      scale.value = focused ? 1.05 : 1;
      translateY.value = focused ? -1 : 0;
      activeGlow.value = focused ? 1 : 0;
      pillScale.value = focused ? 1 : 0;
      indicatorScale.value = focused ? 1 : 0;
      return;
    }
    scale.value = withSpring(focused ? 1.05 : 1, SPRING_FAST);
    translateY.value = withSpring(focused ? -1 : 0, SPRING_FAST);
    activeGlow.value = withTiming(focused ? 1 : 0, { duration: focused ? 180 : 150 });
    pillScale.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 320 });
    indicatorScale.value = withTiming(focused ? 1 : 0, { duration: focused ? 220 : 140 });
  }, [focused, scale, translateY, activeGlow, pillScale, indicatorScale, reducedMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const activeGlowStyle = useAnimatedStyle(() => ({
    opacity: activeGlow.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillScale.value,
    transform: [{ scaleX: pillScale.value }, { scaleY: 0.7 + 0.3 * pillScale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorScale.value,
    transform: [{ scaleX: indicatorScale.value }],
  }));

  const { playSound } = useSoundEffect();

  const handlePress = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_1');
    onPress();
  }, [onPress, playSound]);

  const { Icon, label, badge, isNew } = config;

  const iconColor = walkthroughLocked
    ? "#cbd5e1"
    : walkthroughGlow
      ? "#0ea5e9"
      : focused
        ? ACTIVE_COLOR
        : INACTIVE_COLOR;

  const labelColor = walkthroughLocked
    ? "#cbd5e1"
    : walkthroughGlow
      ? "#0ea5e9"
      : focused
        ? ACTIVE_COLOR
        : INACTIVE_LABEL;

  return (
    <Pressable
      onPress={walkthroughLocked ? undefined : handlePress}
      onLongPress={walkthroughLocked ? undefined : onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      accessibilityHint={`עבור ללשונית ${label}`}
      hitSlop={6}
      style={styles.tabItem}
    >
      {/* Top indicator — short blue bar above focused tab */}
      <Animated.View
        style={[styles.topIndicator, indicatorStyle]}
        pointerEvents="none"
      />

      {/* Soft optical glow (kept subtle for premium feel) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 4,
            alignSelf: "center",
            width: 64,
            height: 56,
          },
          activeGlowStyle,
        ]}
        pointerEvents="none"
      >
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient
              id={`glow-${config.key}`}
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor={ACTIVE_COLOR} stopOpacity="0.18" />
              <Stop offset="60%" stopColor={ACTIVE_COLOR} stopOpacity="0.06" />
              <Stop offset="100%" stopColor={ACTIVE_COLOR} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#glow-${config.key})`} />
        </Svg>
      </Animated.View>

      {/* Soft pill behind icon — appears when focused */}
      <Animated.View
        style={[styles.pillBg, pillStyle]}
        pointerEvents="none"
      />

      {/* Icon container */}
      <Animated.View
        style={[
          styles.iconContainer,
          containerStyle,
          walkthroughGlow && walkthroughGlowStyle,
          walkthroughGlow && { borderRadius: 18, overflow: "visible" },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            walkthroughLocked && { opacity: 0.2 },
          ]}
        >
          <Icon
            size={focused ? ICON_SIZE_FOCUSED : ICON_SIZE_DEFAULT}
            color={iconColor}
            fill={focused && !walkthroughLocked ? iconColor : "transparent"}
            strokeWidth={focused ? 2.2 : 1.8}
          />
        </View>
      </Animated.View>

      {/* Label */}
      <Text
        style={[
          styles.tabLabel,
          { color: labelColor },
          focused && styles.tabLabelFocused,
          walkthroughLocked && { opacity: 0.2 },
        ]}
      >
        {label}
      </Text>

      {/* "חדש" badge — green corner badge for new tabs */}
      {isNew && !focused && (
        <View style={styles.newBadge} pointerEvents="none">
          <Text style={styles.newBadgeText}>חדש</Text>
        </View>
      )}

      {/* Numeric badge (notifications count) */}
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

  // Walkthrough glow, visual only, tabs always usable
  const glowTabKey = useWalkthroughGlowTab();
  const walkthroughActive = glowTabKey !== null;

  // Friends Mode swap: if the user entered the Friends Hub, the bottom bar
  // changes to a Friends-specific set (Home / Knowledge / Fantasy / Clan).
  // Mode auto-exits when the user focuses a non-friends global tab.
  const friendsModeEnabled = useFriendsModeStore((s) => s.enabled);
  const exitFriendsMode = useFriendsModeStore((s) => s.exit);
  const focusedRouteName = state.routes[state.index]?.name;
  useEffect(() => {
    if (friendsModeEnabled && focusedRouteName && focusedRouteName !== "friends") {
      exitFriendsMode();
    }
  }, [friendsModeEnabled, focusedRouteName, exitFriendsMode]);

  if (friendsModeEnabled) {
    return <FriendsTabRow />;
  }

  return (
    <View
      style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: bottomPadding }]}
    >
      {state.routes.map((route, index) => {
        const tabConfig = TABS.find((t) => t.key === route.name);
        if (!tabConfig) return null;

        const focused = state.index === index;
        const isGlowTarget = glowTabKey === route.name;
        const isLocked = false; // Tabs always usable, glow is visual only

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
    paddingTop: 8,
    position: "relative",
  },
  topIndicator: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: DUO.blue,
  },
  pillBg: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 52,
    height: 32,
    borderRadius: 999,
    backgroundColor: ACTIVE_PILL_BG,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 48,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    writingDirection: "rtl",
  },
  tabLabelFocused: {
    fontWeight: "800",
    fontSize: 11,
  },
  newBadge: {
    position: "absolute",
    top: 4,
    right: "14%",
    backgroundColor: NEW_BADGE_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: TAB_BAR_BG,
    zIndex: 10,
  },
  newBadgeText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 9,
    letterSpacing: 0.3,
    writingDirection: "rtl",
  },
  badgeContainer: {
    position: "absolute",
    top: 0,
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
