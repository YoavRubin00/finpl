import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';
import { successHaptic } from '../../../utils/haptics';
import { CHIP_CALLOUT_WEBPS, calloutMessage } from '../chipCalloutScenes';

interface SharkChipCalloutProps {
  /** Increments once per REAL chip completion (hydration-gated, and NOT on the
   *  completion that crosses the chest threshold — that's the modal's moment).
   *  A change drives one transient call-out. */
  seq: number;
  /** Chips still needed to open the 70% chest — drives the proximity copy. */
  remaining: number;
  /** mod-0-1 / mod-0-2 (50% threshold) → "first chest" framing. */
  isFirstChest: boolean;
}

const VISIBLE_MS = 1800;
const VISIBLE_MS_RM = 700; // reduced-motion: shorter, no confetti

/** Fisher-Yates — app runtime, so Math.random is fine here. */
function shuffle(arr: number[]): number[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Transient Captain Shark encouragement shown at the end of each chip:
 * a rotating mascot webp (never the same one twice in a row) + a proximity
 * line ("עוד 2 צ'יפים והתיבה נפתחת!") + gentle confetti. Replaces the old
 * 25%/50% milestone toasts (folded in). Presentational — the accordion owns
 * the once-per-completion trigger via `seq`.
 */
export const SharkChipCallout = React.memo(function SharkChipCallout({
  seq,
  remaining,
  isFirstChest,
}: SharkChipCalloutProps) {
  const reduceMotion = useReducedMotion();
  const safeTimeout = useTimeoutCleanup();

  const [visible, setVisible] = useState(false);
  const [webpIndex, setWebpIndex] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);

  // Non-repeating rotation over the webp pool, reshuffled when exhausted so
  // the user keeps seeing a fresh mascot each completion.
  const rotationRef = useRef<number[]>([]);
  const cursorRef = useRef(0);
  const lastSeqRef = useRef(0);

  useEffect(() => {
    const n = CHIP_CALLOUT_WEBPS.length;
    rotationRef.current = shuffle(Array.from({ length: n }, (_, i) => i));
    cursorRef.current = 0;
  }, []);

  useEffect(() => {
    if (seq <= 0 || seq === lastSeqRef.current) return;
    lastSeqRef.current = seq;
    const pool = CHIP_CALLOUT_WEBPS;
    if (pool.length === 0) return;
    if (cursorRef.current >= rotationRef.current.length) {
      rotationRef.current = shuffle(rotationRef.current);
      cursorRef.current = 0;
    }
    setWebpIndex(rotationRef.current[cursorRef.current] ?? 0);
    cursorRef.current += 1;
    setVisible(true);
    setConfettiKey((k) => k + 1);
    try { successHaptic(); } catch { /* non-fatal */ }
    safeTimeout(() => setVisible(false), reduceMotion ? VISIBLE_MS_RM : VISIBLE_MS);
  }, [seq, reduceMotion, safeTimeout]);

  if (!visible) return null;

  const webp = CHIP_CALLOUT_WEBPS[webpIndex] ?? CHIP_CALLOUT_WEBPS[0];
  if (!webp) return null;
  const message = calloutMessage(remaining, isFirstChest);

  return (
    <View style={styles.wrap} pointerEvents="none">
      {!reduceMotion && <ConfettiExplosion key={confettiKey} gentle particleCount={12} />}
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(280)}
        exiting={reduceMotion ? undefined : FadeOut.duration(220)}
        style={styles.card}
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
        accessibilityLabel={message}
      >
        <ExpoImage
          source={webp.source}
          style={styles.mascot}
          contentFit="contain"
          accessible={false}
          pointerEvents="none"
        />
        <Text style={styles.label} allowFontScaling={false}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Bounded top band so the gentle confetti centers near the pill (not the
  // middle of a tall accordion section). Overlay, never intercepts taps.
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
    zIndex: 40,
  },
  card: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0c4a6e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingStart: 8,
    borderRadius: 999,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    maxWidth: '92%',
  },
  mascot: {
    width: 52,
    height: 52,
    backgroundColor: 'transparent', // Gmail/Android black-box fix for transparent webp
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
});
