/**
 * SIM: ציר הזמן של המשברים — Crisis Timeline
 * Screen: predict recovery times for 7 historical crises.
 */

import { useCallback } from 'react';
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Image,
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
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { useCrisisTimeline, type CrisisTimelineResult } from './useCrisisTimeline';
import { CRISIS_EVENTS } from './crisisTimelineData';
import { SIM_LOTTIE } from '../../shared-sim/simLottieMap';
import { FINN_STANDARD, FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { SIM4, GRADE_COLORS4, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE4, sim4Styles } from './simTheme';
import { getChapterTheme } from '../../../constants/theme';


const _th4 = getChapterTheme('chapter-4');

const GRADE_LOTTIES: Record<string, ReturnType<typeof require>> = {
  S: SIM_LOTTIE.trophy,
  A: SIM_LOTTIE.star,
  B: SIM_LOTTIE.check,
  C: SIM_LOTTIE.cross,
  F: SIM_LOTTIE.cross,
};

const GRADE_LABELS_TEXT: Record<string, string> = {
  S: 'היסטוריון פיננסי!',
  A: 'מכיר את ההיסטוריה',
  B: 'ידע סביר',
  C: 'עוד יש מה ללמוד',
  F: 'ההיסטוריה מלמדת...',
};

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  SIM_LOTTIE.chart,
  SIM_LOTTIE.clock,
];

const RECOVERY_OPTIONS = [6, 12, 24, 48, 72, 120, 300] as const;

function accuracyColor(accuracy: number): string {
  if (accuracy >= 85) return SIM4.gain;
  if (accuracy >= 55) return SIM4.caution;
  return SIM4.loss;
}

// ── Prediction Buttons ────────────────────────────────────────────────────

interface PredictionButtonsProps {
  onSelect: (months: number) => void;
}

function PredictionButtons({ onSelect }: PredictionButtonsProps) {
  return (
    <View style={btnStyles.container}>
      <Text style={[btnStyles.prompt, RTL]}>תוך כמה חודשים השוק התאושש?</Text>
      <View style={btnStyles.grid}>
        {RECOVERY_OPTIONS.map((months) => {
          const label = months < 12
            ? `${months} חודשים`
            : months === 12
              ? 'שנה'
              : months < 120
                ? `${Math.round(months / 12)} שנים`
                : '25 שנה';
          return (
            <AnimatedPressable
              key={months}
              onPress={() => {
                tapHaptic();
                onSelect(months);
              }}
              style={btnStyles.button}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text style={btnStyles.buttonMonths}>{months}</Text>
              <Text style={btnStyles.buttonLabel}>{label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const btnStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  prompt: {
    fontSize: 16,
    fontWeight: '800',
    color: SIM4.textOnGradient,
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
    borderBottomWidth: 3,
    borderBottomColor: SIM4.btnPrimaryBorder,
  },
  buttonMonths: {
    fontSize: 20,
    fontWeight: '900',
    color: SIM4.dark,
  },
  buttonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SIM4.textSecondary,
    marginTop: 2,
  },
});

// ── Reveal Card ───────────────────────────────────────────────────────────

interface RevealCardProps {
  accuracy: number;
  predicted: number;
  actual: number;
  grahamLesson: string;
  crowdAction: string;
  surprisingFact: string;
  onNext: () => void;
  isLast: boolean;
}

function RevealCard({
  accuracy,
  predicted,
  actual,
  grahamLesson,
  crowdAction,
  surprisingFact,
  onNext,
  isLast,
}: RevealCardProps) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(12)} style={{ gap: 12 }}>
      {/* Accuracy badge */}
      <GlowCard
        glowColor={`${accuracyColor(accuracy)}33`}
        style={sim4Styles.scoreCard}
      >
        <View style={sim4Styles.scoreCardInner}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text accessibilityLiveRegion="polite" style={[revealStyles.accuracyValue, { color: accuracyColor(accuracy) }]}>
              {accuracy} נקודות
            </Text>
            <Text style={[TYPE4.cardBody, RTL, { textAlign: 'center' }]}>
              ניחשת {predicted} חודשים. בפועל: {actual} חודשים.
            </Text>
          </View>
        </View>
      </GlowCard>

      {/* Graham lesson */}
      <GlowCard glowColor="rgba(212, 175, 55, 0.2)" style={sim4Styles.scoreCard}>
        <View style={sim4Styles.scoreCardInner}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <LottieIcon source={SIM_LOTTIE.bulb} size={20} />
            <Text style={[TYPE4.cardTitle, RTL]}>גראהם היה אומר:</Text>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36 }} contentFit="contain" />
            <Text style={[TYPE4.cardBody, RTL, { flex: 1 }]}>{grahamLesson}</Text>
          </View>
        </View>
      </GlowCard>

      {/* Crowd action */}
      <GlowCard glowColor="rgba(239, 68, 68, 0.15)" style={sim4Styles.scoreCard}>
        <View style={sim4Styles.scoreCardInner}>
          <Text style={[TYPE4.cardTitle, RTL]}>🐑 מה ההמון עשה:</Text>
          <Text style={[TYPE4.cardBody, RTL]}>{crowdAction}</Text>
        </View>
      </GlowCard>

      {/* Surprising fact */}
      <GlowCard glowColor="rgba(96, 165, 250, 0.15)" style={sim4Styles.scoreCard}>
        <View style={sim4Styles.scoreCardInner}>
          <Text style={[TYPE4.cardTitle, RTL]}>🤯 עובדה מפתיעה:</Text>
          <Text style={[TYPE4.cardBody, RTL]}>{surprisingFact}</Text>
        </View>
      </GlowCard>

      {/* Next button */}
      <AnimatedPressable
        onPress={() => {
          tapHaptic();
          onNext();
        }}
        style={sim4Styles.continueBtn}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'לתוצאות' : 'המשבר הבא'}
      >
        <Text style={sim4Styles.continueText}>
          {isLast ? 'לתוצאות' : 'המשבר הבא'}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const revealStyles = StyleSheet.create({
  accuracyValue: {
    fontSize: 32,
    fontWeight: '900',
  },
});

// ── Score Screen ──────────────────────────────────────────────────────────

interface ScoreScreenProps {
  result: CrisisTimelineResult;
  onReplay: () => void;
  onContinue: () => void;
}

function ScoreScreenInner({ result, onReplay, onContinue }: ScoreScreenProps) {
  const gradeColor = GRADE_COLORS4[result.grade] || SIM4.textPrimary;
  const gradeLabel = GRADE_LABELS_TEXT[result.grade] || '';
  const gradeLottie = GRADE_LOTTIES[result.grade] || SIM_LOTTIE.chart;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center' }}>
        <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 72, height: 72 }} contentFit="contain" />
      </Animated.View>

      {/* Grade banner */}
      <Animated.View entering={FadeInDown.duration(600)} style={sim4Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[result.grade] ?? result.grade}</Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <LottieIcon source={gradeLottie} size={28} />
          <Text style={[sim4Styles.gradeLabel, { color: gradeColor }]}>{gradeLabel}</Text>
        </View>
      </Animated.View>

      {/* Total score */}
      <Animated.View entering={FadeInDown.duration(600).delay(100)}>
        <GlowCard
          glowColor={`${accuracyColor(result.totalScore)}33`}
          style={sim4Styles.scoreCard}
        >
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.scoreRow}>
              <Text style={[sim4Styles.scoreTotalLabel, RTL]}>ניקוד כולל</Text>
              <Text style={[sim4Styles.scoreTotalValue, { color: accuracyColor(result.totalScore) }]}>
                {result.totalScore}/100
              </Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Per-crisis breakdown */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <GlowCard glowColor="rgba(96, 165, 250, 0.2)" style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[TYPE4.cardTitle, RTL]}>פירוט לפי משבר</Text>
            {result.predictions.map((pred) => {
              const event = CRISIS_EVENTS.find((e) => e.id === pred.eventId);
              return (
                <View key={pred.eventId} style={styles.breakdownRow}>
                  <LottieIcon source={SIM_LOTTIE.clock} size={20} />
                  <Text style={[styles.breakdownName, RTL]}>{event?.name ?? pred.eventId}</Text>
                  <Text
                    style={[
                      styles.breakdownValue,
                      { color: accuracyColor(pred.accuracy) },
                    ]}
                  >
                    {pred.accuracy} נק׳
                  </Text>
                </View>
              );
            })}
          </View>
        </GlowCard>
      </Animated.View>

      {/* Best / worst */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.statsRow}>
        {result.bestPrediction && (
          <GlowCard glowColor="rgba(74, 222, 128, 0.2)" style={{ ...sim4Styles.scoreCard, flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}>
            <Text style={[styles.miniStatValue, { color: SIM4.gain }]}>{result.bestPrediction.accuracy}</Text>
            <Text style={[styles.miniStatLabel, RTL]}>הכי טוב</Text>
          </GlowCard>
        )}
        {result.worstPrediction && (
          <GlowCard glowColor="rgba(239, 68, 68, 0.2)" style={{ ...sim4Styles.scoreCard, flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}>
            <Text style={[styles.miniStatValue, { color: SIM4.loss }]}>{result.worstPrediction.accuracy}</Text>
            <Text style={[styles.miniStatLabel, RTL]}>הכי חלש</Text>
          </GlowCard>
        )}
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)}>
        <GlowCard glowColor="rgba(212, 175, 55, 0.3)" style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.insightRow}>
              <LottieIcon source={SIM_LOTTIE.shield} size={22} />
              <Text style={sim4Styles.insightText}>
                כל משבר בהיסטוריה הסתיים בהתאוששות. הסבלנות היא הנשק הסודי של המשקיע.
              </Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(600).delay(600)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={SIM_LOTTIE.replay} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={SIM_LOTTIE.arrowLeft} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────

interface CrisisTimelineScreenProps {
  onComplete?: (score: number) => void;
}

export function CrisisTimelineScreen({ onComplete }: CrisisTimelineScreenProps) {
  const {
    state,
    currentEvent,
    totalEvents,
    latestPrediction,
    submitPrediction,
    advance,
    calculateResult,
    reset,
  } = useCrisisTimeline();


  const cardScale = useSharedValue(1);

  const handlePredict = useCallback((months: number) => {
    if (!currentEvent) return;
    heavyHaptic();
    submitPrediction(currentEvent.id, months);
    cardScale.value = withSequence(
      withSpring(1.05, SPRING_SNAPPY),
      withSpring(1, SPRING_SNAPPY),
    );
  }, [currentEvent, submitPrediction, cardScale]);

  const handleAdvance = useCallback(() => {
    advance();
  }, [advance]);

  const handleReplay = useCallback(() => {
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    const result = calculateResult();
    onComplete?.(result?.totalScore ?? 0);
  }, [calculateResult, onComplete]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Score screen
  if (state.isComplete) {
    const result = calculateResult();
    if (!result) return null;
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
        <ScoreScreenInner result={result} onReplay={handleReplay} onContinue={handleContinue} />
      </SimLottieBackground>
    );
  }

  if (!currentEvent) return null;

  const progress = ((state.currentEventIndex + 1) / totalEvents) * 100;

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text accessibilityRole="header" style={[TYPE4.gradientLabel, RTL]}>
            משבר {state.currentEventIndex + 1} מתוך {totalEvents}
          </Text>
          <View style={[sim4Styles.progressTrack, { transform: [{ scaleX: -1 }] }]}>
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[sim4Styles.progressFill, { width: `${progress}%`, backgroundColor: '#0891b2' }]}
            />
          </View>
        </View>

        {/* Crisis card */}
        <Animated.View entering={FadeInDown.duration(400)} style={cardAnimStyle}>
          <GlowCard glowColor="rgba(14, 165, 233, 0.15)" style={sim4Styles.gameCardElevated}>
            <View style={{ padding: 16, gap: 10 }}>
              {/* Year + Finn + name */}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 40, height: 40 }} contentFit="contain" />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={crisisStyles.year}>{currentEvent.year}</Text>
                  <Text style={[crisisStyles.name, RTL]}>{currentEvent.name}</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={[TYPE4.cardBody, RTL]}>{currentEvent.description}</Text>

              {/* Stats */}
              <View style={crisisStyles.statsRow}>
                <View style={crisisStyles.statBox}>
                  <Text style={[crisisStyles.statValue, { color: SIM4.loss }]}>
                    {currentEvent.peakToTrough}%
                  </Text>
                  <Text style={[crisisStyles.statLabel, RTL]}>ירידה</Text>
                </View>
                <View style={crisisStyles.statBox}>
                  <Text style={crisisStyles.statValue}>
                    {currentEvent.spLevel.toLocaleString('he-IL')}
                  </Text>
                  <Text style={[crisisStyles.statLabel, RTL]}>S&P 500 בשפל</Text>
                </View>
              </View>
            </View>
          </GlowCard>
        </Animated.View>

        {/* Prediction or Reveal */}
        {!state.showingReveal ? (
          <Animated.View entering={FadeInUp.duration(500).delay(200)}>
            <PredictionButtons onSelect={handlePredict} />
          </Animated.View>
        ) : latestPrediction ? (
          <RevealCard
            accuracy={latestPrediction.accuracy}
            predicted={latestPrediction.predictedRecovery}
            actual={latestPrediction.actual}
            grahamLesson={currentEvent.grahamLesson}
            crowdAction={currentEvent.crowdAction}
            surprisingFact={currentEvent.surprisingFact}
            onNext={handleAdvance}
            isLast={state.currentEventIndex >= totalEvents - 1}
          />
        ) : null}

      </ScrollView>
    </SimLottieBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const crisisStyles = StyleSheet.create({
  emoji: {
    fontSize: 48,
  },
  year: {
    fontSize: 32,
    fontWeight: '900',
    color: SIM4.textPrimary,
    letterSpacing: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: SIM4.textPrimary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: SIM4.cardBorder,
    paddingTop: 12,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: SIM4.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: SIM4.textOnGradient,
    ...SHADOW_STRONG,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
    lineHeight: 22,
  },
  progressRow: {
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  breakdownEmoji: {
    fontSize: 18,
    marginLeft: 8,
  },
  breakdownName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  miniStatValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  miniStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textSecondary,
    marginTop: 2,
  },
});
