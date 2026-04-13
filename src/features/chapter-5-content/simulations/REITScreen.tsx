/**
 * SIM 27: בעל הבית הווירטואלי (Virtual Landlord — REITs) — Module 5-27
 * Screen: allocate budget across REIT sectors, simulate 10 years, collect dividends.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
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
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { useREIT } from './useREIT';
import type { YearSnapshot, PhysicalComparison } from './useREIT';
import type { REITSector, REITScore } from './reitTypes';
import { REIT_BUDGET, REIT_SECTORS } from './reitData';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { SIM5, GRADE_COLORS5, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE5, sim5Styles } from './simTheme';
import { formatShekel } from '../../../utils/format';


/* ── Lottie assets ── */
const LOTTIE_BUILDING = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_HOUSE = require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const GRADE_COLORS: Record<REITScore['grade'], string> = GRADE_COLORS5 as Record<REITScore['grade'], string>;

// ── Sub-components ────────────────────────────────────────────────────

/** Volatility indicator bar */
function VolatilityBar({ volatility }: { volatility: number }) {
  const level = volatility <= 0.3 ? 'low' : volatility <= 0.6 ? 'medium' : 'high';
  const colors = { low: '#4ade80', medium: '#fbbf24', high: '#ef4444' };
  const labels = { low: 'סיכון נמוך', medium: 'סיכון בינוני', high: 'סיכון גבוה' };

  return (
    <View style={volStyles.container}>
      <Text style={[volStyles.label, { color: colors[level] }]}>{labels[level]}</Text>
      <View style={volStyles.track}>
        <View style={[volStyles.fill, { width: `${volatility * 100}%`, backgroundColor: colors[level] }]} />
      </View>
    </View>
  );
}

const volStyles = StyleSheet.create({
  container: { marginTop: 6 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    ...RTL,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: SIM5.trackBg,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
});

/** Sector card for allocation phase */
function SectorCard({
  sector,
  percent,
  onPercentChange,
}: {
  sector: REITSector;
  percent: number;
  onPercentChange: (value: number) => void;
}) {
  const amount = Math.round(REIT_BUDGET * (percent / 100));

  return (
    <GlowCard
      glowColor="rgba(34,211,238,0.15)"
      style={{ backgroundColor: SIM5.cardBg }}
    >
      <View style={sectorStyles.card}>
        <View style={sectorStyles.headerRow}>
          <Text style={sectorStyles.emoji}>{sector.emoji}</Text>
          <View style={sectorStyles.headerText}>
            <Text style={[sectorStyles.name, RTL]}>{sector.name}</Text>
            <Text style={[sectorStyles.desc, RTL]}>{sector.description}</Text>
          </View>
        </View>

        <View style={sectorStyles.statsRow}>
          <View style={sectorStyles.stat}>
            <Text style={sectorStyles.statLabel}>תשואה שנתית</Text>
            <Text style={[sectorStyles.statValue, { color: '#4ade80' }]}>
              {(sector.annualReturn * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={sectorStyles.divider} />
          <View style={sectorStyles.stat}>
            <Text style={sectorStyles.statLabel}>דיבידנד</Text>
            <Text style={[sectorStyles.statValue, { color: '#fbbf24' }]}>
              {(sector.dividendYield * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <VolatilityBar volatility={sector.volatility} />

        {/* Allocation slider */}
        <View style={sectorStyles.sliderRow}>
          <Text style={sectorStyles.percentText}>{percent}%</Text>
          <View style={sectorStyles.sliderWrap}>
            <Slider
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={percent}
              onValueChange={(v) => {
                tapHaptic();
                onPercentChange(v);
              }}
              minimumTrackTintColor={SIM5.primary}
              maximumTrackTintColor={SIM5.trackBg}
              thumbTintColor={SIM5.btnPrimary}
              accessibilityRole="adjustable"
              accessibilityLabel={`הקצאה ל-${sector.name}`}
              accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
            />
          </View>
          <Text style={sectorStyles.amountText}>{formatShekel(amount)}</Text>
        </View>
      </View>
    </GlowCard>
  );
}

const sectorStyles = StyleSheet.create({
  card: { marginBottom: 0, padding: 14 },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  emoji: { fontSize: 28, marginLeft: 10 },
  headerText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: SIM5.textPrimary, marginBottom: 3 },
  desc: { fontSize: 13, color: SIM5.textMuted, lineHeight: 17 },
  statsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: SIM5.trackBg,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 13, fontWeight: '600', color: SIM5.textMuted, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800', color: SIM5.textPrimary },
  divider: { width: 1, backgroundColor: SIM5.cardBorder, marginHorizontal: 4 },
  sliderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  percentText: { fontSize: 14, fontWeight: '900', color: SIM5.btnPrimary, width: 38, textAlign: 'center' },
  sliderWrap: { flex: 1 },
  amountText: { fontSize: 14, fontWeight: '700', color: SIM5.textMuted, width: 64, textAlign: 'center' },
});

/** Building block for cityscape — height proportional to sector value */
function BuildingBlock({
  sector,
  value,
  initialValue,
}: {
  sector: REITSector;
  value: number;
  initialValue: number;
}) {
  const ratio = initialValue > 0 ? value / initialValue : 1;
  const height = Math.max(20, Math.min(120, 60 * ratio));
  const isUp = ratio > 1;
  const isDown = ratio < 0.95;
  const borderColor = isDown ? '#ef4444' : isUp ? '#4ade80' : 'transparent';

  return (
    <View style={buildingStyles.wrapper}>
      <View
        style={[
          buildingStyles.building,
          {
            height,
            borderColor,
            borderWidth: isUp || isDown ? 1.5 : 0,
          },
        ]}
      >
        <Text style={buildingStyles.emoji}>{sector.emoji}</Text>
      </View>
      <Text style={buildingStyles.value}>{formatShekel(value)}</Text>
      <Text style={[buildingStyles.change, { color: isDown ? '#ef4444' : '#4ade80' }]}>
        {ratio >= 1 ? '+' : ''}{((ratio - 1) * 100).toFixed(0)}%
      </Text>
    </View>
  );
}

const buildingStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', flex: 1 },
  building: {
    backgroundColor: 'rgba(8,145,178,0.15)',
    borderRadius: 8,
    width: 48,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  emoji: { fontSize: 20 },
  value: { fontSize: 13, fontWeight: '700', color: SIM5.textMuted, marginTop: 4 },
  change: { fontSize: 13, fontWeight: '800' },
});

/** REIT event card — news banner style */
function REITEventCard({ snapshot }: { snapshot: YearSnapshot }) {
  if (!snapshot.event) return null;

  // Determine overall sentiment from impacts
  const totalImpact = Object.values(snapshot.event.impacts).reduce((s, v) => s + v, 0);
  const borderColor = totalImpact < -0.1 ? '#ef4444' : totalImpact > 0.1 ? '#4ade80' : '#a78bfa';

  return (
    <Animated.View entering={FadeInDown.springify().damping(12)}>
      <View style={[reitEventStyles.card, { borderLeftColor: borderColor }]}>
        <View style={reitEventStyles.yearBadge}>
          <Text style={reitEventStyles.yearText}>שנה {snapshot.year}</Text>
        </View>
        <Text style={reitEventStyles.emoji}>{snapshot.event.emoji}</Text>
        <Text style={[reitEventStyles.description, RTL]}>{snapshot.event.description}</Text>
        {/* Per-sector impacts */}
        <View style={reitEventStyles.impactsRow}>
          {REIT_SECTORS.map((sector) => {
            const impact = snapshot.event?.impacts[sector.id] ?? 0;
            if (impact === 0) return null;
            return (
              <View key={sector.id} style={reitEventStyles.impactChip}>
                <Text style={reitEventStyles.impactEmoji}>{sector.emoji}</Text>
                <Text
                  style={[
                    reitEventStyles.impactText,
                    { color: impact > 0 ? '#4ade80' : '#ef4444' },
                  ]}
                >
                  {impact > 0 ? '+' : ''}{(impact * 100).toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const reitEventStyles = StyleSheet.create({
  card: {
    backgroundColor: SIM5.cardBg,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  yearBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: SIM5.trackBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  yearText: { fontSize: 13, fontWeight: '700', color: SIM5.textMuted },
  emoji: { fontSize: 28, alignSelf: 'center', marginBottom: 6 },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  impactsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  impactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SIM5.trackBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  impactEmoji: { fontSize: 14 },
  impactText: { fontSize: 13, fontWeight: '800' },
});

// ── Score Screen ──────────────────────────────────────────────────────

function ScoreScreen({
  score,
  physicalComparison,
  onReplay,
  onContinue,
}: {
  score: REITScore;
  physicalComparison: PhysicalComparison;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const gradeColor = GRADE_COLORS[score.grade];
  const reitTotal = score.totalValue + score.totalDividends;
  const reitNet = reitTotal - REIT_BUDGET;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
        <LottieIcon source={LOTTIE_BUILDING} size={56} />
        <Text style={styles.heroTitle}>בעל הבית הווירטואלי!</Text>
      </Animated.View>

      {/* Grade */}
      <Animated.View entering={FadeInDown.duration(600).delay(100)} style={sim5Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim5Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <Text style={sim5Styles.gradeLabel}>דירוג תיק הנדל&quot;ן</Text>
      </Animated.View>

      {/* Portfolio Summary */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <GlowCard glowColor="rgba(251, 191, 36, 0.3)" style={{ backgroundColor: SIM5.cardBg }}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, RTL]}>סיכום 10 שנות השקעה</Text>
            <Text style={[styles.summaryText, RTL]}>
              תיק ה-REIT שלך הניב {formatShekel(score.totalDividends)} הכנסה פסיבית ({formatShekel(score.averageMonthlyIncome)}/חודש בממוצע)
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[styles.summaryTitle, RTL]}>פירוט מספרים</Text>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_MONEY} size={22} />
                <Text style={sim5Styles.scoreRowLabel}>השקעה התחלתית</Text>
              </View>
              <Text style={sim5Styles.scoreRowValue}>{formatShekel(REIT_BUDGET)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={22} />
                <Text style={sim5Styles.scoreRowLabel}>ערך תיק סופי</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.primary }]}>{formatShekel(score.totalValue)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <Text style={sim5Styles.scoreRowLabel}> דיבידנדים שנאספו</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: '#fbbf24' }]}>{formatShekel(score.totalDividends)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <Text style={sim5Styles.scoreRowLabel}>💵 הכנסה פסיבית חודשית</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.success }]}>{formatShekel(score.averageMonthlyIncome)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_GROWTH} size={22} />
                <Text style={sim5Styles.scoreRowLabel}>תשואה כוללת</Text>
              </View>
              <Text
                style={[
                  sim5Styles.scoreRowValue,
                  { color: score.totalReturn >= 0 ? SIM5.success : SIM5.danger },
                ]}
              >
                {score.totalReturn >= 0 ? '+' : ''}{(score.totalReturn * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={sim5Styles.scoreDivider}>
              <Text style={sim5Styles.scoreTotalLabel}>רווח נטו</Text>
              <Text
                style={[
                  sim5Styles.scoreTotalValue,
                  { color: reitNet >= 0 ? SIM5.success : SIM5.danger },
                ]}
              >
                {reitNet >= 0 ? '+' : ''}{formatShekel(reitNet)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* REIT vs Physical comparison */}
      <Animated.View entering={FadeInDown.duration(600).delay(350)}>
        <GlowCard glowColor={SIM5.glow} style={{ backgroundColor: SIM5.cardBg }}>
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LottieIcon source={LOTTIE_HOUSE} size={22} />
              <Text style={[styles.summaryTitle, RTL]}>REIT vs דירה פיזית</Text>
            </View>

            <View style={compStyles.row}>
              <View style={compStyles.side}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                  <LottieIcon source={LOTTIE_BUILDING} size={22} />
                  <Text style={compStyles.sideTitle}>REIT</Text>
                </View>
                <Text style={[compStyles.sideValue, { color: '#4ade80' }]}>{formatShekel(reitTotal)}</Text>
                <Text style={compStyles.sideNote}>נזיל, מפוזר, ללא כאב ראש</Text>
              </View>
              <View style={compStyles.divider} />
              <View style={compStyles.side}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                  <LottieIcon source={LOTTIE_HOUSE} size={22} />
                  <Text style={compStyles.sideTitle}>דירה</Text>
                </View>
                <Text style={[compStyles.sideValue, { color: '#f97316' }]}>
                  {formatShekel(physicalComparison.netValue + REIT_BUDGET)}
                </Text>
                <Text style={compStyles.sideNote}>תחזוקה, דיירים, ביורוקרטיה</Text>
              </View>
            </View>

            {/* Visual bar comparison */}
            <View style={compStyles.barContainer}>
              <View style={compStyles.barRow}>
                <Text style={compStyles.barLabel}>REIT</Text>
                <View style={compStyles.barTrack}>
                  <View
                    style={[
                      compStyles.barFill,
                      {
                        width: `${Math.min(100, (reitTotal / Math.max(reitTotal, physicalComparison.netValue + REIT_BUDGET)) * 100)}%`,
                        backgroundColor: '#4ade80',
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={compStyles.barRow}>
                <Text style={compStyles.barLabel}>דירה</Text>
                <View style={compStyles.barTrack}>
                  <View
                    style={[
                      compStyles.barFill,
                      {
                        width: `${Math.min(100, ((physicalComparison.netValue + REIT_BUDGET) / Math.max(reitTotal, physicalComparison.netValue + REIT_BUDGET)) * 100)}%`,
                        backgroundColor: '#f97316',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)}>
        <View style={sim5Styles.scoreCard}>
          <View style={{ padding: 16 }}>
            <View style={sim5Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim5Styles.insightText, RTL]}>
                REIT = נדל&quot;ן בלי כאב ראש. פיזור, נזילות, ודיבידנדים.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(600).delay(600)} style={sim5Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim5Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim5Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim5Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim5Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const compStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    marginBottom: 12,
  },
  side: { flex: 1, alignItems: 'center' },
  sideTitle: { fontSize: 14, fontWeight: '700', color: SIM5.textPrimary, marginBottom: 4 },
  sideValue: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  sideNote: {
    fontSize: 13,
    color: SIM5.textMuted,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 8,
  },
  barContainer: { gap: 6 },
  barRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: { fontSize: 13, fontWeight: '700', color: SIM5.textMuted, width: 36 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: SIM5.trackBg,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
});

// ── Main Screen ───────────────────────────────────────────────────────

interface REITScreenProps {
  onComplete?: () => void;
}

export function REITScreen({ onComplete }: REITScreenProps) {
  const {
    state,
    config,
    isPlaying,
    isAllocated,
    isAllocationValid,
    totalAllocatedPercent,
    allocationPercents,
    yearSnapshots,
    physicalComparison,
    score,
    setSectorPercent,
    confirmAllocation,
    startPlay,
    reset,
  } = useREIT();


  const rewardsGranted = useRef(false);

  const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-3303-house-rent-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-945-dividends-hover-pinch.json'),
  ];

  // Hero value animation
  const heroScale = useSharedValue(1);
  const prevValue = useRef(state.totalValue);

  useEffect(() => {
    if (state.totalValue !== prevValue.current && state.totalValue > 0) {
      heroScale.value = withSequence(
        withSpring(1.12, SPRING_SNAPPY),
        withSpring(1, SPRING_SNAPPY),
      );
      prevValue.current = state.totalValue;
    }
  }, [state.totalValue, heroScale]);

  // Reward granting
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const heroAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));

  const handleConfirm = useCallback(() => {
    if (!isAllocationValid) return;
    heavyHaptic();
    confirmAllocation();
  }, [isAllocationValid, confirmAllocation]);

  const handleStartSim = useCallback(() => {
    heavyHaptic();
    startPlay();
  }, [startPlay]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Score screen ──────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
        <ScoreScreen
          score={score}
          physicalComparison={physicalComparison}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Phase 1: Allocation ───────────────────────────────────────────
  if (!isAllocated) {
    const pctColor = totalAllocatedPercent === 100
      ? '#4ade80'
      : totalAllocatedPercent > 100
        ? '#ef4444'
        : '#fbbf24';

    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BUILDING} size={28} />
              <Text accessibilityRole="header" style={[styles.title, RTL]}>בעל הבית הווירטואלי</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              חלק {formatShekel(REIT_BUDGET)} בין סקטורי נדל&quot;ן — ותראה מה קורה ב-10 שנים
            </Text>
          </Animated.View>

          {/* Budget info */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <GlowCard glowColor="rgba(34,211,238,0.2)" style={{ backgroundColor: SIM5.cardBg }}>
              <View style={allocStyles.budgetCard}>
                <LottieIcon source={LOTTIE_MONEY} size={40} />
                <Text style={[allocStyles.budgetTitle, RTL]}>תקציב השקעה</Text>
                <Text style={allocStyles.budgetValue}>{formatShekel(REIT_BUDGET)}</Text>
                <View style={allocStyles.pctRow}>
                  <Text style={[allocStyles.pctText, { color: pctColor }]}>
                    {totalAllocatedPercent}% מוקצה
                  </Text>
                  {totalAllocatedPercent !== 100 && (
                    <Text style={allocStyles.pctHint}>
                      {totalAllocatedPercent < 100
                        ? `(נותר ${100 - totalAllocatedPercent}%)`
                        : `(עודף ${totalAllocatedPercent - 100}%)`}
                    </Text>
                  )}
                </View>
                {/* Allocation pie visualization */}
                <View style={allocStyles.pieBar}>
                  {REIT_SECTORS.map((sector) => {
                    const pct = allocationPercents[sector.id] ?? 0;
                    if (pct === 0) return null;
                    return (
                      <View
                        key={sector.id}
                        style={[
                          allocStyles.pieSegment,
                          {
                            flex: pct,
                            backgroundColor: sector.id === 'offices' ? '#a78bfa'
                              : sector.id === 'residential' ? '#4ade80'
                              : sector.id === 'commercial' ? '#fbbf24'
                              : sector.id === 'healthcare' ? '#f472b6'
                              : '#c084fc',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Sector cards */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={[styles.sectionTitle, RTL]}>בחר הקצאה לכל סקטור</Text>
          </Animated.View>

          {REIT_SECTORS.map((sector, i) => (
            <Animated.View key={sector.id} entering={FadeInDown.duration(500).delay(300 + i * 80)}>
              <View style={{ marginBottom: 12 }}>
                <SectorCard
                  sector={sector}
                  percent={allocationPercents[sector.id] ?? 0}
                  onPercentChange={(v) => setSectorPercent(sector.id, v)}
                />
              </View>
            </Animated.View>
          ))}

          {/* Confirm button */}
          {isAllocationValid && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.completeArea}>
              <AnimatedPressable onPress={handleConfirm} style={styles.completeBtn} accessibilityRole="button" accessibilityLabel="התחל סימולציה">
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                  <Text style={styles.completeBtnText}>התחל סימולציה</Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SimLottieBackground>
    );
  }

  // ── Phase 2: Simulation ───────────────────────────────────────────
  const latestSnapshot = yearSnapshots.length > 0 ? yearSnapshots[yearSnapshots.length - 1] : null;
  const dividendsChange = state.totalDividends > 0 ? state.totalDividends : 0;
  const avgMonthly = state.currentYear > 0 ? Math.round(state.totalDividends / (state.currentYear * 12)) : 0;

  return (
    <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_BUILDING} size={28} />
            <Text accessibilityRole="header" style={[styles.title, RTL]}>בעל הבית הווירטואלי</Text>
          </View>
          <Text style={[styles.subtitle, RTL]}>10 שנות השקעה בנדל&quot;ן</Text>
        </Animated.View>

        {/* Year counter hero */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.heroSection}>
          <Text style={styles.heroLabel}>🗓️ שנה</Text>
          <Animated.View style={heroAnimStyle}>
            <Text style={[styles.heroNumber, { color: SIM5.dark }]}>
              {state.currentYear}
            </Text>
          </Animated.View>
          <Text style={styles.heroLabel}>מתוך {config.years}</Text>

          {/* Progress bar */}
          <View style={simStyles.progressTrack}>
            <LinearGradient
              colors={[SIM5.btnPrimary, '#fbbf24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[simStyles.progressFill, { width: `${(state.currentYear / config.years) * 100}%` }]}
            />
          </View>
        </Animated.View>

        {/* Running totals */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={simStyles.totalsGrid}>
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>ערך תיק</Text>
              <Text style={[simStyles.totalValue, { color: '#a78bfa' }]}>
                {formatShekel(state.totalValue)}
              </Text>
            </View>
            <View style={simStyles.totalDivider} />
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>דיבידנדים</Text>
              <Text style={[simStyles.totalValue, { color: '#fbbf24' }]}>
                {formatShekel(state.totalDividends)}
              </Text>
            </View>
            <View style={simStyles.totalDivider} />
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>הכנסה חודשית</Text>
              <Text style={[simStyles.totalValue, { color: '#4ade80' }]}>
                {formatShekel(avgMonthly)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Passive income counter */}
        <Animated.View entering={FadeInDown.duration(500).delay(220)}>
          <GlowCard glowColor="rgba(74, 222, 128, 0.2)" style={{ backgroundColor: SIM5.cardBg }}>
            <View style={simStyles.passiveCard}>
              <Text style={simStyles.passiveLabel}> הכנסה פסיבית חודשית</Text>
              <Text style={simStyles.passiveValue}>{formatShekel(avgMonthly)}</Text>
            </View>
          </GlowCard>
        </Animated.View>

        {/* Cityscape — buildings for each sector */}
        {latestSnapshot && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={[styles.sectionTitle, RTL]}>🏙️ העיר שלך</Text>
            <View style={simStyles.cityscape}>
              {REIT_SECTORS.map((sector) => {
                const value = latestSnapshot.sectorValues[sector.id] ?? 0;
                const initial = state.allocations[sector.id] ?? 0;
                if (initial === 0) return null;
                return (
                  <BuildingBlock
                    key={sector.id}
                    sector={sector}
                    value={value}
                    initialValue={initial}
                  />
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* vs Physical apartment sidebar */}
        <Animated.View entering={FadeInDown.duration(500).delay(280)}>
          <View style={simStyles.compRow}>
            <View style={simStyles.compItem}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_BUILDING} size={18} />
                <Text style={simStyles.compLabel}>REIT</Text>
              </View>
              <Text style={[simStyles.compValue, { color: '#4ade80' }]}>
                {formatShekel(state.totalValue + state.totalDividends)}
              </Text>
              <Text style={simStyles.compNote}>לחיצה, ישיבה, איסוף</Text>
            </View>
            <View style={simStyles.compDivider} />
            <View style={simStyles.compItem}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_HOUSE} size={18} />
                <Text style={simStyles.compLabel}>דירה פיזית</Text>
              </View>
              <Text style={[simStyles.compValue, { color: '#f97316' }]}>
                {formatShekel(physicalComparison.netValue + REIT_BUDGET)}
              </Text>
              <Text style={simStyles.compNote}>תחזוקה, דיירים, כאב ראש</Text>
            </View>
          </View>
        </Animated.View>

        {/* Events */}
        {yearSnapshots.filter((s) => s.event !== null).length > 0 && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={[styles.sectionTitle, RTL]}>📰 אירועים</Text>
            {yearSnapshots
              .filter((s) => s.event !== null)
              .map((snapshot) => (
                <REITEventCard key={snapshot.year} snapshot={snapshot} />
              ))}
          </Animated.View>
        )}

        {/* Start / Waiting indicator */}
        {!isPlaying && state.currentYear === 0 && (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.completeArea}>
            <AnimatedPressable onPress={handleStartSim} style={styles.completeBtn} accessibilityRole="button" accessibilityLabel="התחל סימולציה">
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                <Text style={styles.completeBtnText}>התחל סימולציה</Text>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {isPlaying && !state.isComplete && (
          <Animated.View entering={FadeIn.duration(300)} style={simStyles.waitingArea}>
            <Text style={simStyles.waitingText}>⏳ ממתין לשנה הבאה...</Text>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SimLottieBackground>
  );
}

// ── Allocation-phase styles ──────────────────────────────────────────

const allocStyles = StyleSheet.create({
  budgetCard: {
    padding: 16,
    alignItems: 'center',
  },
  budgetTitle: { fontSize: 16, fontWeight: '700', color: SIM5.textPrimary, marginBottom: 4, marginTop: 8 },
  budgetValue: { fontSize: 28, fontWeight: '900', color: '#fbbf24', marginBottom: 8 },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pctText: { fontSize: 14, fontWeight: '800' },
  pctHint: { fontSize: 14, color: SIM5.textMuted },
  pieBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
    marginTop: 10,
    backgroundColor: SIM5.trackBg,
  },
  pieSegment: { height: '100%' },
});

// ── Simulation-phase styles ──────────────────────────────────────────

const simStyles = StyleSheet.create({
  progressTrack: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: SIM5.trackBg,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  totalsGrid: {
    flexDirection: 'row-reverse',
    backgroundColor: SIM5.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  totalValue: { fontSize: 16, fontWeight: '900', color: SIM5.textPrimary },
  totalDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 4,
  },
  passiveCard: {
    padding: 14,
    alignItems: 'center',
  },
  passiveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  passiveValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4ade80',
  },
  cityscape: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: SIM5.trackBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 140,
  },
  compRow: {
    flexDirection: 'row-reverse',
    backgroundColor: SIM5.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  compItem: { flex: 1, alignItems: 'center' },
  compLabel: { fontSize: 14, fontWeight: '700', color: SIM5.textPrimary, marginBottom: 4 },
  compValue: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  compNote: { fontSize: 13, color: SIM5.textMuted, textAlign: 'center' },
  compDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 8,
  },
  waitingArea: { alignItems: 'center', paddingVertical: 20 },
  waitingText: { fontSize: 14, color: SIM5.textMuted },
});

// ── Main styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingTop: 50 },

  // Header
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: SIM5.textOnGradient, marginBottom: 6, ...SHADOW_STRONG },
  subtitle: { fontSize: 15, color: SIM5.textOnGradientMuted, ...SHADOW_LIGHT },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: SIM5.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  heroLabel: { fontSize: 16, fontWeight: '600', color: SIM5.textOnGradientMuted, ...SHADOW_LIGHT },
  heroNumber: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fbbf24' },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SIM5.textOnGradient,
    marginBottom: 12,
    marginTop: 4,
    ...SHADOW_STRONG,
  },

  // Complete button
  completeArea: { marginTop: 8, alignItems: 'center' },
  completeBtn: {
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM5.btnPrimaryBorder,
  },
  completeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Score screen (most styles now via sim5Styles)
  summaryCard: { padding: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: SIM5.textPrimary, marginBottom: 8 },
  summaryText: { fontSize: 14, color: SIM5.textMuted, lineHeight: 22 },
});
