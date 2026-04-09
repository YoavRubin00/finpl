import type { ChestRarity, ChestDropType, ChestReward } from "./types";

/** Reward ranges by chest drop type */
const REWARD_RANGES: Record<ChestDropType, {
  coins: [number, number];
  xp: [number, number];
  gems: [number, number];
  gemChance: number;
}> = {
  regular: {
    coins: [20, 50],
    xp: [25, 45],
    gems: [0, 2],
    gemChance: 0.25,
  },
  premium: {
    coins: [120, 200],
    xp: [80, 150],
    gems: [5, 12],
    gemChance: 1,
  },
};

const RARITY_BY_TYPE: Record<ChestDropType, ChestRarity> = {
  regular: "common",
  premium: "epic",
};

/** Every 7 days of streak adds 10% to coin and XP drops */
const STREAK_MULTIPLIER_STEP = 7;
const STREAK_MULTIPLIER_BONUS = 0.10;

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Calculate streak multiplier: +10% per 7 streak days */
export function getStreakMultiplier(streak: number): number {
  const steps = Math.floor(streak / STREAK_MULTIPLIER_STEP);
  return 1 + steps * STREAK_MULTIPLIER_BONUS;
}

/** Get bonus percentage for display (e.g. 10, 20, 30...) */
export function getStreakBonusPercent(streak: number): number {
  return Math.floor(streak / STREAK_MULTIPLIER_STEP) * (STREAK_MULTIPLIER_BONUS * 100);
}

export interface ChestDrop {
  rarity: ChestRarity;
  rewards: ChestReward;
  streakBonusPercent: number;
}

export function generateChestDrop(type: ChestDropType, streak: number = 0): ChestDrop {
  const range = REWARD_RANGES[type];
  const rarity = RARITY_BY_TYPE[type];
  const multiplier = getStreakMultiplier(streak);
  const streakBonusPercent = getStreakBonusPercent(streak);

  const baseCoins = randomInRange(range.coins[0], range.coins[1]);
  const baseXp = randomInRange(range.xp[0], range.xp[1]);
  const coins = Math.round(baseCoins * multiplier);
  const xp = Math.round((baseXp * multiplier) / 5) * 5; // Always multiples of 5
  const gems = Math.random() < range.gemChance
    ? randomInRange(range.gems[0], range.gems[1])
    : 0;

  return {
    rarity,
    rewards: { coins, xp, gems },
    streakBonusPercent,
  };
}
