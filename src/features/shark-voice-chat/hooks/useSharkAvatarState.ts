import { useEffect, useRef, useState } from 'react';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import type { SharkVoiceStatus } from '../useSharkVoiceStore';

/**
 * Drives which "expression" video the shark avatar plays based on the live
 * voice session status. Talking states rotate randomly between three loops
 * so the shark doesn't look mechanically identical every time it speaks.
 *
 * For now we re-use existing animated WebP assets bundled in the repo
 * (see assets/webp). Once Higgsfield-generated WebM loops are saved into
 * assets/video, switch the imports there.
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

const TALKING_VARIANTS: SharkExpression[] = ['talking-1', 'talking-2', 'talking-3'];

function pickTalking(prev: SharkExpression | null): SharkExpression {
  const choices = prev
    ? TALKING_VARIANTS.filter((c) => c !== prev)
    : TALKING_VARIANTS;
  const idx = Math.floor(Math.random() * choices.length);
  return choices[idx] ?? 'talking-1';
}

function mapStatusToExpression(
  status: SharkVoiceStatus,
  lastTalking: SharkExpression | null,
): SharkExpression {
  switch (status) {
    case 'connecting':
    case 'idle':
      return 'idle';
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return pickTalking(lastTalking);
    case 'error':
      return 'empathic';
    default:
      return 'idle';
  }
}

export function useSharkAvatarState(): SharkExpression {
  const status = useSharkVoiceStore((s) => s.status);
  const lastTalkingRef = useRef<SharkExpression | null>(null);
  const [expression, setExpression] = useState<SharkExpression>('idle');

  useEffect(() => {
    const next = mapStatusToExpression(status, lastTalkingRef.current);
    if (next.startsWith('talking-')) {
      lastTalkingRef.current = next;
    }
    setExpression(next);
  }, [status]);

  return expression;
}
