/**
 * SIM 28: מחשבון הפרישה (Retirement Calculator) — Module 5-28
 * Screen: choose withdrawal strategy, watch 25-year simulation (age 67→92),
 * track balance depletion, tax, bankruptcy risk, and inheritance potential.
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
import { useRetirementCalc } from './useRetirementCalc';
import type { RetirementYearSnapshot } from './useRetirementCalc';
import type { WithdrawalStrategy, RetirementCalcScore } from './retirementCalcTypes';
import {
  PENSION_BALANCE,
  RETIREMENT_AGE,
  SIMULATION_YEARS,
  MONTHLY_EXPENSES,
  INFLATION_RATE,
} from './retirementCalcData';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { SIM5, GRADE_COLORS5, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE5, sim5Styles } from './simTheme';
import { getChapterTheme } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { useSimReward } from '../../../hooks/useSimReward';

/* ── Chapter-5 gradient (for SimLottieBackground) ── */
const _th5 = getChapterTheme('chapter-5');

/* ── Lottie assets ── */
const LOTTIE_BEACH = require('../../../../assets/lottie/wired-flat-804-sun-hover-rays.json');
const LOTTIE_MONEY_BAG = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_BANK = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_HOUSE = require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_CAKE = require('../../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json');
const LOTTIE_COIN = require('../../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const SIM_COMPLETE_XP = 35;
const SIM_COMPLETE_COINS = 40;

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
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    ...RTL,
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

/** Strategy selection card */
function StrategyCard({
  strategy,
  isSelected,
  onSelect,
}: {
  strategy: WithdrawalStrategy;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const lottieSource = strategy.type === 'lump-sum' ? LOTTIE_MONEY_BAG : strategy.type === 'monthly-annuity' ? LOTTIE_SHIELD : LOTTIE_BALANCE;

  return (
    <AnimatedPressable onPress={onSelect} accessibilityRole="button" accessibilityLabel={strategy.label}>
      <GlowCard
        glowColor={isSelected ? SIM5.glow : 'rgba(8,145,178,0.12)'}
        style={[strategyStyles.card, isSelected && strategyStyles.cardSelected, { backgroundColor: SIM5.cardBg }]}
      >
        <View style={strategyStyles.headerRow}>
          <LottieIcon source={lottieSource} size={36} />
          <View style={strategyStyles.headerText}>
            <Text style={[strategyStyles.label, RTL]}>{strategy.label}</Text>
            <Text style={[strategyStyles.desc, RTL]}>{strategy.description}</Text>
          </View>
        </View>

        <View style={strategyStyles.statsRow}>
          <View style={strategyStyles.stat}>
            <Text style={strategyStyles.statLabel}>הכנסה חודשית</Text>
            <Text style={strategyStyles.statValue}>
              {strategy.type === 'lump-sum'
                ? 'לפי משיכה'
                : formatShekel(strategy.monthlyAmount ?? 0)}
            </Text>
          </View>
          <View style={strategyStyles.statDivider} />
          <View style={strategyStyles.stat}>
            <Text style={strategyStyles.statLabel}>ירושה</Text>
            <Text style={[strategyStyles.statValue, { color: strategy.hasInheritance ? '#4ade80' : '#ef4444' }]}>
              {strategy.hasInheritance ? 'כן ✓' : 'לא ✗'}
            </Text>
          </View>
          <View style={strategyStyles.statDivider} />
          <View style={strategyStyles.stat}>
            <Text style={strategyStyles.statLabel}>סוג</Text>
            <Text style={strategyStyles.statValue}>
              {strategy.type === 'lump-sum' ? 'הונית' : strategy.type === 'monthly-annuity' ? 'חודשית' : 'משולב'}
            </Text>
          </View>
        </View>

        <RiskBar level={strategy.riskLevel} />
      </GlowCard>
    </AnimatedPressable>
  );
}

const strategyStyles = StyleSheet.create({
  card: {
    marginBottom: 12,
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
  },
  lottieWrap: {
    marginLeft: 12,
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
    fontSize: 13,
    color: SIM5.textMuted,
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
    fontSize: 11,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },
  statDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 4,
  },
});

/** Balance bar — depleting or steady */
function BalanceBar({
  balance,
  maxBalance,
  isBankrupt,
  strategyType,
}: {
  balance: number;
  maxBalance: number;
  isBankrupt: boolean;
  strategyType: string;
}) {
  // Annuity has no investable balance — show "guaranteed" badge
  if (strategyType === 'monthly-annuity') {
    return (
      <View style={balanceBarStyles.container}>
        <View style={balanceBarStyles.guaranteedBadge}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <LottieIcon source={LOTTIE_SHIELD} size={22} />
            <Text style={balanceBarStyles.guaranteedText}>מובטח לכל החיים</Text>
          </View>
        </View>
      </View>
    );
  }

  const fillPct = maxBalance > 0 ? Math.max(0, Math.min(100, (balance / maxBalance) * 100)) : 0;
  const barColor = isBankrupt ? '#ef4444' : fillPct < 25 ? '#f97316' : '#4ade80';

  return (
    <View style={balanceBarStyles.container}>
      <View style={balanceBarStyles.labelRow}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <LottieIcon source={LOTTIE_COIN} size={16} />
            <Text style={balanceBarStyles.label}>יתרת קופה</Text>
          </View>
        <Text style={[balanceBarStyles.value, { color: barColor }]}>
          {formatShekel(balance)}
        </Text>
      </View>
      <View style={balanceBarStyles.track}>
        <LinearGradient
          colors={isBankrupt ? ['#ef4444', '#dc2626'] : ['#4ade80', '#22c55e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[balanceBarStyles.fill, { width: `${fillPct}%` }]}
        />
      </View>
      {isBankrupt && (
        <Animated.View entering={FadeIn.duration(300)}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <LottieIcon source={LOTTIE_DECREASE} size={22} />
            <Text style={balanceBarStyles.bankruptText}>נגמר הכסף!</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const balanceBarStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '900',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: SIM5.trackBg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  guaranteedBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  guaranteedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80',
  },
  bankruptText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
});

// ── Score Screen ──────────────────────────────────────────────────────

function ScoreScreen({
  score,
  selectedStrategy,
  allStrategiesComparison,
  onReplay,
  onContinue,
}: {
  score: RetirementCalcScore;
  selectedStrategy: WithdrawalStrategy;
  allStrategiesComparison: {
    strategy: WithdrawalStrategy;
    totalReceived: number;
    totalTax: number;
    bankruptAge: number | null;
    inheritancePotential: number;
  }[];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const gradeColor = GRADE_COLORS5[score.grade];
  const inflationExpenses = Math.round(MONTHLY_EXPENSES * Math.pow(1 + INFLATION_RATE, SIMULATION_YEARS));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(600)} style={[styles.heroSection, { backgroundColor: SIM5.trackBg }]}>
        <LottieIcon source={LOTTIE_TROPHY} size={64} />
        <Text style={styles.heroTitle}>סיום הפרישה!</Text>
      </Animated.View>

      {/* Grade */}
      <Animated.View entering={FadeInDown.duration(600).delay(100)} style={sim5Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim5Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <Text style={sim5Styles.gradeLabel}>דירוג אסטרטגיית פרישה</Text>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <GlowCard glowColor={SIM5.glow} style={[styles.summaryCard, { backgroundColor: SIM5.cardBg }]}>
          <Text style={[styles.summaryTitle, RTL]}>סיכום 25 שנות פרישה</Text>
          <Text style={[styles.summaryText, RTL]}>
            עם אסטרטגיית &quot;{selectedStrategy.label.split('—')[0].trim()}&quot; קיבלת סה&quot;כ{' '}
            {formatShekel(score.totalReceived)} לאורך 25 שנה.
            {score.depletionRisk
              ? ` ⚠️ הכסף נגמר בגיל ${score.bankruptAge}!`
              : score.inheritancePotential > 0
                ? ` 🏦 נשאר ${formatShekel(score.inheritancePotential)} לירושה.`
                : ' 🛡️ הכנסה מובטחת לכל החיים.'}
          </Text>
        </GlowCard>
      </Animated.View>

      {/* Stats breakdown */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[styles.summaryTitle, RTL]}>פירוט מספרים</Text>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_MONEY_BAG} size={18} />
                <Text style={sim5Styles.scoreRowLabel}>קופת פנסיה</Text>
              </View>
              <Text style={sim5Styles.scoreRowValue}>{formatShekel(PENSION_BALANCE)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={sim5Styles.scoreRowLabel}>סה&quot;כ התקבל</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.success }]}>{formatShekel(score.totalReceived)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_BANK} size={18} />
                <Text style={sim5Styles.scoreRowLabel}>מס ששולם</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: SIM5.warning }]}>{formatShekel(score.taxPaid)}</Text>
            </View>
            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_TARGET} size={18} />
                <Text style={sim5Styles.scoreRowLabel}>סיכון מיצוי</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: score.depletionRisk ? SIM5.danger : SIM5.success }]}>
                {score.depletionRisk ? `כן — גיל ${score.bankruptAge}` : 'לא'}
              </Text>
            </View>
            <View style={[sim5Styles.scoreRow, { borderBottomWidth: 0 }]}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_HOUSE} size={18} />
                <Text style={sim5Styles.scoreRowLabel}>פוטנציאל ירושה</Text>
              </View>
              <Text style={[sim5Styles.scoreRowValue, { color: score.inheritancePotential > 0 ? SIM5.success : SIM5.textMuted }]}>
                {score.inheritancePotential > 0 ? formatShekel(score.inheritancePotential) : 'אין'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Side-by-side comparison */}
      <Animated.View entering={FadeInDown.duration(600).delay(350)}>
        <GlowCard glowColor={SIM5.glow} style={[styles.summaryCard, { backgroundColor: SIM5.cardBg }]}>
          <Text style={[styles.summaryTitle, RTL]}>השוואת אסטרטגיות</Text>
          {allStrategiesComparison.map((comp) => {
            const isSelected = comp.strategy.id === selectedStrategy.id;
            const compLottie = comp.strategy.type === 'lump-sum' ? LOTTIE_MONEY_BAG : comp.strategy.type === 'monthly-annuity' ? LOTTIE_SHIELD : LOTTIE_BALANCE;

            return (
              <View
                key={comp.strategy.id}
                style={[compStyles.row, isSelected && compStyles.rowSelected]}
              >
                <View style={compStyles.header}>
                  <LottieIcon source={compLottie} size={22} />
                  <Text style={[compStyles.name, RTL, isSelected && compStyles.nameSelected]}>
                    {comp.strategy.type === 'lump-sum' ? 'הונית' : comp.strategy.type === 'monthly-annuity' ? 'חודשית' : 'משולב'}
                    {isSelected ? ' ← בחרת' : ''}
                  </Text>
                </View>
                <View style={compStyles.stats}>
                  <Text style={compStyles.statText}>התקבל: {formatShekel(comp.totalReceived)}</Text>
                  <Text style={compStyles.statText}>מס: {formatShekel(comp.totalTax)}</Text>
                  <Text style={[compStyles.statText, { color: comp.bankruptAge ? '#ef4444' : '#4ade80' }]}>
                    {comp.bankruptAge ? `נגמר בגיל ${comp.bankruptAge}` : 'לא נגמר'}
                  </Text>
                  <Text style={compStyles.statText}>
                    ירושה: {comp.inheritancePotential > 0 ? formatShekel(comp.inheritancePotential) : '—'}
                  </Text>
                </View>
              </View>
            );
          })}
        </GlowCard>
      </Animated.View>

      {/* Inflation impact */}
      <Animated.View entering={FadeInDown.duration(600).delay(380)}>
        <GlowCard glowColor={SIM5.glow} style={[styles.summaryCard, { backgroundColor: SIM5.cardBg }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <LottieIcon source={LOTTIE_CHART} size={22} />
            <Text style={[styles.summaryTitle, RTL, { marginBottom: 0 }]}>השפעת האינפלציה</Text>
          </View>
          <Text style={[styles.summaryText, RTL]}>
            ₪{MONTHLY_EXPENSES.toLocaleString('he-IL')} היום = ₪{inflationExpenses.toLocaleString('he-IL')} בכוח קנייה בגיל 92.
            {'\n'}האינפלציה ({Math.round(INFLATION_RATE * 100)}% שנתי) מכפילה את עלות המחייה!
          </Text>
        </GlowCard>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)}>
        <GlowCard glowColor={SIM5.glow} style={[styles.lessonCard, { backgroundColor: SIM5.cardBg }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }}>
            <LottieIcon source={LOTTIE_BULB} size={24} />
            <Text style={[styles.lessonText, RTL, { flex: 1 }]}>
              קצבה = שקט נפשי. הון = גמישות + סיכון. תשלבו בחכמה.
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(600).delay(600)} style={sim5Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim5Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={20} /></View>
          <Text style={sim5Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim5Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim5Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const compStyles = StyleSheet.create({
  row: {
    backgroundColor: SIM5.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  rowSelected: {
    borderWidth: 1.5,
    borderColor: SIM5.primary,
    backgroundColor: `${SIM5.dim}`,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  nameSelected: {
    color: SIM5.dark,
  },
  stats: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    color: SIM5.textMuted,
    fontWeight: '600',
  },
});

// ── Main Screen ───────────────────────────────────────────────────────

interface RetirementCalcScreenProps {
  onComplete?: () => void;
}

export function RetirementCalcScreen({ onComplete }: RetirementCalcScreenProps) {
  const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json'),
  ];

  const {
    state,
    config,
    isPlaying,
    yearSnapshots,
    score,
    allStrategiesComparison,
    selectStrategy,
    startPlay,
    stopPlay,
    reset,
  } = useRetirementCalc();

  const rewardsGranted = useRef(false);
  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);
  const [phase, setPhase] = useState<'select' | 'sim'>('select');

  // Hero age animation
  const heroScale = useSharedValue(1);
  const prevAge = useRef(RETIREMENT_AGE);

  useEffect(() => {
    const currentAge = RETIREMENT_AGE + state.currentYear;
    if (currentAge !== prevAge.current && state.currentYear > 0) {
      heroScale.value = withSequence(
        withSpring(1.15, SPRING_SNAPPY),
        withSpring(1, SPRING_SNAPPY),
      );
      prevAge.current = currentAge;
    }
  }, [state.currentYear, heroScale]);

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

  const handleSelectStrategy = useCallback(
    (strategy: WithdrawalStrategy) => {
      tapHaptic();
      selectStrategy(strategy);
    },
    [selectStrategy],
  );

  const handleStartSim = useCallback(() => {
    if (!state.selectedStrategy) return;
    heavyHaptic();
    setPhase('sim');
    startPlay();
  }, [state.selectedStrategy, startPlay]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    setPhase('select');
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const handleAutoPlay = useCallback(() => {
    heavyHaptic();
    if (isPlaying) {
      stopPlay();
    } else {
      startPlay();
    }
  }, [isPlaying, startPlay, stopPlay]);

  // ── Score screen ──────────────────────────────────────────────────
  if (state.isComplete && score && state.selectedStrategy) {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScoreScreen
          score={score}
          selectedStrategy={state.selectedStrategy}
          allStrategiesComparison={allStrategiesComparison}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Phase 1: Strategy selection ─────────────────────────────────
  if (phase === 'select') {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <LottieIcon source={LOTTIE_BEACH} size={48} />
            <Text accessibilityRole="header" style={[styles.title, RTL]}>מחשבון הפרישה</Text>
            <Text style={[styles.subtitle, RTL]}>
              גיל 67. קופת פנסיה ₪2,000,000. מה עושים?
            </Text>
          </Animated.View>

          {/* Pension info */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <GlowCard glowColor={SIM5.glow} style={[styles.propertyCard, { backgroundColor: SIM5.cardBg }]}>
              <LottieIcon source={LOTTIE_BANK} size={44} />
              <Text style={[styles.propertyTitle, RTL]}>קופת הפנסיה שלך</Text>
              <View style={styles.propertyRow}>
                <View style={styles.propertyStat}>
                  <Text style={styles.propertyLabel}>סכום</Text>
                  <Text style={styles.propertyValue}>{formatShekel(PENSION_BALANCE)}</Text>
                </View>
                <View style={styles.propertyDivider} />
                <View style={styles.propertyStat}>
                  <Text style={styles.propertyLabel}>הוצאות/חודש</Text>
                  <Text style={[styles.propertyValue, { color: '#f97316' }]}>{formatShekel(MONTHLY_EXPENSES)}</Text>
                </View>
                <View style={styles.propertyDivider} />
                <View style={styles.propertyStat}>
                  <Text style={styles.propertyLabel}>תקופה</Text>
                  <Text style={styles.propertyValue}>25 שנה</Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Strategy options */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={[styles.sectionTitle, RTL]}>בחר אסטרטגיית משיכה</Text>
          </Animated.View>

          {config.strategies.map((strategy, i) => (
            <Animated.View key={strategy.id} entering={FadeInDown.duration(500).delay(300 + i * 100)}>
              <StrategyCard
                strategy={strategy}
                isSelected={state.selectedStrategy?.id === strategy.id}
                onSelect={() => handleSelectStrategy(strategy)}
              />
            </Animated.View>
          ))}

          {/* Start button */}
          {state.selectedStrategy && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.completeArea}>
              <AnimatedPressable onPress={handleStartSim} style={styles.completeBtn} accessibilityRole="button" accessibilityLabel="התחל סימולציה">
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

  // ── Phase 2: Simulation ─────────────────────────────────────────
  const latestSnapshot = yearSnapshots.length > 0
    ? yearSnapshots[yearSnapshots.length - 1]
    : null;
  const currentAge = RETIREMENT_AGE + state.currentYear;
  const initialBalance = state.selectedStrategy?.lumpSum ?? 0;
  const isBankrupt = latestSnapshot?.isBankrupt ?? false;

  return (
    <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <LottieIcon source={LOTTIE_BEACH} size={36} />
          <Text accessibilityRole="header" style={[styles.title, RTL]}>מחשבון הפרישה</Text>
          <Text style={[styles.subtitle, RTL]}>
            {state.selectedStrategy?.label.split('—')[0].trim()}
          </Text>
        </Animated.View>

        {/* Age counter hero */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.heroSection}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <LottieIcon source={LOTTIE_CAKE} size={20} />
            <Text style={styles.heroLabel}>גיל</Text>
          </View>
          <Animated.View style={heroAnimStyle}>
            <Text style={[styles.heroNumber, { color: isBankrupt ? '#ef4444' : '#ffffff' }]}>
              {currentAge}
            </Text>
          </Animated.View>
          <Text style={styles.heroLabel}>מתוך 92</Text>

          {/* Progress bar — RTL */}
          <View style={[simStyles.progressTrack, { transform: [{ scaleX: -1 }] }]}>
            <LinearGradient
              colors={isBankrupt ? ['#ef4444', '#dc2626'] : ['#a78bfa', '#a78bfa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[simStyles.progressFill, { width: `${(state.currentYear / SIMULATION_YEARS) * 100}%` }]}
            />
          </View>
        </Animated.View>

        {/* Running totals */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={simStyles.totalsGrid}>
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>הכנסה חודשית</Text>
              <Text style={[simStyles.totalValue, { color: isBankrupt ? '#ef4444' : '#4ade80' }]}>
                {latestSnapshot ? formatShekel(latestSnapshot.monthlyIncome) : '—'}
              </Text>
            </View>
            <View style={simStyles.totalDivider} />
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>הוצאות/חודש</Text>
              <Text style={[simStyles.totalValue, { color: '#f97316' }]}>
                {latestSnapshot ? formatShekel(Math.round(latestSnapshot.expenses / 12)) : formatShekel(MONTHLY_EXPENSES)}
              </Text>
            </View>
            <View style={simStyles.totalDivider} />
            <View style={simStyles.totalItem}>
              <Text style={simStyles.totalLabel}>מס שנתי</Text>
              <Text style={[simStyles.totalValue, { color: '#fbbf24' }]}>
                {latestSnapshot ? formatShekel(latestSnapshot.taxPaid) : '—'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Balance bar */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <BalanceBar
            balance={latestSnapshot?.balance ?? initialBalance}
            maxBalance={initialBalance}
            isBankrupt={isBankrupt}
            strategyType={state.selectedStrategy?.type ?? ''}
          />
        </Animated.View>

        {/* Bankruptcy alert */}
        {isBankrupt && state.bankruptAge && (
          <Animated.View entering={FadeInDown.springify().damping(12)}>
            <View style={simStyles.bankruptAlert}>
              <LottieIcon source={LOTTIE_DECREASE} size={40} />
              <Text style={[simStyles.bankruptTitle, RTL]}>נגמר הכסף!</Text>
              <Text style={[simStyles.bankruptDesc, RTL]}>
                הקופה התרוקנה בגיל {state.bankruptAge}. עוד {92 - state.bankruptAge} שנים בלי מקור הכנסה.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Inflation tracker */}
        {latestSnapshot && (
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={simStyles.inflationRow}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_CHART} size={16} />
                <Text style={simStyles.inflationLabel}>אינפלציה מצטברת</Text>
              </View>
              <Text style={simStyles.inflationValue}>
                ₪{MONTHLY_EXPENSES.toLocaleString('he-IL')} → ₪{Math.round(latestSnapshot.expenses / 12).toLocaleString('he-IL')}/חודש
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Auto-play toggle */}
        {!state.isComplete && (
          <Animated.View entering={FadeInUp.delay(250)} style={simStyles.controlsRow}>
            <AnimatedPressable
              onPress={handleAutoPlay}
              style={[
                simStyles.controlBtn,
                isPlaying && simStyles.controlBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'עצור' : 'הפעל אוטומטי'}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={18} /></View>
                <Text style={simStyles.controlBtnText}>
                  {isPlaying ? 'עצור' : 'הפעל אוטומטי'}
                </Text>
              </View>
            </AnimatedPressable>
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
    fontSize: 11,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: SIM5.textPrimary,
  },
  totalDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 4,
  },
  bankruptAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bankruptTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ef4444',
    marginBottom: 4,
  },
  bankruptDesc: {
    fontSize: 13,
    color: SIM5.textMuted,
    lineHeight: 20,
  },
  inflationRow: {
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
  inflationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  inflationValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f97316',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  controlBtn: {
    flex: 1,
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM5.btnPrimaryBorder,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  controlBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  controlBtnText: {
    color: SIM5.textOnGradient,
    fontSize: 16,
    fontWeight: '800',
    ...SHADOW_STRONG,
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
    backgroundColor: SIM5.trackBg,
    borderRadius: 20,
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
    color: SIM5.textOnGradient,
    ...SHADOW_STRONG,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: SIM5.textOnGradient,
    ...SHADOW_STRONG,
  },

  // Pension info card
  propertyCard: {
    marginBottom: 20,
    padding: 16,
    alignItems: 'center',
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
  },
  propertyValue: {
    fontSize: 15,
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
    color: SIM5.textOnGradient,
    ...SHADOW_LIGHT,
  },

  // Score screen
  gradeArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gradeLetter: {
    fontSize: 64,
    fontWeight: '900',
  },
  gradeLabel: {
    fontSize: 14,
    color: SIM5.textMuted,
    marginTop: 4,
  },
  summaryCard: {
    marginBottom: 14,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: SIM5.textMuted,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SIM5.cardBorder,
  },
  statLabel: {
    fontSize: 13,
    color: SIM5.textMuted,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },
  lessonCard: {
    marginBottom: 16,
    padding: 16,
  },
  lessonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM5.dark,
    lineHeight: 24,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SIM5.trackBg,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  replayBtn: {
    flex: 1,
    backgroundColor: SIM5.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM5.cardBorder,
  },
  replayBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM5.dark,
  },
  continueBtn: {
    flex: 1,
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM5.btnPrimaryBorder,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
