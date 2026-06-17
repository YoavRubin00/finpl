import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';

interface InvestorQuizNodeProps {
  /** Horizontal offset relative to path center — matches the S-curve
   *  placement of the pearl this node sits parallel to. */
  offsetX?: number;
  onPress: () => void;
  /** Slightly smaller than a pearl (56) so it reads as a sibling bonus. */
  size?: number;
}

/**
 * Standalone "איזה משקיע יש בך?" quiz node — sits PARALLEL to a pearl on the
 * learn map (one spot in chapter 1). Visually distinct from a pearl: a glossy
 * cyan orb with a brain glyph + a hook label, so it reads as its own bonus
 * stop, not a pearl. Tapping it routes to the Graham investor-personality
 * quiz (/graham-personality). Always interactive (independent of Pro / module
 * lock) — it's pure bonus engagement content.
 *
 * Copy is gender-neutral per docs/BRAND.md ("יש בך" works for both) since the
 * shark is addressing the single user directly.
 */
export function InvestorQuizNode({
  offsetX = 0,
  onPress,
  size = 54,
}: InvestorQuizNodeProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const animate = !reducedMotion;

  const scale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.2);
  const haloScale = useSharedValue(0.9);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(scale);
      cancelAnimation(haloOpacity);
      cancelAnimation(haloScale);
      scale.value = withTiming(1, { duration: 200 });
      haloOpacity.value = withTiming(0.2, { duration: 200 });
      haloScale.value = withTiming(0.9, { duration: 200 });
      return;
    }
    scale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 950 }), withTiming(1, { duration: 950 })),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withSequence(withTiming(0.55, { duration: 950 }), withTiming(0.18, { duration: 950 })),
      -1,
      false,
    );
    haloScale.value = withRepeat(
      withSequence(withTiming(1.25, { duration: 950 }), withTiming(0.95, { duration: 950 })),
      -1,
      false,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(haloOpacity);
      cancelAnimation(haloScale);
    };
  }, [animate, scale, haloOpacity, haloScale]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const halo = size * 1.7;
  const box = size + 16;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="שאלון — איזה משקיע יש בך?"
      hitSlop={10}
      style={{ transform: [{ translateX: offsetX }] }}
    >
      {/* Orb box — same footprint as PearlNode so it aligns on the same band */}
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulsing halo */}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: halo, height: halo, borderRadius: halo / 2, backgroundColor: '#22d3ee' },
            haloStyle,
          ]}
        />
        {/* Glossy cyan orb with brain glyph */}
        <Animated.View style={orbStyle}>
          <LinearGradient
            colors={['#06b6d4', '#0e7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <Brain size={Math.round(size * 0.5)} color="#ffffff" strokeWidth={2.4} />
          </LinearGradient>
        </Animated.View>

        {/* "שאלון" badge — top-right corner (RTL eye-first) */}
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} allowFontScaling={false}>שאלון</Text>
        </View>

        {/* Hook label — absolutely placed BELOW the orb so it doesn't shift the
            orb's center off the pearl's band. */}
        <View style={[styles.labelPill, { top: box + 2 }]} pointerEvents="none">
          <Text style={styles.labelText} allowFontScaling={false} numberOfLines={2}>
            איזה משקיע יש בך?
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#06b6d4',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#0891b2',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    writingDirection: 'rtl' as const,
  },
  labelPill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(8,145,178,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    maxWidth: 190,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    writingDirection: 'rtl' as const,
    textAlign: 'center',
    lineHeight: 14,
  },
});
