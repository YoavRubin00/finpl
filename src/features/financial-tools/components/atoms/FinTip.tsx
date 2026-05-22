import React from 'react';
import { ToolSharkTip, type ToolSharkMood } from '../ToolSharkTip';

export type FinTipKind = 'tip' | 'warning' | 'secret' | 'grow';

interface FinTipProps {
  text: string;
  subtext?: string;
  kind?: FinTipKind;
}

const VARIANTS: Record<FinTipKind, { surface: string; accent: string; mood: ToolSharkMood }> = {
  tip:     { surface: '#eff6ff', accent: '#005bb1', mood: 'standard' },
  warning: { surface: '#fff7ed', accent: '#ea580c', mood: 'empathic' },
  secret:  { surface: '#fef3c7', accent: '#a16207', mood: 'happy' },
  grow:    { surface: '#dcfce7', accent: '#15803d', mood: 'fire' },
};

/**
 * Shark-mascot tip card with semantic variants:
 * - `tip` — blue, neutral info
 * - `warning` — orange, "watch out"
 * - `secret` — gold, "the trick is…"
 * - `grow` — green, "do this and you'll grow"
 *
 * Thin wrapper over `ToolSharkTip` — same shark, different vibe per kind.
 */
export function FinTip({
  text,
  subtext,
  kind = 'tip',
}: FinTipProps): React.ReactElement {
  const v = VARIANTS[kind];
  return (
    <ToolSharkTip
      text={text}
      subtext={subtext}
      mood={v.mood}
      accentColor={v.accent}
      accentSurface={v.surface}
    />
  );
}
