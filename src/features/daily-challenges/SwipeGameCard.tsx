import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable } from 'react-native';
import { successHaptic, errorHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

const LOTTIE_BULL = require('../../../assets/lottie/wired-flat-1199-bull-hover-pinch.json');
const LOTTIE_BEAR = require('../../../assets/lottie/wired-flat-1203-bear-hover-pinch.json');
import { useDailyChallengesStore } from './use-daily-challenges-store';
import { israelDayKey } from '../../utils/dateUtils';
import { useDailyLogStore } from '../daily-summary/useDailyLogStore';
import { getTodaySwipeCards, type SwipeCard } from './swipe-game-data';
import { MAX_DAILY_PLAYS, CHALLENGE_XP_REWARD, CHALLENGE_COIN_REWARD } from './daily-challenge-types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  isActive: boolean;
  /** Fired exactly once when the game ends (timer expires or all cards
   *  played). Used by the Daily-Quests host modal so it can close itself
   *  + mark the swipe quest complete on any host outside the standalone
   *  card. Safe to leave unset for legacy callers — the card still
   *  finalizes its own scoring via playSwipeGame. */
  onFinish?: () => void;
}

const CDN = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com';

const SWIPE_BGS: Record<string, { uri: string } | undefined> = {
  tech: { uri: `${CDN}/images/games/swipe/swipe_tech.png` },
  crisis: { uri: `${CDN}/images/games/swipe/swipe_crisis.png` },
  bank: { uri: `${CDN}/images/games/swipe/swipe_bank.png` },
  scandal: { uri: `${CDN}/images/games/swipe/swipe_scandal.png` },
  trade: { uri: `${CDN}/images/games/swipe/swipe_trade.png` },
  graham: { uri: `${CDN}/images/games/swipe/swipe_graham.png` },
};

function SwipeableCard({
  card,
  onSwipe,
}: {
  card: SwipeCard;
  onSwipe: (isLong: boolean) => void;
}) {
  const translateX = useSharedValue(0);
  const cardRotation = useSharedValue(0);
  const swiped = useSharedValue(false);

  // activeOffsetX gates the gesture so it only takes over after a clear
  // horizontal intent (>12px). Without it the Pan competes with the host
  // ScrollView's vertical scroll on the first frame and Android sometimes
  // swallows the touch entirely — user reported "touch didn't work" on
  // preview build 1.3.0.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      if (swiped.value) return;
      translateX.value = event.translationX;
      cardRotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-15, 0, 15],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      if (swiped.value) return;
      if (event.translationX > SWIPE_THRESHOLD) {
        swiped.value = true;
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(onSwipe)(true);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        swiped.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(onSwipe)(false);
      } else {
        translateX.value = withSpring(0);
        cardRotation.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${cardRotation.value}deg` },
    ],
  }));

  // Overlay colors, red (Short) on left, green (Long) on right
  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const bgSource = SWIPE_BGS[card.imageCategory];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.swipeCard, cardStyle]}

        accessibilityRole="button"
        accessibilityLabel={`כרטיס: ${card.headline}`}
        accessibilityHint="החלק ימינה ללונג, שמאלה לשורט"
      >

        {/* Content: headline centered at the top */}
        <View style={styles.cardContentTop}>
          <Text style={[styles.cardHeadline, RTL, { textAlign: 'center' }]}>{card.headline}</Text>
        </View>

        {/* Hero image, fitting elegantly in remaining space.
            onError surfaces CDN/network failures to the console instead of
            silently rendering a blank space — user reported broken pearl
            media on TestFlight (2026-06-01). Prefetch on mount (see the
            useEffect inside SwipeGameCard) warms the OS HTTP cache so the
            first paint after the swipe-quest opens is near-instant. */}
        {bgSource && (
          <View style={styles.heroImageContainer}>
            <Animated.Image
              entering={FadeIn.duration(800)}
              source={bgSource}
              style={styles.heroImage}
              resizeMode="contain"
              onError={(e) => {
                console.warn(
                  `[SwipeGameCard] background image failed: ${bgSource.uri}`,
                  e.nativeEvent?.error,
                );
              }}
            />
          </View>
        )}

        {/* Short overlay (left), Red + Bear */}
        <Animated.View style={[styles.swipeOverlay, styles.shortOverlay, leftOverlayStyle]}>
          <View accessible={false}><LottieIcon source={LOTTIE_BEAR} size={72} /></View>
          <Text style={styles.overlayLabelShort}>שורט 📉</Text>
        </Animated.View>

        {/* Long overlay (right), Green + Bull */}
        <Animated.View style={[styles.swipeOverlay, styles.longOverlay, rightOverlayStyle]}>
          <View accessible={false}><LottieIcon source={LOTTIE_BULL} size={72} /></View>
          <Text style={styles.overlayLabelLong}>לונג 📈</Text>
        </Animated.View>

      </Animated.View>
    </GestureDetector>
  );
}

export const SwipeGameCard = React.memo(function SwipeGameCard({ isActive, onFinish }: Props) {
  const hasSwipeGamePlayedToday = useDailyChallengesStore((s) => s.hasSwipeGamePlayedToday);
  const getSwipeGamePlaysToday = useDailyChallengesStore((s) => s.getSwipeGamePlaysToday);
  const playSwipeGame = useDailyChallengesStore((s) => s.playSwipeGame);
  const { playSound } = useSoundEffect();
  const hasPlayed = hasSwipeGamePlayedToday();
  const playsToday = getSwipeGamePlaysToday();
  // Guard so onFinish fires exactly once per mount even if the card
  // re-renders after gameState flips to 'done'.
  const finishFiredRef = useRef(false);

  // Prefetch every swipe-bg from Vercel Blob CDN the moment the user
  // enters the swipe game. Idempotent + cached by expo-image, so calling
  // this on every mount is safe and very cheap on repeat. Without it,
  // each card-flip raced the CDN fetch and on 4G the user saw a blank
  // space for 1-2s — TestFlight bug report 2026-06-01.
  useEffect(() => {
    Object.values(SWIPE_BGS).forEach((src) => {
      if (src) {
        ExpoImage.prefetch(src.uri).catch(() => undefined);
      }
    });
  }, []);

  const cards = getTodaySwipeCards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<Array<{ correct: boolean; card: SwipeCard }>>([]);
  const [gameState, setGameState] = useState<'playing' | 'done'>('playing');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);

  // Start timer
  useEffect(() => {
    if (hasPlayed || gameState === 'done') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameState('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasPlayed, gameState]);

  // Finalize when done
  useEffect(() => {
    if (gameState === 'done' && !hasPlayed) {
      const today = israelDayKey();
      playSwipeGame(today, score);

      const log = useDailyLogStore.getState();
      log.logEvent({ type: 'swipe-game', title: 'שורט או לונג', timestamp: Date.now(), xpEarned: score > 0 ? CHALLENGE_XP_REWARD : 0 });
      if (score > 0) {
        log.addTodayXP(CHALLENGE_XP_REWARD);
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
        // Reward animations: fly coins up + confetti whenever user earns anything
        setShowFlyingCoins(true);
        successHaptic();
        playSound('modal_open_4');
        if (score >= 3) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
        }
      }
      log.addCorrectAnswer();
      // Notify host (e.g. Daily Quests modal) that the game is over.
      // Guard ensures we don't double-fire if React re-runs the effect.
      if (!finishFiredRef.current && onFinish) {
        finishFiredRef.current = true;
        // Slight delay so the reward animations get a beat to play before
        // the host closes the modal.
        setTimeout(() => onFinish(), 1200);
      }
    }
  }, [gameState, hasPlayed, score, playSwipeGame, onFinish, playSound]);

  const handleSwipe = useCallback(
    (isLong: boolean) => {
      if (gameState === 'done') return;
      const card = cards[currentIndex];
      const correct = isLong === card.correctIsLong;

      if (correct) {
        successHaptic();
        playSound('btn_click_soft_3');
        setScore((s) => s + 1);
      } else {
        errorHaptic();
        playSound('modal_open_1');
      }

      setLastFeedback({ correct, explanation: card.explanation });
      setResults((r) => [...r, { correct, card }]);

      setTimeout(() => {
        setLastFeedback(null);
        if (currentIndex >= cards.length - 1) {
          setGameState('done');
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 3200);
    },
    [currentIndex, cards, gameState, playSound],
  );

  // Allow replay
  const playAgain = useCallback(() => {
    if (hasPlayed) return;
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setResults([]);
    setTimeLeft(40);
    setShowConfetti(false);
    setShowFlyingCoins(false);
    setLastFeedback(null);
  }, [hasPlayed]);

  const [showEdu, setShowEdu] = useState(false);
  const remaining = MAX_DAILY_PLAYS - playsToday;

  // All plays used
  if (hasPlayed) {
    return (
      <View style={styles.container}>
        <View style={styles.cardDone}>
          <View style={{ alignItems: 'center' }} accessible={false}><LottieIcon source={LOTTIE_BULL} size={48} /></View>
          <Text style={[styles.answeredTitle, RTL]}>שורט או לונג הושלם!</Text>
          <Text style={[styles.answeredSub, RTL]}>חזור מחר לכרטיסיות חדשות</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingCoins && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingCoins(false)}
        />
      )}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View accessible={false}><LottieIcon source={LOTTIE_BULL} size={36} /></View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, RTL]}>שורט או לונג</Text>
            <Text style={[styles.headerSub, RTL]}>
              {gameState === 'playing'
                ? `כרטיס ${currentIndex + 1}/${cards.length} · ${remaining}/${MAX_DAILY_PLAYS} סבבים`
                : `סיימת! ${score}/${cards.length} נכונות`}
            </Text>
          </View>
        </View>

        {/* Timer + Score */}
        {gameState === 'playing' && (
          <View style={styles.statsRow}>
            <View style={styles.timerBadge}>
              <Text style={[styles.timerText, timeLeft <= 10 && { color: '#ef4444' }]}>
                ⏱️ {timeLeft}s
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>🎯 {score}/{cards.length}</Text>
            </View>
          </View>
        )}

        {/* Swipeable card, flanked by Bear (שורט) left and Bull (לונג) right.
            Side pills are tappable too — many users (and small screens) can't
            comfortably drag the narrow middle card, so tap = the same choice. */}
        {gameState === 'playing' && currentIndex < cards.length && !lastFeedback && (
          <View style={styles.swipeArea}>
            {/* LEFT, Bear / SHORT — tap = שורט */}
            <Pressable
              onPress={() => handleSwipe(false)}
              style={styles.sideColumn}
              accessibilityRole="button"
              accessibilityLabel="בחר שורט"
              hitSlop={8}
            >
              <View style={[styles.sidePill, styles.sidePillShort]}>
                <View accessible={false}>
                  <LottieIcon source={LOTTIE_BEAR} size={68} />
                </View>
                <View style={styles.sideDirectionRow}>
                  <Text style={[styles.sideArrow, { color: '#ef4444' }]}>←</Text>
                  <Text style={[styles.sideLabel, { color: '#b91c1c' }]}>שורט</Text>
                </View>
              </View>
            </Pressable>

            {/* MIDDLE, Swipeable card */}
            <View style={styles.cardMiddleCol}>
              <SwipeableCard
                key={cards[currentIndex].id}
                card={cards[currentIndex]}
                onSwipe={handleSwipe}
              />
            </View>

            {/* RIGHT, Bull / LONG — tap = לונג */}
            <Pressable
              onPress={() => handleSwipe(true)}
              style={styles.sideColumn}
              accessibilityRole="button"
              accessibilityLabel="בחר לונג"
              hitSlop={8}
            >
              <View style={[styles.sidePill, styles.sidePillLong]}>
                <View accessible={false}>
                  <LottieIcon source={LOTTIE_BULL} size={68} />
                </View>
                <View style={styles.sideDirectionRow}>
                  <Text style={[styles.sideLabel, { color: '#15803d' }]}>לונג</Text>
                  <Text style={[styles.sideArrow, { color: '#16a34a' }]}>→</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Quick feedback flash */}
        {lastFeedback && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              styles.feedbackFlash,
              {
                backgroundColor: lastFeedback.correct
                  ? 'rgba(22,163,74,0.1)'
                  : 'rgba(239,68,68,0.1)',
                borderColor: lastFeedback.correct
                  ? 'rgba(22,163,74,0.25)'
                  : 'rgba(239,68,68,0.25)',
              },
            ]}
          >
            <Text style={styles.feedbackEmoji}>
              {lastFeedback.correct ? '✅' : '❌'}
            </Text>
            <Text style={[styles.feedbackExplanation, RTL]}>
              {lastFeedback.explanation}
            </Text>
          </Animated.View>
        )}

        {/* Final results */}
        {gameState === 'done' && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.resultsBox}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 64, height: 64 }} contentFit="contain" />
            <Text style={[styles.resultTitle, RTL]}>
              {score >= 4 ? '🌟 מרשים!' : score >= 3 ? '👏 כל הכבוד!' : 'נסה שוב מחר!'}
            </Text>
            <Text style={[styles.resultScore, RTL]}>
              {score}/{cards.length} תשובות נכונות
            </Text>
            <View style={styles.rewardRow}>
              <View style={styles.rewardPillCoin}>
                <GoldCoinIcon size={18} />
                <Text style={styles.rewardCoinText}>+{CHALLENGE_COIN_REWARD}</Text>
              </View>
              <View style={styles.rewardPillXP}>
                <Text style={styles.rewardXPText}>+{CHALLENGE_XP_REWARD} XP</Text>
              </View>
            </View>

            {/* Play again if plays remain */}
            {!hasPlayed && remaining > 1 && (
              <Pressable onPress={playAgain} style={styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
                <Text style={styles.replayBtnText}>🔄 שחק שוב ({remaining - 1} נותרו)</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </View>

      {/* Educational tooltip, Long & Short explained */}
      <Pressable onPress={() => setShowEdu((v) => !v)} style={styles.eduToggle} accessibilityRole="button" accessibilityLabel="מה זה לונג ושורט">
        <Text style={styles.eduToggleText}>📚 מה זה לונג ושורט?</Text>
        {showEdu ? (
          <ChevronDown size={16} color="#0891b2" />
        ) : (
          <ChevronUp size={16} color="#0891b2" />
        )}
      </Pressable>

      {/* Edu card, opens UPWARD, overlays the swipe card */}
      {showEdu && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.eduCardOverlay}>
          <Text style={[styles.eduTitle, RTL]}>לונג (Long), הימור על עלייה 📈</Text>
          <Text style={[styles.eduBody, RTL]}>
            קונים נכס כי מאמינים שהמחיר יעלה. אם עולה, מרוויחים.
          </Text>
          <Text style={[styles.eduTitle, RTL]}>שורט (Short), הימור על ירידה 📉</Text>
          <Text style={[styles.eduBody, RTL]}>
            "שואלים" נכס ומוכרים אותו. אם המחיר יורד, קונים בזול ומרוויחים את ההפרש.
          </Text>
          <Pressable onPress={() => setShowEdu(false)} style={styles.eduCloseBtn} accessibilityRole="button" accessibilityLabel="סגור הסבר">
            <Text style={styles.eduCloseBtnText}>הבנתי ✓</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 14,
  },
  cardDone: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 32,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerBadge: {
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
    fontVariant: ['tabular-nums'],
  },
  scoreBadge: {
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
  },
  swipeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginHorizontal: -8,
    minHeight: 280,
  },
  sideColumn: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidePill: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  sidePillShort: {
    backgroundColor: '#fff1f2',
    borderColor: 'rgba(239,68,68,0.5)',
    shadowColor: '#ef4444',
  },
  sidePillLong: {
    backgroundColor: '#f0fdf4',
    borderColor: 'rgba(22,163,74,0.5)',
    shadowColor: '#16a34a',
  },
  sideDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sideArrow: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  sideLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardMiddleCol: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  swipeCard: {
    width: '100%',
    aspectRatio: 0.78,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 100,
    elevation: 12,
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  cardContentTop: {
    flex: 0,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  heroImageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  swipeHintRowWrapper: {
    width: '100%',
    paddingTop: 12,
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shortOverlay: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  longOverlay: {
    backgroundColor: 'rgba(22,163,74,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(22,163,74,0.4)',
  },
  overlayEmoji: {
    fontSize: 48,
  },
  overlayLabelShort: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ef4444',
  },
  overlayLabelLong: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16a34a',
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28,
    textAlign: 'center',
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    gap: 6,
  },
  hintPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  hintOrText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  hintArrow: {
    fontSize: 18,
    fontWeight: '900',
  },
  hintLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedbackFlash: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    minHeight: 100,
    justifyContent: 'center',
  },
  feedbackEmoji: {
    fontSize: 36,
  },
  feedbackExplanation: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    textAlign: 'center',
  },
  resultsBox: {
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
    alignItems: 'center',
    gap: 6,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0369a1',
  },
  resultScore: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  rewardLine: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
    marginTop: 4,
  },
  rewardRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  rewardPillCoin: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(250,204,21,0.18)',
  },
  rewardCoinText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#d4a017',
    fontVariant: ['tabular-nums'],
  },
  rewardPillXP: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.18)',
  },
  rewardXPText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#7c3aed',
  },
  replayBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  replayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  answeredIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  answeredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
  },
  answeredSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  eduToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  eduToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0891b2',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  eduCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    gap: 8,
  },
  eduCardOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    gap: 8,
    zIndex: 200,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  eduCloseBtn: {
    alignSelf: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  eduCloseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  eduTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0c4a6e',
  },
  eduBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
});
