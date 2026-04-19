/**
 * SIM 4-29: מיון המניות (Stock Sorter), Module 4-29
 * Stock cards with real metrics → user classifies by category → feedback.
 */

import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  withSpring,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import { useStockSorter } from './useStockSorter';
import {
  TOTAL_QUESTIONS,
  QUESTION_LABELS,
  ANSWER_OPTIONS,
} from './stockSorterData';
import {
  SIM4,
  SHADOW_STRONG,
  SHADOW_LIGHT,
  RTL,
  sim4Styles,
  GRADE_COLORS4,
} from './simTheme';
import type { StockSorterScore, SortQuestion } from './stockSorterTypes';


/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function formatMarketCap(capB: number): string {
  if (capB >= 1000) return `$${(capB / 1000).toFixed(1)}T`;
  return `$${capB}B`;
}

/* ================================================================== */
/*  ProgressDots, 8 round indicators                                   */
/* ================================================================== */

function ProgressDots({
  total,
  current,
  answers,
  correctAnswers,
}: {
  total: number;
  current: number;
  answers: (string | null)[];
  correctAnswers: string[];
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const answer = answers[i];
        let bg = 'rgba(255,255,255,0.25)';
        let borderColor = 'rgba(255,255,255,0.4)';

        if (answer !== null && answer !== undefined) {
          const correct = answer === correctAnswers[i];
          bg = correct ? '#4ade80' : '#ef4444';
          borderColor = correct ? '#22c55e' : '#dc2626';
        } else if (i === current) {
          bg = 'rgba(255,255,255,0.6)';
          borderColor = '#ffffff';
        }

        return (
          <View
            key={i}
            style={[dotStyles.dot, { backgroundColor: bg, borderColor }]}
          />
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  StockCardDisplay, stock info with metrics                          */
/* ================================================================== */

function StockCardDisplay({
  question,
  feedbackScale,
}: {
  question: SortQuestion;
  feedbackScale: SharedValue<number>;
}) {
  const { card } = question;
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: feedbackScale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <GlowCard glowColor="rgba(129,140,248,0.15)" style={{ backgroundColor: SIM4.cardBg }}>
        <View style={cardStyles.container}>
          {/* Header: ticker badge + name */}
          <View style={cardStyles.header}>
            <View style={{ backgroundColor: '#0c4a6e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 4 }}>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>{card.ticker}</Text>
            </View>
            <Text style={cardStyles.stockName}>{card.name}</Text>
          </View>

          {/* Metrics grid */}
          <View style={cardStyles.metricsGrid}>
            <View style={cardStyles.metricItem}>
              <Text style={[cardStyles.metricLabel, RTL]}>שווי שוק</Text>
              <Text style={cardStyles.metricValue}>{formatMarketCap(card.marketCapB)}</Text>
            </View>
            <View style={cardStyles.metricItem}>
              <Text style={[cardStyles.metricLabel, RTL]}>מכפיל רווח</Text>
              <Text style={cardStyles.metricValue}>{card.peRatio}</Text>
            </View>
            <View style={cardStyles.metricItem}>
              <Text style={[cardStyles.metricLabel, RTL]}>תשואת דיבידנד</Text>
              <Text style={cardStyles.metricValue}>{card.dividendYield}%</Text>
            </View>
            <View style={cardStyles.metricItem}>
              <Text style={[cardStyles.metricLabel, RTL]}>סקטור</Text>
              <Text style={[cardStyles.metricValue, RTL]}>{card.sector}</Text>
            </View>
          </View>

          {/* Question */}
          <View style={cardStyles.questionContainer}>
            <Text style={[cardStyles.questionText, RTL]}>
              {QUESTION_LABELS[question.questionType]}
            </Text>
          </View>
        </View>
      </GlowCard>
    </Animated.View>
  );
}

/* ================================================================== */
/*  ScoreScreen, results after all 8 questions                         */
/* ================================================================== */

function ScoreScreen({
  score,
  questions,
  answers,
  onReplay,
  onContinue,
}: {
  score: StockSorterScore;
  questions: SortQuestion[];
  answers: (string | null)[];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S' || score.grade === 'A');

  return (
    <ScrollView style={scoreStyles.scroll} contentContainerStyle={scoreStyles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: GRADE_COLORS4[score.grade] }]}>
          {score.grade}
        </Text>
        <Text style={sim4Styles.gradeLabel}>{score.gradeLabel}</Text>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHECK} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>תשובות נכונות</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: '#16a34a' }]}>
                {score.correctCount}/{score.totalQuestions}
              </Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_STAR} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>דיוק</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: SIM4.dark }]}>
                {score.accuracy}%
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Per-question breakdown */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>פירוט לפי מנייה</Text>
            {questions.map((q, i) => {
              const playerAnswer = answers[i];
              const correct = playerAnswer === q.correctAnswer;
              return (
                <View key={q.card.id} style={scoreStyles.breakdownRow}>
                  <View style={scoreStyles.breakdownLeft}>
                    <View style={{ backgroundColor: '#0c4a6e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>{q.card.ticker}</Text>
                    </View>
                    <Text style={[scoreStyles.breakdownName, RTL]}>
                      {q.card.name}
                    </Text>
                  </View>
                  <View style={scoreStyles.breakdownRight}>
                    <Text style={[scoreStyles.breakdownVerdict, { color: correct ? '#16a34a' : '#ef4444' }]}>
                      {correct ? '✓' : '✗'}
                    </Text>
                    <Text style={[scoreStyles.breakdownAnswer, RTL]}>
                      {q.correctAnswer}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Lesson */}
      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim4Styles.insightText, RTL, { flex: 1 }]}>
                סיווג מניות עוזר לבנות תיק מגוון. מניות צמיחה נותנות פוטנציאל, מניות ערך נותנות יציבות, השילוב הנכון הוא המפתח.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(400)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  Main Screen                                                         */
/* ================================================================== */

interface StockSorterScreenProps {
  onComplete?: (score: number) => void;
}

export function StockSorterScreen({ onComplete }: StockSorterScreenProps) {
  const {
    state,
    config,
    currentQuestion,
    showingFeedback,
    currentAnswerCorrect,
    score,
    submitAnswer,
    nextQuestion,
    reset,
  } = useStockSorter();


  const rewardsGranted = useRef(false);

  // Grant rewards on completion
  const prevComplete = useRef(false);
  if (state.isComplete && !prevComplete.current) {
    prevComplete.current = true;
    if (!rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }

  // Button pulse animation
  const btnPulse = useSharedValue(1);
  const pulseActive = !showingFeedback && !state.isComplete;

  if (pulseActive) {
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );
  } else {
    cancelAnimation(btnPulse);
    btnPulse.value = withTiming(1, { duration: 200 });
  }

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  // Card feedback animation (green pulse or red shake)
  const cardScale = useSharedValue(1);

  const handleAnswer = useCallback(
    (answer: string) => {
      tapHaptic();
      submitAnswer(answer);

      // Determine correctness for animation
      if (currentQuestion) {
        const isCorrect = answer === currentQuestion.correctAnswer;
        if (isCorrect) {
          successHaptic();
          cardScale.value = withSequence(
            withSpring(1.05, { damping: 8 }),
            withSpring(1, { damping: 12 }),
          );
        } else {
          errorHaptic();
          cardScale.value = withSequence(
            withTiming(0.97, { duration: 80 }),
            withTiming(1.02, { duration: 80 }),
            withTiming(0.98, { duration: 80 }),
            withTiming(1, { duration: 100 }),
          );
        }
      }
    },
    [submitAnswer, currentQuestion, cardScale],
  );

  const handleNext = useCallback(() => {
    tapHaptic();
    cardScale.value = 1;
    nextQuestion();
  }, [nextQuestion, cardScale]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    prevComplete.current = false;
    cardScale.value = 1;
    reset();
  }, [reset, cardScale]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    const gradeScore = score
      ? { S: 100, A: 85, B: 65, C: 45, F: 20 }[score.grade]
      : 50;
    onComplete?.(gradeScore);
  }, [onComplete, score]);

  const correctAnswers = config.questions.map((q) => q.correctAnswer);

  // Feedback message
  const feedback =
    showingFeedback && currentQuestion
      ? {
          isCorrect: currentAnswerCorrect === true,
          message: currentAnswerCorrect
            ? `נכון! ${currentQuestion.card.name} היא אכן ${currentQuestion.correctAnswer}`
            : `לא נכון, ${currentQuestion.card.name} היא ${currentQuestion.correctAnswer}`,
        }
      : null;

  // ── Score Phase ───────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScoreScreen
          score={score}
          questions={config.questions}
          answers={state.answers}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Game Phase ────────────────────────────────────────────────────
  const answerOptions = currentQuestion
    ? ANSWER_OPTIONS[currentQuestion.questionType]
    : [];

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <View style={styles.container}>
        <View style={{ flex: 1, padding: 12 }}>
          {/* Title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.titleRow}>
              <View accessible={false}><LottieIcon source={LOTTIE_STAR} size={28} /></View>
              <Text accessibilityRole="header" style={styles.title}>מיון המניות</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              סווג כל מנייה לקטגוריה הנכונה
            </Text>
          </Animated.View>

          {/* Progress dots */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <ProgressDots
              total={TOTAL_QUESTIONS}
              current={state.currentQuestionIndex}
              answers={state.answers}
              correctAnswers={correctAnswers}
            />
            <Text style={styles.progressText}>
              {state.currentQuestionIndex + 1} / {TOTAL_QUESTIONS}
            </Text>
          </Animated.View>

          {/* Stock card */}
          {currentQuestion && (
            <Animated.View entering={FadeInUp.delay(200)} key={currentQuestion.card.id}>
              <StockCardDisplay
                question={currentQuestion}
                feedbackScale={cardScale}
              />
            </Animated.View>
          )}

          {/* Choice buttons (only when not showing feedback) */}
          {!showingFeedback && currentQuestion && (
            <Animated.View entering={FadeInUp.delay(300)} style={styles.choiceRow}>
              {answerOptions.map((option) => (
                <Animated.View key={option} style={[{ flex: 1 }, btnPulseStyle]}>
                  <AnimatedPressable
                    onPress={() => handleAnswer(option)}
                    style={styles.choiceBtn}
                    accessibilityRole="button"
                    accessibilityLabel={option}
                  >
                    <Text style={[styles.choiceBtnText, RTL]}>{option}</Text>
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Feedback overlay, centered on screen like quizzes */}
        {showingFeedback && currentQuestion && (
        <Animated.View
          entering={FadeIn.duration(250)}
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 24,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
            alignItems: 'center',
            gap: 16,
          }}>
            {/* Result icon */}
            <Text style={{ fontSize: 48 }}>{currentAnswerCorrect ? '✅' : '❌'}</Text>

            {/* Result text */}
            <Text style={[RTL, {
              fontSize: 18,
              fontWeight: '900',
              color: currentAnswerCorrect ? '#166534' : '#991b1b',
              textAlign: 'center',
            }]}>
              {currentAnswerCorrect ? 'נכון!' : `התשובה: ${currentQuestion.correctAnswer}`}
            </Text>

            {/* Explanation */}
            <View style={{
              backgroundColor: currentAnswerCorrect ? '#f0fdf4' : '#fef2f2',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: currentAnswerCorrect ? '#bbf7d0' : '#fecaca',
              width: '100%',
            }}>
              <Text style={[RTL, {
                color: currentAnswerCorrect ? '#166534' : '#991b1b',
                fontSize: 14,
                fontWeight: '600',
                lineHeight: 22,
                textAlign: 'center',
              }]}>
                {currentQuestion.card.explanationHe}
              </Text>
            </View>

            {/* Continue button */}
            <AnimatedPressable onPress={handleNext} style={styles.nextBtn} accessibilityRole="button" accessibilityLabel={state.currentQuestionIndex < TOTAL_QUESTIONS - 1 ? 'למניה הבאה' : 'לתוצאות'}>
              <Text style={[styles.nextBtnText, { fontSize: 18, writingDirection: 'rtl' }]}>
                {state.currentQuestionIndex < TOTAL_QUESTIONS - 1 ? 'למניה הבאה' : 'לתוצאות'}
              </Text>
              <View style={{ position: 'absolute', left: 16 }} accessible={false}>
                <LottieIcon source={LOTTIE_ARROW} size={22} />
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>
        )}
      </View>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: SIM4.textOnGradient,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM4.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  progressText: {
    color: SIM4.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    ...SHADOW_LIGHT,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  choiceBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#312e81',
    shadowColor: SIM4.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  choiceBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  feedbackCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  feedbackEmoji: {
    fontSize: 24,
  },
  feedbackText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
  nextBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 4,
    borderBottomColor: '#312e81',
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});

const cardStyles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 40,
  },
  stockName: {
    color: SIM4.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  ticker: {
    color: SIM4.textMuted,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricItem: {
    flex: 1,
    minWidth: '42%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricLabel: {
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    color: SIM4.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  questionContainer: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  questionText: {
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});

const scoreStyles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  breakdownTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  breakdownLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  breakdownEmoji: {
    fontSize: 20,
  },
  breakdownName: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  breakdownRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  breakdownVerdict: {
    fontSize: 18,
    fontWeight: '900',
  },
  breakdownAnswer: {
    color: SIM4.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
