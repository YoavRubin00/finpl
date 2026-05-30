/**
 * Asset catalog — types, tracks, defaults.
 *
 * Single source of truth for the Net Worth Dashboard. When the user doesn't
 * specify an expected return, we plug in a per-(type × track) default derived
 * from existing codebase constants and Warren-verified Israeli 2025-2026 norms.
 */

export type AssetType =
  | 'real_estate'
  | 'pension'
  | 'study_fund'
  | 'provident'
  | 'investment_account'
  | 'money_market'
  | 'checking'
  | 'cash'
  | 'valuables'
  | 'other';

export type Track =
  | 'none'
  | 'snp500'
  | 'equity'
  | 'general'
  | 'bonds'
  | 'real_estate_yielding';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  value: number;
  liquid: boolean;
  track?: Track;
  monthlyDeposit: number;
  expectedReturnPct?: number;
  notes?: string;
  createdAt: number;
}

export interface AssetTypeMeta {
  key: AssetType;
  label: string;
  emoji: string;
  /** Whether the type supports investment tracks. */
  hasTrack: boolean;
  /** Default liquidity flag — user can override per-asset. */
  defaultLiquid: boolean;
}

export const ASSET_TYPES: readonly AssetTypeMeta[] = [
  { key: 'real_estate',        label: 'נדל"ן',              emoji: '🏠', hasTrack: false, defaultLiquid: false },
  { key: 'pension',            label: 'קרן פנסיה',          emoji: '🐖', hasTrack: true,  defaultLiquid: false },
  { key: 'study_fund',         label: 'קרן השתלמות',        emoji: '📚', hasTrack: true,  defaultLiquid: false },
  { key: 'provident',          label: 'קופת גמל',           emoji: '🧾', hasTrack: true,  defaultLiquid: false },
  { key: 'investment_account', label: 'חשבון השקעות',       emoji: '📈', hasTrack: true,  defaultLiquid: true },
  { key: 'money_market',       label: 'קרן כספית',          emoji: '💵', hasTrack: false, defaultLiquid: true },
  { key: 'checking',           label: 'עו"ש',               emoji: '🏦', hasTrack: false, defaultLiquid: true },
  { key: 'cash',               label: 'מזומן',              emoji: '💰', hasTrack: false, defaultLiquid: true },
  { key: 'valuables',          label: 'חפצי ערך',           emoji: '⌚', hasTrack: false, defaultLiquid: false },
  { key: 'other',              label: 'אחר',                emoji: '✨', hasTrack: false, defaultLiquid: false },
];

export const TRACK_LABEL: Record<Track, string> = {
  none: 'ללא',
  snp500: 'S&P 500',
  equity: 'מנייתי',
  general: 'כללי',
  bonds: 'אג"ח',
  real_estate_yielding: 'נכס מניב',
};

/** Tracks visible per asset type. */
export const TRACKS_FOR_TYPE: Record<AssetType, readonly Track[]> = {
  real_estate:        ['none', 'real_estate_yielding'],
  pension:            ['snp500', 'equity', 'general', 'bonds'],
  study_fund:         ['snp500', 'equity', 'general', 'bonds'],
  provident:          ['snp500', 'equity', 'general', 'bonds'],
  investment_account: ['snp500', 'equity', 'general', 'bonds', 'none'],
  money_market:       ['none'],
  checking:           ['none'],
  cash:               ['none'],
  valuables:          ['none'],
  other:              ['none'],
};

/**
 * Default annual return % by (type × track). Used when the user doesn't override.
 *
 * Sources:
 *   - S&P 500 10%  → compoundData.ts:9
 *   - Pension/Provident equity 8%, general 6%, bonds 3.5% → investmentPathData.ts + trackSelectorData.ts
 *   - Money market 4.5% → Israeli 2025 norm (BoI rate ~4.5%)
 *   - Real estate appreciation 3.5% → realEstateData.ts blended national CAGR
 *   - Real estate yielding (rental + appreciation) 6% → reitData.ts residential blended
 *   - Cash / checking / valuables 0%
 */
function returnFor(type: AssetType, track: Track | undefined): number {
  const t: Track = track ?? 'none';
  if (type === 'real_estate') return t === 'real_estate_yielding' ? 6.0 : 3.5;
  if (type === 'money_market') return 4.5;
  if (type === 'checking' || type === 'cash' || type === 'valuables' || type === 'other') return 0;

  const isInvestable =
    type === 'pension' ||
    type === 'study_fund' ||
    type === 'provident' ||
    type === 'investment_account';
  if (!isInvestable) return 0;

  switch (t) {
    case 'snp500':
      return type === 'investment_account' ? 10 : 9;
    case 'equity':
      return 8;
    case 'general':
      return 6;
    case 'bonds':
      return 3.5;
    case 'none':
    default:
      if (type === 'study_fund') return 6;
      return 7;
  }
}

export function getDefaultReturn(type: AssetType, track?: Track): number {
  return returnFor(type, track);
}

/** Resolve the *effective* return for an asset — user override if set, else catalog default. */
export function effectiveReturnPct(asset: Pick<Asset, 'type' | 'track' | 'expectedReturnPct'>): number {
  if (typeof asset.expectedReturnPct === 'number' && Number.isFinite(asset.expectedReturnPct)) {
    return asset.expectedReturnPct;
  }
  return getDefaultReturn(asset.type, asset.track);
}

export function findTypeMeta(type: AssetType): AssetTypeMeta {
  return ASSET_TYPES.find((t) => t.key === type) ?? ASSET_TYPES[ASSET_TYPES.length - 1];
}
