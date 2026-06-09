import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { X, Check, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { errorHaptic, successHaptic, tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import type { Module } from '../../chapter-1-content/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface QuizPlayerProps {
  module: Module;
  onComplete: () => void;
  onDismiss: () => void;
}

/**
 * Standalone quiz player for the topic-tree. LessonFlowScreen's quiz is
 * inline JSX (~300 lines, fused with the host state machine) and not
 * extractable cheaply — instead, this re-implements the minimum the
 * pilot needs: question + 4 options + correctness reveal + per-question
 * feedback + final "סיים" CTA.
 *
 * Intentionally NOT carried over from the host:
 *   - tap-to-show-formula intermediate screen (mod-1-1 uses a calculator
 *     formula intermediate step in the legacy quiz)
 *   - per-question quizScore + bestScore wire-up to server
 *   - confetti on perfect score
 *   - heart loss + revival flow
 * Phase 2 can layer these in incrementally; for the pilot, the user
 * sees real questions, answers them, and moves on.
 */
export function QuizPlayer({ module, onComplete, onDismiss }: QuizPlayerProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const questions = module.quizzes;
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const { playSound } = useSoundEffect();

  const current = questions[index];
  const showResult = selectedIdx !== null;
  const wasCorrect = showResult && selectedIdx === current?.correctAnswer;

  const handleSelect = useCallback((optionIdx: number) => {
    if (showResult || !current) return;
    setSelectedIdx(optionIdx);
    const correct = optionIdx === current.correctAnswer;
    if (correct) {
      successHaptic();
      try { playSound('modal_open_4'); } catch { /* non-fatal */ }
      setCorrectCount((c) => c + 1);
    } else {
      errorHaptic();
      try { playSound('modal_open_1'); } catch { /* non-fatal */ }
    }
    setRevealedCount((c) => c + 1);
  }, [showResult, current, playSound]);

  const handleNext = useCallback(() => {
    if (index >= total - 1) {
      successHaptic();
      onComplete();
      return;
    }
    tapHaptic();
    setIndex((i) => i + 1);
    setSelectedIdx(null);
  }, [index, total, onComplete]);

  const isPerfectSoFar = revealedCount === correctCount;
  const summary = useMemo(() => `${correctCount}/${total}`, [correctCount, total]);

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={[styles.progressPill, isPerfectSoFar ? styles.progressPillGood : null]}>
            <Text style={styles.progressText} allowFontScaling={false}>
              {`${index + 1}/${total}`}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question — re-mounts on index change for fresh entrance anim */}
          {current && (
            <Animated.View key={`q-${index}`} entering={FadeInUp.duration(280)}>
              <Text style={[styles.question, RTL]} allowFontScaling={false}>
                {current.question}
              </Text>
            </Animated.View>
          )}

          {/* Options */}
          {current && (
            <View style={styles.optionsCol}>
              {current.options.map((opt, optIdx) => {
                const selected = selectedIdx === optIdx;
                const isCorrectOpt = optIdx === current.correctAnswer;
                let optionStyle = styles.option;
                if (showResult) {
                  if (isCorrectOpt) optionStyle = styles.optionCorrect;
                  else if (selected) optionStyle = styles.optionWrong;
                  else optionStyle = styles.optionDim;
                } else if (selected) {
                  optionStyle = styles.optionSelected;
                }
                return (
                  <Pressable
                    key={optIdx}
                    onPress={() => handleSelect(optIdx)}
                    accessibilityRole="button"
                    style={[styles.optionBase, optionStyle]}
                    disabled={showResult}
                  >
                    <Text style={[styles.optionText, RTL]} allowFontScaling={false}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Feedback after selection */}
          {showResult && current && (
            <Animated.View
              entering={FadeIn.duration(280)}
              style={[styles.feedback, wasCorrect ? styles.feedbackGood : styles.feedbackBad]}
            >
              {wasCorrect ? (
                <Check size={18} color="#15803d" strokeWidth={3} />
              ) : (
                <AlertCircle size={18} color="#b91c1c" strokeWidth={3} />
              )}
              <Text style={[styles.feedbackText, RTL]} allowFontScaling={false}>
                {wasCorrect ? current.successFeedback : current.failFeedback}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Sticky "Next" CTA — only after the user has answered */}
        {showResult && (
          <View style={[styles.ctaRow, { paddingBottom: 16 + insets.bottom }]}>
            <Pressable
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={index === total - 1 ? `סיים — ${summary}` : 'המשך לשאלה הבאה'}
              style={styles.ctaPrimary}
            >
              <ChevronLeft size={20} color="#ffffff" strokeWidth={2.6} />
              <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                {index === total - 1 ? `סיים (${summary})` : 'המשך'}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  progressPillGood: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e40af',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  question: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0c4a6e',
    lineHeight: 28,
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  optionsCol: {
    gap: 10,
  },
  optionBase: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  option: {
    backgroundColor: '#ffffff',
    borderColor: '#bfdbfe',
  },
  optionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  optionCorrect: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  optionWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  optionDim: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    opacity: 0.6,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0c4a6e',
    lineHeight: 22,
  },
  feedback: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 14,
  },
  feedbackGood: {
    backgroundColor: '#dcfce7',
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  feedbackBad: {
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0c4a6e',
    lineHeight: 20,
  },
  ctaRow: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  ctaPrimary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
});
