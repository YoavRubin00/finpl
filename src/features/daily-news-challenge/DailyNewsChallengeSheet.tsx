import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  BackHandler,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { STITCH } from '../../constants/theme';
import { SheetCloseButton } from '../../components/ui/SheetCloseButton';
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
  // Top inset applied explicitly (not via <SafeAreaView edges={['top']}>) —
  // inside a RN <Modal> the SafeAreaProvider from app/_layout doesn't always
  // propagate to the new native window, so SafeAreaView read 0 on iOS and the
  // header rendered behind the notch / Dynamic Island. Same fix as PearlSheet.
  const insets = useSafeAreaInsets();

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

  // Direct state-driven advance. No FlatList, no horizontal pager. The
  // earlier `inverted` horizontal FlatList hijacked vertical gestures, so the
  // ScrollView inside ChallengePage couldn't scroll on results-heavy decks
  // (Yam, LAN QA 2026-06-02). Mirrors the same fix landed in PearlSheet (see
  // its goToPage, lines 343-354). Users keep the "המשך לדף הבא" CTA to
  // advance; they lose the horizontal swipe-back affordance, which had near
  // zero discoverability anyway.
  const goToPage = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, idx));
    setActivePage(clamped);
  }, []);

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

  const itemResults = useMemo<[boolean | undefined, boolean | undefined]>(
    () => [answered[0]?.wasCorrect, answered[1]?.wasCorrect],
    [answered],
  );

  const renderPage = useCallback(
    (page: PageDescriptor) => {
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

  // Wrapped in a native <Modal> (2026-06-02) so the sheet renders ABOVE the
  // bottom tab bar. Before this, the sheet was a position:absolute View
  // inside DuoLearnScreen, which sits inside the tabs layout's flex:1
  // content View, sibling to the AnimatedTabBar. That meant the tab bar
  // overlapped the bottom of the sheet, hiding the "המשך לדף הבא" CTA
  // after a user answered (LAN QA blocker 2026-06-02 from Yam).
  // GestureHandlerRootView wrap mirrors PearlSheet / swipe-quest Modal:
  // RN Modal mounts in its own native window so the app-level root view
  // does not extend into it, and the FlatList page swipe + Pressables
  // need it to receive gesture events reliably.
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={requestClose}
    >
      <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {/* Top bar — single "אקטואליה יומית" header strip replaces the
            previous GlobalWealthHeader + topBar stack (user report
            2026-06-01). Layout (revision 2): the title and the close X
            share the FIRST row so the strip hugs the safe-area top and
            doesn't waste vertical space; ProgressBar sits in row 2.
            row-reverse puts the X visually to the RIGHT of the title for
            Hebrew RTL users — same affordance as the lesson back-arrow. */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View style={styles.titleRow}>
            {/* SheetCloseButton (2026-06-02), unified gold-ring X across all
                sheets. Owns its own tap haptic; we still play the
                sheet-specific sound cue here so the audio identity per
                surface is preserved. */}
            <SheetCloseButton
              onPress={() => { playSound('btn_click_soft_1'); requestClose(); }}
            />
            <Text style={styles.sheetTitle} allowFontScaling={false} numberOfLines={1}>
              אקטואליה יומית
            </Text>
            {/* Live tag, pulsing red dot + "אקטואליה היום לייב" copy.
                Sits to the LEFT of the title in RTL row-reverse flow,
                mimicking a TV-news/radio live indicator (user request
                2026-06-02). The pulse animation respects reduce-motion. */}
            <LiveTag />
          </View>
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
          // State-driven single-page render (2026-06-02). The previous
          // horizontal `inverted` FlatList hijacked vertical gestures so the
          // ScrollView inside ChallengePage couldn't scroll once the result
          // panel + accordions revealed long copy (Yam, LAN QA 2026-06-02).
          // Same pattern PearlSheet adopted after the same bug. Each page
          // gets a fresh fade-in via `key={activePage}`.
          <Animated.View
            key={activePage}
            entering={FadeIn.duration(220)}
            style={styles.pagerWrap}
          >
            {PAGE_DESCRIPTORS[activePage] ? renderPage(PAGE_DESCRIPTORS[activePage]) : null}
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

      </GestureHandlerRootView>
    </Modal>
  );
}

// ─────────────────────────── LiveTag
// Small "LIVE" indicator with a pulsing red dot + Hebrew copy. Sits inside
// the top bar to anchor the sheet as a real-time news feed instead of a
// static quiz (Yam, 2026-06-02). Uses reanimated's withRepeat for the dot
// pulse; respects useReducedMotion so accessibility users get a static dot.
function LiveTag(): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35 + 0.65 * (pulse.value - 1) / 0.35,
  }));

  return (
    <View style={liveTag.wrap} accessible accessibilityLabel="לייב, אקטואליה היום">
      <View style={liveTag.dotHost}>
        <Animated.View style={[liveTag.dotPulse, dotStyle]} />
        <View style={liveTag.dotCore} />
      </View>
      <Text style={liveTag.label} allowFontScaling={false} numberOfLines={1}>
        LIVE
      </Text>
    </View>
  );
}

const liveTag = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dotHost: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  dotPulse: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  label: {
    // "LIVE" reads as an English chrome label (TV-news convention). Larger
    // and tighter than the Hebrew copy that lived here before, easier to
    // spot at a glance in the topper.
    fontSize: 13,
    fontWeight: '900',
    color: '#b91c1c',
    letterSpacing: 1.2,
  },
});

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
    // Wrapped in native <Modal> (2026-06-02). The Modal handles full-screen
    // mounting + sits above the tab bar in its own native window, so we
    // only need flex:1 here. The old position:absolute + zIndex:1000 stack
    // was the source of the bottom-tab-bar-overlap bug, sheet was an
    // absolute child of the tabs screen, sibling to the tab bar, so the
    // tab bar drew on top of the CTA (LAN QA 2026-06-02).
    flex: 1,
    backgroundColor: STITCH.background,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    // Matches the ToolHeader convention used across the financial-tools
    // family. Slim, single-line title row + a thin progress strip below.
    // Bottom border ties the strip visually to the rest of the app's
    // headers (user request 2026-06-02: "thinner topper, app convention").
    paddingTop: 0,
    paddingBottom: 6,
    gap: 4,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  titleRow: {
    // ToolHeader pattern, row-reverse + 40px close-chip + title. LiveTag
    // is appended last so RTL flow renders it visually to the LEFT of
    // the title (the news-anchor "LIVE" placement).
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sheetTitle: {
    // Matches ToolHeader.title, fontSize 18, weight 900, RTL, slight
    // negative letter-spacing. flex:1 lets the title expand and push
    // the LiveTag to the visual far-left of the row.
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.2,
  },
  progressRow: {
    paddingHorizontal: 16,
  },
  // closeBtn style removed 2026-06-02, see SheetCloseButton import.
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
