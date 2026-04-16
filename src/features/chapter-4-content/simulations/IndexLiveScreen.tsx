/**
 * SIM 20: מדד לייב (Index Live — S&P 500 Time Machine) — Module 4-20
 * Time machine slider from 1980 to 2025. Shows ₪10,000 invested in S&P 500
 * at any starting year and its value today. Key insight: time in the market
 * beats timing the market.
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
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { getChapterTheme } from '../../../constants/theme';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useIndexLive } from './useIndexLive';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE4, sim4Styles } from './simTheme';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 200;

/* ── Chapter 4 gradient (for SimLottieBackground) ── */
const _th4 = getChapterTheme('chapter-4');

/* ── Lottie assets ── */
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_BUILDING = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/** Key historical events to label on the chart */
const CHART_EVENTS: Array<{ year: number; label: string; emoji: string }> = [
  { year: 1987, label: 'Black Monday', emoji: '📉' },
  { year: 2000, label: 'Dot-com', emoji: '💥' },
  { year: 2008, label: 'משבר 2008', emoji: '🔴' },
  { year: 2020, label: 'COVID', emoji: '🦠' },
];

/* ================================================================== */
/*  AreaChart — animated growth chart with event markers               */
/* ================================================================== */

function AreaChart({
  yearPath,
  initialInvestment,
}: {
  yearPath: Array<{ year: number; value: number }>;
  initialInvestment: number;
}) {
  if (yearPath.length < 2) return null;

  const values = yearPath.map((p) => p.value);
  const maxVal = Math.max(...values) * 1.1;
  const minVal = Math.min(...values, initialInvestment) * 0.9;
  const range = maxVal - minVal || 1;

  const stepX = CHART_WIDTH / (yearPath.length - 1);

  const points = yearPath.map((p, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((p.value - minVal) / range) * CHART_HEIGHT,
    year: p.year,
    value: p.value,
  }));

  // Baseline Y for initial investment
  const baselineY = CHART_HEIGHT - ((initialInvestment - minVal) / range) * CHART_HEIGHT;

  // Find events that fall within the year range
  const startYear = yearPath[0].year;
  const endYear = yearPath[yearPath.length - 1].year;
  const visibleEvents = CHART_EVENTS.filter(
    (e) => e.year >= startYear && e.year <= endYear,
  );

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
        {/* Grid lines */}
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />

        {/* Baseline */}
        <View style={[chartStyles.baseline, { top: baselineY }]} />

        {/* Area fill segments */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const isAbove = point.value >= initialInvestment;
          const segWidth = stepX;
          const topY = Math.min(prev.y, point.y);
          const fillHeight = CHART_HEIGHT - topY;

          return (
            <View
              key={`area-${i}`}
              style={[
                chartStyles.areaFill,
                {
                  left: prev.x,
                  top: topY,
                  width: segWidth,
                  height: fillHeight,
                  backgroundColor: isAbove
                    ? 'rgba(212, 175, 55, 0.08)'
                    : 'rgba(239, 68, 68, 0.06)',
                },
              ]}
            />
          );
        })}

        {/* Line segments */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const isAbove = point.value >= initialInvestment;

          return (
            <View
              key={`line-${i}`}
              style={[
                chartStyles.lineSegment,
                {
                  left: prev.x,
                  top: prev.y,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: isAbove ? '#d4af37' : '#ef4444',
                },
              ]}
            />
          );
        })}

        {/* Data points (only show every few to avoid clutter) */}
        {points.map((point, i) => {
          // Show first, last, and every 5th point
          if (i !== 0 && i !== points.length - 1 && i % 5 !== 0) return null;
          const isAbove = point.value >= initialInvestment;
          return (
            <View
              key={`dot-${i}`}
              style={[
                chartStyles.dataPoint,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                  backgroundColor: isAbove ? '#d4af37' : '#ef4444',
                },
              ]}
            />
          );
        })}

        {/* Event markers */}
        {visibleEvents.map((event) => {
          const pointIndex = yearPath.findIndex((p) => p.year === event.year);
          if (pointIndex < 0 || pointIndex >= points.length) return null;
          const p = points[pointIndex];
          return (
            <View
              key={`event-${event.year}`}
              style={[chartStyles.eventMarker, { left: p.x - 12, top: p.y - 28 }]}
            >
              <Text style={chartStyles.eventEmoji}>{event.emoji}</Text>
              <View style={chartStyles.eventLine} />
            </View>
          );
        })}

        {/* X-axis labels (show start, some midpoints, and end) */}
        <View style={chartStyles.xLabelsRow}>
          {points.map((point, i) => {
            // Show first, last, and every 10th
            if (i !== 0 && i !== points.length - 1 && i % 10 !== 0) return null;
            return (
              <Text
                key={`x-${i}`}
                style={[
                  chartStyles.xLabel,
                  { left: point.x - 14, width: 28 },
                ]}
              >
                {point.year}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  TimeDial — styled year slider                                      */
/* ================================================================== */

function TimeDial({
  year,
  minYear,
  maxYear,
  onYearChange,
}: {
  year: number;
  minYear: number;
  maxYear: number;
  onYearChange: (y: number) => void;
}) {
  return (
    <View style={dialStyles.container}>
      <View style={dialStyles.header}>
        <LottieIcon source={LOTTIE_CLOCK} size={22} />
        <Text style={dialStyles.title}>מכונת הזמן</Text>
      </View>
      <View style={dialStyles.yearDisplay}>
        <Text style={dialStyles.yearText}>{year}</Text>
        <Text style={dialStyles.yearSub}>שנת השקעה</Text>
      </View>
      <View style={dialStyles.sliderRow}>
        <Text style={dialStyles.endLabel}>{minYear}</Text>
        <Slider
          value={year}
          onValueChange={(v) => onYearChange(Math.round(v))}
          minimumValue={minYear}
          maximumValue={maxYear}
          step={1}
          minimumTrackTintColor="#d4af37"
          maximumTrackTintColor={SIM4.trackBg}
          thumbTintColor="#d4af37"
          style={dialStyles.slider}
          accessibilityRole="adjustable"
          accessibilityLabel="שנת השקעה"
          accessibilityValue={{ min: minYear, max: maxYear, now: year, text: `${year}` }}
        />
        <Text style={dialStyles.endLabel}>{maxYear}</Text>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  ScoreScreen — results after completing                             */
/* ================================================================== */

function ScoreScreen({
  state,
  score,
  bestValue,
  worstValue,
  initialInvestment,
  onReplay,
  onContinue,
}: {
  state: ReturnType<typeof useIndexLive>['state'];
  score: NonNullable<ReturnType<typeof useIndexLive>['score']>;
  bestValue: number;
  worstValue: number;
  initialInvestment: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade banner */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <View accessible={false}><LottieIcon source={LOTTIE_BUILDING} size={56} /></View>
        <Text style={[sim4Styles.gradeLabel, { fontSize: 24, fontWeight: '900', color: '#d4af37', marginTop: 8 }]}>
          S&P 500 Time Machine
        </Text>
      </Animated.View>

      {/* Your choice summary */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[TYPE4.cardTitle, RTL]}>
              הבחירה שלך: השקעה מ-{state.selectedStartYear}
            </Text>
            <Text style={styles.summaryValue}>
              ₪{initialInvestment.toLocaleString('he-IL')} → ₪{state.currentValue.toLocaleString('he-IL')}
            </Text>
            <Text style={[styles.returnText, { color: state.totalReturn >= 0 ? '#d4af37' : '#ef4444' }]}>
              {state.totalReturn >= 0 ? '+' : ''}{state.totalReturn}%
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Best vs Worst comparison */}
      <Animated.View entering={FadeInUp.delay(200)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.scoreRow}>
              <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]} numberOfLines={1}>{state.bestStartYear} (טובה)</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: '#22c55e', fontSize: 14 }]} numberOfLines={1}>
                ₪{bestValue.toLocaleString('he-IL')}
              </Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_DECREASE} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]} numberOfLines={1}>{state.worstStartYear} (גרועה)</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: '#ef4444', fontSize: 14 }]} numberOfLines={1}>
                ₪{worstValue.toLocaleString('he-IL')}
              </Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>תשואה שנתית ממוצעת</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: '#d4af37' }]}>
                {score.averageAnnualReturn}%
              </Text>
            </View>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CLOCK} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>שנות השקעה</Text>
              </View>
              <Text style={sim4Styles.scoreRowValue}>{score.yearsInvested}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Worst case highlight */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[TYPE4.cardBody, RTL, { flex: 1 }]}>
                גם אם היית משקיע ב-2007 (ממש לפני המשבר) — עד 2025 עדיין היית ברווח משמעותי!
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Key Lesson */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_TARGET} size={22} />
              <Text style={[TYPE4.cardBody, RTL, { flex: 1 }]}>
                אי אפשר לתזמן את השוק. אפשר להיות בשוק. S&P 500 = +10% בממוצע.
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
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  Helper                                                             */
/* ================================================================== */

/* ================================================================== */
/*  Main Screen                                                        */
/* ================================================================== */

interface IndexLiveScreenProps {
  onComplete?: () => void;
}

export function IndexLiveScreen({ onComplete }: IndexLiveScreenProps) {
  const {
    state,
    config,
    yearPath,
    yearsInvested,
    averageAnnualReturn,
    bestValue,
    worstValue,
    score,
    setStartYear,
    complete,
    reset,
  } = useIndexLive();


  const rewardsGranted = useRef(false);

  // Value animation
  const valueScale = useSharedValue(1);
  const prevValue = useRef(state.currentValue);

  useEffect(() => {
    const diff = Math.abs(state.currentValue - prevValue.current);
    prevValue.current = state.currentValue;
    if (diff > 5000) {
      valueScale.value = withSequence(
        withSpring(1.03, { damping: 22, stiffness: 200 }),
        withSpring(1, { damping: 22, stiffness: 150 }),
      );
      if (state.currentValue > config.initialInvestment * 5) {
        successHaptic();
      }
    }
  }, [state.currentValue, valueScale, config.initialInvestment]);

  // Grant rewards on completion
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const valueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  const handleYearChange = useCallback(
    (year: number) => {
      setStartYear(year);
      tapHaptic();
    },
    [setStartYear],
  );

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
    onComplete?.();
  }, [onComplete]);

  const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-163-graph-line-chart-hover-slide.json'),
    require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json'),
  ];

  // ── Results Phase ────────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScoreScreen
        state={state}
        score={score}
        bestValue={bestValue}
        worstValue={worstValue}
        initialInvestment={config.initialInvestment}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // ── Slider Phase ─────────────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
      {/* Title */}
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_CLOCK} size={28} /></View>
          <Text accessibilityRole="header" style={[TYPE4.title, { fontSize: 28 }]}>מדד לייב — מכונת הזמן</Text>
        </View>
        <Text style={[TYPE4.subtitle, RTL, { marginTop: 4, textAlign: 'center' }]}>
          בחר שנת השקעה וגלה כמה שווה ₪{config.initialInvestment.toLocaleString('he-IL')} היום
        </Text>
      </Animated.View>

      {/* Time Dial — Year Slider */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <TimeDial
          year={state.selectedStartYear}
          minYear={config.startYearRange[0]}
          maxYear={config.startYearRange[1]}
          onYearChange={handleYearChange}
        />
      </Animated.View>

      {/* Value Counter — Hero Display */}
      <Animated.View entering={FadeInUp.delay(200)}>
        <GlowCard glowColor={`${SIM4.glow}4d`} style={styles.statsCard}>
          <Text style={[TYPE4.cardTitle, { textAlign: 'center' }]}>
            ₪{config.initialInvestment.toLocaleString('he-IL')} ב-{state.selectedStartYear} =
          </Text>
          <Animated.View style={valueAnimStyle}>
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.heroValue,
                {
                  color: state.currentValue >= config.initialInvestment ? '#d4af37' : '#ef4444',
                },
              ]}
            >
              {formatShekel(state.currentValue)}
            </Text>
          </Animated.View>
          <Text style={styles.heroSub}>
            היום ({yearsInvested} שנים)
          </Text>
        </GlowCard>
      </Animated.View>

      {/* Main Chart */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <GlowCard glowColor={`${SIM4.glow}1f`} style={styles.statsCard}>
          <Text style={[TYPE4.cardTitle, RTL]}>
            צמיחת ההשקעה — {state.selectedStartYear} עד 2025
          </Text>
          <AreaChart
            yearPath={yearPath}
            initialInvestment={config.initialInvestment}
          />
        </GlowCard>
      </Animated.View>

      {/* Stats Panel */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <GlowCard glowColor={`${SIM4.glow}26`} style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
              <LottieIcon source={LOTTIE_GROWTH} size={18} />
              <Text style={[styles.statLabel, RTL]}>תשואה כוללת</Text>
            </View>
            <Text style={[styles.statValue, { color: state.totalReturn >= 0 ? '#d4af37' : '#ef4444' }]}>
              {state.totalReturn >= 0 ? '+' : ''}{state.totalReturn}%
            </Text>
          </View>
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
              <LottieIcon source={LOTTIE_CHART} size={18} />
              <Text style={[styles.statLabel, RTL]}>תשואה שנתית ממוצעת</Text>
            </View>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>{averageAnnualReturn}%</Text>
          </View>
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
              <LottieIcon source={LOTTIE_CLOCK} size={18} />
              <Text style={[styles.statLabel, RTL]}>שנות השקעה</Text>
            </View>
            <Text style={styles.statValue}>{yearsInvested}</Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Best/Worst Context */}
      <Animated.View entering={FadeInUp.delay(500)}>
        <GlowCard glowColor="rgba(34,197,94,0.12)" style={styles.statsCard}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_TARGET} size={22} />
            <Text style={[TYPE4.cardTitle, RTL, { marginBottom: 0 }]}>השוואה — מתי היה הכי טוב / גרוע להתחיל?</Text>
          </View>
          <View style={[styles.statRow, { marginTop: 8 }]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
              <LottieIcon source={LOTTIE_GROWTH} size={16} />
              <Text style={[styles.statLabel, RTL]}>הכי טוב ({state.bestStartYear})</Text>
            </View>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>
              {formatShekel(bestValue)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={16} />
              <Text style={[styles.statLabel, RTL]}>הכי גרוע ({state.worstStartYear})</Text>
            </View>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {formatShekel(worstValue)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
              <LottieIcon source={LOTTIE_STAR} size={16} />
              <Text style={[styles.statLabel, RTL]}>הבחירה שלך ({state.selectedStartYear})</Text>
            </View>
            <Text style={[styles.statValue, { color: '#d4af37' }]}>
              {formatShekel(state.currentValue)}
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Insight Banner */}
      <Animated.View entering={FadeInUp.delay(600)}>
        <GlowCard glowColor={`${SIM4.glow}26`} style={styles.statsCard}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_BULB} size={22} />
            <Text style={[TYPE4.cardBody, RTL, { flex: 1 }]}>
              בכל נקודת התחלה — אם החזקת 15+ שנה — לא הפסדת. S&P 500 = +10% בממוצע.
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Complete button */}
      <Animated.View entering={FadeInUp.delay(700)} style={styles.controlsRow}>
        <AnimatedPressable onPress={handleComplete} style={styles.completeBtn} accessibilityRole="button" accessibilityLabel="סיים">
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_CHECK} size={18} /></View>
            <Text style={styles.completeBtnText}>סיים</Text>
          </View>
        </AnimatedPressable>
      </Animated.View>
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
    backgroundColor: SIM4.cardBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSub: {
    color: SIM4.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryValue: {
    color: '#d4af37',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  returnText: {
    fontSize: 18,
    fontWeight: '800',
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
    color: SIM4.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statValue: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  completeBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#312e81',
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

const dialStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: SIM4.trackBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SIM4.trackBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    color: SIM4.textOnGradient,
    fontSize: 16,
    fontWeight: '800',
    ...SHADOW_STRONG,
  },
  yearDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  yearText: {
    color: SIM4.textOnGradient,
    fontSize: 48,
    fontWeight: '900',
    ...SHADOW_STRONG,
  },
  yearSub: {
    color: SIM4.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    ...SHADOW_LIGHT,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  endLabel: {
    color: SIM4.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '700',
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
    width: 55,
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
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.3)',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
  },
  areaFill: {
    position: 'absolute',
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
  eventMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: 24,
  },
  eventEmoji: {
    fontSize: 14,
  },
  eventLine: {
    width: 1,
    height: 8,
    backgroundColor: SIM4.cardBorder,
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
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
});
