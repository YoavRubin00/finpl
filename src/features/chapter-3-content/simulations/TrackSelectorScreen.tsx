/**
 * SIM 3-18: בוחר המסלולים (Track Selector) — Module 3-18
 * Selection phase: pick an investment track.
 * Simulation phase: 30-year animated multi-line chart for all 3 tracks.
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
import { useTrackSelector } from './useTrackSelector';
import { SIM3, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim3Styles, GRADE_COLORS3, GRADE_HEBREW } from './simTheme';
import { formatShekel } from '../../../utils/format';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 200;

const TRACK_COLORS: Record<string, string> = {
  aggressive: '#4ade80',
  balanced: '#60a5fa',
  conservative: '#c4b5fd',
};

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const CH3_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  LOTTIE_CHART,
  require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json'),
];

/* ================================================================== */
/*  Helper                                                              */
/* ================================================================== */

/* ================================================================== */
/*  MultiLineChart — 3 tracks simultaneous growth                       */
/* ================================================================== */

function MultiLineChart({
  balanceByTrack,
  initialInvestment,
  selectedTrackId,
}: {
  balanceByTrack: Record<string, number[]>;
  initialInvestment: number;
  selectedTrackId: string | null;
}) {
  const allValues: number[] = [];
  for (const balances of Object.values(balanceByTrack)) {
    for (const b of balances) allValues.push(b);
  }
  if (allValues.length === 0) return null;

  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const range = maxVal - minVal || 1;

  const maxPoints = Math.max(
    ...Object.values(balanceByTrack).map((b) => b.length),
  );
  const stepX = maxPoints > 1 ? CHART_WIDTH / (maxPoints - 1) : CHART_WIDTH;
  const baselineY =
    CHART_HEIGHT - ((initialInvestment - minVal) / range) * CHART_HEIGHT;

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

        {/* Lines per track */}
        {Object.entries(balanceByTrack).map(([trackId, balances]) => {
          const color = TRACK_COLORS[trackId] ?? '#ffffff';
          const isSelected = trackId === selectedTrackId;
          const lineWidth = isSelected ? 3.5 : 2;
          const opacity = selectedTrackId ? (isSelected ? 1 : 0.4) : 1;

          const points = balances.map((val, i) => ({
            x: i * stepX,
            y: CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT,
          }));

          return (
            <View key={trackId} style={{ opacity }}>
              {points.map((point, i) => {
                if (i === 0) return null;
                const prev = points[i - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                  <View
                    key={`${trackId}-seg-${i}`}
                    style={[
                      chartStyles.lineSegment,
                      {
                        left: prev.x,
                        top: prev.y,
                        width: length,
                        height: lineWidth,
                        borderRadius: lineWidth / 2,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: color,
                      },
                    ]}
                  />
                );
              })}

              {/* End dot for selected track */}
              {isSelected && points.length > 1 && (
                <View
                  style={[
                    chartStyles.dataPoint,
                    {
                      left: points[points.length - 1].x - 5,
                      top: points[points.length - 1].y - 5,
                      backgroundColor: color,
                      borderColor: SIM3.cardBg,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* X-axis labels (every 5 years) */}
        <View style={chartStyles.xLabelsRow}>
          {Array.from({ length: maxPoints }, (_, i) => {
            if (i !== 0 && i % 5 !== 0 && i !== maxPoints - 1) return null;
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
/*  ScoreScreen — results after completing 30 years                     */
/* ================================================================== */

function ScoreScreen({
  score,
  config,
  onReplay,
  onContinue,
}: {
  score: NonNullable<ReturnType<typeof useTrackSelector>['score']>;
  config: ReturnType<typeof useTrackSelector>['config'];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const gradeColor = GRADE_COLORS3[score.grade] ?? '#ffffff';

  return (
    <View style={{ flex: 1, padding: 12 }}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Title */}
      <Animated.View
        entering={FadeInDown.springify().damping(22)}
        style={{ alignItems: 'center', marginBottom: 8 }}
      >
        <Text style={[sim3Styles.gradeLabel, { fontSize: 20 }]}>
          סיכום 30 שנות השקעה
        </Text>
      </Animated.View>

      {/* 3-track comparison table */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim3Styles.scoreCard}>
          <View style={sim3Styles.scoreCardInner}>
            <Text style={[styles.chartTitle, RTL]}>השוואת מסלולים</Text>
            {config.tracks.map((track) => {
              const finalBalance = score.balances[track.id] ?? 0;
              const feesLost = score.feesLost[track.id] ?? 0;
              const isBest = track.id === score.bestTrack;

              return (
                <View key={track.id} style={{ marginTop: 10 }}>
                  <View style={sim3Styles.scoreRow}>
                    <View style={sim3Styles.scoreRowLeft}>
                      <Text style={{ fontSize: 18 }}>{track.emoji}</Text>
                      <Text
                        style={[
                          sim3Styles.scoreRowLabel,
                          RTL,
                          isBest && { fontWeight: '900', color: SIM3.success },
                        ]}
                      >
                        {track.name}
                        {isBest ? ' ⭐' : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        sim3Styles.scoreRowValue,
                        { color: isBest ? SIM3.success : SIM3.textPrimary },
                      ]}
                    >
                      {formatShekel(finalBalance)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row-reverse', paddingRight: 34, marginTop: 2 }}>
                    <Text style={[styles.trackFee, RTL]}>
                      דמי ניהול: -{formatShekel(feesLost)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Fee insight — compact */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 8 }}>
        <View style={sim3Styles.scoreCard}>
          <View style={[sim3Styles.scoreCardInner, { paddingVertical: 10 }]}>
            <View style={sim3Styles.insightRow}>
              <LottieIcon source={LOTTIE_GROWTH} size={20} />
              <Text style={[sim3Styles.insightText, RTL, { flex: 1, fontSize: 14 }]}>
                הפרש דמי ניהול:{' '}
                <Text style={{ color: '#dc2626', fontWeight: '900' }}>
                  {formatShekel(
                    Math.max(...Object.values(score.feesLost)) -
                      Math.min(...Object.values(score.feesLost)),
                  )}
                </Text>
                {' '}— הפרש קטן, סכום עצום לאורך 30 שנה.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(400)} style={[sim3Styles.actionsRow, { marginTop: 12 }]}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש" style={sim3Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim3Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא" style={sim3Styles.continueBtn}>
          <Text style={sim3Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

/* ================================================================== */
/*  Main Screen                                                         */
/* ================================================================== */

interface TrackSelectorScreenProps {
  onComplete?: (score: number) => void;
}

export function TrackSelectorScreen({ onComplete }: TrackSelectorScreenProps) {
  const { state, config, score, selectTrack, play, pause, reset } =
    useTrackSelector();

  const rewardsGranted = useRef(false);

  // Grant rewards on completion
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  /* ── Balance animation ── */
  const balanceScale = useSharedValue(1);
  const prevBalance = useRef(0);

  const selectedTrack = config.tracks.find(
    (t) => t.id === state.selectedTrackId,
  );
  const currentBalance = state.selectedTrackId
    ? (state.balanceByTrack[state.selectedTrackId]?.slice(-1)[0] ??
        config.initialInvestment)
    : config.initialInvestment;

  useEffect(() => {
    const diff = Math.abs(currentBalance - prevBalance.current);
    prevBalance.current = currentBalance;
    if (diff > 5000) {
      balanceScale.value = withSequence(
        withSpring(1.06, { damping: 20, stiffness: 200 }),
        withSpring(1, { damping: 20, stiffness: 150 }),
      );
    }
  }, [currentBalance, balanceScale]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  /* ── Play-button pulse ── */
  const btnPulse = useSharedValue(1);
  useEffect(() => {
    if (state.selectedTrackId && !state.isPlaying && !state.isComplete) {
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
  }, [state.selectedTrackId, state.isPlaying, state.isComplete, btnPulse]);

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  /* ── Callbacks ── */
  const handleSelectTrack = useCallback(
    (id: string) => {
      tapHaptic();
      selectTrack(id);
    },
    [selectTrack],
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
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    const gradeScore =
      score?.grade === 'S' ? 100 :
      score?.grade === 'A' ? 85 :
      score?.grade === 'B' ? 65 :
      score?.grade === 'C' ? 45 : 20;
    onComplete?.(gradeScore);
  }, [onComplete, score]);

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Score Phase                                                        */
  /* ════════════════════════════════════════════════════════════════════ */

  if (state.isComplete && score) {
    return (
      <SimLottieBackground
        lottieSources={CH3_LOTTIE}
        chapterColors={SIM3.gradient}
      >
        <ScoreScreen
          score={score}
          config={config}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Selection Phase                                                    */
  /* ════════════════════════════════════════════════════════════════════ */

  if (!state.selectedTrackId) {
    return (
      <SimLottieBackground
        lottieSources={CH3_LOTTIE}
        chapterColors={SIM3.gradient}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.titleRow}>
              <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={28} /></View>
              <Text accessibilityRole="header" style={styles.title}>בוחר המסלולים</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              בחר מסלול השקעה וצפה ב-30 שנות צמיחה
            </Text>
          </Animated.View>

          {config.tracks.map((track, i) => (
            <Animated.View
              key={track.id}
              entering={FadeInUp.delay(100 + i * 100)}
            >
              <AnimatedPressable
                onPress={() => handleSelectTrack(track.id)}
                accessibilityRole="button"
                accessibilityLabel={track.name}
                accessibilityHint="בוחר מסלול השקעה זה"
              >
                <GlowCard
                  glowColor={`${TRACK_COLORS[track.id]}30`}
                  style={{
                    ...styles.trackCard,
                    backgroundColor: SIM3.cardBg,
                  }}
                >
                  <View style={styles.trackCardInner}>
                    <Text style={styles.trackEmoji}>{track.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.trackName, RTL]}>
                        {track.name}
                      </Text>
                      <Text style={[styles.trackAllocation, RTL]}>
                        {Math.round(track.stockPercent * 100)}% מניות /{' '}
                        {Math.round(track.bondPercent * 100)}% אג״ח
                      </Text>
                      <Text style={[styles.trackFee, RTL]}>
                        דמי ניהול:{' '}
                        {(track.annualFeePercent * 100).toFixed(2)}%
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.trackColorDot,
                        { backgroundColor: TRACK_COLORS[track.id] },
                      ]}
                    />
                  </View>
                </GlowCard>
              </AnimatedPressable>
            </Animated.View>
          ))}

          <Animated.View entering={FadeInUp.delay(500)}>
            <View style={styles.hintRow}>
              <LottieIcon source={LOTTIE_BULB} size={20} />
              <Text style={[styles.hintText, RTL]}>
                בחרו את המסלול שלדעתכם יניב הכי הרבה אחרי 30 שנה
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(600)} style={{ alignItems: 'center', marginTop: 4 }}>
            <AnimatedPressable
              onPress={() => handleSelectTrack(config.tracks[1].id)}
              accessibilityRole="button"
              accessibilityLabel="דלג"
              accessibilityHint="דולג לבחירה אוטומטית של מסלול מאוזן"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>דלג ←</Text>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
      </SimLottieBackground>
    );
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Simulation Phase                                                   */
  /* ════════════════════════════════════════════════════════════════════ */

  return (
    <SimLottieBackground
      lottieSources={CH3_LOTTIE}
      chapterColors={SIM3.gradient}
    >
      <View style={{ flex: 1, padding: 12 }}>
        {/* Year counter */}
        <Text accessibilityLiveRegion="polite" style={[styles.yearCounter, { marginBottom: 4 }]}>
          שנה {state.yearIndex} / 30
        </Text>

        {/* Current balance for selected track */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <GlowCard
            glowColor="rgba(96,165,250,0.2)"
            style={{ ...styles.balanceCard, backgroundColor: SIM3.cardBg }}
          >
            <Text style={[styles.balanceLabel, RTL]}>
              {selectedTrack?.emoji} {selectedTrack?.name} — יתרה נוכחית
            </Text>
            <Animated.View style={balanceAnimStyle}>
              <Text
                style={[
                  styles.balanceHero,
                  {
                    color:
                      currentBalance >= config.initialInvestment
                        ? '#16a34a'
                        : '#dc2626',
                  },
                ]}
              >
                {formatShekel(currentBalance)}
              </Text>
            </Animated.View>
          </GlowCard>
        </Animated.View>

        {/* Multi-line chart */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <GlowCard
            glowColor="rgba(96,165,250,0.15)"
            style={{ ...styles.chartCard, backgroundColor: SIM3.cardBg }}
          >
            <Text style={[styles.chartTitle, RTL]}>
              צמיחת 3 מסלולים — 30 שנה
            </Text>

            {/* Legend */}
            <View style={styles.legendRow}>
              {config.tracks.map((track) => (
                <View key={track.id} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: TRACK_COLORS[track.id] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      track.id === state.selectedTrackId &&
                        styles.legendTextSelected,
                    ]}
                  >
                    {track.emoji} {track.name}
                  </Text>
                </View>
              ))}
            </View>

            <MultiLineChart
              balanceByTrack={state.balanceByTrack}
              initialInvestment={config.initialInvestment}
              selectedTrackId={state.selectedTrackId}
            />
          </GlowCard>
        </Animated.View>

        {/* Play / Pause */}
        {!state.isComplete && (
          <Animated.View
            entering={FadeInUp.delay(300)}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Animated.View style={btnPulseStyle}>
              <AnimatedPressable
                onPress={state.isPlaying ? handlePause : handlePlay}
                accessibilityRole="button"
                accessibilityLabel={state.isPlaying ? 'עצור' : 'הרץ 30 שנה'}
                accessibilityHint={state.isPlaying ? 'עוצר את הסימולציה' : 'מריץ סימולציה של 30 שנות השקעה'}
                style={state.isPlaying ? styles.pauseBtn : styles.playBtn}
              >
                <View style={styles.btnInner}>
                  <LottieIcon source={LOTTIE_PLAY} size={22} />
                  <Text
                    style={
                      state.isPlaying
                        ? styles.pauseBtnText
                        : styles.playBtnText
                    }
                  >
                    {state.isPlaying ? '⏸️ עצור' : '▶️ הרץ 30 שנה'}
                  </Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>
        )}

        {/* Fee impact callout */}
        {state.yearIndex > 0 && state.selectedTrackId && (
          <Animated.View entering={FadeInUp.delay(100)}>
            <GlowCard
              glowColor="rgba(217,119,6,0.15)"
              style={{ ...styles.feeCard, backgroundColor: SIM3.cardBg }}
            >
              <View style={styles.feeInner}>
                <Text style={{ fontSize: 20 }}>💸</Text>
                <Text style={[styles.feeText, RTL]}>
                  דמי ניהול של{' '}
                  {(
                    (selectedTrack?.annualFeePercent ?? 0) * 100
                  ).toFixed(2)}
                  % נראים קטנים — אבל אחרי {state.yearIndex} שנים הם
                  מצטברים!
                </Text>
              </View>
            </GlowCard>
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
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: SIM3.textOnGradient,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: SIM3.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  yearCounter: {
    color: SIM3.textOnGradient,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },

  /* Track cards */
  trackCard: {
    marginTop: 8,
    padding: 0,
  },
  trackCardInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  trackEmoji: { fontSize: 36 },
  trackName: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM3.textPrimary,
  },
  trackAllocation: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM3.textSecondary,
    marginTop: 2,
  },
  trackFee: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM3.textMuted,
    marginTop: 2,
  },
  trackColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    ...SHADOW_LIGHT,
  },

  /* Balance hero */
  balanceCard: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM3.textSecondary,
    marginBottom: 4,
  },
  balanceHero: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },

  /* Chart */
  chartCard: {
    marginTop: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM3.textPrimary,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
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
    color: SIM3.textMuted,
  },
  legendTextSelected: {
    color: SIM3.textPrimary,
    fontWeight: '800',
  },

  /* Play / Pause */
  btnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    backgroundColor: SIM3.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: SIM3.btnPrimaryBorder,
    shadowColor: SIM3.dark,
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
    backgroundColor: SIM3.cardBg,
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

  /* Fee callout */
  feeCard: { marginTop: 12, padding: 14 },
  feeInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  feeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
    lineHeight: 22,
    flex: 1,
  },

});

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
    color: SIM3.textMuted,
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
    backgroundColor: SIM3.cardBorder,
    borderStyle: 'dashed',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM3.cardBorder,
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
    color: SIM3.textMuted,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});
