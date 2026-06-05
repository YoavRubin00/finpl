import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ScrollView from gesture-handler (not react-native) — react-native's
// ScrollView swallows horizontal pan gestures before the child cards'
// GestureDetector can receive them, so swipe-left/right stopped working
// (user report 2026-05-31). The gesture-handler ScrollView shares the
// gesture state graph so child Pan detectors win on horizontal drags.
import { ScrollView } from 'react-native-gesture-handler';

import { BullshitSwipeCard } from '../../finfeed/minigames/bullshit-swipe/BullshitSwipeCard';
import { MythFeedCard } from '../../myth-or-tachles/MythFeedCard';
import { SwipeGameCard } from '../../daily-challenges/SwipeGameCard';
import type { SwipeKind } from '../pearlContentMap';

interface PearlSwipeStageProps {
  isActive: boolean;
  onContinue: () => void;
  /** Picks which swipe deck to render. Mirrors the daily-quest rotation in
   *  DuoLearnScreen (`dailySwipeKind`). Defaults to 'bullshit' for
   *  backwards-compatibility with legacy bundles that only specified
   *  `swipeIds`. */
  swipeKind?: SwipeKind;
  /** Per-pearl ad ids (1-3 cards) — drives the bullshit deck only. Ignored
   *  by myth / bull-bear which source their cards internally. */
  swipeIds?: readonly string[];
}

/**
 * Pearl-bound swipe stage. Dispatches to one of three swipe games by
 * `swipeKind`:
 *   - 'myth'      → MythFeedCard ("מיתוס או תכל'ס")
 *   - 'bull-bear' → SwipeGameCard ("שורי או דובי" / Long-Short)
 *   - 'bullshit'  → BullshitSwipeCard with per-pearl `swipeIds`
 *
 * All three already use `Gesture.Pan` from react-native-gesture-handler
 * and play nicely as children of the gesture-handler ScrollView wrapper
 * below. `bypassDailyGate` on BullshitSwipeCard prevents the per-pearl
 * play from burning the user's daily quota; the other two decks aren't
 * gated by daily quota at the card level so no equivalent flag is needed.
 *
 * Same scroll-wrapper as `PearlGameStage` — long result screens
 * (5+ cards) shouldn't trap users below a cut-off Continue button.
 */
export function PearlSwipeStage({
  isActive,
  onContinue,
  swipeKind,
  swipeIds,
}: PearlSwipeStageProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const kind: SwipeKind = swipeKind ?? 'bullshit';
  // Myth + bull-bear render fixed-height swipeable decks that already cap
  // themselves to the screen viewport (MythCardDeck CARD_H clamps to
  // SCREEN_H * 0.55; SwipeGameCard uses aspectRatio 0.78 inside a flex row).
  // Wrapping them in a vertical ScrollView used to surface a parasitic
  // scroll gesture inside the pearl, even when nothing was actually below
  // the fold, so the user saw a janky tug on tap (LAN QA 2026-06-02:
  // "יש גלילה בקצבת זקנה"). Bullshit deck keeps the ScrollView because its
  // results screen (5+ ad cards) genuinely needs vertical scroll.
  const needsScroll = kind === 'bullshit';
  const body = (
    <>
      {kind === 'myth' && (
        <MythFeedCard isInterModule onSkip={onContinue} autoAdvanceAfter={2} />
      )}
      {kind === 'bull-bear' && (
        <SwipeGameCard isActive={isActive} onFinish={onContinue} />
      )}
      {kind === 'bullshit' && (
        <BullshitSwipeCard
          isActive={isActive}
          bypassDailyGate
          adIds={swipeIds}
          onContinue={onContinue}
        />
      )}
    </>
  );
  return (
    <View style={{ flex: 1 }}>
      {needsScroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 48) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 48) }]}>
          {body}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 12 },
});
