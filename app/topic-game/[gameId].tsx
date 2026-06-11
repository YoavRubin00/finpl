import React, { useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { BudgetNinjaCard } from '../../src/features/finfeed/minigames/budget-ninja/BudgetNinjaCard';
import { BullshitSwipeCard } from '../../src/features/finfeed/minigames/bullshit-swipe/BullshitSwipeCard';
import { CashoutRushCard } from '../../src/features/finfeed/minigames/cashout-rush/CashoutRushCard';
import { FomoKillerCard } from '../../src/features/finfeed/minigames/fomo-killer/FomoKillerCard';
import { HigherLowerCard } from '../../src/features/finfeed/minigames/higher-lower/HigherLowerCard';
import { PriceSliderCard } from '../../src/features/finfeed/minigames/price-slider/PriceSliderCard';
import { tapHaptic, successHaptic } from '../../src/utils/haptics';
import { useTopicProgressStore } from '../../src/features/topic-learning/useTopicProgressStore';
import type { ShortGameId } from '../../src/features/topic-learning/moduleGameMap';

/**
 * Dedicated full-screen route reached from the topic-tree `game` chip.
 * Renders the matching inter-module game card with bypassDailyGate so
 * the user isn't blocked by an unrelated daily lockout. On "המשך" the
 * topic is marked complete and we replace back to the learn map with
 * the module expanded.
 */
export default function TopicGameRoute(): React.ReactElement | null {
  const params = useLocalSearchParams<{ gameId?: string; moduleId?: string }>();
  const router = useRouter();
  const gameId = String(params.gameId ?? '') as ShortGameId;
  const moduleId = String(params.moduleId ?? '');

  const handleFinish = useCallback(() => {
    successHaptic();
    // Mark the 'game' topic complete in the topic-progress store. The
    // accordion picks this up on next mount via summaryForModule.
    if (moduleId) {
      useTopicProgressStore.getState().markTopicCompleted({
        id: `${moduleId}:game`,
        moduleId,
        kind: 'game',
        titleHe: 'משחק',
        iconAsset: { svgXml: '' },
        defaultOrder: 0,
      });
    }
    // Replace (not push) so the back-stack stays clean and the focus
    // effect in DuoLearnScreen re-expands the module.
    router.replace(`/(tabs)/learn?expandedModule=${moduleId}` as never);
  }, [moduleId, router]);

  const handleClose = useCallback(() => {
    tapHaptic();
    router.replace(`/(tabs)/learn?expandedModule=${moduleId}` as never);
  }, [moduleId, router]);

  const card = useMemo(() => {
    switch (gameId) {
      case 'budget-ninja':
        return <BudgetNinjaCard isActive onContinue={handleFinish} />;
      case 'bullshit-swipe':
        return <BullshitSwipeCard isActive bypassDailyGate onContinue={handleFinish} />;
      case 'cashout-rush':
        return <CashoutRushCard isActive onContinue={handleFinish} />;
      case 'fomo-killer':
        return <FomoKillerCard isActive onContinue={handleFinish} />;
      case 'higher-lower':
        return <HigherLowerCard isActive onComplete={handleFinish} />;
      case 'price-slider':
        return <PriceSliderCard isActive onContinue={handleFinish} />;
      default:
        return null;
    }
  }, [gameId, handleFinish]);

  if (!card) {
    // Unknown gameId — bounce back to the learn map. Don't show an
    // error UI; this is unreachable under normal flow.
    router.replace(`/(tabs)/learn?expandedModule=${moduleId}` as never);
    return null;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.closeBar}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="סגור"
          >
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
        </View>
        {/* Yoav 2026-06-11: topic-game cards fit in one screen. Wrapping
            in a ScrollView made price-slider (and others) scroll
            unnecessarily; a flex View constrains the card to the
            viewport so it lays out as designed. */}
        <View style={styles.cardWrap}>
          {card}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  safe: { flex: 1 },
  closeBar: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
  },
  cardWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
