import React, { useState, useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { setPendingFeedScroll } from '../finfeed/FinFeedScreen';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
// glossary rendering available if needed: import { renderGlossaryText } from '../glossary/renderGlossaryText';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { useDailyChallengesStore } from './use-daily-challenges-store';
import { useDailyLogStore } from '../daily-summary/useDailyLogStore';
import { getTodayDilemma } from './dilemma-data';
import { MAX_DILEMMA_DAILY, CHALLENGE_XP_REWARD, CHALLENGE_COIN_REWARD } from './daily-challenge-types';
import type { DilemmaChoice } from './daily-challenge-types';
import { FeedGameShell } from '../finfeed/minigames/shared/FeedGameShell';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  isActive: boolean;
}

export const DilemmaCard = React.memo(function DilemmaCard({ isActive }: Props) {
  const router = useRouter();
  const hasDilemmaAnsweredToday = useDailyChallengesStore((s) => s.hasDilemmaAnsweredToday);
  const getDilemmaPlaysToday = useDailyChallengesStore((s) => s.getDilemmaPlaysToday);
  const answerDilemma = useDailyChallengesStore((s) => s.answerDilemma);
  const answered = hasDilemmaAnsweredToday();
  const playsToday = getDilemmaPlaysToday();
  const remaining = MAX_DILEMMA_DAILY - playsToday;

  const [selectedChoice, setSelectedChoice] = useState<DilemmaChoice | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const dilemma = getTodayDilemma();

  // Pulsing blue glow for unanswered state, must be before any early return
  const glow = useSharedValue(0.3);
  useEffect(() => {
    if (!answered && !showResult) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 }),
        ),
        -1,
        true,
      );
    }
  }, [answered, showResult, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  if (!dilemma || !dilemma.choices) {
    return (
      <FeedGameShell
        gameTitle="האתגר היומי"
        xpReward={CHALLENGE_XP_REWARD}
        coinReward={CHALLENGE_COIN_REWARD}
        accent="rose"
        variant="light"
      >
        <View style={styles.stateBox}>
          <Text style={[styles.answeredTitle, RTL]}>האתגר היומי לא זמין כרגע</Text>
          <Text style={[styles.answeredSub, RTL]}>נסו שוב מאוחר יותר</Text>
        </View>
      </FeedGameShell>
    );
  }
  const scenarioText = dilemma.scenarioText;

  const handleAnswer = (choice: DilemmaChoice, _index: number) => {
    if (showResult || answered) return;
    tapHaptic();
    setSelectedChoice(choice);
    setShowResult(true);

    if (choice.isCorrect) {
      successHaptic();
      setShowConfetti(true);
      setShowFlyingCoins(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setTimeout(() => setShowCelebration(true), 1800);
    } else {
      errorHaptic();
      setTimeout(() => setShowCelebration(true), 2500);
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      answerDilemma(today, choice.isCorrect);

      const log = useDailyLogStore.getState();
      log.logEvent({ type: 'dilemma', title: dilemma.category, timestamp: Date.now(), xpEarned: choice.isCorrect ? CHALLENGE_XP_REWARD : 0 });
      if (choice.isCorrect) {
        log.addTodayXP(CHALLENGE_XP_REWARD);
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
        log.addCorrectAnswer();
      }
    } catch (_e) {
      // Gracefully handle store errors, don't crash the game
    }
  };

  // Already answered, compact completed state
  if (answered && !showResult) {
    return (
      <FeedGameShell
        gameTitle="האתגר היומי"
        xpReward={CHALLENGE_XP_REWARD}
        coinReward={CHALLENGE_COIN_REWARD}
        accent="rose"
        variant="light"
      >
        <View style={styles.stateBox}>
          <Text style={[styles.answeredTitle, RTL]}>האתגר היומי הושלם!</Text>
          <Text style={[styles.answeredSub, RTL]}>חזרו מחר לאתגר חדש</Text>
        </View>
      </FeedGameShell>
    );
  }

  const playAgain = () => {
    if (answered) return;
    setSelectedChoice(null);
    setShowResult(false);
    setShowConfetti(false);
    setShowFlyingCoins(false);
  };

  return (
    <FeedGameShell
      gameTitle="האתגר היומי"
      gameSubtitle={dilemma.category}
      xpReward={CHALLENGE_XP_REWARD}
      coinReward={CHALLENGE_COIN_REWARD}
      accent="rose"
      variant="light"
    >
      {showConfetti && <ConfettiExplosion />}
      {showFlyingCoins && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingCoins(false)}
        />
      )}
      <Animated.View style={!showResult && glowStyle} />
      <View style={[
        styles.innerContent,
        showResult && selectedChoice?.isCorrect && styles.tintCorrect,
        showResult && selectedChoice && !selectedChoice.isCorrect && styles.tintWrong,
      ]}>
        <Text style={[styles.scenarioText, RTL]}>{scenarioText}</Text>

        <View style={styles.choicesContainer}>
          {dilemma.choices.map((choice, i) => {
            const isSelected = selectedChoice === choice;
            const isCorrect = choice.isCorrect;

            let choiceStyle = styles.choiceDefault;
            if (showResult) {
              if (isCorrect) choiceStyle = styles.choiceCorrect;
              else if (isSelected) choiceStyle = styles.choiceWrong;
            }

            return (
              <Pressable
                key={i}
                onPress={() => handleAnswer(choice, i)}
                disabled={showResult}
                accessibilityRole="button"
                accessibilityLabel={`תשובה: ${choice.text}`}
              >
                <Animated.View style={[styles.choice, choiceStyle]}>
                  <Text
                    style={[
                      styles.choiceText,
                      RTL,
                      showResult && isCorrect && { color: '#0369a1' },
                      showResult && isSelected && !isCorrect && { color: '#dc2626' },
                    ]}
                  >
                    {choice.text}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>

        {showResult && selectedChoice && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.feedbackBox}>
            <Text style={[styles.feedbackTitle, RTL]}>תכל׳ס</Text>
            <Text style={[styles.feedbackText, RTL]}>{selectedChoice.feedback}</Text>
          </Animated.View>
        )}

        {showResult && selectedChoice?.isCorrect && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.rewardResult}>
            <Text style={styles.rewardResultText}>
              +{CHALLENGE_XP_REWARD} XP  +{CHALLENGE_COIN_REWARD}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Celebration modal after completing */}
      <Modal visible={showCelebration} transparent animationType="fade" onRequestClose={() => { setShowCelebration(false); router.replace("/(tabs)/learn" as never); }} accessibilityViewIsModal={true}>
        <Pressable
          style={styles.celebrationOverlay}
          onPress={() => { setShowCelebration(false); router.replace("/(tabs)/learn" as never); }}
          accessibilityRole="button"
          accessibilityLabel="סגור חלון חגיגה"
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.celebrationCard}>
            <Animated.View entering={ZoomIn.springify().damping(10)}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 200, height: 200 }} contentFit="contain" />
            </Animated.View>
            <Text style={[styles.celebrationTitle, RTL]}>
              {selectedChoice?.isCorrect ? 'כל הכבוד!' : 'סיימת את האתגר!'}
            </Text>
            <Text style={[styles.celebrationSub, RTL]}>
              {selectedChoice?.isCorrect
                ? 'ענית נכון על האתגר היומי'
                : 'הכי חשוב שלמדת משהו חדש'}
            </Text>
            {selectedChoice?.isCorrect && (
              <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.celebrationRewards}>
                <View style={styles.celebrationBadge}>
                  <Text style={styles.celebrationBadgeText}>+{CHALLENGE_XP_REWARD} XP</Text>
                </View>
                <View style={[styles.celebrationBadge, { backgroundColor: 'rgba(245,200,66,0.15)', borderColor: 'rgba(245,200,66,0.4)' }]}>
                  <GoldCoinIcon size={16} />
                  <Text style={[styles.celebrationBadgeText, { color: '#c8960a' }]}>+{CHALLENGE_COIN_REWARD}</Text>
                </View>
              </Animated.View>
            )}
            <Pressable
              onPress={() => { setShowCelebration(false); setPendingFeedScroll(0); router.replace("/(tabs)/learn" as never); }}
              style={styles.celebrationBtn}
              accessibilityRole="button"
              accessibilityLabel="חזרה לפיד"
            >
              <Text style={styles.celebrationBtnText}>חזרה לפיד</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </FeedGameShell>
  );
});

const styles = StyleSheet.create({
  innerContent: {
    padding: 14,
    gap: 14,
  },
  tintCorrect: {
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  tintWrong: {
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  stateBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  scenarioText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 26,
  },
  choicesContainer: {
    gap: 10,
  },
  choice: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  choiceDefault: {
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderColor: 'rgba(14,165,233,0.25)',
  },
  choiceCorrect: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22c55e',
  },
  choiceWrong: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#ef4444',
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  feedbackBox: {
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 22,
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
  timerText: {
    fontSize: 12,
    color: '#64748b',
    writingDirection: 'rtl',
  },
  rewardResult: {
    alignSelf: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  rewardResultText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
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
  // Celebration modal
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  celebrationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
    borderColor: '#bae6fd',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
  },
  celebrationSub: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  celebrationRewards: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 4,
  },
  celebrationBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
  },
  celebrationBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0891b2',
  },
  celebrationBtn: {
    marginTop: 8,
    backgroundColor: '#0891b2',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: '#0891b2',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  celebrationBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
