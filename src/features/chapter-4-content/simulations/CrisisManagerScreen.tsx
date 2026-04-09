/**
 * SIM 4-27: מנהל המשבר (Crisis Manager) — Module 4-27
 * Navigate 5 historical crises — sell / hold / buy → compare to hold strategy.
 */

import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useCrisisManager } from './useCrisisManager';
import { TOTAL_EVENTS } from './crisisManagerData';
import { SIM4, SHADOW_STRONG, SHADOW_LIGHT, RTL, sim4Styles, GRADE_COLORS4 } from './simTheme';
import type { PlayerAction, CrisisEvent, CrisisRound, CrisisScore } from './crisisManagerTypes';
import { formatShekel } from '../../../utils/format';
import { useSimReward } from '../../../hooks/useSimReward';

const SIM_COMPLETE_XP = 30;
const SIM_COMPLETE_COINS = 40;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
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

function getActionLabel(action: PlayerAction): string {
  switch (action) {
    case 'sell': return 'מכרת 📉';
    case 'hold': return 'החזקת ✊';
    case 'buy': return 'קנית 🛒';
  }
}

function getActionFeedback(
  action: PlayerAction,
  event: CrisisEvent,
): { isCorrect: boolean; message: string } {
  switch (action) {
    case 'sell':
      return {
        isCorrect: false,
        message: `מכרת בפאניקה — פספסת התאוששות של ${event.postRecoveryGainPercent}% שהגיעה אחרי ${event.recoveryMonths} חודשים`,
      };
    case 'hold':
      return {
        isCorrect: true,
        message: `החזקת מעמד דרך ${event.title} — הפסדת ${event.marketDropPercent}% אבל התאוששת ${event.postRecoveryGainPercent}%`,
      };
    case 'buy':
      return {
        isCorrect: true,
        message: `קנית בהנחה בזמן ${event.title} — מינפת את ההתאוששות פי 2!`,
      };
  }
}

/* ================================================================== */
/*  ProgressDots — 5 event indicators                                   */
/* ================================================================== */

function ProgressDots({
  total,
  currentIndex,
  rounds,
}: {
  total: number;
  currentIndex: number;
  rounds: CrisisRound[];
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => {
        let bg = 'rgba(255,255,255,0.25)';
        let borderColor = 'rgba(255,255,255,0.4)';

        if (i < rounds.length) {
          const round = rounds[i];
          const good = round.playerBalanceAfter >= round.holdBalanceAfter;
          bg = good ? '#4ade80' : '#ef4444';
          borderColor = good ? '#22c55e' : '#dc2626';
        } else if (i === currentIndex) {
          bg = 'rgba(255,255,255,0.6)';
          borderColor = '#ffffff';
        }

        return (
          <View
            key={i}
            style={[dotStyles.dot, { backgroundColor: bg, borderColor }]}
          />
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  CrashChart — simple mini-chart showing crash shape                  */
/* ================================================================== */

function CrashChart({
  dropPercent,
  recoveryGainPercent,
}: {
  dropPercent: number;
  recoveryGainPercent: number;
}) {
  const CHART_H = 70;
  const preH = CHART_H;
  const bottomH = CHART_H * (1 - dropPercent / 100);
  const afterH = Math.min(CHART_H * 1.15, bottomH * (1 + recoveryGainPercent / 100));

  return (
    <View style={crashStyles.container}>
      <View style={crashStyles.barRow}>
        <View style={crashStyles.barWrapper}>
          <View style={[crashStyles.bar, { height: preH, backgroundColor: '#4ade80' }]} />
          <Text style={crashStyles.barLabel}>לפני</Text>
        </View>
        <View style={crashStyles.barWrapper}>
          <View style={[crashStyles.bar, { height: bottomH, backgroundColor: '#ef4444' }]} />
          <Text style={[crashStyles.barLabel, { color: '#ef4444' }]}>-{dropPercent}%</Text>
        </View>
        <View style={crashStyles.barWrapper}>
          <View style={[crashStyles.bar, { height: afterH, backgroundColor: '#60a5fa' }]} />
          <Text style={crashStyles.barLabel}>התאוששות</Text>
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  ScoreScreen — final results                                         */
/* ================================================================== */

function ScoreScreen({
  score,
  rounds,
  onReplay,
  onContinue,
}: {
  score: CrisisScore;
  rounds: CrisisRound[];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S' || score.grade === 'A');

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
        <Text style={sim4Styles.gradeLabel}>{score.gradeLabel}</Text>
      </Animated.View>

      {/* Portfolio comparison */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>התיק שלך</Text>
              </View>
              <Text
                style={[
                  sim4Styles.scoreRowValue,
                  { color: score.beatHoldStrategy ? SIM4.success : SIM4.danger },
                ]}
              >
                {formatShekel(score.finalBalance)}
              </Text>
            </View>

            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_SHIELD} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>אסטרטגיית החזקה</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: SIM4.textPrimary }]}>
                {formatShekel(score.holdStrategyBalance)}
              </Text>
            </View>

            <View style={sim4Styles.scoreDivider}>
              <Text style={sim4Styles.scoreTotalLabel}>הפרש</Text>
              <Text
                style={[
                  sim4Styles.scoreTotalValue,
                  { color: score.beatHoldStrategy ? SIM4.success : SIM4.danger },
                ]}
              >
                {score.difference > 0 ? '+' : ''}{formatShekel(score.difference)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Per-crisis breakdown */}
      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>פירוט לפי משבר</Text>
            {rounds.map((round) => {
              const good = round.playerBalanceAfter >= round.holdBalanceAfter;
              return (
                <View key={round.event.id} style={scoreStyles.breakdownRow}>
                  <View style={scoreStyles.breakdownLeft}>
                    <Text style={scoreStyles.breakdownEmoji}>{round.event.emoji}</Text>
                    <Text style={[scoreStyles.breakdownName, RTL]}>
                      {round.event.title} ({round.event.year})
                    </Text>
                  </View>
                  <View style={scoreStyles.breakdownRight}>
                    <Text style={[scoreStyles.breakdownVerdict, { color: good ? '#16a34a' : '#ef4444' }]}>
                      {good ? '✓' : '✗'}
                    </Text>
                    <Text style={[scoreStyles.breakdownAction, RTL]}>
                      {round.action ? getActionLabel(round.action) : '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
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
                הזמן בשוק חשוב יותר מתזמון השוק. משקיעים שמחזיקים לאורך זמן מנצחים כמעט תמיד את אלה שמנסים לתזמן.
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

interface CrisisManagerScreenProps {
  onComplete?: (score: number) => void;
}

export function CrisisManagerScreen({ onComplete }: CrisisManagerScreenProps) {
  const {
    state,
    currentEvent,
    lastRound,
    score,
    submitAction,
    nextEvent,
    reset,
  } = useCrisisManager();

  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);

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

  // Button pulse animation
  const btnPulse = useSharedValue(1);
  const pulseActive = !state.showingResult && !state.isComplete;

  if (pulseActive) {
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );
  } else {
    cancelAnimation(btnPulse);
    btnPulse.value = withTiming(1, { duration: 200 });
  }

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  const handleAction = useCallback(
    (action: PlayerAction) => {
      tapHaptic();
      submitAction(action);
      if (action === 'sell') {
        heavyHaptic();
      }
    },
    [submitAction],
  );

  const handleNext = useCallback(() => {
    tapHaptic();
    nextEvent();
  }, [nextEvent]);

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

  // Feedback for current round
  const feedback =
    lastRound && lastRound.action
      ? getActionFeedback(lastRound.action, lastRound.event)
      : null;

  // ── Score Phase ───────────────────────────────────────────────────
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
        <ScoreScreen
          score={score}
          rounds={state.rounds}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Game Phase ────────────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <View style={styles.container}>
        <View style={[{ flex: 1 }, styles.scrollContent]}>
          {/* Compact header: title + balance in one row */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <LottieIcon source={LOTTIE_SHIELD} size={20} />
              <Text accessibilityRole="header" style={[styles.title, { fontSize: 18 }]}>מנהל המשבר</Text>
            </View>
            <Text accessibilityLiveRegion="polite" style={[styles.balanceValue, { fontSize: 18 }]}>{formatShekel(state.playerBalance)}</Text>
          </View>

          {/* Progress dots — RTL, compact */}
          <View style={{ transform: [{ scaleX: -1 }], marginBottom: 4 }}>
            <ProgressDots
              total={TOTAL_EVENTS}
              currentIndex={state.currentEventIndex}
              rounds={state.rounds}
            />
          </View>

          {/* Crisis card */}
          {currentEvent && !state.showingResult && (
            <Animated.View entering={FadeInUp.delay(200)} key={currentEvent.id}>
              <GlowCard glowColor="rgba(220,38,38,0.2)" style={{ backgroundColor: SIM4.cardBg }}>
                {/* Crisis header */}
                <View style={crisisStyles.header}>
                  <Text style={crisisStyles.emoji}>{currentEvent.emoji}</Text>
                  <View style={crisisStyles.headerText}>
                    <Text style={[crisisStyles.title, RTL]}>{currentEvent.title}</Text>
                    <Text style={crisisStyles.year}>{currentEvent.year}</Text>
                  </View>
                </View>

                {/* Headline */}
                <Text style={[crisisStyles.headline, RTL]}>{currentEvent.headline}</Text>

                {/* Drop + Recovery — compact row */}
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around', marginTop: 8 }}>
                  <View style={[crisisStyles.dropBadge, { marginTop: 0 }]}>
                    <Text style={crisisStyles.dropText}>📉 -{currentEvent.marketDropPercent}%</Text>
                  </View>
                  <View style={[crisisStyles.dropBadge, { marginTop: 0, backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }]}>
                    <Text style={[crisisStyles.dropText, { color: SIM4.success }]}>📈 +{currentEvent.postRecoveryGainPercent}%</Text>
                  </View>
                </View>

                <Text style={[crisisStyles.recoveryText, RTL, { marginTop: 6 }]}>
                  ⏱️ זמן התאוששות: {currentEvent.recoveryMonths} חודשים
                </Text>
              </GlowCard>
            </Animated.View>
          )}

          {/* Action buttons */}
          {!state.showingResult && currentEvent && (
            <Animated.View entering={FadeInUp.delay(300)} style={styles.actionRow}>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleAction('sell')}
                  accessibilityRole="button"
                  accessibilityLabel="למכור"
                  style={styles.sellBtn}
                >
                  <Text style={styles.actionBtnText}>למכור 📉</Text>
                </AnimatedPressable>
              </Animated.View>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleAction('hold')}
                  accessibilityRole="button"
                  accessibilityLabel="להחזיק"
                  style={styles.holdBtn}
                >
                  <Text style={styles.actionBtnText}>להחזיק ✊</Text>
                </AnimatedPressable>
              </Animated.View>
              <Animated.View style={[{ flex: 1 }, btnPulseStyle]}>
                <AnimatedPressable
                  onPress={() => handleAction('buy')}
                  accessibilityRole="button"
                  accessibilityLabel="לקנות"
                  style={styles.buyBtn}
                >
                  <Text style={styles.actionBtnText}>לקנות 🛒</Text>
                </AnimatedPressable>
              </Animated.View>
            </Animated.View>
          )}

          {/* Result after action */}
          {state.showingResult && lastRound && (
            <Animated.View entering={FadeInUp.delay(100)} style={{ marginTop: 16 }}>
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor:
                      state.playerBalance >= state.holdBalance
                        ? SIM4.successLight
                        : SIM4.dangerLight,
                    borderColor:
                      state.playerBalance >= state.holdBalance
                        ? SIM4.successBorder
                        : SIM4.dangerBorder,
                  },
                ]}
              >
                <View style={styles.compRow}>
                  <Text style={[styles.compLabel, RTL]}>💼 היתרה שלך</Text>
                  <Text
                    style={[
                      styles.compValue,
                      {
                        color:
                          state.playerBalance >= state.holdBalance
                            ? SIM4.success
                            : SIM4.danger,
                      },
                    ]}
                  >
                    {formatShekel(state.playerBalance)}
                  </Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={[styles.compLabel, RTL]}>🛡️ אסטרטגיית החזקה</Text>
                  <Text style={[styles.compValue, { color: SIM4.textSecondary }]}>
                    {formatShekel(state.holdBalance)}
                  </Text>
                </View>

                <View style={styles.diffBadge}>
                  <Text
                    style={[
                      styles.diffText,
                      {
                        color:
                          state.playerBalance >= state.holdBalance
                            ? SIM4.success
                            : SIM4.danger,
                      },
                    ]}
                  >
                    {state.playerBalance >= state.holdBalance ? '+' : ''}
                    {formatShekel(state.playerBalance - state.holdBalance)}
                    {state.playerBalance >= state.holdBalance ? ' 🔥' : ' 📉'}
                  </Text>
                </View>
              </View>

              {/* Next button */}
              <AnimatedPressable onPress={handleNext} accessibilityRole="button" accessibilityLabel={state.currentEventIndex < TOTAL_EVENTS - 1 ? 'למשבר הבא' : 'לתוצאות'} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>
                  {state.currentEventIndex < TOTAL_EVENTS - 1
                    ? 'למשבר הבא →'
                    : 'לתוצאות →'}
                </Text>
              </AnimatedPressable>
            </Animated.View>
          )}
        </View>
      </View>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
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
  progressText: {
    color: SIM4.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    ...SHADOW_LIGHT,
  },
  balanceRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  balanceLabel: {
    color: SIM4.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    ...SHADOW_LIGHT,
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    ...SHADOW_STRONG,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  sellBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b91c1c',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  holdBtn: {
    backgroundColor: '#d97706',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b45309',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buyBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#15803d',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textSecondary,
  },
  compValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  diffBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginTop: 4,
  },
  diffText: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  nextBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#312e81',
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});

const crisisStyles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emoji: {
    fontSize: 40,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: SIM4.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  year: {
    color: SIM4.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  headline: {
    color: SIM4.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  dropBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignSelf: 'flex-end',
  },
  dropText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  recoveryText: {
    color: SIM4.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
});

const crashStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 36,
    borderRadius: 6,
    minHeight: 8,
  },
  barLabel: {
    color: SIM4.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});

const scoreStyles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  breakdownTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  breakdownLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  breakdownEmoji: {
    fontSize: 20,
  },
  breakdownName: {
    color: SIM4.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  breakdownRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  breakdownVerdict: {
    fontSize: 18,
    fontWeight: '900',
  },
  breakdownAction: {
    color: SIM4.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
