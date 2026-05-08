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
      </View>
      {/* Captain Shark retention nudges — session bonus / seasonal events / hearts-full */}
      <RetentionToasts />
    </View>
  );
}
