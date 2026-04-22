import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { useNewsQuizStore } from '../../../stores/useNewsQuizStore';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../components/ui/FlyingRewards';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import type { NewsQuizChoice } from '../liveMarketTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function ChoiceButton({
  choice,
  state,
  onPress,
}: {
  choice: NewsQuizChoice;
  state: 'idle' | 'correct' | 'wrong' | 'revealed';
  onPress: () => void;
}) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withSpring(0),
      );
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const bg =
    state === 'correct' ? '#ecfdf5' :
    state === 'wrong'   ? '#fef2f2' :
    state === 'revealed'? '#ecfdf5' :
    '#f8fafc';

  const border =
    state === 'correct' ? '#34d399' :
    state === 'wrong'   ? '#fca5a5' :
    state === 'revealed'? '#34d399' :
    '#e2e8f0';

  const prefix =
    state === 'correct'  ? '✅ ' :
    state === 'wrong'    ? '❌ ' :
    state === 'revealed' ? '✅ ' : '';

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={state !== 'idle'}
        style={[styles.choice, { backgroundColor: bg, borderColor: border }]}
        accessibilityRole="button"
        accessibilityLabel={choice.text}
      >
        <Text style={[styles.choiceText, RTL]}>
          {prefix}{choice.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function LiveNewsQuizCard() {
  const { data, loading, fetch, hasAnsweredToday, markAnswered } = useNewsQuizStore();
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);

  const [selected, setSelected] = useState<'a' | 'b' | 'c' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => { fetch(); }, [fetch]);

  // Pulsing glow before answer
  const glow = useSharedValue(0.3);
  const answered = hasAnsweredToday();
  useEffect(() => {
    if (!answered && !selected) {
      glow.value = withRepeat(
        withSequence(withTiming(0.9, { duration: 1100 }), withTiming(0.3, { duration: 1100 })),
        -1, true,
      );
    }
  }, [answered, selected]);
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    shadowColor: '#0891b2',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  }));

  const hoursLeft = 24 - new Date().getHours();

  const handleAnswer = (id: 'a' | 'b' | 'c') => {
    if (selected || answered || !data) return;
    tapHaptic();
    setSelected(id);
    markAnswered();

    if (id === data.correctChoiceId) {
      successHaptic();
      addXP(data.xpReward, 'quiz_correct');
      addCoins(data.coinReward);
      setShowConfetti(true);
      setShowRewards(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setTimeout(() => setShowRewards(false), 1500);
    } else {
      errorHaptic();
    }
  };

  if (answered && !selected) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
          <Text style={styles.answeredIcon}>✅</Text>
          <Text style={[styles.answeredTitle, RTL]}>ענית על המבזק היומי!</Text>
          <Text style={[styles.answeredSub, RTL]}>חזור מחר לשאלה חדשה</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showRewards && data && (
        <FlyingRewards type="coins" amount={data.coinReward} onComplete={() => setShowRewards(false)} />
      )}

      <Animated.View style={!selected ? glowStyle : undefined}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[
            styles.card,
            selected === data?.correctChoiceId
              ? { backgroundColor: '#f0f9ff', borderColor: '#7dd3fc' }
              : selected
              ? { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }
              : { backgroundColor: '#ffffff', borderColor: '#bae6fd' },
          ]}
        >
          {/* Header */}
          {!selected && (
            <View style={styles.header}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={[styles.headerTitle, RTL]}>🚨 מבזק פיננסי יומי</Text>
            </View>
          )}

          {/* Headline context */}
          {loading && !data ? (
            <View style={styles.loadingBox}>
              <Text style={[styles.loadingText, RTL]}>טוען מבזק...</Text>
            </View>
          ) : data ? (
            <>
              <View style={styles.headlineBadge}>
                <Text style={[styles.headlineLabel, RTL]}>📰 כותרת היום</Text>
                <Text style={[styles.headlineText, RTL]}>{data.headline}</Text>
              </View>

              {/* Question */}
              <Text style={[styles.question, RTL]}>{data.question}</Text>

              {/* Choices */}
              <View style={styles.choices}>
                {data.choices.map((choice) => {
                  const choiceState =
                    !selected ? 'idle' :
                    choice.id === data.correctChoiceId ? (selected === choice.id ? 'correct' : 'revealed') :
                    choice.id === selected ? 'wrong' : 'idle';
                  return (
                    <ChoiceButton
                      key={choice.id}
                      choice={choice}
                      state={choiceState}
                      onPress={() => handleAnswer(choice.id as 'a' | 'b' | 'c')}
                    />
                  );
                })}
              </View>

              {/* Explanation after answer */}
              {selected && (
                <Animated.View entering={FadeIn.duration(250)} style={styles.explanation}>
                  <Text style={[styles.explanationTitle, RTL]}>💡 תכל׳ס</Text>
                  <Text style={[styles.explanationText, RTL]}>{data.explanation}</Text>
                </Animated.View>
              )}

              {/* Footer */}
              {!selected ? (
                <Text style={[styles.timer, RTL]}>נותרו {hoursLeft} שעות</Text>
              ) : selected === data.correctChoiceId ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.rewardRow}>
                  <GoldCoinIcon size={18} />
                  <Text style={styles.rewardText}>+{data.coinReward}</Text>
                  <Text style={[styles.rewardText, { marginLeft: 12 }]}>+{data.xpReward} XP</Text>
                </Animated.View>
              ) : null}
            </>
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0891b2',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#f87171',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f87171',
    letterSpacing: 1,
  },
  headlineBadge: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 4,
  },
  headlineLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  headlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 20,
  },
  question: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    lineHeight: 23,
  },
  choices: {
    gap: 8,
  },
  choice: {
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  explanation: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 6,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0891b2',
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
  },
  timer: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0891b2',
  },
  answeredIcon: { fontSize: 44, textAlign: 'center' },
  answeredTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
  },
  answeredSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingBox: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
});