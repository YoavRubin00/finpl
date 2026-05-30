/**
 * Wait-state minigame registry — surfaces inside `WaitGameOverlay` while a
 * deep stock analysis is in flight (30-120s wait for Claude Opus 4.7).
 *
 * Each entry's underlying card supports a `freePlay` prop that bypasses the
 * daily-challenges quota write, so playing here does NOT consume the user's
 * once-per-day reward slot for the same game. They can still earn each
 * game's daily reward via the proper Daily Challenge surface later.
 */
import type { ComponentType } from 'react';
import { HigherLowerCard } from '../../inter-module-games/higher-lower/HigherLowerCard';
import { CashoutRushCard } from '../../inter-module-games/cashout-rush/CashoutRushCard';
import { PriceSliderCard } from '../../inter-module-games/price-slider/PriceSliderCard';

export type WaitGameId = 'higher-lower' | 'cashout-rush' | 'price-slider';

interface CardCommonProps {
  isActive: boolean;
  freePlay?: boolean;
}

/** Each card emits a "finish" callback under a different prop name — we
 *  normalize at the registry so the overlay can call `onFinish` uniformly. */
type CardComponent =
  | (ComponentType<CardCommonProps & { onComplete?: () => void }>)
  | (ComponentType<CardCommonProps & { onContinue?: () => void }>);

export interface WaitGame {
  id: WaitGameId;
  titleHe: string;
  emoji: string;
  Component: CardComponent;
  /** Which prop the underlying card uses to signal "finished" */
  finishProp: 'onComplete' | 'onContinue';
}

export const WAIT_GAMES: readonly WaitGame[] = [
  {
    id: 'higher-lower',
    titleHe: 'מי מנצח',
    emoji: '⚖️',
    Component: HigherLowerCard as CardComponent,
    finishProp: 'onComplete',
  },
  {
    id: 'cashout-rush',
    titleHe: 'Fear or Greed',
    emoji: '🎲',
    Component: CashoutRushCard as CardComponent,
    finishProp: 'onContinue',
  },
  {
    id: 'price-slider',
    titleHe: 'תמחור המציאות',
    emoji: '🎯',
    Component: PriceSliderCard as CardComponent,
    finishProp: 'onContinue',
  },
];

export function pickRandomGame(): WaitGame {
  return WAIT_GAMES[Math.floor(Math.random() * WAIT_GAMES.length)];
}

/** Pick a different game than the one just finished — keeps variety when the
 *  user chains rounds while waiting for a particularly long analysis. */
export function pickNextDifferent(currentId: WaitGameId): WaitGame {
  const others = WAIT_GAMES.filter((g) => g.id !== currentId);
  return others[Math.floor(Math.random() * others.length)];
}
