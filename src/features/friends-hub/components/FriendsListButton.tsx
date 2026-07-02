import React, { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';

import { useFriendsStore } from '../../friends/useFriendsStore';
import { tapHaptic } from '../../../utils/haptics';

/**
 * Header chip → premium BLUE button ("החברים שלך") in the exact UX language
 * of PremiumFantasyButton's compact variant. Badge shows the REAL friends
 * count (friendIds.length) — real numbers are allowed under the honest-data
 * policy. Routes to /friends-list.
 */
export function FriendsListButton(): React.ReactElement {
  const router = useRouter();
  const reduced = useReducedMotion();
  const friendIds = useFriendsStore(useShallow((s) => s.friendIds));

  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduced, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-70, 70]) }],
  }));

  const handlePress = React.useCallback(() => {
    tapHaptic();
    router.push('/friends-list' as never);
  }, [router]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        friendIds.length > 0
          ? `החברים שלך — ${friendIds.length} חברים`
          : 'החברים שלך — הוסיפו חברים'
      }
      hitSlop={8}
      style={({ pressed }) => [styles.outer, { opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={['#93c5fd', '#3b82f6', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <UserPlus size={15} color="#ffffff" strokeWidth={2.8} />
        <Text style={styles.label} maxFontSizeMultiplier={1.15}>
          החברים שלך
        </Text>
        {friendIds.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} maxFontSizeMultiplier={1.15}>
              {friendIds.length}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 999,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1d4ed8',
  },
});
