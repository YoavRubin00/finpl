/**
 * SIM 5-31: בונה ה-IRA (IRA Builder) — Module 5-31
 * Traditional vs Roth IRA — pick winner prediction, adjust params, simulate 30 years.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useIRABuilder } from './useIRABuilder';
import {
  IRA_HELPER_TEXTS,
  ISRAELI_CALLOUT,
  ISRAELI_CALLOUT_DETAIL,
  SLIDER_RANGES,
} from './iraBuilderData';
import {
  SIM5,
  SHADOW_STRONG,
  SHADOW_LIGHT,
  RTL,
  sim5Styles,
  GRADE_COLORS5,
  GRADE_HEBREW,
} from './simTheme';
import type { IRAType, IRAScore } from './iraBuilderTypes';


const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_MAX_HEIGHT = 150;

const IRA_COLORS = {
  traditional: '#3b82f6', // blue
  roth: '#a78bfa',        // purple
} as const;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function formatDollar(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/* ================================================================== */
/*  DualBarChart — Traditional (blue) vs Roth (purple) after-tax        */
/* ================================================================== */

function DualBarChart({
  traditionalNet,
  rothNet,
  maxValue,
}: {
  traditionalNet: number;
  rothNet: number;
  maxValue: number;
}) {
  const effectiveMax = maxValue || 1;
  const tradHeight = Math.max((traditionalNet / effectiveMax) * BAR_MAX_HEIGHT, 4);
  const rothHeight = Math.max((rothNet / effectiveMax) * BAR_MAX_HEIGHT, 4);

  return (
    <View style={barStyles.container}>
      {/* Traditional bar */}
      <View style={barStyles.barCol}>
        <Text style={[barStyles.barValue, { color: IRA_COLORS.traditional }]}>
          {formatDollar(traditionalNet)}
        </Text>
        <View style={barStyles.barTrack}>
          <View
            style={[
              barStyles.barFill,
              {
                height: tradHeight,
                backgroundColor: IRA_COLORS.traditional,
              },
            ]}
          />
        </View>
        <Text style={barStyles.barLabel}>📜 Traditional</Text>
        <Text style={barStyles.barSublabel}>(אחרי מס)</Text>
      </View>

      {/* VS */}
      <View style={barStyles.vsCol}>
        <Text style={barStyles.vsText}>VS</Text>
      </View>

      {/* Roth bar */}
      <View style={barStyles.barCol}>
        <Text style={[barStyles.barValue, { color: IRA_COLORS.roth }]}>
          {formatDollar(rothNet)}
        </Text>
        <View style={barStyles.barTrack}>
          <View
            style={[
              barStyles.barFill,
              {
                height: rothHeight,
                backgroundColor: IRA_COLORS.roth,
              },
            ]}
          />
        </View>
        <Text style={barStyles.barLabel}>🔮 Roth</Text>
        <Text style={barStyles.barSublabel}>(אחרי מס)</Text>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  ParamSlider — labeled slider for a single parameter                 */
/* ================================================================== */

function ParamSlider({
  label,
  emoji,
  value,
  displayValue,
  min,
  max,
  step,
  color,
  disabled,
  onValueChange,
}: {
  label: string;
  emoji: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  color: string;
  disabled: boolean;
  onValueChange: (val: number) => void;
}) {
  return (
    <View style={paramStyles.row}>
      <View style={paramStyles.labelRow}>
        <Text style={paramStyles.emoji}>{emoji}</Text>
        <Text style={[paramStyles.name, RTL]}>{label}</Text>
        <Text style={[paramStyles.value, { color }]}>{displayValue}</Text>
      </View>
      <Slider
        style={paramStyles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        minimumTrackTintColor={color}
        maximumTrackTintColor="rgba(255,255,255,0.2)"
        thumbTintColor={color}
        disabled={disabled}
        onValueChange={onValueChange}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: displayValue }}
      />
    </View>
  );
}

/* ================================================================== */
/*  ScoreScreen — results after 30 years                                */
/* ================================================================== */

function ScoreScreen({
  score,
  onReplay,
  onContinue,
}: {
  score: IRAScore;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(
    score.grade === 'S' || score.grade === 'A',
  );

  const winnerEmoji = score.winner === 'roth' ? '🔮' : '📜';
  const winnerName = score.winner === 'roth' ? 'Roth IRA' : 'Traditional IRA';
  const winnerColor = IRA_COLORS[score.winner];

  return (
    <ScrollView
      style={scoreStyles.scroll}
      contentContainerStyle={scoreStyles.scrollContent}
    >
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade */}
      <Animated.View
        entering={FadeInDown.springify().damping(22)}
        style={sim5Styles.gradeContainer}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={[sim5Styles.gradeText, { color: GRADE_COLORS5[score.grade] }]}
        >
          {score.grade}
        </Text>
        <Text style={sim5Styles.gradeLabel}>
          {GRADE_HEBREW[score.grade] ?? score.gradeLabel}
        </Text>
      </Animated.View>

      {/* Winner reveal */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[scoreStyles.headline, RTL]}>
              {winnerEmoji} {winnerName} ניצח!
            </Text>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={[sim5Styles.scoreRowLabel, RTL]}>
                  📜 Traditional (נטו)
                </Text>
              </View>
              <Text
                style={[
                  sim5Styles.scoreRowValue,
                  { color: IRA_COLORS.traditional },
                ]}
              >
                {formatDollar(score.traditionalNet)}
              </Text>
            </View>

            <View style={sim5Styles.scoreRow}>
              <View style={sim5Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={[sim5Styles.scoreRowLabel, RTL]}>
                  🔮 Roth (נטו)
                </Text>
              </View>
              <Text
                style={[sim5Styles.scoreRowValue, { color: IRA_COLORS.roth }]}
              >
                {formatDollar(score.rothNet)}
              </Text>
            </View>

            <View style={sim5Styles.scoreDivider}>
              <Text style={[sim5Styles.scoreTotalLabel, RTL]}>הפרש</Text>
              <Text
                style={[sim5Styles.scoreTotalValue, { color: winnerColor }]}
              >
                {formatDollar(score.differenceNet)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Tax savings insight — 30-year projection */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>
              ניתוח מס — 30 שנה
            </Text>

            <View style={sim5Styles.scoreRow}>
              <Text style={[sim5Styles.scoreRowLabel, RTL]}>
                📜 Traditional ברוטו
              </Text>
              <Text
                style={[
                  sim5Styles.scoreRowValue,
                  { color: IRA_COLORS.traditional },
                ]}
              >
                {formatDollar(score.traditionalGross)}
              </Text>
            </View>

            <View style={sim5Styles.scoreRow}>
              <Text style={[sim5Styles.scoreRowLabel, RTL]}>
                📜 Traditional נטו
              </Text>
              <Text
                style={[sim5Styles.scoreRowValue, { color: SIM5.danger }]}
              >
                {formatDollar(score.traditionalNet)}
              </Text>
            </View>

            <View style={sim5Styles.scoreRow}>
              <Text style={[sim5Styles.scoreRowLabel, RTL]}>
                🔮 Roth (= נטו, אין מס)
              </Text>
              <Text
                style={[sim5Styles.scoreRowValue, { color: IRA_COLORS.roth }]}
              >
                {formatDollar(score.rothNet)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Lesson */}
      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim5Styles.scoreCard}>
          <View style={sim5Styles.scoreCardInner}>
            <View style={sim5Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim5Styles.insightText, RTL, { flex: 1 }]}>
                הבחירה בין Traditional ל-Roth תלויה בשיעור המס שלך היום לעומת
                בפרישה. אם המס שלך נמוך עכשיו — Roth עדיף. אם גבוה עכשיו —
                Traditional עדיף.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Israeli callout */}
      <Animated.View entering={FadeInUp.delay(350)} style={{ marginTop: 12 }}>
        <View
          style={[
            sim5Styles.scoreCard,
            { borderColor: SIM5.warningBorder, borderWidth: 1.5 },
          ]}
        >
          <View style={sim5Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>
              🇮🇱 {ISRAELI_CALLOUT}
            </Text>
            <Text
              style={[
                {
                  fontSize: 14,
                  color: SIM5.textSecondary,
                  lineHeight: 22,
                },
                RTL,
              ]}
            >
              {ISRAELI_CALLOUT_DETAIL}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View
        entering={FadeInUp.delay(400)}
        style={sim5Styles.actionsRow}
      >
        <AnimatedPressable onPress={onReplay} style={sim5Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim5Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim5Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim5Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  Main Screen                                                         */
/* ================================================================== */

interface IRABuilderScreenProps {
  onComplete?: (score: number) => void;
}

export function IRABuilderScreen({ onComplete }: IRABuilderScreenProps) {
  const {
    state,
    isPlaying,
    currentYear,
    totalYears,
    score,
    selectType,
    updateContribution,
    updateReturn,
    updateTaxNow,
    updateTaxRetirement,
    play,
    pause,
    reset,
  } = useIRABuilder();


  const rewardsGranted = useRef(false);

  // Grant rewards on completion
  const prevComplete = useRef(false);
  if (state.isComplete && !prevComplete.current) {
    prevComplete.current = true;
    if (!rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }

  /* ── Balance animation ── */
  const balanceScale = useSharedValue(1);
  const prevTrad = useRef(0);

  const currentTradGross =
    state.traditionalByYear[state.traditionalByYear.length - 1] ?? 0;
  const currentRothGross =
    state.rothByYear[state.rothByYear.length - 1] ?? 0;
  const currentTradNet = Math.round(
    currentTradGross * (1 - state.taxRateRetirement),
  );
  const currentRothNet = currentRothGross;

  useEffect(() => {
    const diff = Math.abs(currentTradGross - prevTrad.current);
    prevTrad.current = currentTradGross;
    if (diff > 5000) {
      balanceScale.value = withSequence(
        withSpring(1.08, { damping: 18, stiffness: 200 }),
        withSpring(1, { damping: 18, stiffness: 150 }),
      );
    }
  }, [currentTradGross, balanceScale]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  /* ── Play button pulse ── */
  const btnPulse = useSharedValue(1);
  const canPlay =
    !isPlaying &&
    !state.isComplete &&
    currentYear === 0 &&
    state.selectedType !== null;

  useEffect(() => {
    if (canPlay) {
      btnPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(btnPulse);
      btnPulse.value = withTiming(1, { duration: 200 });
    }
  }, [canPlay, btnPulse]);

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  /* ── Callbacks ── */
  const handleSelectType = useCallback(
    (type: IRAType) => {
      tapHaptic();
      selectType(type);
    },
    [selectType],
  );

  const handlePlay = useCallback(() => {
    heavyHaptic();
    play();
  }, [play]);

  const handlePause = useCallback(() => {
    tapHaptic();
    pause();
  }, [pause]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    prevComplete.current = false;
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    const gradeScore = score
      ? ({ S: 100, A: 85, B: 65, C: 45, F: 20 } as const)[score.grade] ?? 50
      : 50;
    onComplete?.(gradeScore);
  }, [onComplete, score]);

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Score Phase                                                        */
  /* ════════════════════════════════════════════════════════════════════ */

  if (state.isComplete && score) {
    return (
      <SimLottieBackground
        lottieSources={CH5_LOTTIE}
        chapterColors={SIM5.gradient}
      >
        <ScoreScreen
          score={score}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Interactive + Simulation Phase                                     */
  /* ════════════════════════════════════════════════════════════════════ */

  const isSimRunning = currentYear > 0;
  const slidersDisabled = isPlaying || currentYear > 0;
  const maxNet = Math.max(currentTradNet, currentRothNet, 1);
  const tradLeading = currentTradNet > currentRothNet;

  return (
    <SimLottieBackground
      lottieSources={CH5_LOTTIE}
      chapterColors={SIM5.gradient}
    >
      <View style={{ flex: 1, padding: 12 }}>

        {/* IRA type toggle — prediction */}
        <Animated.View entering={FadeInDown.delay(50)}>
          <Text style={[styles.sectionLabel, RTL]}>מה הניחוש שלך — מי ינצח?</Text>
          <View style={styles.typeToggleRow}>
            {(['traditional', 'roth'] as const).map((type) => {
              const helper = IRA_HELPER_TEXTS[type];
              const isSelected = state.selectedType === type;
              const color = IRA_COLORS[type];

              return (
                <AnimatedPressable
                  key={type}
                  onPress={() => handleSelectType(type)}
                  style={[
                    styles.typeCard,
                    {
                      borderColor: isSelected ? color : SIM5.cardBorder,
                      backgroundColor: isSelected ? `${color}15` : SIM5.cardBg,
                    },
                    slidersDisabled && styles.disabledCard,
                  ]}
                  disabled={slidersDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={helper.title}
                >
                  <Text style={styles.typeEmoji}>{helper.emoji}</Text>
                  <Text
                    style={[
                      styles.typeName,
                      { color: isSelected ? color : SIM5.textPrimary },
                    ]}
                  >
                    {helper.title}
                  </Text>
                  <Text style={[styles.typeDesc, RTL]}>{helper.taxTiming}</Text>
                  {isSelected && (
                    <View
                      style={[styles.selectedBadge, { backgroundColor: color }]}
                    >
                      <Text style={styles.selectedBadgeText}>
                        ✓ הבחירה שלך
                      </Text>
                    </View>
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 4 Parameter sliders */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <GlowCard
            glowColor="rgba(167,139,250,0.2)"
            style={{ backgroundColor: SIM5.cardBg }}
          >
            <View style={paramStyles.container}>
              <Text style={[paramStyles.heading, RTL]}>הגדרות</Text>

              <ParamSlider
                label="הפקדה שנתית"
                emoji="💰"
                value={state.annualContribution}
                displayValue={formatDollar(state.annualContribution)}
                min={SLIDER_RANGES.contribution.min}
                max={SLIDER_RANGES.contribution.max}
                step={SLIDER_RANGES.contribution.step}
                color="#f59e0b"
                disabled={slidersDisabled}
                onValueChange={updateContribution}
              />

              <ParamSlider
                label="תשואה שנתית"
                emoji="📈"
                value={state.investmentReturn}
                displayValue={formatPercent(state.investmentReturn)}
                min={SLIDER_RANGES.returnRate.min}
                max={SLIDER_RANGES.returnRate.max}
                step={SLIDER_RANGES.returnRate.step}
                color="#16a34a"
                disabled={slidersDisabled}
                onValueChange={updateReturn}
              />

              <ParamSlider
                label="מס עכשיו"
                emoji="🏛️"
                value={state.taxRateNow}
                displayValue={formatPercent(state.taxRateNow)}
                min={SLIDER_RANGES.taxNow.min}
                max={SLIDER_RANGES.taxNow.max}
                step={SLIDER_RANGES.taxNow.step}
                color="#dc2626"
                disabled={slidersDisabled}
                onValueChange={updateTaxNow}
              />

              <ParamSlider
                label="מס בפרישה"
                emoji="🏖️"
                value={state.taxRateRetirement}
                displayValue={formatPercent(state.taxRateRetirement)}
                min={SLIDER_RANGES.taxRetirement.min}
                max={SLIDER_RANGES.taxRetirement.max}
                step={SLIDER_RANGES.taxRetirement.step}
                color="#9333ea"
                disabled={slidersDisabled}
                onValueChange={updateTaxRetirement}
              />
            </View>
          </GlowCard>
        </Animated.View>

        {/* Year counter */}
        {isSimRunning && (
          <Animated.View entering={FadeInDown.delay(50)}>
            <Text style={styles.yearCounter}>
              שנה {currentYear} / {totalYears}
            </Text>
          </Animated.View>
        )}

        {/* Dual bar chart — after-tax comparison */}
        {isSimRunning && (
          <Animated.View entering={FadeInDown.delay(100)}>
            <GlowCard
              glowColor="rgba(167,139,250,0.15)"
              style={{ backgroundColor: SIM5.cardBg }}
            >
              <View style={{ padding: 16 }}>
                <Text style={[styles.chartTitle, RTL]}>
                  השוואה — ערך נטו (אחרי מס)
                </Text>

                <Animated.View style={balanceAnimStyle}>
                  <DualBarChart
                    traditionalNet={currentTradNet}
                    rothNet={currentRothNet}
                    maxValue={maxNet * 1.1}
                  />
                </Animated.View>
              </View>
            </GlowCard>
          </Animated.View>
        )}

        {/* Dual balance display */}
        {isSimRunning && (
          <Animated.View entering={FadeInDown.delay(150)}>
            <GlowCard
              glowColor="rgba(167,139,250,0.2)"
              style={{ backgroundColor: SIM5.cardBg }}
            >
              <View style={styles.balanceContainer}>
                <View style={styles.balanceCol}>
                  <View
                    style={[
                      styles.balanceDot,
                      { backgroundColor: IRA_COLORS.traditional },
                    ]}
                  />
                  <Text style={[styles.balanceLabel, RTL]}>📜 Traditional</Text>
                  <Text
                    style={[
                      styles.balanceHero,
                      {
                        color: tradLeading
                          ? SIM5.success
                          : SIM5.textPrimary,
                      },
                    ]}
                  >
                    {formatDollar(currentTradNet)}
                  </Text>
                  <Text style={styles.balanceSub}>(נטו)</Text>
                </View>

                <View style={styles.balanceDivider} />

                <View style={styles.balanceCol}>
                  <View
                    style={[
                      styles.balanceDot,
                      { backgroundColor: IRA_COLORS.roth },
                    ]}
                  />
                  <Text style={[styles.balanceLabel, RTL]}>🔮 Roth</Text>
                  <Text
                    style={[
                      styles.balanceHero,
                      {
                        color: !tradLeading
                          ? SIM5.success
                          : SIM5.textPrimary,
                      },
                    ]}
                  >
                    {formatDollar(currentRothNet)}
                  </Text>
                  <Text style={styles.balanceSub}>(נטו)</Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>
        )}

        {/* Progress bar */}
        {isSimRunning && (
          <Animated.View
            entering={FadeInUp.delay(200)}
            style={{ marginTop: 14 }}
          >
            <View style={[sim5Styles.progressTrack, { transform: [{ scaleX: -1 }] }]}>
              <View
                style={[
                  sim5Styles.progressFill,
                  {
                    width: `${(currentYear / totalYears) * 100}%`,
                    backgroundColor: SIM5.primary,
                  },
                ]}
              />
            </View>
          </Animated.View>
        )}

        {/* Play / Pause button */}
        <Animated.View
          entering={FadeInUp.delay(300)}
          style={{ alignItems: 'center', marginTop: 16 }}
        >
          {!isSimRunning ? (
            <Animated.View style={btnPulseStyle}>
              <AnimatedPressable
                onPress={handlePlay}
                style={[
                  styles.playBtn,
                  !state.selectedType && styles.disabledBtn,
                ]}
                disabled={!state.selectedType}
                accessibilityRole="button"
                accessibilityLabel={`הרץ ${totalYears} שנה`}
              >
                <View style={styles.btnInner}>
                  <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                  <Text style={styles.playBtnText}>
                    ▶️ הרץ {totalYears} שנה
                  </Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          ) : isPlaying ? (
            <AnimatedPressable onPress={handlePause} style={styles.pauseBtn} accessibilityRole="button" accessibilityLabel="עצור">
              <View style={styles.btnInner}>
                <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                <Text style={styles.pauseBtnText}>⏸️ עצור</Text>
              </View>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={handlePlay} style={styles.playBtn} accessibilityRole="button" accessibilityLabel="המשך סימולציה">
              <View style={styles.btnInner}>
                <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                <Text style={styles.playBtnText}>▶️ המשך סימולציה</Text>
              </View>
            </AnimatedPressable>
          )}
        </Animated.View>

        {/* Israeli callout card */}
        {!isSimRunning && (
          <Animated.View
            entering={FadeInUp.delay(400)}
            style={{ marginTop: 16 }}
          >
            <View
              style={[
                sim5Styles.gameCard,
                { borderWidth: 1.5, borderColor: SIM5.warningBorder },
              ]}
            >
              <View style={{ padding: 16 }}>
                <Text style={[styles.calloutTitle, RTL]}>
                  🇮🇱 {ISRAELI_CALLOUT}
                </Text>
                <Text style={[styles.calloutDetail, RTL]}>
                  {ISRAELI_CALLOUT_DETAIL}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Hint */}
        {!isSimRunning && (
          <Animated.View entering={FadeInUp.delay(500)}>
            <View style={styles.hintRow}>
              <LottieIcon source={LOTTIE_BULB} size={20} />
              <Text style={[styles.hintText, RTL]}>
                שנה את שיעורי המס — מתי Roth עדיף? מתי Traditional?
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: SIM5.textOnGradient,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM5.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  sectionLabel: {
    color: SIM5.textOnGradientMuted,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  yearCounter: {
    color: SIM5.textOnGradient,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    ...SHADOW_LIGHT,
  },

  /* Type toggle */
  typeToggleRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.5,
  },
  typeEmoji: {
    fontSize: 28,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '800',
  },
  typeDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: SIM5.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedBadge: {
    marginTop: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Balance dual display */
  balanceContainer: {
    flexDirection: 'row-reverse',
    padding: 16,
  },
  balanceCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM5.textSecondary,
  },
  balanceHero: {
    fontSize: 22,
    fontWeight: '900',
  },
  balanceSub: {
    fontSize: 11,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: SIM5.cardBorder,
    marginHorizontal: 8,
  },

  /* Chart */
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 8,
  },

  /* Buttons */
  btnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#4c1d95',
    shadowColor: SIM5.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  pauseBtn: {
    backgroundColor: SIM5.cardBg,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#dc2626',
  },
  pauseBtnText: {
    color: '#dc2626',
    fontSize: 17,
    fontWeight: '800',
  },

  /* Callout */
  calloutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 6,
  },
  calloutDetail: {
    fontSize: 14,
    color: SIM5.textSecondary,
    lineHeight: 22,
  },

  /* Hint */
  hintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  hintText: {
    color: SIM5.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    ...SHADOW_LIGHT,
  },
});

/* ── Param slider styles ── */
const paramStyles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 6,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 2,
  },
  row: {
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'space-between',
  },
  emoji: {
    fontSize: 18,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    color: SIM5.textPrimary,
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    minWidth: 60,
    textAlign: 'left',
  },
  slider: {
    width: '100%',
    height: 30,
    transform: [{ scaleX: -1 }], // RTL: thumb starts at right, extends left
  },
});

/* ── Bar chart styles ── */
const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: BAR_MAX_HEIGHT + 60,
    gap: 8,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValue: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  barTrack: {
    width: '70%',
    height: BAR_MAX_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
    opacity: 0.85,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM5.textPrimary,
    textAlign: 'center',
  },
  barSublabel: {
    fontSize: 10,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  vsCol: {
    justifyContent: 'center',
    paddingBottom: 30,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '900',
    color: SIM5.textMuted,
  },
});

/* ── Score styles ── */
const scoreStyles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headline: {
    fontSize: 20,
    fontWeight: '900',
    color: SIM5.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: SIM5.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
});
