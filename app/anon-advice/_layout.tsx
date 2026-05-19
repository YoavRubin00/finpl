import { Stack } from 'expo-router';
import { FriendsModeOverlay } from '../../src/features/friends-hub/FriendsModeOverlay';

export default function AnonAdviceLayout() {
  return (
    <FriendsModeOverlay>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="post/[id]" />
      </Stack>
    </FriendsModeOverlay>
  );
}