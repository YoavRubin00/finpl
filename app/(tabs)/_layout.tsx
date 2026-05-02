import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { useRef } from "react";
import { GlobalWealthHeader } from "../../src/components/ui/GlobalWealthHeader";
import { AnimatedTabBar } from "../../src/components/ui/AnimatedTabBar";
import { RetentionToasts } from "../../src/features/retention-loops/RetentionToasts";
import { BoostBanner } from "../../src/components/ui/BoostBanner";

const SLIDE_PX = 70;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const prevTabIndex = useRef<number | null>(null);
  const slideX = useSharedValue(0);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  function onTabStateChange(newIndex: number | undefined) {
    if (newIndex === undefined) return;
    if (prevTabIndex.current !== null && prevTabIndex.current !== newIndex && !reducedMotion) {
      const from = newIndex > prevTabIndex.current ? -SLIDE_PX : SLIDE_PX;
      slideX.value = withSequence(
        withTiming(from, { duration: 0 }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );
    }
    prevTabIndex.current = newIndex;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ backgroundColor: "#ffffff" }}>
        <View style={{ paddingTop: insets.top }} />
        <GlobalWealthHeader />
        {/* Active boost countdown — hidden when no boost is active */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
          <BoostBanner />
        </View>
      </View>
      <Animated.View style={[{ flex: 1, overflow: "hidden" }, slideStyle]}>
      <Tabs
        initialRouteName="investments"
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenListeners={{
          state: (e) => {
            const st = e.data?.state as { index?: number } | undefined;
            onTabStateChange(st?.index);
          },
        }}
      >
        <Tabs.Screen name="investments" />
        <Tabs.Screen name="learn" />
        <Tabs.Screen name="index" />
        <Tabs.Screen name="friends" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="more" options={{ href: null }} />
        <Tabs.Screen name="simulator" options={{ href: null }} />
        <Tabs.Screen name="shop" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="fantasy" options={{ href: null }} />
        <Tabs.Screen name="arena" options={{ href: null }} />
      </Tabs>
      </Animated.View>
      {/* Captain Shark retention nudges — session bonus / seasonal events / hearts-full */}
      <RetentionToasts />
    </View>
  );
}
