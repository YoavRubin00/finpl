import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import { useBreakingNewsStore } from '../useBreakingNewsStore';

/**
 * Inbox-style indicator anchored next to Captain Shark on the Learn screen.
 * Surfaces the Breaking News tool to the daily learn-loop instead of leaving
 * it buried in the tools hub.
 *
 * Render rules:
 *   • If the user has zero tracked tickers → returns null (no badge at all).
 *   • If there are fresh summaries unread today → red dot + subtle pulse.
 *   • Otherwise → static envelope, no dot.
 *
 * Tap → router.push('/breaking-news'). Mark-as-read happens inside the
 * BreakingNewsScreen when the user opens a card, so this badge stays
 * read-only.
 */
export function BreakingNewsBadge(): React.ReactElement | null {
  const router = useRouter();
  const { playSound } = useSoundEffect();
  const reduceMotion = useReducedMotion();

  const hasUnread = useBreakingNewsStore((s) => s.hasUnreadToday());

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!hasUnread || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [hasUnread, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handlePress = () => {
    tapHaptic();
    playSound('btn_click_soft_2');
    router.push('/breaking-news' as never);
  };

  return (
    <Animated.View style={[styles.wrap, pulseStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? 'חדשות מתפרצות, יש סיכומים חדשים' : 'חדשות מתפרצות'}
        hitSlop={10}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={['#1d4ed8', '#0c4a6e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bg}
        >
          <Mail size={22} color="#ffffff" strokeWidth={2.4} />
        </LinearGradient>
        {hasUnread && <View style={styles.unreadDot} accessible={false} />}
      </Pressable>
    </Animated.View>
  );
}

const SIZE = 44;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
  },
  pressable: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'visible',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  bg: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
