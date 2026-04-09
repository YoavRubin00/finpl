import type { CoinBundle } from './types';

const COIN_LOTTIE = require('../../../assets/lottie/wired-flat-298-coins-hover-jump.json');

export const COIN_BUNDLES: CoinBundle[] = [
  {
    id: 'coins-pouch',
    name: 'שק זהב',
    coins: 1000,
    gemCost: 60,
    emoji: ' מטבעות',
    lottieSource: COIN_LOTTIE,
  },
  {
    id: 'coins-bucket',
    name: 'דלי זהב',
    coins: 10000,
    gemCost: 500,
    emoji: ' מטבעות מטבעות',
    lottieSource: require('../../../assets/lottie/3D Treasure Box.json'),
    isBestValue: true,
    bonusLabel: '+67%',
  },
  {
    id: 'coins-wagon',
    name: 'עגלת זהב',
    coins: 100000,
    gemCost: 4500,
    emoji: '💰',
    lottieSource: require('../../../assets/lottie/Money.json'),
    bonusLabel: '+33%',
  },
];
