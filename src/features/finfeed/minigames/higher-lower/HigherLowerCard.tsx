import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { errorHaptic, heavyHaptic, successHaptic, tapHaptic } from '../../../../utils/haptics';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../../components/ui/FlyingRewards';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import { CHALLENGE_COIN_REWARD, CHALLENGE_XP_REWARD, MAX_DAILY_PLAYS } from '../../../daily-challenges/daily-challenge-types';

import { HIGHER_LOWER_SCENARIOS, getRandomScenario } from './higherLowerData';
import type { HigherLowerScenario } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 72;
const CARD_H = Math.min(520, CARD_W * 1.45);
const SWIPE_THRESHOLD = 90;
const SWIPE_OUT_X = SCREEN_W * 1.4;

const BLUE_GRADIENT: [string, string] = ['#0ea5e9', '#0369a1'];
const DEEP_BLUE_GRADIENT: [string, string] = ['#1e3a8a', '#0c4a6e'];

const CARDS_PER_SESSION = 4;

interface Props {
  isActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Swipeable scenario card                                           */
/* ------------------------------------------------------------------ */

function SwipeCard({
  scenario,
  onPick,
  isTop,
}: {
  scenario: HigherLowerScenario;
  onPick: (side: 'left' | 'right') => void;
  isTop: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const firePick = useCallback((side: 'left' | 'right') => onPick(side), [onPick]);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (!isTop) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      if (!isTop) return;
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const side: 'left' | 'right' = e.translationX > 0 ? 'right' : 'left';
        const target = side === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X;
        translateX.value = withTiming(target, { duration: 260 });
        runOnJS(firePick)(side);
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-14, 14], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={isTop ? gesture : Gesture.Pan()}>
      <Animated.View
        style={[styles.card, cardStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={scenario.question}
        accessibilityHint="החלק שמאלה לבחירה באפשרות השמאלית, ימינה לימנית"
      >
        <Text style={[styles.category, RTL_CENTER]}>שוק ההון · תרחיש</Text>
        <Text style={[styles.question, RTL_CENTER]}>{scenario.question}</Text>

        <View style={styles.optionsStack}>
          <OptionRow side="right" title={scenario.rightSide.title} subtitle={scenario.rightSide.subtitle} />
          <View style={styles.vsRow}>
            <View style={styles.vsLine} />
            <Text style={styles.vsText}>לעומת</Text>
            <View style={styles.vsLine} />
          </View>
          <OptionRow side="left" title={scenario.leftSide.title} subtitle={scenario.leftSide.subtitle} />
        </View>

        <View style={styles.hintsRow}>
          <Text style={styles.hintLeftText}>בחר שמאל ←</Text>
          <Text style={styles.hintRightText}>→ בחר ימין</Text>
        </View>

        {/* Swipe overlays */}
        <Animated.View style={[styles.swipeOverlay, styles.swipeOverlayLeft, leftOverlayStyle]}>
          <Text style={styles.swipeOverlayText}>שמאל ←</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeOverlay, styles.swipeOverlayRight, rightOverlayStyle]}>
          <Text style={styles.swipeOverlayText}>→ ימין</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function OptionRow({ side, title, subtitle }: { side: 'left' | 'right'; title: string; subtitle?: string }) {
  const gradient = side === 'right' ? BLUE_GRADIENT : DEEP_BLUE_GRADIENT;
  return (
    <View style={styles.optionRow}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.optionSideBadge}>
        <Text style={styles.optionSideBadgeText}>{side === 'right' ? 'ימין' : 'שמאל'}</Text>
      </View>
      <View style={styles.optionTextCol}>
        <Text style={[styles.optionTitle, RTL]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.optionSubtitle, RTL]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function BackCard({ offset }: { offset: number }) {
  const scale = 1 - offset * 0.04;
  const translateY = offset * 8;
  return (
    <View
      accessible={false}
      style={[
        styles.card,
        styles.backCard,
        { transform: [{ scale }, { translateY }], zIndex: -offset, opacity: 1 - offset * 0.25 },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Feedback modal content                                            */
/* ------------------------------------------------------------------ */

function FeedbackCard({
  scenario,
  userCorrect,
  onNext,
  isLast,
}: {
  scenario: HigherLowerScenario;
  userCorrect: boolean;
  onNext: () => void;
  isLast: boolean;
}) {
  const source = userCorrect ? FINN_HAPPY : FINN_EMPATHIC;
  const headerColor = userCorrect ? '#16a34a' : '#dc2626';
  const title = userCorrect ? 'ניחוש חכם' : 'הפעם פספסת — ככה לומדים';

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <ExpoImage source={source} style={styles.sharkAvatar} contentFit="cover" accessible={false} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.feedbackTitle, RTL, { color: headerColor }]}>{title}</Text>
          <Text style={[styles.feedbackSubtitle, RTL]}>קפטן שארק מסביר</Text>
        </View>
      </View>

      <Text style={[styles.feedbackBody, RTL]}>{scenario.explanation}</Text>

      <View style={styles.punchlineRow}>
        <View style={styles.punchlineBar} />
        <Text style={[styles.punchlineText, RTL]} numberOfLines={2}>
          {scenario.punchline}
        </Text>
      </View>

      <View style={styles.riskCallout}>
        <Text style={[styles.riskCalloutLabel, RTL]}>למה זה חשוב?</Text>
        <Text style={[styles.riskCalloutBody, RTL]}>
          שוק ההון מסוכן למי שלא מבין אותו. הדרך היחידה לנטרל את הסיכון היא ללמוד להכיר את הכלים — ואת זה בדיוק אתם עושים עכשיו.
        </Text>
      </View>

      <Animated.View entering={FadeIn.delay(200).duration(300)}>
        <View
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'סיים' : 'הבא'}
          style={styles.nextBtnWrap}
          onTouchEnd={onNext}
        >
          <LinearGradient colors={BLUE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>{isLast ? 'סיימנו' : 'הבא ←'}</Text>
          </LinearGradient>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main card                                                         */
/* ------------------------------------------------------------------ */

export const HigherLowerCard = React.memo(function HigherLowerCard({ isActive: _isActive }: Props) {
  const playHigherLower = useDailyChallengesStore((s) => s.playHigherLower);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasHigherLowerPlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getHigherLowerPlaysToday());

  const [deck] = useState<HigherLowerScenario[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const baseSeedCount = playsToday;
    const result: HigherLowerScenario[] = [];
    const seenIds = new Set<string>();
    for (let i = 0; i < CARDS_PER_SESSION; i++) {
      const s = getRandomScenario(today, baseSeedCount + i);
      if (!seenIds.has(s.id)) {
        result.push(s);
        seenIds.add(s.id);
      }
    }
    // Fallback: pad with linear scan if dedupe shrank the deck
    if (result.length < CARDS_PER_SESSION) {
      for (const s of HIGHER_LOWER_SCENARIOS) {
        if (result.length >= CARDS_PER_SESSION) break;
        if (!seenIds.has(s.id)) {
          result.push(s);
          seenIds.add(s.id);
        }
      }
    }
    return result;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ scenario: HigherLowerScenario; correct: boolean } | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingRewards, setShowFlyingRewards] = useState(false);
  const [done, setDone] = useState(false);
  const finalizedRef = useRef(false);

  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);
  const cardsRemaining = deck.length - currentIndex;

  const finalize = useCallback(
    (totalCorrect: number) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const today = new Date().toISOString().slice(0, 10);
      playHigherLower(today, totalCorrect > 0);

      const log = useDailyLogStore.getState();
      log.logEvent({
        type: 'higher-lower',
        title: 'מי מנצח',
        timestamp: Date.now(),
        xpEarned: totalCorrect > 0 ? CHALLENGE_XP_REWARD : 0,
      });
      if (totalCorrect > 0) {
        log.addTodayXP(CHALLENGE_XP_REWARD);
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
        log.addCorrectAnswer();
      }
    },
    [playHigherLower],
  );

  const handlePick = useCallback(
    (side: 'left' | 'right') => {
      const scenario = deck[currentIndex];
      if (!scenario) return;
      const correct = side === scenario.correctSide;
      if (correct) {
        heavyHaptic();
        setSessionCorrect((n) => n + 1);
      } else {
        errorHaptic();
        setSessionWrong((n) => n + 1);
      }
      setFeedback({ scenario, correct });
    },
    [deck, currentIndex],
  );

  const handleNext = useCallback(() => {
    tapHaptic();
    const nextIdx = currentIndex + 1;
    setFeedback(null);
    if (nextIdx >= deck.length) {
      setDone(true);
      const finalCorrect = sessionCorrect + (feedback?.correct ? 0 : 0);
      finalize(sessionCorrect + (feedback?.correct ? 0 : 0));
      if (finalCorrect > 0 || sessionCorrect > 0) {
        successHaptic();
        setShowConfetti(true);
        setShowFlyingRewards(true);
        setTimeout(() => setShowConfetti(false), 2400);
      }
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [currentIndex, deck.length, feedback?.correct, finalize, sessionCorrect]);

  const visibleCards = useMemo(() => deck.slice(currentIndex), [deck, currentIndex]);

  /* Already played today */
  if (hasPlayedToday && !done) {
    return (
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, RTL_CENTER]}>מי מנצח — הושלם להיום</Text>
          <Text style={[styles.doneSub, RTL_CENTER]}>חזרו מחר לתרחישים חדשים</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingRewards && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingRewards(false)}
        />
      )}

      <View style={styles.cardShell}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.headerRow}>
          <ExpoImage source={FINN_STANDARD} style={styles.headerAvatar} contentFit="contain" accessible={false} />
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, RTL]}>מי מנצח?</Text>
            <Text style={[styles.headerSub, RTL]}>
              {done
                ? `סיימתם! ${sessionCorrect}/${deck.length} נכונות`
                : `שוק ההון מסוכן — אבל אפשר ללמוד. ${remainingPlays}/${MAX_DAILY_PLAYS} סבבים`}
            </Text>
          </View>
        </Animated.View>

        {/* Score row */}
        {!done && (
          <View style={styles.scoreRow}>
            <View style={[styles.scoreBadge, styles.correctBadge]}>
              <Text style={styles.scoreBadgeText}>✅ {sessionCorrect}</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={[styles.scoreBadge, styles.wrongBadge]}>
              <Text style={styles.scoreBadgeText}>❌ {sessionWrong}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={styles.remainingText}>{cardsRemaining} קלפים נותרו</Text>
          </View>
        )}

        {/* Deck area */}
        {!done && !feedback && visibleCards.length > 0 && (
          <View style={styles.deckArea}>
            {visibleCards.length > 2 && <BackCard offset={2} />}
            {visibleCards.length > 1 && <BackCard offset={1} />}
            <SwipeCard
              key={visibleCards[0].id}
              scenario={visibleCards[0]}
              onPick={handlePick}
              isTop
            />
          </View>
        )}

        {/* Feedback */}
        {feedback && (
          <FeedbackCard
            scenario={feedback.scenario}
            userCorrect={feedback.correct}
            onNext={handleNext}
            isLast={currentIndex + 1 >= deck.length}
          />
        )}

        {/* Done summary */}
        {done && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.summary}>
            <ExpoImage
              source={sessionCorrect >= deck.length / 2 ? FINN_HAPPY : FINN_EMPATHIC}
              style={styles.finLarge}
              contentFit="contain"
              accessible={false}
            />
            <Text style={[styles.doneTitle, RTL_CENTER]}>
              {sessionCorrect === deck.length ? 'מושלם!' : sessionCorrect >= deck.length / 2 ? 'עבודה טובה' : 'בפעם הבאה יהיה יותר טוב'}
            </Text>
            <Text style={[styles.doneScore, RTL_CENTER]}>
              {sessionCorrect}/{deck.length} נכונות
            </Text>
            <Text style={[styles.doneMessage, RTL_CENTER]}>
              שוק ההון לא נולדת איתו — לומדים אותו. כל תרחיש שזיהיתם נכון הוא סיכון שחסכתם לעצמכם.
            </Text>
            {sessionCorrect > 0 && (
              <View style={styles.rewardsRow}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillText}>+{CHALLENGE_XP_REWARD} XP</Text>
                </View>
                <View style={[styles.rewardPill, { backgroundColor: 'rgba(250,204,21,0.15)' }]}>
                  <Text style={[styles.rewardPillText, { color: '#d4a017' }]}>+{CHALLENGE_COIN_REWARD}</Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cardShell: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: { width: 44, height: 44 },
  headerTextCol: { flex: 1 },
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

  /* Score row */
  scoreRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  scoreBadge: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  correctBadge: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  wrongBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  scoreDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(15,23,42,0.15)',
  },
  remainingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    writingDirection: 'rtl',
  },

  /* Deck */
  deckArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CARD_H + 12,
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    justifyContent: 'space-between',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  backCard: {
    backgroundColor: '#e0f2fe',
    borderColor: 'rgba(14,165,233,0.15)',
  },
  category: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0369a1',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 24,
  },

  /* Options */
  optionsStack: {
    gap: 6,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 72,
  },
  optionSideBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  optionSideBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  optionSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  vsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(14,165,233,0.2)',
  },
  vsText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.4,
  },

  /* Hints */
  hintsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintLeftText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '700',
    opacity: 0.55,
  },
  hintRightText: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '700',
    opacity: 0.55,
  },

  /* Swipe overlays */
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeOverlayLeft: {
    backgroundColor: 'rgba(30,58,138,0.28)',
    borderWidth: 3,
    borderColor: '#1e3a8a',
  },
  swipeOverlayRight: {
    backgroundColor: 'rgba(14,165,233,0.28)',
    borderWidth: 3,
    borderColor: '#0ea5e9',
  },
  swipeOverlayText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  /* Feedback */
  feedbackCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    gap: 12,
  },
  feedbackHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  sharkAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e0f2fe',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  feedbackSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  feedbackBody: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 22,
  },
  punchlineRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'center',
  },
  punchlineBar: {
    width: 3,
    height: 24,
    backgroundColor: '#d4a017',
    borderRadius: 2,
  },
  punchlineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#0369a1',
  },
  riskCallout: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  riskCalloutLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#c2410c',
    letterSpacing: 0.3,
  },
  riskCalloutBody: {
    fontSize: 13,
    color: '#7c2d12',
    fontWeight: '600',
    lineHeight: 20,
  },
  nextBtnWrap: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  nextBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },

  /* Done */
  summary: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  finLarge: {
    width: 96,
    height: 96,
    alignSelf: 'center',
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0369a1',
  },
  doneScore: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  doneSub: {
    fontSize: 14,
    color: '#64748b',
  },
  doneMessage: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  rewardsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  rewardPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.18)',
  },
  rewardPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7c3aed',
  },
});
