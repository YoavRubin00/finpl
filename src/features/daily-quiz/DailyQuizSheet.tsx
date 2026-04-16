import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { useDailyQuizStore } from './useDailyQuizStore';
import { renderGlossaryText } from '../glossary/renderGlossaryText';
import { GlossaryTooltip } from '../glossary/GlossaryTooltip';
import type { GlossaryEntry } from '../glossary/glossaryData';
import type { DailyQuiz } from './dailyQuizTypes';

interface Props {
  visible: boolean;
  quiz: DailyQuiz;
  onClose: () => void;
}

/**
 * Render text with [[term]] glossary support (dark theme).
 */
function GlossaryDarkText({
  text,
  style,
  onTermPress,
}: {
  text: string;
  style: object;
  onTermPress: (entry: GlossaryEntry) => void;
}) {
  const nodes = renderGlossaryText(text, {
    highlightColor: '#38bdf8',
    onTermPress,
  });
  return <Text style={style}>{nodes}</Text>;
}

export function DailyQuizSheet({ visible, quiz, onClose }: Props) {
  const answerQuiz = useDailyQuizStore((s) => s.answerQuiz);
  const hasAnsweredToday = useDailyQuizStore((s) => s.hasAnsweredToday);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [glossaryEntry, setGlossaryEntry] = useState<GlossaryEntry | null>(null);

  const handleTermPress = useCallback((entry: GlossaryEntry) => {
    tapHaptic();
    setGlossaryEntry(entry);
  }, []);

  const handleAnswer = (index: number) => {
    if (showResult || hasAnsweredToday()) return;
    tapHaptic();
    setSelectedIndex(index);
    setShowResult(true);

    const wasCorrect = index === quiz.correctAnswerIndex;
    if (wasCorrect) {
      successHaptic();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      errorHaptic();
    }

    answerQuiz(quiz.date, wasCorrect);
  };

  const handleClose = () => {
    setSelectedIndex(null);
    setShowResult(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} accessibilityViewIsModal={true}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityRole="button" accessibilityLabel="סגור חידון יומי">
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()} accessible={false}>
          {showConfetti && <ConfettiExplosion />}
          <LinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            style={styles.sheet}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Handle bar */}
              <View style={styles.handle} />

              {/* Data header */}
              <View style={styles.dataHeader}>
                <Text style={styles.dataLabel}>{quiz.sourceLabel}</Text>
                <Text style={styles.dataValue}>{quiz.sourceValue}</Text>
              </View>

              {/* Citation — real news quote */}
              {quiz.citation ? (
                <View style={styles.citationBox}>
                  <Text style={styles.citationLabel}>📰 אקטואלי</Text>
                  <GlossaryDarkText
                    text={quiz.citation}
                    style={styles.citationText}
                    onTermPress={handleTermPress}
                  />
                  {quiz.historicalExample ? (
                    <GlossaryDarkText
                      text={`📖 ${quiz.historicalExample}`}
                      style={styles.citationHistory}
                      onTermPress={handleTermPress}
                    />
                  ) : null}
                </View>
              ) : null}

              {/* Question */}
              <GlossaryDarkText
                text={quiz.question}
                style={styles.question}
                onTermPress={handleTermPress}
              />

              {/* Options */}
              <View style={styles.optionsContainer}>
                {quiz.options.map((option, i) => {
                  const isCorrect = i === quiz.correctAnswerIndex;
                  const isSelected = i === selectedIndex;

                  let bgColor = 'rgba(255,255,255,0.08)';
                  let borderColor = 'rgba(255,255,255,0.15)';
                  if (showResult && isCorrect) {
                    bgColor = 'rgba(34,197,94,0.2)';
                    borderColor = '#22c55e';
                  } else if (showResult && isSelected && !isCorrect) {
                    bgColor = 'rgba(239,68,68,0.2)';
                    borderColor = '#ef4444';
                  }

                  return (
                    <Pressable key={i} onPress={() => handleAnswer(i)} disabled={showResult} accessibilityRole="button" accessibilityLabel={`תשובה: ${option}`}>
                      <Animated.View
                        entering={FadeInDown.duration(250).delay(i * 80)}
                        style={[styles.option, { backgroundColor: bgColor, borderColor }]}
                      >
                        <Text style={styles.optionText}>
                          {showResult && isCorrect && '✅ '}
                          {showResult && isSelected && !isCorrect && '❌ '}
                          {option}
                        </Text>
                      </Animated.View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Result feedback */}
              {showResult && (
                <Animated.View entering={FadeInDown.duration(300).delay(300)}>
                  {selectedIndex === quiz.correctAnswerIndex ? (
                    <View style={styles.resultCorrect}>
                      <Text style={styles.resultTitle}>נכון!</Text>
                      <Text style={styles.resultReward}>+{quiz.xpReward} XP  +{quiz.coinReward} </Text>
                    </View>
                  ) : (
                    <View style={styles.resultWrong}>
                      <Text style={styles.resultTitle}>😔 טעות</Text>
                    </View>
                  )}

                  {/* Explanation */}
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>💡 תכל׳ס</Text>
                    <GlossaryDarkText
                      text={quiz.explanation}
                      style={styles.explanationText}
                      onTermPress={handleTermPress}
                    />
                  </View>

                  {/* Close button */}
                  <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="סגור חלון">
                    <Text style={styles.closeBtnText}>הבנתי, תודה!</Text>
                  </Pressable>
                </Animated.View>
              )}
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>

      {/* Glossary tooltip (dark mode) */}
      <GlossaryTooltip
        entry={glossaryEntry}
        visible={glossaryEntry !== null}
        onClose={() => setGlossaryEntry(null)}
        dark
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dataHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dataLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fde047',
  },
  question: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f1f5f9',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 32,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  option: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 24,
  },
  resultCorrect: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  resultWrong: {
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f1f5f9',
  },
  resultReward: {
    fontSize: 17,
    fontWeight: '700',
    color: '#22c55e',
  },
  explanationBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fde047',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.85)',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  closeBtn: {
    backgroundColor: 'rgba(250,204,21,0.2)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  },
  closeBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fde047',
    writingDirection: 'rtl',
  },
  citationBox: {
    backgroundColor: 'rgba(250,204,21,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.2)',
    marginBottom: 16,
    gap: 8,
  },
  citationLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fde047',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  citationText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 28,
  },
  citationHistory: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 23,
  },
});
