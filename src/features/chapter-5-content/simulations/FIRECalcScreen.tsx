/**
 * SIM 25: מחשבון החופש (Freedom Calculator, FIRE), Module 5-25
 * Screen: slide savings rate, watch years-to-FIRE dramatically change.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
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
import Slider from '@react-native-community/slider';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { getChapterTheme } from '../../../constants/theme';
import { useFireCalc } from './useFireCalc';
import { LIFESTYLE_PRESETS } from './fireCalcData';
import { SIM5, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim5Styles } from './simTheme';
import { formatShekel } from '../../../utils/format';

const SCREEN_WIDTH = Dimensions.get('window').width;

/* ── Chapter-5 gradient for SimLottieBackground ── */
const _th5 = getChapterTheme('chapter-5');

/* ── Lottie assets ── */
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_HOUSE = require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

// ── Sub-components ────────────────────────────────────────────────────

/** Stepper input for income/age adjustments */
function StepperInput({
  label,
  value,
  formatValue,
  step,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  formatValue: (v: number) => string;
  step: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={stepperStyles.container}>
      <Text style={[stepperStyles.label, RTL]}>{label}</Text>
      <View style={stepperStyles.controls}>
        <AnimatedPressable onPress={onDecrement} style={stepperStyles.btn} accessibilityRole="button" accessibilityLabel={`הפחת ${label}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={stepperStyles.btnText}>−</Text>
        </AnimatedPressable>
        <Text style={stepperStyles.value}>{formatValue(value)}</Text>
        <AnimatedPressable onPress={onIncrement} style={stepperStyles.btn} accessibilityRole="button" accessibilityLabel={`הגדל ${label}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={stepperStyles.btnText}>+</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SIM5.cardBg,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textSecondary,
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SIM5.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  btnText: {
    fontSize: 18,
    fontWeight: '700',
    color: SIM5.dark,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: SIM5.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
});

/** Timeline strip: current age → FIRE age → 120 */
function TimelineStrip({
  currentAge,
  fireAge,
}: {
  currentAge: number;
  fireAge: number;
}) {
  const maxAge = 120;
  const workYears = fireAge - currentAge;
  const freeYears = maxAge - fireAge;
  const workPct = Math.max(0, Math.min(100, (workYears / (maxAge - currentAge)) * 100));
  const freePct = 100 - workPct;

  return (
    <View style={timelineStyles.container}>
      <View style={timelineStyles.labels}>
        <Text style={timelineStyles.ageLabel}>{currentAge}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <View accessible={false}>
            <LottieView
              source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
              style={{ width: 18, height: 18 }}
              autoPlay
              loop
            />
          </View>
          <Text style={[timelineStyles.fireLabel, { color: '#fbbf24' }]}>
            {fireAge}
          </Text>
        </View>
        <Text style={timelineStyles.ageLabel}>{maxAge}</Text>
      </View>
      <View style={timelineStyles.bar}>
        <View style={[timelineStyles.workSection, { flex: workPct || 1 }]}>
          <LinearGradient
            colors={['#ef4444', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={timelineStyles.gradient}
          />
        </View>
        <View style={[timelineStyles.freeSection, { flex: freePct || 1 }]}>
          <LinearGradient
            colors={['#4ade80', '#22d3ee']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={timelineStyles.gradient}
          />
        </View>
      </View>
      <View style={timelineStyles.legendRow}>
        <View style={timelineStyles.legendItem}>
          <View style={[timelineStyles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={timelineStyles.legendText}>עבודה ({workYears} שנים)</Text>
        </View>
        <View style={timelineStyles.legendItem}>
          <View style={[timelineStyles.legendDot, { backgroundColor: '#4ade80' }]} />
          <Text style={timelineStyles.legendText}>חופש ({freeYears} שנים)</Text>
        </View>
      </View>
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labels: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textOnGradient,
    ...SHADOW_LIGHT,
  },
  fireLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  bar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  workSection: {
    overflow: 'hidden',
  },
  freeSection: {
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
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
    fontSize: 13,
    color: SIM5.textOnGradient,
    ...SHADOW_LIGHT,
    ...({ writingDirection: 'rtl' } as Record<string, string>),
  },
});

/** Lifestyle preview card */
function LifestyleCard({
  emoji,
  label,
  description,
  luxuryLevel,
}: {
  emoji: string;
  label: string;
  description: string;
  luxuryLevel: number;
}) {
  const stars = '⭐'.repeat(luxuryLevel);
  return (
    <GlowCard glowColor="rgba(251, 191, 36, 0.15)" style={{ backgroundColor: SIM5.cardBg }}>
      <View style={lifestyleStyles.card}>
        <View style={lifestyleStyles.headerRow}>
          <Text style={lifestyleStyles.emoji}>{emoji}</Text>
          <View style={lifestyleStyles.headerText}>
            <Text style={[lifestyleStyles.label, RTL]}>{label}</Text>
            <Text style={lifestyleStyles.stars}>{stars}</Text>
          </View>
        </View>
        <Text style={[lifestyleStyles.description, RTL]}>{description}</Text>
      </View>
    </GlowCard>
  );
}

const lifestyleStyles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 32,
    marginLeft: 12,
  },
  headerText: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },
  stars: {
    fontSize: 12,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: SIM5.textSecondary,
    lineHeight: 20,
  },
});

// ── Score Screen ──────────────────────────────────────────────────────

function ScoreScreen({
  score,
  savingsRate,
  monthlyIncome,
  onReplay,
  onContinue,
}: {
  score: ReturnType<typeof useFireCalc>['score'];
  savingsRate: number;
  monthlyIncome: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const savingsPct = Math.round(savingsRate * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
        <View accessible={false}>
          <LottieView
            source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
            style={{ width: 40, height: 40 }}
            autoPlay
            loop
          />
        </View>
        <Text style={styles.heroTitle}>חופש כלכלי!</Text>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[styles.summaryTitle, RTL]}>הסיכום שלך</Text>
            <Text style={[styles.summaryText, RTL]}>
              בשיעור חיסכון של {savingsPct}%, תהיה חופשי בגיל {score.fireAge} עם תיק של {formatShekel(score.portfolioAtFIRE)}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Comparison table */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)} style={{ marginTop: 16 }}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[styles.summaryTitle, RTL]}>השוואת שיעורי חיסכון</Text>
            {LIFESTYLE_PRESETS.map((preset) => {
              const pct = Math.round(preset.savingsRate * 100);
              const monthlyInvestment = monthlyIncome * preset.savingsRate;
              const annualExpenses = monthlyIncome * (1 - preset.savingsRate) * 12;
              const target = annualExpenses / 0.04;
              const monthlyRate = 0.07 / 12;
              const inner = (target * monthlyRate) / monthlyInvestment + 1;
              const years = inner > 0 ? Math.ceil(Math.log(inner) / Math.log(1 + monthlyRate) / 12) : 99;
              const isSelected = pct === savingsPct;
              return (
                <View
                  key={preset.savingsRate}
                  style={[
                    styles.comparisonRow,
                    isSelected && styles.comparisonRowSelected,
                  ]}
                >
                  <Text style={styles.comparisonEmoji}>{preset.emoji}</Text>
                  <Text style={[styles.comparisonLabel, RTL]}>{pct}%</Text>
                  <Text style={styles.comparisonYears}>{years} שנים</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Key lesson, insight row */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)} style={{ marginTop: 16 }}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <View style={sim5Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim5Styles.insightText, RTL, { flex: 1 }]}>
                כל 10% שיעור חיסכון = 5 שנים פחות עבדות. המתמטיקה פשוטה.
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

interface FIRECalcScreenProps {
  onComplete?: () => void;
}

export function FIRECalcScreen({ onComplete }: FIRECalcScreenProps) {
  const {
    state,
    monthlyIncome,
    projection,
    score,
    isFireWarrior,
    setSavingsRate,
    setMonthlyIncome,
    setCurrentAge,
    complete,
    reset,
  } = useFireCalc();


  const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json'),
  ];

  const rewardsGranted = useRef(false);
  const prevFireWarrior = useRef(false);

  // Hero number scale animation
  const heroScale = useSharedValue(1);
  const prevYears = useRef(state.yearsToFIRE);

  // Animate hero number on change
  useEffect(() => {
    if (state.yearsToFIRE !== prevYears.current) {
      heroScale.value = withSequence(
        withSpring(1.2, SPRING_SNAPPY),
        withSpring(1, SPRING_SNAPPY),
      );
      prevYears.current = state.yearsToFIRE;
    }
  }, [state.yearsToFIRE, heroScale]);

  // FIRE warrior achievement haptic
  useEffect(() => {
    if (isFireWarrior && !prevFireWarrior.current) {
      heavyHaptic();
    }
    prevFireWarrior.current = isFireWarrior;
  }, [isFireWarrior]);

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

  const handleSliderChange = useCallback(
    (value: number) => {
      // Snap to 5% increments
      const snapped = Math.round(value * 20) / 20;
      setSavingsRate(snapped);
      tapHaptic();
    },
    [setSavingsRate],
  );

  const handleComplete = useCallback(() => {
    heavyHaptic();
    complete();
  }, [complete]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    prevFireWarrior.current = false;
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Score screen
  if (state.isComplete) {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScoreScreen
          score={score}
          savingsRate={state.savingsRate}
          monthlyIncome={monthlyIncome}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  const savingsPct = Math.round(state.savingsRate * 100);
  const sliderColor = isFireWarrior ? '#fbbf24' : '#a78bfa';

  return (
    <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <View accessible={false}>
              <LottieView
                source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
                style={{ width: 20, height: 20 }}
                autoPlay
                loop
              />
            </View>
            <Text accessibilityRole="header" style={[styles.title, RTL]}>מחשבון החופש</Text>
          </View>
          <Text style={[styles.subtitle, RTL]}>
            כמה שנים עד שלא תצטרך לעבוד?
          </Text>
          <Text style={[styles.subtitle, RTL, { fontSize: 12, opacity: 0.9, marginTop: 2 }]}>
            {'החישוב מניח 7% תשואה שנתית (ממוצע S&P 500 היסטורי) + כלל ה-4% למשיכה'}
          </Text>
        </Animated.View>

        {/* Income & Age steppers, moved to top */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.steppersRow}>
          <StepperInput
            label="הכנסה חודשית"
            value={monthlyIncome}
            formatValue={(v) => formatShekel(v)}
            step={1000}
            onIncrement={() => setMonthlyIncome(monthlyIncome + 1000)}
            onDecrement={() => setMonthlyIncome(monthlyIncome - 1000)}
          />
          <StepperInput
            label="גיל נוכחי"
            value={state.currentAge}
            formatValue={(v) => `${v}`}
            step={1}
            onIncrement={() => setCurrentAge(state.currentAge + 1)}
            onDecrement={() => setCurrentAge(state.currentAge - 1)}
          />
        </Animated.View>

        {/* Hero number */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.heroSection}>
          {isFireWarrior && <ConfettiExplosion />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View accessible={false}>
              <LottieView
                source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
                style={{ width: 20, height: 20 }}
                autoPlay
                loop
              />
            </View>
            <Text style={[styles.heroLabel, { color: SIM5.textPrimary }]}>FIRE בעוד</Text>
          </View>
          <Animated.View style={heroAnimStyle}>
            <Text style={[styles.heroNumber, { color: sliderColor }]}>
              {state.yearsToFIRE}
            </Text>
          </Animated.View>
          <Text style={[styles.heroLabel, { color: SIM5.textPrimary }]}>שנים</Text>
          {isFireWarrior && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.fireBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View accessible={false}>
                  <LottieView
                    source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
                    style={{ width: 16, height: 16 }}
                    autoPlay
                    loop
                  />
                </View>
                <Text style={styles.fireBadgeText}>FIRE Warrior</Text>
                <View accessible={false}>
                  <LottieView
                    source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
                    style={{ width: 16, height: 16 }}
                    autoPlay
                    loop
                  />
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Savings rate slider */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <GlowCard
            glowColor={isFireWarrior ? 'rgba(251, 191, 36, 0.3)' : 'rgba(34,211,238,0.2)'}
            style={{ backgroundColor: SIM5.cardBg }}
          >
            <View style={styles.sliderCard}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, RTL]}>שיעור חיסכון</Text>
                <Text style={[styles.sliderPercent, { color: sliderColor }]}>
                  {savingsPct}%
                </Text>
              </View>
              {/* Gradient track background */}
              <View style={styles.sliderTrack}>
                <LinearGradient
                  colors={['#a78bfa', '#a78bfa', '#fbbf24', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sliderGradient}
                />
                <View style={[styles.sliderFill, { width: `${((savingsPct - 10) / 60) * 100}%` }]} />
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.10}
                maximumValue={0.70}
                step={0.05}
                value={state.savingsRate}
                onValueChange={handleSliderChange}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor={sliderColor}
                accessibilityRole="adjustable"
                accessibilityLabel="שיעור חיסכון"
                accessibilityValue={{ min: 10, max: 70, now: savingsPct, text: `${savingsPct}%` }}
              />
              <View style={styles.sliderRange}>
                <Text style={styles.rangeText}>10%</Text>
                <Text style={styles.rangeText}>70%</Text>
              </View>
            </View>
          </GlowCard>
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <TimelineStrip currentAge={state.currentAge} fireAge={state.fireAge} />
        </Animated.View>

        {/* Portfolio target */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <View style={styles.portfolioRow}>
            <View style={styles.portfolioItem}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_TARGET} size={22} />
                <Text style={styles.portfolioLabel}>יעד תיק</Text>
              </View>
              <Text style={[styles.portfolioValue, { color: '#fbbf24' }]}>
                {formatShekel(state.targetPortfolio)}
              </Text>
            </View>
            <View style={styles.portfolioDivider} />
            <View style={styles.portfolioItem}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_MONEY} size={22} />
                <Text style={styles.portfolioLabel}>השקעה חודשית</Text>
              </View>
              <Text style={[styles.portfolioValue, { color: '#4ade80' }]}>
                {formatShekel(state.monthlyInvestment)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Lifestyle preview */}
        {state.lifestylePreview && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <LottieIcon source={LOTTIE_HOUSE} size={22} />
              <Text style={[styles.sectionTitle, RTL]}>איך נראים החיים</Text>
            </View>
            <LifestyleCard
              emoji={state.lifestylePreview.emoji}
              label={state.lifestylePreview.label}
              description={state.lifestylePreview.description}
              luxuryLevel={state.lifestylePreview.luxuryLevel}
            />
          </Animated.View>
        )}

        {/* "Free at age", moved to bottom, smaller */}
        <Animated.View entering={FadeInDown.duration(500).delay(450)} style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: SIM5.textSecondary }}>
            חופשי בגיל {state.fireAge}
          </Text>
        </Animated.View>

        {/* Complete button */}
        <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.completeArea}>
          <AnimatedPressable onPress={handleComplete} style={styles.completeBtn} accessibilityRole="button" accessibilityLabel="סיימתי לחקור, הראה תוצאות">
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_CHECK} size={22} /></View>
              <Text style={styles.completeBtnText}>סיימתי לחקור, הראה תוצאות</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SimLottieBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

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
    color: SIM5.textOnGradient,
    ...SHADOW_LIGHT,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 80,
  },
  heroSubtext: {
    fontSize: 14,
    color: SIM5.textOnGradientMuted,
    marginTop: 4,
    ...SHADOW_LIGHT,
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
  fireBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  fireBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fbbf24',
  },

  // Slider card
  sliderCard: {
    padding: 16,
  },
  sliderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  sliderPercent: {
    fontSize: 24,
    fontWeight: '900',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: SIM5.trackBg,
  },
  sliderGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: -8,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  rangeText: {
    fontSize: 13,
    color: SIM5.textMuted,
  },

  // Portfolio
  portfolioRow: {
    flexDirection: 'row-reverse',
    backgroundColor: SIM5.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  portfolioItem: {
    flex: 1,
    alignItems: 'center',
  },
  portfolioDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 12,
  },
  portfolioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textSecondary,
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 18,
    fontWeight: '900',
    color: SIM5.textPrimary,
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SIM5.textOnGradient,
    marginTop: 4,
    ...SHADOW_STRONG,
  },

  // Steppers
  steppersRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
    marginTop: 16,
  },

  // Complete button
  completeArea: {
    marginTop: 4,
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

  // Score screen
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: SIM5.textSecondary,
    lineHeight: 22,
  },
  comparisonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SIM5.cardBorder,
  },
  comparisonRowSelected: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  comparisonEmoji: {
    fontSize: 18,
    marginLeft: 8,
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  comparisonYears: {
    fontSize: 16,
    fontWeight: '800',
    color: '#a78bfa',
    marginRight: 4,
  },
  lessonCard: {
    padding: 16,
  },
  lessonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM5.textPrimary,
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
    backgroundColor: SIM5.cardBg,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
});
