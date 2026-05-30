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
  FlatList,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
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
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useFunStore } from '../../stores/useFunStore';
import { markDailyActivityCompleted } from '../economy/useStreak';

const SCREEN_W = Dimensions.get('window').width;

/** Pearl completion payout — anchored to Brawl Pass tier-1 yield (small,
 *  not a free meal). The pre-audit state granted ZERO and the bonus felt
 *  like a sink-with-no-source; this restores the source side. */
const PEARL_COMPLETE_XP = 25;
const PEARL_COMPLETE_COINS = 50;

interface PearlSheetProps {
  visible: boolean;
  pearl: PearlContent | null;
  onClose: () => void;
}

type StageKind = 'profile-question' | 'daily-pick' | 'game';

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
  const stages = useMemo<StageDescriptor[]>(() => {
    if (!pearl) return [];
    const list: StageDescriptor[] = [];
    let idx = 0;
    if (pearl.profileQuestion && !profileQuestionSet(pearl.profileQuestion)) {
      list.push({ kind: 'profile-question', index: idx++ });
    }
    list.push({ kind: 'daily-pick', index: idx++ });
    list.push({ kind: 'game', index: idx++ });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pearl?.afterModuleId, knowledgeLevelSet, learningTimeSet, dailyGoalSet]);

  const [activePage, setActivePage] = useState(0);
  const listRef = useRef<FlatList<StageDescriptor> | null>(null);
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
      setActivePage(0);
      openedAtRef.current = Date.now();
      try {
        captureEvent('pearl_opened', {
          after_module_id: pearl.afterModuleId,
          next_module_id: pearl.nextModuleId,
          chapter_id: pearl.chapterId,
          game_key: pearl.gameKey,
          stages_count: stages.length,
          has_profile_question: !!pearl.profileQuestion,
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

  const goToPage = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
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

    // Streak-tick fires once the user clears the daily-pick stage (engaged
    // with content), not just at final completion. Without this, a user who
    // drops mid-game still made the pearl their daily activity but loses
    // the streak. The helper is idempotent per-day so the final-stage
    // completion below safely fires it again.
    if (completedStage?.kind === 'daily-pick') {
      markDailyActivityCompleted();
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
    // Pearl payout — small but real, matching Brawl Pass tier-1 yield. Zero
    // payout (the pre-audit state) felt like a sink with no source and made
    // the bonus skip-by-default after a few sessions.
    try {
      useEconomyUIStore.getState().addXP(PEARL_COMPLETE_XP, 'challenge_complete');
      useEconomyUIStore.getState().addCoins(PEARL_COMPLETE_COINS, 'daily-quest');
    } catch { /* non-fatal */ }
    markCompleted(pearlIdFor(pearl));
    onClose();
    // Push, not replace — keeps the map underneath so the back stack works
    // naturally if the user backs out of the lesson without finishing.
    router.push(`/lesson/${pearl.nextModuleId}?chapterId=${pearl.chapterId}` as never);
  }, [pearl, activePage, stages, goToPage, markCompleted, onClose, router]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      if (idx !== activePage) setActivePage(idx);
    },
    [activePage],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setActivePage(first.index);
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderPage = useCallback(
    ({ item }: { item: StageDescriptor }) => {
      const isActive = item.index === activePage;
      const containerStyle = { width: SCREEN_W, flex: 1 };

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
            <PearlGameStage
              isActive={isActive}
              gameKey={pearl.gameKey}
              onContinue={handleStageDone}
            />
          </View>
        );
      }
      return <View style={containerStyle} />;
    },
    [pearl, dailyPickKind, activePage, handleStageDone],
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
        <GlobalWealthHeader compact />

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

        <Animated.View entering={FadeIn.duration(220)} style={styles.pagerWrap}>
          <FlatList
            ref={listRef}
            data={stages}
            keyExtractor={(s) => `${s.kind}-${s.index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            renderItem={renderPage}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: SCREEN_W,
              offset: SCREEN_W * index,
              index,
            })}
            // RTL: swipe right→left advances forward (matches Hebrew reading).
            inverted
          />
        </Animated.View>
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
