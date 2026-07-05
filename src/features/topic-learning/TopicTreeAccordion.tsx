import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { successHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { captureEvent } from '../../lib/posthog';
import { track } from '../../lib/analytics/events';
import { useUpsertModuleProgress } from '../chapter-1-content/useProgress';
import { ChestCelebrationModal } from './ChestCelebrationModal';
import { InModuleProfileQuestion, type ProfileQuestionKind } from '../onboarding/InModuleProfileQuestion';
import { ModuleEndSignupGate } from '../auth/ModuleEndSignupGate';
import { RateAppPromptModal } from '../retention-loops/RateAppPromptModal';
import { openStoreReview } from '../../lib/openStoreReview';
import { shouldShowRatePrompt } from '../retention-loops/rateAppPrompt';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import { useEconomyUIStore, fireEconomyDelta } from '../economy/useEconomyUIStore';
import { useHeartsStore } from '../subscription/useHeartsStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useBanditStore } from '../bandit/useBanditStore';
import { FIRST_RUN_EXPERIMENT_ID, firstRunVariantId } from '../onboarding/firstRunExperiment';
import type { Module } from '../chapter-1-content/types';
import type { Topic, ChestRarity } from './types';
import { CHEST_RARITY_BONUS, chipsToChestFor } from './types';
import { resolveTopics } from './topicResolver';
import { getModuleTool, buildToolTopic } from './moduleToolMap';
import { getModuleCarousel, buildCarouselTopic } from './moduleCarouselMap';
import { CarouselSheet } from './components/CarouselSheet';
import { useTopicProgressStore } from './useTopicProgressStore';
import { useContinuousRunStore } from './useContinuousRunStore';
import { useTopicTreeAssetPrefetch } from './useTopicTreeAssetPrefetch';
import { ModuleTopicLayout } from './components/ModuleTopicLayout';
import { SharkChipCallout } from './components/SharkChipCallout';
import { SharkToolCTA } from '../../components/ui/SharkCTAModals';
import { useToolNudgeStore } from '../notifications/useToolNudgeStore';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { ModuleReportCard } from './components/ModuleReportCard';
import { ModuleSharkCallCard } from './components/ModuleSharkCallCard';
import { useModuleSharkCall } from './components/useModuleSharkCall';
import { useModuleComprehensionStore } from '../shark-voice-chat/useModuleComprehensionStore';

/** Base reward on topic-tree 70% completion. Lower than the legacy
 *  LessonFlowScreen MODULE_COMPLETE_XP (30) because topics also yield
 *  per-topic micro-XP in a future loop. Tunable from a single point. */
const MODULE_TT_XP = 30;
const MODULE_TT_COINS = 150;
/** Small 100%-completion pop (Yoav 2026-06-26). Per-chip rewards were removed —
 *  the only post-70% reward is this modest coin/XP fly-out when the module hits
 *  100% (no modal; RewardAnimationProvider fires the fly-out on the economy delta). */
const HUNDRED_PCT_XP = 15;
const HUNDRED_PCT_COINS = 60;
/** Energy (⚡) the 70% chest grants — real grantEnergy + a fly-out in the
 *  ChestCelebrationModal (Yoav 2026-06-22: "בתיבה יקבלו גם 2 אנרגיה"). */
const CHEST_ENERGY_REWARD = 2;
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
  /** Horizontal wave offset of the parent ModuleNode on the outer map,
   *  forwarded to ModuleTopicLayout so the entry/exit connectors meet the
   *  general-map trail flush instead of jogging. */
  nodeOffsetX?: number;
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
  /** Forwarded to ModuleTopicLayout — registers the recommended ("next") chip's
   *  View ref so DuoLearnScreen can measure + scroll it into view on return. */
  onRecommendedChipRef?: (ref: View | null) => void;
  /** Registers the View wrapping the end-of-module report + shark-call cards so
   *  the parent can scroll them into view (with the next module below) when the
   *  user taps "המשך" on the chest (Yoav 2026-06-22). */
  onEndCardsRef?: (ref: View | null) => void;
  /** Fired when the SharkChipCallout's blocking "near-chest" pop-up is
   *  dismissed — the parent re-pokes the gold-chip auto-scroll, which a
   *  presented <Modal> had swallowed (Yoav 2026-06-23). */
  onChipCalloutContinue?: () => void;
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
  nodeOffsetX,
  onTopicSelected,
  onContinueAfterChest,
  onAdvanceToNextModule,
  onEndCardsRef,
  onModuleCompleted,
  onRecommendedChipRef,
  onChipCalloutContinue,
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

  // Shared live summary-call launcher (consent → call → report). Drives BOTH the
  // on-map call card in the end-cards band AND the new "שיחת סיכום לייב" button
  // inside the chest modal (Yoav 2026-06-29). Its modals are rendered once at the
  // accordion root below so closing the chest never unmounts an in-flight call.
  const sharkCall = useModuleSharkCall(module.id, module.title);

  // Subscribe ONLY to THIS module's topics' completion slice (one boolean per
  // topic, in `topics` order) wrapped in useShallow — so a topic completing in
  // an UNRELATED module no longer invalidates this module's memos. (Previously
  // we subscribed to the whole `s.completed` map, so any completion anywhere
  // re-ran summary / isCompletedMap / displayTopics here.) The booleans are
  // shallow-compared, so this re-renders only when one of THIS module's topics
  // actually flips.
  const completedFlags = useTopicProgressStore(
    useShallow((s) => topics.map((t) => Boolean(s.completed[t.id]))),
  );
  const summarize = useTopicProgressStore((s) => s.summaryForModule);
  const summary = useMemo(
    () => summarize(module.id, topics),
    // summarize reads s.completed via getState() internally; completedFlags is
    // the stable dependency that tells us when THIS module's completion changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module.id, topics, completedFlags],
  );

  // Chips still needed to open the chest — drives the SharkChipCallout
  // proximity copy. MUST go through chipsToChestFor (not raw ceil(total*pct)):
  // it carries both the chat-outside clamp and the explicit per-module chip
  // override (mod-0-1 = 3), exactly like the store's chest gate.
  const chestRemaining = Math.max(
    0,
    chipsToChestFor(module.id, summary.total) - summary.completed,
  );
  // "First chest" framing must reflect REALITY, not the module id — it used to
  // fire for every user in mod-0-1/mod-0-2 even if they'd already opened chests
  // elsewhere (Yoav 2026-06-22). modulesPastThreshold maps every module whose
  // chest the user has earned; empty = they genuinely haven't opened one yet.
  const noChestOpenedYet = useTopicProgressStore(
    (s) => Object.keys(s.modulesPastThreshold).length === 0,
  );

  // Built off the per-module completedFlags slice (stable via useShallow) instead
  // of the whole completed map, so this stays referentially stable when none of
  // THIS module's topics changed — preventing unrelated completions from
  // invalidating displayTopics / ModuleTopicLayout memos downstream.
  const isCompletedMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    topics.forEach((t, i) => { out[t.id] = completedFlags[i]; });
    return out;
  }, [topics, completedFlags]);

  // Bonus "tool" chip (e.g. "נתח תלוש שכר") — appended to the END of the
  // accordion ONLY once the module crosses the registered reveal % (Yoav
  // 2026-06-19: "שיופיע ב-60 אחוז"). It's display-only: built off `topics`
  // (NOT mutating it) so the completion summary / chest math above stay based
  // purely on the real learning topics. Tapping it deep-links into the tool
  // via the parent's onTopicSelected ('tool' kind).
  const moduleCarousel = useMemo(() => getModuleCarousel(module.id), [module.id]);
  const [carouselOpen, setCarouselOpen] = useState(false);

  const displayTopics = useMemo(() => {
    const extra: Topic[] = [];
    // Carousel (998) always shows; tool (999) reveals past its threshold. Both
    // are appended AFTER the real learning chips and are display-only — never in
    // the completion `topics`, so they don't move the chest math.
    if (moduleCarousel) extra.push(buildCarouselTopic(module.id, moduleCarousel));
    const tool = getModuleTool(module.id);
    if (tool && summary.pct >= tool.revealPct) extra.push(buildToolTopic(module.id, tool));
    return extra.length ? [...topics, ...extra] : topics;
  }, [topics, module.id, moduleCarousel, summary.pct]);

  // Carousel chip opens an in-app sheet (not a lesson phase), so intercept it
  // here; every other chip delegates to the parent's navigation handler.
  const handleChipPress = useCallback((topic: Topic) => {
    if (topic.kind === 'carousel') {
      setCarouselOpen(true);
      // Mark the carousel chip done so it shows completed (green) after the user
      // opens it (Yoav 2026-06-28: "לא מסומנת כמושלמת גם אחרי סיום"). Display-only —
      // NOT in the completion `topics` — so this changes ONLY the chip's visual
      // state and never moves the chest math.
      try { useTopicProgressStore.getState().markTopicCompleted(topic, 'chip'); } catch { /* non-fatal */ }
      return;
    }
    onTopicSelected(topic);
  }, [onTopicSelected]);

  // Yoav 2026-06-22: the quiz is NO LONGER a hard gate for the chest. Instead
  // topicResolver pins the quiz INSIDE the chest threshold window, so on the
  // canonical path the quiz is reached before 75% naturally — but a user who
  // skips it is no longer blocked from the chest. (Supersedes the 2026-06-17
  // quiz-gate.)

  // Yoav 2026-06-17: mod-0-1 injects an inline knowledgeLevel onboarding
  // question right after its quiz — the chest must appear AFTER it. Hold the
  // mod-0-1 chest until that question is resolved: knowledgeLevel is set
  // (answered) OR the skip-safe flag fired (LessonFlowScreen onDone, on answer
  // OR "דלג"). Never blocks — the flag always fires. Other modules: always true.
  const knowledgeLevel = useAuthStore((s) => s.profile?.knowledgeLevel);
  const mod01KnowledgeResolved = useTutorialStore((s) => s.mod01KnowledgeResolved);
  const mod01QuestionResolved =
    module.id !== 'mod-0-1' || Boolean(knowledgeLevel) || mod01KnowledgeResolved;

  // Threshold crossing side effects.
  const past70Ref = useRef<boolean>(false);
  const past100Ref = useRef<boolean>(false);
  // The chest is fired by the effect below, which only runs while this accordion
  // is mounted + re-rendering. When the crossing chip is a full-screen sim/quiz
  // (e.g. insurance "מי נגד מי") the accordion is backgrounded as that chip
  // completes, so the effect misses the exact 70% crossing and only catches up
  // on the next re-render — the user saw the chest (and the report snapshot) land
  // a chip LATE (Yoav 2026-06-22). Re-poke the effect whenever the accordion
  // regains focus so the chest fires the moment we return from the chip. The
  // atomic stampModuleThreshold below keeps it single-fire.
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(useCallback(() => { setFocusTick((t) => t + 1); }, []));
  // R8 pre-release audit (Yoav + הסורק 2026-06-11): removed the
  // `seventyFiredThisMountRef` + `lastChestRollRef` workaround. They
  // dedup'd recordChestOpen() but the underlying TWO useEffects still
  // double-credited the user when a single chip jumped <70% → 100% in
  // one commit (both `addCoins` calls ran, only the master `setChestState`
  // persisted → silent double payout, single modal). The two effects are
  // now unified into one below; the refs are unnecessary.
  // Captain Shark chip-completion call-out (Yoav 2026-06-22). Replaces the old
  // 25%/50% milestone toasts: a transient encouragement (rotating webp +
  // proximity copy + gentle confetti) on EVERY real chip completion, pulling
  // the user toward the 70% chest. `calloutSeq` increments once per genuine
  // completion; `prevCompletedRef` is the hydration-seeded baseline so the
  // initial pct/completed catch-up doesn't fire it.
  const prevCompletedRef = useRef<number | null>(null);
  const [calloutSeq, setCalloutSeq] = useState(0);
  // Chest display state — driven from either the 70% or 100% useEffects
  // so the same ChestCelebrationModal can host both reveals. null = not
  // showing.
  const [chestState, setChestState] = useState<{
    xp: number;
    coins: number;
    energy: number;
    isFinale: boolean;
    /** R8 T3.4 — rarity rolled on this open. Drives Captain's Forecast
     *  copy, chest visuals (gold tint for mythic), and the ×3 reward
     *  bonus already baked into `coins`. */
    rarity: ChestRarity;
    /** Yoav 2026-06-12: DoN offer rolled at chest-trigger time. The
     *  ChestCelebrationModal only opens its DoN flow when this is true,
     *  so the "הכל או כלום" prompt actually surfaces ~25% of chests
     *  (was firing on every chest because onDoNResolve was always wired). */
    offerDoN: boolean;
    /** Yoav 2026-06-12: playful "I'm bailing" CTA label rolled at chest
     *  open. Set on ~30% of post-mod-0-1b chests; null otherwise so
     *  the modal hides the button. */
    quitLabel: string | null;
  } | null>(null);
  const upsertProgress = useUpsertModuleProgress();
  const { playSound } = useSoundEffect();
  // Select the methods individually (stable refs) instead of the whole store —
  // useEconomyUIStore() returned a fresh object every render, which put a
  // changing reference in the chest-drop effect's deps and re-ran it on every
  // unrelated economy update.
  const addXP = useEconomyUIStore((s) => s.addXP);
  const addCoins = useEconomyUIStore((s) => s.addCoins);

  // Seed refs from the persisted maps on mount so a re-mount post-crossing
  // doesn't re-trigger either celebration.
  const modulePastThreshold = useTopicProgressStore(
    (s) => Boolean(s.modulesPastThreshold[module.id]),
  );
  const moduleFullyComplete = useTopicProgressStore(
    (s) => Boolean(s.modulesFullyComplete[module.id]),
  );
  // True while a "למידה רציפה" continuous run for THIS module is mounted on
  // top of us. The run marks topics live as it advances, which can cross the
  // 70% gate mid-lesson — we must NOT fire (and pop a Modal over the running
  // lesson) until it's done. See useContinuousRunStore.
  const continuousRunActive = useContinuousRunStore(
    (s) => s.activeModuleId === module.id,
  );
  // Hydration gate for the milestone refs: seeding them at mount read
  // summary.pct BEFORE zustand-persist rehydrated topic-progress from
  // AsyncStorage — a returning user mounted at pct=0, hydration landed,
  // pct jumped to its real value, and the 25/50% toast re-fired on every
  // cold start (code-review 2026-06-12). Seed only once hydration is done;
  // the toast effect below stays silent until then. The 70/100 chest is
  // already safe via the live modulePastThreshold selector guard.
  const [progressHydrated, setProgressHydrated] = useState<boolean>(
    () => useTopicProgressStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (progressHydrated) return;
    const unsub = useTopicProgressStore.persist.onFinishHydration(() =>
      setProgressHydrated(true),
    );
    // Race guard: hydration may have finished between the initial state
    // read and the subscription above.
    if (useTopicProgressStore.persist.hasHydrated()) setProgressHydrated(true);
    return unsub;
  }, [progressHydrated]);
  useEffect(() => {
    if (!progressHydrated) return;
    past70Ref.current = modulePastThreshold;
    past100Ref.current = moduleFullyComplete;
    // Seed the call-out baseline from the hydrated completed-count so the
    // initial catch-up (0 → real value) doesn't fire a spurious call-out on
    // cold start / deep link / hot reload.
    prevCompletedRef.current = summary.completed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressHydrated]);

  // Chip-completion call-out trigger (folds in the old 25%/50% toasts). Fires
  // once per genuine chip completion via the SharkChipCallout below. Gated by
  // hydration (so the initial catch-up is silent) and SKIPPED on the
  // completion that crosses the threshold — that moment belongs to the
  // ChestCelebrationModal, not a call-out. Only one threshold band can change
  // per commit, and summary.completed counts real learning topics only (the
  // display-only carousel/tool chips aren't in `topics`), so a single guarded
  // increment is correct.
  useEffect(() => {
    if (!progressHydrated) return;
    if (prevCompletedRef.current === null) {
      prevCompletedRef.current = summary.completed;
      return;
    }
    // Fire the chip call-out on a genuine completion, EXCEPT:
    //  • the threshold-crossing chip — the ChestCelebrationModal owns that moment;
    //  • the very FIRST chip — the app tour auto-starts there and a call-out
    //    collides with it (Yoav 2026-06-22);
    //  • mod-0-1's SECOND chip too — the app walkthrough runs through it and the
    //    flow must stay clean (Yoav 2026-06-22: "אל תשים נוטיפיקציה בסוף הציפ
    //    השני במודולה 0-1, מתחיל הסיור"); so for mod-0-1 the call-out starts only
    //    from the 3rd completion;
    //  • during a continuous run — it marks several chips at once, which would
    //    spew call-outs "one after another".
    const calloutSkipBelow = module.id === 'mod-0-1' ? 2 : 1;
    if (
      summary.completed > prevCompletedRef.current &&
      !summary.isModuleDone &&
      summary.completed > calloutSkipBelow &&
      !continuousRunActive
    ) {
      setCalloutSeq((s) => s + 1);
    }
    prevCompletedRef.current = summary.completed;
  }, [summary.completed, summary.isModuleDone, progressHydrated, continuousRunActive]);

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
    // Continuous-run "למידה רציפה" was removed 2026-06-19, so its suppression of
    // this chest is gone: the 70% accordion chest is now the ONLY chest, so it
    // must ALWAYS fire when 70% is crossed (Yoav 2026-06-19: "תמיד מקבלים תיבה
    // אחרי 70%"). The atomic stampModuleThreshold below still prevents any
    // double-fire. (continuousRunActive stays in deps but no longer gates it.)
    // Also honor the LIVE persisted flags, not just the mount-seeded refs:
    // the "למידה רציפה" continuous flow can stamp modulesPastThreshold from
    // INSIDE LessonFlowScreen while this accordion stays mounted beneath it.
    // On return the refs are still false (seeded at 0% on first mount), so
    // without this guard the accordion would fire its own 70% chest ON TOP
    // of the legacy summary chest the continuous flow already showed (double
    // chest). The flags are false on a normal first crossing (stamped inside
    // this same effect), so the legacy path is unaffected.
    // Yoav 2026-06-12: ONE chest per module — fired at the 70% threshold
    // crossing. The 100% master chest was retired per user feedback ("את
    // התיבה יקבלו פעם אחת בסיום 70 אחוז מהלמידה של המודולה"). The 100%
    // ref/store flag stays so analytics + future re-enable still work,
    // but no second modal fires.
    const seventyJustCrossed =
      summary.isModuleDone && mod01QuestionResolved &&
      !past70Ref.current && !modulePastThreshold;
    if (!seventyJustCrossed) return;

    past70Ref.current = true;
    // ATOMIC dedup: stampModuleThreshold test-and-sets the persisted flag and
    // returns true only for the FIRST caller. When several accordion instances
    // (or re-runs) cross 70% in the same commit they all read the still-stale
    // subscribed `modulePastThreshold` (false) and reach here — but only the
    // one that actually stamps proceeds; the rest bail. Without this the reward
    // + ChestCelebrationModal fired once PER racing instance (Yoav saw the
    // chest 3×). The first chest is correct; the duplicates are killed here.
    const newlyStamped = useTopicProgressStore.getState().stampModuleThreshold(module.id);
    if (!newlyStamped) return;

    // Module-completion analytics. The topic-tree method previously fired
    // NO `lesson_completed`, so every module learned this way was invisible
    // to the NSM / WoW-retention / streak / daily-lessons insights. Mirror
    // the legacy LessonFlowScreen prop shape + add `learning_mode`. Read
    // is_first_lesson BEFORE markCompleted mutates the store. Non-fatal.
    try {
      const isFirstLesson =
        useCompletedModulesStore.getState().completedIds.length === 0;
      captureEvent('lesson_completed', {
        module_id: module.id,
        chapter_id: chapterIdFromModuleId(module.id),
        is_first_lesson: isFirstLesson,
        learning_mode: 'topic-tree',
        // Mirror the legacy completeModule() variant tag so the post-split
        // mod-0-1 / mod-0-1b funnel separately on the topic-tree path too.
        // Topic-tree is now the DEFAULT completion path, so without this the
        // `module_variant` breakdown only saw the rare legacy completions and
        // under-counted the split. See LessonFlowScreen.completeModule.
        ...(module.id === 'mod-0-1' ? { module_variant: 'short' } :
            module.id === 'mod-0-1b' ? { module_variant: 'continuation' } :
            {}),
      });
    } catch { /* non-fatal */ }

    upsertProgress.mutate({
      moduleId: module.id,
      status: 'completed',
      xpEarned: MODULE_TT_XP,
    });
    useCompletedModulesStore.getState().markCompleted(module.id);

    // Roll multiplier + rarity for this single chest open.
    const { multiplier, rarity } = useTopicProgressStore.getState().recordChestOpen();
    const rarityBonus = CHEST_RARITY_BONUS[rarity];
    const totalXp = MODULE_TT_XP;
    const totalCoins = Math.round(MODULE_TT_COINS * multiplier * rarityBonus);

    addXP(totalXp, 'daily_task');
    addCoins(totalCoins, 'lesson');
    // Chest also grants real energy (Yoav 2026-06-22) — the fly-out lives in
    // the ChestCelebrationModal. Non-fatal; capped by the store.
    try { useHeartsStore.getState().grantEnergy(CHEST_ENERGY_REWARD, 'chest'); } catch { /* non-fatal */ }
    successHaptic();
    try { playSound('modal_open_3'); } catch { /* non-fatal */ }

    // Yoav 2026-06-12: DoN ("הכל או כלום") gated on a 25% roll PER chest
    // (was 100% — onDoNResolve was wired unconditionally and the modal
    // opened the DoN flow on every chest). Rolled here once at chest-trigger
    // time so the modal can read a stable boolean.
    // No double-or-nothing during onboarding (mod-0-1 / mod-0-1b) — Yoav 2026-06-25:
    // the first chests stay clean (no gamble prompt), like quitLabel below.
    const offerDoN = module.id !== 'mod-0-1' && module.id !== 'mod-0-1b' && Math.random() < 0.25;

    // Yoav 2026-06-12: playful "I'm bailing to Netflix" CTA — 30% of chest
    // opens, mod-0-2 onwards (mod-0-1 + mod-0-1b stay clean during onboarding).
    const POST_QUIT_LABELS = [
      'עפתי לנטפליקס 📺',
      'עפתי לאינסטגרם 📱',
      'עפתי לטיקטוק 🎵',
      'אני הולך לישון 😴',
      'יש לי שווארמה שמחכה 🌯',
      'יש לי פיצה שמתקררת 🍕',
    ];
    const isOnboardingModule = module.id === 'mod-0-1' || module.id === 'mod-0-1b';
    const quitLabel = !isOnboardingModule && Math.random() < 0.3
      ? POST_QUIT_LABELS[Math.floor(Math.random() * POST_QUIT_LABELS.length)]
      : null;

    setChestState({ xp: totalXp, coins: totalCoins, energy: CHEST_ENERGY_REWARD, isFinale: false, rarity, offerDoN, quitLabel });

    // Snapshot the lesson's grading inputs NOW, while the session-only data
    // (quizResults, voice transcript) is still in memory — the end-of-lesson
    // "דוח סיכום שיעור" card reads this. Idempotent (first capture wins) and
    // quota-free; the AI report itself is generated on demand from the snapshot.
    try {
      useModuleComprehensionStore.getState().captureInputs(module.id, module.title);
    } catch { /* non-fatal */ }
    // Chest reveal analytics — split by rarity, DoN/quit-offer rolls,
    // and reward amounts. Pairs with chest_cta_tapped + chest_don_resolved
    // to understand the post-chest funnel (engagement vs bail).
    try {
      track({
        name: 'chest_opened',
        props: {
          module_id: module.id,
          chapter_id: chapterIdFromModuleId(module.id),
          rarity,
          xp: totalXp,
          coins: totalCoins,
          offered_don: offerDoN,
          offered_quit: quitLabel !== null,
          // Mystery reveal shipped 2026-06-17: rarity is now hidden until the
          // user taps. Tag the cohort so we can compare post-chest engagement
          // (next lesson within 24h) against the pre-mystery 'legacy' baseline.
          reveal_variant: 'mystery',
        },
      });
    } catch { /* non-fatal */ }
    // Module-first first-run experiment (onboarding_module_first): the mod-0-1
    // chest IS the activation metric — but a conversion counts ONLY as the
    // COMPOUND "activated AND completed onboarding" (Yoav 5.7.26: an arm that
    // produces module-finishers who never finish profiling must not win).
    // Structurally the map is post-onboarding in both arms already, so the
    // hasCompletedOnboarding check is a belt-and-suspenders invariant: if the
    // chest ever moves (or a pre-onboarding map path appears), the metric
    // degrades loudly to zero instead of silently becoming activation-only.
    // Fires symmetrically for both arms at the same moment (this chest); the
    // authoritative read stays the PostHog chest_opened event above, sliced
    // by person.bandit_variant__onboarding_module_first.
    if (module.id === 'mod-0-1') {
      try {
        const arm = useTutorialStore.getState().firstRunArm;
        const onboarded = useAuthStore.getState().hasCompletedOnboarding;
        if (arm !== null && onboarded) {
          useBanditStore.getState().recordConversion(FIRST_RUN_EXPERIMENT_ID, firstRunVariantId(arm));
        }
      } catch { /* non-fatal */ }
    }
  }, [summary.isModuleDone, summary.pct, mod01QuestionResolved, module.id, upsertProgress, addXP, addCoins, playSound, modulePastThreshold, moduleFullyComplete, continuousRunActive, focusTick]);

  // Small 100%-completion pop (Yoav 2026-06-26). Per-chip rewards were removed,
  // so the post-70% chips no longer fly out gold/gems individually — instead a
  // modest coin/XP pop fires ONCE the first time the module reaches 100%. No
  // modal: RewardAnimationProvider animates the fly-out off the economy delta.
  // Atomic stampModuleFullyComplete (+ live persisted flag + ref) → exactly once.
  useEffect(() => {
    if (!progressHydrated) return;
    if (summary.total === 0 || summary.completed < summary.total) return;
    if (past100Ref.current || moduleFullyComplete) return;
    past100Ref.current = true;
    const newly = useTopicProgressStore.getState().stampModuleFullyComplete(module.id);
    if (!newly) return;
    addXP(HUNDRED_PCT_XP, 'daily_task');
    addCoins(HUNDRED_PCT_COINS, 'lesson');
    try { successHaptic(); } catch { /* non-fatal */ }
  }, [summary.completed, summary.total, moduleFullyComplete, module.id, addXP, addCoins, progressHydrated, focusTick]);

  // R8 U1/U2 — mod-0-1-only walkthrough prompt. Fires the first time
  // the user crosses ~10% of mod-0-1 (intro + 1 card), so the offer
  // happens BEFORE momentum builds, not after. "המשך ללמוד" keeps
  // the user IN the map (no paywall jank); Pro funnel fires on the
  // user's natural exit. Yoav: "לאחר ביצוע של עוד רכבי ב-0-1, יפתח
  // לו קריאה לבצע את ההיכרות עם האפליקציה, או להמשיך ללמוד".
  const router = useRouter();
  const hasSeenAppWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const triggerWalkthrough = useTutorialStore((s) => s.triggerWalkthrough);
  const isGuest = useAuthStore((s) => s.isGuest);

  // #6 Graduate onboarding inside the topic-tree: collect the staged profile
  // questions (knowledgeLevel → learningTime → dailyGoal) at the 70% chest
  // moment when the linear chapter-0 flow never asked them. Fired ONLY after the
  // chest modal closes (see onContinueModule) so it never interrupts the reward
  // sequence (Yoav 2026-06-15: "שהגרדיואייטד יגיע רק לאחר סיום רצף ... פתיחת
  // התיבה ולא יפול באמצע"). One question per chest, until all are answered.
  const [profileQuestionKind, setProfileQuestionKind] = useState<ProfileQuestionKind | null>(null);
  const profileQTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (profileQTimerRef.current) clearTimeout(profileQTimerRef.current); }, []);
  const maybeShowProfileQuestion = useCallback((): boolean => {
    // Skip the pure onboarding modules — mod-0-1 collects knowledgeLevel via its
    // own inline flow; keep the first-run experience clean.
    if (module.id === 'mod-0-1' || module.id === 'mod-0-1b') return false;
    const profile = useAuthStore.getState().profile;
    const next: ProfileQuestionKind | null =
      !profile?.knowledgeLevel ? 'knowledgeLevel'
      : !profile?.learningTime ? 'learningTime'
      : !profile?.dailyGoalMinutes ? 'dailyGoal'
      : null;
    if (!next) return false;
    // Delay so the chest modal is fully gone before this one fades in.
    if (profileQTimerRef.current) clearTimeout(profileQTimerRef.current);
    profileQTimerRef.current = setTimeout(() => setProfileQuestionKind(next), 450);
    return true;
  }, [module.id]);

  // #8 Module-end signup gate — GUESTS ONLY, once per module (mod-0-2+), shown
  // AFTER the chest sequence. Mutually exclusive with the profile question
  // (registered users) so we never stack two modals after one chest.
  const [signupGateVisible, setSignupGateVisible] = useState(false);
  const maybeShowSignupGate = useCallback(() => {
    // mod-0-1 NOW uses this reliable in-accordion gate too (Yoav 2026-06-28):
    // its old path (pendingPostWalkthroughCTA → PostWalkthroughRegisterCTAGate)
    // is gated on `onLearnMap` and never fired after the 0-1 chest, so guests
    // got NO register prompt. This gate renders in the accordion regardless of
    // pathname. mod-0-1b still defers to its own post-module paywall flow.
    if (module.id === 'mod-0-1b') return;
    if (useTutorialStore.getState().moduleEndGateShown[module.id]) return;
    if (profileQTimerRef.current) clearTimeout(profileQTimerRef.current);
    // Mark "shown" only when the modal actually opens — if the user navigates
    // away within the 450ms delay, the cleanup clears this timer and the gate
    // must stay eligible for next time (was marked synchronously here before,
    // which locked guests out of the gate forever — pre-release audit P1).
    profileQTimerRef.current = setTimeout(() => {
      useTutorialStore.getState().markModuleEndGateShown(module.id);
      setSignupGateVisible(true);
    }, 450);
  }, [module.id]);

  // Rate-the-app prompt — LOWEST-priority post-chest modal (registered users
  // only). Fires after a short beat ONLY when no profile question was scheduled
  // AND shouldShowRatePrompt() passes (active user, cooldown, lifetime cap).
  // Yoav 2026-06-21 — kept tasteful: in-app, once-ish, never nagging.
  const [ratePromptVisible, setRatePromptVisible] = useState(false);
  const rateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (rateTimerRef.current) clearTimeout(rateTimerRef.current); }, []);
  const maybeShowRatePrompt = useCallback(() => {
    if (!shouldShowRatePrompt()) return;
    if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
    rateTimerRef.current = setTimeout(() => {
      useTutorialStore.getState().markRatePromptShown();
      setRatePromptVisible(true);
      try {
        track({ name: 'rate_prompt_shown', props: { trigger: 'module_complete', module_id: module.id, completed_modules: useCompletedModulesStore.getState().completedIds.length } });
      } catch { /* non-fatal */ }
    }, 500);
  }, [module.id]);

  // Tool-of-the-day nudge after the 70% accordion chest (Yoav 2026-06-22) —
  // mirrors the legacy LessonFlowScreen path so the daily tool ("כלי של היום")
  // surfaces on the topic-tree path too, not only after the old chest. Skips
  // onboarding modules; once/day via useToolNudgeStore; SharkToolCTA self-gates
  // on the nudge-queue 'tools' cooldown and records its own impression.
  const [showToolCTA, setShowToolCTA] = useState(false);
  const maybeShowToolNudge = useCallback((): boolean => {
    if (module.id === 'mod-0-1' || module.id === 'mod-0-1b') return false;
    try {
      if (useToolNudgeStore.getState().isShownToday()) return false;
      if (!useNudgeQueueStore.getState().canShow('tools')) return false;
    } catch { return false; }
    try { useToolNudgeStore.getState().markShown(); } catch { /* non-fatal */ }
    setShowToolCTA(true);
    return true;
  }, [module.id]);

  // Used only by the welcome banner below — the auto-walkthrough trigger that
  // consumed this was removed 2026-06-25 (the tour now fires right after
  // onboarding, before the first lesson — see ProfilingFlow.enterFirstModule).
  const completedNonIntroChipCount = useMemo(
    () => topics.filter((t) => t.kind !== 'intro' && isCompletedMap[t.id]).length,
    [topics, isCompletedMap],
  );
  // Auto-walkthrough trigger removed 2026-06-25 — the tour now fires immediately
  // after onboarding (ProfilingFlow.enterFirstModule), before the first lesson, so
  // it never pops mid auto-flow (the user no longer returns to the map between
  // chips). Kept as a guarded no-op so the deps stay referenced for a clean revert.
  useEffect(() => {
    void [module.id, completedNonIntroChipCount, hasSeenAppWalkthrough, triggerWalkthrough];
  }, [module.id, completedNonIntroChipCount, hasSeenAppWalkthrough, triggerWalkthrough]);

  // Mod-0-1 onboarding banner — surfaces above the chip column ONLY
  // during the welcome window (= app walkthrough not yet seen +
  // no non-intro chip completed). Yoav 2026-06-11: replaces the
  // pre-walkthrough daily-challenge surface with a direct CTA telling
  // the user where to tap next.
  const displayName = useAuthStore((s) => s.displayName) ?? '';
  const showWelcomeBanner =
    module.id === 'mod-0-1' && !hasSeenAppWalkthrough && completedNonIntroChipCount < 1;

  // "למידה רציפה" (Yoav 2026-06-11): run the WHOLE module as one continuous
  // legacy flow (the master-version UX) instead of the broken-down chip
  // path. We launch LessonFlowScreen WITHOUT startPhase/returnTo=topic-tree
  // so it behaves exactly like master (auto-advances every phase → summary
  // chest). `ttProgress=1` tells the lesson to stamp each completed phase
  // into useTopicProgressStore as it goes, so if the user bails mid-flow the
  // chips they already cleared light up here — letting them start in
  // autopilot and switch to the accordion mid-way. chapterId is derived from
  // the module id (same canonical parse the store uses) since the accordion
  // has no route param for it.
  // "למידה רציפה" autopilot was REMOVED (Yoav 2026-06-19: "תבטל את האופציה של
  // אוטופיילוט לרוץ על מודולה"). Every module is now learned chip-by-chip via
  // the accordion (returnTo=topic-tree), which keeps the per-chip progress bar
  // accurate and the 70% chest firing from the accordion (not the legacy
  // whole-module summary chest). The ttProgress/continuous-run plumbing stays
  // dormant — nothing launches it anymore.

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
    >
      <View style={{ position: 'relative' }}>
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
        {/* "למידה רציפה" autopilot KEY now lives INSIDE ModuleTopicLayout's
            first-chip row (wired via onStartContinuous below) so it sits beside
            the intro chip instead of floating in the gap above it. Gated to the
            early window (no content chip done) + suppressed during the mod-0-1
            welcome banner (Yoav 2026-06-13). */}
        {/* Tree + path chips, no surrounding rectangle so the accordion
            reads as a continuation of the outer module path. */}
        <ModuleTopicLayout
          topics={displayTopics}
          isCompletedMap={isCompletedMap}
          recommendedTopicId={summary.nextTopic?.id ?? null}
          onRecommendedChipRef={onRecommendedChipRef}
          progressPct={summary.pct}
          nodeOffsetX={nodeOffsetX}
          onTopicPress={handleChipPress}
        />

        {/* "דוח סיכום שיעור" — pinned at the BOTTOM of the map once the chest
            has opened (modulePastThreshold is persisted, so it's here on every
            re-tap too). The card self-gates: it renders nothing without a
            captured snapshot/report, handles the weekly quota on tap, and opens
            the deep-analysis-style report (with talk-to-Shark) in a modal. */}
        {modulePastThreshold && (
          // pointerEvents box-none + paddingBottom + zIndex (Yoav 2026-06-26):
          // the inter-module PEARL below is pulled UP (marginTop:-18, zIndex:2) into
          // this band, and ModuleReportCard renders null without a snapshot — so the
          // shark-call card landed right under the pearl's hit-area and taps opened
          // the pearl/next node instead of the call. The padding clears the overlap
          // and the zIndex keeps the cards above the pearl.
          <View ref={onEndCardsRef} pointerEvents="box-none" style={{ zIndex: 5, paddingBottom: 26 }}>
            <ModuleSharkCallCard moduleId={module.id} moduleTitle={module.title} />
            <ModuleReportCard moduleId={module.id} moduleTitle={module.title} />
          </View>
        )}

        {moduleCarousel && (
          <CarouselSheet
            visible={carouselOpen}
            onClose={() => setCarouselOpen(false)}
            title={moduleCarousel.titleHe}
            slides={moduleCarousel.slides}
          />
        )}

        {/* #6 Graduate onboarding — a still-unanswered staged profile question,
            surfaced only AFTER the chest sequence closes (never mid-sequence). */}
        <InModuleProfileQuestion
          visible={profileQuestionKind !== null}
          kind={profileQuestionKind ?? 'knowledgeLevel'}
          onDone={() => setProfileQuestionKind(null)}
        />

        {/* #8 Module-end signup gate — guests only, once per module (mod-0-2+). */}
        <ModuleEndSignupGate
          visible={signupGateVisible}
          moduleId={module.id}
          onClose={() => setSignupGateVisible(false)}
        />

        {/* Rate-the-app prompt — registered active users, post-chest, gated +
            cooldown (rateAppPrompt.ts). Accept → store deep-link + never again. */}
        <RateAppPromptModal
          visible={ratePromptVisible}
          onClose={() => setRatePromptVisible(false)}
          moduleId={module.id}
        />

        {/* Single chest celebration at 70% (Yoav 2026-06-12). The 100%
            master chest was retired per user request. */}
        <ChestCelebrationModal
          visible={chestState !== null}
          xp={chestState?.xp ?? MODULE_TT_XP}
          coins={chestState?.coins ?? MODULE_TT_COINS}
          energy={chestState?.energy ?? CHEST_ENERGY_REWARD}
          isFinale={chestState?.isFinale ?? false}
          // Honest percent for "סיימת X% מהשיעור": derive from the actual chip
          // gate (carries the mod-0-1 3-chip override), not the raw threshold.
          thresholdPct={Math.round((chipsToChestFor(module.id, Math.max(1, summary.total)) / Math.max(1, summary.total)) * 100)}
          rarity={chestState?.rarity ?? 'common'}
          onContinueModule={() => {
            try { track({ name: 'chest_cta_tapped', props: { module_id: module.id, chapter_id: chapterIdFromModuleId(module.id), cta: 'finish_module' } }); } catch { /* non-fatal */ }
            setChestState(null);
            // Post-chest CTAs after the mod-0-1 chest CLOSES (Yoav 2026-06-25):
            // GUESTS → register CTA DIRECTLY (the Pro-teaser→register chain was
            // unreliable, and maybeShowSignupGate skips mod-0-1 so guests had NO
            // register path); registered non-Pro → the soft Pro teaser (its gate
            // filters Pro users). Armed only now that the chest is closed.
            if (module.id === 'mod-0-1') {
              // Clear the stale welcome-chest one-shot so the SOFT register CTA isn't
              // blocked by it (welcome chest is pre-mod-0-1, this is post — they never
              // overlap, but its gate waits on !pendingPostWalkthroughFirstChest;
              // Yoav 2026-06-26 regression: guests saw no register prompt).
              try { useTutorialStore.getState().setPendingPostWalkthroughFirstChest(false); } catch { /* non-fatal */ }
              // Guests: the in-accordion ModuleEndSignupGate below is the ONE
              // register surface — arming pendingPostWalkthroughCTA here too
              // stacked a second global modal on top of it (2026-07-03 audit).
              if (!isGuest) { try { useTutorialStore.getState().setPendingPostWalkthroughProTeaser(true); } catch { /* non-fatal */ } }
            }
            // Guests get the signup gate (#8, skipped for mod-0-1), registered
            // users any pending staged profile question (#6). Mutually exclusive.
            if (isGuest) { maybeShowSignupGate(); } else if (!maybeShowProfileQuestion() && !maybeShowToolNudge()) { maybeShowRatePrompt(); }
            // The 70% chest keeps the accordion open so the user can
            // finish the remaining 30% — but when the chest fired at 100%
            // (e.g. a continuous run completed every chip before returning)
            // there's nothing left to finish; collapse via onModuleCompleted
            // instead of stranding an open accordion (code-review 2026-06-12).
            if (summary.pct >= 100) {
              onModuleCompleted?.();
            } else {
              onContinueAfterChest?.();
            }
          }}
          // Hardware back / system dismiss: close WITHOUT chest_cta_tapped —
          // wiring this to onContinueModule made every Android back press
          // count as a fake 'finish_module' CTA in the conversion funnel.
          onDismiss={() => {
            setChestState(null);
            // Same post-chest CTAs as the continue path (mod-0-1): guests →
            // register CTA, registered non-Pro → Pro teaser. Armed only after close.
            if (module.id === 'mod-0-1') {
              // Clear the stale welcome-chest one-shot so the SOFT register CTA isn't
              // blocked by it (welcome chest is pre-mod-0-1, this is post — they never
              // overlap, but its gate waits on !pendingPostWalkthroughFirstChest;
              // Yoav 2026-06-26 regression: guests saw no register prompt).
              try { useTutorialStore.getState().setPendingPostWalkthroughFirstChest(false); } catch { /* non-fatal */ }
              // Guests: in-accordion gate only — see the onContinueModule note
              // (double-modal fix, 2026-07-03 audit).
              if (!isGuest) { try { useTutorialStore.getState().setPendingPostWalkthroughProTeaser(true); } catch { /* non-fatal */ } }
            }
            if (isGuest) { maybeShowSignupGate(); } else if (!maybeShowProfileQuestion() && !maybeShowToolNudge()) { maybeShowRatePrompt(); }
            if (summary.pct >= 100) {
              onModuleCompleted?.();
            } else {
              onContinueAfterChest?.();
            }
          }}
          onAdvanceToNextModule={() => {
            try { track({ name: 'chest_cta_tapped', props: { module_id: module.id, chapter_id: chapterIdFromModuleId(module.id), cta: 'continue' } }); } catch { /* non-fatal */ }
            setChestState(null);
            // 2026-07-03 (root cause of "no gate + no shark wager after the
            // mod-0-1 chest"): this PRIMARY "המשך" CTA was the ONLY chest-close
            // path that armed nothing — guests who tapped it never saw a
            // register surface, and Day0ExitRitualHost (gated on the
            // moduleEndGateShown['mod-0-1'] stamp since 0a373e86) could never
            // fire. Mirror the other close paths here.
            if (module.id === 'mod-0-1') {
              try { useTutorialStore.getState().setPendingPostWalkthroughFirstChest(false); } catch { /* non-fatal */ }
              if (!isGuest) { try { useTutorialStore.getState().setPendingPostWalkthroughProTeaser(true); } catch { /* non-fatal */ } }
            }
            onAdvanceToNextModule?.();
            if (isGuest) {
              // Arm the end-of-module register gate and KEEP the accordion
              // mounted — onModuleCompleted unmounts it, which clears the gate's
              // 450ms timer (cleanup above) and the modal host with it.
              maybeShowSignupGate();
            } else {
              onModuleCompleted?.();
            }
          }}
          // Yoav 2026-06-12: DoN gated on the 25% roll captured in chestState.
          // Passing undefined skips the entire DoN flow inside the modal so
          // the prompt never even surfaces on the non-offered ~75%.
          onDoNResolve={chestState?.offerDoN
            ? (multiplier) => {
                // multiplier: 0 = lost everything, 1 = kept base, 2 = doubled.
                // Coins were already credited above — here we apply the delta
                // on top of THAT amount (so it stacks on the streak multiplier
                // too).
                const base = chestState?.coins ?? 0;
                if (multiplier === 2) {
                  addCoins(base, 'lesson');
                } else if (multiplier === 0) {
                  // `addCoins` early-returns on amount <= 0, so a DoN LOSS was a
                  // silent no-op. Deduct via the canonical economy-delta pipe,
                  // which handles negative deltas.
                  fireEconomyDelta({ coinsDelta: -base });
                }
                try {
                  const outcome = multiplier === 2 ? 'doubled' : multiplier === 0 ? 'lost' : 'kept';
                  track({
                    name: 'chest_don_resolved',
                    props: {
                      module_id: module.id,
                      chapter_id: chapterIdFromModuleId(module.id),
                      outcome,
                      base_coins: base,
                    },
                  });
                } catch { /* non-fatal */ }
              }
            : undefined}
          // Yoav 2026-06-12: playful "I'm bailing" CTA. Surfaced on ~30%
          // of chests starting from mod-0-2. On tap → close modal and
          // exit the learning map to the home tab.
          quitLabel={chestState?.quitLabel ?? null}
          onQuit={() => {
            try {
              track({
                name: 'chest_cta_tapped',
                props: {
                  module_id: module.id,
                  chapter_id: chapterIdFromModuleId(module.id),
                  cta: 'quit',
                  quit_label: chestState?.quitLabel ?? undefined,
                },
              });
            } catch { /* non-fatal */ }
            setChestState(null);
            router.replace('/(tabs)/index' as never);
          }}
          // Yoav 2026-06-29: live summary-call option ABOVE "המשך". Tapping
          // closes the chest and starts the call (consent → call → report).
          summaryCallAvailable={sharkCall.available}
          summaryCallEligible={sharkCall.eligible}
          onStartSummaryCall={() => { setChestState(null); sharkCall.openCall(); }}
        />

        {/* Live summary-call modals (consent → call → report) for the chest
            button. Rendered at the accordion root — NOT inside the chest modal —
            so closing the chest never unmounts an in-flight call. */}
        {sharkCall.modals}

        {/* Tool-of-the-day nudge after the chest (mirrors the legacy flow).
            Self-gates on the nudge-queue 'tools' cooldown; once/day via the
            maybeShowToolNudge trigger above. */}
        <SharkToolCTA
          visible={showToolCTA}
          onOpenTool={(route) => { setShowToolCTA(false); router.push(route as never); }}
          onDismiss={() => setShowToolCTA(false)}
        />

        {/* Mod-0-1 tour now AUTO-STARTS after the first chip (Yoav 2026-06-21) —
            no opt-in prompt. The tour overlay (app/_layout) has its own
            "דלג על הסיור" skip. */}

        {/* Captain Shark chip-completion call-out (replaces the 25%/50%
            milestone toasts) — rotating webp + proximity copy + gentle
            confetti on every chip completion, pulling toward the chest. */}
        <SharkChipCallout
          seq={calloutSeq}
          remaining={chestRemaining}
          isFirstChest={noChestOpenedYet}
          onPopupContinue={onChipCalloutContinue}
        />
      </View>
    </Animated.View>
  );
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
