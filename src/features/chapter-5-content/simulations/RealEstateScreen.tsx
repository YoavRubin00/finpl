/**
 * SIM 26: משחקי הנדל"ן (Real Estate Game) — Module 5-26
 * Screen: choose mortgage, live through 20 years of events, see total cost.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
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
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { SIM5, GRADE_COLORS5, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE5, sim5Styles } from './simTheme';
import { useRealEstate } from './useRealEstate';
import type { YearSnapshot } from './useRealEstate';
import type { MortgageOption, RealEstateScore } from './realEstateTypes';
import { PROPERTY_PRICE, DOWN_PAYMENT, LOAN_AMOUNT, MORTGAGE_OPTIONS } from './realEstateData';
import { formatShekel } from '../../../utils/format';
import { useSimReward } from '../../../hooks/useSimReward';

const SIM_COMPLETE_XP = 35;
const SIM_COMPLETE_COINS = 40;

/* ── Lottie assets ── */
const LOTTIE_HOUSE = require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json');
const LOTTIE_BUILDING = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

// ── Sub-components ────────────────────────────────────────────────────

/** Risk indicator bar */
function RiskBar({ level }: { level: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: '#4ade80',
    medium: '#fbbf24',
    high: '#ef4444',
  };
  const labels = {
    low: 'סיכון נמוך',
    medium: 'סיכון בינוני',
    high: 'סיכון גבוה',
  };
  const fills = { low: 0.33, medium: 0.66, high: 1 };

  return (
    <View style={riskStyles.container}>
      <Text style={[riskStyles.label, { color: colors[level] }]}>{labels[level]}</Text>
      <View style={riskStyles.track}>
        <View style={[riskStyles.fill, { width: `${fills[level] * 100}%`, backgroundColor: colors[level] }]} />
      </View>
    </View>
  );
}

const riskStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    ...({ writingDirection: 'rtl', textAlign: 'right' } as Record<string, string>),
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: SIM5.trackBg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

/** Mortgage option card */
function MortgageCard({
  option,
  isSelected,
  onSelect,
}: {
  option: MortgageOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const riskLevel = option.id === 'fixed-safe' ? 'low' : option.id === 'balanced-mix' ? 'medium' : 'high';
  const lottieSource = option.id === 'fixed-safe' ? LOTTIE_SHIELD : option.id === 'balanced-mix' ? LOTTIE_BALANCE : LOTTIE_CHART;
  const totalCost = option.monthlyPayment * option.years * 12;

  return (
    <AnimatedPressable onPress={onSelect} accessibilityRole="button" accessibilityLabel={option.label}>
      <GlowCard
        glowColor={isSelected ? SIM5.glow : 'rgba(34,211,238,0.1)'}
        style={[
          { backgroundColor: SIM5.cardBg },
          isSelected && mortgageStyles.cardSelected,
        ]}
      >
        <View style={mortgageStyles.card}>
          <View style={mortgageStyles.headerRow}>
            <LottieIcon source={lottieSource} size={28} />
            <View style={mortgageStyles.headerText}>
              <Text style={[mortgageStyles.label, RTL]}>{option.label}</Text>
              <Text style={[mortgageStyles.desc, RTL]}>{option.description}</Text>
            </View>
          </View>

          <View style={mortgageStyles.statsRow}>
            <View style={mortgageStyles.stat}>
              <Text style={mortgageStyles.statLabel}>החזר חודשי</Text>
              <Text style={mortgageStyles.statValue}>{formatShekel(option.monthlyPayment)}</Text>
            </View>
            <View style={mortgageStyles.statDivider} />
            <View style={mortgageStyles.stat}>
              <Text style={mortgageStyles.statLabel}>עלות כוללת</Text>
              <Text style={[mortgageStyles.statValue, { color: '#f97316' }]}>{formatShekel(totalCost)}</Text>
            </View>
            <View style={mortgageStyles.statDivider} />
            <View style={mortgageStyles.stat}>
              <Text style={mortgageStyles.statLabel}>תקופה</Text>
              <Text style={mortgageStyles.statValue}>{option.years} שנה</Text>
            </View>
          </View>

          <RiskBar level={riskLevel} />
        </View>
      </GlowCard>
    </AnimatedPressable>
  );
}

const mortgageStyles = StyleSheet.create({
  card: {
    marginBottom: 0,
    padding: 16,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: SIM5.cardBorder,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    color: SIM5.textSecondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: SIM5.trackBg,
    borderRadius: 10,
    padding: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },
  statDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 4,
  },
});

/** Event card — newspaper headline style */
function EventCard({ snapshot }: { snapshot: YearSnapshot }) {
  if (!snapshot.event) return null;

  const isNegative = snapshot.event.effect === 'rate-hike' && snapshot.event.impact > 0
    || snapshot.event.effect === 'expense';
  const isPositive = snapshot.event.effect === 'property-value' && snapshot.event.impact > 0
    || (snapshot.event.effect === 'rate-hike' && snapshot.event.impact < 0);

  const borderColor = isNegative ? '#ef4444' : isPositive ? '#4ade80' : '#a78bfa';

  return (
    <Animated.View entering={FadeInDown.springify().damping(12)}>
      <View style={[eventStyles.card, { borderLeftColor: borderColor }]}>
        <View style={eventStyles.yearBadge}>
          <Text style={eventStyles.yearText}>שנה {snapshot.year}</Text>
        </View>
        <Text style={eventStyles.emoji}>{snapshot.event.emoji}</Text>
        <Text style={[eventStyles.description, RTL]}>{snapshot.event.description}</Text>
        <View style={eventStyles.impactRow}>
          <Text style={[eventStyles.impact, { color: borderColor }]}>
            {snapshot.event.effect === 'rate-hike'
              ? `ריבית: ${snapshot.event.impact > 0 ? '+' : ''}${(snapshot.event.impact * 100).toFixed(1)}%`
              : snapshot.event.effect === 'expense'
                ? `הוצאה: ${formatShekel(snapshot.event.impact)}`
                : snapshot.event.effect === 'property-value' && snapshot.event.impact > 0
                  ? `ערך נכס: +${Math.round(snapshot.event.impact * 100)}%`
                  : '📋 סיכום'}
          </Text>
          <Text style={eventStyles.monthly}>
            החזר: {formatShekel(snapshot.monthlyPayment)}/חודש
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const eventStyles = StyleSheet.create({
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
  yearText: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM5.textMuted,
  },
  emoji: {
    fontSize: 28,
    alignSelf: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  impactRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impact: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthly: {
    fontSize: 13,
    color: SIM5.textMuted,
  },
});

// ── Score Screen ──────────────────────────────────────────────────────

function ScoreScreen({
  score,
  selectedOption,
  onReplay,
  onContinue,
}: {
  score: RealEstateScore;
  selectedOption: MortgageOption;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const gradeColor = GRADE_COLORS5[score.grade];
  const interestPct = score.totalPaid > 0 ? Math.round((score.totalInterest / score.totalPaid) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
        <LottieIcon source={LOTTIE_HOUSE} size={56} />
        <Text style={styles.heroTitle}>המסע הסתיים!</Text>
      </Animated.View>

      {/* Grade */}
      <Animated.View entering={FadeInDown.duration(600).delay(100)} style={sim5Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim5Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <Text style={sim5Styles.gradeLabel}>דירוג ניהול המשכנתא</Text>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[TYPE5.cardTitle, RTL]}>סיכום 20 שנות משכנתא</Text>
            <Text style={[TYPE5.cardBody, RTL]}>
              המשכנתא של {formatShekel(LOAN_AMOUNT)} עלתה לך {formatShekel(score.totalPaid)} בסה&quot;כ — מתוכם {formatShekel(score.totalInterest)} ריבית בלבד ({interestPct}%)!
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats breakdown */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[TYPE5.cardTitle, RTL]}>פירוט מספרים</Text>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_MONEY} size={22} />
                <Text style={sim5Styles.scoreRowLabel}>מחיר הדירה</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.textPrimary }]}>{formatShekel(PROPERTY_PRICE)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_BUILDING} size={22} />
                <Text style={sim5Styles.scoreRowLabel}>סכום משכנתא</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.textPrimary }]}>{formatShekel(LOAN_AMOUNT)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <Text style={sim5Styles.scoreRowLabel}>💸 סה&quot;כ שולם</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: '#f97316' }]}>{formatShekel(score.totalPaid)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_GROWTH} size={22} />
                <Text style={sim5Styles.scoreRowLabel}>ריבית ששולמה</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: '#ef4444' }]}>{formatShekel(score.totalInterest)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <Text style={sim5Styles.scoreRowLabel}>🏗️ ערך הנכס היום</Text>
              <Text style={[sim5Styles.scoreRowValue, { color: '#4ade80' }]}>{formatShekel(score.propertyFinalValue)}</Text>
            </View>
            <View style={sim5Styles.scoreDivider}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_CHART} size={22} />
                <Text style={sim5Styles.scoreTotalLabel}>רווח/הפסד נטו</Text>
              </View>
              <Text
                style={[
                  sim5Styles.scoreTotalValue,
                  { color: score.netGainOrLoss >= 0 ? '#4ade80' : '#ef4444' },
                ]}
              >
                {score.netGainOrLoss >= 0 ? '+' : ''}{formatShekel(score.netGainOrLoss)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Interest pie visual */}
      <Animated.View entering={FadeInDown.duration(600).delay(350)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[TYPE5.cardTitle, RTL]}>חלוקת התשלומים</Text>
            <View style={styles.pieRow}>
              <View style={styles.pieItem}>
                <View style={[styles.pieDot, { backgroundColor: '#a78bfa' }]} />
                <Text style={styles.pieLabel}>קרן</Text>
                <Text style={[styles.pieValue, { color: '#a78bfa' }]}>{formatShekel(LOAN_AMOUNT)}</Text>
              </View>
              <View style={styles.pieItem}>
                <View style={[styles.pieDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.pieLabel}>ריבית</Text>
                <Text style={[styles.pieValue, { color: '#ef4444' }]}>{formatShekel(score.totalInterest)}</Text>
              </View>
              <View style={styles.pieItem}>
                <View style={[styles.pieDot, { backgroundColor: '#fbbf24' }]} />
                <Text style={styles.pieLabel}>הוצאות</Text>
                <Text style={[styles.pieValue, { color: '#fbbf24' }]}>
                  {formatShekel(score.totalPaid - LOAN_AMOUNT - score.totalInterest)}
                </Text>
              </View>
            </View>
            {/* Visual bar */}
            <View style={styles.pieBar}>
              <View style={[styles.pieBarSegment, {
                flex: LOAN_AMOUNT,
                backgroundColor: '#a78bfa',
              }]} />
              <View style={[styles.pieBarSegment, {
                flex: Math.max(0, score.totalInterest),
                backgroundColor: '#ef4444',
              }]} />
              <View style={[styles.pieBarSegment, {
                flex: Math.max(0, score.totalPaid - LOAN_AMOUNT - score.totalInterest),
                backgroundColor: '#fbbf24',
              }]} />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <View style={sim5Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim5Styles.insightText, RTL]}>
                דירה ב-1.5M + משכנתא = {formatShekel(score.totalPaid + DOWN_PAYMENT)}. חלק קבוע = שינה שקטה. חלק משתנה = הימור.
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

// ── Main Screen ───────────────────────────────────────────────────────

interface RealEstateScreenProps {
  onComplete?: () => void;
}

export function RealEstateScreen({ onComplete }: RealEstateScreenProps) {
  const {
    state,
    config,
    isPlaying,
    yearSnapshots,
    currentVariableRate,
    totalExtraExpenses,
    score,
    selectMortgage,
    startPlay,
    stopPlay,
    reset,
  } = useRealEstate();

  const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json'),
    require('../../../../assets/lottie/wired-flat-3302-house-sold-hover-pinch.json'),
  ];

  const rewardsGranted = useRef(false);
  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);
  const [phase, setPhase] = useState<'select' | 'sim'>('select');

  // Hero monthly payment animation
  const heroScale = useSharedValue(1);
  const prevMonthly = useRef(state.monthlyPayment);

  // Animate hero number on monthly payment change
  useEffect(() => {
    if (state.monthlyPayment !== prevMonthly.current && state.monthlyPayment > 0) {
      heroScale.value = withSequence(
        withSpring(1.15, SPRING_SNAPPY),
        withSpring(1, SPRING_SNAPPY),
      );
      prevMonthly.current = state.monthlyPayment;
    }
  }, [state.monthlyPayment, heroScale]);

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

  const handleSelectMortgage = useCallback(
    (option: MortgageOption) => {
      tapHaptic();
      selectMortgage(option);
    },
    [selectMortgage],
  );

  const handleStartGame = useCallback(() => {
    if (!state.selectedMortgage) return;
    heavyHaptic();
    setPhase('sim');
    startPlay();
  }, [state.selectedMortgage, startPlay]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    setPhase('select');
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Score screen ──────────────────────────────────────────────────
  if (state.isComplete && score && state.selectedMortgage) {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
        <ScoreScreen
          score={score}
          selectedOption={state.selectedMortgage}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Phase 1: Mortgage selection ───────────────────────────────────
  if (phase === 'select') {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_HOUSE} size={28} />
              <Text accessibilityRole="header" style={[styles.title, RTL]}>משחקי הנדל&quot;ן</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              בחר משכנתא ותחיה 20 שנה עם ההחלטה שלך
            </Text>
          </Animated.View>

          {/* Property info */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={sim5Styles.scoreCard}>
              <View style={styles.propertyCard}>
                <LottieIcon source={LOTTIE_BUILDING} size={40} />
                <Text style={[styles.propertyTitle, RTL]}>הדירה שלך</Text>
                <View style={styles.propertyRow}>
                  <View style={styles.propertyStat}>
                    <Text style={styles.propertyLabel}>מחיר</Text>
                    <Text style={styles.propertyValue}>{formatShekel(PROPERTY_PRICE)}</Text>
                  </View>
                  <View style={styles.propertyDivider} />
                  <View style={styles.propertyStat}>
                    <Text style={styles.propertyLabel}>הון עצמי</Text>
                    <Text style={[styles.propertyValue, { color: '#4ade80' }]}>{formatShekel(DOWN_PAYMENT)}</Text>
                  </View>
                  <View style={styles.propertyDivider} />
                  <View style={styles.propertyStat}>
                    <Text style={styles.propertyLabel}>משכנתא</Text>
                    <Text style={[styles.propertyValue, { color: '#f97316' }]}>{formatShekel(LOAN_AMOUNT)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Mortgage options */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={[styles.sectionTitle, RTL]}>בחר מסלול משכנתא</Text>
          </Animated.View>

          {config.mortgageOptions.map((option, i) => (
            <Animated.View key={option.id} entering={FadeInDown.duration(500).delay(300 + i * 100)}>
              <View style={{ marginBottom: 12 }}>
                <MortgageCard
                  option={option}
                  isSelected={state.selectedMortgage?.id === option.id}
                  onSelect={() => handleSelectMortgage(option)}
                />
              </View>
            </Animated.View>
          ))}

          {/* Start button */}
          {state.selectedMortgage && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.completeArea}>
              <AnimatedPressable onPress={handleStartGame} style={styles.completeBtn} accessibilityRole="button" accessibilityLabel="התחל משחק">
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                  <Text style={styles.completeBtnText}>התחל משחק</Text>
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
  const paymentChange = state.selectedMortgage
    ? state.monthlyPayment - state.selectedMortgage.monthlyPayment
    : 0;
  const paymentChangeColor = paymentChange > 0 ? '#ef4444' : paymentChange < 0 ? '#4ade80' : SIM5.textPrimary;

  return (
    <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={SIM5.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_HOUSE} size={28} />
            <Text accessibilityRole="header" style={[styles.title, RTL]}>משחקי הנדל&quot;ן</Text>
          </View>
          <Text style={[styles.subtitle, RTL]}>
            {state.selectedMortgage?.label}
          </Text>
        </Animated.View>

        {/* Year counter hero */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.heroSection}>
          <Text style={styles.heroLabel}>🗓️ שנה</Text>
          <Animated.View style={heroAnimStyle}>
            <Text style={[styles.heroNumber, { color: '#a78bfa' }]}>
              {state.currentYear}
            </Text>
          </Animated.View>
          <Text style={styles.heroLabel}>מתוך 20</Text>

          {/* Progress bar — RTL */}
          <View style={[simStyles.progressTrack, { transform: [{ scaleX: -1 }] }]}>
            <LinearGradient
              colors={['#a78bfa', SIM5.btnPrimary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[simStyles.progressFill, { width: `${(state.currentYear / 20) * 100}%` }]}
            />
          </View>
        </Animated.View>

        {/* Running totals */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={simStyles.totalsGrid}>
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>החזר חודשי</Text>
              <Text style={[simStyles.totalValue, { color: paymentChangeColor }]}>
                {formatShekel(state.monthlyPayment)}
              </Text>
              {paymentChange !== 0 && (
                <Text style={[simStyles.totalDelta, { color: paymentChangeColor }]}>
                  {paymentChange > 0 ? '↑' : '↓'} {formatShekel(Math.abs(paymentChange))}
                </Text>
              )}
            </View>
            <View style={simStyles.totalDivider} />
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>סה&quot;כ שולם</Text>
              <Text style={[simStyles.totalValue, { color: '#f97316' }]}>
                {formatShekel(state.totalPaid)}
              </Text>
            </View>
            <View style={simStyles.totalDivider} />
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>ערך הנכס</Text>
              <Text style={[simStyles.totalValue, { color: '#4ade80' }]}>
                {formatShekel(state.propertyValue)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Remaining loan & interest counter */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <View style={simStyles.loanRow}>
            <View style={simStyles.loanItem}>
              <Text style={simStyles.loanLabel}>💳 יתרת משכנתא</Text>
              <Text style={simStyles.loanValue}>{formatShekel(state.remainingLoan)}</Text>
            </View>
            <View style={simStyles.loanItem}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={simStyles.loanLabel}>ריבית ששולמה</Text>
              </View>
              <Text style={[simStyles.loanValue, { color: '#ef4444' }]}>
                {formatShekel(Math.max(0, state.totalPaid - (LOAN_AMOUNT - state.remainingLoan) - totalExtraExpenses))}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Variable rate indicator */}
        {state.selectedMortgage && state.selectedMortgage.variablePercent > 0 && (
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={simStyles.rateIndicator}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={simStyles.rateLabel}>ריבית משתנה נוכחית</Text>
              </View>
              <Text style={[simStyles.rateValue, {
                color: currentVariableRate > 0.04 ? '#ef4444' : '#4ade80',
              }]}>
                {(currentVariableRate * 100).toFixed(1)}%
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Events timeline */}
        {yearSnapshots.length > 0 && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={[styles.sectionTitle, RTL]}>📰 אירועים</Text>
            {yearSnapshots
              .filter((s) => s.event !== null)
              .map((snapshot) => (
                <EventCard key={snapshot.year} snapshot={snapshot} />
              ))}
          </Animated.View>
        )}

        {/* Waiting indicator */}
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
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  totalsGrid: {
    flexDirection: 'row-reverse',
    backgroundColor: SIM5.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: SIM5.textPrimary,
  },
  totalDelta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  totalDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 4,
  },
  loanRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 12,
  },
  loanItem: {
    flex: 1,
    backgroundColor: SIM5.cardBg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  loanLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 6,
  },
  loanValue: {
    fontSize: 16,
    fontWeight: '900',
    color: SIM5.textPrimary,
  },
  rateIndicator: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SIM5.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  waitingArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingText: {
    fontSize: 14,
    color: SIM5.textMuted,
  },
});

// ── Main styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    color: SIM5.textOnGradient,
    marginBottom: 6,
    ...SHADOW_STRONG,
  },
  subtitle: {
    fontSize: 15,
    color: SIM5.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },

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
  heroLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: SIM5.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 80,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fbbf24',
  },

  // Property card
  propertyCard: {
    padding: 16,
    alignItems: 'center',
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  propertyRow: {
    flexDirection: 'row-reverse',
    width: '100%',
  },
  propertyStat: {
    flex: 1,
    alignItems: 'center',
  },
  propertyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  propertyValue: {
    fontSize: 16,
    fontWeight: '900',
    color: SIM5.textPrimary,
  },
  propertyDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 8,
  },

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
  completeArea: {
    marginTop: 8,
    alignItems: 'center',
  },
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
  completeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  // Score screen — pie chart section (kept local, not in sim5Styles)
  pieRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  pieItem: {
    alignItems: 'center',
    gap: 4,
  },
  pieDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pieLabel: {
    fontSize: 13,
    color: SIM5.textMuted,
  },
  pieValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  pieBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  pieBarSegment: {
    height: '100%',
  },
});
