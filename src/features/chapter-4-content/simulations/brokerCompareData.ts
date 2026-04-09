/**
 * SIM 4-26: השוואת ברוקרים (Broker Compare) — Module 4-26
 * 3 Israeli-market brokers with realistic fee structures.
 */

import type { Broker, BrokerCompareConfig, UserProfile } from './brokerCompareTypes';

// ── Brokers ─────────────────────────────────────────────────────────────

const brokerBank: Broker = {
  id: 'broker-bank',
  name: 'בנק מסורתי',
  emoji: '🏦',
  tradeFeePercent: 0.003,       // 0.3% per trade
  tradeFeeMin: 15,              // minimum ₪15 per trade
  custodyFeePercent: 0.0035,    // 0.35% annual custody fee
  fxFeePercent: 0.005,          // 0.5% foreign exchange spread
  inactivityFee: 0,             // no inactivity fee
};

const brokerLocal: Broker = {
  id: 'broker-local',
  name: 'בית השקעות מקומי',
  emoji: '📊',
  tradeFeePercent: 0.0008,      // 0.08% per trade
  tradeFeeMin: 5,               // minimum ₪5 per trade
  custodyFeePercent: 0,         // no custody fee
  fxFeePercent: 0.003,          // 0.3% foreign exchange spread
  inactivityFee: 0,             // no inactivity fee
};

const brokerGlobal: Broker = {
  id: 'broker-global',
  name: 'פלטפורמה בינלאומית',
  emoji: '🌍',
  tradeFeePercent: 0,           // flat fee model (uses tradeFeeMin)
  tradeFeeMin: 4,               // ~$1 ≈ ₪4 flat per trade
  custodyFeePercent: 0,         // no custody fee
  fxFeePercent: 0.0002,         // 0.02% FX — best in class
  inactivityFee: 0,             // removed inactivity fee in 2021
};

// ── Broker List ─────────────────────────────────────────────────────────

const BROKERS: Broker[] = [brokerBank, brokerLocal, brokerGlobal];

// ── Default User Profile ────────────────────────────────────────────────

export const DEFAULT_PROFILE: UserProfile = {
  investmentAmount: 100_000,
  tradesPerMonth: 4,
  isInternational: false,
};

// ── Helper: Calculate Yearly Cost ───────────────────────────────────────

/**
 * Calculate total annual cost for a broker given a user profile.
 * Formula: (tradesPerMonth × 12 × tradeFee) + (investmentAmount × custodyFee)
 *          + (isInternational ? investmentAmount × fxFeePercent : 0) + inactivityFee
 *
 * Trade fee per trade = max(investmentAmount / tradesPerMonth × tradeFeePercent, tradeFeeMin)
 * (we estimate average trade size as investmentAmount split across monthly trades)
 */
export function calcYearlyCost(broker: Broker, profile: UserProfile): number {
  const avgTradeSize = profile.investmentAmount / Math.max(profile.tradesPerMonth, 1);
  const feePerTrade = Math.max(avgTradeSize * broker.tradeFeePercent, broker.tradeFeeMin);
  const annualTradeCost = feePerTrade * profile.tradesPerMonth * 12;

  const annualCustodyCost = profile.investmentAmount * broker.custodyFeePercent;

  const annualFxCost = profile.isInternational
    ? profile.investmentAmount * broker.fxFeePercent
    : 0;

  return annualTradeCost + annualCustodyCost + annualFxCost + broker.inactivityFee;
}

// ── Config Export ───────────────────────────────────────────────────────

export const brokerCompareConfig: BrokerCompareConfig = {
  brokers: BROKERS,
};

/** Total number of brokers */
export const TOTAL_BROKERS = BROKERS.length;
