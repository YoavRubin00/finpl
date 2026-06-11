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
import { useEconomyUIStore, fireEconomyDelta } from '../economy/useEconomyUIStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';
import type { Module } from '../chapter-1-content/types';
import type { Topic, ChestRarity } from './types';
import { CHEST_RARITY_BONUS } from './types';
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
  // R8 pre-release audit (Yoav + הסורק 2026-06-11): removed the
  // `seventyFiredThisMountRef` + `lastChestRollRef` workaround. They
  // dedup'd recordChestOpen() but the underlying TWO useEffects still
  // double-credited the user when a single chip jumped <70% → 100% in
  // one commit (both `addCoins` calls ran, only the master `setChestState`
  // persisted → silent double payout, single modal). The two effects are
  // now unified into one below; the refs are unnecessary.
  // Single timer for the milestone toast. Without it, two crossings (25% then
  // 50%) leave two dangling setTimeouts — the first nulls the second's toast
  // early, and an unmount mid-toast set state on an unmounted component
  // (Yoav 2026-06-11 QA). Clear-before-set + unmount cleanup fixes both.
  const milestoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
  }, []);
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
    /** R8 T3.4 — rarity rolled on this open. Drives Captain's Forecast
     *  copy, chest visuals (gold tint for mythic), and the ×3 reward
     *  bonus already baked into `coins`. */
    rarity: ChestRarity;
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
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
      milestoneTimerRef.current = setTimeout(() => setMilestoneToast(null), 1800);
    }
  }, [summary.pct, summary.isModuleDone, playSound]);
  useEffect(() => {
    if (summary.pct >= 50 && !past50Ref.current && !summary.isModuleDone) {
      past50Ref.current = true;
      mediumHaptic();
      try { playSound('btn_click_soft_3'); } catch { /* non-fatal */ }
      // R8 follow-up (Yoav 2026-06-11): drop the shark emoji per global
      // "no shark-emoji" rule. The toast color (deep ocean blue) + Captain Shark
      // mascot elsewhere in the surface already carry the brand identity.
      setMilestoneToast({ label: 'אמצע הדרך!', emoji: '🌊' });
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
      milestoneTimerRef.current = setTimeout(() => setMilestoneToast(null), 1800);
    }
  }, [summary.pct, summary.isModuleDone, playSound]);

  // R8 pre-release audit (Yoav + הסורק 2026-06-11): UNIFIED chest drop
  // effect. Previously two separate useEffects (70% + 100%) raced when a
  // single chip crossed both gates in one commit — both `addCoins` calls
  // ran (silent double-credit ≈150 + ≈250 coins) but only the second
  // `setChestState` persisted, so the user saw ONE master modal and
  // never learned about the 70% drop. Now one effect that, when both
  // gates cross simultaneously, rolls ONCE, sums the rewards, applies
  // ONCE, and surfaces ONE master modal whose displayed `xp` + `coins`
  // already include both 70% + 100% payouts.
  useEffect(() => {
    const seventyJustCrossed = summary.isModuleDone && !past70Ref.current;
    const hundredJustCrossed = summary.pct === 100 && !past100Ref.current;
    if (!seventyJustCrossed && !hundredJustCrossed) return;

    // Roll once per user action — even if both gates cross, this is a
    // single chest open from a chain-streak / pity-timer perspective.
    const { multiplier, rarity } = useTopicProgressStore.getState().recordChestOpen();
    const rarityBonus = CHEST_RARITY_BONUS[rarity];

    let totalXp = 0;
    let totalCoins = 0;
    let isFinale = false;

    if (seventyJustCrossed) {
      past70Ref.current = true;
      // Persist the "first crossed 70%" flag (moved out of summaryForModule,
      // which is now a pure read — was a set()-during-render bug).
      useTopicProgressStore.getState().stampModuleThreshold(module.id);
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
      totalXp += MODULE_TT_XP;
      totalCoins += Math.round(MODULE_TT_COINS * multiplier * rarityBonus);
    }

    if (hundredJustCrossed) {
      past100Ref.current = true;
      // Persist the "first crossed 100%" flag (moved out of summaryForModule).
      useTopicProgressStore.getState().stampModuleFullyComplete(module.id);
      totalXp += MASTER_TT_XP;
      totalCoins += Math.round(MASTER_TT_COINS * multiplier * rarityBonus);
      // Master modal always wins display when 100% fires (either alone
      // or as part of a same-action 70%+100% combo).
      isFinale = true;
    }

    economyStore.addXP(totalXp, 'daily_task');
    economyStore.addCoins(totalCoins, 'lesson');
    successHaptic();
    // R8 T1.4 — master = `modal_open_4` (loudest); regular 70% = softer
    // `modal_open_3`. Same rule when both fire (the combo is still THE finale).
    try { playSound(isFinale ? 'modal_open_4' : 'modal_open_3'); } catch { /* non-fatal */ }
    setChestState({ xp: totalXp, coins: totalCoins, isFinale, rarity });
  }, [summary.isModuleDone, summary.pct, module.id, upsertProgress, economyStore, playSound]);

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
  // R8 follow-up (Yoav 2026-06-11): walkthrough fires ONLY after the
  // first non-intro chip ("הכפתור המוזהב הראשון") is completed — not at
  // a % threshold. The intro alone doesn't count: the user has only
  // watched a teaser at that point and hasn't yet earned the "I built
  // something" moment that justifies the tour offer.
  const completedNonIntroChipCount = useMemo(
    () => topics.filter((t) => t.kind !== 'intro' && isCompletedMap[t.id]).length,
    [topics, isCompletedMap],
  );
  useEffect(() => {
    if (module.id !== 'mod-0-1') return;
    if (hasSeenAppWalkthrough) return;
    if (walkthroughPromptFiredRef.current) return;
    if (completedNonIntroChipCount < 1) return;
    walkthroughPromptFiredRef.current = true;
    setShowWalkthroughPrompt(true);
  }, [module.id, completedNonIntroChipCount, hasSeenAppWalkthrough]);

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

  // Mod-0-1 onboarding banner — surfaces above the chip column ONLY
  // during the welcome window (= app walkthrough not yet seen +
  // no non-intro chip completed). Yoav 2026-06-11: replaces the
  // pre-walkthrough daily-challenge surface with a direct CTA telling
  // the user where to tap next.
  const displayName = useAuthStore((s) => s.displayName) ?? '';
  const showWelcomeBanner =
    module.id === 'mod-0-1' && !hasSeenAppWalkthrough && completedNonIntroChipCount < 1;

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
    >
      <View>
        {showWelcomeBanner && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(360)}
            style={welcomeStyles.banner}
            pointerEvents="none"
          >
            <Text style={welcomeStyles.title} allowFontScaling={false}>
              {displayName ? `ברוכים הבאים, ${displayName}!` : 'ברוכים הבאים!'}
            </Text>
            <Text style={welcomeStyles.subtitle} allowFontScaling={false}>
              לחצו על הכפתור המוזהב כדי להתחיל ⬇️
            </Text>
          </Animated.View>
        )}
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
          rarity={chestState?.rarity ?? 'common'}
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
              // `addCoins` early-returns on amount <= 0, so a DoN LOSS was a
              // silent no-op (Yoav 2026-06-11 QA — user kept everything
              // despite "lost it all" copy). Deduct via the canonical
              // economy-delta pipe, which handles negative deltas.
              fireEconomyDelta({ coinsDelta: -base });
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

const welcomeStyles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: 'center',
    maxWidth: '92%',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#92400e',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
