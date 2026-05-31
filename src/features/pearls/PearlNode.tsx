import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
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
// PEARL_LOCKED used to be a separate gray-sphere webp. Per user request
// (2026-05-31) locked pearls now render the SAME colored image as unlocked,
// just dimmed with a translucent slate overlay — so the silhouette and
// decorative shape are still visible, only the colour is muted.

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
            the user picked. The webp ships with an opaque white background
            but the pearl shape itself is round, so a circular clip
            (borderRadius + overflow:hidden) removes the 4 white corners
            cleanly on every platform — no more white square showing up on
            the ocean-depth backdrop in chapters 5–6. The animated cyan
            halo PearlNode renders separately (when glow=true) sits
            OUTSIDE this clip so its glow keeps radiating past the edge. */}
        {/* Circular crop so the webp's white square background gets hidden.
            The pearl image is overscaled by 1.35× inside the clip so the
            white border that surrounds the colored sphere in the source asset
            falls OUTSIDE the visible circle — only the colored center shows.
            (Earlier attempt rendered the image at the same size as the clip,
            which left a faint white halo around the colored pearl.) */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            // Background matches the learn map so any sub-pixel rendering
            // anti-alias bleed (the "soft white edge" against the sky-blue
            // halo behind active pearls) reads as transparent.
            backgroundColor: 'transparent',
          }}
        >
          <ExpoImage
            source={PEARL_COLORED}
            style={{
              width: size * 1.35,
              height: size * 1.35,
              position: 'absolute',
              left: -(size * 1.35 - size) / 2,
              top: -(size * 1.35 - size) / 2,
            }}
            contentFit="contain"
            accessible={false}
          />
          {state === 'locked' ? (
            // Slate-tone translucent overlay desaturates the colored pearl
            // for the locked state — keeps the shape recognizable but mutes
            // the colour palette so the eye reads "preview, not active."
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(148,163,184,0.55)' }]}
            />
          ) : null}
        </View>
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
    // No extra wrapper opacity — the locked-state slate overlay inside
    // `inner` does the muting; doubling that up with wrapper opacity made
    // the silhouette too faint to read after the locked-image swap.
    return (
      <View
        style={{ transform: [{ translateX: offsetX }] }}
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
