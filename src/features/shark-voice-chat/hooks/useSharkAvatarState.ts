import { useEffect, useRef, useState } from 'react';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import type { SharkVoiceStatus } from '../useSharkVoiceStore';

/**
 * Drives which "expression" loop the shark avatar plays based on the live
 * voice session status.
 *
 * States:
 *  - `speaking`            → CYCLES `talking-1 → talking-2 → talking-3` every
 *                            `TALKING_CYCLE_MS` so a long reply keeps feeling
 *                            live instead of looping one clip.
 *  - `thinking`/`connecting` → `thinking` (the captain ponders / dials in).
 *  - everything else        → `listening` (attentive, mouth closed).
 *
 * **Mid-speech flicker guard:** the SDK briefly reports non-speaking modes
 * during natural pauses (commas, breaths, inter-sentence gaps) even though
 * the agent's turn isn't over. We hold for `TALKING_HOLD_MS` before settling
 * to `listening`; if `speaking` returns within that window the pending
 * transition is cancelled, so the avatar never visibly leaves talking mode.
 */

export type SharkExpression =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'talking-1'
  | 'talking-2'
  | 'talking-3'
  | 'empathic'
  | 'victory';

// Short hold only — its job is to absorb sub-frame flickers between
// the SDK firing `listening` and the next audio chunk arriving. The
// real silence detection lives in `useElevenLabsConversation.ts`.
const TALKING_HOLD_MS = 300;
// How long each talking variant shows before advancing to the next. Long
// enough to read as a deliberate gesture, short enough that a multi-sentence
// reply visibly varies.
const TALKING_CYCLE_MS = 1900;
const TALKING_VARIANTS: readonly SharkExpression[] = ['talking-1', 'talking-2', 'talking-3'];

export function useSharkAvatarState(): SharkExpression {
  const status = useSharkVoiceStore((s) => s.status);
  const [expression, setExpression] = useState<SharkExpression>('listening');
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const variantIdxRef = useRef(0);

  useEffect(() => {
    if (status === 'speaking') {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setExpression(TALKING_VARIANTS[variantIdxRef.current % TALKING_VARIANTS.length]);
      if (!cycleTimerRef.current) {
        cycleTimerRef.current = setInterval(() => {
          variantIdxRef.current = (variantIdxRef.current + 1) % TALKING_VARIANTS.length;
          setExpression(TALKING_VARIANTS[variantIdxRef.current]);
        }, TALKING_CYCLE_MS);
      }
    } else {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      if (status === 'thinking' || status === 'connecting') {
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
        }
        setExpression('thinking');
      } else {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          setExpression('listening');
          exitTimerRef.current = null;
        }, TALKING_HOLD_MS);
      }
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
  }, [status]);

  return expression;
}
