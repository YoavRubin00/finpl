import React from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { Home, Brain, Trophy, Shield, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";

import { tapHaptic } from "../../utils/haptics";
import { useFriendsModeStore } from "./useFriendsModeStore";

/**
 * Single source of truth for the Friends-Mode bottom bar.
 *
 * Used by:
 *   • AnimatedTabBar (when inside `(tabs)` and friendsMode.enabled === true)
 *   • FriendsModeOverlay (when on routes outside `(tabs)` like /clan, /fantasy)
 *
 * Active key is derived from the current pathname.
 */

interface FriendsTabConfig {
  key: "home" | "knowledge" | "fantasy" | "clan";
  label: string;
  Icon: LucideIcon;
  color: string;
  pill: string;
  /** Routes that mark this tab as "active" (one tab can own several routes). */
  matchRoutes: readonly string[];
}

// Visual L→R ordering in RTL: clan | fantasy | knowledge | home (rightmost in RTL)
// Array[0] = rightmost visually in RTL.
const FRIENDS_TABS: readonly FriendsTabConfig[] = [
  { key: "home",      label: "בית",         Icon: Home,   color: "#3b82f6", pill: "#dbeafe", matchRoutes: [] },
  { key: "knowledge", label: "חכמת המונים", Icon: Brain,  color: "#8b5cf6", pill: "#ede9fe", matchRoutes: ["/anon-advice", "/crowd-wisdom"] },
  { key: "fantasy",   label: "פנטזי ליג",   Icon: Trophy, color: "#f59e0b", pill: "#fef3c7", matchRoutes: ["/fantasy"] },
  { key: "clan",      label: "קלאן",        Icon: Shield, color: "#10b981", pill: "#d1fae5", matchRoutes: ["/clan"] },
] as const;

const TAB_BAR_BG = "#ffffff";
const INACTIVE_COLOR = "#94a3b8";
const INACTIVE_LABEL = "#64748b";
const SPRING_FAST = { damping: 18, stiffness: 380 };

function activeKeyFromPath(pathname: string): FriendsTabConfig["key"] | null {
  for (const t of FRIENDS_TABS) {
    for (const m of t.matchRoutes) {
      if (pathname.startsWith(m)) return t.key;
    }
  }
  return null;
}

interface FriendsTabItemProps {
  config: FriendsTabConfig;
  focused: boolean;
  onPress: () => void;
}

function FriendsTabItem({ config, focused, onPress }: FriendsTabItemProps) {
  const scale = useSharedValue(focused ? 1.05 : 1);
  const pillScale = useSharedValue(focused ? 1 : 0);
  const indicatorScale = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(pillScale);
    cancelAnimation(indicatorScale);
    scale.value = withSpring(focused ? 1.05 : 1, SPRING_FAST);
    pillScale.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 320 });
    indicatorScale.value = withSpring(focused ? 1 : 0, SPRING_FAST);
  }, [focused, scale, pillScale, indicatorScale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillScale.value,
    transform: [{ scaleX: pillScale.value }, { scaleY: 0.7 + 0.3 * pillScale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorScale.value,
    transform: [{ scaleX: indicatorScale.value }],
  }));

  const { Icon } = config;

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: focused }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    >
      {/* Top indicator */}
      <Animated.View
        style={[styles.topIndicator, { backgroundColor: config.color }, indicatorStyle]}
        pointerEvents="none"
      />
      {/* Soft tinted pill */}
      <Animated.View
        style={[styles.pillBg, { backgroundColor: config.pill }, pillStyle]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon
          size={focused ? 26 : 24}
          color={focused ? config.color : INACTIVE_COLOR}
          strokeWidth={focused ? 2.4 : 1.9}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? config.color : INACTIVE_LABEL,
            fontWeight: focused ? "800" : "600",
          },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </Pressable>
  );
}

interface FriendsTabRowProps {
  /** When true, applies safe-area bottom padding. False when nested in an existing bar with its own padding. */
  applySafeArea?: boolean;
  /** Override the active key (rare — most callers should let the component derive from pathname). */
  forcedActiveKey?: FriendsTabConfig["key"] | null;
}

export function FriendsTabRow({
  applySafeArea = true,
  forcedActiveKey,
}: FriendsTabRowProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const exitFriendsMode = useFriendsModeStore((s) => s.exit);

  const activeKey: FriendsTabConfig["key"] | null =
    forcedActiveKey !== undefined ? forcedActiveKey : activeKeyFromPath(pathname);

  const bottomPadding = applySafeArea
    ? Math.max(insets.bottom, Platform.OS === "web" ? 8 : 12)
    : 0;

  const handlePress = React.useCallback(
    (tab: FriendsTabConfig) => {
      tapHaptic();
      if (tab.key === "home") {
        exitFriendsMode();
        router.push("/(tabs)" as never);
        return;
      }
      // First route in matchRoutes is the canonical destination.
      const dest = tab.matchRoutes[0];
      if (dest) {
        router.push(dest as never);
      }
    },
    [exitFriendsMode, router],
  );

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPadding }]}>
      {FRIENDS_TABS.map((tab) => (
        <FriendsTabItem
          key={tab.key}
          config={tab}
          focused={activeKey === tab.key}
          onPress={() => handlePress(tab)}
        />
      ))}
    </View>
  );
}

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
  },
  pillBg: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 52,
    height: 32,
    borderRadius: 999,
  },
  iconWrap: {
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
});
