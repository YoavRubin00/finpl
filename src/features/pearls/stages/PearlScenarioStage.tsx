import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DilemmaCard } from '../../daily-challenges/DilemmaCard';
import { InvestmentCard } from '../../daily-challenges/InvestmentCard';

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
 * Cards already render a "המשך" CTA when `onContinue` is set, so we don't
 * need to add our own. ScrollView wrapper mirrors `PearlGameStage` to keep
 * long result screens reachable.
 */
export function PearlScenarioStage({
  isActive,
  onContinue,
  scenarioPool,
  scenarioId,
}: PearlScenarioStageProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 48) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {scenarioPool === 'investment' ? (
          <InvestmentCard isActive={isActive} investmentId={scenarioId} onContinue={onContinue} />
        ) : (
          <DilemmaCard isActive={isActive} dilemmaId={scenarioId} onContinue={onContinue} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 12 },
});
