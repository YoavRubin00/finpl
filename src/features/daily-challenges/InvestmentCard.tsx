import React, { useState, useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { tapHaptic, successHaptic } from '../../utils/haptics';
// import { renderGlossaryText } from '../glossary/renderGlossaryText';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { useDailyChallengesStore } from './use-daily-challenges-store';
import { useDailyLogStore } from '../daily-summary/useDailyLogStore';
import { getTodayInvestment } from './investment-data';
import { MAX_DAILY_PLAYS, CHALLENGE_XP_REWARD, CHALLENGE_COIN_REWARD } from './daily-challenge-types';
import type { InvestmentOption } from './daily-challenge-types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  isActive: boolean;
}

export const InvestmentCard = React.memo(function InvestmentCard({ isActive }: Props) {
  const hasInvestmentAnsweredToday = useDailyChallengesStore((s) => s.hasInvestmentAnsweredToday);
  const getInvestmentPlaysToday = useDailyChallengesStore((s) => s.getInvestmentPlaysToday);
  const answerInvestment = useDailyChallengesStore((s) => s.answerInvestment);
  const answered = hasInvestmentAnsweredToday();
  const playsToday = getInvestmentPlaysToday();
  const remaining = MAX_DAILY_PLAYS - playsToday;

  const [selectedOption, setSelectedOption] = useState<InvestmentOption | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);

  const scenario = getTodayInvestment();
  const budget = scenario.virtualBudget;

  // Pulsing glow
  const glow = useSharedValue(0.3);
  useEffect(() => {
    if (!answered && !showResult) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200 }),
          withTiming(0.3, { duration: 1200 }),
        ),
        -1,
        true,
      );
    }
  }, [answered, showResult, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  const handleAnswer = (option: InvestmentOption) => {
    if (showResult || answered) return;
    tapHaptic();
    setSelectedOption(option);
    setShowResult(true);
    successHaptic();

    setShowFlyingCoins(true);
    if (option.returnMultiplier > 1.1) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }

    const today = new Date().toISOString().slice(0, 10);
    answerInvestment(today);

    const log = useDailyLogStore.getState();
    log.logEvent({ type: 'investment', title: scenario.macroHeadline, timestamp: Date.now(), xpEarned: CHALLENGE_XP_REWARD });
    log.addTodayXP(CHALLENGE_XP_REWARD);
    log.addTodayCoins(CHALLENGE_COIN_REWARD);
  };

  const resultValue = selectedOption
    ? Math.round(budget * selectedOption.returnMultiplier)
    : budget;
  const profit = resultValue - budget;
  const isProfit = profit >= 0;

  // Already answered — compact state
  if (answered && !showResult) {
    return (
      <View style={styles.container}>
        <View style={styles.cardDone}>
          <Text style={styles.answeredIcon}>📈</Text>
          <Text style={[styles.answeredTitle, RTL]}>ההשקעה של היום הושלמה!</Text>
          <Text style={[styles.answeredSub, RTL]}>חזור מחר לתרחיש חדש</Text>
        </View>
      </View>
    );
  }

  const playAgain = () => {
    if (answered) return;
    setSelectedOption(null);
    setShowResult(false);
    setShowConfetti(false);
    setShowFlyingCoins(false);
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingCoins && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingCoins(false)}
        />
      )}
      <Animated.View
        style={[
          !showResult && {
            shadowColor: '#0ea5e9',
            shadowRadius: 16,
            elevation: 4,
          },
          !showResult && glowStyle,
        ]}
      >
        <View style={[
          styles.card,
          showResult && isProfit && styles.cardProfit,
          showResult && !isProfit && styles.cardLoss,
        ]}>
          {/* Header */}
          {!showResult && (
            <View style={styles.headerRow}>
              <View style={{ width: 36, height: 36 }} accessible={false}>
                <LottieView source={require('../../../assets/lottie/wired-flat-947-investment-hover-pinch.json')} style={{ width: 36, height: 36 }} autoPlay loop />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={[styles.headerTitle, RTL]}>ההשקעה של היום</Text>
                <Text style={[styles.headerSub, RTL]}>{scenario.macroHeadline}</Text>
              </View>
            </View>
          )}

          {/* Budget badge */}
          {!showResult && (
            <View style={styles.budgetBadge}>
              <Text style={styles.budgetLabel}>התקציב שלך:</Text>
              <Text style={styles.budgetValue}>₪{budget.toLocaleString()}</Text>
            </View>
          )}

          {/* Macro description */}
          <Text style={[styles.macroText, RTL]}>{scenario.macroDescription}</Text>

          {/* Instruction — only before answer */}
          {!showResult && (
            <Text style={[styles.instructionText, RTL]}>
              איפה היית משקיע את הכסף? בחר אפשרות:
            </Text>
          )}

          {/* Result header */}
          {showResult && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.resultHeader}>
              <Text style={[styles.resultLabel, RTL]}>שווי התיק שלך:</Text>
              <Text
                style={[
                  styles.resultValue,
                  { color: isProfit ? '#16a34a' : '#dc2626' },
                ]}
              >
                ₪{resultValue.toLocaleString()}
              </Text>
              <Text
                style={[
                  styles.resultDelta,
                  { color: isProfit ? '#16a34a' : '#dc2626' },
                ]}
              >
                {isProfit ? '+' : ''}
                {profit.toLocaleString()}₪ ({isProfit ? '+' : ''}
                {Math.round((selectedOption!.returnMultiplier - 1) * 100)}%)
              </Text>
            </Animated.View>
          )}

          {/* Options */}
          <View style={styles.optionsContainer}>
            {scenario.options.map((option, i) => {
              const isSelected = selectedOption === option;
              const isBest =
                option.returnMultiplier ===
                Math.max(...scenario.options.map((o) => o.returnMultiplier));

              let optionStyle = styles.optionDefault;
              if (showResult) {
                if (isBest) optionStyle = styles.optionBest;
                else if (isSelected) optionStyle = styles.optionChosen;
              }

              return (
                <Pressable
                  key={i}
                  onPress={() => handleAnswer(option)}
                  disabled={showResult}
                  accessibilityRole="button"
                  accessibilityLabel={`אפשרות השקעה: ${option.label}`}
                >
                  <Animated.View style={[styles.option, optionStyle]}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.optionText,
                        RTL,
                        showResult && isBest && { color: '#16a34a' },
                        showResult && isSelected && !isBest && { color: '#dc2626' },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {showResult && (
                      <Text
                        style={[
                          styles.optionReturn,
                          {
                            color:
                              option.returnMultiplier >= 1 ? '#16a34a' : '#dc2626',
                          },
                        ]}
                      >
                        {option.returnMultiplier >= 1 ? '+' : ''}
                        {Math.round((option.returnMultiplier - 1) * 100)}%
                      </Text>
                    )}
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

          {/* Feedback after answer */}
          {showResult && selectedOption && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.feedbackBox}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 72, height: 72 }} contentFit="contain" />
                <Text style={[styles.feedbackTitle, RTL, { flex: 1 }]}>💡 ניתוח</Text>
              </View>
              <Text style={[styles.feedbackText, RTL]}>{selectedOption.feedback}</Text>
            </Animated.View>
          )}

          {/* Hint (before answer) */}
          {!showResult && (
            <View style={styles.rewardRow}>
              <Text style={styles.hintText}>השקעה של היום</Text>
            </View>
          )}

          {/* Result reward */}
          {showResult && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.rewardResult}>
              <Text style={styles.rewardResultText}>
                +{CHALLENGE_XP_REWARD} XP  +{CHALLENGE_COIN_REWARD} 
              </Text>
            </Animated.View>
          )}

          {/* Replay button */}
          {showResult && !answered && (
            <Pressable onPress={playAgain} style={styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
              <Text style={styles.replayBtnText}>🔄 שחק שוב ({remaining - 1} נותרו)</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 10,
  },
  cardProfit: {
    backgroundColor: '#f0fdf4',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  cardLoss: {
    backgroundColor: '#fef2f2',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  cardDone: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 32,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  budgetBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  budgetLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  macroText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
    lineHeight: 20,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  resultDelta: {
    fontSize: 16,
    fontWeight: '800',
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  optionDefault: {
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderColor: 'rgba(14,165,233,0.25)',
  },
  optionBest: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22c55e',
  },
  optionChosen: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#ef4444',
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  optionReturn: {
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackBox: {
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
  },
  rewardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardBadge: {
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
    writingDirection: 'rtl',
  },
  rewardResult: {
    alignSelf: 'center',
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  rewardResultText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369a1',
  },
  replayBtn: {
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  replayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  answeredIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  answeredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
  },
  answeredSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
