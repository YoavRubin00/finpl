/**
 * Standalone host for the BullshitSwipe daily-quest game.
 *
 * Daily quest "סוויפ חמסה" sends users here. We render the card with
 * bypassDailyGate so the quest counts even on a day the user already
 * burned the natural-gate play, then bounce back to the learn map on
 * completion (the card's own completion side-effects mark the quest
 * complete via useDailyQuestsStore).
 *
 * Replaces the legacy Feed-scroll flow (setPendingFeedScrollById) that
 * was deleted on 2026-05-30 when the FinFeed screen was retired.
 */

import React, { useCallback, useRef } from "react";
import { Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { BullshitSwipeCard } from "../../src/features/finfeed/minigames/bullshit-swipe/BullshitSwipeCard";
import { tapHaptic, successHaptic } from "../../src/utils/haptics";

export default function QuestSwipeGamePage(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);

  const handleClose = useCallback(() => {
    // If the post-finish setTimeout is already in flight, let it run rather
    // than racing it — otherwise X-tap during the 800ms tail double-navigates.
    if (finishedRef.current) return;
    tapHaptic();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/learn" as never);
  }, [router]);

  // The card calls onFinish after the user completes (or runs out of) the
  // 5-card round. Mark a haptic and drop the user back to the learn map.
  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    successHaptic();
    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/learn" as never);
    }, 800);
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
        <BullshitSwipeCard
          isActive
          bypassDailyGate
          onFinish={handleFinish}
        />
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
    right: 16, // RTL Hebrew leading edge — close button lives on the right side per user request
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
