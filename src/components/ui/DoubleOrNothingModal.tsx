import { useState, useRef, useCallback } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { successHaptic, errorHaptic, tapHaptic } from '../../utils/haptics';
import { useTimeoutCleanup } from '../../hooks/useTimeoutCleanup';
import { LottieIcon } from './LottieIcon';

const LOTTIE_DICE = require('../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json');
const LOTTIE_ARROW = require('../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
import { macroEventsData } from '../../features/macro-events/macroEventsData';
import type { MacroEvent } from '../../features/macro-events/types';
import type { ChestReward } from '../../features/retention-loops/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 100;
const SWIPE_OUT_X = SCREEN_W * 1.4;

type Phase = 'offer' | 'question' | 'result';

interface Props {
  visible: boolean;
  rewards: ChestReward;
  onResolve: (multiplier: number) => void;
}

function getRandomQuestion(): MacroEvent {
  const pool = macroEventsData.filter((e) => e.difficulty <= 2 && !e.isPremium);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function DoubleOrNothingModal({ visible, rewards, onResolve }: Props) {
  const [phase, setPhase] = useState<Phase>('offer');
  const [wasCorrect, setWasCorrect] = useState(false);
  const questionRef = useRef<MacroEvent>(getRandomQuestion());
  const resolvedRef = useRef(false);
  const answeredRef = useRef(false);
  const safeTimeout = useTimeoutCleanup();

  // Swipe animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const resetState = useCallback(() => {
    setPhase('offer');
    setWasCorrect(false);
    questionRef.current = getRandomQuestion();
    resolvedRef.current = false;
    answeredRef.current = false;
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const handleTakeLoot = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    tapHaptic();
    onResolve(1);
    safeTimeout(resetState, 300);
  }, [onResolve, resetState, safeTimeout]);

  const handleRisk = useCallback(() => {
    tapHaptic();
    answeredRef.current = false;
    translateX.value = 0;
    translateY.value = 0;
    setPhase('question');
  }, [translateX, translateY]);

  const handleAnswer = useCallback((direction: 'up' | 'down') => {
    if (phase !== 'question' || answeredRef.current) return;
    answeredRef.current = true;
    tapHaptic();
    const correct = direction === questionRef.current.direction;
    setWasCorrect(correct);
    setPhase('result');

    if (correct) {
      successHaptic();
    } else {
      errorHaptic();
    }
  }, [phase]);

  const handleResultContinue = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    tapHaptic();
    onResolve(wasCorrect ? 2 : 0);
    safeTimeout(resetState, 300);
  }, [wasCorrect, onResolve, resetState, safeTimeout]);

  const fireSwipe = useCallback((dir: 'right' | 'left') => {
    handleAnswer(dir === 'right' ? 'up' : 'down');
  }, [handleAnswer]);

  // Swipe gesture for question phase
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 'right' : 'left';
        const targetX = dir === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X;
        translateX.value = withTiming(targetX, { duration: 280 });
        runOnJS(fireSwipe)(dir as 'right' | 'left');
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardSwipeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_W, 0, SCREEN_W], [-18, 0, 18], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const upOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const downOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  if (!visible) return null;

  const event = questionRef.current;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={phase === 'result' ? handleResultContinue : handleTakeLoot} accessibilityViewIsModal={true} accessibilityLabel="הכל או כלום">
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable style={styles.backdrop} onPress={phase === 'result' ? handleResultContinue : handleTakeLoot} accessibilityRole="button" accessibilityLabel="סגור" />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {phase === 'offer' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.content}>
            <Animated.View entering={ZoomIn.duration(400)}>
              <View><LottieIcon source={LOTTIE_DICE} size={72} /></View>
            </Animated.View>
            <Text style={[styles.headline, { color: '#f97316' }]}>הכל או כלום!</Text>
            <Text style={[styles.subtitle, RTL]}>
              החלק ימינה או שמאלה על שאלת בונוס ותכפיל הכל פי 2!{'\n'}תשובה שגויה, לא תקבל מטבעות.
            </Text>

            {/* Current rewards */}
            <View style={styles.rewardsRow}>
              {rewards.coins > 0 && (
                <View style={styles.rewardBadgeCoin}>
                  <Text style={styles.rewardAmount}>+{rewards.coins}</Text>
                  <Text style={styles.rewardLabel}>מטבעות</Text>
                </View>
              )}
              {rewards.xp > 0 && (
                <View style={styles.rewardBadgeXp}>
                  <Text style={[styles.rewardAmount, { color: '#0284c7' }]}>+{rewards.xp}</Text>
                  <Text style={[styles.rewardLabel, { color: '#0369a1' }]}>XP</Text>
                </View>
              )}
              {rewards.gems > 0 && (
                <View style={styles.rewardBadgeGem}>
                  <Text style={[styles.rewardAmount, { color: '#2563eb' }]}>+{rewards.gems}</Text>
                  <Text style={[styles.rewardLabel, { color: '#1d4ed8' }]}>ג'מס</Text>
                </View>
              )}
            </View>

            {/* Buttons, using View+TouchableOpacity for reliable rendering */}
            <View style={styles.riskBtn}>
              <Pressable onPress={handleRisk} style={{ width: '100%', alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="הכל או כלום!">
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <View><LottieIcon source={LOTTIE_DICE} size={24} /></View>
                  <Text style={styles.riskBtnText}>הכל או כלום!</Text>
                </View>
              </Pressable>
            </View>
            <View style={styles.safeBtn}>
              <Pressable onPress={handleTakeLoot} style={{ width: '100%', alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="קח את השלל">
                <Text style={styles.safeBtnText}>קח את השלל ✓</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {phase === 'question' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.content}>
            <GestureDetector gesture={swipeGesture}>
              <Animated.View style={[styles.swipeCard, cardSwipeStyle]}>
                {/* Up overlay (swipe right) */}
                <Animated.View style={[styles.swipeOverlay, styles.swipeOverlayUp, upOverlayStyle]}>
                  <Text style={styles.swipeOverlayTextUp}>עולה 📈</Text>
                </Animated.View>
                {/* Down overlay (swipe left) */}
                <Animated.View style={[styles.swipeOverlay, styles.swipeOverlayDown, downOverlayStyle]}>
                  <Text style={styles.swipeOverlayTextDown}>יורד 📉</Text>
                </Animated.View>

                <Text style={[styles.questionYear, RTL]}>{event.year}</Text>
                <Text style={[styles.questionHeadline, RTL]}>{event.headline}</Text>
                <Text style={[styles.questionContext, RTL]}>{event.context}</Text>
              </Animated.View>
            </GestureDetector>

            {/* Swipe hints */}
            <View style={styles.swipeHints}>
              <Text style={styles.swipeHintDown}>📉 יורד ←</Text>
              <Text style={styles.swipeHintUp}>→ עולה 📈</Text>
            </View>

            {/* Educational tooltip */}
            <View style={styles.eduTooltip}>
              <Text style={[styles.eduTitle, RTL]}>💡 החלק ימינה אם אתה חושב שהשוק עלה, שמאלה אם ירד</Text>
            </View>
          </Animated.View>
        )}

        {phase === 'result' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.content}>
            <Animated.View entering={ZoomIn.duration(400)}>
              <View>
                <LottieIcon
                  source={wasCorrect
                    ? require('../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json')
                    : require('../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json')}
                  size={72}
                />
              </View>
            </Animated.View>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              {wasCorrect && <View><LottieIcon source={require('../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')} size={28} /></View>}
              <Text style={[styles.headline, { color: wasCorrect ? '#22c55e' : '#f97316' }]}>
                {wasCorrect ? 'נכון! x2' : 'לא נורא! 0 מטבעות'}
              </Text>
              {wasCorrect && <View><LottieIcon source={require('../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')} size={28} /></View>}
            </View>

            {/* Multiplied rewards preview */}
            <View style={styles.rewardsRow}>
              {rewards.coins > 0 && (
                <View style={wasCorrect ? styles.rewardBadgeCoin : styles.rewardBadgeDim}>
                  <Text style={[styles.rewardAmount, !wasCorrect && { color: '#64748b' }]}>
                    +{Math.round(rewards.coins * (wasCorrect ? 2 : 0))}
                  </Text>
                  <Text style={[styles.rewardLabel, !wasCorrect && { color: '#64748b' }]}>מטבעות</Text>
                </View>
              )}
              {rewards.xp > 0 && (
                <View style={wasCorrect ? styles.rewardBadgeXp : styles.rewardBadgeDim}>
                  <Text style={[styles.rewardAmount, wasCorrect ? { color: '#0284c7' } : { color: '#64748b' }]}>
                    +{Math.round(rewards.xp * (wasCorrect ? 2 : 0))}
                  </Text>
                  <Text style={[styles.rewardLabel, wasCorrect ? { color: '#0369a1' } : { color: '#64748b' }]}>XP</Text>
                </View>
              )}
              {rewards.gems > 0 && (
                <View style={wasCorrect ? styles.rewardBadgeGem : styles.rewardBadgeDim}>
                  <Text style={[styles.rewardAmount, wasCorrect ? { color: '#2563eb' } : { color: '#64748b' }]}>
                    +{Math.round(rewards.gems * (wasCorrect ? 2 : 0))}
                  </Text>
                  <Text style={[styles.rewardLabel, wasCorrect ? { color: '#1d4ed8' } : { color: '#64748b' }]}>ג'מס</Text>
                </View>
              )}
            </View>

            <View style={styles.explanationBox}>
              <Text style={[styles.explanationLabel, RTL]}>ההסבר:</Text>
              <Text style={[styles.explanationText, RTL]}>{event.explanation}</Text>
            </View>

            <View style={[styles.riskBtn, { backgroundColor: '#0284c7', borderColor: '#0369a1', borderBottomColor: '#075985' }]}>
              <Pressable onPress={handleResultContinue} style={{ width: '100%', alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="המשך">
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.riskBtnText}>המשך</Text>
                  <View><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#f0f9ff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    maxHeight: '75%',
    borderTopWidth: 2,
    borderColor: '#bae6fd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  content: {
    padding: 20,
    paddingTop: 12,
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 56,
  },
  headline: {
    fontSize: 24,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  rewardBadgeCoin: {
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  rewardBadgeXp: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rewardBadgeGem: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  rewardBadgeDim: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#d97706',
  },
  rewardLabel: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 2,
  },
  riskBtn: {
    width: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#0369a1',
    borderBottomWidth: 5,
    borderBottomColor: '#075985',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  riskBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    writingDirection: 'rtl',
  },
  safeBtn: {
    width: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  safeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  // Swipe card
  swipeCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  swipeOverlay: {
    position: 'absolute',
    top: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  swipeOverlayUp: {
    end: 16,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  swipeOverlayDown: {
    start: 16,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  swipeOverlayTextUp: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16a34a',
  },
  swipeOverlayTextDown: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dc2626',
  },
  swipeHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  swipeHintDown: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  swipeHintUp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  // Question phase
  questionYear: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0891b2',
    textAlign: 'center',
  },
  questionHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 26,
  },
  questionContext: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Result phase
  explanationBox: {
    width: '100%',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 6,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891b2',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  eduTooltip: {
    width: '100%',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  eduTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
    textAlign: 'center',
  },
});
