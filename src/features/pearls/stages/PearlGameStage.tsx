import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';

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
  /** Optional explicit Exit handler. When set, renders a floating X in the
   *  top-right corner so the user always has a guaranteed escape, even if
   *  the parent sheet's top bar is visually obscured. Distinct from
   *  onContinue, which advances to the next stage. */
  onExit?: () => void;
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
export function PearlGameStage({ isActive, gameKey, macroEventId, onContinue, onExit }: PearlGameStageProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();

  const card = renderGameCard(gameKey, macroEventId, isPro, onContinue, isActive);
  if (!card) return null;

  return (
    <View style={{ flex: 1 }}>
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
      {onExit ? (
        // Floating top-right Exit, guaranteed visible during any game.
        // The parent PearlSheet's top bar already has a close button, but
        // this overlay survives even if the user has scrolled the card
        // upward and the chrome is out of view — a non-negotiable escape
        // hatch per QA audit 2026-05-31.
        <Pressable
          onPress={() => { tapHaptic(); onExit(); }}
          accessibilityRole="button"
          accessibilityLabel="צא מהמשחק"
          hitSlop={12}
          style={[styles.exitBtn, { top: Math.max(insets.top + 6, 14) }]}
        >
          <X size={20} color="#0f172a" strokeWidth={2.8} />
        </Pressable>
      ) : null}
    </View>
  );
}

function renderGameCard(
  gameKey: InterModuleGameKey,
  macroEventId: string | undefined,
  isPro: boolean,
  onContinue: () => void,
  isActive: boolean,
): React.ReactNode {
  // Forward the pager's real isActive into each card. Previously every
  // card was passed `isActive` shorthand (=true) so animations + sounds
  // kept running on non-visible pages — minor jank flagged in the QA
  // audit (2026-05-31).
  switch (gameKey) {
    case 'investment':
      return <InvestmentCard isActive={isActive} onContinue={onContinue} />;
    case 'crash':
      return <CrashGameCard isActive={isActive} onContinue={onContinue} />;
    case 'dilemma':
      return <DilemmaCard isActive={isActive} onContinue={onContinue} />;
    case 'myth':
      return useMythStore.getState().canPlayMyth(isPro)
        ? <MythFeedCard isInterModule onSkip={onContinue} />
        : <FallbackContinueOnMount onMount={onContinue} />;
    case 'fomo-killer':
      return <FomoKillerCard isActive={isActive} onContinue={onContinue} />;
    case 'bullshit-swipe':
      return <BullshitSwipeCard isActive={isActive} bypassDailyGate onContinue={onContinue} />;
    case 'higher-lower':
      return <HigherLowerCard isActive={isActive} onComplete={onContinue} />;
    case 'price-slider':
      return <PriceSliderCard isActive={isActive} onContinue={onContinue} />;
    case 'budget-ninja':
      return <BudgetNinjaCard isActive={isActive} onContinue={onContinue} />;
    case 'cashout-rush':
      return <CashoutRushCard isActive={isActive} onContinue={onContinue} />;
    case 'macro-event': {
      if (!macroEventId) return null;
      const event = macroEventsData.find((e) => e.id === macroEventId);
      if (!event) return null;
      return (
        <MacroEventCard
          item={{ id: event.id, type: 'macro-event', event }}
          isActive={isActive}
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

/** Mounts and immediately calls onMount EXACTLY ONCE — used for game keys
 *  we want to skip without breaking the pager flow. Stashes onMount in a
 *  ref so a re-render in the parent (e.g. PearlSheet recreating
 *  handleStageDone on every render) doesn't re-fire the effect and skip
 *  multiple stages. */
function FallbackContinueOnMount({ onMount }: { onMount: () => void }): null {
  const onMountRef = React.useRef(onMount);
  onMountRef.current = onMount;
  React.useEffect(() => {
    onMountRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 12 },
  exitBtn: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 100,
  },
});
