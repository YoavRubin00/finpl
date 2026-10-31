import { Redirect, Stack } from "expo-router";
import { SOCIAL_FEATURES_ENABLED } from "../../src/config/social";

export default function CrowdWisdomLayout() {
  // Social features off (src/config/social.ts): deep links land on the learning map.
  if (!SOCIAL_FEATURES_ENABLED) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
