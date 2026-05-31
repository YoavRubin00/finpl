import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
// ScrollView from gesture-handler (not react-native) — RN's ScrollView
// swallows horizontal pan gestures from child cards (BullshitSwipe,
// PriceSlider, HigherLower, etc.) on Android. Mirrors PearlSwipeStage fix.
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';

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
// Full game roster (Yoav 2026-05-31) — 4 cards that previously existed but
// weren't reachable from a pearl. Wrappers below adapt non-onContinue APIs.
import { DiamondHandsCard } from '../../diamond-hands/DiamondHandsCard';
import { CrowdQuestionCard } from '../../crowd-question/CrowdQuestionCard';
import { PayslipBonusCard } from '../../payslip-analyzer/PayslipBonusCard';
import { SCENARIOS } from '../../scenario-lab/scenarioLabData';

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
  const { playSound } = useSoundEffect();

  const card = renderGameCard(gameKey, macroEventId, isPro, onContinue, isActive);
  // Self-heal: if the game can't render (unknown gameKey, macro-event missing
  // its id, event not found in the data), don't dead-end the pager — auto-
  // advance so the user never gets stuck on a blank stage with no CTA.
  if (!card) return <FallbackContinueOnMount onMount={onContinue} />;

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
          onPress={() => { tapHaptic(); playSound('btn_click_soft_1'); onExit(); }}
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
    case 'diamond-hands':
      return <PearlExternalGameWrap onContinue={onContinue}><DiamondHandsCard isActive={isActive} /></PearlExternalGameWrap>;
    case 'crowd-question':
      return <PearlExternalGameWrap onContinue={onContinue}><CrowdQuestionCard isActive={isActive} /></PearlExternalGameWrap>;
    case 'payslip-bonus':
      return <PearlExternalGameWrap onContinue={onContinue}><PayslipBonusCard /></PearlExternalGameWrap>;
    case 'scenario-lab':
      return (
        <PearlExternalGameWrap onContinue={onContinue}>
          <ScenarioLabCtaCard seed={macroEventId} />
        </PearlExternalGameWrap>
      );
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

/**
 * Wraps a card that lacks a built-in `onContinue` callback (DiamondHands,
 * Crowd, Payslip CTA, ScenarioLab) with a footer "המשך לשלב הבא" button so
 * the pearl pager can advance regardless of whether the user engages with
 * the underlying mini-feature.
 */
function PearlExternalGameWrap({
  children,
  onContinue,
}: {
  children: React.ReactNode;
  onContinue: () => void;
}): React.ReactElement {
  const { playSound } = useSoundEffect();
  return (
    <View style={externalStyles.root}>
      <View style={externalStyles.cardArea}>{children}</View>
      <Pressable
        onPress={() => { tapHaptic(); playSound('btn_click_soft_2'); onContinue(); }}
        accessibilityRole="button"
        accessibilityLabel="המשך לשלב הבא"
        style={({ pressed }) => [externalStyles.continueBtn, pressed && externalStyles.continueBtnPressed]}
      >
        <Text style={externalStyles.continueText}>המשך לשלב הבא ←</Text>
      </Pressable>
    </View>
  );
}

const externalStyles = StyleSheet.create({
  root: { flex: 1 },
  cardArea: { flex: 1, justifyContent: 'center' },
  continueBtn: {
    marginHorizontal: 20,
    marginBottom: 18,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#0369a1',
  },
  continueBtnPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  continueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    writingDirection: 'rtl' as const,
  },
});

/**
 * Compact CTA for the scenario-lab game. Picks a scenario by hash of seed
 * → routes to /scenario-lab?scenarioId=<id> on tap. Pearl Continue advances.
 */
function ScenarioLabCtaCard({ seed }: { seed: string | undefined }): React.ReactElement {
  const router = useRouter();
  const { playSound } = useSoundEffect();
  const scenario = React.useMemo(() => {
    if (!SCENARIOS.length) return null;
    const seedStr = seed ?? 'default';
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) | 0;
    return SCENARIOS[Math.abs(h) % SCENARIOS.length];
  }, [seed]);

  if (!scenario) return <View />;

  return (
    <View style={scenarioStyles.card}>
      <Text style={scenarioStyles.eyebrow}>תרחיש היסטורי</Text>
      <Text style={scenarioStyles.emoji} accessibilityElementsHidden importantForAccessibility="no">{scenario.emoji}</Text>
      <Text style={scenarioStyles.title}>{scenario.title}</Text>
      <Text style={scenarioStyles.year}>{scenario.year}</Text>
      <Text style={scenarioStyles.briefing} numberOfLines={5}>{scenario.briefing}</Text>
      <Pressable
        onPress={() => {
          tapHaptic();
          playSound('btn_click_heavy');
          router.push(`/scenario-lab?scenarioId=${scenario.id}` as never);
        }}
        accessibilityRole="button"
        accessibilityLabel={`שחק את התרחיש ${scenario.title}`}
        style={({ pressed }) => [scenarioStyles.playBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
      >
        <Text style={scenarioStyles.playText}>שחק את התרחיש →</Text>
      </Pressable>
    </View>
  );
}

const scenarioStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#0c4a6e',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  eyebrow: { fontSize: 11, fontWeight: '800', color: '#7dd3fc', letterSpacing: 2, writingDirection: 'rtl' as const },
  emoji: { fontSize: 56, marginVertical: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#ffffff', textAlign: 'center', writingDirection: 'rtl' as const },
  year: { fontSize: 13, fontWeight: '700', color: '#bae6fd', writingDirection: 'rtl' as const },
  briefing: { fontSize: 13, color: '#e0f2fe', textAlign: 'center', writingDirection: 'rtl' as const, lineHeight: 19, marginTop: 8, paddingHorizontal: 4 },
  playBtn: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0ea5e9', borderBottomWidth: 3, borderBottomColor: '#075985' },
  playText: { color: '#ffffff', fontSize: 15, fontWeight: '900', writingDirection: 'rtl' as const },
});

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
