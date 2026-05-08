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

let learnTabFlashedThisSession = false;

interface TabIconProps {
  size?: number;
}
type TabIconComponent = ComponentType<TabIconProps>;

interface TabConfig {
  key: string;
  label: string;
  Icon: TabIconComponent;
  activeBg: string;
  activeBorder: string;
  badge?: number;
}

// Visual L→R ordering in RTL: chat | friends | למידה (center) | פיד | השקעות
// The array reads right-to-left in RTL, so array[0] = rightmost tab visually.
const TABS: TabConfig[] = [
  { key: "investments", label: "השקעות", Icon: InvestmentsIcon, activeBg: "#dff5e1", activeBorder: "#bce5be" },
  { key: "learn",       label: "פיד",    Icon: FeedIcon,        activeBg: "#ffe1d6", activeBorder: "#fac1a8" },
  { key: "index",       label: "למידה",  Icon: LearnIcon,       activeBg: "#dde9ff", activeBorder: "#b3cbf3" },
  { key: "friends",     label: "חברים",  Icon: FriendsIcon,     activeBg: "#ecdcff", activeBorder: "#cdb3ed" },
  { key: "chat",        label: "צ'אט",  Icon: ChatIcon,        activeBg: "#d4f1ec", activeBorder: "#aadcd2" },
];

const LABEL_INACTIVE = "#6b7373";
const LABEL_ACTIVE = "#1f2424";
const TAB_BAR_BG = "#fafafa";
const WALKTHROUGH_ACCENT = "#0ea5e9";
const ICON_SIZE = 36;
const PILL_W = 54;
const PILL_H = 48;
const PILL_RADIUS = 14;

interface TabItemProps {
  config: TabConfig;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  walkthroughGlow?: boolean;
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
    shadowColor: WALKTHROUGH_ACCENT,
    shadowOpacity: walkthroughPulse.value * 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: walkthroughPulse.value > 0.05 ? 12 : 0,
    backgroundColor: `rgba(224, 242, 254, ${walkthroughPulse.value * 0.4})`,
  }));

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
      [LABEL_INACTIVE, LABEL_ACTIVE],
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
        withTiming(1, { duration: 60, easing: Easing.out(Easing.ease) }),
      );
    }
    onPress();
  }, [onPress, playSound, pressScale, reducedMotion]);

  const { Icon, label, badge, activeBg, activeBorder } = config;

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
      <Animated.View
        style={[
          styles.iconWrapper,
          iconWrapperStyle,
          walkthroughGlow && walkthroughGlowStyle,
          walkthroughGlow && { borderRadius: PILL_RADIUS },
        ]}
      >
        <Animated.View
          style={[
            styles.pill,
            pillStyle,
            { backgroundColor: activeBg, borderColor: activeBorder },
          ]}
          pointerEvents="none"
        />
        <View style={[styles.iconContainer, walkthroughLocked && { opacity: 0.2 }]}>
          <Icon size={ICON_SIZE} />
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.tabLabel,
          labelStyle,
          walkthroughLocked && { opacity: 0.2, color: "#cbd5e1" },
          walkthroughGlow && { color: WALKTHROUGH_ACCENT },
        ]}
      >
        {label}
      </Animated.Text>

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

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 8 : 12);

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
        const isLocked = false;

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

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row-reverse",
    backgroundColor: TAB_BAR_BG,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 8,
    minHeight: 86,
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
    borderRadius: PILL_RADIUS,
    borderWidth: 2,
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
