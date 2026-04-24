/**
 * SIM 19: סליידר הסיכון (Risk-Return Slider), Module 4-19
 * Premium interactive slider: drag between 0% stocks / 100% bonds → 100% stocks / 0% bonds.
 * Dynamic chart shows 10-year portfolio growth. Stats panel, risk meter, auto-sweep.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SharkTipModal } from '../../../components/ui/SharkTipModal';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useRiskSlider } from './useRiskSlider';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim4Styles } from './simTheme';
import type { RiskLevel, YearReturn } from './riskSliderTypes';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 180;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const RISK_LABELS: Record<RiskLevel, string> = {
  conservative: 'שמרני',
  balanced: 'מאוזן',
  aggressive: 'אגרסיבי',
};

const RISK_LOTTIES: Record<RiskLevel, ReturnType<typeof require>> = {
  conservative: LOTTIE_SHIELD,
  balanced: LOTTIE_BALANCE,
  aggressive: LOTTIE_ROCKET,
};

/* ================================================================== */
/*  LineChart, animated 10-year portfolio growth                      */
/* ================================================================== */

function LineChart({
  history,
  initialInvestment,
}: {
  history: YearReturn[];
  initialInvestment: number;
}) {
  const allBalances = [initialInvestment, ...history.map((y) => y.balance)];
  const maxVal = Math.max(...allBalances) * 1.05;
  const minVal = Math.min(...allBalances) * 0.95;
  const range = maxVal - minVal || 1;

  const pointCount = allBalances.length;
  const stepX = CHART_WIDTH / (pointCount - 1);

  // Build SVG-like points
  const points = allBalances.map((val, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT,
  }));

  // Baseline Y for initial investment
  const baselineY = CHART_HEIGHT - ((initialInvestment - minVal) / range) * CHART_HEIGHT;

  return (
    <View style={chartStyles.container}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{formatShekel(maxVal)}</Text>
        <Text style={chartStyles.yLabel}>{formatShekel((maxVal + minVal) / 2)}</Text>
        <Text style={chartStyles.yLabel}>{formatShekel(minVal)}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.chartArea}>
        {/* Baseline (initial investment) */}
        <View
          style={[
            chartStyles.baseline,
            { top: baselineY },
          ]}
        />

        {/* Grid lines */}
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />

        {/* Line segments */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const isAboveBaseline = allBalances[i] >= initialInvestment;

          return (
            <View
              key={i}
              style={[
                chartStyles.lineSegment,
                {
                  left: prev.x,
                  top: prev.y,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: isAboveBaseline ? '#0ea5e9' : '#ef4444',
                },
              ]}
            />
          );
        })}

        {/* Data points */}
        {points.map((point, i) => {
          const isAboveBaseline = allBalances[i] >= initialInvestment;
          return (
            <View
              key={`dot-${i}`}
              style={[
                chartStyles.dataPoint,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                  backgroundColor: isAboveBaseline ? '#0ea5e9' : '#ef4444',
                },
              ]}
            />
          );
        })}

        {/* X-axis labels */}
        <View style={chartStyles.xLabelsRow}>
          {allBalances.map((_, i) => (
            <Text
              key={`x-${i}`}
              style={[
                chartStyles.xLabel,
                { left: points[i].x - 10, width: 20 },
              ]}
            >
              {i === 0 ? 'התחלה' : `${i}`}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  AllocationBar, horizontal bar showing stock/bond split            */
/* ================================================================== */

function AllocationBar({ stockPercent }: { stockPercent: number }) {
  const bondPercent = 100 - stockPercent;
  return (
    <View style={allocStyles.container}>
      <View style={allocStyles.barTrack}>
        <Animated.View
          style={[
            allocStyles.barSegment,
            { flex: bondPercent || 0.1, backgroundColor: '#7dd3fc' },
          ]}
        />
        <Animated.View
          style={[
            allocStyles.barSegment,
            { flex: stockPercent || 0.1, backgroundColor: '#0ea5e9' },
          ]}
        />
      </View>
      <View style={allocStyles.labelsRow}>
        <View style={allocStyles.labelItem}>
          <View style={[allocStyles.labelDot, { backgroundColor: '#7dd3fc' }]} />
          <Text style={allocStyles.labelText}>אג״ח {bondPercent}%</Text>
        </View>
        <View style={allocStyles.labelItem}>
          <View style={[allocStyles.labelDot, { backgroundColor: '#0ea5e9' }]} />
          <Text style={allocStyles.labelText}>מניות {stockPercent}%</Text>
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  RiskMeter, visual gauge from conservative to aggressive           */
/* ================================================================== */

function RiskMeter({ stockPercent }: { stockPercent: number }) {
  const fillPercent = stockPercent;
  const level: RiskLevel =
    stockPercent <= 30 ? 'conservative' : stockPercent <= 60 ? 'balanced' : 'aggressive';
  const meterColor =
    stockPercent <= 30 ? '#7dd3fc' : stockPercent <= 60 ? '#38bdf8' : '#ef4444';

  return (
    <View style={meterStyles.container}>
      <Text style={[meterStyles.title, RTL]}>מד סיכון</Text>
      <View style={meterStyles.track}>
        <View
          style={[
            meterStyles.fill,
            { width: `${fillPercent}%`, backgroundColor: meterColor },
          ]}
        />
      </View>
      <View style={meterStyles.labelsRow}>
        <Text style={meterStyles.endLabel}>שמרני</Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <LottieIcon source={RISK_LOTTIES[level]} size={18} />
          <Text style={[meterStyles.currentLabel, { color: meterColor }]}>
            {RISK_LABELS[level]}
          </Text>
        </View>
        <Text style={meterStyles.endLabel}>אגרסיבי</Text>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  ScoreScreen, results after completing                              */
/* ================================================================== */

function ScoreScreen({
  state,
  score,
  averageReturn,
  initialInvestment,
  onReplay,
  onContinue,
}: {
  state: ReturnType<typeof useRiskSlider>['state'];
  score: NonNullable<ReturnType<typeof useRiskSlider>['score']>;
  averageReturn: number;
  initialInvestment: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);

  const riskColor = score.riskLevel === 'conservative' ? '#7dd3fc' : score.riskLevel === 'balanced' ? '#38bdf8' : '#ef4444';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Risk Profile */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={styles.gradeBanner}>
        <View accessible={false}><LottieIcon source={RISK_LOTTIES[score.riskLevel]} size={56} /></View>
        <Text accessibilityLiveRegion="polite" style={[styles.gradeLabel, { color: riskColor }]}>
          {RISK_LABELS[score.riskLevel]}
        </Text>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[styles.statsTitle, RTL]}>
              עם הקצאה של {state.allocation.stockPercent}/{state.allocation.bondPercent} לאורך 10 שנים:
            </Text>
            <Text style={styles.summaryValue}>
              ₪{initialInvestment.toLocaleString('he-IL')} → ₪{state.finalBalance.toLocaleString('he-IL')}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>תשואה שנתית ממוצעת</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: '#0ea5e9' }]}>{averageReturn}%</Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_DECREASE} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>ירידה מקסימלית</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: '#ef4444' }]}>{score.maxVolatility}%</Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_STAR} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>שנה הכי טובה</Text>
              </View>
              <Text style={sim4Styles.scoreRowValue}>שנה {state.bestYear}</Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_DECREASE} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>שנה הכי גרועה</Text>
              </View>
              <Text style={sim4Styles.scoreRowValue}>שנה {state.worstYear}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Max Drawdown Highlight */}
      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={22} />
              <Text style={[styles.lessonText, RTL, { flex: 1 }]}>
                הרגע הכי קשה: התיק שלך ירד {score.maxVolatility}% מהשיא
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Key Lesson */}
      <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[styles.lessonText, RTL, { flex: 1 }]}>
                אין תשואה בלי סיכון. המפתח הוא למצוא את הנקודה שלך.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(600)} style={sim4Styles.actionsRow}>
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
/*  Helper                                                              */
/* ================================================================== */

/* ================================================================== */
/*  Main Screen                                                         */
/* ================================================================== */

interface RiskSliderScreenProps {
  onComplete?: () => void;
}

export function RiskSliderScreen({ onComplete }: RiskSliderScreenProps) {
  const {
    state,
    config,
    averageReturn,
    isSweeping,
    score,
    setAllocation,
    startSweep,
    stopSweep,
    complete,
    reset,
  } = useRiskSlider();

  const [showSharkTip, setShowSharkTip] = useState(false);
  const rewardsGranted = useRef(false);

  // Balance animation
  const balanceScale = useSharedValue(1);
  const prevBalance = useRef(state.finalBalance);

  // Animate balance changes
  useEffect(() => {
    const diff = Math.abs(state.finalBalance - prevBalance.current);
    prevBalance.current = state.finalBalance;
    if (diff > 5000) {
      balanceScale.value = withSequence(
        withSpring(1.03, { damping: 22, stiffness: 200 }),
        withSpring(1, { damping: 22, stiffness: 150 }),
      );
      if (state.finalBalance > config.initialInvestment * 1.5) {
        successHaptic();
      }
    }
  }, [state.finalBalance, balanceScale, config.initialInvestment]);

  // Grant rewards on completion
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  // Pulsing glow for action buttons
  const btnPulse = useSharedValue(1);
  useEffect(() => {
    if (!state.isComplete && !isSweeping) {
      btnPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(btnPulse);
      btnPulse.value = withTiming(1, { duration: 200 });
    }
  }, [state.isComplete, isSweeping, btnPulse]);

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  const handleSliderChange = useCallback(
    (value: number) => {
      setAllocation(Math.round(value));
    },
    [setAllocation],
  );

  const handleSweepToggle = useCallback(() => {
    tapHaptic();
    if (isSweeping) {
      stopSweep();
    } else {
      startSweep();
    }
  }, [isSweeping, startSweep, stopSweep]);

  const handleComplete = useCallback(() => {
    heavyHaptic();
    complete();
  }, [complete]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    setShowSharkTip(true);
  }, []);

  const handleSharkTipClose = useCallback(() => {
    setShowSharkTip(false);
    onComplete?.();
  }, [onComplete]);

  const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json'),
  ];

  // ── Results Phase ──────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <ScoreScreen
        state={state}
        score={score}
        averageReturn={averageReturn}
        initialInvestment={config.initialInvestment}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // ── Slider Phase ───────────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
    <View style={{ flex: 1, padding: 12 }}>
      {/* Allocation Bar */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <AllocationBar stockPercent={state.allocation.stockPercent} />
      </Animated.View>

      {/* Slider */}
      <Animated.View entering={FadeInUp.delay(200)} style={riskSliderStyles.container}>
        <View style={riskSliderStyles.labelsRow}>
          <Text style={[riskSliderStyles.endLabel, { color: '#7dd3fc', fontSize: 14 }]}>100% אג״ח</Text>
          <Text style={riskSliderStyles.currentValue}>{state.allocation.stockPercent}% מניות</Text>
          <Text style={[riskSliderStyles.endLabel, { color: '#1e3a8a', fontSize: 14 }]}>100% מניות</Text>
        </View>
        <Slider
          value={state.allocation.stockPercent}
          onValueChange={handleSliderChange}
          minimumValue={0}
          maximumValue={100}
          step={1}
          minimumTrackTintColor="#4ade80"
          maximumTrackTintColor="#c4b5fd"
          thumbTintColor={SIM4.dark}
          style={riskSliderStyles.slider}
          disabled={isSweeping}
          accessibilityRole="adjustable"
          accessibilityLabel="אחוז מניות בתיק"
          accessibilityValue={{ min: 0, max: 100, now: state.allocation.stockPercent, text: `${state.allocation.stockPercent}% מניות` }}
        />
      </Animated.View>

      {/* Hero Chart */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <GlowCard glowColor="rgba(34,197,94,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <Text style={[styles.statsTitle, RTL]}>צמיחת תיק, 10 שנים</Text>
          <Text style={[styles.statsSubtitle, RTL]}>
            {'נתוני אמת 2014-2023 · מניות: S&P 500 · אג"ח: Bloomberg US Aggregate'}
          </Text>
          <LineChart
            history={state.yearHistory}
            initialInvestment={config.initialInvestment}
          />
        </GlowCard>
      </Animated.View>

      {/* Controls */}
      <Animated.View entering={FadeInUp.delay(500)} style={styles.controlsRow}>
        {/* Auto-sweep */}
        <Animated.View style={[{ flex: 1 }, !isSweeping && btnPulseStyle]}>
          <AnimatedPressable onPress={handleSweepToggle} style={isSweeping ? styles.sweepBtnActive : styles.sweepBtn} accessibilityRole="button" accessibilityLabel={isSweeping ? 'עצור סריקה' : 'סרוק'}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>👆</Text>
              <View accessible={false}><LottieIcon source={isSweeping ? LOTTIE_CLOCK : LOTTIE_PLAY} size={20} /></View>
              <Text style={isSweeping ? styles.sweepBtnTextActive : styles.sweepBtnText}>
                {isSweeping ? 'עצור' : 'סרוק'}
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Complete */}
        <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
          <AnimatedPressable onPress={handleComplete} style={styles.completeBtn} disabled={isSweeping} accessibilityRole="button" accessibilityLabel="סיים ובחר">
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_CHECK} size={20} /></View>
              <Text style={styles.completeBtnText}>סיים ובחר</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </Animated.View>
    </View>
    <SharkTipModal
      visible={showSharkTip}
      message="אז למה לא להשקיע תמיד במניות? כי לטווח קצר מניות תנודתיות. יתכן שתהיה שנה דובית (ירידה של 20% בשוק) בדיוק כשנכנסתם."
      onClose={handleSharkTipClose}
    />
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SIM4.cardBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
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
  gradeBanner: {
    alignItems: 'center',
    marginVertical: 20,
  },
  gradeLabel: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  statsCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  statsTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsSubtitle: {
    color: SIM4.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceHero: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryValue: {
    color: '#0ea5e9',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  statValue: {
    color: SIM4.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  lessonText: {
    color: SIM4.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  rewardBadge: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  coinBadge: {
    backgroundColor: 'rgba(212,160,23,0.2)',
    borderColor: 'rgba(212,160,23,0.4)',
  },
  rewardText: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  replayBtn: {
    flex: 1,
    backgroundColor: SIM4.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
  },
  replayText: {
    color: SIM4.dark,
    fontSize: 15,
    fontWeight: '700',
  },
  continueBtn: {
    flex: 1,
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM4.btnPrimaryBorder,
  },
  continueText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  sweepBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#d97706',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sweepBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  sweepBtnActive: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  sweepBtnTextActive: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
  },
  completeBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: SIM4.btnPrimaryBorder,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

const riskSliderStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  endLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  currentValue: {
    color: SIM4.textOnGradientMuted,
    fontSize: 18,
    fontWeight: '900',
    ...SHADOW_LIGHT,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

const allocStyles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  barTrack: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 6,
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
    color: SIM4.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    ...SHADOW_LIGHT,
  },
});

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 30,
    marginTop: 8,
  },
  yAxis: {
    width: 58,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yLabel: {
    color: SIM4.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
    borderStyle: 'dashed',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: SIM4.cardBg,
  },
  xLabelsRow: {
    position: 'absolute',
    top: CHART_HEIGHT + 4,
    left: 0,
    right: 0,
    height: 20,
  },
  xLabel: {
    position: 'absolute',
    color: SIM4.textMuted,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const meterStyles = StyleSheet.create({
  container: {},
  title: {
    color: SIM4.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  track: {
    height: 10,
    backgroundColor: SIM4.trackBg,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  endLabel: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  currentLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});
