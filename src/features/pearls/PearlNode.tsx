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
  haloColor: _haloColor,
  size = 56,
}: PearlNodeProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const isUnlocked = state === 'unlocked';
  const shouldAnimate = isUnlocked && !reducedMotion;

  const scale = useSharedValue(1);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 200 });
      return;
    }
    // Gentle breathing only — no surrounding halo. The pearl's own
    // iridescent rendering carries the visual interest; the blue halo
    // looked like a separate UI element and read as noise on top of
    // an already-busy path.
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 950 }),
        withTiming(1, { duration: 950 }),
      ),
      -1,
      false,
    );
  }, [shouldAnimate, scale]);

  const pearlStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
