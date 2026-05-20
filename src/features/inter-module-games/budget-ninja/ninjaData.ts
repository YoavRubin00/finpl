import type { NinjaTargetKind, NinjaTargetMeta } from './types';

export const NINJA_TARGETS: Record<NinjaTargetKind, NinjaTargetMeta> = {
  'stock-up': {
    kind: 'stock-up',
    label: 'מניה ↑',
    isGood: true,
    scoreOnHit: 10,
    scoreOnMiss: -2,
    gradient: ['#16a34a', '#15803d'],
    textColor: '#ffffff',
  },
  dividend: {
    kind: 'dividend',
    label: 'דיבידנד',
    isGood: true,
    scoreOnHit: 30,
    scoreOnMiss: -5,
    gradient: ['#d4a017', '#92400e'],
    textColor: '#ffffff',
  },
  etf: {
    kind: 'etf',
    label: 'ETF',
    isGood: true,
    scoreOnHit: 15,
    scoreOnMiss: -3,
    gradient: ['#7c3aed', '#5b21b6'],
    textColor: '#ffffff',
  },
  inflation: {
    kind: 'inflation',
    label: 'אינפלציה',
    isGood: false,
    scoreOnHit: -20,
    scoreOnMiss: 5,
    gradient: ['#dc2626', '#991b1b'],
    textColor: '#ffffff',
  },
  tax: {
    kind: 'tax',
    label: 'מס',
    isGood: false,
    scoreOnHit: -15,
    scoreOnMiss: 3,
    gradient: ['#475569', '#1e293b'],
    textColor: '#ffffff',
  },
  'credit-fee': {
    kind: 'credit-fee',
    label: 'ריבית אשראי',
    isGood: false,
    scoreOnHit: -10,
    scoreOnMiss: 3,
    gradient: ['#ea580c', '#9a3412'],
    textColor: '#ffffff',
  },
  'bank-fee': {
    kind: 'bank-fee',
    label: 'עמלת בנק',
    isGood: false,
    scoreOnHit: -5,
    scoreOnMiss: 2,
    gradient: ['#6b7280', '#374151'],
    textColor: '#ffffff',
  },
};

export const NINJA_TARGET_KINDS: NinjaTargetKind[] = Object.keys(NINJA_TARGETS) as NinjaTargetKind[];

export const GAME_DURATION_MS = 12000;

/** Speed multiplier for the current session. 1 = normal, 1.3 = 30% faster (level 1), 1.6 = 60% faster (level 2) */
export const LEVEL_1_SPEED = 1.3;
export const LEVEL_2_SPEED = 1.6;

// Base timings (will be divided by speed multiplier)
export const SPAWN_INTERVAL_MS_BASE = 700;
export const FALL_DURATION_MIN_MS_BASE = 2600;
export const FALL_DURATION_MAX_MS_BASE = 3600;

export const SCORE_TIER_EXCELLENT = 120;
export const SCORE_TIER_GOOD = 60;
export const SCORE_TIER_OK = 20;

export function pickRandomKind(): NinjaTargetKind {
  return NINJA_TARGET_KINDS[Math.floor(Math.random() * NINJA_TARGET_KINDS.length)];
}
