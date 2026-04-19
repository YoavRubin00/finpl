/**
 * SIM 4-30: המרוץ נגד המדד (Index Race), Module 4-30
 * Pick 5 stocks from 12 → race 10 years vs S&P 500 → score comparison.
 */

import { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useIndexRace } from './useIndexRace';
import { PICK_COUNT, TOTAL_YEARS, INITIAL_INVESTMENT } from './indexRaceData';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL } from './simTheme';
import { formatShekel } from '../../../utils/format';
import { DualLineChart } from './components/IndexRaceChart';
import { StockPickCard, pickGridCellWidth } from './components/IndexRaceStockCard';
import { IndexRaceScoreScreen } from './components/IndexRaceScoreScreen';
import { INDEX_RACE_LINE_COLORS as LINE_COLORS } from './components/indexRaceConstants';

const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  LOTTIE_BALANCE,
];

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
        <IndexRaceScoreScreen
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
              (נתוני תשואות שנתיות אמיתיים משנים 2011-2020, כולל דיבידנדים)
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
    width: pickGridCellWidth,
  },
});
