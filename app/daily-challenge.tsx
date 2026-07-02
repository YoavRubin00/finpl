import { Redirect } from "expo-router";

/**
 * Legacy route kept only as a redirect: nothing in the app navigates here
 * anymore (the live daily systems are the quests sheet + the news challenge
 * on the learn map), but a stale external/push deep-link may still point at
 * it. Landing home beats a "בקרוב" dead-end (ים 2026-07-02).
 */
export default function DailyChallengePage() {
  return <Redirect href="/(tabs)" />;
}