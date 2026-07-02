import type { GemBundle } from './types';

const DIAMOND_LOTTIE = require('../../../assets/lottie/Diamond.json');

// Integrity (מוני, MONETIZATION-PLAN 2026-07-02): bonus tags are the REAL
// gems-per-₪ improvement vs the ₪3.50 anchor (80/3.50 = 22.9 gems/₪),
// rounded DOWN. The old tags overstated the top tiers (+80% was +58%,
// +100% was +75%) — fixed to truthful values, and isBestValue moved to the
// tier that actually has the best rate (spire, 40.0 gems/₪).

export const GEM_BUNDLES: GemBundle[] = [
  {
    id: 'gems-fistful',
    name: 'חופן יהלומים',
    gems: 80,
    priceILS: 3.50,
    priceLabel: '₪3.50',
    emoji: '💎',
    lottieSource: DIAMOND_LOTTIE,
  },
  {
    id: 'gems-pouch',
    name: 'שק יהלומים',
    gems: 500,
    priceILS: 17.90,
    priceLabel: '₪17.90',
    emoji: '💎',
    lottieSource: DIAMOND_LOTTIE,
    bonusLabel: '+20%',
  },
  {
    id: 'gems-bucket',
    name: 'דלי יהלומים',
    gems: 1200,
    priceILS: 35.90,
    priceLabel: '₪35.90',
    emoji: '💎💎',
    lottieSource: DIAMOND_LOTTIE,
    bonusLabel: '+45% • הכי פופולרי',
  },
  {
    id: 'gems-barrel',
    name: 'חבית יהלומים',
    gems: 2500,
    priceILS: 69.90,
    priceLabel: '₪69.90',
    emoji: '💎💎💎',
    lottieSource: DIAMOND_LOTTIE,
    bonusLabel: '+55% • המועדף',
  },
  {
    id: 'gems-wagon',
    name: 'עגלת יהלומים',
    gems: 6500,
    priceILS: 179.90,
    priceLabel: '₪179.90',
    emoji: '💎💎💎💎',
    lottieSource: DIAMOND_LOTTIE,
    bonusLabel: '+55%',
  },
  {
    id: 'gems-spire',
    name: 'מגדל יהלומים',
    gems: 14000,
    priceILS: 349.90,
    priceLabel: '₪349.90',
    emoji: '💎💎💎💎💎',
    lottieSource: DIAMOND_LOTTIE,
    bonusLabel: '+75%',
    isBestValue: true,
    isPromo: true,
  },
];
