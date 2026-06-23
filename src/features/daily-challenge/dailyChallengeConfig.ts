import { israelDayKey } from '../../utils/dateUtils';

export type GameKey =
  | 'higher-lower'
  | 'bullshit-swipe'
  | 'budget-ninja'
  | 'price-slider'
  | 'cashout-rush'
  | 'fomo-killer';

const WEEKLY_ROTATIONS: readonly [GameKey, GameKey, GameKey][] = [
  ['higher-lower', 'bullshit-swipe', 'fomo-killer'],
  ['price-slider', 'budget-ninja', 'cashout-rush'],
  ['bullshit-swipe', 'higher-lower', 'budget-ninja'],
  ['fomo-killer', 'cashout-rush', 'price-slider'],
];

export const GAME_LABELS: Record<GameKey, string> = {
  'higher-lower': 'גבוה או נמוך',
  'bullshit-swipe': 'מכונת בדיקה',
  'budget-ninja': "ניג'ה תקציב",
  'price-slider': 'מחיר מדויק',
  'cashout-rush': 'קאשאוט',
  'fomo-killer': 'FOMO קילר',
};

export const GAME_EMOJIS: Record<GameKey, string> = {
  'higher-lower': '📈',
  'bullshit-swipe': '🎯',
  'budget-ninja': '⚡',
  'price-slider': '💸',
  'cashout-rush': '💰',
  'fomo-killer': '🧠',
};

function getWeekIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.floor((d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return ((weekNum % WEEKLY_ROTATIONS.length) + WEEKLY_ROTATIONS.length) % WEEKLY_ROTATIONS.length;
}

export function getTodayGames(): [GameKey, GameKey, GameKey] {
  return [...WEEKLY_ROTATIONS[getWeekIndex(israelDayKey())]] as [GameKey, GameKey, GameKey];
}
