import { Stack } from 'expo-router';
import { FriendsModeOverlay } from '../../src/features/friends-hub/FriendsModeOverlay';

export default function ClanLayout() {
  return (
    <FriendsModeOverlay>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="project/[id]" />
      </Stack>
    </FriendsModeOverlay>
  );
}
