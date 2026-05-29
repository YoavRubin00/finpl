import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  BackHandler,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { ChevronRight, Newspaper, Flame, Sparkles, Gift } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';
import { captureEvent } from '../../lib/posthog';

import { NewsItemView } from './components/NewsItemView';
import { InteractiveQuestion } from './components/InteractiveQuestion';
import { CompletionChests } from './components/CompletionChests';
import { ItemChatOverlay } from './components/ItemChatOverlay';
import { fetchTodayChallenge } from './dailyNewsChallengeApi';
import { useDailyNewsChallengeStore } from './useDailyNewsChallengeStore';
import type { ChallengeItem } from './types';

interface DailyNewsChallengeSheetProps {
  visible: boolean;
  onClose: () => void;
}

const ACCENT = STITCH.primary; // #005bb1 — user-selected
const RIBBON_PRIMARY = STITCH.tertiaryGoldBright; // item #1 ribbon
const RIBBON_SECONDARY = STITCH.primaryCyan; // item #2 ribbon

// ─────────────────────────── Sub-components

/** Skeleton placeholder shown while the daily challenge is fetched. */
function SkeletonItemCard({ delay = 0 }: { delay?: number }): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const shimmer = useSharedValue(0.4);
  useEffect(() => {
    if (reducedMotion) {
      shimmer.value = 0.55;
      return;
    }
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 900 }),
        withTiming(0.4, { duration: 900 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [reducedMotion, shimmer]);
  const blockStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View entering={FadeIn.delay(delay).duration(220)} style={styles.itemCard}>
      <Animated.View style={[skeleton.image, blockStyle]} />
      <Animated.View style={[skeleton.line, blockStyle, { width: '90%' }]} />
      <Animated.View style={[skeleton.line, blockStyle, { width: '70%' }]} />
      <Animated.View style={[skeleton.lineSm, blockStyle, { width: '100%' }]} />
      <Animated.View style={[skeleton.lineSm, blockStyle, { width: '85%' }]} />
    </Animated.View>
  );
}

/** Two-button confirm modal — mirrors LessonFlowScreen's exit guard. */
function ExitConfirmModal({
  visible,
  onStay,
  onLeave,
}: {
  visible: boolean;
  onStay: () => void;
  onLeave: () => void;
}): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStay}
      accessibilityViewIsModal
    >
      <View style={confirm.overlay}>
        <View style={confirm.card}>
          <Text style={confirm.title} accessibilityRole="header">
            לעזוב עכשיו?
          </Text>
          <Text style={confirm.body}>
            התשובות שלך נשמרות אוטומטית — תוכל לחזור ולסיים אחר כך היום.
          </Text>
          <View style={confirm.btnRow}>
            <Pressable
              onPress={() => { tapHaptic(); onLeave(); }}
              style={[confirm.btn, confirm.btnGhost]}
              accessibilityRole="button"
              accessibilityLabel="עזוב את האתגר"
            >
              <Text style={confirm.btnGhostText}>צא</Text>
            </Pressable>
            <Pressable
              onPress={() => { tapHaptic(); onStay(); }}
              style={[confirm.btn, confirm.btnPrimary]}
              accessibilityRole="button"
              accessibilityLabel="המשך באתגר"
            >
              <Text style={confirm.btnPrimaryText}>המשך</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────── Main sheet

/**
 * Full-screen Daily News Challenge experience.
 *
 * Layout matches the rest of the learning screens (ToolHeader pattern: back
 * button on the right in RTL, calm surface, no dark backdrop). Body is two
 * news-item cards with a side-ribbon for visual rhythm, a progress bar +
 * counter at the top, a chest "anticipation teaser" toast after the first
 * answer, and a streak celebration toast on entry.
 */
export function DailyNewsChallengeSheet({ visible, onClose }: DailyNewsChallengeSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const challenge = useDailyNewsChallengeStore((s) => s.todayChallenge);
  const answered = useDailyNewsChallengeStore((s) => s.answered);
  const regularChestOpened = useDailyNewsChallengeStore((s) => s.regularChestOpened);
  const proChestOpened = useDailyNewsChallengeStore((s) => s.proChestOpened);
  const streak = useDailyNewsChallengeStore((s) => s.streak);
  const setChallenge = useDailyNewsChallengeStore((s) => s.setTodayChallenge);
  const recordAnswer = useDailyNewsChallengeStore((s) => s.recordAnswer);
  const claimRegular = useDailyNewsChallengeStore((s) => s.claimRegularChest);
  const claimPro = useDailyNewsChallengeStore((s) => s.claimProChest);

  const isPro = useSubscriptionStore((s) => s.isPro());
  const showUpgrade = useUpgradeModalStore((s) => s.show);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatItem, setChatItem] = useState<ChallengeItem | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [streakToastVisible, setStreakToastVisible] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const streakToastShownRef = useRef(false);
  const chestAnticipationOffsetRef = useRef<number>(0);

  const item0Answered = answered[0] !== null;
  const item1Answered = answered[1] !== null;
  const bothAnswered = item0Answered && item1Answered;
  const answeredCount = (item0Answered ? 1 : 0) + (item1Answered ? 1 : 0);
  const inProgress = !bothAnswered && (item0Answered || item1Answered);

  // ── Lazy load on first open (or when no cached payload)
  useEffect(() => {
    if (!visible) return;
    if (challenge) return;
    setLoading(true);
    setError(null);
    fetchTodayChallenge()
      .then((data) => {
        setChallenge(data);
        setError(null);
      })
      .catch((err) => {
        console.error('[DailyNewsChallenge] fetch failed', err);
        setError('לא הצלחנו להוריד את האקטואליה הפיננסית. נסה שוב.');
      })
      .finally(() => setLoading(false));
  }, [visible, challenge, setChallenge]);

  // ── viewed event
  useEffect(() => {
    if (visible && challenge) {
      captureEvent('news_challenge_viewed', { date_key: challenge.dateKey });
    }
  }, [visible, challenge]);

  // ── completed event (one-shot per session, on second-answer landing)
  useEffect(() => {
    if (answered[0] && answered[1]) {
      captureEvent('news_challenge_completed', {
        date_key: challenge?.dateKey ?? null,
        both_correct: answered[0].wasCorrect && answered[1].wasCorrect,
      });
      // Auto-scroll to the chests so the reward is in view immediately.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: chestAnticipationOffsetRef.current + 300, animated: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered[0]?.answeredAt, answered[1]?.answeredAt]);

  // ── Streak celebration toast on entry (once per open, streak ≥ 3, not yet completed today)
  useEffect(() => {
    if (!visible || streakToastShownRef.current) return;
    if (streak < 3 || bothAnswered) return;
    streakToastShownRef.current = true;
    setStreakToastVisible(true);
    const t = setTimeout(() => setStreakToastVisible(false), 2800);
    return () => clearTimeout(t);
  }, [visible, streak, bothAnswered]);

  // Reset the one-shot guard when the sheet closes so it can fire again next open.
  useEffect(() => {
    if (!visible) {
      streakToastShownRef.current = false;
      setStreakToastVisible(false);
    }
  }, [visible]);

  // ── Hardware back (Android) — route through the same guard
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, inProgress]);

  // ── Web ESC key — same guard. window/KeyboardEvent aren't in RN's TS lib;
  // narrow via Platform check and reach for them through globalThis.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const w = (globalThis as unknown as { window?: { addEventListener: (t: string, h: (e: { key: string; preventDefault: () => void }) => void) => void; removeEventListener: (t: string, h: (e: { key: string; preventDefault: () => void }) => void) => void } }).window;
    if (!w) return;
    const handler = (e: { key: string; preventDefault: () => void }) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    w.addEventListener('keydown', handler);
    return () => w.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, inProgress]);

  const handleAnswer = useCallback(
    (itemIdx: 0 | 1) => (selectedIdx: number, wasCorrect: boolean) => {
      recordAnswer(itemIdx, selectedIdx, wasCorrect);
      captureEvent('news_challenge_question_answered', {
        item_idx: itemIdx,
        was_correct: wasCorrect,
        date_key: challenge?.dateKey ?? null,
      });
    },
    [recordAnswer, challenge?.dateKey],
  );

  const handleOpenChat = useCallback((item: ChallengeItem) => {
    setChatItem(item);
    captureEvent('news_challenge_chat_opened', {
      source: item.source,
      date_key: challenge?.dateKey ?? null,
    });
  }, [challenge?.dateKey]);

  const handleUpgrade = useCallback(() => {
    onClose();
    showUpgrade('breaking-news');
  }, [onClose, showUpgrade]);

  /** Single source of truth for "user wants to close" — guarded if mid-flight. */
  const requestClose = useCallback(() => {
    if (inProgress) {
      setExitConfirmOpen(true);
      return;
    }
    onClose();
  }, [inProgress, onClose]);

  const confirmLeave = useCallback(() => {
    setExitConfirmOpen(false);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  // ── Render

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ── Header: back-right (RTL), title+icon center-right, streak chip left ── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => { tapHaptic(); requestClose(); }}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="חזרה למסך הלמידה"
            hitSlop={8}
          >
            <ChevronRight size={22} color={ACCENT} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.headerIconWrap}>
            <Newspaper size={20} color={ACCENT} strokeWidth={2.4} />
          </View>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1} allowFontScaling={false}>
              אקטואליה פיננסית
            </Text>
            {challenge?.heroTitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1} allowFontScaling={false}>
                {challenge.heroTitle}
              </Text>
            ) : null}
          </View>

          {streak > 0 ? (
            <View style={styles.headerStreakPill} accessibilityLabel={`רצף יומי ${streak}`}>
              <View style={{ width: 22, height: 22 }} accessible={false}>
                <LottieView
                  source={require('../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
                  style={{ width: 22, height: 22 }}
                  autoPlay
                  loop
                />
              </View>
              <Text style={styles.headerStreakText} allowFontScaling={false}>{streak}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Progress: counter chip + thin bar ── */}
        <View style={styles.progressRow}>
          <View style={[
            styles.progressChip,
            bothAnswered ? styles.progressChipDone : null,
          ]}>
            <Text style={[
              styles.progressChipText,
              bothAnswered ? styles.progressChipTextDone : null,
            ]} allowFontScaling={false}>
              {bothAnswered ? '✓ הושלם' : `${answeredCount} / 2 שאלות`}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${(answeredCount / 2) * 100}%`,
                backgroundColor: bothAnswered ? '#22c55e' : ACCENT,
              },
            ]}
          />
        </View>

        {/* ── Body ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading && !challenge ? (
            <>
              <SkeletonItemCard delay={0} />
              <View style={{ height: 20 }} />
              <SkeletonItemCard delay={120} />
            </>
          ) : null}

          {error && !challenge ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>
            </View>
          ) : null}

          {challenge ? (
            <>
              {/* Item 1 — gold ribbon */}
              <ItemCard
                index={0}
                ribbonColor={RIBBON_PRIMARY}
                item={challenge.items[0]}
                preAnsweredIdx={answered[0]?.selectedIdx}
                onAnswered={handleAnswer(0)}
                onOpenChat={() => handleOpenChat(challenge.items[0])}
                enterDelay={0}
              />

              <View style={{ height: 20 }} />

              {/* Item 2 — cyan ribbon */}
              <ItemCard
                index={1}
                ribbonColor={RIBBON_SECONDARY}
                item={challenge.items[1]}
                preAnsweredIdx={answered[1]?.selectedIdx}
                onAnswered={handleAnswer(1)}
                onOpenChat={() => handleOpenChat(challenge.items[1])}
                enterDelay={120}
              />

              {/* Chest anticipation teaser — visible after first answer, replaced by full chests after both */}
              {inProgress ? (
                <Animated.View
                  entering={FadeInDown.duration(280)}
                  exiting={FadeOut.duration(180)}
                  style={styles.anticipationTeaser}
                  onLayout={(e) => {
                    chestAnticipationOffsetRef.current = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.anticipationIcon}>
                    <Gift size={18} color={STITCH.tertiaryGold} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.anticipationText} allowFontScaling={false}>
                    תיבת אוצר נטענת… {answeredCount}/2
                  </Text>
                </Animated.View>
              ) : null}

              {/* Completion chests — replace the teaser once both items are answered */}
              {bothAnswered ? (
                <Animated.View
                  entering={FadeIn.duration(360)}
                  style={styles.completionWrap}
                  onLayout={(e) => {
                    chestAnticipationOffsetRef.current = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.completionHeaderRow}>
                    <Sparkles size={16} color={STITCH.tertiaryGoldBright} strokeWidth={2.6} />
                    <Text style={styles.completionHeader} allowFontScaling={false}>
                      סיימת! פתח את התיבה
                    </Text>
                  </View>
                  <CompletionChests
                    unlocked
                    isPro={isPro}
                    streak={streak}
                    regularOpened={regularChestOpened}
                    proOpened={proChestOpened}
                    onClaimRegular={claimRegular}
                    onClaimPro={claimPro}
                    onUpgradePress={handleUpgrade}
                  />
                </Animated.View>
              ) : null}

              {/* Source attribution intentionally omitted — we don't surface
                  which feeds the LLM pulled from. */}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* ── Streak celebration toast (overlay, top-of-body) ── */}
      {streakToastVisible ? (
        <Animated.View
          entering={FadeInDown.duration(260)}
          exiting={FadeOut.duration(220)}
          style={[styles.streakToast, { top: insets.top + 78 }]}
          pointerEvents="none"
        >
          <Flame size={18} color="#fbbf24" strokeWidth={2.6} />
          <Text style={styles.streakToastText} allowFontScaling={false}>
            רצף יומי {streak}! עוד יום קדימה
          </Text>
        </Animated.View>
      ) : null}

      {/* Chat overlay */}
      <ItemChatOverlay
        visible={chatItem !== null}
        itemContext={chatItem?.chatContext ?? ''}
        itemHeadline={chatItem?.headlineHe ?? ''}
        onClose={() => setChatItem(null)}
      />

      {/* Exit confirmation */}
      <ExitConfirmModal
        visible={exitConfirmOpen}
        onStay={() => setExitConfirmOpen(false)}
        onLeave={confirmLeave}
      />
    </View>
  );
}

// ─────────────────────────── ItemCard wrapper

/** Wraps a NewsItemView + InteractiveQuestion in a card with a right-edge
 *  color ribbon — gives each story visual identity without heavy chrome. */
function ItemCard({
  index,
  ribbonColor,
  item,
  preAnsweredIdx,
  onAnswered,
  onOpenChat,
  enterDelay,
}: {
  index: 0 | 1;
  ribbonColor: string;
  item: ChallengeItem;
  preAnsweredIdx?: number;
  onAnswered: (selectedIdx: number, wasCorrect: boolean) => void;
  onOpenChat: () => void;
  enterDelay: number;
}): React.ReactElement {
  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(320).springify().damping(18)}
      style={styles.itemCard}
    >
      {/* Right-edge ribbon — visible in RTL as the visual identity strip */}
      <View style={[styles.itemRibbon, { backgroundColor: ribbonColor }]} pointerEvents="none" />
      <View style={styles.itemBlock}>
        <NewsItemView item={item} index={index} />
        <View style={styles.questionGap} />
        <InteractiveQuestion
          item={item}
          preAnsweredIdx={preAnsweredIdx}
          onAnswered={onAnswered}
          onOpenChat={onOpenChat}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────── Styles

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    backgroundColor: STITCH.background,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  safeArea: {
    flex: 1,
  },
  // ── Header (mirrors ToolHeader: white bg, back-right pill, title stack)
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT + '33',
    backgroundColor: ACCENT + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT + '1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  headerStreakPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  headerStreakText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f97316',
    writingDirection: 'rtl',
  },
  // ── Progress
  progressRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  progressChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: ACCENT + '14',
    borderWidth: 1,
    borderColor: ACCENT + '33',
  },
  progressChipDone: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  progressChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: ACCENT,
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  progressChipTextDone: {
    color: '#15803d',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: STITCH.surfaceHighest,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // ── Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 0,
  },
  // ── Item card (Phase B)
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    position: 'relative',
  },
  itemRibbon: {
    position: 'absolute',
    top: 0,
    right: 0, // RTL: right edge — visually leading
    bottom: 0,
    width: 4,
  },
  itemBlock: {
    padding: 14,
    paddingRight: 18, // extra space so content doesn't kiss the ribbon
    gap: 14,
  },
  questionGap: {
    height: 4,
  },
  // ── Anticipation + completion
  anticipationTeaser: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  anticipationIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anticipationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: STITCH.tertiaryGold,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  completionWrap: {
    marginTop: 18,
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#fde68a',
  },
  completionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  completionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  // ── Sources
  sourcesBox: {
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: STITCH.surfaceLow,
  },
  sourcesLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  sourcesText: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  // ── Error
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  // ── Streak toast
  streakToast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 1100,
  },
  streakToastText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fef3c7',
    writingDirection: 'rtl',
  },
});

const skeleton = StyleSheet.create({
  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  line: {
    height: 16,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  lineSm: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#eef2f6',
    marginVertical: 3,
  },
});

const confirm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 21,
    marginBottom: 18,
  },
  btnRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  btnGhost: {
    backgroundColor: STITCH.surfaceLow,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
});
