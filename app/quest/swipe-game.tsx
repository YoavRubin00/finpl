/**
 * Standalone host for the DAILY GAME quest (formerly only BullshitSwipe).
 *
 * Yoav 2026-05-31: previously this route hardcoded BullshitSwipeCard so the
 * daily quest was always "swipe" — same game every day. Now the route picks
 * one of 10 playable game cards by day-of-year, so every morning the user
 * gets a different game in their daily quest. The quest type stays 'swipe'
 * in `useDailyQuestsStore` for completion-tracking compatibility (renaming
 * the type would clobber existing users' partial daily completions); only
 * the surfaced game rotates.
 *
 * Route name preserved as /quest/swipe-game so notifications, deep-links,
 * and DailyQuestsSheet handoff continue to work without migration.
 */

import React, { useCallback, useMemo, useRef } from "react";
import { Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { BullshitSwipeCard } from "../../src/features/finfeed/minigames/bullshit-swipe/BullshitSwipeCard";
import { HigherLowerCard } from "../../src/features/finfeed/minigames/higher-lower/HigherLowerCard";
import { BudgetNinjaCard } from "../../src/features/finfeed/minigames/budget-ninja/BudgetNinjaCard";
import { PriceSliderCard } from "../../src/features/finfeed/minigames/price-slider/PriceSliderCard";
import { FomoKillerCard } from "../../src/features/finfeed/minigames/fomo-killer/FomoKillerCard";
import { CashoutRushCard } from "../../src/features/finfeed/minigames/cashout-rush/CashoutRushCard";
import { CrashGameCard } from "../../src/features/daily-challenges/CrashGameCard";
import { DilemmaCard } from "../../src/features/daily-challenges/DilemmaCard";
import { InvestmentCard } from "../../src/features/daily-challenges/InvestmentCard";
import { MythFeedCard } from "../../src/features/myth-or-tachles/MythFeedCard";
import { tapHaptic, successHaptic } from "../../src/utils/haptics";

// Game rotation pool — 10 playable cards. Index by `Math.floor(Date.now() /
// 86400000) % 10` so the same day-of-year always picks the same game (UTC
// boundary; matches the rest of the daily content scheduling). Length 10
// means each game cycles every 10 days. Order is intentional: starts with
// fast/familiar games (swipe, higher-lower, ninja, slider), then moves to
// slower/deeper (cashout, crash, dilemma, investment, myth) so a user who
// catches the rotation cold (day 5/10) still sees variety in the first week.
const ROTATION: ReadonlyArray<
  | 'bullshit-swipe'
  | 'higher-lower'
  | 'budget-ninja'
  | 'price-slider'
  | 'fomo-killer'
  | 'cashout-rush'
  | 'crash'
  | 'dilemma'
  | 'investment'
  | 'myth'
> = [
  'bullshit-swipe',
  'higher-lower',
  'budget-ninja',
  'price-slider',
  'fomo-killer',
  'cashout-rush',
  'crash',
  'dilemma',
  'investment',
  'myth',
];

function pickTodayGame(): typeof ROTATION[number] {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return ROTATION[dayIndex % ROTATION.length];
}

export default function QuestDailyGamePage(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);
  // Lock the game choice for this mount so the screen doesn't flip if the
  // user lingers past UTC midnight. Using useMemo with empty deps so it's
  // computed exactly once when the component first renders.
  const todayGame = useMemo(pickTodayGame, []);

  const handleClose = useCallback(() => {
    // If the post-finish setTimeout is already in flight, let it run rather
    // than racing it — otherwise X-tap during the 800ms tail double-navigates.
    if (finishedRef.current) return;
    tapHaptic();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/learn" as never);
  }, [router]);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    successHaptic();
    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/learn" as never);
    }, 800);
  }, [router]);

  const renderGame = (): React.ReactElement => {
    switch (todayGame) {
      case 'bullshit-swipe':
        return <BullshitSwipeCard isActive bypassDailyGate onFinish={handleFinish} />;
      case 'higher-lower':
        return <HigherLowerCard isActive onComplete={handleFinish} />;
      case 'budget-ninja':
        return <BudgetNinjaCard isActive onContinue={handleFinish} />;
      case 'price-slider':
        return <PriceSliderCard isActive onContinue={handleFinish} />;
      case 'fomo-killer':
        return <FomoKillerCard isActive onContinue={handleFinish} />;
      case 'cashout-rush':
        return <CashoutRushCard isActive onContinue={handleFinish} />;
      case 'crash':
        return <CrashGameCard isActive onContinue={handleFinish} />;
      case 'dilemma':
        return <DilemmaCard isActive onContinue={handleFinish} />;
      case 'investment':
        return <InvestmentCard isActive onContinue={handleFinish} />;
      case 'myth':
        return <MythFeedCard isInterModule onSkip={handleFinish} />;
    }
  };

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
        {renderGame()}
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
    right: 16, // RTL Hebrew leading edge
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
