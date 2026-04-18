import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { FINN_TALKING, FINN_STANDARD } from './finnMascotConfig';

interface Props {
  /** Text the user is reading — used to build punctuation-pause schedule and
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
   * When provided, switches to controlled mode — external audio state drives
   * talking/standard instead of the internal timer.
   * Flip to false when audio ends → shark goes static + onDone fires.
   */
  isPlayingAudio?: boolean;
}


export function FinnSpeakingAvatar({
  text,
  size = 72,
  onDone,
  durationMs,
  active = true,
  style,
  isPlayingAudio,
}: Props) {
  const reduceMotion = useReducedMotion();
  const initialPhase = reduceMotion || !active ? 'standard' : 'talking';
  const [phase, setPhase] = useState<'talking' | 'standard'>(initialPhase);

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

  // Fallback timer — only used when isPlayingAudio is not provided
  useEffect(() => {
    if (isPlayingAudio !== undefined) return; // controlled mode — skip
    if (reduceMotion || !active) return;
    const wordCount = text ? text.trim().split(/\s+/).length : 12;
    // No upper cap — let the word count drive the full duration
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

  // Controlled mode: audio end → permanently go static
  useEffect(() => {
    if (isPlayingAudio === undefined) return;
    if (!isPlayingAudio) {
      clearAllTimers();
      setPhase('standard');
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayingAudio]);

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
        autoplay={false}
      />
      <ExpoImage
        source={FINN_TALKING}
        style={{ width: size, height: size, position: 'absolute', opacity: talking ? 1 : 0 }}
        contentFit="contain"
        accessible={false}
        autoplay={talking}
      />
    </View>
  );
}
