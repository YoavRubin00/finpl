import { Stack } from 'expo-router';

export default function ClanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="project/[id]" />
    </Stack>
  );
}
