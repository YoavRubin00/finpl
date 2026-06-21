import { useEffect, useRef, useState } from 'react';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import type { SharkVoiceStatus } from '../useSharkVoiceStore';

/**
 * Drives which "expression" video the shark avatar plays based on the live
 * voice session status.
 *
 * Two visual states:
 *  - `talking-1` — when the SDK reports the agent is `speaking`
 *  - `empathic`  — every other status (`listening`, `thinking`, `idle`, …)
 *
 * **Mid-speech flicker guard:** the SDK briefly reports non-speaking modes
 * during natural pauses (commas, breaths, inter-sentence gaps) even though
 * the agent's turn isn't over. Without a guard, the WebP flips back and
 * forth empathic↔talking many times per response, looking glitchy.
 *
 * We hold the `talking-1` expression for `TALKING_HOLD_MS` after the last
 * `speaking` status. If `speaking` returns within that window, the timeout
 * is cancelled and the avatar never visually leaves talking mode.
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
// Keep this tight so the avatar feels responsive to actual end-of-turn.
const TALKING_HOLD_MS = 300;

function isSpeaking(status: SharkVoiceStatus): boolean {
  return status === 'speaking';
}

export function useSharkAvatarState(): SharkExpression {
  const status = useSharkVoiceStore((s) => s.status);
  const [expression, setExpression] = useState<SharkExpression>('empathic');
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSpeaking(status)) {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setExpression('talking-1');
      return;
    }

    // Status moved away from speaking — only commit the visual change after
    // the hold window. If `speaking` returns first, the cleanup function
    // cancels the pending transition (no visible flicker).
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setExpression('empathic');
      exitTimerRef.current = null;
    }, TALKING_HOLD_MS);

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [status]);

  return expression;
}
