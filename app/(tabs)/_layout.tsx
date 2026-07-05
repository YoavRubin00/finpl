import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlobalWealthHeader } from "../../src/components/ui/GlobalWealthHeader";
import { AnimatedTabBar } from "../../src/components/ui/AnimatedTabBar";
import { RetentionToasts } from "../../src/features/retention-loops/RetentionToasts";
import { BoostBanner } from "../../src/components/ui/BoostBanner";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

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
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Tabs
          initialRouteName="investments"
          screenOptions={{
            headerShown: false,
          }}
          tabBar={(props) => <AnimatedTabBar {...props} />}
        >
          {/* Tools tab — leftmost (RTL: rightmost) — the Financial Tools hub
              replaces the dead Feed entry in the tab order. */}
          <Tabs.Screen name="tools" />
          <Tabs.Screen name="investments" />
          <Tabs.Screen name="index" />
          {/* Friends tab — kept visible but its screen content is gated/blocked
              as it was on dev. Do NOT swap to feature/flag's open Friends Hub. */}
          <Tabs.Screen name="friends" />
          <Tabs.Screen name="chat" />
          {/* The legacy Feed/learn screen is no longer reachable from the tab
              bar — its useful content is migrating into the learning modules
              (see Stage C). Kept registered (href: null) so any deep-link or
              walkthrough route still resolves until those are migrated. */}
          <Tabs.Screen name="learn" options={{ href: null }} />
          <Tabs.Screen name="more" options={{ href: null }} />
          <Tabs.Screen name="simulator" options={{ href: null }} />
          <Tabs.Screen name="shop" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
          <Tabs.Screen name="fantasy" options={{ href: null }} />
        </Tabs>
      </View>
      {/* Captain Shark retention nudges — session bonus / seasonal events / hearts-full */}
      <RetentionToasts />
    </View>
  );
}
