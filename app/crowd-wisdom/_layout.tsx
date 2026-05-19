import { Stack } from "expo-router";
import { FriendsModeOverlay } from "../../src/features/friends-hub/FriendsModeOverlay";

export default function CrowdWisdomLayout() {
  return (
    <FriendsModeOverlay>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="history" />
      </Stack>
    </FriendsModeOverlay>
  );
}
