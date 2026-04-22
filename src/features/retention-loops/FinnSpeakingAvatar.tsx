import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { FINN_TALKING, FINN_STANDARD } from './finnMascotConfig';
import type { IntroAudioState } from '../../hooks/useIntroAudio';

interface Props {
  /** Text the user is reading, used to build punctuation-pause schedule and
   *  estimate fallback duration when no audio is wired. */
  text?: string;
  /** Avatar pixel size (square). Default 72. */
  size?: number;
  /** Fired after the talking → standard transition completes. */
  onDone?: () => void;
  /** Manual override for fallback duration (uncontrolled mode only). */
  durationMs?: number;
  /** When false the avatar stays on standard immediately. Defaults to true. */
  active?: boolean;
  /** Container style. */
  style?: StyleProp<ViewStyle>;
  /**
   * Legacy 2-state controller (playing=true/false). Kept for backwards compat.
   * Prefer `audioState` which also distinguishes paused (freeze webp) from
   * finished (swap to standard).
   */
  isPlayingAudio?: boolean;
  /**
   * 4-state controller from useIntroAudio().
   *   - 'loading'  → talking visible, animating (pre-start)
   *   - 'playing'  → talking visible, animating
   *   - 'paused'   → talking visible, FROZEN (stopAnimating)
   *   - 'finished' → standard visible (swap)
   */
  audioState?: IntroAudioState;
}


export function FinnSpeakingAvatar({
  text,
  size = 72,
  onDone,
  durationMs,
  active = true,
  style,
  isPlayingAudio,
  audioState,
}: Props) {
  const reduceMotion = useReducedMotion();
  const initialPhase = reduceMotion || !active ? 'standard' : 'talking';
  const [phase, setPhase] = useState<'talking' | 'standard'>(initialPhase);

  const talkingImgRef = useRef<ExpoImage>(null);
  const pauseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearAllTimers() {
    pauseTimersRef.current.forEach(clearTimeout);
    pauseTimersRef.current = [];
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  // Fallback timer, only used when no external controller is provided
  useEffect(() => {
    if (isPlayingAudio !== undefined || audioState !== undefined) return;
    if (reduceMotion || !active) return;
    const wordCount = text ? text.trim().split(/\s+/).length : 12;
    const computed = durationMs ?? Math.max(2000, wordCount * 220);
    fallbackTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setPhase('standard');
      onDone?.();
    }, computed);
    return () => {
      if (fallbackTimerRef.current !== null) clearTimeout(fallbackTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy controlled mode: audio end → permanently go static
  useEffect(() => {
    if (isPlayingAudio === undefined) return;
    if (!isPlayingAudio) {
      clearAllTimers();
      setPhase('standard');
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayingAudio]);

  // New 4-state controlled mode
  useEffect(() => {
    if (audioState === undefined) return;
    if (audioState === 'finished') {
      clearAllTimers();
      setPhase('standard');
      onDone?.();
      return;
    }
    // loading / playing / paused / idle → keep talking layer visible
    setPhase('talking');
    // Freeze the webp on pause, resume on play
    if (audioState === 'paused' || audioState === 'loading') {
      talkingImgRef.current?.stopAnimating?.();
    } else if (audioState === 'playing') {
      talkingImgRef.current?.startAnimating?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioState]);

  // Cleanup on unmount
  useEffect(() => () => clearAllTimers(), []);

  const talking = phase === 'talking';

  return (
    <View style={[{ width: size, height: size }, style]}>
      <ExpoImage
        source={FINN_STANDARD}
        style={{ width: size, height: size, position: 'absolute' }}
        contentFit="contain"
        accessible={false}
        autoplay
      />
      <ExpoImage
        ref={talkingImgRef}
        source={FINN_TALKING}
        style={{ width: size, height: size, position: 'absolute', opacity: talking ? 1 : 0 }}
        contentFit="contain"
        accessible={false}
        autoplay={talking}
      />
    </View>
  );
}