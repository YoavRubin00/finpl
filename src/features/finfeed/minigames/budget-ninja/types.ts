export type NinjaTargetKind =
  | 'stock-up'
  | 'dividend'
  | 'etf'
  | 'inflation'
  | 'tax'
  | 'credit-fee'
  | 'bank-fee';

export interface NinjaTargetMeta {
  kind: NinjaTargetKind;
  label: string;
  isGood: boolean;
  scoreOnHit: number;
  scoreOnMiss: number;
  gradient: [string, string];
  textColor: string;
}

export interface FallingTarget {
  id: string;
  kind: NinjaTargetKind;
  spawnedAt: number;
  xPercent: number;
  fallDurationMs: number;
  rotationStart: number;
  rotationEnd: number;
}
