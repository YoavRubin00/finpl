import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

import { DilemmaCard } from '../../daily-challenges/DilemmaCard';
import { InvestmentCard } from '../../daily-challenges/InvestmentCard';
import { tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';

export type ScenarioPool = 'dilemma' | 'investment';

interface PearlScenarioStageProps {
  isActive: boolean;
  onContinue: () => void;
  /** Which dataset the `scenarioId` lives in. */
  scenarioPool: ScenarioPool;
  /** Per-pearl scenario id. Resolved by the underlying card via its
   *  matching opt-in prop (`dilemmaId` / `investmentId`). */
  scenarioId: string;
}

/**
 * Pearl-bound scenario stage. Routes between `DilemmaCard` and
 * `InvestmentCard` based on `scenarioPool`, passing the per-pearl `scenarioId`
 * into the card's override prop so the user sees a topic-matched scenario
 * rather than today's daily rotation.
 *
 * Sticky "המשך" CTA (2026-06-02): the cards' built-in continue button used
 * to render inside their scrollable content, so on Android with a long
 * feedback explanation it dropped below the fold and got hidden by the
 * pearl's "דלג על הפנינה" footer (user report). Now the cards hide their
 * in-card button (`hideContinueButton`) and report readiness via
 * `onReadyToContinue`. This stage renders a fixed CTA above the pearl
 * footer that's always visible once the user has answered.
 */
export function PearlScenarioStage({
  isActive,
  onContinue,
  scenarioPool,
  scenarioId,
}: PearlScenarioStageProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { playSound } = useSoundEffect();
  const [readyToContinue, setReadyToContinue] = useState(false);

  const handlePress = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_2');
    onContinue();
  }, [onContinue, playSound]);

  // DilemmaCard / InvestmentCard render FeedGameShell which has flex:1 on
  // its outer + card containers. Inside a ScrollView with flexGrow:1, that
  // chain collapses the children to exactly visible height and breaks
  // scrolling on long dilemmas (4 choices + feedback explanation overflow
  // the screen — user report 2026-06-03 "לא ניתן לגלול"). Wrapping in a
  // View with explicit minHeight gives the flex:1 children a definite size
  // to fill, while leaving the outer ScrollView free to extend past it when
  // the actual content overflows.
  const minContentHeight = SCREEN_HEIGHT - insets.top - insets.bottom - 240;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          // Reserve room for the sticky CTA so the last bit of feedback text
          // never lives behind the blue "המשך" bar (the PearlSheet skip
          // footer was removed 2026-06-02, so we no longer reserve for it).
          { paddingBottom: Math.max(insets.bottom + 24, 48) + (readyToContinue ? 96 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ minHeight: minContentHeight }}>
          {scenarioPool === 'investment' ? (
            <InvestmentCard
              isActive={isActive}
              investmentId={scenarioId}
              onContinue={onContinue}
              hideContinueButton
              onReadyToContinue={setReadyToContinue}
            />
          ) : (
            <DilemmaCard
              isActive={isActive}
              dilemmaId={scenarioId}
              onContinue={onContinue}
              hideContinueButton
              onReadyToContinue={setReadyToContinue}
            />
          )}
        </View>
      </ScrollView>

      {readyToContinue ? (
        // Pinned to the true bottom of the stage (above the system safe
        // area only). Previous lift of `SKIP_FOOTER_RESERVE + insets.bottom`
        // was for a pearl-level "skip" footer that was removed 2026-06-02 —
        // the leftover 60px reserve was making the CTA float in the middle
        // of the screen instead of sitting at the bottom like the lesson
        // continue buttons (user report 2026-06-04).
        <View
          style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel="המשך"
            hitSlop={8}
            style={styles.continuePressable}
          >
            {({ pressed }) => (
              // bg/border live on inner View — Pressable's function-style
              // style prop drops bg on Android (user report 2026-06-03:
              // "כפתור המשך בצבע לבן ולא אחיד"). Same workaround as
              // CrowdQuestionCard option buttons.
              <View style={[styles.continueBtn, pressed && styles.continueBtnPressed]}>
                <Text style={styles.continueBtnText} allowFontScaling={false}>המשך</Text>
              </View>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 12 },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
  },
  // Pressable is the full-width interactive surface; the visual button is
  // its inner View (Android-bg workaround). Stretching both means the
  // button truly spans the row, matching the lesson "המשך" CTA width
  // (user request 2026-06-04: "כמו כפתורי המשך במודולות למידה").
  continuePressable: {
    alignSelf: 'stretch',
  },
  // Matches the lesson "המשך" CTA exactly (LessonFlowScreen.tsx:831):
  // sky-blue #0ea5e9 + #0284c7 3px bottom border, fontSize 16/weight 800.
  // Width is full-row (no maxWidth) so the button reads as the dominant
  // bottom action, not a small floating chip.
  continueBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
  },
  continueBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    letterSpacing: 0.3,
  },
});
