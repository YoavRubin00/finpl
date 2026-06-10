import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { successHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useUpsertModuleProgress } from '../chapter-1-content/useProgress';
import { ChestCelebrationModal } from './ChestCelebrationModal';
import { Mod01WalkthroughPromptModal } from './Mod01WalkthroughPromptModal';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useIsPro } from '../subscription/useSubscription';
import type { Module } from '../chapter-1-content/types';
import type { Topic } from './types';
import { resolveTopics } from './topicResolver';
import { useTopicProgressStore } from './useTopicProgressStore';
import { useTopicTreeAssetPrefetch } from './useTopicTreeAssetPrefetch';
import { ModuleTopicLayout } from './components/ModuleTopicLayout';

/** Base reward on topic-tree 70% completion. Lower than the legacy
 *  LessonFlowScreen MODULE_COMPLETE_XP (30) because topics also yield
 *  per-topic micro-XP in a future loop. Tunable from a single point. */
const MODULE_TT_XP = 30;
const MODULE_TT_COINS = 150;
/** R6 Epic 5 — second chest at 100%. Larger reward than the 70%
 *  threshold drop. Mirrors the "you actually finished EVERYTHING"
 *  framing the user gets in the modal copy. */
const MASTER_TT_XP = 50;
const MASTER_TT_COINS = 250;

interface TopicTreeAccordionProps {
  module: Module;
  /** Whether sim is a SIM_FIRST topic for this module. Reorders the
   *  resolved topic list so sim falls earlier in canonical sequence. */
  simFirst?: boolean;
  /** Fired when a chip is tapped. Parent navigates to the legacy
   *  LessonFlowScreen with phase-targeted entry; the topic-tree layer
   *  stays pure presentation. */
  onTopicSelected: (topic: Topic) => void;
  /** "המשך עם המודולה" inside the chest modal — dismiss the modal but
   *  keep the accordion open so the user can knock out the remaining
   *  30%. */
  onContinueAfterChest?: () => void;
  /** "לשיעור הבא בפרק" inside the chest modal — close accordion AND
   *  navigate to the next module's lesson (legacy LessonFlowScreen). */
  onAdvanceToNextModule?: () => void;
  /** Fired on the first false→true crossing of the 70% threshold AND
   *  on the user's choice in the chest modal. Parent dismisses the
   *  accordion after the user's interaction. */
  onModuleCompleted?: () => void;
}

/**
 * Expandable panel rendered inside DuoLearnScreen directly below a
 * module node when the module is `learningMode: 'topic-tree'`.
 *
 * R6 (2026-06-10): two-chest economy — 70% drops a regular chest with
 * wisdom + DoN; 100% drops a MASTER chest with a larger reward. Streak
 * multiplier from `useTopicProgressStore.recordChestOpen` is applied
 * to the coin grant on both chests.
 */
export const TopicTreeAccordion = React.memo(function TopicTreeAccordion({
  module,
  simFirst,
  onTopicSelected,
  onContinueAfterChest,
  onAdvanceToNextModule,
  onModuleCompleted,
}: TopicTreeAccordionProps): React.ReactElement {
  const topics = useMemo(
    () => resolveTopics(module, { simFirst }),
    [module, simFirst],
  );

  // R6 — start prefetching the module's heavy assets (hero image, hook
  // video, infographic, flashcard videos/images, intro audio, podcast,
  // couple dilemma) the moment the accordion mounts. Idempotent via
  // `useModulePrefetch` so multiple mounts don't re-download.
  useTopicTreeAssetPrefetch(module);

  const completedMap = useTopicProgressStore((s) => s.completed);
  const summarize = useTopicProgressStore((s) => s.summaryForModule);
  const summary = useMemo(
    () => summarize(module.id, topics),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module.id, topics, completedMap],
  );

  const isCompletedMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    topics.forEach((t) => { out[t.id] = Boolean(completedMap[t.id]); });
    return out;
  }, [topics, completedMap]);

  // Threshold crossing side effects.
  const past70Ref = useRef<boolean>(false);
  const past100Ref = useRef<boolean>(false);
  // Chest display state — driven from either the 70% or 100% useEffects
  // so the same ChestCelebrationModal can host both reveals. null = not
  // showing.
  const [chestState, setChestState] = useState<{
    xp: number;
    coins: number;
    isFinale: boolean;
  } | null>(null);
  const upsertProgress = useUpsertModuleProgress();
  const { playSound } = useSoundEffect();
  const economyStore = useEconomyUIStore();

  // Seed refs from the persisted maps on mount so a re-mount post-crossing
  // doesn't re-trigger either celebration.
  const modulePastThreshold = useTopicProgressStore(
    (s) => Boolean(s.modulesPastThreshold[module.id]),
  );
  const moduleFullyComplete = useTopicProgressStore(
    (s) => Boolean(s.modulesFullyComplete[module.id]),
  );
  useEffect(() => {
    past70Ref.current = modulePastThreshold;
    past100Ref.current = moduleFullyComplete;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 70% chest — fires the first time isModuleDone flips true.
  useEffect(() => {
    if (!summary.isModuleDone || past70Ref.current) return;
    past70Ref.current = true;
    upsertProgress.mutate({
      moduleId: module.id,
      status: 'completed',
      xpEarned: MODULE_TT_XP,
    });
    useCompletedModulesStore.getState().markCompleted(module.id);
    economyStore.addXP(MODULE_TT_XP, 'daily_task');
    // Apply the chest streak multiplier to the coin grant (Epic 7-C1).
    const multiplier = useTopicProgressStore.getState().recordChestOpen();
    const coinsGranted = Math.round(MODULE_TT_COINS * multiplier);
    economyStore.addCoins(coinsGranted, 'lesson');
    successHaptic();
    try { playSound('modal_open_4'); } catch { /* non-fatal */ }
    setChestState({ xp: MODULE_TT_XP, coins: coinsGranted, isFinale: false });
  }, [summary.isModuleDone, module.id, upsertProgress, economyStore, playSound]);

  // 100% master chest — fires the first time pct hits 100.
  useEffect(() => {
    if (summary.pct !== 100 || past100Ref.current) return;
    past100Ref.current = true;
    // Stack the master reward ON TOP of the 70% chest's grant — the
    // user already pocketed that one; this is the bonus for finishing
    // every chip.
    economyStore.addXP(MASTER_TT_XP, 'daily_task');
    const multiplier = useTopicProgressStore.getState().recordChestOpen();
    const coinsGranted = Math.round(MASTER_TT_COINS * multiplier);
    economyStore.addCoins(coinsGranted, 'lesson');
    successHaptic();
    try { playSound('modal_open_4'); } catch { /* non-fatal */ }
    setChestState({ xp: MASTER_TT_XP, coins: coinsGranted, isFinale: true });
  }, [summary.pct, module.id, economyStore, playSound]);

  // R7 Epic B3: mod-0-1-only walkthrough prompt. Fires the first time
  // the user crosses ~30% of mod-0-1 (intro + cards + one more chip),
  // and only if they've never seen the AppWalkthrough. Yoav: "לאחר
  // ביצוע של עוד רכבי ב-0-1, יפתח לו קריאה לבצע את ההיכרות עם
  // האפליקציה, או להמשיך ללמוד".
  const router = useRouter();
  const hasSeenAppWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const triggerWalkthrough = useTutorialStore((s) => s.triggerWalkthrough);
  const completeAppWalkthrough = useTutorialStore((s) => s.completeAppWalkthrough);
  const setPendingPostWalkthroughCTA = useTutorialStore((s) => s.setPendingPostWalkthroughCTA);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isPro = useIsPro();
  const [showWalkthroughPrompt, setShowWalkthroughPrompt] = useState(false);
  const walkthroughPromptFiredRef = useRef(false);
  useEffect(() => {
    if (module.id !== 'mod-0-1') return;
    if (hasSeenAppWalkthrough) return;
    if (walkthroughPromptFiredRef.current) return;
    // ~30% = intro + cards + one more (3 of ~10 chips).
    if (summary.pct < 25) return;
    walkthroughPromptFiredRef.current = true;
    setShowWalkthroughPrompt(true);
  }, [module.id, summary.pct, hasSeenAppWalkthrough]);

  const handleTakeTour = () => {
    setShowWalkthroughPrompt(false);
    triggerWalkthrough();
  };

  const handleContinueLearning = () => {
    setShowWalkthroughPrompt(false);
    // Mirror AppWalkthroughOverlay.completeWalkthrough's "skip" effect:
    // mark walkthrough seen, schedule the guest register CTA, then push
    // the Pro paywall (non-Pro) or land on /(tabs) (Pro). The push
    // notification banner appears automatically when the user returns to
    // /(tabs)/learn — gated on hasSeenWalkthrough + hasCompletedFirstModule.
    completeAppWalkthrough();
    if (isGuest) {
      try { setPendingPostWalkthroughCTA(true); } catch { /* non-fatal */ }
    }
    if (!isPro) {
      router.replace(`/pricing?returnTo=${encodeURIComponent('/(tabs)')}&source=post_walkthrough_skip` as never);
    }
    // If Pro, stay on the learn map — the accordion is already open.
  };

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
    >
      <View>
        {/* Tree + path chips, no surrounding rectangle so the accordion
            reads as a continuation of the outer module path. */}
        <ModuleTopicLayout
          topics={topics}
          isCompletedMap={isCompletedMap}
          recommendedTopicId={summary.nextTopic?.id ?? null}
          progressPct={summary.pct}
          onTopicPress={onTopicSelected}
        />

        {/* Two-chest celebration. 70% chest fires first with the regular
            reward; the 100% master chest fires later when every chip is
            done. Both reveals share the same modal — `isFinale` flips
            the copy and lottie tone. */}
        <ChestCelebrationModal
          visible={chestState !== null}
          xp={chestState?.xp ?? MODULE_TT_XP}
          coins={chestState?.coins ?? MODULE_TT_COINS}
          isFinale={chestState?.isFinale ?? false}
          onContinueModule={() => {
            const wasFinale = chestState?.isFinale ?? false;
            setChestState(null);
            // The 100% master chest is the END — fully advance like
            // the "next module" CTA. The 70% chest keeps the accordion
            // open so the user can finish the remaining 30%.
            if (wasFinale) {
              onAdvanceToNextModule?.();
              onModuleCompleted?.();
            } else {
              onContinueAfterChest?.();
            }
          }}
          onAdvanceToNextModule={() => {
            setChestState(null);
            onAdvanceToNextModule?.();
            onModuleCompleted?.();
          }}
          onDoNResolve={(multiplier) => {
            // multiplier: 0 = lost everything, 1 = kept base, 2 = doubled.
            // Coins were already credited above — here we apply the delta
            // on top of THAT amount (so it stacks on the streak multiplier
            // too). For the master chest we still use the displayed coin
            // amount as the base.
            const base = chestState?.coins ?? 0;
            if (multiplier === 2) {
              economyStore.addCoins(base, 'lesson');
            } else if (multiplier === 0) {
              economyStore.addCoins(-base, 'lesson');
            }
          }}
        />

        {/* R7 Epic B3 — mod-0-1-only walkthrough opt-in prompt. */}
        <Mod01WalkthroughPromptModal
          visible={showWalkthroughPrompt}
          onTakeTour={handleTakeTour}
          onContinueLearning={handleContinueLearning}
        />
      </View>
    </Animated.View>
  );
});
