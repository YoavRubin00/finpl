/**
 * Full-screen Pearl sheet — drops over the learn screen when the user taps
 * a pearl node. Plays a short pager of stages:
 *
 *   [optional] profile-question  →  daily-pick (concept/quote/mail)  →  mini-game
 *
 * Post-2026-05-30 multi-agent audit: the earlier 6-stage flow (concept +
 * quote + mail + video + game) had a predicted 15-20pp drop-off vs the
 * 3-stage version (Duolingo Stories benchmark) and zero payout. This sheet
 * now caps at 3 swipes, rotates the daily content (one per day), and grants
 * a small XP+coin payout on completion to keep the bonus feeling like a
 * reward.
 *
 * Exit-mid-flow (X tap) doesn't penalize the pearl progress — the pearl
 * stays unlocked for next time — but the streak-tick fires once the user
 * has cleared the daily-pick stage (so a near-completion still counts for
 * the daily activity if the pearl was their only session today).
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ChevronRight } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { SheetCloseButton } from '../../components/ui/SheetCloseButton';
import { track } from '../../lib/analytics/events';
import { useAuthStore } from '../auth/useAuthStore';
import { useIsPro } from '../subscription/useSubscription';
import { GlobalWealthHeader } from '../../components/ui/GlobalWealthHeader';
import type { ProfileQuestionKind } from '../onboarding/InModuleProfileQuestion';

import { usePearlsStore } from './usePearlsStore';
import { pearlIdFor, type PearlContent } from './pearlConfig';
import { PearlProgressBar } from './PearlProgressBar';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { PearlGameStage } from './stages/PearlGameStage';
import { PearlProfileQuestionStage } from './stages/PearlProfileQuestionStage';
import { PearlDailyConceptStage } from './stages/PearlDailyConceptStage';
import { PearlDailyQuoteStage } from './stages/PearlDailyQuoteStage';
import { PearlCaptainMailStage } from './stages/PearlCaptainMailStage';
import { PearlVideoStage } from './stages/PearlVideoStage';
import { PearlSwipeStage } from './stages/PearlSwipeStage';
import { PearlScenarioStage } from './stages/PearlScenarioStage';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useFunStore } from '../../stores/useFunStore';
import { markDailyActivityCompleted } from '../economy/useStreak';
import { LIFESTYLE_VIDEOS } from '../inter-module-break/lifestyleVideoConfig';
import { prefetchStreamingVideo } from '../../hooks/useModulePrefetch';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { PearlCtaStage, type PearlCtaKind } from './stages/PearlCtaStage';

/** Per-stage payout — every content stage cleared grants this small payout
 *  on the spot (with flying-coins animation), so the user feels rewarded as
 *  they go instead of only at the very end. Tuned to total ~24 XP + 48 coins
 *  across the 4 unique-bundle content stages (video, concept, swipe,
 *  scenario), matching the previous one-shot completion payout (25 / 50). */
const PEARL_PER_STAGE_XP = 6;
const PEARL_PER_STAGE_COINS = 12;

interface PearlSheetProps {
  visible: boolean;
  pearl: PearlContent | null;
  onClose: () => void;
}

type StageKind =
  | 'profile-question'
  | 'daily-pick'    // legacy single rotating concept (used when no unique bundle is mapped)
  | 'video'         // unique-bundle: Lifestyle video matching the pearl's topic
  | 'concept'       // unique-bundle: topic-matched concept (not day-rotation)
  | 'cta'           // mid-pearl referral/trading CTA (restored finfeed cards)
  | 'swipe'         // unique-bundle: 1-3 bullshit-swipe ads
  | 'scenario'      // unique-bundle: a specific Dilemma or Investment scenario
  | 'game';         // mini-game (legacy fallback only)

/** Per-pearl stable pick of which CTA card to show — trading / referral /
 *  whatsapp. Hash of moduleId so the same pearl always shows the same CTA,
 *  but pearls across a chapter rotate through all three destinations.
 *  WhatsApp was added 2026-06-01 as a 3rd option so the community nudge
 *  surfaces ~1-in-3 pearls instead of pushing it to every pearl. */
const CTA_ROTATION: ReadonlyArray<PearlCtaKind> = ['trading', 'referral', 'whatsapp'];
function pickCtaKindFor(moduleId: string): PearlCtaKind {
  let h = 0;
  for (let i = 0; i < moduleId.length; i++) h = (h * 31 + moduleId.charCodeAt(i)) | 0;
  return CTA_ROTATION[Math.abs(h) % CTA_ROTATION.length];
}

/** Which daily-content card the daily-pick stage should render today. The
 *  rotation is deterministic per UTC day so every user sees the same kind on
 *  the same date — same anchor as DAILY_CONCEPTS / wisdomQuotes. The mail
 *  variant is filtered out on days the user already opened it (see
 *  useFunStore.lastMailDate) so we don't spam-feel the user. */
type DailyPickKind = 'concept' | 'quote' | 'captain-mail';

function pickDailyContentKind(mailAlreadyShownToday: boolean): DailyPickKind {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const rotation: DailyPickKind[] = ['concept', 'quote', 'captain-mail'];
  const pick = rotation[dayIndex % rotation.length];
  // Captain mail gating: if the user already opened mail today, fall through
  // to concept (won't see the mail twice across multiple pearls in one day).
  if (pick === 'captain-mail' && mailAlreadyShownToday) return 'concept';
  return pick;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface StageDescriptor {
  kind: StageKind;
  index: number;
}

export function PearlSheet({ visible, pearl, onClose }: PearlSheetProps): React.ReactElement | null {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const markCompleted = usePearlsStore((s) => s.markCompleted);
  const { playSound } = useSoundEffect();

  // One-shot pearl tooltip. Shows the very first time a user enters ANY
  // pearl, anchoring "פנינה = תוכן בונוס, אפשר לדלג ולחזור" before they
  // form a wrong mental model (e.g. "is this a required module?"). Read at
  // render, marked seen on tap-"הבנתי". Persisted in useTutorialStore so a
  // cold start after first-pearl-seen never reshows it.
  const hasSeenPearlTooltip = useTutorialStore((s) => s.hasSeenPearlTooltip);
  const markPearlTooltipSeen = useTutorialStore((s) => s.markPearlTooltipSeen);
  // Local render gate. Snapshotted at sheet-open from the persisted flag so
  // tapping "הבנתי" (which flips the global flag) doesn't re-trigger on a
  // re-render. Stays true for the lifetime of THIS open instance until the
  // user explicitly dismisses it.
  const [showTooltip, setShowTooltip] = useState(false);

  // Per-render snapshot of profile completeness — drives whether we include
  // the profile-question stage at all. The Pearl asks ONLY if the user
  // didn't answer during the source module's Continue.
  const knowledgeLevelSet = useAuthStore((s) => Boolean(s.profile?.knowledgeLevel));
  const learningTimeSet = useAuthStore((s) => Boolean(s.profile?.learningTime));
  const dailyGoalSet = useAuthStore((s) => Boolean(s.profile?.dailyGoalMinutes));

  const profileQuestionSet = (kind: ProfileQuestionKind): boolean => {
    if (kind === 'knowledgeLevel') return knowledgeLevelSet;
    if (kind === 'learningTime') return learningTimeSet;
    if (kind === 'dailyGoal') return dailyGoalSet;
    return true;
  };

  // Pick the daily content kind once per sheet open — concept / quote / mail
  // rotation by UTC day, gated to once-per-day for mail so a user with 3
  // pearls in one day doesn't see the same envelope thrice.
  const lastMailDate = useFunStore((s) => s.lastMailDate);
  const dailyPickKind = useMemo<DailyPickKind>(
    () => pickDailyContentKind(lastMailDate === todayISO()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastMailDate, pearl?.afterModuleId],
  );

  // Stages list is derived from the pearl + profile-question gating. Computed
  // once per visible-open so the pager indices stay stable across re-renders.
  //
  // Flow (post-2026-05-30 redesign, tightened by audit):
  //   optional profile-question → daily-pick (ONE of concept/quote/mail) → game
  //
  // Earlier iteration had 5-6 stages (concept + quote + mail + video + game).
  // Audit consensus (7/10 agents) flagged the length as a drop-off cliff —
  // bonus contents should be ≤3 swipes. The lifestyle video was retired here
  // and the daily content is rotated, not stacked.
  // Stages are snapshotted in state (not useMemo) at the moment the sheet
  // becomes visible. If we recomputed on every render, answering a profile
  // question would flip its "*Set" flag, shrink the array from 3 → 2, and
  // the user's activePage cursor would now point at 'game' instead of
  // 'daily-pick' — silently skipping the daily content stage (QA 2026-05-31).
  // Snapshotting keeps the pager indices stable for the full pearl lifetime.
  const [stages, setStages] = useState<StageDescriptor[]>([]);

  const [activePage, setActivePage] = useState(0);
  // Drives the per-stage flying-coins animation (see below). Bumped after
  // every content-stage completion so a fresh <FlyingRewards/> instance
  // remounts and replays.
  const [flyingCoinsKey, setFlyingCoinsKey] = useState(0);
  const isPro = useIsPro();
  // Track open time so pearl_completed can carry time_to_complete_ms.
  // `performance.now()` works on web; the native shim returns Date.now()
  // — both are monotonic enough for "did this take 10s or 2 minutes" UX.
  const openedAtRef = useRef<number>(0);

  // Reset state on each open + emit pearl_opened. The lifestyle video stage
  // was retired in the 2026-05-30 audit (Pearl trimmed to 3 stages), so the
  // earlier `setVideo(pickNextLifestyleVideo(...))` is gone.
  //
  // `stages.length` is intentionally NOT in deps — answering the profile
  // question shortens the array mid-session; including it caused
  // `pearl_opened` to fire twice (audit P1). The `isPro` and `stages.length`
  // values get snapshotted via captureEvent at open-time, which is correct.
  useEffect(() => {
    if (visible && pearl) {
      // Snapshot the stages list ONCE per open. The profile-question
      // membership is decided based on the store's current state at this
      // instant, then frozen — answering it mid-pearl doesn't reshape the
      // array and so doesn't break the activePage cursor.
      const snapshot: StageDescriptor[] = [];
      let idx = 0;
      if (pearl.profileQuestion && !profileQuestionSet(pearl.profileQuestion)) {
        snapshot.push({ kind: 'profile-question', index: idx++ });
      }

      // Two flows:
      //   1. UNIQUE-BUNDLE — pearl has at least one mapped per-pearl content
      //      field (mod-0-2 and onward, per pearlContentMap). Render the
      //      curated Video → Concept → Swipe → Scenario sequence, only the
      //      stages that have an id.
      //   2. LEGACY — pearl has none of those fields (mod-0-1 + any
      //      unmapped pearl). Fall back to a single daily-pick stage so the
      //      pearl still has a beat of content before the game.
      const hasUniqueBundle = !!(pearl.videoId || pearl.conceptId || pearl.swipeIds?.length || pearl.swipeKind || pearl.scenarioId);
      if (hasUniqueBundle) {
        // Pearl flow: concept → video → swipe → scenario → game → CTA.
        //
        // Concept is FIRST because it's text-only (zero load latency) — the
        // user engages immediately while the video warmup effect below
        // primes the Vercel Blob CDN cache. By the time the user advances
        // past concept the video plays almost instantly.
        //
        // Video must NEVER be the first stage (user spec 2026-06-01) — the
        // warmup needs prior dwell time, and a black-frame opener is bad
        // UX. Enforced by gating video on `conceptId` being present.
        //
        // Swipe stage renders when EITHER `swipeKind` (myth/bull-bear/
        // bullshit) OR `swipeIds.length` (legacy bullshit-only bundles) is
        // set. Inside PearlSwipeStage a switch dispatches to the right
        // deck.
        //
        // CTA stays last (moved there 2026-05-31): the user gets all the
        // educational content + game climax first, then the referral/
        // trading nudge from a position of accumulated value. Wired with
        // onContinue=המשך, advancing to next module via the final-stage
        // branch of handleStageDone.
        if (pearl.conceptId) snapshot.push({ kind: 'concept', index: idx++ });
        if (pearl.videoId && pearl.conceptId) snapshot.push({ kind: 'video', index: idx++ });
        if (pearl.swipeKind || pearl.swipeIds?.length) snapshot.push({ kind: 'swipe', index: idx++ });
        if (pearl.scenarioId && pearl.scenarioPool) snapshot.push({ kind: 'scenario', index: idx++ });
        // Game stage adds value ONLY when its card type differs from the
        // scenario stage's card type — otherwise the same DilemmaCard /
        // InvestmentCard renders twice back-to-back. mod-0-1 and mod-1-6
        // both hit the dilemma+dilemma collision today; several chapter-3/4
        // pearls hit the investment+investment one. The guard is generic so
        // future data drift can't re-introduce the duplicate.
        const gameDuplicatesScenario =
          (pearl.scenarioPool === 'dilemma' && pearl.gameKey === 'dilemma') ||
          (pearl.scenarioPool === 'investment' && pearl.gameKey === 'investment');
        if (pearl.gameKey && !gameDuplicatesScenario) snapshot.push({ kind: 'game', index: idx++ });
        snapshot.push({ kind: 'cta', index: idx++ });
      } else {
        // Legacy fallback only used when nothing was mapped + no fallback
        // bundle (mod-0-1 historically; today every pearl gets a fallback).
        snapshot.push({ kind: 'daily-pick', index: idx++ });
        snapshot.push({ kind: 'game', index: idx++ });
      }
      setStages(snapshot);
      setActivePage(0);
      openedAtRef.current = Date.now();
      // First-pearl tooltip gate. Snapshot the persisted flag at open-time
      // so marking it seen mid-pearl doesn't flip the local render flag.
      // The user gets the tooltip exactly once across their lifetime.
      if (!hasSeenPearlTooltip) setShowTooltip(true);
      try {
        track({
          name: 'pearl_opened',
          props: {
            after_module_id: pearl.afterModuleId,
            next_module_id: pearl.nextModuleId,
            chapter_id: pearl.chapterId,
            game_key: pearl.gameKey,
            stages_count: snapshot.length,
            has_profile_question: !!pearl.profileQuestion,
            has_unique_bundle: hasUniqueBundle,
          },
        });
      } catch { /* non-fatal */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pearl]);

  // ── Video warmup ──────────────────────────────────────────────────────
  // The lifestyle video stage instantiates `useVideoPlayer` only when the
  // user swipes to it, which means the CDN fetch races the user's swipe.
  // On 4G that's ~1-2s of blank stage before the first frame. Kick off a
  // Range-fetch warmup the moment the sheet opens so the OS HTTP cache +
  // Vercel Blob edge are primed by the time the player mounts. Streaming-
  // friendly (no FileSystem persist), so we don't violate the lifestyle-
  // video "no disk persist" guarantee.
  useEffect(() => {
    if (!visible || !pearl?.videoId) return;
    const video = LIFESTYLE_VIDEOS.find((v) => v.id === pearl.videoId);
    if (video?.videoUri) prefetchStreamingVideo(video.videoUri);
  }, [visible, pearl?.videoId]);

  // Wrapped close: emits pearl_dismissed when the user bails before the
  // last stage. pearl_completed fires from handleStageDone in that case,
  // so we only emit dismissed when we know they HAVEN'T finished.
  const handleDismiss = useCallback(() => {
    if (pearl && activePage < stages.length) {
      const currentStage = stages[activePage];
      try {
        track({
          name: 'pearl_dismissed',
          props: {
            after_module_id: pearl.afterModuleId,
            chapter_id: pearl.chapterId,
            stage_kind: currentStage?.kind,
            stage_index: activePage,
            stages_count: stages.length,
            time_open_ms: openedAtRef.current ? Date.now() - openedAtRef.current : undefined,
          },
        });
      } catch { /* non-fatal */ }
    }
    onClose();
  }, [pearl, activePage, stages, onClose]);

  // Android back: close gracefully + emit dismiss.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleDismiss]);

  // Direct state-driven advance — no FlatList, no scrolling, no pager
  // closures. Earlier we used a horizontal `inverted` FlatList for swipe
  // navigation between stages, but every advance attempt (scrollToIndex /
  // scrollToOffset) silently no-op'd on this RN version and the user got
  // stuck staring at the same stage with a disabled CTA. Rendering only
  // the current stage from `activePage` makes the "advance" deterministic
  // and removes every scroll-related bug at once. Users lose the ability
  // to swipe back; they keep the buttons to advance, the X to exit, and
  // the in-stage "Continue" CTAs.
  const goToPage = useCallback((index: number) => {
    setActivePage(index);
  }, []);

  const handleStageDone = useCallback(() => {
    if (!pearl) return;
    const completedStage = stages[activePage];
    try {
      track({
        name: 'pearl_stage_completed',
        props: {
          after_module_id: pearl.afterModuleId,
          stage_kind: completedStage?.kind ?? 'unknown',
          stage_index: activePage,
          stages_count: stages.length,
        },
      });
    } catch { /* non-fatal */ }

    // Streak-tick fires once the user clears their FIRST real content stage
    // (engaged with content), not just at final completion. Without this, a
    // user who drops mid-game still made the pearl their daily activity but
    // loses the streak. The helper is idempotent per-day so the final-stage
    // completion below safely fires it again.
    //
    // Index-based detection so the tick stays correct regardless of which
    // content stage happens to be first. After the concept↔video reorder
    // (2026-06-01) the first content kind is 'concept' for full bundles,
    // 'video' / 'swipe' / 'scenario' for partial bundles — the index
    // lookup handles them all. Legacy 'daily-pick' is still tagged
    // explicitly because it lives in its own snapshot shape.
    const firstContentIdx = stages.findIndex((s) => s.kind !== 'profile-question');
    const isFirstContentStage = firstContentIdx >= 0 && activePage === firstContentIdx;
    if (completedStage?.kind === 'daily-pick' || isFirstContentStage) {
      markDailyActivityCompleted();
    }

    // Per-stage payout — grant a small XP + coin chunk for every content
    // stage the user clears (excludes 'cta' and 'profile-question' since
    // those are skippable / non-content stages). Fires the flying-coins
    // animation right then so the reward lands DURING the pearl, not at the
    // very end. Total across 4 content stages ≈ the legacy one-shot payout.
    const isRewardedStage =
      completedStage?.kind === 'video' ||
      completedStage?.kind === 'concept' ||
      completedStage?.kind === 'swipe' ||
      completedStage?.kind === 'scenario' ||
      completedStage?.kind === 'daily-pick' ||
      completedStage?.kind === 'game';
    if (isRewardedStage) {
      try {
        useEconomyUIStore.getState().addXP(PEARL_PER_STAGE_XP, 'challenge_complete');
        useEconomyUIStore.getState().addCoins(PEARL_PER_STAGE_COINS, 'daily-quest');
      } catch { /* non-fatal */ }
      setFlyingCoinsKey((k) => k + 1);
    }

    const nextIdx = activePage + 1;
    if (nextIdx < stages.length) {
      goToPage(nextIdx);
      return;
    }
    // Final stage — mark the pearl complete, grant XP + coins, close the
    // sheet, and push the user into the next module's lesson. The map will
    // show the pearl as completed when the user returns to it.
    try {
      track({
        name: 'pearl_completed',
        props: {
          after_module_id: pearl.afterModuleId,
          next_module_id: pearl.nextModuleId,
          chapter_id: pearl.chapterId,
          stages_count: stages.length,
          time_to_complete_ms: openedAtRef.current ? Date.now() - openedAtRef.current : undefined,
        },
      });
    } catch { /* non-fatal */ }
    // No additional final payout — the per-stage chunks above already
    // distributed the total over the course of the pearl. The equivalent
    // sum now lives in `PEARL_PER_STAGE_*` and is granted as the user
    // progresses, not at the end.
    markCompleted(pearlIdFor(pearl));
    onClose();
    // Push, not replace — keeps the map underneath so the back stack works
    // naturally if the user backs out of the lesson without finishing.
    router.push(`/lesson/${pearl.nextModuleId}?chapterId=${pearl.chapterId}` as never);
  }, [pearl, activePage, stages, goToPage, markCompleted, onClose, router]);

  const renderStage = useCallback(
    (item: StageDescriptor) => {
      // Always isActive — only the current stage is rendered now.
      const isActive = true;
      const containerStyle = { flex: 1 };

      if (!pearl) return <View style={containerStyle} />;

      if (item.kind === 'profile-question' && pearl.profileQuestion) {
        return (
          <View style={containerStyle}>
            <PearlProfileQuestionStage
              isActive={isActive}
              kind={pearl.profileQuestion}
              onDone={handleStageDone}
            />
          </View>
        );
      }

      // ─ Unique-bundle stages (mod-0-2 onward) ─
      if (item.kind === 'video' && pearl.videoId) {
        // Resolve videoId → LifestyleVideoSpec. If id is bad (e.g., typo in
        // the map) we skip the stage to keep the pearl from rendering a
        // black frame.
        const video = LIFESTYLE_VIDEOS.find((v) => v.id === pearl.videoId);
        if (!video) {
          // Auto-advance silently so the pager doesn't trap the user.
          handleStageDone();
          return <View style={containerStyle} />;
        }
        return (
          <View style={containerStyle}>
            <PearlVideoStage isActive={isActive} video={video} onContinue={handleStageDone} />
          </View>
        );
      }
      if (item.kind === 'concept') {
        return (
          <View style={containerStyle}>
            <PearlDailyConceptStage
              isActive={isActive}
              conceptId={pearl.conceptId}
              onContinue={handleStageDone}
            />
          </View>
        );
      }
      if (item.kind === 'cta') {
        return (
          <View style={containerStyle}>
            <PearlCtaStage
              isActive={isActive}
              kind={pickCtaKindFor(pearl.afterModuleId)}
              afterModuleId={pearl.afterModuleId}
              chapterId={pearl.chapterId}
              onContinue={handleStageDone}
            />
          </View>
        );
      }
      if (item.kind === 'swipe' && (pearl.swipeKind || pearl.swipeIds?.length)) {
        return (
          <View style={containerStyle}>
            <PearlSwipeStage
              isActive={isActive}
              swipeKind={pearl.swipeKind}
              swipeIds={pearl.swipeIds}
              onContinue={handleStageDone}
            />
          </View>
        );
      }
      if (item.kind === 'scenario' && pearl.scenarioId && pearl.scenarioPool) {
        return (
          <View style={containerStyle}>
            <PearlScenarioStage
              isActive={isActive}
              scenarioId={pearl.scenarioId}
              scenarioPool={pearl.scenarioPool}
              onContinue={handleStageDone}
            />
          </View>
        );
      }

      // ─ Legacy single daily-pick (used only when no unique bundle exists) ─
      if (item.kind === 'daily-pick') {
        // Render today's chosen daily-content sub-card. The rotation already
        // gates mail to once-per-day; concept/quote rotate as fallback.
        if (dailyPickKind === 'concept') {
          return (
            <View style={containerStyle}>
              <PearlDailyConceptStage isActive={isActive} onContinue={handleStageDone} />
            </View>
          );
        }
        if (dailyPickKind === 'quote') {
          return (
            <View style={containerStyle}>
              <PearlDailyQuoteStage isActive={isActive} onContinue={handleStageDone} />
            </View>
          );
        }
        return (
          <View style={containerStyle}>
            <PearlCaptainMailStage isActive={isActive} onContinue={handleStageDone} />
          </View>
        );
      }
      if (item.kind === 'game') {
        return (
          <View style={containerStyle}>
            {/* No onExit — the PearlSheet's own X in the topBar is the single
                exit point. Passing onExit here would add a SECOND X overlay
                on top of the game card (user report 2026-05-31: "double X"). */}
            <PearlGameStage
              isActive={isActive}
              gameKey={pearl.gameKey}
              macroEventId={pearl.macroEventId}
              onContinue={handleStageDone}
            />
          </View>
        );
      }
      return <View style={containerStyle} />;
    },
    [pearl, dailyPickKind, handleStageDone, handleDismiss],
  );

  if (!visible || !pearl) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* GestureHandlerRootView wrap is REQUIRED here. React Native's <Modal>
          mounts in a separate native window, and the app-level
          GestureHandlerRootView in app/_layout.tsx does NOT extend into it.
          Without this wrap, Gesture.Pan() detectors inside stages (e.g.
          PearlSwipeStage → BullshitSwipeCard) silently never receive events —
          the swipe stops working in pearls while tap-Pressables still work.
          Mirrors the pattern in DoubleOrNothingModal / DiamondHandsModal. */}
      {/* Top inset applied explicitly via the inset hook instead of via
          <SafeAreaView edges={['top']}> — inside a Modal the
          SafeAreaProvider from app/_layout.tsx does not always propagate
          to the new native window, so SafeAreaView read zero on iOS and
          the GlobalWealthHeader rendered behind the notch / status bar
          (user report 2026-06-01: "בפנינה הוא חורג מהחלק העליון של המסך").
          Reading insets at the hook level is reliable because the JS
          context is the same as the parent app. */}
      <GestureHandlerRootView style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#f8fafc' }}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Full GlobalWealthHeader (not compact) — matches the main tabs
            layout exactly so the pearl feels like a continuation of the
            app, not a stripped-down modal. User report 2026-05-31: compact
            mode was hiding pieces they expected to see. */}
        <GlobalWealthHeader />

        {/* Pearl topper. Title row + progress bar + close chevron, all
            sitting in their own dedicated band BELOW the GlobalWealthHeader.
            Earlier the chevron used position:absolute with top:4 right:10,
            which dropped it on top of the main app topbar (next to the
            coins/diamonds chips) instead of staying inside the pearl's own
            topper (user screenshot 2026-06-02). Folding the chevron back
            into the topper row anchors it visually to the pearl scope
            where it belongs, and the row position (after the
            GlobalWealthHeader) keeps it from ever colliding with the
            main-app icons. The chevron uses a soft background ring so it
            reads as a pearl-scoped affordance, not a main-tab icon. */}
        <View style={styles.topBar}>
          {/* SheetCloseButton (2026-06-02), unified gold-ring shape across
              all sheets. We pass a ChevronRight icon (not the default X)
              because the Pearl is mid-flow content, not a modal to abort,
              the chevron reads as "back to the learning map" which is
              what the route does. The ring + size + soft fill stay
              identical to DailyNewsChallengeSheet so the affordance feels
              like one family. */}
          <SheetCloseButton
            onPress={() => {
              playSound('btn_click_soft_1');
              handleDismiss();
              router.replace('/(tabs)/index' as never);
            }}
            accessibilityLabel="חזרה למסך הלמידה"
            style={styles.closeBtn}
            icon={<ChevronRight size={22} color={STITCH.onSurface} strokeWidth={2.6} />}
          />
          <View style={styles.titleWrap}>
            <Text style={styles.title} allowFontScaling={false}>פנינה</Text>
            <PearlProgressBar total={stages.length} current={activePage} />
          </View>
        </View>

        <Animated.View
          key={`stage-${activePage}`}
          entering={FadeIn.duration(180)}
          style={styles.pagerWrap}
        >
          {stages[activePage] ? renderStage(stages[activePage]) : null}
        </Animated.View>

        {/* Pearl footer skip button was removed 2026-06-02 per user decision.
            The pearl is optional but the exit path is the chevron in the
            topper, not a redundant footer CTA. Single exit = clearer mental
            model; aligns with Duolingo Stories pattern (one X, no dual exits).
            The in-stage "הבנתי" CTA stays as the forward action. */}

        {/* Per-stage flying-coins animation. Key changes each time a content
            stage completes (bumped from handleStageDone) so the FlyingRewards
            component remounts and replays. pointerEvents 'none' so the
            falling particles never block the next stage's UI. */}
        {flyingCoinsKey > 0 ? (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <FlyingRewards
              key={flyingCoinsKey}
              type="coins"
              amount={PEARL_PER_STAGE_COINS}
              onComplete={() => {/* particles self-clean; nothing to do */}}
            />
          </View>
        ) : null}

        {/* First-pearl tooltip overlay. Renders ONCE per lifetime, scoped to
            the very first pearl the user ever enters. Anchors mental model
            "pearl equals bonus, optional, returnable" before they assume
            it's a blocking module. Backdrop is non-blocking (pointerEvents
            on the bubble only) so the user can still tap content underneath
            after dismissing. Position: just below the topper, arrow
            pointing UP toward the pearl title so the eye travels topper to
            tooltip to CTA. */}
        {showTooltip ? (
          <View style={styles.tooltipOverlay} pointerEvents="box-none">
            <View style={styles.tooltipBubble}>
              <View style={styles.tooltipArrow} />
              <Text style={styles.tooltipText} allowFontScaling={false}>
                פנינה ← תוכן בונוס, אפשר לדלג ולחזור מתי שבא לך
              </Text>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  playSound('btn_click_soft_1');
                  markPearlTooltipSeen();
                  setShowTooltip(false);
                }}
                style={({ pressed }) => [styles.tooltipBtn, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel="הבנתי, סגור את ההסבר"
                hitSlop={10}
              >
                <Text style={styles.tooltipBtnText} allowFontScaling={false}>קח אותי לפנינה ←</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    // Position:relative so the absolutely-positioned closeBtn anchors to
    // THIS topper (the pearl's own header band) and not to the SafeAreaView
    // above the GlobalWealthHeader. Without this anchor the chevron would
    // float into the main app topbar (bug screenshot 2026-06-02).
    position: 'relative',
  },
  closeBtn: {
    // Positioning only, the visual chrome (size, gold ring, fill) now
    // lives inside SheetCloseButton. Anchored inside the pearl topper
    // itself (relative parent above), so the chevron sits next to the
    // title/progress bar inside the pearl scope. The earlier top:4/right:10
    // anchored to the screen-level SafeAreaView and so landed on top of
    // the GlobalWealthHeader chips.
    position: 'absolute',
    top: 6,
    right: 12,
    zIndex: 10,
  },
  titleWrap: { width: '100%', alignItems: 'center', gap: 8 },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  pagerWrap: { flex: 1 },
  // First-pearl tooltip. Renders once, dismissed on tap. Backdrop is
  // pointerEvents:box-none so the tooltip captures taps but the rest of
  // the screen stays interactive (the user can still tap a stage CTA
  // through the gap and the tooltip will dismiss along its own button).
  tooltipOverlay: {
    position: 'absolute',
    top: 110,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 50,
  },
  tooltipBubble: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: 320,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  tooltipArrow: {
    // Triangle pointing UP toward the topper. Achieved with the classic RN
    // border-trick: zero-width view with bottom border colored as the
    // bubble + transparent left/right borders for the V shape.
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0F172A',
  },
  tooltipText: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl' as const,
    lineHeight: 19,
  },
  tooltipBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#22D3EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tooltipBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl' as const,
  },
});
