import { Stack } from 'expo-router';
import { FANTASY_COMING_SOON, FantasyComingSoonScreen } from '../../src/features/fantasy-league/FantasyComingSoon';

export default function FantasyLayout() {
  // Coming-soon gate (Yoav 2026-07-06): blocks ALL /fantasy/* routes,
  // including deep links. Flip FANTASY_COMING_SOON to false to reopen.
  if (FANTASY_COMING_SOON) return <FantasyComingSoonScreen />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="draft" />
      <Stack.Screen name="live" />
    </Stack>
  );
}
