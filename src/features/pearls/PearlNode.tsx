import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Check } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';

const PEARL_COLORED = require('../../../assets/webp/pearl-colored.webp');
const PEARL_LOCKED = require('../../../assets/webp/pearl-locked.webp');

export type PearlNodeState = 'locked' | 'unlocked' | 'completed';

interface PearlNodeProps {
  state: PearlNodeState;
  /** Horizontal offset relative to path center — matches the alternating
   *  S-curve placement of module nodes (see getNodeOffset in DuoLearnScreen). */
  offsetX?: number;
  onPress?: () => void;
  /** Accent color (arena.glow) used for the halo on unlocked Pearls. */
  haloColor?: string;
  /** Smaller than NODE_SIZE (78) so it reads as a bonus stop, not a module. */
  size?: number;
}

/**
 * Bonus-pearl node that sits between two module nodes on the Duolingo-style
 * learn path. Three visual states:
 *   - locked:    grayscale webp, dim, no animation
 *   - unlocked:  colored webp + pulsing halo + gentle scale breathing
 *   - completed: colored webp + small green check badge in the corner
 *
 * Tap on locked Pearls is a no-op; the node is rendered to give the user a
 * preview of what's coming. Tap on unlocked/completed opens the PearlSheet.
 */
export function PearlNode({
  state,
  offsetX = 0,
  onPress,
  haloColor = '#93c5fd',
  size = 56,
}: PearlNodeProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const isUnlocked = state === 'unlocked';
  const shouldAnimate = isUnlocked && !reducedMotion;

  const scale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(scale);
      cancelAnimation(haloOpacity);
      scale.value = withTiming(1, { duration: 200 });
      haloOpacity.value = withTiming(0, { duration: 200 });
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 850 }),
        withTiming(1, { duration: 850 }),
      ),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 850 }),
        withTiming(0.15, { duration: 850 }),
      ),
      -1,
      false,
    );
  }, [shouldAnimate, scale, haloOpacity]);

  const pearlStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
  }));

  const halo = size * 1.7;
  const accessibilityLabel =
    state === 'locked'
      ? 'פנינה — נעולה. סיים את המודולה כדי לפתוח'
      : state === 'completed'
        ? 'פנינה — הושלמה. אפשר לשחק שוב'
        : 'פנינה — בונוס חדש זמין';

  const inner = (
    <View
      style={{
        width: size + 16,
        height: size + 16,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Halo — only animates when unlocked. Positioned absolutely so it
          radiates from behind the pearl image. */}
      {shouldAnimate ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: halo,
              height: halo,
              borderRadius: halo / 2,
              backgroundColor: haloColor,
            },
            haloStyle,
          ]}
        />
      ) : null}

      <Animated.View style={pearlStyle}>
        <ExpoImage
          source={state === 'locked' ? PEARL_LOCKED : PEARL_COLORED}
          style={{ width: size, height: size }}
          contentFit="contain"
          accessible={false}
        />
      </Animated.View>

      {state === 'completed' ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#16a34a',
            borderWidth: 2,
            borderColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="#ffffff" strokeWidth={3.5} />
        </View>
      ) : null}
    </View>
  );

  // Locked pearls render as a non-interactive View so screen readers don't
  // announce a tappable button the user can't actually act on.
  if (state === 'locked' || !onPress) {
    return (
      <View
        style={{ transform: [{ translateX: offsetX }], opacity: state === 'locked' ? 0.6 : 1 }}
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={{ transform: [{ translateX: offsetX }] }}
    >
      {inner}
    </Pressable>
  );
}
