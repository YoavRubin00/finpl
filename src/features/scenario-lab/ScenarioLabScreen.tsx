import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useMemo } from 'react';
import { ArrowRight, Play, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Defs, LinearGradient as SvgGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { SCENARIOS, STARTING_CAPITAL, GRADE_CONFIG, GRADE_REWARDS } from './scenarioLabData';

const CHART_W = Dimensions.get('window').width - 80;
const CHART_H = 140;
const CHART_PAD = { top: 16, bottom: 24, left: 40, right: 12 };

function PortfolioChart({ history, marketBenchmark }: { history: number[]; marketBenchmark: number }) {
  if (history.length < 2) return null;

  // Build market benchmark history with realistic wobble (not just linear)
  const marketHistory = Array.from({ length: history.length }, (_, i) => {
    const progress = i / 12;
    const baseValue = 1 + (marketBenchmark - 1) * progress;
    // Add sine-based noise for realistic market line
    const noise = Math.sin(i * 2.1) * 0.02 + Math.cos(i * 1.4) * 0.015;
    const adjusted = i === 0 ? 1 : i >= 12 ? marketBenchmark : baseValue + noise;
    return Math.round(STARTING_CAPITAL * adjusted);
  });

  const allValues = [...history, ...marketHistory];
  const minVal = Math.min(...allValues) * 0.97;
  const maxVal = Math.max(...allValues) * 1.03;
  const range = maxVal - minVal || 1;

  const innerW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

  const toPoint = (val: number, i: number) => {
    const x = CHART_PAD.left + (i / 12) * innerW;
    const y = CHART_PAD.top + innerH - ((val - minVal) / range) * innerH;
    return `${x},${y}`;
  };

  // Portfolio line
  const points = history.map((val, i) => toPoint(val, i)).join(' ');

  // Fill polygon
  const lastX = CHART_PAD.left + ((history.length - 1) / 12) * innerW;
  const fillPoints = points + ` ${lastX},${CHART_PAD.top + innerH} ${CHART_PAD.left},${CHART_PAD.top + innerH}`;

  // Market benchmark line
  const marketPoints = marketHistory.map((val, i) => toPoint(val, i)).join(' ');

  const lastVal = history[history.length - 1];
  const isUp = lastVal >= STARTING_CAPITAL;
  const lineColor = isUp ? '#4ade80' : '#f87171';

  // Starting capital reference line
  const startY = CHART_PAD.top + innerH - ((STARTING_CAPITAL - minVal) / range) * innerH;

  // Y-axis labels (3 ticks)
  const ticks = [minVal, STARTING_CAPITAL, maxVal];

  return (
    <View style={s.chartContainer}>
      {/* Legend */}
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: lineColor }]} />
          <Text style={s.legendText}>התיק שלך</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#0891b2' }]} />
          <Text style={s.legendText}>השוק</Text>
        </View>
      </View>

      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>

        {/* Grid lines (visible on the white chart card now) */}
        {ticks.map((tick, i) => {
          const y = CHART_PAD.top + innerH - ((tick - minVal) / range) * innerH;
          return (
            <Line
              key={i}
              x1={CHART_PAD.left}
              y1={y}
              x2={CHART_W - CHART_PAD.right}
              y2={y}
              stroke="rgba(148,163,184,0.18)"
              strokeWidth={1}
            />
          );
        })}

        {/* Starting capital dashed line */}
        <Line
          x1={CHART_PAD.left}
          y1={startY}
          x2={CHART_W - CHART_PAD.right}
          y2={startY}
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Y-axis labels */}
        {ticks.map((tick, i) => {
          const y = CHART_PAD.top + innerH - ((tick - minVal) / range) * innerH;
          return (
            <SvgText
              key={`t${i}`}
              x={CHART_PAD.left - 4}
              y={y + 4}
              fontSize={9}
              fill="#64748b"
              textAnchor="end"
              fontWeight="600"
            >
              {(tick / 1000).toFixed(0)}K
            </SvgText>
          );
        })}

        {/* Market benchmark line (dashed yellow) */}
        <Polyline
          points={marketPoints}
          fill="none"
          stroke="#0891b2"
          strokeWidth={1.5}
          strokeDasharray="6,4"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Portfolio fill area */}
        <Polyline
          points={fillPoints}
          fill="url(#fillGrad)"
          stroke="none"
        />

        {/* Portfolio line */}
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
import { useScenarioSim } from './useScenarioSim';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { BackButton } from '../../components/ui/BackButton';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useEconomyStore } from '../economy/useEconomyStore';
import { getPyramidStatus } from '../../utils/progression';
import { Lock } from 'lucide-react-native';

// ── Slider row ──
// Drag the bar to set the percentage. Snaps to 5% increments to keep the
// allocation math clean (and matches the previous +/- step). Live percentage
// shown above the bar so users see the value as they drag.
function AllocationSlider({
  emoji,
  name,
  description,
  color,
  value,
  onChange,
}: {
  emoji: string;
  name: string;
  description: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={s.sliderRow}>
      <View style={s.sliderInfo}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={s.sliderName}>{name}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[s.sliderPct, { color }]}>{value}%</Text>
      </View>
      <Text style={s.sliderDescription}>{description}</Text>
      <Slider
        style={s.sliderControl}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={value}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#e2e8f0"
        thumbTintColor={color}
        onValueChange={(v) => onChange(Math.round(v))}
        accessibilityLabel={`גרור כדי להקצות אחוזים ל${name}`}
      />
    </View>
  );
}

export function ScenarioLabScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const xp = useEconomyStore((s) => s.xp);
  const { layer } = getPyramidStatus(xp);

  if (layer < 3) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <View style={{ backgroundColor: '#e0f2fe', borderRadius: 999, width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#bae6fd' }}>
          <Lock size={36} color="#0891b2" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0c4a6e', marginTop: 8, textAlign: 'center', writingDirection: 'rtl' }}>
          מעבדת תרחישים
        </Text>
        <Text style={{ fontSize: 15, color: '#64748b', marginTop: 10, textAlign: 'center', writingDirection: 'rtl', lineHeight: 24 }}>
          כדי לפתוח את מעבדת התרחישים, צריך להגיע לשלב 3 (יציבות).{'\n'}המשך ללמוד — אתה בדרך! 💪
        </Text>
        <View style={{ marginTop: 12, backgroundColor: '#e0f2fe', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#bae6fd' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0891b2', writingDirection: 'rtl' }}>
            אתה כרגע בשלב {layer} · עוד {3 - layer} {3 - layer === 1 ? 'שלב' : 'שלבים'} לפתיחה
          </Text>
        </View>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as never)}
          style={{ marginTop: 28, backgroundColor: '#0891b2', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: '#0e7490' }}
        >
          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800', writingDirection: 'rtl' }}>חזרה</Text>
        </Pressable>
      </View>
    );
  }

  const scenario = useMemo(
    () => SCENARIOS.find((sc) => sc.id === id) ?? SCENARIOS[0],
    [id],
  );

  const {
    state,
    setAllocation,
    goToAllocation,
    startSimulation,
    isValid,
    allocationTotal,
    reset,
  } = useScenarioSim(scenario);

  // Animated portfolio value
  const valueScale = useSharedValue(1);
  useEffect(() => {
    if (state.phase === 'simulating') {
      valueScale.value = withSpring(1.05, { damping: 8 });
      setTimeout(() => {
        valueScale.value = withSpring(1, { damping: 12 });
      }, 200);
    }
  }, [state.portfolioValue, state.phase, valueScale]);

  const valueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  const isUp = state.portfolioValue >= STARTING_CAPITAL;
  const returnPct = ((state.portfolioValue - STARTING_CAPITAL) / STARTING_CAPITAL * 100).toFixed(1);
  const gradeConfig = state.finalGrade ? GRADE_CONFIG[state.finalGrade] : null;
  const rewards = state.finalGrade ? GRADE_REWARDS[state.finalGrade] : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <LinearGradient
        colors={[scenario.color + '12', '#f0f9ff', '#f8fafc']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={s.header}>
          <BackButton color="#334155" onPress={() => router.replace('/(tabs)' as never)} />
          <Text style={[s.headerTitle, { color: '#0c4a6e' }]}>מעבדת התרחישים</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Phase 1: Briefing ═══ */}
          {state.phase === 'briefing' && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.briefingContainer}>
              <View style={s.briefingEmoji}>
                <Text style={{ fontSize: 64 }}>{scenario.emoji}</Text>
              </View>
              <View style={s.yearBadge}>
                <Text style={s.yearText}>שנת {scenario.year}</Text>
              </View>
              <Text style={s.briefingTitle}>{scenario.title}</Text>
              <View style={s.difficultyRow}>
                {[1, 2, 3].map((d) => (
                  <Text key={d} style={{ fontSize: 14, opacity: d <= scenario.difficulty ? 1 : 0.3 }}>⭐</Text>
                ))}
              </View>
              <Text style={s.briefingText}>{scenario.briefing}</Text>

              <LottieIcon
                source={require('../../../assets/lottie/wired-flat-163-graph-line-chart-hover-slide.json')}
                size={60}
                autoPlay
                loop
              />

              <AnimatedPressable
                onPress={() => { tapHaptic(); goToAllocation(); }}
                style={s.startBtn}
              >
                <Text style={s.startBtnText}>התחל תרחיש</Text>
                <ArrowRight size={18} color="#1a1035" style={{ transform: [{ scaleX: -1 }] }} />
              </AnimatedPressable>
            </Animated.View>
          )}

          {/* ═══ Phase 2: Allocation ═══ */}
          {state.phase === 'allocation' && (
            <Animated.View entering={FadeIn.duration(300)} style={s.allocationContainer}>
              <Text style={s.allocationTitle}>חלק את ה-100,000 ₪ שלך</Text>
              <Text style={s.allocationSub}>גרור את הברים בין הסקטורים</Text>

              {scenario.sectors.map((sector) => (
                <AllocationSlider
                  key={sector.id}
                  emoji={sector.emoji}
                  name={sector.name}
                  description={sector.description}
                  color={sector.color}
                  value={state.allocation[sector.id] ?? 0}
                  onChange={(v) => setAllocation(sector.id, v)}
                />
              ))}

              {/* Total indicator */}
              <View style={[s.totalIndicator, isValid ? s.totalValid : s.totalInvalid]}>
                <Text style={[s.totalText, isValid ? s.totalTextValid : s.totalTextInvalid]}>
                  {allocationTotal}% {isValid ? '✓' : `(צריך 100%)`}
                </Text>
              </View>

              <AnimatedPressable
                onPress={() => {
                  if (!isValid) return;
                  successHaptic();
                  startSimulation();
                }}
                style={[s.runBtn, !isValid && { opacity: 0.5 }]}
              >
                <Play size={18} color="#ffffff" fill="#ffffff" />
                <Text style={[s.runBtnText, { color: '#ffffff' }]}>הרץ סימולציה</Text>
              </AnimatedPressable>
            </Animated.View>
          )}

          {/* ═══ Phase 3: Simulating ═══ */}
          {state.phase === 'simulating' && (
            <Animated.View entering={FadeIn.duration(300)} style={s.simContainer}>
              <Text style={s.simLabel}>שנת {scenario.year} מתרחשת...</Text>

              {/* Month progress */}
              <View style={s.monthBar}>
                <View style={[s.monthFill, { width: `${(state.currentMonth / 12) * 100}%` }]} />
              </View>
              <Text style={s.monthText}>חודש {state.currentMonth} / 12</Text>

              {/* Portfolio value */}
              <Animated.View style={[s.portfolioCard, valueStyle]}>
                <Text style={s.portfolioLabel}>שווי התיק</Text>
                <Text style={[s.portfolioValue, { color: isUp ? '#4ade80' : '#f87171' }]}>
                  ₪{state.portfolioValue.toLocaleString()}
                </Text>
                <Text style={[s.portfolioReturn, { color: isUp ? '#4ade80' : '#f87171' }]}>
                  {isUp ? '+' : ''}{returnPct}%
                </Text>
              </Animated.View>

              {/* Live portfolio chart */}
              <PortfolioChart history={state.portfolioHistory} marketBenchmark={scenario.marketBenchmark} />

              {/* Headline flash */}
              {state.activeHeadline && (
                <Animated.View
                  key={state.currentMonth}
                  entering={FadeInUp.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={s.headlineCard}
                >
                  <Text style={s.headlineText}>{state.activeHeadline}</Text>
                </Animated.View>
              )}

              {/* Sector breakdown */}
              <View style={s.sectorBreakdown}>
                {scenario.sectors.map((sector) => {
                  const pct = state.allocation[sector.id] ?? 0;
                  if (pct === 0) return null;
                  const progress = state.currentMonth / 12;
                  const currentMult = 1 + (sector.scenarioMultiplier - 1) * progress;
                  const sectorUp = currentMult >= 1;
                  return (
                    <View key={sector.id} style={s.sectorMini}>
                      <Text style={{ fontSize: 16 }}>{sector.emoji}</Text>
                      <Text style={[s.sectorMiniPct, { color: sectorUp ? '#4ade80' : '#f87171' }]}>
                        {sectorUp ? '+' : ''}{((currentMult - 1) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* ═══ Phase 4: Results ═══ */}
          {state.phase === 'results' && gradeConfig && rewards && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.resultsContainer}>
              {(state.finalGrade === 'S' || state.finalGrade === 'A') && (
                <ConfettiExplosion />
              )}

              {/* Grade banner */}
              <View style={[s.gradeBanner, { backgroundColor: gradeConfig.color + '20', borderColor: gradeConfig.color }]}>
                <Text style={[s.gradeEmoji]}>{gradeConfig.emoji}</Text>
                <Text style={[s.gradeLetter, { color: gradeConfig.color }]}>{state.finalGrade}</Text>
                <Text style={[s.gradeLabel, { color: gradeConfig.color }]}>{gradeConfig.label}</Text>
              </View>

              {/* Result card */}
              <View style={s.resultCard}>
                <Text style={s.resultTitle}>
                  {isUp ? 'הרווחת!' : 'הפסדת'}
                </Text>
                <Text style={[s.resultAmount, { color: isUp ? '#4ade80' : '#f87171' }]}>
                  ₪{Math.abs(state.finalValue - STARTING_CAPITAL).toLocaleString()}
                </Text>
                <Text style={s.resultSub}>
                  מתוך ₪{STARTING_CAPITAL.toLocaleString()} → ₪{state.finalValue.toLocaleString()}
                </Text>

                {/* Benchmark comparison */}
                <View style={s.benchmarkRow}>
                  <View style={s.benchmarkItem}>
                    <Text style={s.benchmarkLabel}>השוק</Text>
                    <Text style={[s.benchmarkValue, { color: '#f87171' }]}>
                      {((scenario.marketBenchmark - 1) * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={s.benchmarkDivider} />
                  <View style={s.benchmarkItem}>
                    <Text style={s.benchmarkLabel}>אתה</Text>
                    <Text style={[s.benchmarkValue, { color: isUp ? '#4ade80' : '#f87171' }]}>
                      {isUp ? '+' : ''}{returnPct}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sector results */}
              <View style={s.sectorResults}>
                <Text style={s.sectorResultsTitle}>ביצועי הסקטורים</Text>
                {scenario.sectors.map((sector) => {
                  const pctChange = ((sector.scenarioMultiplier - 1) * 100).toFixed(0);
                  const sectorUp = sector.scenarioMultiplier >= 1;
                  const allocated = state.allocation[sector.id] ?? 0;
                  return (
                    <View key={sector.id} style={s.sectorResultRow}>
                      <Text style={{ fontSize: 20 }}>{sector.emoji}</Text>
                      <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
                        <Text style={s.sectorResultName}>{sector.name}</Text>
                        <Text style={s.sectorResultAlloc}>{allocated}% מהתיק</Text>
                      </View>
                      <View style={[s.sectorResultBadge, { backgroundColor: sectorUp ? '#052e16' : '#450a0a' }]}>
                        <Text style={[s.sectorResultPct, { color: sectorUp ? '#4ade80' : '#f87171' }]}>
                          {sectorUp ? '+' : ''}{pctChange}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Lesson card */}
              <View style={s.lessonCard}>
                <Text style={s.lessonIcon}>💡</Text>
                <Text style={s.lessonTitle}>{scenario.lessonTitle}</Text>
                <Text style={s.lessonText}>{scenario.lessonText}</Text>
                {scenario.historicalNote ? (
                  <View style={s.historicalNoteBox}>
                    <Text style={s.historicalNoteLabel}>📖 מה באמת קרה</Text>
                    <Text style={s.historicalNoteText}>{scenario.historicalNote}</Text>
                  </View>
                ) : null}
              </View>

              {/* Rewards */}
              <View style={s.rewardCard}>
                <Text style={s.rewardTitle}>🎁 פרס</Text>
                <View style={s.rewardRow}>
                  <Text style={s.rewardItem}>+{rewards.xp} XP</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.rewardItem}>+{rewards.coins}</Text>
                    <GoldCoinIcon size={18} />
                  </View>
                </View>
              </View>

              {/* Action buttons */}
              <View style={s.actionRow}>
                <AnimatedPressable
                  onPress={() => { tapHaptic(); reset(); }}
                  style={s.replayBtn}
                >
                  <RotateCcw size={16} color="#0891b2" />
                  <Text style={s.replayText}>שחק שוב</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={() => { tapHaptic(); router.replace('/(tabs)' as never); }}
                  style={s.homeBtn}
                >
                  <Text style={s.homeBtnText}>חזור הביתה</Text>
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0c4a6e',
    writingDirection: 'rtl',
  },
  // ── Briefing ──
  briefingContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  briefingEmoji: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  yearBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  briefingTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0c4a6e',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  briefingText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 24,
  },
  // Module-style "בואו נתחיל" pattern: cyan with bottom-shadow border, full-width.
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 16,
    alignSelf: 'stretch',
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
    shadowColor: '#0891b2',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  // ── Allocation ──
  allocationContainer: {
    paddingTop: 12,
  },
  allocationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  allocationSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 24,
  },
  sliderRow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  sliderInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sliderName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0c4a6e',
    writingDirection: 'rtl' as const,
    textAlign: 'right' as const,
  },
  sliderDescription: {
    fontSize: 12,
    color: '#64748b',
    writingDirection: 'rtl' as const,
    textAlign: 'right' as const,
    marginBottom: 6,
  },
  sliderControl: {
    width: '100%',
    height: 36,
  },
  sliderPct: {
    fontSize: 17,
    fontWeight: '900',
    minWidth: 56,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  totalIndicator: {
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 0, // No Line Rule
  },
  totalValid: {
    backgroundColor: 'rgba(34,197,94,0.15)', // Slightly higher opacity since border is gone
  },
  totalInvalid: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '900',
  },
  totalTextValid: {
    color: '#4ade80',
  },
  totalTextInvalid: {
    color: '#f87171',
  },
  // Module-style "בואו נתחיל" pattern.
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingVertical: 16,
    borderRadius: 999,
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
    shadowColor: '#0891b2',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  runBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  // ── Simulating ──
  simContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  simLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0c4a6e',
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  monthBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    // RTL: progress fills right-to-left (matches Hebrew reading direction).
    transform: [{ scaleX: -1 }],
  },
  monthFill: {
    height: '100%',
    backgroundColor: '#0891b2',
    borderRadius: 4,
  },
  monthText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 24,
  },
  portfolioCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',

    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 20,
    width: '100%',
  },
  portfolioLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  portfolioReturn: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  headlineCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    marginBottom: 20,
  },
  headlineText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
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
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  sectorBreakdown: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  sectorMini: {
    alignItems: 'center',
    gap: 4,
  },
  sectorMiniPct: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // ── Results ──
  resultsContainer: {
    paddingTop: 12,
  },
  gradeBanner: {
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 0, // Removed hard box
    paddingVertical: 24,
    marginBottom: 20,
    shadowColor: '#ffffff',
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  gradeEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  gradeLetter: {
    fontSize: 48,
    fontWeight: '900',
  },
  gradeLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0c4a6e',
    marginBottom: 4,
    writingDirection: 'rtl' as const,
  },
  resultAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  resultSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 16,
    writingDirection: 'rtl' as const,
  },
  benchmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  benchmarkItem: {
    alignItems: 'center',
  },
  benchmarkLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  benchmarkValue: {
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  benchmarkDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#cbd5e1',
  },
  // Sector results
  sectorResults: {
    marginBottom: 16,
  },
  sectorResultsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0c4a6e',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  sectorResultRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  sectorResultName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0c4a6e',
    writingDirection: 'rtl' as const,
  },
  sectorResultAlloc: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    writingDirection: 'rtl' as const,
  },
  sectorResultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectorResultPct: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  // Lesson
  lessonCard: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  lessonIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  lessonTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0c4a6e',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  lessonText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  historicalNoteBox: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  historicalNoteLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#92400e',
    textAlign: 'right',
    writingDirection: 'rtl' as const,
    marginBottom: 4,
  },
  historicalNoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#78350f',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  // Reward
  rewardCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0c4a6e',
    marginBottom: 6,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 20,
  },
  rewardItem: {
    fontSize: 17,
    fontWeight: '900',
    color: '#92400e',
  },
  // Actions
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  replayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#0891b2',
  },
  replayText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0891b2',
  },
  // Module-style "בואו נתחיל" pattern.
  homeBtn: {
    flex: 1,
    backgroundColor: '#0891b2',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
    shadowColor: '#0891b2',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  homeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
});
