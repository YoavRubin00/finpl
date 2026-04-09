import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlobalWealthHeader } from "../../src/components/ui/GlobalWealthHeader";
import { AnimatedTabBar } from "../../src/components/ui/AnimatedTabBar";
import { useTutorialStore } from "../../src/stores/useTutorialStore";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const hydrated = useTutorialStore((s) => s._hydrated);

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ backgroundColor: "#ffffff" }}>
        <View style={{ paddingTop: insets.top }} />
        <GlobalWealthHeader />
      </View>
      <Tabs
        initialRouteName="investments"
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <AnimatedTabBar {...props} />}
      >
        <Tabs.Screen name="investments" />
        <Tabs.Screen name="index" />
        <Tabs.Screen name="learn" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="more" options={{ href: null }} />
        <Tabs.Screen name="simulator" options={{ href: null }} />
        <Tabs.Screen name="shop" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="fantasy" options={{ href: null }} />
        <Tabs.Screen name="arena" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
