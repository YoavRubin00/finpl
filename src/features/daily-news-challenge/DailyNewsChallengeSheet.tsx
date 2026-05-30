import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  BackHandler,
  FlatList,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { useIsPro } from '../subscription/useSubscription';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';
import { captureEvent } from '../../lib/posthog';

import { ChallengePage } from './components/ChallengePage';
import { ChestsPage } from './components/ChestsPage';
import { ItemChatOverlay } from './components/ItemChatOverlay';
import { fetchTodayChallenge } from './dailyNewsChallengeApi';
import { useDailyNewsChallengeStore, type ChallengeRewardSummary } from './useDailyNewsChallengeStore';
import type { ChallengeItem } from './types';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { playChestOpenSwoosh } from './lib/sounds';

interface DailyNewsChallengeSheetProps {
  visible: boolean;
  onClose: () => void;
}

const PAGE_COUNT = 3;
const SCREEN_W = Dimensions.get('window').width;

interface PageDescriptor {
  kind: 'challenge' | 'chests';
  index: number;
}

const PAGE_DESCRIPTORS: PageDescriptor[] = [
  { kind: 'challenge', index: 0 },
  { kind: 'challenge', index: 1 },
  { kind: 'chests', index: 2 },
];

/**
 * Full-screen Daily News Challenge — horizontal swipe-stack.
 *
 *   Page 0: ChallengePage(item 0) — curiosity-gap blanked headline
 *   Page 1: ChallengePage(item 1) — curiosity-gap blanked headline
 *   Page 2: ChestsPage — dual chests + perfect burst + share card
 *
 * Close button is in the top-right (RTL leading corner). Progress dots above
 * the pager show current page. The pager is the user's main interaction;
 * tapping "המשך" inside a page also advances it.
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
  const todayPerfect = useDailyNewsChallengeStore((s) => s.todayPerfect);

  const isPro = useIsPro();
  const showUpgrade = useUpgradeModalStore((s) => s.show);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatItem, setChatItem] = useState<ChallengeItem | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [activePage, setActivePage] = useState(0);

  // Chest-open fly-up particles — self-resets via FlyingRewards.onComplete.
  const [flyingXp, setFlyingXp] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState(0);
  const [flyingGems, setFlyingGems] = useState(0);

  const listRef = useRef<FlatList<PageDescriptor> | null>(null);
  const pageWidth = SCREEN_W;

  const item0Answered = answered[0] !== null;
  const item1Answered = answered[1] !== null;
  const bothAnswered = item0Answered && item1Answered;
  const inProgress = !bothAnswered && (item0Answered || item1Answered);
  const perfect = todayPerfect();

  const wrapClaim = useCallback(
    (claim: () => ChallengeRewardSummary | null) =>
      (): ChallengeRewardSummary | null => {
        const reward = claim();
        if (reward) {
          void playChestOpenSwoosh();
          if (reward.xp > 0) setFlyingXp(reward.xp);
          if (reward.coins > 0) setFlyingCoins(reward.coins);
          if (reward.gems > 0) setFlyingGems(reward.gems);
        }
        return reward;
      },
    [],
  );
  const handleClaimRegular = useCallback(() => wrapClaim(claimRegular)(), [wrapClaim, claimRegular]);
  const handleClaimPro = useCallback(() => wrapClaim(claimPro)(), [wrapClaim, claimPro]);

  // Lazy load
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

  useEffect(() => {
    if (visible && challenge) {
      captureEvent('news_challenge_viewed', { date_key: challenge.dateKey });
    }
  }, [visible, challenge]);

  // Completed event — fires when both items become answered for the first time
  useEffect(() => {
    if (answered[0] && answered[1]) {
      captureEvent('news_challenge_completed', {
        date_key: challenge?.dateKey ?? null,
        both_correct: answered[0].wasCorrect && answered[1].wasCorrect,
        streak,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered[0]?.answeredAt, answered[1]?.answeredAt]);

  // Hardware back / web ESC → exit guard
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, inProgress]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const w = (globalThis as unknown as {
      window?: {
        addEventListener: (t: string, h: (e: { key: string; preventDefault: () => void }) => void) => void;
        removeEventListener: (t: string, h: (e: { key: string; preventDefault: () => void }) => void) => void;
      };
    }).window;
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

  const handleOpenChat = useCallback(
    (item: ChallengeItem) => {
      setChatItem(item);
      captureEvent('news_challenge_chat_opened', {
        source: item.source,
        date_key: challenge?.dateKey ?? null,
      });
    },
    [challenge?.dateKey],
  );

  const handleUpgrade = useCallback(() => {
    onClose();
    showUpgrade('breaking-news');
  }, [onClose, showUpgrade]);

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

  const goToPage = useCallback(
    (idx: number) => {
      if (!listRef.current) return;
      const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, idx));
      // scrollToIndex works correctly with `inverted` (handles the flipped
      // offset for us); using scrollToOffset directly would land on the
      // wrong page when the list is inverted.
      listRef.current.scrollToIndex({ index: clamped, animated: true });
      setActivePage(clamped);
    },
    [],
  );

  const handleContinue = useCallback(
    (currentIdx: number) => {
      goToPage(currentIdx + 1);
    },
    [goToPage],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      setActivePage(idx);
    },
    [pageWidth],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActivePage(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const itemResults = useMemo<[boolean | undefined, boolean | undefined]>(
    () => [answered[0]?.wasCorrect, answered[1]?.wasCorrect],
    [answered],
  );

  const renderPage = useCallback(
    ({ item: page }: { item: PageDescriptor }) => {
      if (page.kind === 'chests') {
        if (!challenge) return <View style={{ width: pageWidth }} />;
        return (
          <ChestsPage
            pageWidth={pageWidth}
            unlocked={bothAnswered}
            isPro={isPro}
            streak={streak}
            perfect={perfect}
            regularOpened={regularChestOpened}
            proOpened={proChestOpened}
            itemResults={itemResults}
            dateKey={challenge.dateKey}
            onClaimRegular={handleClaimRegular}
            onClaimPro={handleClaimPro}
            onUpgradePress={handleUpgrade}
          />
        );
      }
      const idx = page.index as 0 | 1;
      if (!challenge) return <View style={{ width: pageWidth }} />;
      return (
        <ChallengePage
          pageWidth={pageWidth}
          item={challenge.items[idx]}
          index={idx}
          preAnsweredIdx={answered[idx]?.selectedIdx}
          onAnswered={handleAnswer(idx)}
          onContinue={() => handleContinue(idx)}
          onOpenChat={() => handleOpenChat(challenge.items[idx])}
        />
      );
    },
    [
      challenge,
      pageWidth,
      bothAnswered,
      isPro,
      streak,
      perfect,
      regularChestOpened,
      proChestOpened,
      itemResults,
      answered,
      handleAnswer,
      handleClaimRegular,
      handleClaimPro,
      handleUpgrade,
      handleContinue,
      handleOpenChat,
    ],
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top bar: close button right (RTL leading) + progress dots */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => { tapHaptic(); requestClose(); }}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={10}
          >
            <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.dotsRow} accessibilityLabel={`עמוד ${activePage + 1} מתוך ${PAGE_COUNT}`}>
            {Array.from({ length: PAGE_COUNT }).map((_, i) => {
              const isActive = i === activePage;
              const isDone =
                (i === 0 && item0Answered) ||
                (i === 1 && item1Answered) ||
                (i === 2 && bothAnswered && regularChestOpened && (isPro ? proChestOpened : true));
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    isDone && styles.dotDone,
                  ]}
                />
              );
            })}
          </View>

          {/* Spacer balancing the close button so dots stay centered */}
          <View style={styles.topBarSpacer} />
        </View>

        {/* Pager */}
        {loading && !challenge ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText} allowFontScaling={false}>טוען את האקטואליה היומית…</Text>
          </View>
        ) : error && !challenge ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>
          </View>
        ) : challenge ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.pagerWrap}>
            <FlatList
              ref={listRef}
              data={PAGE_DESCRIPTORS}
              keyExtractor={(d) => `${d.kind}-${d.index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              renderItem={renderPage}
              onMomentumScrollEnd={onMomentumScrollEnd}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              // RTL swipe: `inverted` flips horizontal scroll so page 0 sits
              // on the right and swiping right→left advances forward — matches
              // the natural Hebrew reading direction (user feedback 2026-05-30).
              inverted
            />
          </Animated.View>
        ) : null}
      </SafeAreaView>

      {/* Chat overlay */}
      <ItemChatOverlay
        visible={chatItem !== null}
        itemContext={chatItem?.chatContext ?? ''}
        itemHeadline={chatItem?.headlineHe ?? ''}
        onClose={() => setChatItem(null)}
      />

      {/* Exit confirm */}
      <ExitConfirmModal
        visible={exitConfirmOpen}
        onStay={() => setExitConfirmOpen(false)}
        onLeave={confirmLeave}
      />

      {/* Fly-up reward particles — must sit above the pager so glyphs reach
          the top header strip without being clipped. */}
      {flyingXp > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <FlyingRewards type="xp" amount={flyingXp} onComplete={() => setFlyingXp(0)} />
        </View>
      )}
      {flyingCoins > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <FlyingRewards type="coins" amount={flyingCoins} onComplete={() => setFlyingCoins(0)} />
        </View>
      )}
      {flyingGems > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <FlyingRewards type="gems" amount={flyingGems} onComplete={() => setFlyingGems(0)} />
        </View>
      )}

      {/* Bottom insets safe-area pad so the chest CTA isn't blocked by the
          home indicator on devices with a dynamic island / notch. */}
      <View style={{ height: insets.bottom }} pointerEvents="none" />
    </View>
  );
}

// ─────────────────────────── ExitConfirmModal

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={confirm.overlay}>
        <View style={confirm.card}>
          <Text style={confirm.title}>לעזוב עכשיו?</Text>
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
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    backgroundColor: STITCH.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    width: 40,
  },
  dotsRow: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: STITCH.surfaceHighest,
  },
  dotActive: {
    backgroundColor: STITCH.primary,
    width: 22,
  },
  dotDone: {
    backgroundColor: '#22c55e',
  },
  pagerWrap: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  errorBox: {
    margin: 20,
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
    backgroundColor: STITCH.primary,
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
