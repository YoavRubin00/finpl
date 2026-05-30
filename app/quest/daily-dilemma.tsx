/**
 * Standalone host for the Daily Dilemma quest.
 *
 * Daily quest "דילמה יומית" sends users here. The card runs its own
 * celebration + close flow on completion; we just provide the host
 * scaffold + a close button to bail out mid-flow.
 *
 * Replaces the legacy Feed-scroll flow (setPendingFeedScrollById) that
 * was deleted on 2026-05-30 when the FinFeed screen was retired.
 */

import React, { useCallback, useRef } from "react";
import { Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { DilemmaCard } from "../../src/features/daily-challenges/DilemmaCard";
import { tapHaptic } from "../../src/utils/haptics";

export default function QuestDailyDilemmaPage(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);

  const handleClose = useCallback(() => {
    tapHaptic();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/learn" as never);
  }, [router]);

  // DilemmaCard already navigates the user to /(tabs)/learn via its
  // celebration button, so onContinue is mostly a backstop in case
  // someone wires it differently in the future.
  const handleContinue = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/learn" as never);
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Pressable
        onPress={handleClose}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="חזרה למפת הלמידה"
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DilemmaCard isActive onContinue={handleContinue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  closeBtn: {
    position: "absolute",
    left: 16, // RTL: X close lives top-left, matching iOS-native + CaptainSharkOverlay/FinnMailModal convention
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.1)",
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#475569",
    lineHeight: 18,
  },
});
