import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { Lock } from 'lucide-react-native';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { useDailyQuizStore } from './useDailyQuizStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { stripGlossaryTags, renderGlossaryText } from '../glossary/renderGlossaryText';
import { GlossaryTooltip } from '../glossary/GlossaryTooltip';
import type { GlossaryEntry } from '../glossary/glossaryData';
import type { DailyQuiz } from './dailyQuizTypes';

/** Fix bidi issues in mixed Hebrew/English text — wraps English runs with RTL marks */
function fixBidi(text: string): string {
  // Insert RLM (\u200F) before and after English/number runs so they don't break RTL flow
  return text.replace(/([A-Za-z0-9$%€£¥₪,.+\-]+(?:\s+[A-Za-z0-9$%€£¥₪,.+\-]+)*)/g, '\u200F$1\u200F');
}

/** Render text with clickable [[term]] glossary links */
function GlossaryText({
  text,
  style,
  onTermPress,
}: {
  text: string;
  style: object;
  onTermPress: (entry: GlossaryEntry) => void;
}) {
  const nodes = renderGlossaryText(fixBidi(text), {
    highlightColor: '#0891b2',
    onTermPress,
  });
  return <Text style={style}>{nodes}</Text>;
}

interface Props {
  quiz: DailyQuiz;
  isActive: boolean;
  locked?: boolean;
}

export const DailyQuizCard = React.memo(function DailyQuizCard({ quiz, locked = false }: Props) {
  const hasAnsweredToday = useDailyQuizStore((s) => s.hasAnsweredToday);
  const answerQuiz = useDailyQuizStore((s) => s.answerQuiz);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [glossaryEntry, setGlossaryEntry] = useState<GlossaryEntry | null>(null);
  const answered = hasAnsweredToday();

  const handleTermPress = useCallback((entry: GlossaryEntry) => {
    tapHaptic();
    setGlossaryEntry(entry);
  }, []);

  // Pulsing glow for unanswered state
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

  // Remaining hours today
  const hoursLeft = 24 - new Date().getHours();

  const handleAnswer = (index: number) => {
    if (showResult || answered) return;
    tapHaptic();
    setSelectedIndex(index);
    setShowResult(true);

    const wasCorrect = index === quiz.correctAnswerIndex;
    if (wasCorrect) {
      successHaptic();
      useEconomyStore.getState().addXP(quiz.xpReward, 'quiz_correct');
      useEconomyStore.getState().addCoins(quiz.coinReward);
      setShowConfetti(true);
      setShowFlyingCoins(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setTimeout(() => setShowFlyingCoins(false), 1500);
    } else {
      errorHaptic();
    }

    answerQuiz(quiz.date, wasCorrect);
  };

  // Locked — show teaser state (unlocked from stage 1)
  if (locked) {
    return (
      <View style={styles.container}>
        <View
          style={[styles.card, { alignItems: 'center', opacity: 0.85, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
        >
          <Lock size={36} color="#94a3b8" />
          <Text style={[styles.answeredTitle, { color: '#1e293b' }]}>🚨 מבזק פיננסי יומי</Text>
          <Text style={[styles.answeredSub, { marginTop: 4, color: '#64748b' }]}>נפתח בהגעה לשלב 1</Text>
        </View>
      </View>
    );
  }

  // Already answered — show result state
  if (answered && !showResult) {
    return (
      <View style={styles.container}>
        <Animated.View>
          <View
            style={[styles.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
          >
            <Text style={styles.answeredIcon}>✅</Text>
            <Text style={[styles.answeredTitle, { color: '#1e293b' }]}>ענית על המבזק היומי!</Text>
            <Text style={[styles.answeredSub, { color: '#64748b' }]}>חזור מחר לשאלה חדשה</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingCoins && <FlyingRewards type="coins" amount={quiz.coinReward} onComplete={() => setShowFlyingCoins(false)} />}
      <Animated.View
        style={[
          !showResult && {
            shadowColor: '#38bdf8',
            shadowRadius: 20,
            elevation: 8,
          },
          !showResult && glowStyle,
        ]}
      >
        <View
          style={[styles.card, {
            backgroundColor: showResult
              ? (selectedIndex === quiz.correctAnswerIndex ? '#f0f9ff' : '#fff7ed')
              : '#ffffff',
            borderColor: showResult
              ? (selectedIndex === quiz.correctAnswerIndex ? '#7dd3fc' : '#fed7aa')
              : '#bae6fd',
          }]}
        >
          {/* Header */}
          {!showResult && (
            <View style={styles.headerRow}>
              <View style={styles.lottieWrap}>
                <LottieView
                  source={require('../../../assets/lottie/wired-flat-411-news-newspaper-hover-pinch.json')}
                  style={styles.lottieIcon}
                  autoPlay
                  loop
                 />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>🚨 מבזק פיננסי יומי</Text>
                <Text style={styles.headerSub}>{fixBidi(stripGlossaryTags(quiz.userFacingTitle))}</Text>
                <Text style={styles.headerDate}>{new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
            </View>
          )}

          {/* Data badge */}
          <View style={styles.dataBadge}>
            <Text style={styles.dataBadgeLabel}>{quiz.sourceLabel}</Text>
            <Text style={styles.dataBadgeValue}>{quiz.sourceValue}</Text>
          </View>

          {/* Citation — real news quote with glossary links */}
          {quiz.citation && (
            <View style={styles.citationBox}>
              <Text style={styles.citationLabel}>📰 אקטואלי</Text>
              <GlossaryText text={quiz.citation} style={styles.citationText} onTermPress={handleTermPress} />
              {quiz.historicalExample ? <GlossaryText text={`📖 ${quiz.historicalExample}`} style={styles.citationHistory} onTermPress={handleTermPress} /> : null}
            </View>
          )}

          {/* Question with glossary links */}
          <GlossaryText text={quiz.question} style={styles.question} onTermPress={handleTermPress} />

          {/* Options */}
          <View style={styles.optionsContainer}>
            {quiz.options.map((option, i) => {
              const isCorrect = i === quiz.correctAnswerIndex;
              const isSelected = i === selectedIndex;

              let optionStyle = styles.optionDefault;
              if (showResult) {
                if (isCorrect) optionStyle = styles.optionCorrect;
                else if (isSelected) optionStyle = styles.optionWrong;
              }

              return (
                <Pressable
                  key={i}
                  onPress={() => handleAnswer(i)}
                  disabled={showResult}
                >
                  <Animated.View
                    style={[styles.option, optionStyle]}
                  >
                    <GlossaryText
                      text={`${showResult && isCorrect ? '✅ ' : ''}${showResult && isSelected && !isCorrect ? '❌ ' : ''}${option}`}
                      style={[
                        styles.optionText,
                        showResult && isCorrect && { color: '#38bdf8' },
                        showResult && isSelected && !isCorrect && { color: '#f87171' },
                      ]}
                      onTermPress={handleTermPress}
                    />
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

          {/* Explanation (after answer) */}
          {showResult && (
            <Animated.View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>💡 תכל׳ס</Text>
              <GlossaryText text={quiz.explanation} style={styles.explanationText} onTermPress={handleTermPress} />
            </Animated.View>
          )}

          {/* Timer (before answer) */}
          {!showResult && (
            <View style={styles.rewardRow}>
              <Text style={styles.timerText}>נותרו {hoursLeft} שעות</Text>
            </View>
          )}

          {/* Result reward (after correct answer) */}
          {showResult && selectedIndex === quiz.correctAnswerIndex && (
            <Animated.View style={styles.rewardResult}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldCoinIcon size={18} />
                <Text style={styles.rewardResultText}>+{quiz.coinReward}</Text>
                <Text style={[styles.rewardResultText, { marginLeft: 12 }]}>+{quiz.xpReward} XP</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Glossary tooltip — slides up from bottom */}
      <GlossaryTooltip
        entry={glossaryEntry}
        visible={glossaryEntry !== null}
        onClose={() => setGlossaryEntry(null)}
      />
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
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    backgroundColor: '#ffffff',
    gap: 12,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  lottieWrap: {
    width: 24,
    height: 24,
    overflow: 'hidden',
  },
  lottieIcon: {
    width: 24,
    height: 24,
  },
  headerTextCol: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0891b2',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  headerSub: {
    fontSize: 12,
    color: '#475569',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
  },
  headerDate: {
    fontSize: 11,
    color: '#94a3b8',
    writingDirection: 'rtl' as const,
    textAlign: 'right' as const,
    marginTop: 2,
    fontWeight: '600',
  },
  dataBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  dataBadgeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  dataBadgeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0891b2',
    writingDirection: 'ltr' as const,
    textAlign: 'left' as const,
  },
  question: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  optionDefault: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  optionCorrect: {
    backgroundColor: '#ecfdf5',
    borderColor: '#34d399',
  },
  optionWrong: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  explanationBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0891b2',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rewardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardBadge: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891b2',
  },
  timerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  rewardResult: {
    alignSelf: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rewardResultText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0891b2',
  },
  answeredIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  answeredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  answeredSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  citationBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  citationLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  citationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
  },
  citationHistory: {
    fontSize: 11,
    color: '#64748b',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 22,
  },
});
