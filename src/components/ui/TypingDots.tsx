import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

interface TypingDotsProps {
  /** Dot color — defaults to the chat purple used in the main app chat. */
  color?: string;
}

/**
 * Three bouncing dots — same animation as the main chat's TypingIndicator
 * ([src/features/chat/ChatScreen.tsx:153](src/features/chat/ChatScreen.tsx#L153))
 * but unbundled from that file's message-row + avatar layout so callers can
 * drop the dots inside any bubble they own.
 */
export function TypingDots({ color = '#a78bfa' }: TypingDotsProps): React.ReactElement {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = withRepeat(
      withSequence(
        withSpring(1, { damping: 4, stiffness: 300 }),
        withSpring(0, { damping: 4, stiffness: 300 }),
      ),
      -1,
    );
    dot1.value = bounce;
    dot2.value = withDelay(150, bounce);
    dot3.value = withDelay(300, bounce);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + dot1.value * 0.4 }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + dot2.value * 0.4 }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + dot3.value * 0.4 }] }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.row}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, style1]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, style2]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, style3]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
