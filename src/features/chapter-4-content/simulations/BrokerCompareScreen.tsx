/**
 * SIM 4-26: השוואת ברוקרים (Broker Compare) — Module 4-26
 * Interactive broker comparison: adjust profile sliders, compare 3 platforms, choose the cheapest.
 */

import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useBrokerCompare } from './useBrokerCompare';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim4Styles, GRADE_COLORS4 } from './simTheme';
import type { Broker, UserProfile, BrokerCompareScore } from './brokerCompareTypes';
import { formatShekel } from '../../../utils/format';


/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

interface FeeBreakdown {
  tradeFeeAnnual: number;
  custodyFeeAnnual: number;
  fxFeeAnnual: number;
  total: number;
}

function computeFeeBreakdown(broker: Broker, profile: UserProfile): FeeBreakdown {
  const avgTradeSize = profile.investmentAmount / Math.max(profile.tradesPerMonth, 1);
  const feePerTrade = Math.max(avgTradeSize * broker.tradeFeePercent, broker.tradeFeeMin);
  const tradeFeeAnnual = feePerTrade * profile.tradesPerMonth * 12;
  const custodyFeeAnnual = profile.investmentAmount * broker.custodyFeePercent;
  const fxFeeAnnual = profile.isInternational
    ? profile.investmentAmount * broker.fxFeePercent
    : 0;
  return {
    tradeFeeAnnual: Math.round(tradeFeeAnnual),
    custodyFeeAnnual: Math.round(custodyFeeAnnual),
    fxFeeAnnual: Math.round(fxFeeAnnual),
    total: Math.round(tradeFeeAnnual + custodyFeeAnnual + fxFeeAnnual + broker.inactivityFee),
  };
}

/* ================================================================== */
/*  CostBarChart — horizontal bars comparing yearly costs               */
/* ================================================================== */

function CostBarChart({
  brokers,
  costs,
  cheapestId,
}: {
  brokers: Broker[];
  costs: Record<string, number>;
  cheapestId: string;
}) {
  const maxCost = Math.max(...Object.values(costs), 1);

  return (
    <View style={barStyles.container}>
      {brokers.map((broker) => {
        const cost = costs[broker.id] ?? 0;
        const widthPercent = maxCost > 0 ? (cost / maxCost) * 100 : 0;
        const isCheapest = broker.id === cheapestId;

        return (
          <View key={broker.id} style={barStyles.row}>
            <View style={barStyles.labelRow}>
              <Text style={barStyles.emoji}>{broker.emoji}</Text>
              <Text style={[barStyles.name, RTL]}>{broker.name}</Text>
            </View>
            <View style={barStyles.barTrack}>
              <View
                style={[
                  barStyles.barFill,
                  {
                    width: `${Math.max(widthPercent, 3)}%` as `${number}%`,
                    backgroundColor: isCheapest ? SIM4.success : SIM4.primary,
                  },
                  isCheapest && barStyles.barGlow,
                ]}
              />
            </View>
            <Text
              style={[
                barStyles.costText,
                isCheapest && { color: SIM4.success, fontWeight: '900' as const },
              ]}
            >
              {formatShekel(cost)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  BrokerCard — single broker with fee breakdown + select button       */
/* ================================================================== */

function BrokerCard({
  broker,
  profile,
  isCheapest,
  onSelect,
}: {
  broker: Broker;
  profile: UserProfile;
  isCheapest: boolean;
  onSelect: () => void;
}) {
  const breakdown = computeFeeBreakdown(broker, profile);

  return (
    <GlowCard
      glowColor={isCheapest ? 'rgba(22,163,74,0.25)' : 'rgba(129,140,248,0.1)'}
      style={{ backgroundColor: SIM4.cardBg }}
    >
      <View style={brokerStyles.inner}>
        {/* Header */}
        <View style={brokerStyles.header}>
          <View style={brokerStyles.headerLeft}>
            <Text style={brokerStyles.emoji}>{broker.emoji}</Text>
            <Text style={[brokerStyles.name, RTL]}>{broker.name}</Text>
          </View>
          {isCheapest && (
            <View style={brokerStyles.cheapBadge}>
              <Text style={brokerStyles.cheapBadgeText}>הזול ביותר</Text>
            </View>
          )}
        </View>

        {/* Fee rows */}
        <View style={brokerStyles.feeSection}>
          <View style={brokerStyles.feeRow}>
            <Text style={[brokerStyles.feeLabel, RTL]}>עמלות מסחר (שנתי)</Text>
            <Text style={brokerStyles.feeValue}>{formatShekel(breakdown.tradeFeeAnnual)}</Text>
          </View>
          <View style={brokerStyles.feeRow}>
            <Text style={[brokerStyles.feeLabel, RTL]}>דמי משמרת</Text>
            <Text style={brokerStyles.feeValue}>{formatShekel(breakdown.custodyFeeAnnual)}</Text>
          </View>
          {profile.isInternational && (
            <View style={brokerStyles.feeRow}>
              <Text style={[brokerStyles.feeLabel, RTL]}>עמלת המרה</Text>
              <Text style={brokerStyles.feeValue}>{formatShekel(breakdown.fxFeeAnnual)}</Text>
            </View>
          )}
        </View>

        {/* Total + select */}
        <View style={brokerStyles.footer}>
          <View>
            <Text style={[brokerStyles.totalLabel, RTL]}>עלות שנתית</Text>
            <Text style={[brokerStyles.totalValue, isCheapest && { color: SIM4.success }]}>
              {formatShekel(breakdown.total)}
            </Text>
          </View>
          <AnimatedPressable
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityLabel={`בחר ברוקר ${broker.name}`}
            style={[brokerStyles.selectBtn, isCheapest && brokerStyles.selectBtnCheapest]}
          >
            <Text style={[brokerStyles.selectBtnText, isCheapest && { color: '#ffffff' }]}>
              בחר ברוקר
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </GlowCard>
  );
}

/* ================================================================== */
/*  ScoreScreen — results after choosing                                */
/* ================================================================== */

function ScoreScreen({
  score,
  selectedBrokerName,
  selectedBrokerEmoji,
  onReplay,
  onContinue,
}: {
  score: BrokerCompareScore;
  selectedBrokerName: string;
  selectedBrokerEmoji: string;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
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

      {/* Selection summary */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreScreenStyles.summaryText, RTL]}>
              {selectedBrokerEmoji} בחרת את {selectedBrokerName}
            </Text>
            {score.yearlyDifference > 0 ? (
              <Text style={[scoreScreenStyles.differenceText, RTL, { color: SIM4.danger }]}>
                משלם {formatShekel(score.yearlyDifference)} יותר בשנה לעומת {score.cheapestBroker}
              </Text>
            ) : (
              <Text style={[scoreScreenStyles.differenceText, RTL, { color: SIM4.success }]}>
                בחרת את הברוקר הזול ביותר!
              </Text>
            )}
          </View>
        </View>
      </Animated.View>

      {/* 10-year projection */}
      {score.totalSavings10Y > 0 && (
        <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
          <View style={sim4Styles.scoreCard}>
            <View style={sim4Styles.scoreCardInner}>
              <View style={sim4Styles.scoreRow}>
                <View style={sim4Styles.scoreRowLeft}>
                  <LottieIcon source={LOTTIE_GROWTH} size={18} />
                  <Text style={[sim4Styles.scoreRowLabel, RTL]}>עלות עודפת ב-10 שנים</Text>
                </View>
                <Text style={[sim4Styles.scoreRowValue, { color: SIM4.danger }]}>
                  {formatShekel(score.totalSavings10Y)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Lesson */}
      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[scoreScreenStyles.lessonText, RTL, { flex: 1 }]}>
                השוואת עמלות לפני בחירת ברוקר יכולה לחסוך אלפי שקלים בשנה. פלטפורמות מסחר עצמאי בדרך כלל זולות מהבנק.
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

interface BrokerCompareScreenProps {
  onComplete?: (score: number) => void;
}

export function BrokerCompareScreen({ onComplete }: BrokerCompareScreenProps) {
  const {
    state,
    config,
    cheapestId,
    score,
    updateProfile,
    selectBroker,
    reset,
  } = useBrokerCompare();


  const rewardsGranted = useRef(false);
  const prevComplete = useRef(false);

  // Grant rewards on completion (render-phase pattern)
  if (state.isComplete && !prevComplete.current) {
    prevComplete.current = true;
    if (!rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }

  const handleInvestmentChange = useCallback(
    (v: number) => updateProfile({ investmentAmount: Math.round(v / 10_000) * 10_000 }),
    [updateProfile],
  );

  const handleTradesChange = useCallback(
    (v: number) => updateProfile({ tradesPerMonth: Math.round(v) }),
    [updateProfile],
  );

  const handleInternationalToggle = useCallback(
    (v: boolean) => updateProfile({ isInternational: v }),
    [updateProfile],
  );

  const handleSelectBroker = useCallback(
    (brokerId: string) => {
      heavyHaptic();
      selectBroker(brokerId);
    },
    [selectBroker],
  );

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

  const selectedBroker = config.brokers.find((b) => b.id === state.selectedBroker);

  // ── Score Phase ─────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScoreScreen
          score={score}
          selectedBrokerName={selectedBroker?.name ?? ''}
          selectedBrokerEmoji={selectedBroker?.emoji ?? ''}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Interactive Phase ───────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={28} /></View>
            <Text accessibilityRole="header" style={styles.title}>השוואת ברוקרים</Text>
          </View>
          <Text style={[styles.subtitle, RTL]}>
            התאם את הפרופיל שלך ובחר את הברוקר הזול ביותר
          </Text>
        </Animated.View>

        {/* Profile Sliders */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <GlowCard glowColor="rgba(129,140,248,0.15)" style={{ backgroundColor: SIM4.cardBg, marginTop: 16 }}>
            <View style={sliderStyles.container}>
              {/* Investment Amount */}
              <View style={sliderStyles.sliderGroup}>
                <View style={sliderStyles.labelRow}>
                  <Text style={[sliderStyles.label, RTL]}>סכום השקעה</Text>
                  <Text style={sliderStyles.value}>{formatShekel(state.profile.investmentAmount)}</Text>
                </View>
                <Slider
                  value={state.profile.investmentAmount}
                  onValueChange={handleInvestmentChange}
                  minimumValue={10_000}
                  maximumValue={1_000_000}
                  step={10_000}
                  minimumTrackTintColor={SIM4.primary}
                  maximumTrackTintColor={SIM4.cardBorder}
                  thumbTintColor={SIM4.dark}
                  style={sliderStyles.slider}
                  accessibilityRole="adjustable"
                  accessibilityLabel="סכום השקעה"
                  accessibilityValue={{ min: 10000, max: 1000000, now: state.profile.investmentAmount, text: formatShekel(state.profile.investmentAmount) }}
                />
                <View style={sliderStyles.rangeRow}>
                  <Text style={sliderStyles.rangeText}>₪10K</Text>
                  <Text style={sliderStyles.rangeText}>₪1M</Text>
                </View>
              </View>

              {/* Trades per Month */}
              <View style={sliderStyles.sliderGroup}>
                <View style={sliderStyles.labelRow}>
                  <Text style={[sliderStyles.label, RTL]}>עסקאות בחודש</Text>
                  <Text style={sliderStyles.value}>{state.profile.tradesPerMonth}</Text>
                </View>
                <Slider
                  value={state.profile.tradesPerMonth}
                  onValueChange={handleTradesChange}
                  minimumValue={1}
                  maximumValue={20}
                  step={1}
                  minimumTrackTintColor={SIM4.primary}
                  maximumTrackTintColor={SIM4.cardBorder}
                  thumbTintColor={SIM4.dark}
                  style={sliderStyles.slider}
                  accessibilityRole="adjustable"
                  accessibilityLabel="עסקאות בחודש"
                  accessibilityValue={{ min: 1, max: 20, now: state.profile.tradesPerMonth, text: `${state.profile.tradesPerMonth} עסקאות` }}
                />
                <View style={sliderStyles.rangeRow}>
                  <Text style={sliderStyles.rangeText}>1</Text>
                  <Text style={sliderStyles.rangeText}>20</Text>
                </View>
              </View>

              {/* Israel/International Toggle */}
              <View style={sliderStyles.toggleRow}>
                <Text style={[sliderStyles.label, RTL]}>השקעה בינלאומית</Text>
                <Switch
                  value={state.profile.isInternational}
                  onValueChange={handleInternationalToggle}
                  trackColor={{ false: SIM4.cardBorder, true: SIM4.primary }}
                  thumbColor={state.profile.isInternational ? SIM4.dark : '#f4f3f4'}
                  accessibilityRole="switch"
                  accessibilityLabel="השקעה בינלאומית"
                />
              </View>
            </View>
          </GlowCard>
        </Animated.View>

        {/* Cost Bar Chart */}
        <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 16 }}>
          <GlowCard glowColor="rgba(22,163,74,0.15)" style={{ backgroundColor: SIM4.cardBg }}>
            <View style={{ padding: 16 }}>
              <Text style={[styles.sectionTitle, RTL]}>השוואת עלויות שנתיות</Text>
              <CostBarChart
                brokers={config.brokers}
                costs={state.yearlyCosts}
                cheapestId={cheapestId}
              />
            </View>
          </GlowCard>
        </Animated.View>

        {/* Broker Cards */}
        <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 16, gap: 12 }}>
          {config.brokers.map((broker) => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              profile={state.profile}
              isCheapest={broker.id === cheapestId}
              onSelect={() => handleSelectBroker(broker.id)}
            />
          ))}
        </Animated.View>
      </ScrollView>
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
  sectionTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
});

const sliderStyles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20,
  },
  sliderGroup: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: SIM4.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  value: {
    color: SIM4.dark,
    fontSize: 17,
    fontWeight: '900',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
});

const barStyles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    color: SIM4.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 24,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
  },
  barGlow: {
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  costText: {
    color: SIM4.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});

const brokerStyles = StyleSheet.create({
  inner: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    color: SIM4.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  cheapBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cheapBadgeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '800',
  },
  feeSection: {
    gap: 6,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  feeLabel: {
    color: SIM4.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  feeValue: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    color: SIM4.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  totalValue: {
    color: SIM4.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  selectBtn: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
    backgroundColor: '#ffffff',
  },
  selectBtnCheapest: {
    backgroundColor: SIM4.success,
    borderColor: '#15803d',
  },
  selectBtnText: {
    color: SIM4.dark,
    fontSize: 15,
    fontWeight: '800',
  },
});

const scoreScreenStyles = StyleSheet.create({
  summaryText: {
    color: SIM4.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  differenceText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  lessonText: {
    color: SIM4.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
});
