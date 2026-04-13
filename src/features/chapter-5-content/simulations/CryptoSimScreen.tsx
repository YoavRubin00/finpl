/**
 * SIM 5-30: סימולטור הקריפטו (Crypto Sim) — Module 5-30
 * Allocate between BTC, ETH, Cash → 3-year sim vs S&P 500 → score.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
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
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useCryptoSim } from './useCryptoSim';
import { INITIAL_AMOUNT, TOTAL_YEARS } from './cryptoSimData';
import {
  SIM5,
  SHADOW_STRONG,
  SHADOW_LIGHT,
  RTL,
  sim5Styles,
  GRADE_COLORS5,
  GRADE_HEBREW,
} from './simTheme';
import type { CryptoSimScore, CryptoAssetId } from './cryptoSimTypes';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 180;

const ASSET_COLORS: Record<CryptoAssetId, string> = {
  btc: '#f59e0b', // orange/gold
  eth: '#3b82f6', // blue
  cash: '#16a34a', // green
};

const LINE_COLORS = {
  crypto: '#f59e0b',  // gold
  stock: '#3b82f6',   // blue
} as const;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');

const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

/* ================================================================== */
/*  DualLineChart — crypto (gold) vs S&P 500 (blue)                     */
/* ================================================================== */

function DualLineChart({
  cryptoValues,
  stockValues,
}: {
  cryptoValues: number[];
  stockValues: number[];
}) {
  const allValues = [...cryptoValues, ...stockValues];
  if (allValues.length === 0) return null;

  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const range = maxVal - minVal || 1;

  const maxPoints = Math.max(cryptoValues.length, stockValues.length);
  const stepX = maxPoints > 1 ? CHART_WIDTH / (maxPoints - 1) : CHART_WIDTH;
  const baselineY =
    CHART_HEIGHT - ((INITIAL_AMOUNT - minVal) / range) * CHART_HEIGHT;

  const lines: { values: number[]; color: string; label: string }[] = [
    { values: stockValues, color: LINE_COLORS.stock, label: 'stock' },
    { values: cryptoValues, color: LINE_COLORS.crypto, label: 'crypto' },
  ];

  return (
    <View style={chartStyles.container}>
      {/* Y-axis */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{formatShekel(maxVal)}</Text>
        <Text style={chartStyles.yLabel}>
          {formatShekel((maxVal + minVal) / 2)}
        </Text>
        <Text style={chartStyles.yLabel}>{formatShekel(minVal)}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.chartArea}>
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />
        <View style={[chartStyles.baseline, { top: baselineY }]} />

        {lines.map(({ values, color, label }) => {
          const points = values.map((val, i) => ({
            x: i * stepX,
            y: CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT,
          }));

          return (
            <View key={label}>
              {points.map((point, i) => {
                if (i === 0) return null;
                const prev = points[i - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                  <View
                    key={`${label}-seg-${i}`}
                    style={[
                      chartStyles.lineSegment,
                      {
                        left: prev.x,
                        top: prev.y,
                        width: length,
                        height: 3,
                        borderRadius: 1.5,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: color,
                      },
                    ]}
                  />
                );
              })}

              {/* End dot */}
              {points.length > 1 && (
                <View
                  style={[
                    chartStyles.dataPoint,
                    {
                      left: points[points.length - 1].x - 5,
                      top: points[points.length - 1].y - 5,
                      backgroundColor: color,
                      borderColor: SIM5.cardBg,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* X-axis labels */}
        <View style={chartStyles.xLabelsRow}>
          {Array.from({ length: maxPoints }, (_, i) => (
            <Text
              key={`x-${i}`}
              style={[chartStyles.xLabel, { left: i * stepX - 12, width: 24 }]}
            >
              {i === 0 ? 'התחלה' : `שנה ${i}`}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  AllocationSlider — single asset slider with label                   */
/* ================================================================== */

function AllocationSlider({
  assetId,
  emoji,
  name,
  percent,
  color,
  disabled,
  onValueChange,
}: {
  assetId: CryptoAssetId;
  emoji: string;
  name: string;
  percent: number;
  color: string;
  disabled: boolean;
  onValueChange: (assetId: CryptoAssetId, value: number) => void;
}) {
  return (
    <View style={sliderStyles.row}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.emoji}>{emoji}</Text>
        <Text style={[sliderStyles.name, { color }]}>{name}</Text>
        <Text style={[sliderStyles.percent, { color }]}>{percent}%</Text>
      </View>
      <Slider
        style={sliderStyles.slider}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={percent}
        minimumTrackTintColor={color}
        maximumTrackTintColor="rgba(255,255,255,0.2)"
        thumbTintColor={color}
        disabled={disabled}
        onValueChange={(val: number) => onValueChange(assetId, val)}
        accessibilityRole="adjustable"
        accessibilityLabel={`הקצאה ל-${name}`}
        accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      />
    </View>
  );
}

/* ================================================================== */
/*  ScoreScreen — results after 3 years                                 */
/* ================================================================== */

function ScoreScreen({
  score,
  allocation,
  onReplay,
  onContinue,
}: {
  score: CryptoSimScore;
  allocation: { btcPercent: number; ethPercent: number; cashPercent: number };
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S' || score.grade === 'A');

  const cryptoWon = score.cryptoFinal > score.stockFinal;
  const diffPercent = Math.round(
    ((score.cryptoFinal - score.stockFinal) / score.stockFinal) * 100,
  );
  const diffSign = diffPercent >= 0 ? '+' : '';

  return (
    <ScrollView style={scoreStyles.scroll} contentContainerStyle={scoreStyles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Portfolio comparison */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text accessibilityLiveRegion="polite" style={[scoreStyles.headline, RTL]}>
              {cryptoWon ? 'הקריפטו ניצח! ₿' : 'S&P 500 ניצח 📊'}
            </Text>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={[sim5Styles.scoreRowLabel, RTL]}>תיק קריפטו</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: LINE_COLORS.crypto }]}>
                {formatShekel(score.cryptoFinal)}
              </Text>
            </View>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={[sim5Styles.scoreRowLabel, RTL]}>S&P 500</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: LINE_COLORS.stock }]}>
                {formatShekel(score.stockFinal)}
              </Text>
            </View>

            <View style={sim5Styles.scoreDivider}>
              <Text style={[sim5Styles.scoreTotalLabel, RTL]}>הפרש</Text>
              <Text
                style={[
                  sim5Styles.scoreTotalValue,
                  { color: cryptoWon ? SIM5.success : SIM5.danger },
                ]}
              >
                {diffSign}{diffPercent}%
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Volatility & Drawdown */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>ניתוח סיכון</Text>

            <View style={sim5Styles.scoreRow}>
              <Text style={[sim5Styles.scoreRowLabel, RTL]}>ירידה מקסימלית</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.danger }]}>
                {score.maxDrawdown}%
              </Text>
            </View>

            <View style={sim5Styles.scoreRow}>
              <Text style={[sim5Styles.scoreRowLabel, RTL]}>יחס תנודתיות (מול מניות)</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.textPrimary }]}>
                ×{score.volatilityRatio}
              </Text>
            </View>

            <View style={sim5Styles.scoreRow}>
              <Text style={[sim5Styles.scoreRowLabel, RTL]}>הקצאה שלך</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.textPrimary }]}>
                ₿{allocation.btcPercent}% Ξ{allocation.ethPercent}% 💵{allocation.cashPercent}%
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Lesson */}
      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <View style={sim5Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim5Styles.insightText, RTL, { flex: 1 }]}>
                קריפטו מעניין כלווין קטן (עד 5%) — לא כליבה של תיק. תנודתיות גבוהה עלולה לגרום לירידות חדות שקשה לספוג.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Finn ETF tip */}
      <Animated.View entering={FadeInUp.delay(350)} style={{ marginTop: 12 }}>
        <View style={scoreStyles.finnTip}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
            <LottieIcon source={LOTTIE_SHIELD} size={36} />
            <Text style={[RTL, scoreStyles.finnTipText]}>
              ידעתם? אפשר להיחשף לקריפטו גם דרך תעודות סל שנסחרות בבורסה האמריקאית — בלי ארנק דיגיטלי ובלי סיכוני פריצה. למשל IBIT לביטקוין ו-ETHA לאת׳ריום.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(450)} style={sim5Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim5Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim5Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim5Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim5Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  Main Screen                                                         */
/* ================================================================== */

interface CryptoSimScreenProps {
  onComplete?: (score: number) => void;
}

export function CryptoSimScreen({ onComplete }: CryptoSimScreenProps) {
  const {
    state,
    config,
    score,
    updateAllocation,
    play,
    pause,
    reset,
  } = useCryptoSim();


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

  /* ── Balance animation with screen shake on big moves ── */
  const balanceScale = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const prevCrypto = useRef(INITIAL_AMOUNT);

  const currentCrypto =
    state.cryptoBalanceByYear[state.cryptoBalanceByYear.length - 1] ?? INITIAL_AMOUNT;
  const currentStock =
    state.stockBalanceByYear[state.stockBalanceByYear.length - 1] ?? INITIAL_AMOUNT;

  useEffect(() => {
    const diff = Math.abs(currentCrypto - prevCrypto.current);
    const pctChange = prevCrypto.current > 0
      ? (diff / prevCrypto.current) * 100
      : 0;
    prevCrypto.current = currentCrypto;

    if (diff > 1000) {
      // Balance scale pulse
      balanceScale.value = withSequence(
        withSpring(1.08, { damping: 18, stiffness: 200 }),
        withSpring(1, { damping: 18, stiffness: 150 }),
      );
    }

    // Screen shake on big moves (>30% change)
    if (pctChange > 30) {
      containerScale.value = withSequence(
        withTiming(0.97, { duration: 80 }),
        withTiming(1.02, { duration: 80 }),
        withTiming(0.99, { duration: 80 }),
        withSpring(1, { damping: 20, stiffness: 200 }),
      );
      heavyHaptic();
    }
  }, [currentCrypto, balanceScale, containerScale]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  /* ── Play button pulse ── */
  const btnPulse = useSharedValue(1);
  const canPlay = !state.isPlaying && !state.isComplete && state.currentYear === 0;

  useEffect(() => {
    if (canPlay) {
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
  }, [canPlay, btnPulse]);

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  /* ── Callbacks ── */
  const handleSliderChange = useCallback(
    (assetId: CryptoAssetId, value: number) => {
      updateAllocation(assetId, value);
    },
    [updateAllocation],
  );

  const handlePlay = useCallback(() => {
    heavyHaptic();
    play();
  }, [play]);

  const handlePause = useCallback(() => {
    tapHaptic();
    pause();
  }, [pause]);

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

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Score Phase                                                        */
  /* ════════════════════════════════════════════════════════════════════ */

  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
        <ScoreScreen
          score={score}
          allocation={state.allocation}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Interactive + Simulation Phase                                     */
  /* ════════════════════════════════════════════════════════════════════ */

  const cryptoLeading = currentCrypto > currentStock;
  const isSimRunning = state.currentYear > 0;
  const slidersDisabled = state.isPlaying || state.currentYear > 0;

  return (
    <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
      <Animated.View style={[{ flex: 1 }, containerAnimStyle]}>
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={[styles.subtitle, RTL, { textAlign: 'center', marginBottom: 4 }]}>
              הקצה ₪{INITIAL_AMOUNT.toLocaleString('he-IL')} בין BTC, ETH ומזומן
            </Text>

          {/* Year counter */}
          {isSimRunning && (
            <Animated.View entering={FadeInDown.delay(50)}>
              <Text style={styles.yearCounter}>
                שנה {state.currentYear} / {TOTAL_YEARS}
              </Text>
            </Animated.View>
          )}

          {/* Allocation sliders */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <GlowCard
              glowColor="rgba(167,139,250,0.2)"
              style={{ backgroundColor: SIM5.cardBg }}
            >
              <View style={sliderStyles.container}>
                <Text style={[sliderStyles.heading, RTL]}>הקצאת תיק</Text>
                {config.assets.map((asset) => {
                  let percent = 0;
                  if (asset.id === 'btc') percent = state.allocation.btcPercent;
                  else if (asset.id === 'eth') percent = state.allocation.ethPercent;
                  else percent = state.allocation.cashPercent;

                  return (
                    <AllocationSlider
                      key={asset.id}
                      assetId={asset.id}
                      emoji={asset.emoji}
                      name={asset.name}
                      percent={percent}
                      color={ASSET_COLORS[asset.id]}
                      disabled={slidersDisabled}
                      onValueChange={handleSliderChange}
                    />
                  );
                })}
              </View>
            </GlowCard>
          </Animated.View>

          {/* Dual balance display (shown during/after sim) */}
          {isSimRunning && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <GlowCard
                glowColor="rgba(245,158,11,0.2)"
                style={{ backgroundColor: SIM5.cardBg }}
              >
                <View style={styles.balanceContainer}>
                  <Animated.View style={[styles.balanceCol, balanceAnimStyle]}>
                    <View style={[styles.balanceDot, { backgroundColor: LINE_COLORS.crypto }]} />
                    <Text style={[styles.balanceLabel, RTL]}>תיק קריפטו</Text>
                    <Text
                      style={[
                        styles.balanceHero,
                        { color: cryptoLeading ? SIM5.success : SIM5.textPrimary },
                      ]}
                    >
                      {formatShekel(currentCrypto)}
                    </Text>
                  </Animated.View>

                  <View style={styles.balanceDivider} />

                  <View style={styles.balanceCol}>
                    <View style={[styles.balanceDot, { backgroundColor: LINE_COLORS.stock }]} />
                    <Text style={[styles.balanceLabel, RTL]}>S&P 500</Text>
                    <Text
                      style={[
                        styles.balanceHero,
                        { color: !cryptoLeading ? SIM5.success : SIM5.textPrimary },
                      ]}
                    >
                      {formatShekel(currentStock)}
                    </Text>
                  </View>
                </View>
              </GlowCard>
            </Animated.View>
          )}

          {/* Dual line chart (shown during/after sim) */}
          {isSimRunning && (
            <Animated.View entering={FadeInUp.delay(200)}>
              <GlowCard
                glowColor="rgba(167,139,250,0.15)"
                style={{ backgroundColor: SIM5.cardBg }}
              >
                <View style={{ padding: 16 }}>
                  <Text style={[styles.chartTitle, RTL]}>
                    סימולציה — {TOTAL_YEARS} שנים
                  </Text>

                  {/* Legend */}
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: LINE_COLORS.crypto }]} />
                      <Text style={styles.legendText}>₿ קריפטו</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: LINE_COLORS.stock }]} />
                      <Text style={styles.legendText}>📊 S&P 500</Text>
                    </View>
                  </View>

                  <DualLineChart
                    cryptoValues={state.cryptoBalanceByYear}
                    stockValues={state.stockBalanceByYear}
                  />
                </View>
              </GlowCard>
            </Animated.View>
          )}

          {/* Max drawdown callout (shown when drawdown > 0) */}
          {state.maxDrawdownPercent > 0 && (
            <Animated.View entering={FadeInUp.delay(250)}>
              <View style={styles.drawdownCard}>
                <LottieIcon source={LOTTIE_SHIELD} size={20} />
                <Text style={[styles.drawdownText, RTL]}>
                  ⚠️ ירידה מקסימלית: {state.maxDrawdownPercent}%
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Play / Pause button */}
          <Animated.View
            entering={FadeInUp.delay(300)}
            style={{ alignItems: 'center', marginTop: 8, marginBottom: 20 }}
          >
            {!isSimRunning ? (
              <Animated.View style={btnPulseStyle}>
                <AnimatedPressable onPress={handlePlay} style={styles.playBtn} accessibilityRole="button" accessibilityLabel={`הרץ ${TOTAL_YEARS} שנים`}>
                  <View style={styles.btnInner}>
                    <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                    <Text style={styles.playBtnText}>▶️ הרץ {TOTAL_YEARS} שנים</Text>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            ) : state.isPlaying ? (
              <AnimatedPressable onPress={handlePause} style={styles.pauseBtn} accessibilityRole="button" accessibilityLabel="עצור">
                <View style={styles.btnInner}>
                  <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                  <Text style={styles.pauseBtnText}>⏸️ עצור</Text>
                </View>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable onPress={handlePlay} style={styles.playBtn} accessibilityRole="button" accessibilityLabel="המשך סימולציה">
                <View style={styles.btnInner}>
                  <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                  <Text style={styles.playBtnText}>▶️ המשך סימולציה</Text>
                </View>
              </AnimatedPressable>
            )}
          </Animated.View>

          {/* Progress bar */}
          {isSimRunning && (
            <Animated.View entering={FadeInUp.delay(350)} style={{ marginTop: 14 }}>
              <View style={[sim5Styles.progressTrack, { transform: [{ scaleX: -1 }] }]}>
                <View
                  style={[
                    sim5Styles.progressFill,
                    {
                      width: `${(state.currentYear / TOTAL_YEARS) * 100}%`,
                      backgroundColor: LINE_COLORS.crypto,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          )}

          {/* Hint */}
          {!isSimRunning && (
            <Animated.View entering={FadeInUp.delay(400)}>
              <View style={styles.hintRow}>
                <LottieIcon source={LOTTIE_BULB} size={20} />
                <Text style={[styles.hintText, RTL]}>
                  נסה הקצאות שונות — כמה קריפטו אתה מוכן לסבול? שים לב לתנודתיות!
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: SIM5.textOnGradient,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM5.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  yearCounter: {
    color: SIM5.textOnGradient,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },

  /* Balance dual display */
  balanceContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  balanceCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM5.textSecondary,
  },
  balanceHero: {
    fontSize: 22,
    fontWeight: '900',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 8,
  },

  /* Chart */
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM5.textSecondary,
  },

  /* Drawdown callout */
  drawdownCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: SIM5.dangerLight,
    borderWidth: 1.5,
    borderColor: SIM5.dangerBorder,
    borderRadius: 14,
    padding: 12,
  },
  drawdownText: {
    color: SIM5.danger,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  /* Buttons */
  btnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#4c1d95',
    shadowColor: SIM5.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  pauseBtn: {
    backgroundColor: SIM5.cardBg,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#dc2626',
  },
  pauseBtnText: {
    color: '#dc2626',
    fontSize: 17,
    fontWeight: '800',
  },

  /* Hint */
  hintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  hintText: {
    color: SIM5.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    ...SHADOW_LIGHT,
  },
});

/* ── Slider styles ── */
const sliderStyles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 4,
  },
  row: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  emoji: {
    fontSize: 20,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  percent: {
    fontSize: 17,
    fontWeight: '900',
    minWidth: 50,
    textAlign: 'left',
  },
  slider: {
    width: '100%',
    height: 36,
  },
});

/* ── Chart styles ── */
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
    color: SIM5.textMuted,
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
    backgroundColor: SIM5.cardBorder,
    borderStyle: 'dashed',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM5.cardBorder,
  },
  lineSegment: {
    position: 'absolute',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
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
    color: SIM5.textMuted,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/* ── Score styles ── */
const scoreStyles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headline: {
    fontSize: 20,
    fontWeight: '900',
    color: SIM5.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: SIM5.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  finnTip: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#fde68a',
  },
  finnTipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 22,
  },
});
