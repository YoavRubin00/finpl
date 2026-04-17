/**
 * SIM 4-28: קורא הגרפים (Chart Reader) — Module 4-28
 * Candlestick charts with hidden company name → user picks buy/sell/hold → reveal.
 */

import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { useChartReader } from './useChartReader';
import { TOTAL_ROUNDS } from './chartReaderData';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim4Styles, GRADE_COLORS4 } from './simTheme';
import type { ChartAction, CandleData, ChartRound, ChartReaderScore } from './chartReaderTypes';


const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 32; // 16px padding on each side
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - 32; // card internal padding

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function getActionLabel(action: ChartAction): string {
  switch (action) {
    case 'buy': return 'לקנות 🛒';
    case 'sell': return 'למכור 📉';
    case 'hold': return 'להחזיק ✊';
  }
}

function getActionFeedback(
  action: ChartAction,
  correctAction: ChartAction,
  pattern: string,
): { isCorrect: boolean; message: string } {
  const isCorrect = action === correctAction;
  if (isCorrect) {
    return {
      isCorrect: true,
      message: `נכון! זיהית נכון את הדפוס: ${pattern}`,
    };
  }
  return {
    isCorrect: false,
    message: `הפעולה הנכונה: ${getActionLabel(correctAction)}. הדפוס: ${pattern}`,
  };
}

/* ================================================================== */
/*  CandlestickChart — renders 40 candles with volume bars             */
/* ================================================================== */

const CANDLE_CHART_HEIGHT = 160;
const VOLUME_CHART_HEIGHT = 40;

function CandlestickChart({ candles, volumeData }: { candles: CandleData[]; volumeData: number[] }) {
  const totalCandles = candles.length;
  const candleWidth = CHART_WIDTH / totalCandles;
  const bodyWidth = Math.max(candleWidth * 0.55, 2);
  const wickWidth = Math.max(1, bodyWidth * 0.15);

  // Price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }
  const priceRange = maxPrice - minPrice || 1;

  // Volume range
  let maxVolume = 0;
  for (const v of volumeData) {
    if (v > maxVolume) maxVolume = v;
  }
  if (maxVolume === 0) maxVolume = 1;

  const priceToY = (price: number): number => {
    return CANDLE_CHART_HEIGHT - ((price - minPrice) / priceRange) * CANDLE_CHART_HEIGHT;
  };

  return (
    <View style={chartStyles.wrapper}>
      {/* Candle area */}
      <View style={[chartStyles.candleArea, { height: CANDLE_CHART_HEIGHT }]}>
        {candles.map((c, i) => {
          const isGreen = c.close >= c.open;
          const color = isGreen ? '#16a34a' : '#ef4444';
          const bodyTop = priceToY(Math.max(c.open, c.close));
          const bodyBottom = priceToY(Math.min(c.open, c.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
          const wickTop = priceToY(c.high);
          const wickBottom = priceToY(c.low);
          const wickHeight = wickBottom - wickTop;
          // Chronological axis: earliest candle at left, most recent at right.
          const xPos = i * candleWidth + (candleWidth - bodyWidth) / 2;
          const wickX = i * candleWidth + candleWidth / 2 - wickWidth / 2;

          return (
            <View key={i}>
              {/* Wick */}
              <View
                style={{
                  position: 'absolute',
                  left: wickX,
                  top: wickTop,
                  width: wickWidth,
                  height: wickHeight,
                  backgroundColor: color,
                }}
              />
              {/* Body */}
              <View
                style={{
                  position: 'absolute',
                  left: xPos,
                  top: bodyTop,
                  width: bodyWidth,
                  height: bodyHeight,
                  backgroundColor: color,
                  borderRadius: 1,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Volume bars */}
      <View style={[chartStyles.volumeArea, { height: VOLUME_CHART_HEIGHT }]}>
        {volumeData.map((v, i) => {
          const barHeight = (v / maxVolume) * VOLUME_CHART_HEIGHT;
          const isGreen = candles[i].close >= candles[i].open;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: i * candleWidth + (candleWidth - bodyWidth) / 2,
                bottom: 0,
                width: bodyWidth,
                height: Math.max(barHeight, 1),
                backgroundColor: isGreen ? 'rgba(22,163,74,0.35)' : 'rgba(239,68,68,0.35)',
                borderRadius: 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ================================================================== */
/*  ProgressDots — 4 round indicators                                  */
/* ================================================================== */

function ProgressDots({
  total,
  current,
  actions,
  correctActions,
}: {
  total: number;
  current: number;
  actions: (ChartAction | null)[];
  correctActions: ChartAction[];
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const action = actions[i];
        let bg = 'rgba(255,255,255,0.25)';
        let borderColor = 'rgba(255,255,255,0.4)';

        if (action !== null && action !== undefined) {
          const correct = action === correctActions[i];
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
/*  ScoreScreen — results after all 4 rounds                           */
/* ================================================================== */

function ScoreScreen({
  score,
  rounds,
  actions,
  onReplay,
  onContinue,
}: {
  score: ChartReaderScore;
  rounds: ChartRound[];
  actions: (ChartAction | null)[];
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

      {/* Per-round breakdown */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>פירוט לפי גרף</Text>
            {rounds.map((round, i) => {
              const playerAction = actions[i];
              const correct = playerAction === round.correctAction;
              return (
                <View key={round.id} style={scoreStyles.breakdownRow}>
                  <View style={scoreStyles.breakdownLeft}>
                    <Text style={[scoreStyles.breakdownName, RTL]}>
                      {round.companyName}
                    </Text>
                  </View>
                  <View style={scoreStyles.breakdownRight}>
                    <Text style={[scoreStyles.breakdownVerdict, { color: correct ? '#16a34a' : '#ef4444' }]}>
                      {correct ? '✓' : '✗'}
                    </Text>
                    <Text style={[scoreStyles.breakdownAnswer, RTL]}>
                      {getActionLabel(round.correctAction)}
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
                קריאת גרפים היא מיומנות. מגמה + נפח מסחר = הסיפור האמיתי. אל תתעלם מנפח — הוא מאשר או מפריך את התנועה.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(400)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" style={sim4Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" style={sim4Styles.continueBtn}>
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

interface ChartReaderScreenProps {
  onComplete?: (score: number) => void;
}

export function ChartReaderScreen({ onComplete }: ChartReaderScreenProps) {
  const {
    state,
    config,
    currentRound,
    currentActionCorrect,
    score,
    submitAction,
    nextRound,
    reset,
  } = useChartReader();


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
  const pulseActive = !state.showingReveal && !state.isComplete;

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

  const handleAction = useCallback(
    (action: ChartAction) => {
      tapHaptic();
      submitAction(action);
    },
    [submitAction],
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

  const handleContinue = useCallback(() => {
    tapHaptic();
    const gradeScore = score
      ? { S: 100, A: 85, B: 65, C: 45, F: 20 }[score.grade]
      : 50;
    onComplete?.(gradeScore);
  }, [onComplete, score]);

  const correctActions = config.rounds.map((r) => r.correctAction);

  // Feedback for current round
  const feedback =
    state.showingReveal && currentRound
      ? getActionFeedback(
          state.playerActions[state.currentRoundIndex] ?? 'hold',
          currentRound.correctAction,
          currentRound.pattern,
        )
      : null;

  // ── Score Phase ───────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScoreScreen
          score={score}
          rounds={config.rounds}
          actions={state.playerActions}
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
        <View
          style={[{ flex: 1 }, styles.scrollContent]}
        >
          {/* Title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.titleRow}>
              <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={28} /></View>
              <Text accessibilityRole="header" style={styles.title}>קורא הגרפים</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              זהה את הדפוס בגרף והחלט: לקנות, למכור או להחזיק?
            </Text>
          </Animated.View>

          {/* Progress dots */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <ProgressDots
              total={TOTAL_ROUNDS}
              current={state.currentRoundIndex}
              actions={state.playerActions}
              correctActions={correctActions}
            />
            <Text style={styles.progressText}>
              {state.currentRoundIndex + 1} / {TOTAL_ROUNDS}
            </Text>
          </Animated.View>

          {/* Chart card */}
          {currentRound && !state.showingReveal && (
            <Animated.View entering={FadeInUp.delay(200)} key={currentRound.id}>
              <GlowCard glowColor="rgba(129,140,248,0.15)" style={{ backgroundColor: SIM4.cardBg }}>
                {/* Mystery label */}
                <View style={chartCardStyles.header}>
                  <Text style={chartCardStyles.mysteryLabel}>מניה מסתורית 🔮</Text>
                </View>

                {/* Candlestick chart */}
                <View style={chartCardStyles.chartContainer}>
                  <View accessible={false}>
                  <CandlestickChart
                    candles={currentRound.candles}
                    volumeData={currentRound.volumeData}
                  />
                  </View>
                </View>

                {/* Volume legend */}
                <Text style={[chartCardStyles.volumeLabel, RTL]}>
                  📊 נפח מסחר
                </Text>
              </GlowCard>
            </Animated.View>
          )}

          {/* Action buttons (only when not showing reveal) */}
          {!state.showingReveal && currentRound && (
            <Animated.View entering={FadeInUp.delay(300)} style={styles.actionRow}>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleAction('buy')}
                  accessibilityRole="button"
                  accessibilityLabel="לקנות"
                  style={styles.buyBtn}
                >
                  <Text style={styles.actionBtnText}>לקנות 🛒</Text>
                </AnimatedPressable>
              </Animated.View>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleAction('hold')}
                  accessibilityRole="button"
                  accessibilityLabel="להחזיק"
                  style={styles.holdBtn}
                >
                  <Text style={styles.actionBtnText}>להחזיק ✊</Text>
                </AnimatedPressable>
              </Animated.View>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleAction('sell')}
                  accessibilityRole="button"
                  accessibilityLabel="למכור"
                  style={styles.sellBtn}
                >
                  <Text style={styles.actionBtnText}>למכור 📉</Text>
                </AnimatedPressable>
              </Animated.View>
            </Animated.View>
          )}

          {/* Reveal after action */}
          {state.showingReveal && currentRound && (
            <Animated.View entering={FadeInDown.delay(100)} style={{ marginTop: 16 }}>
              {/* Result badge */}
              <View
                style={[
                  styles.revealCard,
                  {
                    backgroundColor: currentActionCorrect ? SIM4.successLight : SIM4.dangerLight,
                    borderColor: currentActionCorrect ? SIM4.successBorder : SIM4.dangerBorder,
                  },
                ]}
              >
                <Text style={styles.revealEmoji}>
                  {currentActionCorrect ? '✅' : '❌'}
                </Text>
                <Text
                  style={[
                    styles.revealText,
                    RTL,
                    { color: currentActionCorrect ? SIM4.success : SIM4.danger },
                  ]}
                >
                  {currentActionCorrect
                    ? 'נכון!'
                    : `טעות — הפעולה הנכונה: ${getActionLabel(currentRound.correctAction)}`}
                </Text>
              </View>

              {/* Company reveal */}
              <Animated.View entering={FadeInDown.delay(200)}>
                <GlowCard glowColor="rgba(129,140,248,0.2)" style={{ backgroundColor: SIM4.cardBg, marginTop: 12 }}>
                  <View style={revealStyles.container}>
                    <Text style={[revealStyles.companyName, RTL]}>
                      {currentRound.companyName}
                    </Text>
                    <Text style={[revealStyles.whatHappened, RTL]}>
                      {currentRound.whatHappened}
                    </Text>
                    <View style={revealStyles.patternBadge}>
                      <Text style={[revealStyles.patternText, RTL]}>
                        📐 דפוס: {currentRound.pattern}
                      </Text>
                    </View>
                  </View>
                </GlowCard>
              </Animated.View>

              {/* Next round button */}
              <AnimatedPressable onPress={handleNext} accessibilityRole="button" accessibilityLabel={state.currentRoundIndex < TOTAL_ROUNDS - 1 ? 'לגרף הבא' : 'לתוצאות'} style={styles.nextBtn}>
                <Text style={[styles.nextBtnText, { writingDirection: 'rtl' }]}>
                  {state.currentRoundIndex < TOTAL_ROUNDS - 1 ? 'לגרף הבא' : 'לתוצאות'}
                </Text>
                <View style={{ position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' }} accessible={false}>
                  <LottieIcon source={LOTTIE_ARROW} size={22} />
                </View>
              </AnimatedPressable>
            </Animated.View>
          )}
        </View>

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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  buyBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#15803d',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  holdBtn: {
    backgroundColor: '#d97706',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b45309',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sellBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b91c1c',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  revealCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  revealEmoji: {
    fontSize: 24,
  },
  revealText: {
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

const chartStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 4,
  },
  candleArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  volumeArea: {
    position: 'relative',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    overflow: 'hidden',
  },
});

const chartCardStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  mysteryLabel: {
    color: SIM4.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  chartContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  volumeLabel: {
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
  },
});

const revealStyles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10,
  },
  companyName: {
    color: SIM4.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  whatHappened: {
    color: SIM4.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  patternBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  patternText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '700',
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
