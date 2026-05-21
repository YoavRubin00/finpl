import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { DAISY_HAPPY_CELEBRATE_WEBP, DAISY_EMPATHIC_WEBP } from './daisy-assets';
import type { PodcastQuestion, PodcastQuestionOption } from '../chapter-1-content/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Explicit pixel width — alignSelf:'stretch' + width:'100%' were not
// stretching the Pressable on Android. stickyFooter has left/right 16.
const CONTINUE_BTN_W = Dimensions.get('window').width - 32;

/** Gen-Z friendly feedback variants — rotated by question hash so the same
 *  user sees variety across podcasts but a single question stays consistent.
 *  The animated Daisy WebP is the primary celebration; the text is the
 *  voice. Avoids the repetitive "יפה!" → "יפה!" → "יפה!" feeling. */
const CORRECT_TITLES = ['יפה!', 'בול!', 'מצוין!', 'יאללה!', 'איזה ראש!', 'תפסת!'] as const;
const WRONG_TITLES   = ['כמעט!', 'לא בדיוק...', 'אופס', 'טעות חכמה...', 'כמעט שם...'] as const;

/** Deterministic shuffle keyed by question.id so the same question always
 *  presents options in the same order across renders/sessions, but the
 *  correct option isn't always parked at index 1 (the previous data convention). */
function hashStringToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  question: PodcastQuestion;
  questionNumber: 1 | 2;
  onAnswered: (isCorrect: boolean) => void;
  onContinue: () => void;
}

export const PodcastQuestionCard = React.memo(function PodcastQuestionCard({
  question,
  questionNumber,
  onAnswered,
  onContinue,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Shuffled once per question; the correct answer is no longer pinned to index 1.
  const shuffledOptions = useMemo(
    () => seededShuffle(question.options, hashStringToSeed(question.id)),
    [question.id, question.options],
  );

  const selectedOption = selected !== null ? shuffledOptions[selected] : null;
  const isCorrect = selectedOption?.isCorrect ?? false;

  const feedbackTitle = useMemo(() => {
    const pool = isCorrect ? CORRECT_TITLES : WRONG_TITLES;
    return pool[hashStringToSeed(question.id) % pool.length];
  }, [isCorrect, question.id]);

  const handleSelect = useCallback(
    (index: number, option: PodcastQuestionOption) => {
      if (showResult) return;
      tapHaptic();
      setSelected(index);
      setShowResult(true);
      if (option.isCorrect) {
        successHaptic();
      } else {
        errorHaptic();
      }
      onAnswered(option.isCorrect);
    },
    [showResult, onAnswered],
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(360).springify()}
          style={styles.header}
        >
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>
              {question.type === 'comprehension' ? 'הבנת הסיפור' : 'דילמה'}
            </Text>
          </View>
          <Text style={styles.questionNumber}>שאלה {questionNumber}/2</Text>
        </Animated.View>

        {/* Question text */}
        <Animated.View
          entering={FadeInUp.duration(360).delay(40).springify()}
          style={styles.questionCard}
        >
          <Text style={[styles.questionText, RTL]}>{question.question}</Text>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsCol}>
          {shuffledOptions.map((option, idx) => (
            <OptionButton
              key={`${question.id}-${idx}`}
              option={option}
              index={idx}
              isSelected={selected === idx}
              showResult={showResult}
              onPress={() => handleSelect(idx, option)}
            />
          ))}
        </View>

        {/* Feedback box — Daisy on the LEFT (row-reverse first child renders
            on the right in RTL flow, so the text column comes first and the
            Daisy WebP renders to her left), vertically centered next to the
            text block. Bigger WebP (~110) makes the reaction feel like a
            beat, not a decoration. */}
        {showResult && selectedOption ? (
          <Animated.View
            entering={FadeInUp.duration(320).springify()}
            style={styles.feedbackCard}
          >
            <View style={styles.feedbackRow}>
              <View style={styles.feedbackTextCol}>
                <Text style={[styles.feedbackTitle, RTL]}>{feedbackTitle}</Text>
                <Text style={[styles.feedbackBody, RTL]}>{selectedOption.feedback}</Text>
                {isCorrect ? (
                  <View style={styles.rewardRow}>
                    <View style={styles.rewardPill}>
                      <Text style={styles.rewardXP}>+{question.xpReward} XP</Text>
                    </View>
                    <View style={styles.rewardPillCoin}>
                      <GoldCoinIcon size={14} />
                      <Text style={styles.rewardCoin}>+{question.coinReward}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
              <ExpoImage
                source={isCorrect ? DAISY_HAPPY_CELEBRATE_WEBP : DAISY_EMPATHIC_WEBP}
                style={styles.feedbackDaisy}
                contentFit="contain"
                accessible={false}
              />
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Sticky Continue button — always visible above the fold once answer chosen.
          `bottom` respects the Android system nav bar / iOS home indicator inset
          so the button isn't clipped behind it. */}
      {showResult ? (
        <Animated.View
          entering={FadeIn.duration(280)}
          style={[styles.stickyFooter, { bottom: insets.bottom + 12 }]}
        >
          <Pressable
            onPress={() => { tapHaptic(); onContinue(); }}
            accessibilityRole="button"
            accessibilityLabel={questionNumber === 1 ? 'לשאלה הבאה' : 'המשך'}
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.continueBtnText}>
              {questionNumber === 1 ? 'לשאלה הבאה' : 'המשך'}
            </Text>
            <ChevronLeft color="#ffffff" size={22} strokeWidth={2.6} />
          </Pressable>
        </Animated.View>
      ) : null}

    </View>
  );
});

interface OptionProps {
  option: PodcastQuestionOption;
  index: number;
  isSelected: boolean;
  showResult: boolean;
  onPress: () => void;
}

function OptionButton({ option, index, isSelected, showResult, onPress }: OptionProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => {
    if (showResult) return;
    scale.value = withSpring(0.97, { damping: 12 });
  };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 14 }); };
  const handlePress = () => {
    if (showResult) return;
    scale.value = withSequence(
      withTiming(1.03, { duration: 80 }),
      withSpring(1, { damping: 14 }),
    );
    onPress();
  };

  const showAsCorrect = showResult && option.isCorrect;
  const showAsWrong = showResult && isSelected && !option.isCorrect;
  const dimmed = showResult && !option.isCorrect && !isSelected;

  return (
    <Animated.View
      entering={FadeInUp.duration(320).delay(120 + index * 70).springify()}
      style={animStyle}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={showResult}
        accessibilityRole="button"
        accessibilityLabel={`תשובה: ${option.text}`}
        style={[
          styles.optionBtn,
          showAsCorrect && styles.optionCorrect,
          showAsWrong && styles.optionWrong,
          dimmed && styles.optionDim,
        ]}
      >
        <View style={[styles.optionLetterCircle, showAsCorrect && styles.optionLetterCorrect, showAsWrong && styles.optionLetterWrong]}>
          <Text style={[styles.optionLetter, (showAsCorrect || showAsWrong) && { color: '#ffffff' }]}>
            {['א', 'ב', 'ג'][index]}
          </Text>
        </View>
        <Text
          style={[
            styles.optionText,
            RTL,
            showAsCorrect && { color: '#15803d' },
            showAsWrong && { color: '#b91c1c' },
          ]}
        >
          {option.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 88, // leave room for sticky footer button
    gap: 10,
  },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeChip: {
    backgroundColor: 'rgba(14,165,233,0.10)',
    borderColor: 'rgba(14,165,233,0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeChipText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '800',
  },
  questionNumber: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },

  questionCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(14,165,233,0.20)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  questionText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },

  optionsCol: { gap: 8 },
  optionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(14,165,233,0.25)',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  optionLetterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14,165,233,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCorrect: { backgroundColor: '#22c55e' },
  optionLetterWrong: { backgroundColor: '#ef4444' },
  optionLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0369a1',
  },
  optionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
  },
  optionCorrect: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: '#22c55e',
  },
  optionWrong: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: '#ef4444',
  },
  optionDim: { opacity: 0.5 },

  feedbackCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(14,165,233,0.20)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  feedbackRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  feedbackTextCol: {
    flex: 1,
    gap: 4,
  },
  feedbackDaisy: {
    width: 96,
    height: 96,
  },
  feedbackTitle: { fontSize: 20, fontWeight: '900', color: '#0369a1', textAlign: 'right', writingDirection: 'rtl' },
  feedbackBody: { fontSize: 13, lineHeight: 19, color: '#334155', textAlign: 'right', writingDirection: 'rtl' },

  rewardRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  rewardPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(167,139,250,0.4)',
    borderWidth: 1,
  },
  rewardPillCoin: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderColor: 'rgba(245,200,66,0.4)',
    borderWidth: 1,
  },
  rewardXP: { color: '#7c3aed', fontSize: 13, fontWeight: '800' },
  rewardCoin: { color: '#c8960a', fontSize: 13, fontWeight: '800' },

  stickyFooter: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'stretch',
  },
  // Standard app primary CTA — matches PodcastIntroCard.startBtn /
  // PodcastSummaryCard.continueBtn / couple-dilemma.cta. row-reverse so the
  // chevron icon sits on the LEFT (continue = forward in RTL).
  continueBtn: {
    width: CONTINUE_BTN_W,
    flexDirection: 'row-reverse',
    backgroundColor: '#0ea5e9',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 5,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
