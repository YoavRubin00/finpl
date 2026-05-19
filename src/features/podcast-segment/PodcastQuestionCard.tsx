import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import type { PodcastQuestion, PodcastQuestionOption } from '../chapter-1-content/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

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
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);

  const selectedOption = selected !== null ? question.options[selected] : null;
  const isCorrect = selectedOption?.isCorrect ?? false;

  const handleSelect = useCallback(
    (index: number, option: PodcastQuestionOption) => {
      if (showResult) return;
      tapHaptic();
      setSelected(index);
      setShowResult(true);
      if (option.isCorrect) {
        successHaptic();
        setShowConfetti(true);
        setShowFlyingCoins(true);
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
          {question.options.map((option, idx) => (
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

        {/* Feedback box */}
        {showResult && selectedOption ? (
          <Animated.View
            entering={FadeInUp.duration(320).springify()}
            style={styles.feedbackCard}
          >
            <Text style={[styles.feedbackTitle, RTL]}>
              {isCorrect ? 'יפה!' : 'לא בדיוק...'}
            </Text>
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
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Sticky Continue button — always visible above the fold once answer chosen */}
      {showResult ? (
        <Animated.View entering={FadeIn.duration(280)} style={styles.stickyFooter}>
          <Pressable
            onPress={() => { tapHaptic(); onContinue(); }}
            accessibilityRole="button"
            accessibilityLabel={questionNumber === 1 ? 'לשאלה הבאה' : 'סיים'}
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.continueBtnText}>
              {questionNumber === 1 ? 'לשאלה הבאה' : 'סיים'}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {showConfetti ? <ConfettiExplosion onComplete={() => setShowConfetti(false)} /> : null}
      {showFlyingCoins ? (
        <FlyingRewards
          type="coins"
          amount={question.coinReward}
          onComplete={() => setShowFlyingCoins(false)}
        />
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
    paddingTop: 12,
    paddingBottom: 96, // leave room for sticky footer button
    gap: 14,
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
    paddingVertical: 6,
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
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  questionText: {
    color: '#1e293b',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
  },

  optionsCol: { gap: 10 },
  optionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(14,165,233,0.25)',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    padding: 14,
    gap: 8,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  feedbackTitle: { fontSize: 15, fontWeight: '900', color: '#0369a1' },
  feedbackBody: { fontSize: 14, lineHeight: 21, color: '#334155' },

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
  },
  continueBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
