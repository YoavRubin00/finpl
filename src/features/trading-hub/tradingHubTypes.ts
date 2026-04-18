export type AssetType = 'stock' | 'index' | 'commodity' | 'crypto';

export type Timeframe = '1MIN' | '5MIN' | '1H' | '1D' | '1W';

export type OrderType = 'market' | 'limit';

export interface PendingLimitOrder {
  id: string;
  assetId: string;
  side: 'buy';
  limitPrice: number;
  amountInvested: number;
  createdAt: number;
}

export type VolatilityRating = 'low' | 'medium' | 'high' | 'extreme';

export interface TradableAsset {
  id: string; // ticker symbol
  name: string;
  symbol: string; // emoji or icon identifier
  type: AssetType;
  descriptionHebrew: string;
  volatilityRating: VolatilityRating;
  educationalTag: string; // e.g. "פרק 4 — מניות"
}

export interface ChartDataPoint {
  timestamp: number;
  /** Close price — legacy field kept in sync with `close` for older consumers (LiveChart, Holdings, etc). */
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export type ChartMode = 'simple' | 'advanced';
export type IndicatorId = 'ma20' | 'rsi';

export interface ActivePosition {
  id: string;
  assetId: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  amountInvested: number; // coins
  openedAt: number; // timestamp
  pnlPercent: number;
}

export interface TradingState {
  selectedAssetId: string;
  currentTimeframe: Timeframe;
  chartData: ChartDataPoint[];
  activePositions: ActivePosition[];
  isMarketOpen: boolean;
  isLoading: boolean;
}
