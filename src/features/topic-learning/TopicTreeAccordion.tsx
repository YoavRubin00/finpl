import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { mediumHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { captureEvent } from '../../lib/posthog';
import { useUpsertModuleProgress } from '../chapter-1-content/useProgress';
import { ChestCelebrationModal } from './ChestCelebrationModal';
import { Mod01WalkthroughPromptModal } from './Mod01WalkthroughPromptModal';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';
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

/** Derive the chapter id from a module id (`mod-3-15` → `chapter-3`) so the
 *  topic-tree `lesson_completed` carries the same `chapter_id` shape the
 *  legacy LessonFlowScreen sends. */
function chapterIdFromModuleId(moduleId: string): string {
  const m = /^mod-(\d+)-/.exec(moduleId);
  return m ? `chapter-${m[1]}` : '';
}

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
  const past25Ref = useRef<boolean>(false);
  const past50Ref = useRef<boolean>(false);
  const past70Ref = useRef<boolean>(false);
  const past100Ref = useRef<boolean>(false);
  // R8 U4 — mid-module micro-celebration toast (25% / 50%).
  // Hay Day / Duolingo rhythm: variable rewards every 1-2 milestones
  // instead of 70%-only silence.
  const [milestoneToast, setMilestoneToast] = useState<{
    label: string;
    emoji: string;
  } | null>(null);
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
    // R8 U4 — seed 25/50% refs from current pct so re-mount after
    // crossing doesn't replay the toast. Also covers users who land
    // past 25% from a deep link / hot reload.
    if (summary.pct >= 25) past25Ref.current = true;
    if (summary.pct >= 50) past50Ref.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // R8 U4 — mid-module milestone crossings: 25% + 50%. Light celebration
  // only (toast + haptic + sound, NO modal) so it doesn't compete with
  // the 70% chest gravity. Dismisses itself after 1800ms.
  useEffect(() => {
    if (summary.pct >= 25 && !past25Ref.current && !summary.isModuleDone) {
      past25Ref.current = true;
      tapHaptic();
      try { playSound('btn_click_soft_4'); } catch { /* non-fatal */ }
      setMilestoneToast({ label: 'התחלת מעולה! ¼ הדרך', emoji: '✨' });
      setTimeout(() => setMilestoneToast(null), 1800);
    }
  }, [summary.pct, summary.isModuleDone, playSound]);
  useEffect(() => {
    if (summary.pct >= 50 && !past50Ref.current && !summary.isModuleDone) {
      past50Ref.current = true;
      mediumHaptic();
      try { playSound('btn_click_soft_3'); } catch { /* non-fatal */ }
      setMilestoneToast({ label: 'אמצע הדרך!', emoji: '🦈' });
      setTimeout(() => setMilestoneToast(null), 1800);
    }
  }, [summary.pct, summary.isModuleDone, playSound]);

  // 70% chest — fires the first time isModuleDone flips true.
  useEffect(() => {
    if (!summary.isModuleDone || past70Ref.current) return;
    past70Ref.current = true;
    // Module-completion analytics. The topic-tree method previously fired
    // NO `lesson_completed`, so every module learned this way was invisible
    // to the NSM / WoW-retention / streak / daily-lessons insights (all keyed
    // on `lesson_completed`). Mirror the legacy LessonFlowScreen prop shape
    // (`module_id` + `chapter_id` + `is_first_lesson`) and add a
    // `learning_mode` discriminator so topic-tree can be segmented. Read
    // is_first_lesson BEFORE markCompleted below mutates the store. Non-fatal.
    try {
      const isFirstLesson =
        useCompletedModulesStore.getState().completedIds.length === 0;
      captureEvent('lesson_completed', {
        module_id: module.id,
        chapter_id: chapterIdFromModuleId(module.id),
        is_first_lesson: isFirstLesson,
        learning_mode: 'topic-tree',
      });
    } catch { /* non-fatal */ }
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
    // R8 T1.4 — regular 70% chest uses the slightly softer `modal_open_3`
    // so the master chest below stays the audible climax.
    try { playSound('modal_open_3'); } catch { /* non-fatal */ }
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
    // R8 T1.4 — master 100% chest uses `modal_open_4` (the loudest /
    // most triumphant sound in the library). Differentiates from the
    // softer `modal_open_3` used by the regular 70% chest above so
    // the user audibly knows this is THE finale, not just another drop.
    try { playSound('modal_open_4'); } catch { /* non-fatal */ }
    setChestState({ xp: MASTER_TT_XP, coins: coinsGranted, isFinale: true });
  }, [summary.pct, module.id, economyStore, playSound]);

  // R8 U1/U2 — mod-0-1-only walkthrough prompt. Fires the first time
  // the user crosses ~10% of mod-0-1 (intro + 1 card), so the offer
  // happens BEFORE momentum builds, not after. "המשך ללמוד" keeps
  // the user IN the map (no paywall jank); Pro funnel fires on the
  // user's natural exit. Yoav: "לאחר ביצוע של עוד רכבי ב-0-1, יפתח
  // לו קריאה לבצע את ההיכרות עם האפליקציה, או להמשיך ללמוד".
  const router = useRouter();
  const hasSeenAppWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const triggerWalkthrough = useTutorialStore((s) => s.triggerWalkthrough);
  const completeAppWalkthrough = useTutorialStore((s) => s.completeAppWalkthrough);
  const setPendingPostWalkthroughCTA = useTutorialStore((s) => s.setPendingPostWalkthroughCTA);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [showWalkthroughPrompt, setShowWalkthroughPrompt] = useState(false);
  const walkthroughPromptFiredRef = useRef(false);
  useEffect(() => {
    if (module.id !== 'mod-0-1') return;
    if (hasSeenAppWalkthrough) return;
    if (walkthroughPromptFiredRef.current) return;
    // R8 U1 — ~10% = intro + 1 card. Brawl Stars rule: decision agency
    // BEFORE first reward, not after momentum compounds.
    if (summary.pct < 10) return;
    walkthroughPromptFiredRef.current = true;
    setShowWalkthroughPrompt(true);
  }, [module.id, summary.pct, hasSeenAppWalkthrough]);

  const handleTakeTour = () => {
    setShowWalkthroughPrompt(false);
    triggerWalkthrough();
  };

  const handleContinueLearning = () => {
    setShowWalkthroughPrompt(false);
    // R8 U2 — keep momentum: mark walkthrough as seen so the overlay
    // won't fire later, schedule the guest register CTA, but DO NOT
    // push the paywall. /pricing will surface on the user's natural
    // exit (gated downstream on hasSeenWalkthrough). NotificationPermission
    // banner remains gated on hasSeenWalkthrough + hasCompletedFirstModule.
    completeAppWalkthrough();
    if (isGuest) {
      try { setPendingPostWalkthroughCTA(true); } catch { /* non-fatal */ }
    }
    // Intentionally no router.replace — user stays in the learn map.
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

        {/* R8 U4 — mid-module milestone toast (25%/50%). Floats above
            the chip grid for ~1.8s, then auto-dismisses. Non-blocking. */}
        {milestoneToast && (
          <Animated.View
            entering={FadeInDown.duration(280)}
            exiting={FadeOut.duration(220)}
            style={milestoneStyles.toast}
            pointerEvents="none"
          >
            <Text style={milestoneStyles.toastEmoji} allowFontScaling={false}>
              {milestoneToast.emoji}
            </Text>
            <Text style={milestoneStyles.toastLabel} allowFontScaling={false}>
              {milestoneToast.label}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
});

const milestoneStyles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 30,
  },
  toastEmoji: {
    fontSize: 18,
  },
  toastLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
