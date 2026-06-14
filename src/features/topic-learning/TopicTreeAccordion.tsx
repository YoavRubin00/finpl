import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { mediumHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { captureEvent } from '../../lib/posthog';
import { track } from '../../lib/analytics/events';
import { useUpsertModuleProgress } from '../chapter-1-content/useProgress';
import { ChestCelebrationModal } from './ChestCelebrationModal';
import { InModuleProfileQuestion, type ProfileQuestionKind } from '../onboarding/InModuleProfileQuestion';
import { ModuleEndSignupGate } from '../auth/ModuleEndSignupGate';
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
import { useContinuousRunStore } from './useContinuousRunStore';
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
    // R8 U4 — seed 25/50% refs from current pct so re-mount after
    // crossing doesn't replay the toast. Also covers users who land
    // past 25% from a deep link / hot reload.
    if (summary.pct >= 25) past25Ref.current = true;
    if (summary.pct >= 50) past50Ref.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressHydrated]);

  // R8 U4 — mid-module milestone crossings: 25% + 50%. Light celebration
  // only (toast + haptic + sound, NO modal) so it doesn't compete with
  // the 70% chest gravity. Dismisses itself after 1800ms.
  // Architect P2 (2026-06-11): consolidated from two parallel useEffects
  // into one — both watched the same summary.pct + summary.isModuleDone
  // and only one threshold can cross per commit, so a single effect with
  // an if/else is simpler and avoids running both bodies in the rare case
  // pct jumps from <25 directly to >=50.
  useEffect(() => {
    // Pre-hydration silence: refs aren't seeded yet, so any crossing seen
    // here would be hydration catching up, not real user progress.
    if (!progressHydrated) return;
    if (summary.isModuleDone) return;
    let toast: { label: string; emoji: string } | null = null;
    if (summary.pct >= 50 && !past50Ref.current) {
      past50Ref.current = true;
      // Also flip past25 so we don't fire a late 25% toast if the user
      // hit 50% in one jump.
      past25Ref.current = true;
      mediumHaptic();
      try { playSound('btn_click_soft_3'); } catch { /* non-fatal */ }
      toast = { label: 'אמצע הדרך!', emoji: '🌊' };
    } else if (summary.pct >= 25 && !past25Ref.current) {
      past25Ref.current = true;
      tapHaptic();
      try { playSound('btn_click_soft_4'); } catch { /* non-fatal */ }
      toast = { label: 'התחלת מעולה! ¼ הדרך', emoji: '✨' };
    }
    if (toast) {
      setMilestoneToast(toast);
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
      milestoneTimerRef.current = setTimeout(() => setMilestoneToast(null), 1800);
    }
  }, [summary.pct, summary.isModuleDone, playSound, progressHydrated]);

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
    // Suppress entirely while a continuous "למידה רציפה" run for this module
    // is in flight — it marks topics live (crossing 70% mid-lesson) but its
    // reward is the legacy summary chest, not ours. Firing here would pop a
    // Modal over the running lesson.
    if (continuousRunActive) return;
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
      summary.isModuleDone && !past70Ref.current && !modulePastThreshold;
    if (!seventyJustCrossed) return;

    past70Ref.current = true;
    // Persist the "first crossed 70%" flag (moved out of summaryForModule,
    // which is now a pure read — was a set()-during-render bug).
    useTopicProgressStore.getState().stampModuleThreshold(module.id);

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
    successHaptic();
    try { playSound('modal_open_3'); } catch { /* non-fatal */ }

    // Yoav 2026-06-12: DoN ("הכל או כלום") gated on a 25% roll PER chest
    // (was 100% — onDoNResolve was wired unconditionally and the modal
    // opened the DoN flow on every chest). Rolled here once at chest-trigger
    // time so the modal can read a stable boolean.
    const offerDoN = Math.random() < 0.25;

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

    setChestState({ xp: totalXp, coins: totalCoins, isFinale: false, rarity, offerDoN, quitLabel });
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
        },
      });
    } catch { /* non-fatal */ }
  }, [summary.isModuleDone, summary.pct, module.id, upsertProgress, addXP, addCoins, playSound, modulePastThreshold, moduleFullyComplete, continuousRunActive]);

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

  // #6 Graduate onboarding inside the topic-tree: collect the staged profile
  // questions (knowledgeLevel → learningTime → dailyGoal) at the 70% chest
  // moment when the linear chapter-0 flow never asked them. Fired ONLY after the
  // chest modal closes (see onContinueModule) so it never interrupts the reward
  // sequence (Yoav 2026-06-15: "שהגרדיואייטד יגיע רק לאחר סיום רצף ... פתיחת
  // התיבה ולא יפול באמצע"). One question per chest, until all are answered.
  const [profileQuestionKind, setProfileQuestionKind] = useState<ProfileQuestionKind | null>(null);
  const profileQTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (profileQTimerRef.current) clearTimeout(profileQTimerRef.current); }, []);
  const maybeShowProfileQuestion = useCallback(() => {
    // Skip the pure onboarding modules — mod-0-1 collects knowledgeLevel via its
    // own inline flow; keep the first-run experience clean.
    if (module.id === 'mod-0-1' || module.id === 'mod-0-1b') return;
    const profile = useAuthStore.getState().profile;
    const next: ProfileQuestionKind | null =
      !profile?.knowledgeLevel ? 'knowledgeLevel'
      : !profile?.learningTime ? 'learningTime'
      : !profile?.dailyGoalMinutes ? 'dailyGoal'
      : null;
    if (!next) return;
    // Delay so the chest modal is fully gone before this one fades in.
    if (profileQTimerRef.current) clearTimeout(profileQTimerRef.current);
    profileQTimerRef.current = setTimeout(() => setProfileQuestionKind(next), 450);
  }, [module.id]);

  // #8 Module-end signup gate — GUESTS ONLY, once per module (mod-0-2+), shown
  // AFTER the chest sequence. Mutually exclusive with the profile question
  // (registered users) so we never stack two modals after one chest.
  const [signupGateVisible, setSignupGateVisible] = useState(false);
  const maybeShowSignupGate = useCallback(() => {
    if (module.id === 'mod-0-1' || module.id === 'mod-0-1b') return;
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
    try { track({ name: 'walkthrough_prompt_shown', props: { module_id: module.id } }); } catch { /* non-fatal */ }
  }, [module.id, completedNonIntroChipCount, hasSeenAppWalkthrough]);

  const handleTakeTour = () => {
    try { track({ name: 'walkthrough_prompt_choice', props: { module_id: module.id, choice: 'tour' } }); } catch { /* non-fatal */ }
    setShowWalkthroughPrompt(false);
    triggerWalkthrough();
  };

  const handleContinueLearning = () => {
    try { track({ name: 'walkthrough_prompt_choice', props: { module_id: module.id, choice: 'continue' } }); } catch { /* non-fatal */ }
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
  const handleStartContinuous = useCallback(() => {
    tapHaptic();
    const chId = chapterIdFromModuleId(module.id);
    // continuous_run_started is now fired by LessonFlowScreen (the lifecycle
    // owner) when ttProgress=1 mounts — so it brackets completed/exited
    // symmetrically and covers EVERY entry path, not just this key. Firing it
    // here too would double-count and still miss the other paths.
    const chParam = chId ? `?chapterId=${chId}&ttProgress=1` : `?ttProgress=1`;
    router.push(`/lesson/${module.id}${chParam}` as never);
  }, [module.id, router]);

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
          topics={topics}
          isCompletedMap={isCompletedMap}
          recommendedTopicId={summary.nextTopic?.id ?? null}
          progressPct={summary.pct}
          nodeOffsetX={nodeOffsetX}
          onTopicPress={onTopicSelected}
          onStartContinuous={
            // Autopilot is offered only on REAL modules (chapter 1+), in the
            // early window (no content chip done yet), and never during the
            // mod-0-1 welcome banner. Chapter 0 is the intro/tutorial chapter
            // ("מה זה בכלל כסף" = mod-0-2 etc.) — it must be done manually so a
            // new user actually learns the app, never accidentally autopiloted
            // (Yoav 2026-06-14).
            !showWelcomeBanner &&
            completedNonIntroChipCount < 1 &&
            !module.id.startsWith('mod-0-')
              ? handleStartContinuous
              : undefined
          }
        />

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

        {/* Single chest celebration at 70% (Yoav 2026-06-12). The 100%
            master chest was retired per user request. */}
        <ChestCelebrationModal
          visible={chestState !== null}
          xp={chestState?.xp ?? MODULE_TT_XP}
          coins={chestState?.coins ?? MODULE_TT_COINS}
          isFinale={chestState?.isFinale ?? false}
          rarity={chestState?.rarity ?? 'common'}
          onContinueModule={() => {
            try { track({ name: 'chest_cta_tapped', props: { module_id: module.id, chapter_id: chapterIdFromModuleId(module.id), cta: 'finish_module' } }); } catch { /* non-fatal */ }
            setChestState(null);
            // After the chest closes (never mid-sequence): guests get the signup
            // gate (#8), registered users get any pending staged profile question
            // (#6). Mutually exclusive so we never stack two modals.
            if (isGuest) { maybeShowSignupGate(); } else { maybeShowProfileQuestion(); }
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
            if (summary.pct >= 100) {
              onModuleCompleted?.();
            } else {
              onContinueAfterChest?.();
            }
          }}
          onAdvanceToNextModule={() => {
            try { track({ name: 'chest_cta_tapped', props: { module_id: module.id, chapter_id: chapterIdFromModuleId(module.id), cta: 'continue' } }); } catch { /* non-fatal */ }
            setChestState(null);
            onAdvanceToNextModule?.();
            onModuleCompleted?.();
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
