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
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useIsPro } from '../subscription/useSubscription';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';
import { captureEvent } from '../../lib/posthog';

import { ChallengePage } from './components/ChallengePage';
import { ChestsPage } from './components/ChestsPage';
import { ItemChatOverlay } from './components/ItemChatOverlay';
import { ProgressBar } from './components/ProgressBar';
import { RecapCard } from './components/RecapCard';
import { PerfectDayBurst } from './components/PerfectDayBurst';
import { DidYouKnowCard } from '../did-you-know/DidYouKnowCard';
import { fetchTodayChallenge } from './dailyNewsChallengeApi';
import { useDailyNewsChallengeStore, type ChallengeRewardSummary } from './useDailyNewsChallengeStore';
import { useStreak } from '../economy/useStreak';
import type { ChallengeItem } from './types';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { track } from '../../lib/analytics/events';

/** Where the sheet was opened from. Recorded on news_challenge_viewed +
 *  news_challenge_completed so we can attribute opens by entry point and
 *  compare engagement across surfaces. */
export type NewsEntrySource = 'daily_quests_modal' | 'direct' | 'unknown';

interface DailyNewsChallengeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Telemetry: which surface opened the sheet. Defaults to 'unknown' so
   *  callers that haven't been migrated yet still emit a non-null property. */
  entrySource?: NewsEntrySource;
}

// Pager layout (June 2026 — Duo-pattern Recap added as page 4):
//   Page 0: ChallengePage(Q1)
//   Page 1: DidYouKnowCard intermezzo
//   Page 2: ChallengePage(Q2)
//   Page 3: RecapCard — "היום למדת" + rewards + streak + tomorrow promise
// The recap page replaces the silent fly-up-and-close ending so the user
// gets an explicit "you did it" moment that anchors the daily ritual.
// Reward claim happens on RecapCard's CTA tap (parent handles claim).
const PAGE_COUNT = 4;
const SCREEN_W = Dimensions.get('window').width;

interface PageDescriptor {
  kind: 'challenge' | 'did-you-know' | 'chests' | 'recap';
  /** Position in the pager. Drives FlatList keys + progress segments. */
  index: number;
  /** Only set when kind==='challenge': which of the two news items (0|1). */
  itemIdx?: 0 | 1;
}

const PAGE_DESCRIPTORS: PageDescriptor[] = [
  { kind: 'challenge', index: 0, itemIdx: 0 },
  { kind: 'did-you-know', index: 1 },
  { kind: 'challenge', index: 2, itemIdx: 1 },
  { kind: 'recap', index: 3 },
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
export function DailyNewsChallengeSheet({ visible, onClose, entrySource = 'unknown' }: DailyNewsChallengeSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const challenge = useDailyNewsChallengeStore((s) => s.todayChallenge);
  const answered = useDailyNewsChallengeStore((s) => s.answered);
  const regularChestOpened = useDailyNewsChallengeStore((s) => s.regularChestOpened);
  const proChestOpened = useDailyNewsChallengeStore((s) => s.proChestOpened);
  // Reward calc + chest preview use the unified daily streak (same number
  // the user sees in the header), not the retired DNC-local field.
  const { data: streakData } = useStreak();
  const streak = streakData?.currentStreak ?? 0;
  const setChallenge = useDailyNewsChallengeStore((s) => s.setTodayChallenge);
  const recordAnswer = useDailyNewsChallengeStore((s) => s.recordAnswer);
  const claimRegular = useDailyNewsChallengeStore((s) => s.claimRegularChest);
  const claimPro = useDailyNewsChallengeStore((s) => s.claimProChest);
  const todayPerfect = useDailyNewsChallengeStore((s) => s.todayPerfect);

  const isPro = useIsPro();
  const showUpgrade = useUpgradeModalStore((s) => s.show);
  const { playSound } = useSoundEffect();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this triggers the fetch effect to re-run after the user taps
  // the retry button in the error state. Without it the effect's
  // [visible, challenge, setChallenge] deps don't change and the failed
  // fetch never gets a second chance — the user dead-ends with only the X.
  const [retryNonce, setRetryNonce] = useState(0);
  const [chatItem, setChatItem] = useState<ChallengeItem | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [activePage, setActivePage] = useState(0);
  // PerfectDayBurst overlay — shown briefly when transitioning into the
  // recap page IF the user got both questions right. Auto-dismisses after
  // 1800ms; user can still scroll/tap the recap underneath.
  const [perfectBurstVisible, setPerfectBurstVisible] = useState(false);
  const recapOpenedAtRef = useRef<number | null>(null);

  // Chest-open fly-up particles — self-resets via FlyingRewards.onComplete.
  const [flyingXp, setFlyingXp] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState(0);
  const [flyingGems, setFlyingGems] = useState(0);

  const listRef = useRef<FlatList<PageDescriptor> | null>(null);
  const pageWidth = SCREEN_W;
  // Guards against duplicate `news_challenge_completed` events. The dependency
  // array on the completion effect re-runs on every sheet mount where both
  // answers exist (Zustand-persisted), so the event used to fire ~29× per
  // real completion (PostHog 2026-05-30: 2 answered → 58 completed). The
  // earlier useRef-based guard reset on every unmount and didn't survive a
  // close-and-reopen — now lives in the persisted store so the guard sticks
  // across sessions, remounts, and app restarts (QA audit 2026-05-31).
  const hasReportedCompletionFor = useDailyNewsChallengeStore((s) => s.hasReportedCompletionFor);
  const markCompletionReportedFor = useDailyNewsChallengeStore((s) => s.markCompletionReportedFor);
  // In-flight guard for fetchTodayChallenge. Without it a cold-start race
  // between DuoLearnScreen's fetch (1129) and the sheet's lazy fetch (124)
  // sends two parallel API calls.
  const fetchInFlightRef = useRef(false);

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
          playSound('modal_open_4');
          if (reward.xp > 0) setFlyingXp(reward.xp);
          if (reward.coins > 0) setFlyingCoins(reward.coins);
          if (reward.gems > 0) setFlyingGems(reward.gems);
        }
        return reward;
      },
    [playSound],
  );
  const handleClaimRegular = useCallback(() => wrapClaim(claimRegular)(), [wrapClaim, claimRegular]);
  const handleClaimPro = useCallback(() => wrapClaim(claimPro)(), [wrapClaim, claimPro]);

  // Lazy load. DuoLearnScreen also fires fetchTodayChallenge on mount, so
  // an in-flight ref dedupes the cold-start race between the two callers.
  useEffect(() => {
    if (!visible) return;
    if (challenge) return;
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
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
      .finally(() => {
        setLoading(false);
        fetchInFlightRef.current = false;
      });
  }, [visible, challenge, setChallenge, retryNonce]);

  useEffect(() => {
    if (visible && challenge) {
      captureEvent('news_challenge_viewed', {
        date_key: challenge.dateKey,
        entry_source: entrySource,
      });
    }
  }, [visible, challenge, entrySource]);

  // Completed event — fires ONCE per dateKey LIFETIME (not per session). The
  // persisted-store guard survives sheet unmounts and app restarts, fixing
  // the 58:2 over-firing bug where every reopen of an already-completed day
  // re-emitted both `news_challenge_completed` and `daily_challenge_completed`.
  // PR #3 (Yam) added the second canonical NSM event name; both fire under
  // the same guard so the NSM funnel and the legacy funnel stay in sync.
  useEffect(() => {
    if (!answered[0] || !answered[1]) return;
    const dateKey = challenge?.dateKey ?? null;
    if (!dateKey) return;
    if (hasReportedCompletionFor(dateKey)) return;
    markCompletionReportedFor(dateKey);
    const props = {
      date_key: dateKey,
      both_correct: answered[0].wasCorrect && answered[1].wasCorrect,
      streak,
      entry_source: entrySource,
    };
    captureEvent('news_challenge_completed', props);
    captureEvent('daily_challenge_completed', { ...props, challenge_type: 'news' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered[0]?.answeredAt, answered[1]?.answeredAt, challenge?.dateKey]);

  // Reset transient sheet state when the sheet closes. Without this, a
  // half-open exit confirm or a stale chatItem would re-appear instantly
  // on the next open — discovered in the QA audit (2026-05-31).
  useEffect(() => {
    if (!visible) {
      setExitConfirmOpen(false);
      setChatItem(null);
      setActivePage(0);
      setPerfectBurstVisible(false);
      recapOpenedAtRef.current = null;
    }
  }, [visible]);

  // Fires news_recap_viewed once per dateKey when the user first lands on the
  // recap page. Also stamps recapOpenedAtRef so the close event can compute
  // time-spent-on-recap.
  useEffect(() => {
    if (activePage !== 3) return;
    if (!challenge?.dateKey) return;
    if (recapOpenedAtRef.current !== null) return;
    recapOpenedAtRef.current = Date.now();
    track({
      name: 'news_recap_viewed',
      props: {
        date_key: challenge.dateKey,
        perfect: !!(answered[0]?.wasCorrect && answered[1]?.wasCorrect),
        streak,
      },
    });
  }, [activePage, challenge?.dateKey, answered, streak]);

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
    // Claim any pending rewards on close if both questions were answered —
    // without this, a user who taps X on the Recap page (instead of המשך)
    // never claims the chests, and hasReportedCompletionFor=true blocks
    // re-entry so the rewards are lost permanently (QA blocker 2026-05-31).
    if (bothAnswered) {
      if (!regularChestOpened) handleClaimRegular();
      if (isPro && !proChestOpened) handleClaimPro();
    }
    onClose();
  }, [inProgress, onClose, bothAnswered, regularChestOpened, proChestOpened, isPro, handleClaimRegular, handleClaimPro]);

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
      // currentIdx === 2 → moving from Q2 into the recap. This is the
      // climactic transition: if both right, show PerfectDayBurst overlay
      // briefly before the user lands on the recap.
      if (currentIdx === 2) {
        if (bothAnswered && answered[0]?.wasCorrect && answered[1]?.wasCorrect) {
          setPerfectBurstVisible(true);
          setTimeout(() => setPerfectBurstVisible(false), 1800);
        }
        goToPage(3);
        return;
      }
      // Recap CTA → claim rewards + close. The RecapCard previews them; the
      // actual XP/coin/gem deltas happen here via the store's idempotent
      // claim* methods so re-opens of a completed day are no-ops.
      if (currentIdx >= PAGE_COUNT - 1) {
        if (bothAnswered) {
          if (!regularChestOpened) handleClaimRegular();
          if (isPro && !proChestOpened) handleClaimPro();
        }
        if (challenge?.dateKey && recapOpenedAtRef.current !== null) {
          track({
            name: 'news_recap_closed',
            props: {
              date_key: challenge.dateKey,
              time_open_ms: Date.now() - recapOpenedAtRef.current,
            },
          });
          recapOpenedAtRef.current = null;
        }
        onClose();
        return;
      }
      goToPage(currentIdx + 1);
    },
    [goToPage, bothAnswered, answered, regularChestOpened, proChestOpened, isPro, handleClaimRegular, handleClaimPro, onClose, challenge?.dateKey],
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
      // Recap card — final page, added June 2026 (Duo-pattern polish). Shows
      // "what you learned today" + rewards preview + streak + tomorrow cue.
      // CTA tap routes through handleContinue (which claims + closes).
      if (page.kind === 'recap') {
        if (!challenge) return <View style={{ width: pageWidth }} />;
        return (
          <RecapCard
            pageWidth={pageWidth}
            items={challenge.items}
            results={itemResults}
            streak={streak}
            isPro={isPro}
            onContinue={() => handleContinue(page.index)}
          />
        );
      }
      if (page.kind === 'did-you-know') {
        // Intermezzo between the two news items. Picks a rotating fact from
        // DID_YOU_KNOW_ITEMS (by-day deterministic) so the same opener
        // sees the same fact across a session — and a different one each
        // day. Continue advances to the next news item.
        return (
          <View style={{ width: pageWidth, flex: 1 }}>
            <DidYouKnowCard isActive itemId={`dnc-${challenge?.dateKey ?? 'today'}`} />
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }}>
              <Pressable
                onPress={() => { tapHaptic(); playSound('btn_click_soft_2'); handleContinue(page.index); }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 22,
                  borderRadius: 16,
                  backgroundColor: '#0891b2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottomWidth: 3,
                  borderBottomColor: '#0e7490',
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }} allowFontScaling={false}>המשך</Text>
              </Pressable>
            </View>
          </View>
        );
      }
      const idx = (page.itemIdx ?? 0) as 0 | 1;
      if (!challenge) return <View style={{ width: pageWidth }} />;
      return (
        <ChallengePage
          pageWidth={pageWidth}
          item={challenge.items[idx]}
          index={idx}
          preAnsweredIdx={answered[idx]?.selectedIdx}
          onAnswered={handleAnswer(idx)}
          onContinue={() => handleContinue(page.index)}
          onOpenChat={() => handleOpenChat(challenge.items[idx])}
          streak={streak}
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
        {/* Top bar — single "אקטואליה יומית" header strip replaces the
            previous GlobalWealthHeader + topBar stack (user report
            2026-06-01: the two strips looked duplicated). Title sits
            centered, close X is absolute top-RIGHT of the screen so it
            lands where Hebrew RTL users expect a dismiss affordance.
            ProgressBar sits below the title in its own row for breathing
            room. */}
        <View style={styles.topBar}>
          <Text style={styles.sheetTitle} allowFontScaling={false}>
            אקטואליה יומית
          </Text>
          <View style={styles.progressRow}>
            <ProgressBar
              segments={[
                { label: 'Q1', done: item0Answered, active: activePage === 0 },
                { label: 'הידעת?', done: item0Answered, active: activePage === 1 },
                { label: 'Q2', done: item1Answered, active: activePage === 2 },
                { label: 'סיכום', done: bothAnswered && activePage === 3, active: activePage === 3 },
              ]}
              currentStep={activePage + 1}
              totalSteps={PAGE_COUNT}
            />
          </View>

          <Pressable
            onPress={() => { tapHaptic(); playSound('btn_click_soft_1'); requestClose(); }}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={10}
          >
            <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
          </Pressable>
        </View>

        {/* Pager */}
        {loading && !challenge ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText} allowFontScaling={false}>טוען את האקטואליה היומית…</Text>
          </View>
        ) : error && !challenge ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>
            <Pressable
              onPress={() => {
                tapHaptic();
                setError(null);
                setRetryNonce((n) => n + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="נסה שוב להוריד את האקטואליה"
              style={styles.errorRetryBtn}
            >
              <Text style={styles.errorRetryText} allowFontScaling={false}>נסה שוב</Text>
            </Pressable>
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

      {/* Perfect Day burst — appears for ~1.8s when the user lands on the
          recap page with both answers correct. Sits above the pager (zIndex
          50 in the component) and is pointer-events: none so the recap
          beneath remains interactive while the badge fades in. */}
      <PerfectDayBurst show={perfectBurstVisible} />

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
  const { playSound } = useSoundEffect();
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
              onPress={() => { tapHaptic(); playSound('btn_click_soft_2'); onLeave(); }}
              style={[confirm.btn, confirm.btnGhost]}
              accessibilityRole="button"
              accessibilityLabel="עזוב את האתגר"
            >
              <Text style={confirm.btnGhostText}>צא</Text>
            </Pressable>
            <Pressable
              onPress={() => { tapHaptic(); playSound('btn_click_soft_3'); onStay(); }}
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
    paddingHorizontal: 16,
    // Extra breathing room after removing GlobalWealthHeader (2026-06-01) —
    // the strip now hosts a centered title + progress, so the top/bottom
    // padding gives the content a less crowded feel.
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 96,
    justifyContent: 'flex-start',
    gap: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'center',
    writingDirection: 'rtl',
    // Leave space on the right for the absolute X so the title doesn't
    // collide with the button on narrow phones.
    paddingHorizontal: 52,
  },
  progressRow: {
    paddingHorizontal: 4,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    backgroundColor: STITCH.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  dotsRow: {
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
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  errorRetryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#b91c1c',
  },
  errorRetryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    writingDirection: 'rtl',
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
