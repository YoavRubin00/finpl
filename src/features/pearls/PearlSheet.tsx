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
import { X } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { captureEvent } from '../../lib/posthog';
import { useAuthStore } from '../auth/useAuthStore';
import { useIsPro } from '../subscription/useSubscription';
import { GlobalWealthHeader } from '../../components/ui/GlobalWealthHeader';
import type { ProfileQuestionKind } from '../onboarding/InModuleProfileQuestion';

import { usePearlsStore } from './usePearlsStore';
import { pearlIdFor, type PearlContent } from './pearlConfig';
import { PearlProgressBar } from './PearlProgressBar';
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
import { FlyingRewards } from '../../components/ui/FlyingRewards';

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
  | 'swipe'         // unique-bundle: 1-3 bullshit-swipe ads
  | 'scenario'      // unique-bundle: a specific Dilemma or Investment scenario
  | 'game';         // mini-game (legacy fallback only)

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
      const hasUniqueBundle = !!(pearl.videoId || pearl.conceptId || pearl.swipeIds?.length || pearl.scenarioId);
      if (hasUniqueBundle) {
        // 4 curated content items per pearl: video → concept → swipe → scenario.
        // The mid-pearl CTA stage was rolled back — we'll re-introduce it
        // using the old finfeed CTA components (FeedReferralNudgeCard etc.,
        // restorable from git commit 539a582) rather than the placeholder
        // CTA I had built. Tracked as a follow-up.
        if (pearl.videoId) snapshot.push({ kind: 'video', index: idx++ });
        if (pearl.conceptId) snapshot.push({ kind: 'concept', index: idx++ });
        if (pearl.swipeIds?.length) snapshot.push({ kind: 'swipe', index: idx++ });
        if (pearl.scenarioId && pearl.scenarioPool) snapshot.push({ kind: 'scenario', index: idx++ });
      } else {
        // Legacy fallback only used when nothing was mapped + no fallback
        // bundle (mod-0-1 historically; today every pearl gets a fallback).
        snapshot.push({ kind: 'daily-pick', index: idx++ });
        snapshot.push({ kind: 'game', index: idx++ });
      }
      setStages(snapshot);
      setActivePage(0);
      openedAtRef.current = Date.now();
      try {
        captureEvent('pearl_opened', {
          after_module_id: pearl.afterModuleId,
          next_module_id: pearl.nextModuleId,
          chapter_id: pearl.chapterId,
          game_key: pearl.gameKey,
          stages_count: snapshot.length,
          has_profile_question: !!pearl.profileQuestion,
          has_unique_bundle: hasUniqueBundle,
          is_pro: isPro,
        });
      } catch { /* non-fatal */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pearl]);

  // Wrapped close: emits pearl_dismissed when the user bails before the
  // last stage. pearl_completed fires from handleStageDone in that case,
  // so we only emit dismissed when we know they HAVEN'T finished.
  const handleDismiss = useCallback(() => {
    if (pearl && activePage < stages.length) {
      const currentStage = stages[activePage];
      try {
        captureEvent('pearl_dismissed', {
          after_module_id: pearl.afterModuleId,
          chapter_id: pearl.chapterId,
          stage_kind: currentStage?.kind,
          stage_index: activePage,
          stages_count: stages.length,
          time_open_ms: openedAtRef.current ? Date.now() - openedAtRef.current : null,
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
      captureEvent('pearl_stage_completed', {
        after_module_id: pearl.afterModuleId,
        stage_kind: completedStage?.kind,
        stage_index: activePage,
        stages_count: stages.length,
      });
    } catch { /* non-fatal */ }

    // Streak-tick fires once the user clears their FIRST real content stage
    // (engaged with content), not just at final completion. Without this, a
    // user who drops mid-game still made the pearl their daily activity but
    // loses the streak. The helper is idempotent per-day so the final-stage
    // completion below safely fires it again. Both legacy ('daily-pick') and
    // unique-bundle ('video' as the first content stage) trigger the tick.
    if (
      completedStage?.kind === 'daily-pick' ||
      completedStage?.kind === 'video' ||
      // Bundle without a video starts with concept — still counts as content.
      (completedStage?.kind === 'concept' && !stages.some((s) => s.kind === 'video'))
    ) {
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
      captureEvent('pearl_completed', {
        after_module_id: pearl.afterModuleId,
        next_module_id: pearl.nextModuleId,
        chapter_id: pearl.chapterId,
        game_key: pearl.gameKey,
        stages_count: stages.length,
        time_to_complete_ms: openedAtRef.current ? Date.now() - openedAtRef.current : null,
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
      if (item.kind === 'swipe' && pearl.swipeIds?.length) {
        return (
          <View style={containerStyle}>
            <PearlSwipeStage
              isActive={isActive}
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Full GlobalWealthHeader (not compact) — matches the main tabs
            layout exactly so the pearl feels like a continuation of the
            app, not a stripped-down modal. User report 2026-05-31: compact
            mode was hiding pieces they expected to see. */}
        <GlobalWealthHeader />

        <View style={styles.topBar}>
          <Pressable
            onPress={() => { tapHaptic(); handleDismiss(); }}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="סגור פנינה"
            hitSlop={10}
          >
            <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.titleWrap}>
            <Text style={styles.title} allowFontScaling={false}>פנינה</Text>
            <PearlProgressBar total={stages.length} current={activePage} />
          </View>

          {/* Right-side spacer balancing the close button so the title stays centered. */}
          <View style={styles.spacer} />
        </View>

        <Animated.View
          key={`stage-${activePage}`}
          entering={FadeIn.duration(180)}
          style={styles.pagerWrap}
        >
          {stages[activePage] ? renderStage(stages[activePage]) : null}
        </Animated.View>

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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, alignItems: 'center', gap: 6 },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  spacer: { width: 36 },
  pagerWrap: { flex: 1 },
});
