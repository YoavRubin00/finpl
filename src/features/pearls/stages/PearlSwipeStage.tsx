import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ScrollView from gesture-handler (not react-native) — react-native's
// ScrollView swallows horizontal pan gestures before BullshitSwipeCard's
// GestureDetector can receive them, so swipe-left/right stopped working
// (user report 2026-05-31). The gesture-handler ScrollView shares the
// gesture state graph so child Pan detectors win on horizontal drags.
import { ScrollView } from 'react-native-gesture-handler';

import { BullshitSwipeCard } from '../../finfeed/minigames/bullshit-swipe/BullshitSwipeCard';

interface PearlSwipeStageProps {
  isActive: boolean;
  onContinue: () => void;
  /** Per-pearl ad ids (1-3 cards) — drives a topic-matched mini-deck. */
  swipeIds: readonly string[];
}

/**
 * Pearl-bound swipe stage. Wraps `BullshitSwipeCard` with the per-pearl ad
 * list and `bypassDailyGate` so playing here doesn't burn the user's
 * once-per-day quota when they later open the Daily Challenge surface.
 *
 * Same scroll-wrapper as `PearlGameStage` — long result screens (5+ ads)
 * shouldn't trap users below a cut-off Continue button.
 */
export function PearlSwipeStage({ isActive, onContinue, swipeIds }: PearlSwipeStageProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 48) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BullshitSwipeCard
          isActive={isActive}
          bypassDailyGate
          adIds={swipeIds}
          onContinue={onContinue}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 12 },
});
