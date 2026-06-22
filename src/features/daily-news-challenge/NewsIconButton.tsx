import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Newspaper } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';

/**
 * Newspaper entry-point button with an attention-grabbing pulse + glow halo
 * that keeps drawing the eye until the user completes today's challenge.
 * The animation is cancelled and the icon turns muted gray ONLY after
 * `newsCompleted` flips true — server availability of today's challenge
 * (`hasNewsChallenge`) is intentionally NOT a gate, so the entry point keeps
 * inviting taps even before the API has loaded its payload. Honors
 * reduced-motion. Ported from feature/flag's DuoLearnScreen.
 */
export function NewsIconButton({
  size = 32,
  hasNewsChallenge,
  newsCompleted,
  onPress,
  compact = false,
}: {
  size?: number;
  hasNewsChallenge: boolean;
  newsCompleted: boolean;
  onPress: () => void;
  /** Tighter halo for floating-at-node placement so it doesn't bleed into
   *  neighbouring lesson labels. */
  compact?: boolean;
}): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const shouldPulse = !newsCompleted && !reducedMotion;

  const glow = useSharedValue(0);

  // The icon's idle scale-throb was retired 2026-06-22 (read as a "רעידה" on
  // the entry icon, Yoav). Only the soft glow halo pulses now, so the entry
  // point stays discoverable without the trembling.
  useEffect(() => {
    if (!shouldPulse) {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 200 });
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, [shouldPulse, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: (compact ? 0.18 : 0.22) * glow.value,
    transform: [{ scale: 0.85 + (compact ? 0.2 : 0.3) * glow.value }],
  }));

  const ACTIVE_COLOR = '#005bb1';
  const GLOW_COLOR = '#93c5fd';
  const DOT_COLOR = '#005bb1';

  const iconColor = newsCompleted ? '#94a3b8' : ACTIVE_COLOR;
  const showUnreadDot = !newsCompleted;
  const halo = size * (compact ? 1.15 : 1.6);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        newsCompleted
          ? 'אקטואליה פיננסית — הושלם להיום'
          : hasNewsChallenge
            ? 'אקטואליה פיננסית — אתגר חדש'
            : 'אקטואליה פיננסית'
      }
      hitSlop={8}
      style={{
        width: size + 8,
        height: size + 8,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {shouldPulse ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: halo,
              height: halo,
              borderRadius: halo / 2,
              backgroundColor: GLOW_COLOR,
            },
            glowStyle,
          ]}
        />
      ) : null}
      <Newspaper size={size} color={iconColor} strokeWidth={2.4} />
      {showUnreadDot ? (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: DOT_COLOR,
            borderWidth: 2,
            borderColor: '#ffffff',
          }}
        />
      ) : null}
    </Pressable>
  );
}
