import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { FINN_TABLET } from './finnMascotConfig';

interface Props {
  /** Whether the note-taking pass should run. Toggle this true the moment the
   *  user picks an answer; the component fires `onDone` after `durationMs`. */
  visible: boolean;
  /** Avatar pixel size (square). Default 88 (slightly larger than the regular
   *  speaking avatar, the tablet detail benefits from extra real estate). */
  size?: number;
  /** Fired after the tablet has been on screen for `durationMs`. Wire this
   *  to whatever advances the onboarding flow (`onNext(answer)`). */
  onDone: () => void;
  /** How long to show the tablet variant. Default 900ms, long enough to
   *  register "Shark wrote it down", short enough that the next step still
   *  feels snappy. */
  durationMs?: number;
  /** Container style (e.g. centering inside an overlay). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders FINN_TABLET briefly to acknowledge a user answer, then fires
 * `onDone`. Designed to wrap the existing `setTimeout(advance, AUTO_ADVANCE_MS)`
 * pattern in `ProfilingFlow.tsx` so the user feels Shark "wrote down" their
 * answer before the next onboarding step appears.
 *
 * Reduced-motion users skip the visual pause entirely and `onDone` fires on
 * mount, so the flow doesn't stall for them.
 */
export function FinnNoteTakingAvatar({
  visible,
  size = 88,
  onDone,
  durationMs = 900,
  style,
}: Props) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      onDone();
      return;
    }
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onDone, reduceMotion]);

  if (!visible || reduceMotion) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={[{ width: size, height: size }, style]}
    >
      <ExpoImage
        source={FINN_TABLET}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessible={false}
      />
    </Animated.View>
  );
}