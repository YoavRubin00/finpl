import React, { useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useChapterUIStore } from "../src/features/chapter-1-content/useChapterUIStore";
import { TowerDefenseScreen } from "../src/features/tower-defense/TowerDefenseScreen";

export default function TowerDefenseBossPage() {
  const router = useRouter();
  const markBossComplete = useChapterUIStore((s) => s.markBossComplete);

  const handleExit = useCallback(() => {
    // Always jump straight to the Learn map. router.back() lands on the
    // mod-1-9 summary screen whose "המשך" routes through
    // goToNextSequentialModule → tower-defense again, trapping the user in
    // an infinite loop (QA audit 2026-05-31). Use replace so the stack is
    // wiped and there's no Back path back into the boss fight either.
    // "/(tabs)/index" instead of "/(tabs)" because the tabs layout has
    // initialRouteName="investments", so the bare "/(tabs)" lands on
    // Investments instead of the chapter-2 unlock celebration.
    router.replace("/(tabs)/index" as never);
  }, [router]);

  const handleVictory = useCallback(() => {
    markBossComplete("ch-1");
    router.replace("/(tabs)/index" as never);
  }, [router, markBossComplete]);

  return (
    <>
      <StatusBar style="light" />
      <TowerDefenseScreen onExit={handleExit} onVictory={handleVictory} />
    </>
  );
}
