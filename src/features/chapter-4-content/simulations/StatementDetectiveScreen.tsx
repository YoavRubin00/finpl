/**
 * SIM 4-25: בלש הדוחות (Statement Detective), Module 4-25
 * Company financial cards → user votes invest/avoid → feedback with red flags.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import { useStatementDetective } from './useStatementDetective';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim4Styles, GRADE_COLORS4 } from './simTheme';
import type { Verdict, FinancialSnippet, DetectiveScore } from './statementDetectiveTypes';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_SHARK = require('../../../../assets/lottie/wired-flat-1173-shark-hover-pinch.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(0)}M`;
  }
  return n.toLocaleString('he-IL');
}

/** Determine if a metric value is a "red flag" (visually red). */
function isRedMetric(key: string, value: number): boolean {
  if (key === 'cashFlow' && value < 0) return true;
  if (key === 'netIncome' && value < 0) return true;
  if (key === 'equity' && value < 0) return true;
  if (key === 'debtEquityRatio' && value > 2) return true;
  if (key === 'peRatio' && (value < 0 || value > 50)) return true;
  return false;
}

/* ================================================================== */
/*  ProgressDots, 5 round indicators                                  */
/* ================================================================== */

function ProgressDots({
  total,
  current,
  verdicts,
  correctVerdicts,
}: {
  total: number;
  current: number;
  verdicts: (Verdict | null)[];
  correctVerdicts: Verdict[];
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const verdict = verdicts[i];
        let bg = 'rgba(255,255,255,0.25)';
        let borderColor = 'rgba(255,255,255,0.4)';

        if (verdict !== null && verdict !== undefined) {
          const correct = verdict === correctVerdicts[i];
          bg = correct ? '#4ade80' : '#ef4444';
          borderColor = correct ? '#22c55e' : '#dc2626';
        } else if (i === current) {
          bg = 'rgba(255,255,255,0.6)';
          borderColor = '#ffffff';
        }

        return (
          <View
            key={i}
            style={[
              dotStyles.dot,
              { backgroundColor: bg, borderColor },
            ]}
          />
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  MetricRow, single financial metric with color coding               */
/* ================================================================== */

function MetricRow({
  label,
  value,
  metricKey,
  isCurrency,
}: {
  label: string;
  value: number;
  metricKey: string;
  isCurrency: boolean;
}) {
  const isRed = isRedMetric(metricKey, value);
  const displayValue = isCurrency ? formatShekel(value) : value.toFixed(2);
  const color = isRed ? '#ef4444' : '#16a34a';

  return (
    <View style={metricStyles.row}>
      <Text style={[metricStyles.label, RTL]}>{label}</Text>
      <Text style={[metricStyles.value, { color }]}>{displayValue}</Text>
    </View>
  );
}

/* ================================================================== */
/*  CompanyCard, financial data display                                */
/* ================================================================== */

function CompanyCard({ snippet }: { snippet: FinancialSnippet }) {
  return (
    <GlowCard glowColor="rgba(129,140,248,0.15)" style={{ backgroundColor: SIM4.cardBg }}>
      {/* Company header */}
      <View style={cardStyles.header}>
        <Text style={cardStyles.emoji}>{snippet.emoji}</Text>
        <Text style={[cardStyles.name, RTL]}>{snippet.companyName}</Text>
      </View>

      {/* Metrics grid */}
      <View style={cardStyles.metricsGrid}>
        <MetricRow label="הכנסות" value={snippet.revenue} metricKey="revenue" isCurrency />
        <MetricRow label="רווח נקי" value={snippet.netIncome} metricKey="netIncome" isCurrency />
        <MetricRow label="תזרים מזומנים" value={snippet.cashFlow} metricKey="cashFlow" isCurrency />
        <MetricRow label="הון עצמי" value={snippet.equity} metricKey="equity" isCurrency />
        <MetricRow label="P/E" value={snippet.peRatio} metricKey="peRatio" isCurrency={false} />
        <MetricRow label="חוב / הון" value={snippet.debtEquityRatio} metricKey="debtEquityRatio" isCurrency={false} />
      </View>
    </GlowCard>
  );
}

/* ================================================================== */
/*  RedFlagsList, revealed after incorrect vote                        */
/* ================================================================== */

function RedFlagsList({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(300)}>
      <View style={flagStyles.container}>
        <Text style={[flagStyles.title, RTL]}>🚩 דגלים אדומים שפספסת:</Text>
        {flags.map((flag, i) => (
          <View key={i} style={flagStyles.flagRow}>
            <Text style={flagStyles.bullet}>•</Text>
            <Text style={[flagStyles.flagText, RTL]}>{flag}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

/* ================================================================== */
/*  ScoreScreen, results after all 5 rounds                            */
/* ================================================================== */

function ScoreScreen({
  score,
  rounds,
  verdicts,
  onReplay,
  onContinue,
}: {
  score: DetectiveScore;
  rounds: { snippet: FinancialSnippet; correctVerdict: Verdict; explanation: string }[];
  verdicts: (Verdict | null)[];
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
                {score.correctCount}/{score.totalRounds}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Missed red flags */}
      {score.missedRedFlags.length > 0 && (
        <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
          <View style={sim4Styles.scoreCard}>
            <View style={sim4Styles.scoreCardInner}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <LottieIcon source={LOTTIE_SHARK} size={22} />
                <Text style={[scoreStyles.flagsTitle, RTL]}>דגלים אדומים שפספסת</Text>
              </View>
              {score.missedRedFlags.map((flag, i) => (
                <View key={i} style={flagStyles.flagRow}>
                  <Text style={flagStyles.bullet}>•</Text>
                  <Text style={[flagStyles.flagText, RTL, { color: SIM4.textSecondary }]}>{flag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Lesson */}
      <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[scoreStyles.lessonText, RTL, { flex: 1 }]}>
                לפני שמשקיעים, קוראים את הדוחות. תזרים מזומנים שלילי, חוב גבוה והון עצמי שלילי הם סימני אזהרה קריטיים.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Finn disclaimer */}
      <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: '#e2e8f0' }}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36 }} contentFit="contain" />
          <Text style={[RTL, { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '600', lineHeight: 20 }]}>
            קריאת דוחות היא חשובה, אבל היא אף פעם לא מספרת את כל הסיפור. מחיר המניה מושפע מאלמנטים רבים.
          </Text>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(500)} style={sim4Styles.actionsRow}>
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

interface StatementDetectiveScreenProps {
  onComplete?: (score: number) => void;
}

export function StatementDetectiveScreen({ onComplete }: StatementDetectiveScreenProps) {
  const {
    state,
    config,
    currentRound,
    currentVerdictCorrect,
    score,
    submitVerdict,
    nextRound,
    reset,
  } = useStatementDetective();


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
  const pulseActive = !state.showingFeedback && !state.isComplete;

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

  const handleVote = useCallback(
    (verdict: Verdict) => {
      tapHaptic();
      submitVerdict(verdict);
    },
    [submitVerdict],
  );

  const handleNext = useCallback(() => {
    tapHaptic();
    nextRound();
  }, [nextRound]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    prevComplete.current = false;
    reset();
  }, [reset]);

  // Finn feedback auto-dismiss after 5s
  const [finnFeedbackVisible, setFinnFeedbackVisible] = useState(false);
  useEffect(() => {
    if (state.showingFeedback) {
      setFinnFeedbackVisible(true);
      const t = setTimeout(() => setFinnFeedbackVisible(false), 5000);
      return () => clearTimeout(t);
    }
    setFinnFeedbackVisible(false);
  }, [state.showingFeedback, state.currentRoundIndex]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    const gradeScore = score
      ? { S: 100, A: 85, B: 65, C: 45, F: 20 }[score.grade]
      : 50;
    onComplete?.(gradeScore);
  }, [onComplete, score]);

  const correctVerdicts = config.rounds.map((r) => r.correctVerdict);

  // ── Score Phase ───────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScoreScreen
          score={score}
          rounds={config.rounds}
          verdicts={state.playerVerdicts}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Game Phase ────────────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_SHARK} size={28} />
              <Text accessibilityRole="header" style={styles.title}>בלש הדוחות</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              בדוק את הדוחות הכספיים והחלט: להשקיע או לברוח?
            </Text>
          </Animated.View>

          {/* Progress dots */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <ProgressDots
              total={config.rounds.length}
              current={state.currentRoundIndex}
              verdicts={state.playerVerdicts}
              correctVerdicts={correctVerdicts}
            />
            <Text style={styles.progressText}>
              {state.currentRoundIndex + 1} / {config.rounds.length}
            </Text>
          </Animated.View>

          {/* Company card */}
          {currentRound && (
            <Animated.View entering={FadeInUp.delay(200)} key={currentRound.snippet.id}>
              <CompanyCard snippet={currentRound.snippet} />
            </Animated.View>
          )}

          {/* Vote buttons (only when not showing feedback) */}
          {!state.showingFeedback && (
            <Animated.View entering={FadeInUp.delay(300)} style={styles.voteRow}>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleVote('invest')}
                  style={styles.investBtn}
                  accessibilityRole="button"
                  accessibilityLabel="להשקיע"
                >
                  <Text style={styles.investBtnText}>להשקיע 📈</Text>
                </AnimatedPressable>
              </Animated.View>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleVote('avoid')}
                  style={styles.avoidBtn}
                  accessibilityRole="button"
                  accessibilityLabel="לברוח"
                >
                  <Text style={styles.avoidBtnText}>לברוח 🏃</Text>
                </AnimatedPressable>
              </Animated.View>
            </Animated.View>
          )}

          {/* Feedback: result + red flags */}
          {state.showingFeedback && currentRound && (
            <Animated.View entering={FadeInUp.delay(100)} style={{ marginTop: 16 }}>
              {/* Verdict result */}
              <View
                style={[
                  styles.verdictCard,
                  {
                    backgroundColor: currentVerdictCorrect ? SIM4.successLight : SIM4.dangerLight,
                    borderColor: currentVerdictCorrect ? SIM4.successBorder : SIM4.dangerBorder,
                  },
                ]}
              >
                <Text style={styles.verdictEmoji}>
                  {currentVerdictCorrect ? '✅' : '❌'}
                </Text>
                <Text
                  style={[
                    styles.verdictText,
                    RTL,
                    { color: currentVerdictCorrect ? SIM4.success : SIM4.danger },
                  ]}
                >
                  {currentVerdictCorrect
                    ? 'צדקת!'
                    : `טעות, התשובה הנכונה: ${currentRound.correctVerdict === 'invest' ? 'להשקיע' : 'לברוח'}`}
                </Text>
              </View>

              {/* Red flags revealed (only for avoid companies where user was wrong) */}
              {!currentVerdictCorrect && currentRound.snippet.redFlags.length > 0 && (
                <RedFlagsList flags={currentRound.snippet.redFlags} />
              )}

              {/* Next round button */}
              <AnimatedPressable onPress={handleNext} style={styles.nextBtn} accessibilityRole="button" accessibilityLabel={state.currentRoundIndex < config.rounds.length - 1 ? 'חברה הבאה' : 'לתוצאות'}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={20} /></View>
                  <Text style={styles.nextBtnText}>
                    {state.currentRoundIndex < config.rounds.length - 1 ? 'חברה הבאה' : 'לתוצאות'}
                  </Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          )}
        </ScrollView>

        {/* Finn explanation, auto-dismisses after 5s, with X button */}
        {state.showingFeedback && currentRound && currentVerdictCorrect !== null && finnFeedbackVisible && (
          <Animated.View entering={FadeInUp.duration(400)} style={{ position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 50 }}>
            <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>
              {/* X button, top right */}
              <Pressable onPress={() => setFinnFeedbackVisible(false)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} accessibilityRole="button" accessibilityLabel="סגור" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </Pressable>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
                <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 48, height: 48 }} contentFit="contain" />
                <Text style={[RTL, { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '600', lineHeight: 22, paddingLeft: 30 }]}>
                  {currentRound.explanation}
                </Text>
              </View>
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
  voteRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  investBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#15803d',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  investBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  avoidBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b91c1c',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  avoidBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  verdictCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  verdictEmoji: {
    fontSize: 24,
  },
  verdictText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
  nextBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
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
    gap: 10,
    marginTop: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});

const metricStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    color: SIM4.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
  },
});

const cardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emoji: {
    fontSize: 32,
  },
  name: {
    color: SIM4.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
  },
  metricsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

const flagStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  title: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  flagRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  bullet: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  flagText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
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
  flagsTitle: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  lessonText: {
    color: SIM4.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
});
