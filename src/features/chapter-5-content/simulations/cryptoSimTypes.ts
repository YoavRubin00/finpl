/**
 * SIM 5-30: סימולטור הקריפטו (Crypto Sim) — Module 5-30
 * Types for the crypto allocation vs S&P 500 comparison simulation.
 */

export type CryptoAssetId = 'btc' | 'eth' | 'cash';

export interface CryptoAsset {
  id: CryptoAssetId;
  name: string;
  emoji: string;
}

export interface CryptoAllocation {
  btcPercent: number;
  ethPercent: number;
  cashPercent: number; // btcPercent + ethPercent + cashPercent must sum to 100
}

export interface CryptoYear {
  year: number;
  btcReturn: number;   // decimal fraction (0.60 = +60%)
  ethReturn: number;    // decimal fraction
  sp500Return: number;  // decimal fraction
}

export interface CryptoSimConfig {
  initialAmount: number; // 10000
  yearData: CryptoYear[];
  assets: CryptoAsset[];
}

export interface CryptoSimState {
  allocation: CryptoAllocation;
  cryptoBalanceByYear: number[];
  stockBalanceByYear: number[];
  currentYear: number;
  maxDrawdownPercent: number;
  isPlaying: boolean;
  isComplete: boolean;
}

export interface CryptoSimScore {
  cryptoFinal: number;
  stockFinal: number;
  maxDrawdown: number;       // worst year-end-to-year-end drop percentage
  volatilityRatio: number;   // crypto volatility vs stock volatility
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
