import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Game cards — same set the legacy in-LessonFlow "inter-module game" modal
// imported. We keep the dependency edges identical so we don't double-bundle.
import { InvestmentCard } from '../../daily-challenges/InvestmentCard';
import { CrashGameCard } from '../../daily-challenges/CrashGameCard';
import { DilemmaCard } from '../../daily-challenges/DilemmaCard';
import { MythFeedCard } from '../../myth-or-tachles/MythFeedCard';
import { useMythStore } from '../../myth-or-tachles/useMythStore';
import { FomoKillerCard } from '../../finfeed/minigames/fomo-killer/FomoKillerCard';
import { BullshitSwipeCard } from '../../finfeed/minigames/bullshit-swipe/BullshitSwipeCard';
import { HigherLowerCard } from '../../finfeed/minigames/higher-lower/HigherLowerCard';
import { PriceSliderCard } from '../../finfeed/minigames/price-slider/PriceSliderCard';
import { BudgetNinjaCard } from '../../finfeed/minigames/budget-ninja/BudgetNinjaCard';
import { CashoutRushCard } from '../../finfeed/minigames/cashout-rush/CashoutRushCard';
import { MacroEventCard } from '../../macro-events/MacroEventCard';
import { macroEventsData } from '../../macro-events/macroEventsData';
import { useIsPro } from '../../subscription/useSubscription';

import type { InterModuleGameKey } from '../pearlConfig';

interface PearlGameStageProps {
  isActive: boolean;
  gameKey: InterModuleGameKey;
  /** Optional macro-event id for the 'macro-event' game type. */
  macroEventId?: string;
  onContinue: () => void;
}

/**
 * Renders the right mini-game card for the Pearl. Each card was already
 * built to accept `isActive` + an `onContinue`/`onComplete` callback by the
 * legacy "inter-module game" modal in LessonFlowScreen — we just route the
 * choice and let the card handle its own UI, scoring, and rewards.
 *
 * The wrapper supplies a ScrollView so games whose result-screen runs
 * taller than the viewport (e.g., Fear-or-Greed) don't trap users below a
 * cut-off Continue button.
 */
export function PearlGameStage({ isActive, gameKey, macroEventId, onContinue }: PearlGameStageProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();

  const card = renderGameCard(gameKey, macroEventId, isPro, onContinue);
  if (!card) return null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(insets.bottom + 24, 48) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ opacity: isActive ? 1 : 0.999 }}>
        {card}
      </View>
    </ScrollView>
  );
}

function renderGameCard(
  gameKey: InterModuleGameKey,
  macroEventId: string | undefined,
  isPro: boolean,
  onContinue: () => void,
): React.ReactNode {
  switch (gameKey) {
    case 'investment':
      return <InvestmentCard isActive onContinue={onContinue} />;
    case 'crash':
      return <CrashGameCard isActive onContinue={onContinue} />;
    case 'dilemma':
      return <DilemmaCard isActive onContinue={onContinue} />;
    case 'myth':
      return useMythStore.getState().canPlayMyth(isPro)
        ? <MythFeedCard isInterModule onSkip={onContinue} />
        : <FallbackContinueOnMount onMount={onContinue} />;
    case 'fomo-killer':
      return <FomoKillerCard isActive onContinue={onContinue} />;
    case 'bullshit-swipe':
      return <BullshitSwipeCard isActive bypassDailyGate onContinue={onContinue} />;
    case 'higher-lower':
      return <HigherLowerCard isActive onComplete={onContinue} />;
    case 'price-slider':
      return <PriceSliderCard isActive onContinue={onContinue} />;
    case 'budget-ninja':
      return <BudgetNinjaCard isActive onContinue={onContinue} />;
    case 'cashout-rush':
      return <CashoutRushCard isActive onContinue={onContinue} />;
    case 'macro-event': {
      if (!macroEventId) return null;
      const event = macroEventsData.find((e) => e.id === macroEventId);
      if (!event) return null;
      return (
        <MacroEventCard
          item={{ id: event.id, type: 'macro-event', event }}
          isActive
          onContinue={onContinue}
        />
      );
    }
    case 'video':
      // 'video' games (Module.interModuleGame === 'video') used to play in
      // the legacy modal. Inside a Pearl the dedicated PearlVideoStage
      // already handles the lifestyle clip, so there's nothing else to do
      // here — auto-advance.
      return <FallbackContinueOnMount onMount={onContinue} />;
    default:
      return null;
  }
}

/** Mounts and immediately calls onMount — used for game keys we want to
 *  skip without breaking the pager flow. */
function FallbackContinueOnMount({ onMount }: { onMount: () => void }): null {
  React.useEffect(() => {
    onMount();
  }, [onMount]);
  return null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 12 },
});
