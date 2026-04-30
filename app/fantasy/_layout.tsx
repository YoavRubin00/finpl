import { Stack } from 'expo-router';

export default function FantasyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="draft" />
      <Stack.Screen name="live" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
