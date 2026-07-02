import type { CoinBundle } from './types';

const COIN_LOTTIE = require('../../../assets/lottie/wired-flat-298-coins-hover-jump.json');

// Re-priced 2026-07-02 (מוני ruling, MONETIZATION-PLAN): base rate is now
// 50 gems = 1,000 coins (was 20/1,000). At the old rate, ₪3.50 of gems bought
// 4,000 coins — enough to instantly clear the Bridge's 2,500-coin redemption
// tiers with pocket change, gutting both the coin economy and the Bridge's
// earn-first design. Upper tiers re-laddered so the printed bonus stays
// truthful vs the new 20-coins-per-gem base (bucket 26.7/gem = +33%; wagon
// 28.6/gem = +42%, labeled +40% — understating is fine, overstating never).
export const COIN_BUNDLES: CoinBundle[] = [
  {
    id: 'coins-pouch',
    name: 'שק זהב',
    coins: 1000,
    gemCost: 50,
    emoji: '🪙',
    lottieSource: COIN_LOTTIE,
  },
  {
    id: 'coins-bucket',
    name: 'דלי זהב',
    coins: 10000,
    gemCost: 375,
    emoji: '💰',
    lottieSource: require('../../../assets/lottie/3D Treasure Box.json'),
    isBestValue: true,
    bonusLabel: '+33%',
  },
  {
    id: 'coins-wagon',
    name: 'עגלת זהב',
    coins: 100000,
    gemCost: 3500,
    emoji: '🏆',
    lottieSource: require('../../../assets/lottie/Money.json'),
    bonusLabel: '+40%',
  },
];
