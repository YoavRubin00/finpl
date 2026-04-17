import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FOMO_TOKENS } from './theme';

/**
 * Three-dot "someone is typing" indicator. Cross-fades in/out and
 * staggers each dot with sine easing — mirrors Telegram's motion.
 */
export function TypingIndicator() {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      style={styles.row}
      accessibilityLabel="הודעה בהקלדה"
      accessibilityRole="text"
    >
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={140} />
        <Dot delay={280} />
      </View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 0.85;
      return;
    }
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [delay, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.4 + scale.value * 0.5,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-start',
    marginStart: 40,
    marginVertical: 4,
  },
  bubble: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FOMO_TOKENS.bubbleOther,
    borderWidth: 1,
    borderColor: FOMO_TOKENS.bubbleOtherBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: FOMO_TOKENS.bubbleMeta,
  },
});
