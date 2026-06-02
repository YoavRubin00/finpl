import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          // Reserve room for the sticky CTA so the last bit of feedback
          // text never lives behind it.
          { paddingBottom: Math.max(insets.bottom + 24, 48) + (readyToContinue ? 72 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>

      {readyToContinue ? (
        <View style={styles.stickyBar} pointerEvents="box-none">
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel="המשך"
            style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
            hitSlop={8}
          >
            <Text style={styles.continueBtnText} allowFontScaling={false}>המשך</Text>
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
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
    alignItems: 'center',
  },
  continueBtn: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderBottomWidth: 4,
    borderBottomColor: '#1d4ed8',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  continueBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
