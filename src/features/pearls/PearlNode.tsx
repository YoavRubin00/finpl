import React, { useEffect } from 'react';
import { View, Pressable, Platform } from 'react-native';
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

// CSS blend-mode hack — Higgsfield's pearl webps ship with an opaque white
// background. `multiply` on web turns near-white pixels into "no change"
// against the (near-white) path canvas, so the pearl visually floats with
// no white box. Native platforms (iOS/Android) ignore the style — there
// the box still shows; we'll regenerate the asset with a true alpha
// channel before the next TestFlight build.
const WEB_BG_FIX = Platform.OS === 'web'
  ? ({ mixBlendMode: 'multiply' } as unknown as object)
  : undefined;

export type PearlNodeState = 'locked' | 'unlocked' | 'completed';

interface PearlNodeProps {
  state: PearlNodeState;
  /** Horizontal offset relative to path center — matches the alternating
   *  S-curve placement of module nodes (see getNodeOffset in DuoLearnScreen). */
  offsetX?: number;
  onPress?: () => void;
  /** Accent color used for the halo when `glow` is on. Defaults to the
   *  ocean-cyan accent. */
  haloColor?: string;
  /** Smaller than NODE_SIZE (78) so it reads as a bonus stop, not a module. */
  size?: number;
  /** When true, the unlocked Pearl pulses a soft halo behind it to call
   *  attention — used for FREE users where only the just-unlocked pearl is
   *  reachable, so the halo signals "this one is yours, tap me". Pro users
   *  see every pearl as unlocked so the halo would be visual noise on all
   *  of them; the parent passes `glow={false}` in that case. */
  glow?: boolean;
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
  haloColor = '#67e8f9',
  size = 56,
  glow = false,
}: PearlNodeProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const isUnlocked = state === 'unlocked';
  const shouldAnimate = isUnlocked && !reducedMotion;
  const shouldGlow = isUnlocked && glow && !reducedMotion;

  const scale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.85);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 950 }),
          withTiming(1, { duration: 950 }),
        ),
        -1,
        false,
      );
    }
    if (!shouldGlow) {
      cancelAnimation(haloOpacity);
      cancelAnimation(haloScale);
      haloOpacity.value = withTiming(0, { duration: 200 });
      haloScale.value = withTiming(0.85, { duration: 200 });
    } else {
      haloOpacity.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 950 }),
          withTiming(0.15, { duration: 950 }),
        ),
        -1,
        false,
      );
      haloScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 950 }),
          withTiming(0.95, { duration: 950 }),
        ),
        -1,
        false,
      );
    }
  }, [shouldAnimate, shouldGlow, scale, haloOpacity, haloScale]);

  const pearlStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const accessibilityLabel =
    state === 'locked'
      ? 'פנינה — נעולה. שדרג כדי לפתוח'
      : state === 'completed'
        ? 'פנינה — הושלמה. אפשר לשחק שוב'
        : 'פנינה — בונוס חדש זמין';

  const halo = size * 1.7;

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
      {shouldGlow ? (
        // Soft cyan halo behind the pearl — Free user's signal that this
        // bonus is reachable RIGHT NOW. Sits below the image; non-interactive.
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
        {/* The Higgsfield-generated pearl — the original first-pass image
            the user picked. mixBlendMode on web drops the white background
            so it visually floats on the path; native still shows a faint
            white pill until we ship an asset with a real alpha channel. */}
        <ExpoImage
          source={state === 'locked' ? PEARL_LOCKED : PEARL_COLORED}
          style={[{ width: size, height: size }, WEB_BG_FIX]}
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

  // No onPress → render as a plain non-interactive View. Note that locked
  // Pearls are STILL pressable when the parent supplies an onPress (e.g.
  // DuoLearnScreen wires it to the same "upgrade to Pro" prompt that locked
  // modules use) — we just dim the image to communicate "not yet earned".
  if (!onPress) {
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
