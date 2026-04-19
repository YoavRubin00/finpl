/**
 * SIM: מחיר vs. ערך, Price vs Value Chart
 * Screen: navigate a 10-year timeline, buy/sell based on margin of safety.
 */

import { useState, useCallback, useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import type { PVResult } from './priceValueTypes';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { formatShekel } from '../../../utils/format';
import { usePriceValue } from './usePriceValue';
import { PRICE_VALUE_DATA } from './priceValueData';
import { SIM_LOTTIE } from '../../shared-sim/simLottieMap';
import { FINN_STANDARD, FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { SIM4, GRADE_COLORS4, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, sim4Styles } from './simTheme';
import { getChapterTheme } from '../../../constants/theme';


const _th4 = getChapterTheme('chapter-4');

const GRADE_LOTTIES: Record<string, ReturnType<typeof require>> = {
  S: SIM_LOTTIE.trophy,
  A: SIM_LOTTIE.star,
  B: SIM_LOTTIE.check,
  C: SIM_LOTTIE.cross,
  F: SIM_LOTTIE.cross,
};

const GRADE_LABELS_TEXT: Record<string, string> = {
  S: 'משקיע ערך אגדי!',
  A: 'בנג\'מין גראהם גאה',
  B: 'ביצועים סבירים',
  C: 'מר שוק ניצח',
  F: 'צריך עוד תרגול',
};

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  SIM_LOTTIE.chart,
  SIM_LOTTIE.chartGrowth,
];

// ── Mini Chart ────────────────────────────────────────────────────────────

const CHART_WIDTH = 280;
const CHART_HEIGHT = 120;

function MiniChart({ currentIndex }: { currentIndex: number }) {
  // Show window of data up to current index
  const visibleData = PRICE_VALUE_DATA.slice(0, currentIndex + 1);

  // Find min/max for scaling
  const allPrices = visibleData.map((p) => p.price);
  const allValues = visibleData.map((p) => p.intrinsicValue);
  const allNums = [...allPrices, ...allValues];
  const minY = Math.min(...allNums) * 0.9;
  const maxY = Math.max(...allNums) * 1.1;
  const rangeY = maxY - minY || 1;

  // Sample points for rendering (max 60 bars to keep it performant)
  const step = Math.max(1, Math.floor(visibleData.length / 60));
  const sampledData = visibleData.filter((_, i) => i % step === 0 || i === visibleData.length - 1);
  const barWidth = CHART_WIDTH / Math.max(sampledData.length, 1);

  return (
    <View style={chartStyles.container}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{Math.round(maxY)}</Text>
        <Text style={chartStyles.yLabel}>{Math.round((maxY + minY) / 2)}</Text>
        <Text style={chartStyles.yLabel}>{Math.round(minY)}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.plotArea}>
        {/* Intrinsic value line (green dashes) */}
        {sampledData.map((point, i) => {
          const x = i * barWidth;
          const yNorm = (point.intrinsicValue - minY) / rangeY;
          const y = CHART_HEIGHT * (1 - yNorm);
          return (
            <View
              key={`v-${i}`}
              style={[
                chartStyles.valueDot,
                { left: x, top: y },
              ]}
            />
          );
        })}

        {/* Price line (blue bars) */}
        {sampledData.map((point, i) => {
          const x = i * barWidth;
          const yNorm = (point.price - minY) / rangeY;
          const barHeight = Math.max(2, CHART_HEIGHT * yNorm);
          return (
            <View
              key={`p-${i}`}
              style={[
                chartStyles.priceBar,
                {
                  left: x,
                  bottom: 0,
                  height: barHeight,
                  width: Math.max(1, barWidth - 1),
                },
              ]}
            />
          );
        })}

        {/* Current position indicator */}
        {sampledData.length > 0 && (
          <View
            style={[
              chartStyles.currentIndicator,
              { left: (sampledData.length - 1) * barWidth - 1 },
            ]}
          />
        )}
      </View>

      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={chartStyles.legendText}>מחיר שוק</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={chartStyles.legendText}>ערך פנימי</Text>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  yAxis: {
    width: 36,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'right',
  },
  plotArea: {
    flex: 1,
    height: CHART_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  priceBar: {
    position: 'absolute',
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  valueDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
    marginTop: -2,
  },
  currentIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fbbf24',
  },
  legend: {
    position: 'absolute',
    bottom: -18,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});

// ── Score Screen ──────────────────────────────────────────────────────────

interface ScoreScreenProps {
  result: PVResult;
  onReplay: () => void;
  onContinue: () => void;
}

function ScoreScreen({ result, onReplay, onContinue }: ScoreScreenProps) {
  const gradeColor = GRADE_COLORS4[result.grade] || SIM4.textPrimary;
  const gradeLabel = GRADE_LABELS_TEXT[result.grade] || '';
  const gradeLottie = GRADE_LOTTIES[result.grade] || SIM_LOTTIE.chart;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}>
      <ConfettiExplosion />

      {/* Grade card, white, premium */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 14 }}>
          <ExpoImage
            source={FINN_HAPPY}
            style={{ width: 84, height: 84, marginBottom: 8 }}
            contentFit="contain"
            accessible={false}
          />
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 38, fontWeight: '900', color: '#0c4a6e', marginBottom: 4 }}>
            {GRADE_HEBREW[result.grade] ?? result.grade}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', textAlign: 'center', writingDirection: 'rtl' }}>{gradeLabel}</Text>
          <View style={{ backgroundColor: '#f0f9ff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8, marginTop: 10, borderWidth: 1, borderColor: '#bae6fd' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0369a1' }}>{result.score}/100</Text>
          </View>
        </View>
      </Animated.View>

      {/* Captain Shark core principle */}
      <Animated.View entering={FadeInDown.duration(500).delay(80)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: 'rgba(14,165,233,0.1)', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(14,165,233,0.3)', padding: 12, marginBottom: 14 }}>
          <ExpoImage source={FINN_STANDARD} style={{ width: 56, height: 56, flexShrink: 0 }} contentFit="contain" accessible={false} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#0369a1', lineHeight: 21, writingDirection: 'rtl', textAlign: 'right' }}>
            🦈 קפטן שארק: "מחיר זה מה שאתה משלם. ערך זה מה שאתה מקבל.", קנה רק כשהערך גבוה מהמחיר.
          </Text>
        </View>
      </Animated.View>

      {/* Returns comparison */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: result.totalReturn >= 0 ? '#16a34a' : '#ef4444' }}>{result.totalReturn >= 0 ? '+' : ''}{result.totalReturn}%</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>התשואה שלך</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#16a34a' }}>+{result.grahamReturn}%</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>תשואת גראהם</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#16a34a' }}>{result.goodBuys}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>קניות חכמות</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Finn feedback bubble */}
      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#bae6fd', marginBottom: 14 }}>
          <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 44, height: 44, flexShrink: 0 }} contentFit="contain" />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0c4a6e', lineHeight: 22, writingDirection: 'rtl', textAlign: 'right' }}>
            {result.feedback}
          </Text>
        </View>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)}>
        <View style={{ backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fde68a', marginBottom: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400e', lineHeight: 22, writingDirection: 'rtl', textAlign: 'center' }}>
            💡 מרווח ביטחון = קנה כשהמחיר נמוך מהערך האמיתי
          </Text>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(500).delay(500)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={SIM_LOTTIE.replay} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={SIM_LOTTIE.arrowLeft} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────

interface PriceValueScreenProps {
  onComplete?: (score: number) => void;
}

export function PriceValueScreen({ onComplete }: PriceValueScreenProps) {
  const {
    state,
    currentPoint,
    totalPoints,
    portfolioValue,
    marginOfSafety,
    buy,
    sell,
    advance,
    fastForward,
    calculateResult,
    reset,
  } = usePriceValue();

  const [showResult, setShowResult] = useState(false);

  const valueScale = useSharedValue(1);

  const handleBuy = useCallback(() => {
    tapHaptic();
    buy();
    valueScale.value = withSequence(
      withSpring(1.08, SPRING_SNAPPY),
      withSpring(1, SPRING_SNAPPY),
    );
  }, [buy, valueScale]);

  const handleSell = useCallback(() => {
    heavyHaptic();
    sell();
    valueScale.value = withSequence(
      withSpring(1.08, SPRING_SNAPPY),
      withSpring(1, SPRING_SNAPPY),
    );
  }, [sell, valueScale]);

  const handleAdvance = useCallback(() => {
    tapHaptic();
    advance();
  }, [advance]);

  const handleFastForward = useCallback(() => {
    heavyHaptic();
    fastForward();
  }, [fastForward]);

  const handleReplay = useCallback(() => {
    setShowResult(false);
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    const result = calculateResult();
    onComplete?.(result?.score ?? 0);
  }, [calculateResult, onComplete]);

  const valueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  // Show result screen
  useEffect(() => {
    if (state.isComplete) setShowResult(true);
  }, [state.isComplete]);

  if (showResult) {
    const result = calculateResult();
    if (!result) return null;
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
        <ScoreScreen result={result} onReplay={handleReplay} onContinue={handleContinue} />
      </SimLottieBackground>
    );
  }

  const progress = (state.currentIndex / (totalPoints - 1)) * 100;
  const isUndervalued = currentPoint ? currentPoint.price < currentPoint.intrinsicValue : false;
  const canBuy = state.cash >= 10000;
  const canSell = state.holdings > 0;

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <View style={{ flex: 1, padding: 12 }}>

        {/* Finn hint, only first 2 months */}
        {state.currentIndex < 2 && (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 14, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#bae6fd' }}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36 }} contentFit="contain" />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0c4a6e', lineHeight: 20, writingDirection: 'rtl', textAlign: 'right' }}>
              כשהמחיר (כחול) מתחת לערך (ירוק), קנה! כשמעל, מכור.
            </Text>
          </View>
        )}

        {/* Progress bar + month counter, RTL */}
        <View style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: SIM4.textSecondary, writingDirection: 'rtl' }}>
              חודש {state.currentIndex + 1} מתוך {totalPoints}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: SIM4.textSecondary }}>
              {Math.round(progress)}%
            </Text>
          </View>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <View style={sim4Styles.progressTrack}>
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[sim4Styles.progressFill, { width: `${progress}%`, backgroundColor: SIM4.primary }]}
              />
            </View>
          </View>
        </View>

        {/* Chart */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <GlowCard glowColor="rgba(59, 130, 246, 0.15)" style={sim4Styles.gameCard}>
            <View style={{ padding: 16 }}>
              <MiniChart currentIndex={state.currentIndex} />
              <View style={{ height: 24 }} />
            </View>
          </GlowCard>
        </Animated.View>

        {/* Combined info + portfolio, compact */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={valueAnimStyle}>
          <GlowCard glowColor={isUndervalued ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'} style={sim4Styles.gameCard}>
            <View style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: SIM4.textSecondary, fontWeight: '600', writingDirection: 'rtl' }}>מחיר שוק</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#3b82f6' }}>{currentPoint ? `₪${currentPoint.price.toFixed(0)}` : '—'}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: SIM4.textSecondary, fontWeight: '600' }}>מרווח</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: marginOfSafety > 0 ? SIM4.gain : SIM4.loss }}>{marginOfSafety > 0 ? '+' : ''}{marginOfSafety.toFixed(0)}%</Text>
                </View>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 11, color: SIM4.textSecondary, fontWeight: '600' }}>ערך פנימי</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#22c55e' }}>{currentPoint ? `₪${currentPoint.intrinsicValue.toFixed(0)}` : '—'}</Text>
                </View>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: SIM4.textSecondary, writingDirection: 'rtl' }}>💰 {formatShekel(state.cash)}  |  📊 {state.holdings} יח׳</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: portfolioValue >= 100000 ? SIM4.gain : SIM4.loss }}>{formatShekel(portfolioValue)}</Text>
              </View>
            </View>
          </GlowCard>
        </Animated.View>

        {/* Action buttons */}
        {/* Smart action buttons, color-coded by context */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.actionRow}>
          <AnimatedPressable
            onPress={handleBuy}
            style={[
              styles.actionBtn,
              {
                backgroundColor: canBuy && isUndervalued ? '#16a34a' : canBuy ? '#64748b' : '#cbd5e1',
                borderBottomColor: canBuy && isUndervalued ? '#15803d' : canBuy ? '#475569' : '#64748b',
              },
            ]}
            disabled={!canBuy}
            accessibilityRole="button"
            accessibilityLabel="קנה"
          >
            <Text style={styles.actionBtnText}>{isUndervalued ? '🟢 קנה!' : '⚪ קנה'}</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleSell}
            style={[
              styles.actionBtn,
              {
                backgroundColor: canSell && !isUndervalued ? '#dc2626' : canSell ? '#64748b' : '#cbd5e1',
                borderBottomColor: canSell && !isUndervalued ? '#b91c1c' : canSell ? '#475569' : '#64748b',
              },
            ]}
            disabled={!canSell}
            accessibilityRole="button"
            accessibilityLabel="מכור"
          >
            <Text style={styles.actionBtnText}>{!isUndervalued && canSell ? '🔴 מכור!' : '⚪ מכור'}</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleAdvance}
            style={[
              styles.actionBtn,
              {
                backgroundColor: '#0284c7',
                borderBottomColor: '#0369a1',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="חודש הבא"
          >
            <Text style={styles.actionBtnText}>⏩ הבא</Text>
          </AnimatedPressable>
        </Animated.View>

      </View>
    </SimLottieBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: SIM4.textOnGradient,
    ...SHADOW_STRONG,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
    lineHeight: 22,
  },
  progressRow: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
  finnBubble: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  finnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
    lineHeight: 22,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  miniStatValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  miniStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textSecondary,
    marginTop: 2,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
});
