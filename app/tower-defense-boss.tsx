import React, { useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useChapterStore } from "../src/features/chapter-1-content/useChapterStore";
import { TowerDefenseScreen } from "../src/features/tower-defense/TowerDefenseScreen";

export default function TowerDefenseBossPage() {
  const router = useRouter();
  const markBossComplete = useChapterStore((s) => s.markBossComplete);

  const handleExit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as never);
    }
  }, [router]);

  const handleVictory = useCallback(() => {
    markBossComplete("ch-1");
    router.replace("/(tabs)" as never);
  }, [router, markBossComplete]);

  return (
    <>
      <StatusBar style="light" />
      <TowerDefenseScreen onExit={handleExit} onVictory={handleVictory} />
    </>
  );
}
