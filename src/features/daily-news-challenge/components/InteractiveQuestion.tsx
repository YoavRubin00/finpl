import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Check, X, MessageCircle, Sparkles } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import type { ChallengeItem } from '../types';

interface InteractiveQuestionProps {
  item: ChallengeItem;
  onAnswered: (selectedIdx: number, wasCorrect: boolean) => void;
  onOpenChat: () => void;
  /** Lock the question if user already answered today (we still render their choice). */
  preAnsweredIdx?: number;
}

/**
 * 4-option multiple-choice question. Animates a result reveal (correct/wrong)
 * + explanation + historical-example panel + "💬 שאל את הקפטן" button.
 */
export function InteractiveQuestion({
  item,
  onAnswered,
  onOpenChat,
  preAnsweredIdx,
}: InteractiveQuestionProps): React.ReactElement {
  const [selected, setSelected] = useState<number | null>(preAnsweredIdx ?? null);
  const showResult = selected !== null;
  const wasCorrect = showResult && selected === item.correctIdx;

  const handleSelect = (idx: number) => {
    if (showResult) return;
    tapHaptic();
    setSelected(idx);
    const correct = idx === item.correctIdx;
    if (correct) successHaptic(); else errorHaptic();
    onAnswered(idx, correct);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.question} allowFontScaling={false}>
        {item.question}
      </Text>

      <View style={styles.options}>
        {item.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = showResult && idx === item.correctIdx;
          const isWrongSelected = showResult && isSelected && !wasCorrect;

          let bgColor: string = STITCH.surfaceLowest;
          let borderColor: string = STITCH.outlineVariant;
          let textColor: string = STITCH.onSurface;

          if (showResult) {
            if (isCorrect) {
              bgColor = '#dcfce7';
              borderColor = '#22c55e';
              textColor = '#15803d';
            } else if (isWrongSelected) {
              bgColor = '#fee2e2';
              borderColor = '#ef4444';
              textColor = '#b91c1c';
            } else {
              bgColor = STITCH.surfaceLow;
              textColor = STITCH.onSurfaceVariant;
            }
          }

          return (
            <Pressable
              key={idx}
              onPress={() => handleSelect(idx)}
              disabled={showResult}
              style={[
                styles.option,
                { backgroundColor: bgColor, borderColor },
                isSelected && !showResult && styles.optionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`תשובה ${idx + 1}: ${opt}`}
            >
              <Text
                style={[styles.optionText, { color: textColor }]}
                allowFontScaling={false}
              >
                {opt}
              </Text>
              {showResult && isCorrect && (
                <View style={[styles.iconCircle, { backgroundColor: '#22c55e' }]}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              )}
              {showResult && isWrongSelected && (
                <View style={[styles.iconCircle, { backgroundColor: '#ef4444' }]}>
                  <X size={14} color="#fff" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Result panel — only shown after answer */}
      {showResult && (
        <Animated.View entering={FadeInDown.duration(280).springify().damping(16)}>
          <View style={[styles.resultPanel, wasCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <View style={styles.resultHeader}>
              {wasCorrect ? (
                <>
                  <Sparkles size={16} color="#15803d" strokeWidth={2.6} />
                  <Text style={[styles.resultHeaderText, { color: '#15803d' }]} allowFontScaling={false}>
                    יפה! תשובה נכונה
                  </Text>
                </>
              ) : (
                <>
                  <Sparkles size={16} color="#b91c1c" strokeWidth={2.6} />
                  <Text style={[styles.resultHeaderText, { color: '#b91c1c' }]} allowFontScaling={false}>
                    טעות — ככה זה באמת:
                  </Text>
                </>
              )}
            </View>
            <Text style={styles.explanation} allowFontScaling={false}>
              {item.explanation}
            </Text>
            {item.historicalExample ? (
              <View style={styles.historyBox}>
                <Text style={styles.historyLabel} allowFontScaling={false}>📚 דוגמה מהעבר</Text>
                <Text style={styles.historyText} allowFontScaling={false}>
                  {item.historicalExample}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Chat button — only after answer, scoped to this item */}
          <Animated.View entering={FadeIn.delay(200).duration(240)}>
            <Pressable
              onPress={() => { tapHaptic(); onOpenChat(); }}
              style={styles.chatButton}
              accessibilityRole="button"
              accessibilityLabel="שאל את הקפטן שארק"
            >
              <MessageCircle size={16} color={STITCH.primary} strokeWidth={2.4} />
              <Text style={styles.chatButtonText} allowFontScaling={false}>
                💬 שאל את הקפטן שארק
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  question: {
    fontSize: 16,
    fontWeight: '800',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 24,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionPressed: {
    backgroundColor: '#e0f2fe',
    borderColor: STITCH.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultPanel: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  resultCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  resultWrong: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  resultHeaderText: {
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  explanation: {
    fontSize: 13,
    fontWeight: '500',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 20,
  },
  historyBox: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  historyText: {
    fontSize: 12,
    fontWeight: '500',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 18,
  },
  chatButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: STITCH.primaryCyan,
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.primary,
    writingDirection: 'rtl',
  },
});
