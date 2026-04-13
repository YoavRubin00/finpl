/**
 * SIM 24: מנהל התיקים (Portfolio Manager) — Module 4-24
 * Screen: allocate budget across 5 assets, watch world events unfold.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
  withTiming,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { usePortfolioManager } from './usePortfolioManager';
import { ASSET_CLASSES, WORLD_EVENTS } from './portfolioManagerData';
import { SIM4, GRADE_COLORS4, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE4, sim4Styles } from './simTheme';
import { getChapterTheme } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';


const _th4 = getChapterTheme('chapter-4');

/* ── Lottie assets ── */
const LOTTIE_BRIEFCASE = require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_DOCUMENT = require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const GRADE_LOTTIES: Record<string, ReturnType<typeof require>> = {
  S: LOTTIE_TROPHY,
  A: LOTTIE_STAR,
  B: LOTTIE_CHECK,
  C: LOTTIE_CROSS,
  F: LOTTIE_CROSS,
};

const GRADE_LABELS_TEXT: Record<string, string> = {
  S: 'מנהל תיקים אגדי!',
  A: 'תיק מצוין',
  B: 'תיק סביר',
  C: 'חסר פיזור',
  F: 'הפסד כבד',
};

// ── Sub-components ────────────────────────────────────────────────────

interface AssetSliderProps {
  assetId: string;
  name: string;
  emoji: string;
  color: string;
  percent: number;
  disabled: boolean;
  onChange: (assetId: string, percent: number) => void;
}

function AssetSlider({ assetId, name, emoji, color, percent, disabled, onChange }: AssetSliderProps) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.emoji}>{emoji}</Text>
        <Text style={[sliderStyles.name, RTL]}>{name}</Text>
        <Text style={[sliderStyles.percent, { color }]}>{percent}%</Text>
      </View>
      <View style={sliderStyles.trackContainer}>
        <View style={[sliderStyles.fillBar, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Slider
        style={sliderStyles.slider}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={percent}
        onValueChange={(val: number) => onChange(assetId, val)}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor={disabled ? '#999' : color}
        disabled={disabled}
        accessibilityRole="adjustable"
        accessibilityLabel={`הקצאה ל${name}`}
        accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
    marginLeft: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
  percent: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 4,
    minWidth: 44,
    textAlign: 'center',
  },
  trackContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SIM4.trackBg,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 3,
  },
  slider: {
    width: '100%',
    height: 30,
    marginTop: -4,
  },
});

function DonutChart({ allocations }: { allocations: Record<string, number> }) {
  const slices = ASSET_CLASSES.map((a) => ({
    percent: allocations[a.id] || 0,
    color: a.color,
    label: `${a.emoji} ${a.name}`,
  })).filter((s) => s.percent > 0);

  if (slices.length === 0) {
    return (
      <View style={donutStyles.container}>
        <View style={donutStyles.empty}>
          <Text style={donutStyles.emptyText}>הקצה תקציב</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={donutStyles.container}>
      <View style={donutStyles.bar}>
        {slices.map((slice, i) => (
          <Animated.View
            key={i}
            entering={FadeIn.duration(300).delay(i * 50)}
            style={[
              donutStyles.slice,
              {
                flex: slice.percent,
                backgroundColor: slice.color,
                borderTopLeftRadius: i === 0 ? 8 : 0,
                borderBottomLeftRadius: i === 0 ? 8 : 0,
                borderTopRightRadius: i === slices.length - 1 ? 8 : 0,
                borderBottomRightRadius: i === slices.length - 1 ? 8 : 0,
              },
            ]}
          />
        ))}
      </View>
      <View style={donutStyles.legend}>
        {slices.map((slice, i) => (
          <View key={i} style={donutStyles.legendItem}>
            <View style={[donutStyles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={donutStyles.legendText}>
              {slice.label} {slice.percent}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  empty: {
    height: 28,
    borderRadius: 8,
    backgroundColor: SIM4.trackBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
  bar: {
    height: 28,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  slice: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  legendText: {
    fontSize: 11,
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
});

function EventCard({
  event,
  valueBefore,
  valueAfter,
  allocations,
}: {
  event: (typeof WORLD_EVENTS)[number];
  valueBefore: number;
  valueAfter: number;
  allocations: Record<string, number>;
}) {
  const change = valueAfter - valueBefore;
  const changePct = (change / valueBefore) * 100;
  const isPositive = change >= 0;

  return (
    <Animated.View entering={FadeInDown.springify().damping(12)} style={eventStyles.card}>
      <View style={eventStyles.header}>
        <Text style={eventStyles.emoji}>{event.emoji}</Text>
        <Text style={[eventStyles.name, RTL]}>{event.name}</Text>
      </View>
      <View style={eventStyles.impactRow}>
        <Text
          style={[
            eventStyles.changeValue,
            { color: isPositive ? '#4ade80' : '#ef4444' },
          ]}
        >
          {isPositive ? '+' : ''}{formatShekel(change)} ({isPositive ? '+' : ''}{changePct.toFixed(1)}%)
        </Text>
      </View>
      {/* Per-asset impacts */}
      <View style={eventStyles.assetImpacts}>
        {ASSET_CLASSES.map((asset) => {
          const impact = event.impacts[asset.id] ?? 0;
          const weight = (allocations[asset.id] || 0) / 100;
          const contribution = impact * weight * valueBefore;
          if (weight === 0) return null;
          return (
            <View key={asset.id} style={eventStyles.assetImpactRow}>
              <Text style={eventStyles.assetEmoji}>{asset.emoji}</Text>
              <Text
                style={[
                  eventStyles.assetImpactText,
                  { color: impact >= 0 ? '#4ade80' : '#ef4444' },
                ]}
              >
                {impact >= 0 ? '+' : ''}{(impact * 100).toFixed(0)}%
                ({impact >= 0 ? '+' : ''}{formatShekel(contribution)})
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const eventStyles = StyleSheet.create({
  card: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
    marginLeft: 10,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: SIM4.textPrimary,
  },
  impactRow: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  changeValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  assetImpacts: {
    borderTopWidth: 1,
    borderTopColor: SIM4.cardBorder,
    paddingTop: 8,
  },
  assetImpactRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetEmoji: {
    fontSize: 14,
    marginLeft: 6,
  },
  assetImpactText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

function ValueDisplay({
  value,
  budget,
  stocksOnlyValue,
}: {
  value: number;
  budget: number;
  stocksOnlyValue: number;
}) {
  const scale = useSharedValue(1);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const diff = Math.abs(value - prevValueRef.current);
    if (diff > 5000) {
      scale.value = withSequence(
        withSpring(1.15, SPRING_SNAPPY),
        withSpring(1, SPRING_SNAPPY),
      );
      if (value < prevValueRef.current) {
        heavyHaptic();
      }
    }
    prevValueRef.current = value;
  }, [value, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const totalReturn = ((value - budget) / budget) * 100;
  const isPositive = value >= budget;

  return (
    <View style={valueStyles.container}>
      <Animated.View style={[valueStyles.valueRow, animStyle]}>
        <Text
          style={[
            valueStyles.value,
            { color: isPositive ? '#4ade80' : '#ef4444' },
          ]}
        >
          {formatShekel(value)}
        </Text>
      </Animated.View>
      <Text
        style={[
          valueStyles.returnText,
          { color: isPositive ? '#4ade80' : '#ef4444' },
        ]}
      >
        {isPositive ? '+' : ''}{totalReturn.toFixed(1)}% מההשקעה
      </Text>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
        <LottieIcon source={LOTTIE_DOCUMENT} size={16} />
        <Text style={valueStyles.ghostText}>
          100% מניות US: {formatShekel(stocksOnlyValue)}
        </Text>
      </View>
    </View>
  );
}

const valueStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: SIM4.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  valueRow: {
    marginBottom: 4,
  },
  value: {
    fontSize: 36,
    fontWeight: '900',
  },
  returnText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  ghostText: {
    fontSize: 13,
    color: SIM4.textMuted,
    fontStyle: 'italic',
  },
});

// ── Score Screen ──────────────────────────────────────────────────────

function ScoreScreen({
  score,
  state,
  stocksOnlyValue,
  onReplay,
  onContinue,
}: {
  score: NonNullable<ReturnType<typeof usePortfolioManager>['score']>;
  state: ReturnType<typeof usePortfolioManager>['state'];
  stocksOnlyValue: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const budget = 200_000;
  const gradeColor = GRADE_COLORS4[score.grade] || SIM4.textPrimary;
  const gradeLabel = GRADE_LABELS_TEXT[score.grade] || '';
  const gradeLottie = GRADE_LOTTIES[score.grade] || LOTTIE_CHART;
  const totalReturn = ((score.finalValue - budget) / budget) * 100;
  const isPositive = score.finalValue >= budget;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Grade banner */}
      <Animated.View entering={FadeInDown.duration(600)} style={sim4Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <LottieIcon source={gradeLottie} size={28} />
          <Text style={[sim4Styles.gradeLabel, { color: gradeColor }]}>{gradeLabel}</Text>
        </View>
      </Animated.View>

      {/* Final value hero */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <GlowCard
          glowColor={isPositive ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
          style={sim4Styles.scoreCard}
        >
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[TYPE4.cardTitle, RTL]}>שווי סופי</Text>
            <Text
              style={[
                styles.heroValue,
                { color: isPositive ? '#4ade80' : '#ef4444' },
              ]}
            >
              {formatShekel(score.finalValue)}
            </Text>
            <Text style={[TYPE4.cardBody, RTL]}>
              {isPositive ? '+' : ''}{totalReturn.toFixed(1)}% מ-{formatShekel(budget)}
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Event-by-event breakdown */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <GlowCard glowColor="rgba(96, 165, 250, 0.2)" style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[TYPE4.cardTitle, RTL]}>מסע האירועים</Text>
            {state.eventHistory.map((entry, i) => {
              const event = WORLD_EVENTS.find((e) => e.id === entry.eventId);
              const change = entry.valueAfter - entry.valueBefore;
              const changePositive = change >= 0;
              return (
                <View key={i} style={styles.breakdownRow}>
                  <Text style={styles.breakdownEmoji}>{event?.emoji || '?'}</Text>
                  <Text style={[styles.breakdownName, RTL]}>{event?.name || entry.eventId}</Text>
                  <Text
                    style={[
                      styles.breakdownValue,
                      { color: changePositive ? '#4ade80' : '#ef4444' },
                    ]}
                  >
                    {changePositive ? '+' : ''}{formatShekel(change)}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlowCard>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.statsRow}>
        <GlowCard glowColor="rgba(239, 68, 68, 0.2)" style={{ ...sim4Styles.scoreCard, flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}>
          <Text style={[styles.miniStatValue, { color: '#ef4444' }]}>
            {(score.maxDrawdown * 100).toFixed(1)}%
          </Text>
          <Text style={[styles.miniStatLabel, RTL]}>ירידה מקס</Text>
        </GlowCard>
        <GlowCard glowColor="rgba(96, 165, 250, 0.2)" style={{ ...sim4Styles.scoreCard, flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}>
          <Text style={styles.miniStatValue}>
            {formatShekel(score.volatility)}
          </Text>
          <Text style={[styles.miniStatLabel, RTL]}>תנודתיות</Text>
        </GlowCard>
        <GlowCard glowColor="rgba(251, 191, 36, 0.2)" style={{ ...sim4Styles.scoreCard, flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <LottieIcon source={score.diversificationBonus ? LOTTIE_CHECK : LOTTIE_CROSS} size={22} />
          </View>
          <Text style={[styles.miniStatLabel, RTL]}>פיזור</Text>
        </GlowCard>
      </Animated.View>

      {/* Ghost comparison */}
      <Animated.View entering={FadeInDown.duration(600).delay(450)}>
        <GlowCard glowColor="rgba(212,175,55,0.15)" style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_DOCUMENT} size={22} />
              <Text style={[TYPE4.cardTitle, RTL, { marginBottom: 0 }]}>לשם השוואה</Text>
            </View>
            <Text style={[TYPE4.cardBody, RTL, { marginTop: 8 }]}>
              100% מניות US: {formatShekel(stocksOnlyValue)} ({((stocksOnlyValue - budget) / budget * 100).toFixed(1)}%)
            </Text>
            <Text style={[TYPE4.cardBody, RTL]}>
              התיק שלך: {formatShekel(score.finalValue)} ({totalReturn.toFixed(1)}%)
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Max drawdown highlight */}
      <Animated.View entering={FadeInDown.duration(600).delay(500)}>
        <GlowCard glowColor="rgba(239, 68, 68, 0.2)" style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={22} />
              <Text style={[TYPE4.cardBody, RTL, { flex: 1 }]}>
                הרגע הכי קשה: התיק שלך ירד {Math.abs(score.maxDrawdown * 100).toFixed(1)}% באירוע אחד
              </Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(600)}>
        <GlowCard glowColor="rgba(212, 175, 55, 0.3)" style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={sim4Styles.insightText}>
                פיזור = הביטוח של המשקיע. אל תשימו הכל בסל אחד.
              </Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(600).delay(800)} style={sim4Styles.actionsRow}>
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────

interface PortfolioManagerScreenProps {
  onComplete?: () => void;
}

export function PortfolioManagerScreen({ onComplete }: PortfolioManagerScreenProps) {
  const {
    state,
    config,
    isBuilding,
    isPlayingEvents,
    isDiversified,
    stocksOnlyValue,
    score,
    setAllocation,
    lockAndPlay,
    fireNextEvent,
    reset,
  } = usePortfolioManager();
  const rewardsGranted = useRef(false);
  const [showVault, setShowVault] = useState(false);
  const vaultScale = useSharedValue(0);

  // Reward granting
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const handleLockAndPlay = useCallback(() => {
    heavyHaptic();
    // Vault door animation
    setShowVault(true);
    vaultScale.value = withSequence(
      withSpring(1.2, SPRING_SNAPPY),
      withTiming(0, { duration: 600 }),
    );
    setTimeout(() => {
      setShowVault(false);
      lockAndPlay();
    }, 800);
  }, [lockAndPlay, vaultScale]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    setShowVault(false);
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const handleSliderChange = useCallback(
    (assetId: string, percent: number) => {
      tapHaptic();
      setAllocation(assetId, percent);
    },
    [setAllocation],
  );

  const vaultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vaultScale.value }],
    opacity: vaultScale.value > 0 ? 1 : 0,
  }));

  const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-974-process-flow-game-plan-hover-pinch.json'),
  ];

  // Score screen
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScoreScreen
        score={score}
        state={state}
        stocksOnlyValue={stocksOnlyValue}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // Visible events (already fired)
  const firedEvents = state.eventHistory.map((entry, i) => {
    const event = WORLD_EVENTS.find((e) => e.id === entry.eventId);
    return { event: event!, ...entry, index: i };
  });

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
      {/* Title */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_BRIEFCASE} size={28} /></View>
          <Text accessibilityRole="header" style={[styles.title, RTL]}>מנהל התיקים</Text>
        </View>
        <Text style={[styles.subtitle, RTL]}>
          {isBuilding
            ? `הקצה ${formatShekel(config.budget)} ל-5 סוגי נכסים`
            : 'אירועי עולם משפיעים על התיק שלך...'}
        </Text>
      </Animated.View>

      {/* Value display */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <ValueDisplay
          value={state.portfolioValue}
          budget={config.budget}
          stocksOnlyValue={stocksOnlyValue}
        />
      </Animated.View>

      {/* Donut chart */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <DonutChart allocations={state.allocations} />
      </Animated.View>

      {/* Phase 1: Allocation sliders */}
      {isBuilding && (
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_CHART} size={22} />
            <Text style={[styles.sectionTitle, RTL]}>הקצאת נכסים</Text>
          </View>

          {/* Diversification indicator */}
          <View style={[styles.divIndicator, { borderColor: isDiversified ? '#4ade80' : '#f97316' }]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <LottieIcon source={isDiversified ? LOTTIE_CHECK : LOTTIE_CROSS} size={18} />
              <Text style={[styles.divText, RTL, { color: isDiversified ? '#4ade80' : '#f97316' }]}>
                {isDiversified ? 'תיק מפוזר (אין נכס מעל 40%)' : 'ריכוז גבוה — נכס אחד מעל 40%'}
              </Text>
            </View>
          </View>

          {ASSET_CLASSES.map((asset) => (
            <AssetSlider
              key={asset.id}
              assetId={asset.id}
              name={asset.name}
              emoji={asset.emoji}
              color={asset.color}
              percent={state.allocations[asset.id] || 0}
              disabled={false}
              onChange={handleSliderChange}
            />
          ))}

          {/* Lock button */}
          <View style={styles.lockArea}>
            <AnimatedPressable onPress={handleLockAndPlay} accessibilityRole="button" accessibilityLabel="נעל תיק והתחל" style={styles.lockBtn}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_SHIELD} size={22} />
                <Text style={styles.lockBtnText}>נעל תיק והתחל!</Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>
      )}

      {/* Vault animation overlay */}
      {showVault && (
        <Animated.View style={[styles.vaultOverlay, vaultAnimStyle]}>
          <LottieIcon source={LOTTIE_SHIELD} size={72} />
          <Text style={styles.vaultText}>התיק ננעל!</Text>
        </Animated.View>
      )}

      {/* Phase 2: Events */}
      {isPlayingEvents && (
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_CHART} size={22} />
            <Text style={[styles.sectionTitle, RTL]}>
              אירועים ({state.currentEventIndex + 1}/{WORLD_EVENTS.length})
            </Text>
          </View>

          {/* Locked allocation summary */}
          <View style={styles.lockedAllocRow}>
            {ASSET_CLASSES.map((asset) => {
              const pct = state.allocations[asset.id] || 0;
              if (pct === 0) return null;
              return (
                <View key={asset.id} style={styles.lockedAllocBadge}>
                  <Text style={styles.lockedAllocEmoji}>{asset.emoji}</Text>
                  <Text style={[styles.lockedAllocPct, { color: asset.color }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>

          {/* Fired event cards */}
          {firedEvents.map(({ event, valueBefore, valueAfter, index }) => (
            <EventCard
              key={index}
              event={event}
              valueBefore={valueBefore}
              valueAfter={valueAfter}
              allocations={state.allocations}
            />
          ))}

          {/* Next event button */}
          {!state.isComplete && (
            <Animated.View entering={FadeIn.duration(300)}>
              <AnimatedPressable
                onPress={() => { tapHaptic(); fireNextEvent(); }}
                accessibilityRole="button"
                accessibilityLabel="האירוע הבא"
                style={styles.nextEventBtn}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <LottieIcon source={LOTTIE_CLOCK} size={18} />
                  <Text style={styles.nextEventBtnText}>
                    האירוע הבא →
                  </Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          )}
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </SimLottieBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SIM4.cardBg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },

  // Header
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: SIM4.textOnGradient,
    marginBottom: 6,
    ...SHADOW_STRONG,
  },
  subtitle: {
    fontSize: 15,
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SIM4.textOnGradient,
    marginBottom: 12,
    marginTop: 4,
    ...SHADOW_STRONG,
  },

  // Diversification indicator
  divIndicator: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    backgroundColor: SIM4.trackBg,
  },
  divText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  // Lock button
  lockArea: {
    marginTop: 10,
    alignItems: 'center',
  },
  lockBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM4.btnPrimaryBorder,
  },
  lockBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },

  // Vault overlay
  vaultOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  vaultText: {
    fontSize: 24,
    fontWeight: '900',
    color: SIM4.textOnGradient,
    marginTop: 8,
    ...SHADOW_STRONG,
  },

  // Locked allocation row
  lockedAllocRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  lockedAllocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SIM4.cardBg,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  lockedAllocEmoji: {
    fontSize: 14,
  },
  lockedAllocPct: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Next event button
  nextEventBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM4.btnPrimaryBorder,
    marginTop: 8,
  },
  nextEventBtnText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Score screen
  heroValue: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: SIM4.cardBorder,
  },
  breakdownEmoji: {
    fontSize: 18,
    marginLeft: 8,
  },
  breakdownName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: SIM4.textPrimary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM4.textPrimary,
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    color: SIM4.textMuted,
  },

  // Rewards
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SIM4.cardBg,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },
});
