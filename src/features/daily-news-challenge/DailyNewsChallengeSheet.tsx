import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { X, Newspaper, Flame } from 'lucide-react-native';

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

/**
 * Full-screen modal for the Daily News Challenge.
 * Layout: gradient hero header → 2 news items (each: image + headline +
 * summary + question + chat button) → dual chest completion screen.
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

  // Lazy load on first open (or when no cached payload)
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
        setError('לא הצלחנו להוריד את האתגר היומי. נסה שוב.');
      })
      .finally(() => setLoading(false));
  }, [visible, challenge, setChallenge]);

  // Fire `viewed` event the first time the sheet opens per session.
  useEffect(() => {
    if (visible && challenge) {
      captureEvent('news_challenge_viewed', { date_key: challenge.dateKey });
    }
  }, [visible, challenge]);

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

  // Fire `completed` event once both items are answered.
  useEffect(() => {
    if (answered[0] && answered[1]) {
      captureEvent('news_challenge_completed', {
        date_key: challenge?.dateKey ?? null,
        both_correct: answered[0].wasCorrect && answered[1].wasCorrect,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered[0]?.answeredAt, answered[1]?.answeredAt]);

  const handleUpgrade = useCallback(() => {
    onClose();
    // Use the closest existing gated-feature key; the upgrade modal copy is
    // generic enough to make sense here.
    showUpgrade('breaking-news');
  }, [onClose, showUpgrade]);

  if (!visible) return null;

  const item0Answered = answered[0] !== null;
  const item1Answered = answered[1] !== null;
  const bothAnswered = item0Answered && item1Answered;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגור" />
      <View style={[styles.sheet, { paddingTop: insets.top + 8 }]}>
        {/* Hero gradient header */}
        <LinearGradient
          colors={['#1e3a8a', '#0c4a6e', '#0e7490']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeader}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIconBadge}>
              <Newspaper size={20} color="#0f172a" strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow} allowFontScaling={false}>אתגר יומי · עיתון פיננסי</Text>
              <Text style={styles.heroTitle} numberOfLines={2} allowFontScaling={false}>
                {challenge?.heroTitle ?? '...'}
              </Text>
            </View>
            <Pressable
              onPress={() => { tapHaptic(); onClose(); }}
              style={styles.closeBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="סגור"
            >
              <X size={18} color="#fff" strokeWidth={2.4} />
            </Pressable>
          </View>
          {streak > 0 && (
            <View style={styles.streakRow}>
              <Flame size={14} color="#fbbf24" strokeWidth={2.4} />
              <Text style={styles.streakText} allowFontScaling={false}>
                רצף יומי: {streak} ימים
              </Text>
            </View>
          )}
        </LinearGradient>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {loading && !challenge && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={STITCH.primary} />
              <Text style={styles.loadingText} allowFontScaling={false}>טוען חדשות הבוקר...</Text>
            </View>
          )}

          {error && !challenge && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>
            </View>
          )}

          {challenge && (
            <>
              {/* Item 1 */}
              <Animated.View entering={FadeInDown.duration(320).springify().damping(18)} style={styles.itemBlock}>
                <NewsItemView item={challenge.items[0]} index={0} />
                <View style={styles.questionGap} />
                <InteractiveQuestion
                  item={challenge.items[0]}
                  preAnsweredIdx={answered[0]?.selectedIdx}
                  onAnswered={handleAnswer(0)}
                  onOpenChat={() => handleOpenChat(challenge.items[0])}
                />
              </Animated.View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Item 2 */}
              <Animated.View entering={FadeInDown.delay(120).duration(320).springify().damping(18)} style={styles.itemBlock}>
                <NewsItemView item={challenge.items[1]} index={1} />
                <View style={styles.questionGap} />
                <InteractiveQuestion
                  item={challenge.items[1]}
                  preAnsweredIdx={answered[1]?.selectedIdx}
                  onAnswered={handleAnswer(1)}
                  onOpenChat={() => handleOpenChat(challenge.items[1])}
                />
              </Animated.View>

              {/* Completion chests — appear after both answered */}
              {bothAnswered && (
                <Animated.View entering={FadeIn.duration(360)} style={styles.completionWrap}>
                  <Text style={styles.completionHeader} allowFontScaling={false}>
                    🎉 סיימת! פתח את התיבה
                  </Text>
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
              )}

              {/* Sources attribution */}
              {challenge.sourcesUsed.length > 0 && (
                <View style={styles.sourcesBox}>
                  <Text style={styles.sourcesLabel} allowFontScaling={false}>📰 מקורות שנעזרנו בהם:</Text>
                  <Text style={styles.sourcesText} allowFontScaling={false}>
                    {challenge.sourcesUsed.map((s) => s.name).filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Chat overlay */}
      <ItemChatOverlay
        visible={chatItem !== null}
        itemContext={chatItem?.chatContext ?? ''}
        itemHeadline={chatItem?.headlineHe ?? ''}
        onClose={() => setChatItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  sheet: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 8,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  heroIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(250,204,21,0.95)',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fbbf24',
    writingDirection: 'rtl',
  },
  body: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bodyContent: {
    padding: 16,
    gap: 8,
  },
  itemBlock: {
    gap: 14,
  },
  questionGap: {
    height: 4,
  },
  divider: {
    height: 1,
    backgroundColor: STITCH.surfaceHighest,
    marginVertical: 18,
  },
  completionWrap: {
    marginTop: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#fde68a',
  },
  completionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: 4,
  },
  sourcesBox: {
    marginTop: 18,
    padding: 10,
    borderRadius: 10,
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
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  errorBox: {
    padding: 14,
    borderRadius: 10,
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
});
