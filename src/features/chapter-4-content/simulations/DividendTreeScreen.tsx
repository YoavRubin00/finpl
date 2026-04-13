/**
 * SIM 23: עץ הדיבידנדים (Dividend Tree) — Module 4-23
 * Visual metaphor: two trees side by side. "Eat" (cash out dividends) stays small.
 * "Plant" (DRIP reinvest) grows dramatically. 20-year auto-play cinematic mode.
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
  withTiming,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { useDividendTree } from './useDividendTree';
import { getChapterTheme } from '../../../constants/theme';
import { SIM4, GRADE_COLORS4, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE4, sim4Styles } from './simTheme';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;

/* ── Chapter 4 theme (gradient only) ── */
const _th4 = getChapterTheme('chapter-4');

/* ── Lottie assets ── */
const LOTTIE_TREE = require('../../../../assets/lottie/wired-flat-443-tree-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

// ── Theme colors ──────────────────────────────────────────────────────
const COLORS = {
  bg: '#f8fafc',
  green: '#22c55e',
  darkGreen: '#166534',
  red: '#ef4444',
  gold: '#d4af37',
  goldDark: '#b8860b',
  brown: '#8B4513',
  eatBg: 'rgba(239,68,68,0.08)',
  plantBg: 'rgba(34,197,94,0.08)',
};

// ── Helpers ───────────────────────────────────────────────────────────
/* ================================================================== */
/*  AnimatedTree — visual tree that grows with scale                    */
/* ================================================================== */

function AnimatedTree({
  treeScale,
  side,
  currentYear,
  dividendAmount,
  reinvested,
}: {
  treeScale: number;
  side: 'eat' | 'plant';
  currentYear: number;
  dividendAmount: number;
  reinvested: boolean;
}) {
  const scaleShared = useSharedValue(1);
  const fruitOpacity = useSharedValue(0);

  // Animate tree scale
  useEffect(() => {
    scaleShared.value = withSpring(treeScale, { damping: 22, stiffness: 100 });
  }, [treeScale, scaleShared]);

  // Fruit flash on new year
  useEffect(() => {
    if (currentYear > 0) {
      fruitOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(reinvested ? 0.3 : 0, { duration: 600 }),
      );
    }
  }, [currentYear, reinvested, fruitOpacity]);

  const treeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleShared.value }],
  }));

  const fruitAnimStyle = useAnimatedStyle(() => ({
    opacity: fruitOpacity.value,
  }));

  const isPlant = side === 'plant';
  const trunkColor = isPlant ? '#2d5016' : COLORS.brown;
  const crownColor = isPlant ? COLORS.green : '#4a7c4a';

  return (
    <View style={treeStyles.container}>
      {/* Crown + trunk */}
      <Animated.View style={[treeStyles.treeWrap, treeAnimStyle]}>
        {/* Top crown */}
        <View style={[treeStyles.crownTop, { backgroundColor: crownColor }]} />
        {/* Middle crown */}
        <View
          style={[
            treeStyles.crownMid,
            { backgroundColor: crownColor, opacity: 0.85 },
          ]}
        />
        {/* Bottom crown */}
        <View
          style={[
            treeStyles.crownBottom,
            { backgroundColor: crownColor, opacity: 0.7 },
          ]}
        />
        {/* Trunk */}
        <View style={[treeStyles.trunk, { backgroundColor: trunkColor }]} />
      </Animated.View>

      {/* Fruit indicator */}
      <Animated.View style={[treeStyles.fruitBubble, fruitAnimStyle]}>
        <LottieIcon source={isPlant ? LOTTIE_GROWTH : LOTTIE_DECREASE} size={22} />
        {dividendAmount > 0 && (
          <Text style={treeStyles.fruitAmount}>
            {reinvested ? '+שתילה' : `₪${Math.round(dividendAmount).toLocaleString('he-IL')}`}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

/* ================================================================== */
/*  DualTreeView — side by side trees with labels                      */
/* ================================================================== */

function DualTreeView({
  currentYear,
  eatValue,
  plantValue,
  eatDividend,
  plantDividend,
  totalDividendsTaken,
  initialInvestment,
}: {
  currentYear: number;
  eatValue: number;
  plantValue: number;
  eatDividend: number;
  plantDividend: number;
  totalDividendsTaken: number;
  initialInvestment: number;
}) {
  // Eat tree scale: stays ~1.0 (stock price grows but no compounding on tree visual)
  const eatScale = 0.7 + 0.3 * Math.min(eatValue / (initialInvestment * 4), 1);
  // Plant tree scale: grows dramatically (up to ~1.8x)
  const plantScale = 0.7 + 1.1 * Math.min(plantValue / (initialInvestment * 7), 1);

  return (
    <View style={dualStyles.container}>
      {/* Eat tree (left) */}
      <View style={dualStyles.treeColumn}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <LottieIcon source={LOTTIE_DECREASE} size={22} />
          <Text style={dualStyles.treeLabel}>אוכל</Text>
        </View>
        <AnimatedTree
          treeScale={eatScale}
          side="eat"
          currentYear={currentYear}
          dividendAmount={eatDividend}
          reinvested={false}
        />
        <View style={[dualStyles.valueBubble, { backgroundColor: COLORS.eatBg }]}>
          <Text style={dualStyles.valueText}>{formatShekel(eatValue)}</Text>
          <Text style={dualStyles.subText}>שווי העץ</Text>
        </View>
        {totalDividendsTaken > 0 && (
          <View style={dualStyles.dividendBubble}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={16} />
              <Text style={dualStyles.dividendText}>
                נאכלו: {formatShekel(totalDividendsTaken)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Year counter (center) */}
      <View style={dualStyles.centerColumn}>
        <View style={dualStyles.yearBubble}>
          <Text style={dualStyles.yearLabel}>שנה</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={dualStyles.yearNumber}>{currentYear}</Text>
            <Text style={dualStyles.yearTotal}>/20</Text>
          </View>
        </View>
        {currentYear > 0 && (
          <View style={dualStyles.vsContainer}>
            <Text style={dualStyles.vsText}>VS</Text>
          </View>
        )}
      </View>

      {/* Plant tree (right) */}
      <View style={dualStyles.treeColumn}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <LottieIcon source={LOTTIE_GROWTH} size={22} />
          <Text style={dualStyles.treeLabel}>שותל</Text>
        </View>
        <AnimatedTree
          treeScale={plantScale}
          side="plant"
          currentYear={currentYear}
          dividendAmount={plantDividend}
          reinvested={true}
        />
        <View style={[dualStyles.valueBubble, { backgroundColor: COLORS.plantBg }]}>
          <Text style={[dualStyles.valueText, plantValue > eatValue * 1.2 ? { color: COLORS.gold } : undefined]}>
            {formatShekel(plantValue)}
          </Text>
          <Text style={dualStyles.subText}>שווי העץ</Text>
        </View>
        {currentYear > 0 && (
          <View style={dualStyles.dividendBubble}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <LottieIcon source={LOTTIE_GROWTH} size={16} />
              <Text style={[dualStyles.dividendText, { color: COLORS.green }]}>
                הושתלו חזרה
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/* ================================================================== */
/*  GrowthChart — dual line chart comparing both paths                 */
/* ================================================================== */

function GrowthChart({
  eatHistory,
  plantHistory,
  initialInvestment,
}: {
  eatHistory: Array<{ year: number; treeValue: number }>;
  plantHistory: Array<{ year: number; treeValue: number }>;
  initialInvestment: number;
}) {
  if (eatHistory.length < 2) return null;

  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 120;

  // Include initial value at year 0
  const allValues = [
    initialInvestment,
    ...eatHistory.map((y) => y.treeValue),
    ...plantHistory.map((y) => y.treeValue),
  ];
  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const range = maxVal - minVal || 1;

  const totalYears = 20;
  const stepX = chartWidth / totalYears;

  const getY = (val: number) => chartHeight - ((val - minVal) / range) * chartHeight;

  // Build points for each path
  const eatPoints = [
    { x: 0, y: getY(initialInvestment) },
    ...eatHistory.map((yr) => ({
      x: yr.year * stepX,
      y: getY(yr.treeValue),
    })),
  ];

  const plantPoints = [
    { x: 0, y: getY(initialInvestment) },
    ...plantHistory.map((yr) => ({
      x: yr.year * stepX,
      y: getY(yr.treeValue),
    })),
  ];

  return (
    <Animated.View entering={FadeInUp.delay(100)}>
      <GlowCard glowColor="rgba(34,197,94,0.12)" style={{ ...chartCardStyles.card, backgroundColor: SIM4.cardBg }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <LottieIcon source={LOTTIE_CHART} size={22} />
          <Text style={[chartCardStyles.title, RTL]}>השוואת צמיחה</Text>
        </View>
        <View style={chartCardStyles.chartContainer}>
          {/* Y-axis */}
          <View style={chartCardStyles.yAxis}>
            <Text style={chartCardStyles.yLabel}>{formatShekel(maxVal)}</Text>
            <Text style={chartCardStyles.yLabel}>{formatShekel((maxVal + minVal) / 2)}</Text>
            <Text style={chartCardStyles.yLabel}>{formatShekel(minVal)}</Text>
          </View>

          {/* Chart area */}
          <View style={[chartCardStyles.chartArea, { height: chartHeight }]}>
            {/* Grid lines */}
            <View style={[chartCardStyles.gridLine, { top: 0 }]} />
            <View style={[chartCardStyles.gridLine, { top: chartHeight / 2 }]} />
            <View style={[chartCardStyles.gridLine, { top: chartHeight }]} />

            {/* Eat path line (red/orange) */}
            {eatPoints.map((point, i) => {
              if (i === 0) return null;
              const prev = eatPoints[i - 1];
              const dx = point.x - prev.x;
              const dy = point.y - prev.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`eat-${i}`}
                  style={[
                    chartCardStyles.lineSegment,
                    {
                      left: prev.x,
                      top: prev.y,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: COLORS.red,
                      opacity: 0.7,
                    },
                  ]}
                />
              );
            })}

            {/* Plant path line (green/gold) */}
            {plantPoints.map((point, i) => {
              if (i === 0) return null;
              const prev = plantPoints[i - 1];
              const dx = point.x - prev.x;
              const dy = point.y - prev.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`plant-${i}`}
                  style={[
                    chartCardStyles.lineSegment,
                    {
                      left: prev.x,
                      top: prev.y,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: COLORS.green,
                    },
                  ]}
                />
              );
            })}

            {/* End dots */}
            {eatPoints.length > 1 && (
              <View
                style={[
                  chartCardStyles.dot,
                  {
                    left: eatPoints[eatPoints.length - 1].x - 4,
                    top: eatPoints[eatPoints.length - 1].y - 4,
                    backgroundColor: COLORS.red,
                  },
                ]}
              />
            )}
            {plantPoints.length > 1 && (
              <View
                style={[
                  chartCardStyles.dot,
                  {
                    left: plantPoints[plantPoints.length - 1].x - 4,
                    top: plantPoints[plantPoints.length - 1].y - 4,
                    backgroundColor: COLORS.green,
                  },
                ]}
              />
            )}
          </View>
        </View>

        {/* Legend */}
        <View style={chartCardStyles.legend}>
          <View style={chartCardStyles.legendItem}>
            <View style={[chartCardStyles.legendDot, { backgroundColor: COLORS.red }]} />
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={16} />
              <Text style={chartCardStyles.legendText}>אוכל</Text>
            </View>
          </View>
          <View style={chartCardStyles.legendItem}>
            <View style={[chartCardStyles.legendDot, { backgroundColor: COLORS.green }]} />
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <LottieIcon source={LOTTIE_GROWTH} size={16} />
              <Text style={chartCardStyles.legendText}>שותל</Text>
            </View>
          </View>
        </View>
      </GlowCard>
    </Animated.View>
  );
}

/* ================================================================== */
/*  FruitCounter — per-year dividend display                           */
/* ================================================================== */

function FruitCounter({
  eatDividend,
  plantDividend,
}: {
  eatDividend: number;
  plantDividend: number;
}) {
  if (eatDividend <= 0 && plantDividend <= 0) return null;

  return (
    <Animated.View entering={FadeInUp.delay(50)}>
      <View style={fruitStyles.container}>
        <View style={fruitStyles.item}>
          <LottieIcon source={LOTTIE_DECREASE} size={22} />
          <Text style={fruitStyles.amount}>{formatShekel(eatDividend)}</Text>
          <Text style={fruitStyles.label}>דיבידנד נאכל</Text>
        </View>
        <View style={fruitStyles.divider} />
        <View style={fruitStyles.item}>
          <LottieIcon source={LOTTIE_GROWTH} size={22} />
          <Text style={[fruitStyles.amount, { color: COLORS.green }]}>
            {formatShekel(plantDividend)}
          </Text>
          <Text style={fruitStyles.label}>דיבידנד שנשתל</Text>
        </View>
      </View>
    </Animated.View>
  );
}

/* ================================================================== */
/*  ScoreScreen — final comparison reveal                              */
/* ================================================================== */

function ScoreScreen({
  score,
  onReplay,
  onContinue,
}: {
  score: NonNullable<ReturnType<typeof useDividendTree>['score']>;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);

  const multiplier = score.plantTotal / score.eatTotal;
  const diffPercent = ((score.difference / score.eatTotal) * 100).toFixed(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Hero reveal */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <View accessible={false}><LottieIcon source={LOTTIE_TREE} size={56} /></View>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: COLORS.gold }]}>
          פי {multiplier.toFixed(1)}
        </Text>
        <Text style={[sim4Styles.gradeLabel, { color: COLORS.gold }]}>
          יתרון השתילה מחדש
        </Text>
      </Animated.View>

      {/* Side-by-side comparison */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <GlowCard glowColor="rgba(212,175,55,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <LottieIcon source={LOTTIE_DECREASE} size={22} />
            <Text style={[styles.statsTitle, { textAlign: 'center' }]}>
              אכלת דיבידנדים vs
            </Text>
            <LottieIcon source={LOTTIE_GROWTH} size={22} />
            <Text style={[styles.statsTitle, { textAlign: 'center' }]}>
              שתלת מחדש
            </Text>
          </View>
          <View style={scoreStyles.comparisonRow}>
            <View style={scoreStyles.comparisonCol}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_DECREASE} size={18} />
                <Text style={scoreStyles.comparisonLabel}>אכלת</Text>
              </View>
              <Text style={[scoreStyles.comparisonValue, { color: COLORS.red }]}>
                {formatShekel(score.eatTotal)}
              </Text>
              <Text style={scoreStyles.comparisonSub}>(שווי + דיבידנדים)</Text>
            </View>
            <View style={scoreStyles.vsBox}>
              <Text style={scoreStyles.vsText}>VS</Text>
            </View>
            <View style={scoreStyles.comparisonCol}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={scoreStyles.comparisonLabel}>שתלת</Text>
              </View>
              <Text style={[scoreStyles.comparisonValue, { color: COLORS.gold }]}>
                {formatShekel(score.plantTotal)}
              </Text>
              <Text style={scoreStyles.comparisonSub}>(הכל בעץ)</Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Difference highlight */}
      <Animated.View entering={FadeInUp.delay(200)}>
        <GlowCard glowColor="rgba(34,197,94,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_BULB} size={22} />
            <Text style={[styles.statsTitle, RTL]}>ההבדל</Text>
          </View>
          <Text style={scoreStyles.differenceText}>
            אכלת {formatShekel(score.eatTotal)} סה״כ דיבידנדים + שווי.
          </Text>
          <Text style={scoreStyles.differenceText}>
            אם היית שותל — היה לך {formatShekel(score.plantTotal)} (פי {multiplier.toFixed(1)} יותר!)
          </Text>
          <Text style={scoreStyles.differenceHighlight}>
            הפרש: +{formatShekel(score.difference)} ({diffPercent}% יותר)
          </Text>
        </GlowCard>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <GlowCard glowColor="rgba(212,175,55,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <View style={sim4Styles.insightRow}>
            <LottieIcon source={LOTTIE_TARGET} size={22} />
            <Text style={[sim4Styles.insightText, { flex: 1 }]}>
              דיבידנד שמחזירים לעץ = ריבית דריבית על סטרואידים.
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(500)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" style={sim4Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" style={sim4Styles.continueBtn}>
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
/*  Main Screen                                                        */
/* ================================================================== */

interface DividendTreeScreenProps {
  onComplete?: () => void;
}

export function DividendTreeScreen({ onComplete }: DividendTreeScreenProps) {
  const sim = useDividendTree();
  const rewardsGranted = useRef(false);

  // Value bounce animation
  const plantValueScale = useSharedValue(1);
  const prevPlantValue = useRef(sim.state.plantTree.value);

  useEffect(() => {
    const diff = Math.abs(sim.state.plantTree.value - prevPlantValue.current);
    prevPlantValue.current = sim.state.plantTree.value;
    if (diff > 500) {
      plantValueScale.value = withSequence(
        withSpring(1.03, { damping: 20, stiffness: 250 }),
        withSpring(1, { damping: 22, stiffness: 180 }),
      );
    }
  }, [sim.state.plantTree.value, plantValueScale]);

  // Completion effect (rewards granted by LessonFlowScreen chest)
  useEffect(() => {
    if (sim.state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [sim.state.isComplete]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    heavyHaptic();
    sim.startPlay();
  }, [sim]);

  const handleStop = useCallback(() => {
    tapHaptic();
    sim.stopPlay();
  }, [sim]);

  const handleStep = useCallback(() => {
    tapHaptic();
    sim.advanceYear();
  }, [sim]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    sim.reset();
  }, [sim]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    onComplete?.();
  }, [onComplete]);

  const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-443-tree-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-945-dividends-hover-pinch.json'),
  ];

  // ── Score Phase ───────────────────────────────────────────────────
  if (sim.state.isComplete && sim.score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScoreScreen
        score={sim.score}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // ── Simulation Phase ──────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
      {/* Title */}
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_TREE} size={28} /></View>
          <Text accessibilityRole="header" style={styles.title}>עץ הדיבידנדים</Text>
        </View>
        <Text style={[styles.subtitle, RTL]}>
          אכול את הפירות או שתול אותם מחדש?
        </Text>
      </Animated.View>

      {/* Dual trees */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <DualTreeView
          currentYear={sim.state.currentYear}
          eatValue={sim.state.eatTree.value}
          plantValue={sim.state.plantTree.value}
          eatDividend={sim.currentEatDividend}
          plantDividend={sim.currentPlantDividend}
          totalDividendsTaken={sim.state.eatTree.totalDividendsTaken}
          initialInvestment={sim.config.initialInvestment}
        />
      </Animated.View>

      {/* Fruit counter per year */}
      <FruitCounter
        eatDividend={sim.currentEatDividend}
        plantDividend={sim.currentPlantDividend}
      />

      {/* Growth comparison chart */}
      <GrowthChart
        eatHistory={sim.eatHistory}
        plantHistory={sim.plantHistory}
        initialInvestment={sim.config.initialInvestment}
      />

      {/* Controls */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.controlsRow}>
        {!sim.state.isPlaying ? (
          <>
            <AnimatedPressable onPress={handleStep} accessibilityRole="button" accessibilityLabel="שנה אחת" style={styles.stepBtn}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={18} /></View>
                <Text style={styles.stepBtnText}>שנה אחת</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={handlePlay} accessibilityRole="button" accessibilityLabel={`הרץ ${20 - sim.state.currentYear} שנים`} style={styles.playBtn}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_TROPHY} size={22} /></View>
                <Text style={styles.playBtnText}>
                  הרץ {20 - sim.state.currentYear} שנים
                </Text>
              </View>
            </AnimatedPressable>
          </>
        ) : (
          <AnimatedPressable onPress={handleStop} accessibilityRole="button" accessibilityLabel="עצור" style={styles.stopBtn}>
            <Text style={styles.stopBtnText}>עצור</Text>
          </AnimatedPressable>
        )}
      </Animated.View>

      {/* Info card */}
      {sim.state.currentYear === 0 && (
        <Animated.View entering={FadeInUp.delay(300)}>
          <GlowCard glowColor="rgba(212,175,55,0.1)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[styles.lessonText, RTL, { flex: 1 }]}>
                השקעת ₪10,000 במניה עם תשואה שנתית של 7% ודיבידנד 3%.
                {'\n'}בצד שמאל תאכל את הדיבידנד. בצד ימין תשתול אותו מחדש.
                {'\n'}מה יקרה אחרי 20 שנה?
              </Text>
            </View>
          </GlowCard>
        </Animated.View>
      )}
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
  statsCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  statsTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
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
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  stepBtn: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
    backgroundColor: '#ffffff',
  },
  stepBtnText: {
    color: SIM4.dark,
    fontSize: 15,
    fontWeight: '700',
  },
  playBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: SIM4.btnPrimaryBorder,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  stopBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  coinToast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.4)',
  },
  coinToastText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#facc15',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
});

const treeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 160,
  },
  treeWrap: {
    alignItems: 'center',
  },
  crownTop: {
    width: 36,
    height: 30,
    borderRadius: 18,
  },
  crownMid: {
    width: 52,
    height: 28,
    borderRadius: 14,
    marginTop: -8,
  },
  crownBottom: {
    width: 64,
    height: 24,
    borderRadius: 12,
    marginTop: -6,
  },
  trunk: {
    width: 14,
    height: 40,
    borderRadius: 3,
    marginTop: -4,
  },
  fruitBubble: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  fruitAmount: {
    color: SIM4.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});

const dualStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: SIM4.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  treeColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  centerColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeLabel: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  valueBubble: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  valueText: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  subText: {
    color: SIM4.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  dividendBubble: {
    marginTop: 6,
    alignItems: 'center',
  },
  dividendText: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  yearBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(217,119,6,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  yearLabel: {
    color: SIM4.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  yearNumber: {
    color: SIM4.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  yearTotal: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  vsContainer: {
    marginTop: 12,
  },
  vsText: {
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

const fruitStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: SIM4.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: SIM4.cardBorder,
  },
  amount: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  label: {
    color: SIM4.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

const chartCardStyles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  title: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
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
    position: 'relative',
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
    height: 2.5,
    borderRadius: 1.25,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: SIM4.cardBg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

const scoreStyles = StyleSheet.create({
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  comparisonCol: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  comparisonSub: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  vsBox: {
    width: 40,
    alignItems: 'center',
  },
  vsText: {
    color: SIM4.textMuted,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  differenceText: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    ...RTL,
  },
  differenceHighlight: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
});
