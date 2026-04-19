import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { getChapterTheme } from '../../../constants/theme';
import { FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { GlossaryTooltip } from '../../../components/ui/GlossaryTooltip';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useInflationRace } from './useInflationRace';
import { SIM3, GRADE_COLORS3, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim3Styles } from './simTheme';
import type {
  InflatedProduct,
  InflationRaceScore,
} from './inflationRaceTypes';

/* ── Chapter-3 theme (ocean blue), kept for gradient only ── */
const _th3 = getChapterTheme('chapter-3');

/* ── Lottie assets ── */
const LOTTIE_MONEY_BAG = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');


/* ================================================================== */
/*  ProductCard, single product in the grid                            */
/* ================================================================== */

function ProductCard({
  product,
  index,
}: {
  product: InflatedProduct;
  index: number;
}) {
  const priceScale = useSharedValue(1);

  useEffect(() => {
    priceScale.value = withSpring(1.05, { damping: 22, stiffness: 200 });
    const timeout = setTimeout(() => {
      priceScale.value = withSpring(1, { damping: 22, stiffness: 150 });
    }, 200);
    return () => clearTimeout(timeout);
  }, [product.currentPrice, priceScale]);

  const priceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: priceScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).springify().damping(20)}
      style={[
        styles.productCard,
        !product.affordable && styles.productCardUnaffordable,
      ]}
    >
      {!product.affordable && (
        <View style={styles.unaffordableOverlay}>
          <LottieIcon source={LOTTIE_CROSS} size={22} />
        </View>
      )}
      <Text style={styles.productEmoji}>{product.emoji}</Text>
      <Text style={[styles.productName, RTL]} numberOfLines={1}>
        {product.name}
      </Text>
      <Animated.View style={priceAnimStyle}>
        <Text
          style={[
            styles.productPrice,
            !product.affordable && styles.productPriceRed,
          ]}
        >
          ₪{product.currentPrice.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
        </Text>
      </Animated.View>
      <Text style={styles.productBase}>
        בסיס: ₪{product.basePrice.toLocaleString('he-IL')}
      </Text>
    </Animated.View>
  );
}

/* ================================================================== */
/*  ScoreScreen, results display                                       */
/* ================================================================== */

function ScoreScreen({
  score,
  config,
  products,
  onReplay,
  onContinue,
}: {
  score: InflationRaceScore;
  config: { initialMoney: number };
  products: InflatedProduct[];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S');
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const gradeColor = GRADE_COLORS3[score.grade];
  const unaffordable = products.filter((p) => !p.affordable);

  return (
    <View style={[styles.flex1, styles.scoreContainer]}>
      <GlossaryTooltip term={activeTerm} onClose={() => setActiveTerm(null)} />
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Grade + label */}
      <Animated.View
        entering={FadeInDown.springify().damping(22)}
        style={sim3Styles.gradeContainer}
      >
        <Text style={[sim3Styles.gradeText, { color: gradeColor }]}>
          {GRADE_HEBREW[score.grade] ?? score.grade}
        </Text>
        <Text style={[sim3Styles.gradeLabel, RTL]}>{score.gradeLabel}</Text>
      </Animated.View>

      {/* Score card */}
      <Animated.View entering={FadeInUp.delay(200)} style={sim3Styles.scoreCard}>
        <View style={sim3Styles.scoreCardInner}>
          {/* Uninvested row */}
          <View style={sim3Styles.scoreRow}>
            <Text style={sim3Styles.scoreRowLabel}>בלי השקעה</Text>
            <Text style={[sim3Styles.scoreRowValue, { color: SIM3.danger }]}>
              ₪{score.finalPurchasingPowerValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <Text style={{ color: SIM3.textMuted, fontSize: 12, textAlign: 'left' }}>
            מתוך ₪{config.initialMoney.toLocaleString('he-IL')}
          </Text>

          {/* Invested row */}
          <View style={sim3Styles.scoreRow}>
            <Text style={sim3Styles.scoreRowLabel}>עם השקעה</Text>
            <Text style={[sim3Styles.scoreRowValue, { color: SIM3.success }]}>
              ₪{score.finalInvestedValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <Text style={{ color: SIM3.success, fontSize: 12, fontWeight: '700', textAlign: 'left' }}>
            +{score.investmentGain.toFixed(1)}%
          </Text>

          {/* Divider + purchasing power lost */}
          <View style={sim3Styles.scoreDivider}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={18} />
              <Text style={sim3Styles.scoreTotalLabel}>כוח קנייה שאבד</Text>
            </View>
            <Text style={[sim3Styles.scoreTotalValue, { color: SIM3.warning }]}>
              {score.purchasingPowerLost.toFixed(1)}%
            </Text>
          </View>

          {/* Unaffordable items */}
          {unaffordable.length > 0 && (
            <View style={sim3Styles.scoreRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_CROSS} size={18} />
                <Text style={sim3Styles.scoreRowLabel}>לא בר השגה</Text>
              </View>
              <Text style={[sim3Styles.scoreRowValue, { color: SIM3.danger }]}>
                {unaffordable.map((p) => p.emoji).join(' ')}
              </Text>
            </View>
          )}

          {/* Insight */}
          <View style={sim3Styles.insightRow}>
            <LottieIcon source={LOTTIE_BULB} size={20} />
            <Text style={sim3Styles.insightText}>
              אם הכסף לא צומח, הוא נעלם. אינפלציה היא הגנב השקט.
            </Text>
          </View>

          {/* Finn Notification */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: '#f0f9ff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#bae6fd' }}>
            <ExpoImage source={FINN_HAPPY} style={{ width: 44, height: 44 }} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0c4a6e', writingDirection: 'rtl', textAlign: 'right', lineHeight: 20 }}>
                התרופה לאינפלציה- השקעה! גם נכסים סולידיים כמו{' '}
                <Text 
                  onPress={() => setActiveTerm('קרן כספית')} 
                  style={{ color: '#0284c7', fontWeight: '900', textDecorationLine: 'underline' }}
                >
                  קרן כספית
                </Text>{' '}
                תגן עליכם ממנה.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      </ScrollView>

      {/* Sticky actions bar, always visible */}
      <View style={styles.stickyActionsBar}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש" style={sim3Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim3Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא" style={sim3Styles.continueBtn}>
          <Text style={sim3Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  InflationRaceScreen, main component                                */
/* ================================================================== */

export function InflationRaceScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const {
    state,
    config,
    setYear,
    toggleInvestedPath,
    startAutoPlay,
    stopAutoPlay,
    reset,
    score,
  } = useInflationRace();


  const rewardsGranted = useRef(false);

  // Animated purchasing power bar
  const powerWidth = useSharedValue(100);
  useEffect(() => {
    powerWidth.value = withSpring(state.purchasingPower, {
      damping: 20,
      stiffness: 120,
    });
  }, [state.purchasingPower, powerWidth]);

  const powerBarStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, powerWidth.value))}%`,
  }));

  // Pulsing glow for auto-play button
  const autoPulse = useSharedValue(1);
  useEffect(() => {
    if (!state.isAutoPlaying && state.currentYear === 0) {
      autoPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(autoPulse);
      autoPulse.value = withTiming(1, { duration: 200 });
    }
  }, [state.isAutoPlaying, state.currentYear, autoPulse]);

  const autoPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: autoPulse.value }],
  }));

  // Animated money values
  const investedScale = useSharedValue(1);
  useEffect(() => {
    investedScale.value = withSpring(1.03, { damping: 22, stiffness: 200 });
    const timeout = setTimeout(() => {
      investedScale.value = withSpring(1, { damping: 22, stiffness: 150 });
    }, 250);
    return () => clearTimeout(timeout);
  }, [state.investedValue, investedScale]);

  const investedAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: investedScale.value }],
  }));

  // Grant rewards when complete
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    reset();
  }, [reset]);

  const handleAutoPlay = useCallback(() => {
    heavyHaptic();
    if (state.isAutoPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  }, [state.isAutoPlaying, startAutoPlay, stopAutoPlay]);

  const handleTogglePath = useCallback(() => {
    tapHaptic();
    toggleInvestedPath();
  }, [toggleInvestedPath]);

  const getPowerColor = (power: number): string => {
    if (power > 70) return '#4ade80';
    if (power > 40) return '#facc15';
    return '#ef4444';
  };

  /* ---------------------------------------------------------------- */
  /*  Phase: Results                                                    */
  /* ---------------------------------------------------------------- */
  const CH3_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-146-trolley-hover-jump.json'),
    require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json'),
  ];

  if (state.isComplete && score) {
    // Build uninvested products for results display
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
        <ScoreScreen
          score={score}
          config={config}
          products={state.products}
          onReplay={handleReplay}
          onContinue={onComplete}
        />
      </SimLottieBackground>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Phase: Playing                                                    */
  /* ---------------------------------------------------------------- */
  return (
    <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.playContainer}
      >
        {/* Title */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_TARGET} size={28} /></View>
            <Text accessibilityRole="header" style={[styles.title, RTL]}>מירוץ הקניות</Text>
          </View>
          <Text style={[styles.subtitle, RTL]}>
            צפו איך האינפלציה אוכלת את הכסף שלכם
          </Text>
        </Animated.View>

        {/* Two money displays */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.moneyRow}>
          {/* Checking account, stays flat */}
          <GlowCard
            glowColor={
              state.showInvestedPath
                ? SIM3.cardBorder
                : 'rgba(239,68,68,0.3)'
            }
            style={[styles.moneyCard, { backgroundColor: SIM3.cardBg }]}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_MONEY_BAG} size={22} /></View>
              <Text style={[styles.moneyLabel, RTL]}>כסף בעו״ש</Text>
            </View>
            <Text
              style={[
                styles.moneyAmount,
                state.currentYear > 5 && styles.moneyAmountFaded,
              ]}
            >
              ₪{config.initialMoney.toLocaleString('he-IL')}
            </Text>
            <Text style={styles.moneyNote}>לא צומח</Text>
          </GlowCard>

          {/* Invested money, grows */}
          <GlowCard
            glowColor="rgba(34,197,94,0.3)"
            style={[styles.moneyCard, { backgroundColor: SIM3.cardBg }]}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_GROWTH} size={22} /></View>
              <Text style={[styles.moneyLabel, RTL]}>כסף מושקע</Text>
            </View>
            <Animated.View style={investedAnimStyle}>
              <Text style={[styles.moneyAmount, styles.moneyAmountGreen]}>
                ₪{state.investedValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </Text>
            </Animated.View>
            <Text style={[styles.moneyNote, { color: '#4ade80' }]}>
              +{((state.investedValue / config.initialMoney - 1) * 100).toFixed(0)}%
            </Text>
          </GlowCard>
        </Animated.View>

        {/* Purchasing power bar */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.powerSection}>
          <View style={styles.powerHeader}>
            <Text style={[styles.powerLabel, RTL]}>
              כוח הקנייה שלך:
            </Text>
            <Text
              style={[
                styles.powerPercent,
                { color: getPowerColor(state.purchasingPower) },
              ]}
            >
              {state.purchasingPower.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.powerTrack}>
            <Animated.View
              style={[
                styles.powerFill,
                powerBarStyle,
                { backgroundColor: getPowerColor(state.purchasingPower) },
              ]}
            />
          </View>
        </Animated.View>

        {/* Year stepper */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_CLOCK} size={22} /></View>
              <Text style={[styles.sliderLabel, RTL]}>שנים:</Text>
            </View>
            <Text style={styles.sliderValue}>{2026 + state.currentYear}</Text>
          </View>
          <View style={styles.stepperRow}>
            <AnimatedPressable
              onPress={() => setYear(state.currentYear - 1)}
              accessibilityRole="button"
              accessibilityLabel="הפחת שנה"
              accessibilityHint="חוזר שנה אחת אחורה"
              accessibilityState={{ disabled: state.currentYear <= 0 || state.isAutoPlaying }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.stepperBtn,
                state.currentYear <= 0 && styles.stepperBtnDisabled,
              ]}
              disabled={state.currentYear <= 0 || state.isAutoPlaying}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </AnimatedPressable>

            {/* Progress bar */}
            <View style={styles.yearTrack}>
              <View
                style={[
                  styles.yearFill,
                  {
                    width: `${(state.currentYear / config.maxYears) * 100}%`,
                  },
                ]}
              />
            </View>

            <AnimatedPressable
              onPress={() => setYear(state.currentYear + 1)}
              accessibilityRole="button"
              accessibilityLabel="הוסף שנה"
              accessibilityHint="מתקדם שנה אחת קדימה"
              accessibilityState={{ disabled: state.currentYear >= config.maxYears || state.isAutoPlaying }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.stepperBtn,
                state.currentYear >= config.maxYears && styles.stepperBtnDisabled,
              ]}
              disabled={state.currentYear >= config.maxYears || state.isAutoPlaying}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </AnimatedPressable>
          </View>
          <View style={styles.sliderRange}>
            <Text style={styles.sliderRangeText}>2026</Text>
            <Text style={styles.sliderRangeText}>{2026 + config.maxYears}</Text>
          </View>
        </Animated.View>

        {/* Controls row */}
        <Animated.View entering={FadeInUp.delay(350)} style={styles.controlsRow}>
          <Animated.View style={[{ flex: 1 }, autoPulseStyle]}>
            <AnimatedPressable
              onPress={handleAutoPlay}
              accessibilityRole="button"
              accessibilityLabel={state.isAutoPlaying ? 'עצור' : 'הפעל אוטומטי'}
              accessibilityHint={state.isAutoPlaying ? 'עוצר את ההרצה האוטומטית' : 'מריץ את הסימולציה אוטומטית'}
              style={[
                styles.controlBtn,
                state.isAutoPlaying
                  ? styles.controlBtnActive
                  : styles.autoPlayBtn,
              ]}
            >
              {!state.isAutoPlaying && (
                <Text
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    bottom: -28,
                    alignSelf: 'center',
                    fontSize: 38,
                    textShadowColor: 'rgba(0,0,0,0.35)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 6,
                    zIndex: 10,
                  }}
                >
                  👆
                </Text>
              )}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, zIndex: 1 }}>
                <LottieIcon source={LOTTIE_PLAY} size={18} />
                <Text style={[styles.controlBtnText, !state.isAutoPlaying && { color: '#ffffff' }]}>
                  {state.isAutoPlaying ? 'עצור' : 'הפעל אוטומטי'}
                </Text>
              </View>
            </AnimatedPressable>
          </Animated.View>

          <AnimatedPressable
            onPress={handleTogglePath}
            accessibilityRole="button"
            accessibilityLabel={state.showInvestedPath ? 'כסף רגיל' : 'הצג מושקע'}
            accessibilityHint="מחליף בין תצוגת כסף רגיל לכסף מושקע"
            style={[
              styles.controlBtn,
              state.showInvestedPath && styles.controlBtnInvested,
            ]}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <LottieIcon source={state.showInvestedPath ? LOTTIE_REPLAY : LOTTIE_GROWTH} size={18} />
              <Text style={[styles.controlBtnText, state.showInvestedPath && { color: '#ffffff' }]}>
                {state.showInvestedPath ? 'כסף רגיל' : 'הצג מושקע'}
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Product grid */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.gridSection}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={22} /></View>
            <Text style={[styles.gridTitle, RTL]}>
              מחירים בשנה {state.currentYear}:
            </Text>
          </View>
          <View style={styles.productGrid}>
            {state.products.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </View>
        </Animated.View>

        {/* Affordable count */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.affordableSection} accessibilityLiveRegion="polite">
          <Text style={[styles.affordableText, RTL]}>
            פריטים שאתה יכול לקנות:{' '}
            <Text
              style={{
                color:
                  state.affordableItems === state.products.length
                    ? '#4ade80'
                    : state.affordableItems > 4
                      ? '#facc15'
                      : '#ef4444',
                fontWeight: '900',
              }}
            >
              {state.affordableItems}/{state.products.length}
            </Text>
          </Text>
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
    backgroundColor: '#f8fafc',
  },
  flex1: { flex: 1 },

  /* Sticky actions bar, score screen footer */
  stickyActionsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,165,233,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },

  /* Play screen */
  playContainer: {
    padding: 12,
    paddingBottom: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: SIM3.textOnGradient,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM3.textOnGradientMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    ...SHADOW_LIGHT,
  },

  /* Money displays */
  moneyRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  moneyCard: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
  },
  moneyLabel: {
    color: SIM3.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  moneyAmount: {
    color: SIM3.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  moneyAmountFaded: {
    opacity: 0.5,
  },
  moneyAmountGreen: {
    color: '#4ade80',
  },
  moneyNote: {
    color: SIM3.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Purchasing power */
  powerSection: {
    marginBottom: 6,
  },
  powerHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  powerLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '700',
    ...SHADOW_LIGHT,
  },
  powerPercent: {
    fontSize: 16,
    fontWeight: '900',
  },
  powerTrack: {
    height: 10,
    backgroundColor: SIM3.trackBg,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  powerFill: {
    height: '100%',
    borderRadius: 6,
  },

  /* Slider */
  sliderSection: {
    marginBottom: 6,
  },
  sliderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '700',
    ...SHADOW_LIGHT,
  },
  sliderValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  stepperRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SIM3.cardBg,
    borderWidth: 1,
    borderColor: SIM3.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperBtnText: {
    color: SIM3.textOnGradient,
    fontSize: 18,
    fontWeight: '800',
    ...SHADOW_LIGHT,
  },
  yearTrack: {
    flex: 1,
    height: 8,
    backgroundColor: SIM3.trackBg,
    borderRadius: 5,
    overflow: 'hidden',
    transform: [{ scaleX: -1 }],
  },
  yearFill: {
    height: '100%',
    backgroundColor: SIM3.primary,
    borderRadius: 5,
  },
  sliderRange: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderRangeText: {
    color: SIM3.textOnGradientMuted,
    fontSize: 12,
    ...SHADOW_LIGHT,
  },

  /* Controls */
  controlsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    zIndex: 10,
    overflow: 'visible',
  },
  controlBtn: {
    flex: 1,
    backgroundColor: SIM3.cardBg,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM3.cardBorder,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: SIM3.primary,
  },
  autoPlayBtn: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    borderWidth: 2,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  controlBtnInvested: {
    backgroundColor: '#166534',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  controlBtnText: {
    color: SIM3.dark,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Product grid */
  gridSection: {
    marginBottom: 4,
  },
  gridTitle: {
    color: SIM3.textOnGradient,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    ...SHADOW_STRONG,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  productCard: {
    width: '47%',
    backgroundColor: SIM3.cardBg,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM3.cardBorder,
  },
  productCardUnaffordable: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
    opacity: 0.6,
  },
  unaffordableOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  unaffordableX: {
    fontSize: 20,
  },
  productEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  productName: {
    color: SIM3.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 1,
  },
  productPrice: {
    color: SIM3.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  productPriceRed: {
    color: '#ef4444',
  },
  productBase: {
    color: SIM3.textMuted,
    fontSize: 10,
    marginTop: 1,
  },

  /* Affordable count */
  affordableSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  affordableText: {
    color: SIM3.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '700',
    ...SHADOW_LIGHT,
  },

  /* Score screen */
  scoreContainer: {
    paddingBottom: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
});