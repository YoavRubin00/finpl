import { View, Pressable, StyleSheet, Text, Platform } from "react-native";
import {
  Compass,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Users,
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
import { CLASH } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { useWalkthroughGlowTab } from "../../features/onboarding/AppWalkthroughOverlay";

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
}

// Visual L→R ordering in RTL: chat | friends | למידה (center) | פיד | השקעות
// The array reads right-to-left in RTL, so array[0] = rightmost tab visually.
const TABS: TabConfig[] = [
  { key: "investments", label: "השקעות",  Icon: TrendingUp },
  { key: "learn",       label: "פיד",     Icon: Compass },
  { key: "index",       label: "למידה",   Icon: BookOpen },
  { key: "friends",     label: "חברים",   Icon: Users },
  { key: "chat",        label: "צ'אט",   Icon: MessageCircle },
];

// Per-tab accent colors, unified blue palette
const TAB_COLORS: Record<string, string> = {
  learn:       "#0ea5e9", // sky blue (feed)
  index:       "#0891b2", // cyan (learn)
  investments: "#1d4ed8", // blue
  friends:     "#6366f1", // indigo, distinct but harmonizes with blues
  chat:        "#3b82f6", // blue
};

const TAB_BAR_BG = "#fafafa";
const ICON_SIZE_DEFAULT = 30;
const ICON_SIZE_FOCUSED = 34;
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
  const activeColor = TAB_COLORS[config.key] ?? "#7c3aed";
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const activeGlow = useSharedValue(0);

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
      scale.value = focused ? 1.15 : 1;
      translateY.value = focused ? -2 : 0;
      activeGlow.value = focused ? 1 : 0;
      return;
    }
    scale.value = withSpring(focused ? 1.15 : 1, SPRING_FAST);
    translateY.value = withSpring(focused ? -2 : 0, SPRING_FAST);
    activeGlow.value = withTiming(focused ? 1 : 0, { duration: focused ? 180 : 150 });
  }, [focused, scale, translateY, activeGlow, reducedMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const activeGlowStyle = useAnimatedStyle(() => ({
    opacity: activeGlow.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const { playSound } = useSoundEffect();

  const handlePress = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_1');
    onPress();
  }, [onPress, playSound]);

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
      {/* Ultra-Premium SVG Optical Glow (No hard circles) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: -2,
            alignSelf: "center",
            width: 72,
            height: 72,
          },
          activeGlowStyle
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
              <Stop offset="0%" stopColor={activeColor} stopOpacity="0.55" />
              <Stop offset="40%" stopColor={activeColor} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={activeColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#glow-${config.key})`} />
        </Svg>
      </Animated.View>

      {/* Icon + label container */}
      <Animated.View style={[styles.iconContainer, containerStyle, walkthroughGlow && walkthroughGlowStyle, walkthroughGlow && { borderRadius: 18, overflow: "visible" }]}>
        <View style={[
          styles.iconCircle,
          focused && { backgroundColor: "transparent" },
          walkthroughLocked && { opacity: 0.2 },
        ]}>
          <Icon
            size={focused ? ICON_SIZE_FOCUSED : ICON_SIZE_DEFAULT}
            color={walkthroughLocked ? "#cbd5e1" : walkthroughGlow ? "#0ea5e9" : (focused ? activeColor : activeColor + "90")}
            strokeWidth={focused ? 2.8 : 1.8}
          />
        </View>
      </Animated.View>

      {/* Label, always visible, bolder when focused */}
      <Text
        style={[
          styles.tabLabel,
          { color: walkthroughLocked ? "#cbd5e1" : walkthroughGlow ? "#0ea5e9" : (focused ? activeColor : activeColor + "90") },
          focused && styles.tabLabelFocused,
          walkthroughLocked && { opacity: 0.2 },
        ]}
      >
        {label}
      </Text>

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

  // Walkthrough glow, visual only, tabs always usable
  const glowTabKey = useWalkthroughGlowTab();
  const walkthroughActive = glowTabKey !== null;

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
    position: "relative",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
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
