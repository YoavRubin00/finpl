/**
 * SIM 4-30: המרוץ נגד המדד (Index Race) — Module 4-30
 * Pick 5 stocks from 12 → race 10 years vs S&P 500 → score comparison.
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
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useIndexRace } from './useIndexRace';
import { PICK_COUNT, TOTAL_YEARS, INITIAL_INVESTMENT } from './indexRaceData';
import {
  SIM4,
  SHADOW_STRONG,
  SHADOW_LIGHT,
  RTL,
  sim4Styles,
  GRADE_COLORS4,
  GRADE_HEBREW,
} from './simTheme';
import type { StockOption, IndexRaceScore } from './indexRaceTypes';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 140;

const LINE_COLORS = {
  portfolio: '#f59e0b', // gold
  index: '#3b82f6',     // blue
} as const;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

/* ================================================================== */
/*  DualLineChart — portfolio (gold) vs index (blue)                    */
/* ================================================================== */

function DualLineChart({
  portfolioValues,
  indexValues,
}: {
  portfolioValues: number[];
  indexValues: number[];
}) {
  const allValues = [...portfolioValues, ...indexValues];
  if (allValues.length === 0) return null;

  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const range = maxVal - minVal || 1;

  const maxPoints = Math.max(portfolioValues.length, indexValues.length);
  const stepX = maxPoints > 1 ? CHART_WIDTH / (maxPoints - 1) : CHART_WIDTH;
  const baselineY =
    CHART_HEIGHT - ((INITIAL_INVESTMENT - minVal) / range) * CHART_HEIGHT;

  const lines: { values: number[]; color: string; label: string }[] = [
    { values: indexValues, color: LINE_COLORS.index, label: 'index' },
    { values: portfolioValues, color: LINE_COLORS.portfolio, label: 'portfolio' },
  ];

  return (
    <View style={chartStyles.container}>
      {/* Y-axis */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{formatShekel(maxVal)}</Text>
        <Text style={chartStyles.yLabel}>
          {formatShekel((maxVal + minVal) / 2)}
        </Text>
        <Text style={chartStyles.yLabel}>{formatShekel(minVal)}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.chartArea}>
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />
        <View style={[chartStyles.baseline, { top: baselineY }]} />

        {lines.map(({ values, color, label }) => {
          const points = values.map((val, i) => ({
            x: i * stepX,
            y: CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT,
          }));

          return (
            <View key={label}>
              {points.map((point, i) => {
                if (i === 0) return null;
                const prev = points[i - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                  <View
                    key={`${label}-seg-${i}`}
                    style={[
                      chartStyles.lineSegment,
                      {
                        left: prev.x,
                        top: prev.y,
                        width: length,
                        height: 3,
                        borderRadius: 1.5,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: color,
                      },
                    ]}
                  />
                );
              })}

              {/* End dot */}
              {points.length > 1 && (
                <View
                  style={[
                    chartStyles.dataPoint,
                    {
                      left: points[points.length - 1].x - 5,
                      top: points[points.length - 1].y - 5,
                      backgroundColor: color,
                      borderColor: SIM4.cardBg,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* X-axis labels */}
        <View style={chartStyles.xLabelsRow}>
          {Array.from({ length: maxPoints }, (_, i) => {
            if (i !== 0 && i % 2 !== 0 && i !== maxPoints - 1) return null;
            return (
              <Text
                key={`x-${i}`}
                style={[chartStyles.xLabel, { left: i * stepX - 10, width: 20 }]}
              >
                {i === 0 ? 'התחלה' : `${i}`}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  StockPickCard — stock card for the pick phase grid                  */
/* ================================================================== */

function StockPickCard({
  stock,
  isSelected,
  disabled,
  onPress,
}: {
  stock: StockOption;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        pickStyles.card,
        isSelected && pickStyles.cardSelected,
        disabled && !isSelected && pickStyles.cardDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={stock.name}
    >
      <View style={{ backgroundColor: isSelected ? '#0369a1' : '#0c4a6e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 2 }}>
        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>{stock.id}</Text>
      </View>
      <Text
        style={[
          pickStyles.stockName,
          isSelected && pickStyles.stockNameSelected,
        ]}
      >
        {stock.name}
      </Text>
      <Text style={[pickStyles.sector, RTL]}>{stock.sector}</Text>
      {isSelected && (
        <View style={pickStyles.checkBadge}>
          <Text style={pickStyles.checkText}>✓</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

/* ================================================================== */
/*  ScoreScreen — results after 10 years                                */
/* ================================================================== */

function ScoreScreen({
  score,
  selectedStocks,
  onReplay,
  onContinue,
}: {
  score: IndexRaceScore;
  selectedStocks: StockOption[];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.beatIndex);

  const diffSign = score.differencePercent >= 0 ? '+' : '';
  const diffColor = score.beatIndex ? SIM4.success : SIM4.danger;

  return (
    <ScrollView style={scoreStyles.scroll} contentContainerStyle={scoreStyles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: GRADE_COLORS4[score.grade] }]}>
          {score.grade}
        </Text>
        <Text style={sim4Styles.gradeLabel}>
          {GRADE_HEBREW[score.grade] ?? score.gradeLabel}
        </Text>
      </Animated.View>

      {/* Result headline */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.headline, RTL]}>
              {score.beatIndex ? 'ניצחת את המדד! 🏆' : 'המדד ניצח 📊'}
            </Text>

            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_ROCKET} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>התיק שלך</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: LINE_COLORS.portfolio }]}>
                {formatShekel(score.portfolioFinal)}
              </Text>
            </View>

            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>S&P 500</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: LINE_COLORS.index }]}>
                {formatShekel(score.indexFinal)}
              </Text>
            </View>

            <View style={sim4Styles.scoreDivider}>
              <Text style={[sim4Styles.scoreTotalLabel, RTL]}>הפרש</Text>
              <Text style={[sim4Styles.scoreTotalValue, { color: diffColor }]}>
                {diffSign}{score.differencePercent}%
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Selected stocks breakdown */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>הנכסים שבחרת</Text>
            {selectedStocks.map((stock) => (
              <View key={stock.id} style={scoreStyles.stockRow}>
                <View style={{ backgroundColor: '#0c4a6e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>{stock.id}</Text>
                </View>
                <Text style={[scoreStyles.stockName, RTL]}>{stock.name}</Text>
                <Text style={[scoreStyles.stockSector, RTL]}>{stock.sector}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Lesson */}
      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim4Styles.insightText, RTL, { flex: 1 }]}>
                92% ממנהלי ההשקעות המקצועיים לא מצליחים לנצח את המדד לאורך 15 שנה. קרן מחקה מדד היא לרוב הבחירה החכמה.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(400)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
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

interface IndexRaceScreenProps {
  onComplete?: (score: number) => void;
}

export function IndexRaceScreen({ onComplete }: IndexRaceScreenProps) {
  const {
    state,
    config,
    score,
    toggleStock,
    startRace,
    play,
    pause,
    reset,
  } = useIndexRace();

  const rewardsGranted = useRef(false);

  // Grant rewards on completion
  const prevComplete = useRef(false);
  if (state.phase === 'complete' && !prevComplete.current) {
    prevComplete.current = true;
    if (!rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }

  /* ── Balance animation ── */
  const balanceScale = useSharedValue(1);
  const prevPortfolio = useRef(INITIAL_INVESTMENT);

  const currentPortfolio =
    state.portfolioValueByYear[state.portfolioValueByYear.length - 1] ?? INITIAL_INVESTMENT;
  const currentIndex =
    state.indexValueByYear[state.indexValueByYear.length - 1] ?? INITIAL_INVESTMENT;

  useEffect(() => {
    const diff = Math.abs(currentPortfolio - prevPortfolio.current);
    prevPortfolio.current = currentPortfolio;
    if (diff > 5000) {
      balanceScale.value = withSequence(
        withSpring(1.06, { damping: 20, stiffness: 200 }),
        withSpring(1, { damping: 20, stiffness: 150 }),
      );
    }
  }, [currentPortfolio, balanceScale]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  /* ── Start-race button pulse ── */
  const btnPulse = useSharedValue(1);
  const canStart = state.phase === 'pick' && state.selectedStockIds.length === PICK_COUNT;

  useEffect(() => {
    if (canStart) {
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
  }, [canStart, btnPulse]);

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  /* ── Callbacks ── */
  const handleToggleStock = useCallback(
    (stockId: string) => {
      tapHaptic();
      toggleStock(stockId);
    },
    [toggleStock],
  );

  const handleStartRace = useCallback(() => {
    heavyHaptic();
    startRace();
  }, [startRace]);

  const handlePause = useCallback(() => {
    tapHaptic();
    pause();
  }, [pause]);

  const handlePlay = useCallback(() => {
    tapHaptic();
    play();
  }, [play]);

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

  /* ── Selected stocks for score screen ── */
  const selectedStocks = config.stockOptions.filter((s) =>
    state.selectedStockIds.includes(s.id),
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Score Phase                                                        */
  /* ════════════════════════════════════════════════════════════════════ */

  if (state.phase === 'complete' && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScoreScreen
          score={score}
          selectedStocks={selectedStocks}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Pick Phase                                                         */
  /* ════════════════════════════════════════════════════════════════════ */

  if (state.phase === 'pick') {
    const selectedCount = state.selectedStockIds.length;
    const isFull = selectedCount >= PICK_COUNT;

    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.titleRow}>
              <View accessible={false}><LottieIcon source={LOTTIE_GROWTH} size={28} /></View>
              <Text accessibilityRole="header" style={styles.title}>המרוץ נגד המדד</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              בחר 5 נכסים מתוך הרשימה והתחרה מול S&P 500
              (מבוסס על מסחר ונתוני אמת משנים 2015-2024 בשוק ההון!)
            </Text>
          </Animated.View>

          {/* Counter */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={styles.counterText}>
              {selectedCount}/{PICK_COUNT} נבחרו
            </Text>
          </Animated.View>

          {/* Stock grid */}
          <Animated.View entering={FadeInUp.delay(200)} style={pickStyles.grid}>
            {config.stockOptions.map((stock, i) => {
              const isSelected = state.selectedStockIds.includes(stock.id);
              return (
                <Animated.View
                  key={stock.id}
                  entering={FadeInUp.delay(200 + i * 40)}
                  style={pickStyles.gridCell}
                >
                  <StockPickCard
                    stock={stock}
                    isSelected={isSelected}
                    disabled={isFull}
                    onPress={() => handleToggleStock(stock.id)}
                  />
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Start race button */}
          <Animated.View
            entering={FadeInUp.delay(600)}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <Animated.View style={btnPulseStyle}>
              <AnimatedPressable
                onPress={handleStartRace}
                style={[
                  styles.startBtn,
                  !canStart && styles.startBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="התחל מרוץ"
              >
                <View style={styles.btnInner}>
                  <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={22} /></View>
                  <Text style={styles.startBtnText}>
                    🏁 התחל מרוץ!
                  </Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>

          {/* Hint */}
          <Animated.View entering={FadeInUp.delay(700)}>
            <View style={styles.hintRow}>
              <LottieIcon source={LOTTIE_BULB} size={20} />
              <Text style={[styles.hintText, RTL]}>
                האם תצליח לנצח את S&P 500? רוב מנהלי ההשקעות לא מצליחים!
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SimLottieBackground>
    );
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Race Phase                                                         */
  /* ════════════════════════════════════════════════════════════════════ */

  const portfolioLeading = currentPortfolio > currentIndex;

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Year counter */}
        <Text style={[styles.yearCounter, { marginBottom: 4 }]}>
          שנה {state.currentYear} / {TOTAL_YEARS}
        </Text>

        {/* Dual balance display */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <GlowCard
            glowColor="rgba(245,158,11,0.2)"
            style={{ backgroundColor: SIM4.cardBg }}
          >
            <View style={styles.balanceContainer}>
              <Animated.View style={[styles.balanceCol, balanceAnimStyle]}>
                <View style={[styles.balanceDot, { backgroundColor: LINE_COLORS.portfolio }]} />
                <Text style={[styles.balanceLabel, RTL]}>התיק שלך</Text>
                <Text
                  style={[
                    styles.balanceHero,
                    { color: portfolioLeading ? SIM4.success : SIM4.textPrimary },
                  ]}
                >
                  {formatShekel(currentPortfolio)}
                </Text>
              </Animated.View>

              <View style={styles.balanceDivider} />

              <View style={styles.balanceCol}>
                <View style={[styles.balanceDot, { backgroundColor: LINE_COLORS.index }]} />
                <Text style={[styles.balanceLabel, RTL]}>S&P 500</Text>
                <Text
                  style={[
                    styles.balanceHero,
                    { color: !portfolioLeading ? SIM4.success : SIM4.textPrimary },
                  ]}
                >
                  {formatShekel(currentIndex)}
                </Text>
              </View>
            </View>
          </GlowCard>
        </Animated.View>

        {/* Dual line chart */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <GlowCard
            glowColor="rgba(129,140,248,0.15)"
            style={{ backgroundColor: SIM4.cardBg }}
          >
            <View style={{ padding: 16 }}>
              <Text style={[styles.chartTitle, RTL]}>
                מרוץ {TOTAL_YEARS} שנים
              </Text>

              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: LINE_COLORS.portfolio }]} />
                  <Text style={styles.legendText}>🏅 התיק שלך</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: LINE_COLORS.index }]} />
                  <Text style={styles.legendText}>📊 S&P 500</Text>
                </View>
              </View>

              <DualLineChart
                portfolioValues={state.portfolioValueByYear}
                indexValues={state.indexValueByYear}
              />
            </View>
          </GlowCard>
        </Animated.View>

        {/* Play / Pause */}
        <Animated.View
          entering={FadeInUp.delay(300)}
          style={{ alignItems: 'center', marginTop: 16 }}
        >
          <AnimatedPressable
            onPress={state.isPlaying ? handlePause : handlePlay}
            style={state.isPlaying ? styles.pauseBtn : styles.playBtn}
            accessibilityRole="button"
            accessibilityLabel={state.isPlaying ? 'עצור' : 'המשך מרוץ'}
          >
            <View style={styles.btnInner}>
              <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
              <Text
                style={
                  state.isPlaying ? styles.pauseBtnText : styles.playBtnText
                }
              >
                {state.isPlaying ? '⏸️ עצור' : '▶️ המשך מרוץ'}
              </Text>
            </View>
          </AnimatedPressable>
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
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  counterText: {
    color: SIM4.textOnGradient,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    ...SHADOW_STRONG,
  },
  yearCounter: {
    color: SIM4.textOnGradient,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },

  /* Balance dual display */
  balanceContainer: {
    flexDirection: 'row',
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
    color: SIM4.textSecondary,
  },
  balanceHero: {
    fontSize: 22,
    fontWeight: '900',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: SIM4.cardBorder,
    marginHorizontal: 8,
  },

  /* Chart */
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM4.textPrimary,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textSecondary,
  },

  /* Buttons */
  btnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#312e81',
    shadowColor: SIM4.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  playBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#312e81',
    shadowColor: SIM4.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  pauseBtn: {
    backgroundColor: SIM4.cardBg,
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

  /* Hint */
  hintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  hintText: {
    color: SIM4.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    ...SHADOW_LIGHT,
  },
});

/* ── Pick phase grid styles ── */
const pickStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  gridCell: {
    width: (SCREEN_WIDTH - 42) / 2,
  },
  card: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM4.cardBorder,
    shadowColor: SIM4.dark,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardSelected: {
    borderColor: LINE_COLORS.portfolio,
    backgroundColor: '#fffbeb',
    shadowColor: LINE_COLORS.portfolio,
    shadowOpacity: 0.3,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  emoji: {
    fontSize: 32,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '800',
    color: SIM4.textPrimary,
    textAlign: 'center',
    marginTop: 6,
  },
  stockNameSelected: {
    color: '#b45309',
  },
  sector: {
    fontSize: 11,
    fontWeight: '600',
    color: SIM4.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LINE_COLORS.portfolio,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});

/* ── Chart styles ── */
const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 30,
    marginTop: 8,
  },
  yAxis: {
    width: 58,
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
    height: CHART_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
    borderStyle: 'dashed',
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
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  xLabelsRow: {
    position: 'absolute',
    top: CHART_HEIGHT + 4,
    left: 0,
    right: 0,
    height: 20,
  },
  xLabel: {
    position: 'absolute',
    color: SIM4.textMuted,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
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
    color: SIM4.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stockEmoji: {
    fontSize: 20,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
    flex: 1,
  },
  stockSector: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textMuted,
  },
});
