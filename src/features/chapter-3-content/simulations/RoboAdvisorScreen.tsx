import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { getChapterTheme } from '../../../constants/theme';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useRoboAdvisor } from './useRoboAdvisor';
import { SIM3, GRADE_COLORS3, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE3, sim3Styles } from './simTheme';
import type { RiskQuestion, RiskOption } from './roboAdvisorTypes';
import { formatShekel } from '../../../utils/format';

/* ── Chapter-3 theme (for gradient only) ── */
const _th3 = getChapterTheme('chapter-3');

/* ── Lottie assets ── */
const LOTTIE_PROCESS = require('../../../../assets/lottie/wired-flat-974-process-flow-game-plan-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_BRAIN = require('../../../../assets/lottie/wired-flat-426-brain-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');


const GRADE_COLORS = GRADE_COLORS3 as Record<string, string>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_CHART_WIDTH = SCREEN_WIDTH - 64;
const BAR_CHART_HEIGHT = 140;

const ASSET_COLORS = {
  stocks: '#8b5cf6',
  bonds: '#38bdf8',
  cash: '#22c55e',
};

/* ================================================================== */
/*  QuizQuestionCard                                                    */
/* ================================================================== */

function QuizQuestionCard({
  question,
  selectedOptionId,
  onSelect,
}: {
  question: RiskQuestion;
  selectedOptionId: string | null;
  onSelect: (optionId: string, riskScore: number) => void;
}) {
  const emojiLottieMap: Record<string, ReturnType<typeof require>> = {
    '🤖': LOTTIE_PROCESS,
    '😰': LOTTIE_SHIELD,
    '💡': LOTTIE_BULB,
  };
  const lottieSrc = emojiLottieMap[question.emoji] ?? LOTTIE_BRAIN;

  return (
    <Animated.View entering={FadeInDown.springify().damping(20)} style={quizStyles.card}>
      <View accessible={false} style={{ alignItems: 'center', marginBottom: 8 }}>
        <LottieIcon source={lottieSrc} size={40} />
      </View>
      <Text style={[quizStyles.question, RTL]}>{question.question}</Text>
      <View style={quizStyles.optionsContainer}>
        {question.options.map((option: RiskOption) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <AnimatedPressable
              key={option.id}
              onPress={() => {
                tapHaptic();
                onSelect(option.id, option.riskScore);
              }}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityHint="בוחר תשובה לשאלת הסיכון"
              accessibilityState={{ selected: isSelected }}
              style={[
                quizStyles.optionButton,
                isSelected && quizStyles.optionSelected,
              ]}
            >
              <Text
                style={[
                  quizStyles.optionText,
                  RTL,
                  isSelected && quizStyles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

/* ================================================================== */
/*  AllocationPieBar — horizontal bar showing allocation %s             */
/* ================================================================== */

function AllocationPieBar({
  stocks,
  bonds,
  cash,
}: {
  stocks: number;
  bonds: number;
  cash: number;
}) {
  return (
    <View style={allocationStyles.container}>
      <View style={allocationStyles.barTrack}>
        <Animated.View
          entering={FadeIn.duration(600)}
          style={[
            allocationStyles.barSegment,
            { flex: stocks, backgroundColor: ASSET_COLORS.stocks },
          ]}
        />
        <Animated.View
          entering={FadeIn.duration(600).delay(200)}
          style={[
            allocationStyles.barSegment,
            { flex: bonds, backgroundColor: ASSET_COLORS.bonds },
          ]}
        />
        <Animated.View
          entering={FadeIn.duration(600).delay(400)}
          style={[
            allocationStyles.barSegment,
            { flex: cash, backgroundColor: ASSET_COLORS.cash },
          ]}
        />
      </View>
      <View style={allocationStyles.labelsRow}>
        <View style={allocationStyles.labelItem}>
          <View style={[allocationStyles.labelDot, { backgroundColor: ASSET_COLORS.stocks }]} />
          <Text style={allocationStyles.labelText}>מניות {Math.round(stocks)}%</Text>
        </View>
        <View style={allocationStyles.labelItem}>
          <View style={[allocationStyles.labelDot, { backgroundColor: ASSET_COLORS.bonds }]} />
          <Text style={allocationStyles.labelText}>אג״ח {Math.round(bonds)}%</Text>
        </View>
        <View style={allocationStyles.labelItem}>
          <View style={[allocationStyles.labelDot, { backgroundColor: ASSET_COLORS.cash }]} />
          <Text style={allocationStyles.labelText}>מזומן {Math.round(cash)}%</Text>
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  DualBarChart — side-by-side robo vs manual history                 */
/* ================================================================== */

function DualBarChart({
  roboHistory,
  manualHistory,
}: {
  roboHistory: number[];
  manualHistory: number[];
}) {
  const allValues = [...roboHistory, ...manualHistory];
  const maxVal = Math.max(...allValues) * 1.1;
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  const barCount = roboHistory.length;
  const barGroupWidth = BAR_CHART_WIDTH / Math.max(barCount, 1);
  const barWidth = barGroupWidth * 0.35;

  return (
    <View style={chartStyles.container}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{formatShekel(maxVal)}</Text>
        <Text style={chartStyles.yLabel}>{formatShekel((maxVal + minVal) / 2)}</Text>
        <Text style={chartStyles.yLabel}>{formatShekel(minVal)}</Text>
      </View>
      {/* Bars */}
      <View style={chartStyles.barsArea}>
        {roboHistory.map((roboVal, i) => {
          const manualVal = manualHistory[i] ?? roboVal;
          const roboH = ((roboVal - minVal) / range) * BAR_CHART_HEIGHT;
          const manualH = ((manualVal - minVal) / range) * BAR_CHART_HEIGHT;
          return (
            <View key={i} style={[chartStyles.barGroup, { width: barGroupWidth }]}>
              <View style={chartStyles.barsRow}>
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: roboH,
                      width: barWidth,
                      backgroundColor: '#8b5cf6',
                    },
                  ]}
                />
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: manualH,
                      width: barWidth,
                      backgroundColor: 'rgba(239,68,68,0.7)',
                    },
                  ]}
                />
              </View>
              <Text style={chartStyles.xLabel}>{i === 0 ? 'התחלה' : `שנה ${i}`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ================================================================== */
/*  SpeedSelector                                                       */
/* ================================================================== */

function SpeedSelector({
  speed,
  onChangeSpeed,
}: {
  speed: number;
  onChangeSpeed: (s: 1 | 3 | 5) => void;
}) {
  const speeds: Array<1 | 3 | 5> = [1, 3, 5];
  return (
    <View style={speedStyles.container}>
      {speeds.map((s) => (
        <AnimatedPressable
          key={s}
          onPress={() => {
            tapHaptic();
            onChangeSpeed(s);
          }}
          accessibilityRole="button"
          accessibilityLabel={`מהירות ${s}x`}
          accessibilityHint="משנה את מהירות הסימולציה"
          accessibilityState={{ selected: speed === s }}
          style={[speedStyles.button, speed === s && speedStyles.buttonActive]}
        >
          <Text style={[speedStyles.text, speed === s && speedStyles.textActive]}>{s}x</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

/* ================================================================== */
/*  ScoreScreen — results phase                                         */
/* ================================================================== */

function ScoreScreen({
  score,
  state,
  onReplay,
  onContinue,
}: {
  score: NonNullable<ReturnType<typeof useRoboAdvisor>['score']>;
  state: ReturnType<typeof useRoboAdvisor>['state'];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S');
  const gradeColor = GRADE_COLORS[score.grade] ?? SIM3.textPrimary;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
    >
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade Banner */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim3Styles.gradeContainer}>
        <Text style={[sim3Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <Text style={[sim3Styles.gradeLabel, RTL]}>{score.gradeLabel}</Text>
      </Animated.View>

      {/* Risk Profile */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim3Styles.scoreCard}>
          <View style={sim3Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LottieIcon source={LOTTIE_BRAIN} size={28} />
              <Text style={[{ fontSize: 16, fontWeight: '700', color: SIM3.textPrimary }, RTL]}>פרופיל הסיכון שלך</Text>
            </View>
            <Text style={[{ fontSize: 24, fontWeight: '900', color: SIM3.primary }, RTL]}>
              {score.riskProfileLabel}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Comparison */}
      <Animated.View entering={FadeInUp.delay(200)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim3Styles.scoreCardInner}>
            <Text style={[{ fontSize: 16, fontWeight: '700', color: SIM3.textPrimary, marginBottom: 8 }, RTL]}>השוואה סופית</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <LottieIcon source={LOTTIE_PROCESS} size={22} />
                  <Text style={{ color: SIM3.textSecondary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>רובוט</Text>
                </View>
                <Text style={[styles.comparisonValue, { color: SIM3.dark }]}>
                  {formatShekel(score.roboFinalBalance)}
                </Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonItem}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <LottieIcon source={LOTTIE_SHIELD} size={22} />
                  <Text style={{ color: SIM3.textSecondary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>ידני</Text>
                </View>
                <Text style={[styles.comparisonValue, { color: '#ef4444' }]}>
                  {formatShekel(score.manualFinalBalance)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Advantage */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim3Styles.scoreCardInner}>
            <Text style={[{ fontSize: 16, fontWeight: '700', color: SIM3.textPrimary, marginBottom: 8 }, RTL]}>
              הרובוט הרוויח {score.roboAdvantagePercent}% יותר כי הוא לא פחד
            </Text>
            <Text style={[styles.advantageValue, { color: '#f59e0b' }]}>
              +{formatShekel(score.roboAdvantageShekel)}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim3Styles.scoreCardInner}>
            <View style={sim3Styles.scoreRow}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_BALANCE} size={22} />
                <Text style={[sim3Styles.scoreRowLabel, RTL]}>מספר איזונים מחדש</Text>
              </View>
              <Text style={[sim3Styles.scoreRowValue, { color: SIM3.textPrimary }]}>{score.rebalanceCount}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Key Lesson */}
      <Animated.View entering={FadeInUp.delay(500)}>
        <View style={[sim3Styles.insightRow, { marginTop: 16, borderTopWidth: 0 }]}>
          <LottieIcon source={LOTTIE_BULB} size={28} />
          <Text style={[sim3Styles.insightText, RTL, { flex: 1 }]}>
            לא חייבים להיות מומחים. שגר ושכח עם רובוט = פחות טעויות, יותר כסף.
          </Text>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(750)} style={sim3Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש" style={sim3Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={22} /></View>
          <Text style={sim3Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא" style={sim3Styles.continueBtn}>
          <Text style={sim3Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  Helper                                                              */
/* ================================================================== */

/* ================================================================== */
/*  Main Screen                                                         */
/* ================================================================== */

interface RoboAdvisorScreenProps {
  onComplete?: () => void;
}

export function RoboAdvisorScreen({ onComplete }: RoboAdvisorScreenProps) {
  const {
    state,
    config,
    currentMarketYear,
    speed,
    answerQuestion,
    finishQuiz,
    startSimulation,
    advanceYear,
    startPlaying,
    stopPlaying,
    changeSpeed,
    reset,
    score,
  } = useRoboAdvisor();

  const rewardsGranted = useRef(false);
  const buildingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track selected option IDs per question for quiz UI
  const [quizSelections, setQuizSelections] = useState<Record<string, string>>({});
  // Rebalance indicator
  const [showRebalanceIndicator, setShowRebalanceIndicator] = useState(false);
  const prevRebalanceCount = useRef(state.rebalanceCount);

  // Balance animation
  const roboScale = useSharedValue(1);
  const manualScale = useSharedValue(1);
  const prevRoboBalance = useRef(state.roboBalance);
  const prevManualBalance = useRef(state.manualBalance);

  // Building phase pulse animation
  const buildPulse = useSharedValue(1);

  // Animate robo balance changes
  useEffect(() => {
    if (state.phase !== 'simulating') return;
    const diff = state.roboBalance - prevRoboBalance.current;
    prevRoboBalance.current = state.roboBalance;
    if (Math.abs(diff) > 500) {
      roboScale.value = withSequence(
        withSpring(1.03, { damping: 22, stiffness: 200 }),
        withSpring(1, { damping: 22, stiffness: 150 }),
      );
      if (diff > 0) {
        successHaptic();
      }
    }
  }, [state.roboBalance, state.phase, roboScale]);

  // Animate manual balance changes
  useEffect(() => {
    if (state.phase !== 'simulating') return;
    const diff = state.manualBalance - prevManualBalance.current;
    prevManualBalance.current = state.manualBalance;
    if (diff < -3000) {
      manualScale.value = withSequence(
        withSpring(0.98, { damping: 22, stiffness: 200 }),
        withSpring(1, { damping: 22, stiffness: 150 }),
      );
      heavyHaptic();
    }
  }, [state.manualBalance, state.phase, manualScale]);

  // Rebalance indicator
  useEffect(() => {
    if (state.rebalanceCount > prevRebalanceCount.current) {
      setShowRebalanceIndicator(true);
      const timer = setTimeout(() => setShowRebalanceIndicator(false), 1500);
      prevRebalanceCount.current = state.rebalanceCount;
      return () => clearTimeout(timer);
    }
    prevRebalanceCount.current = state.rebalanceCount;
  }, [state.rebalanceCount]);

  // Building phase: auto-transition after animation
  useEffect(() => {
    if (state.phase === 'building') {
      buildPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600 }),
        ),
        3,
        true,
      );
      buildingTimerRef.current = setTimeout(() => {
        startSimulation();
      }, 2500);
      return () => {
        if (buildingTimerRef.current) clearTimeout(buildingTimerRef.current);
      };
    }
  }, [state.phase, startSimulation, buildPulse]);

  // Grant rewards on completion
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const roboAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: roboScale.value }],
  }));

  const manualAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: manualScale.value }],
  }));

  const buildPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buildPulse.value }],
  }));

  // Quiz answer handler
  const handleQuizAnswer = useCallback(
    (questionId: string, optionId: string, riskScore: number) => {
      setQuizSelections((prev) => ({ ...prev, [questionId]: optionId }));
      answerQuestion(questionId, riskScore);
    },
    [answerQuestion],
  );

  const handleFinishQuiz = useCallback(() => {
    tapHaptic();
    finishQuiz();
  }, [finishQuiz]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    setQuizSelections({});
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    onComplete?.();
  }, [onComplete]);

  const handleTogglePlay = useCallback(() => {
    tapHaptic();
    if (state.isPlaying) {
      stopPlaying();
    } else {
      startPlaying();
    }
  }, [state.isPlaying, startPlaying, stopPlaying]);

  const allQuestionsAnswered =
    Object.keys(state.quizAnswers).length >= config.questions.length;

  const CH3_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-746-technology-integrated-circuits-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json'),
  ];

  // ── Results Phase ──────────────────────────────────────────────────
  if (state.phase === 'results' && score) {
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
        <ScoreScreen
        score={score}
        state={state}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // ── Quiz Phase ─────────────────────────────────────────────────────
  if (state.phase === 'quiz') {
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_PROCESS} size={28} /></View>
            <Text accessibilityRole="header" style={[TYPE3.title, { textAlign: 'center' }]}>שגר ושכח</Text>
          </View>
          <Text style={[TYPE3.subtitle, RTL, { marginTop: 4, textAlign: 'center' }]}>
            ענה על 3 שאלות ונבנה לך תיק השקעות מותאם אישית
          </Text>
        </Animated.View>

        {/* Risk Meter */}
        <Animated.View entering={FadeInUp.delay(100)} style={quizStyles.riskMeterContainer}>
          <Text style={[quizStyles.riskMeterLabel, RTL, { color: SIM3.textOnGradientMuted, ...SHADOW_LIGHT }]}>מד סיכון</Text>
          <View style={sim3Styles.progressTrack}>
            <Animated.View
              style={[
                sim3Styles.progressFill,
                { backgroundColor: SIM3.primary },
                {
                  width: `${
                    allQuestionsAnswered
                      ? (Object.values(state.quizAnswers).reduce((s, v) => s + v, 0) /
                          (config.questions.length * 5)) *
                        100
                      : Object.keys(state.quizAnswers).length > 0
                        ? (Object.values(state.quizAnswers).reduce((s, v) => s + v, 0) /
                            (config.questions.length * 5)) *
                          100
                        : 0
                  }%`,
                },
              ]}
            />
          </View>
          <View style={quizStyles.riskMeterLabelsRow}>
            <Text style={quizStyles.riskEndLabel}>שמרן</Text>
            <Text style={quizStyles.riskEndLabel}>אגרסיבי</Text>
          </View>
        </Animated.View>

        {/* Questions */}
        {config.questions.map((q) => (
          <QuizQuestionCard
            key={q.id}
            question={q}
            selectedOptionId={quizSelections[q.id] ?? null}
            onSelect={(optionId, riskScore) => handleQuizAnswer(q.id, optionId, riskScore)}
          />
        ))}

        {/* Finish Quiz Button */}
        {allQuestionsAnswered && (
          <Animated.View entering={FadeInUp.springify().damping(20)}>
            <AnimatedPressable onPress={handleFinishQuiz} accessibilityRole="button" accessibilityLabel="בנה תיק השקעות" accessibilityHint="מסיים את השאלון ובונה תיק השקעות מותאם" style={quizStyles.finishButton}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={22} /></View>
                <Text style={quizStyles.finishButtonText}>בנה תיק השקעות</Text>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}
      </ScrollView>
      </SimLottieBackground>
    );
  }

  // ── Building Phase ─────────────────────────────────────────────────
  if (state.phase === 'building' && state.allocation) {
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
      <View style={[{ flex: 1 }, styles.centerContent]}>
        <Animated.View entering={FadeIn.duration(400)} style={buildPulseStyle}>
          <View style={{ alignItems: 'center' }}>
            <LottieIcon source={LOTTIE_PROCESS} size={64} />
          </View>
          <Text style={[styles.title, { marginTop: 16 }]}>בונה את התיק שלך...</Text>
          <Text style={[styles.subtitle, RTL, { marginTop: 8 }]}>
            הרובוט מרכיב תיק השקעות מותאם
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600)} style={{ width: '100%', paddingHorizontal: 24 }}>
          <AllocationPieBar
            stocks={state.allocation.stocks}
            bonds={state.allocation.bonds}
            cash={state.allocation.cash}
          />
        </Animated.View>
      </View>
      </SimLottieBackground>
    );
  }

  // ── Simulating Phase ───────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <LottieIcon source={LOTTIE_PROCESS} size={28} />
          <Text style={styles.title}>vs</Text>
          <LottieIcon source={LOTTIE_SHIELD} size={28} />
        </View>
        <Text style={[styles.subtitle, RTL]}>
          שנה {state.currentYear} מתוך {config.marketHistory.length}
        </Text>
        <Text style={[styles.subtitle, RTL, { fontSize: 12, opacity: 0.9 }]}>
          {'נתוני אמת 2014-2023 · מניות: S&P 500 · אג"ח: Bloomberg US Aggregate'}
        </Text>
      </Animated.View>

      {/* Market Headline */}
      {currentMarketYear && (
        <Animated.View entering={FadeInDown.springify().damping(20)} style={simStyles.headlineCard}>
          <Text style={[simStyles.headlineText, RTL]}>
            {currentMarketYear.headline}
          </Text>
          <View style={simStyles.returnsRow}>
            <Text
              style={[
                simStyles.returnBadge,
                {
                  color: currentMarketYear.stockReturn >= 0 ? '#22c55e' : '#ef4444',
                },
              ]}
            >
              מניות: {currentMarketYear.stockReturn >= 0 ? '+' : ''}
              {(currentMarketYear.stockReturn * 100).toFixed(0)}%
            </Text>
            <Text
              style={[
                simStyles.returnBadge,
                {
                  color: currentMarketYear.bondReturn >= 0 ? '#38bdf8' : '#ef4444',
                },
              ]}
            >
              אג״ח: +{(currentMarketYear.bondReturn * 100).toFixed(0)}%
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Dual Balances */}
      <View style={simStyles.balancesRow}>
        <Animated.View style={[simStyles.balanceCard, simStyles.roboCard, roboAnimStyle]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <LottieIcon source={LOTTIE_PROCESS} size={18} />
            <Text style={simStyles.balanceLabel}>רובוט</Text>
          </View>
          <Text style={[simStyles.balanceValue, { color: SIM3.dark }]}>
            {formatShekel(state.roboBalance)}
          </Text>
          {showRebalanceIndicator && (
            <Animated.View entering={FadeIn.duration(300)} style={simStyles.rebalanceBadge}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_BALANCE} size={16} />
                <Text style={simStyles.rebalanceText}>איזון מחדש</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View style={[simStyles.balanceCard, simStyles.manualCard, manualAnimStyle]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <LottieIcon source={LOTTIE_SHIELD} size={18} />
            <Text style={simStyles.balanceLabel}>ידני</Text>
          </View>
          <Text style={[simStyles.balanceValue, { color: '#ef4444' }]}>
            {formatShekel(state.manualBalance)}
          </Text>
        </Animated.View>
      </View>

      {/* Chart */}
      {state.roboHistory.length > 1 && (
        <Animated.View entering={FadeInUp.delay(100)}>
          <View style={[sim3Styles.scoreCard, { marginTop: 12 }]}>
            <View style={sim3Styles.scoreCardInner}>
            <View style={chartStyles.legendRow}>
              <View style={chartStyles.legendItem}>
                <View style={[chartStyles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={chartStyles.legendText}>רובוט</Text>
              </View>
              <View style={chartStyles.legendItem}>
                <View style={[chartStyles.legendDot, { backgroundColor: 'rgba(239,68,68,0.7)' }]} />
                <Text style={chartStyles.legendText}>ידני</Text>
              </View>
            </View>
            <DualBarChart
              roboHistory={state.roboHistory}
              manualHistory={state.manualHistory}
            />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Allocation Bar */}
      {state.allocation && (
        <Animated.View entering={FadeInUp.delay(200)}>
          <View style={[sim3Styles.scoreCard, { marginTop: 12 }]}>
            <View style={sim3Styles.scoreCardInner}>
              <Text style={[{ fontSize: 16, fontWeight: '700', color: SIM3.textPrimary, marginBottom: 8 }, RTL]}>הקצאת תיק</Text>
              <AllocationPieBar
                stocks={state.allocation.stocks}
                bonds={state.allocation.bonds}
                cash={state.allocation.cash}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Controls */}
      <View style={simStyles.controlsRow}>
        <AnimatedPressable onPress={handleTogglePlay} accessibilityRole="button" accessibilityLabel={state.isPlaying ? 'עצור' : 'הפעל'} accessibilityHint={state.isPlaying ? 'עוצר את הסימולציה' : 'מפעיל את הסימולציה'} style={simStyles.playButton}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
            <Text style={simStyles.playButtonText}>
              {state.isPlaying ? 'עצור' : 'הפעל'}
            </Text>
          </View>
        </AnimatedPressable>

        {!state.isPlaying && state.currentYear < config.marketHistory.length && (
          <AnimatedPressable
            onPress={() => {
              tapHaptic();
              advanceYear();
            }}
            accessibilityRole="button"
            accessibilityLabel="שנה הבאה"
            accessibilityHint="מתקדם שנה אחת בסימולציה"
            style={simStyles.stepButton}
          >
            <Text style={simStyles.stepButtonText}>שנה הבאה →</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Speed Controls */}
      <SpeedSelector speed={speed} onChangeSpeed={changeSpeed} />

      {/* Progress */}
      <View style={simStyles.progressContainer}>
        <View style={simStyles.progressTrack}>
          <View
            style={[
              simStyles.progressFill,
              {
                width: `${(state.currentYear / config.marketHistory.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={simStyles.progressText}>
          {state.currentYear}/{config.marketHistory.length} שנים
        </Text>
      </View>
    </ScrollView>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SIM3.cardBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: SIM3.textOnGradient,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM3.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  comparisonDivider: {
    width: 1,
    height: 40,
    backgroundColor: SIM3.cardBorder,
  },
  advantageValue: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
});

const quizStyles = StyleSheet.create({
  card: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
    shadowColor: SIM3.dark,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  question: {
    color: SIM3.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
  },
  optionSelected: {
    borderColor: SIM3.primary,
    backgroundColor: `${SIM3.primary}15`,
  },
  optionText: {
    color: SIM3.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: SIM3.dark,
    fontWeight: '700',
  },
  riskMeterContainer: {
    marginTop: 20,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  riskMeterLabel: {
    color: SIM3.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  riskMeterLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  riskEndLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 11,
    fontWeight: '600',
    ...SHADOW_LIGHT,
  },
  finishButton: {
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: SIM3.btnPrimary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: SIM3.btnPrimaryBorder,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
});

const allocationStyles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  barTrack: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    color: SIM3.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: BAR_CHART_HEIGHT + 24,
    marginTop: 8,
  },
  yAxis: {
    width: 54,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yLabel: {
    color: SIM3.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  barsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barGroup: {
    alignItems: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 2,
  },
  xLabel: {
    color: SIM3.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: SIM3.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});

const simStyles = StyleSheet.create({
  headlineCard: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
    shadowColor: SIM3.dark,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headlineText: {
    color: SIM3.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  returnsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  returnBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  balancesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  roboCard: {
    backgroundColor: SIM3.cardBg,
    borderColor: SIM3.cardBorder,
  },
  manualCard: {
    backgroundColor: SIM3.cardBg,
    borderColor: SIM3.cardBorder,
  },
  balanceLabel: {
    color: SIM3.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  rebalanceBadge: {
    backgroundColor: 'rgba(6,182,212,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  rebalanceText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  playButton: {
    backgroundColor: SIM3.btnPrimary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: SIM3.btnPrimaryBorder,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  stepButton: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
  },
  stepButtonText: {
    color: SIM3.dark,
    fontSize: 15,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: SIM3.trackBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: SIM3.primary,
    borderRadius: 3,
  },
  progressText: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },
});

const speedStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SIM3.cardBg,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
  },
  buttonActive: {
    backgroundColor: `${SIM3.primary}15`,
    borderColor: SIM3.primary,
  },
  text: {
    color: SIM3.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  textActive: {
    color: SIM3.dark,
  },
});
