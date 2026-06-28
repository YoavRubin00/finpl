import { useEffect, useRef, useState } from 'react';
import { useSharkVoiceStore } from '../useSharkVoiceStore';

/**
 * Drives which "expression" loop the shark avatar plays based on the live
 * voice session status. TWO states only (Yoav 2026-06-29 — "בלי לסבך"):
 *
 *  - `speaking`      → ONE talking loop (`talking-1`) held for the ENTIRE turn.
 *                      No cycling between talking variants, no cross-fade churn
 *                      mid-speech. The mouth still moves (the WebP loops) — the
 *                      avatar just never swaps while the shark is talking.
 *  - everything else → `listening` (attentive, mouth closed).
 *
 * **Finish-of-turn guard:** the SDK briefly reports non-speaking modes during
 * natural pauses (commas, breaths, inter-sentence gaps) even though the agent's
 * turn isn't over. We hold for `TALKING_HOLD_MS` before settling to
 * `listening`; if `speaking` returns within that window the pending transition
 * is cancelled — so the avatar switches to listening ONLY once the shark has
 * actually finished talking, never mid-reply.
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

// Short hold only — absorbs the SDK's brief non-speaking blips during natural
// pauses so the avatar doesn't flip to listening mid-reply. The precise
// "is he making sound" detection lives in the hook's output-volume loop, which
// already debounces word-gaps, so this can stay small.
const TALKING_HOLD_MS = 120;

export function useSharkAvatarState(): SharkExpression {
  const status = useSharkVoiceStore((s) => s.status);
  const [expression, setExpression] = useState<SharkExpression>('listening');
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === 'speaking') {
      // Shark is talking: hold ONE talking loop for the whole turn — no cycling
      // between variants, no swapping mid-speech.
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setExpression('talking-1');
    } else {
      // Not speaking (user talking / thinking / connecting / idle) → the
      // attentive non-talking loop, but only after the finish-of-turn hold so
      // brief pauses inside the shark's reply don't flip it early.
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        setExpression('listening');
        exitTimerRef.current = null;
      }, TALKING_HOLD_MS);
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [status]);

  return expression;
}
