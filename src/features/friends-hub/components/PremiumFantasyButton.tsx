import React, { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Sparkles } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';

import { tapHaptic } from '../../../utils/haptics';

interface PremiumFantasyButtonProps {
  /** Number of friends currently active in the league — drives the social-proof badge. */
  activeFriends?: number;
  /** Visual variant: "hero" = full-width pinned post, "compact" = header chip. */
  variant?: 'hero' | 'compact';
}

export function PremiumFantasyButton({
  activeFriends = 4,
  variant = 'compact',
}: PremiumFantasyButtonProps): React.ReactElement {
  const router = useRouter();
  const reduced = useReducedMotion();

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
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.55, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-80, 80]) },
    ],
  }));

  const handlePress = React.useCallback(() => {
    tapHaptic();
    router.push('/fantasy' as never);
  }, [router]);

  if (variant === 'hero') {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="פנטזי ליג — פתח את הליגה"
        hitSlop={8}
        style={({ pressed }) => [styles.heroOuter, { opacity: pressed ? 0.92 : 1 }]}
      >
        <LinearGradient
          colors={['#fde68a', '#fbbf24', '#f59e0b', '#d97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <Animated.View pointerEvents="none" style={[styles.heroShimmer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Trophy size={26} color="#7c2d12" strokeWidth={2.6} />
              <Sparkles size={12} color="#7c2d12" strokeWidth={2.6} style={styles.heroSparkle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>פנטזי ליג</Text>
              <Text style={styles.heroSub}>
                {activeFriends} חברים פעילים השבוע · בחר 5 מניות
              </Text>
            </View>
            <Text style={styles.heroArrow}>‹</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="פנטזי ליג"
      hitSlop={8}
      style={({ pressed }) => [styles.compactOuter, { opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={['#fde68a', '#fbbf24', '#f59e0b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.compactGradient}
      >
        <Animated.View pointerEvents="none" style={[styles.compactShimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Trophy size={15} color="#7c2d12" strokeWidth={2.8} />
        <Text style={styles.compactText}>פנטזי ליג</Text>
        {activeFriends > 0 && (
          <View style={styles.compactBadge}>
            <Text style={styles.compactBadgeText}>{activeFriends}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroOuter: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  heroGradient: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
  },
  heroShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  heroSparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7c2d12',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(124,45,18,0.85)',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
  },
  heroArrow: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7c2d12',
  },
  compactOuter: {
    borderRadius: 999,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  compactGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    overflow: 'hidden',
  },
  compactShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7c2d12',
    writingDirection: 'rtl',
    letterSpacing: -0.1,
  },
  compactBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#7c2d12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fef3c7',
  },
});
