export type ChestRarity = "common" | "rare" | "epic";

export type ChestStatus = "locked" | "unlocking" | "ready";

export interface Chest {
  id: string;
  name: string;
  rarity: ChestRarity;
  unlockTimeMinutes: number;
  status: ChestStatus;
  unlockStartedAt: string | null; // ISO timestamp when unlocking began
}

export interface DailySpin {
  lastSpinDate: string | null; // ISO date string "YYYY-MM-DD", null if never spun
}

export type ChestDropType = "regular" | "premium";

export interface ChestReward {
  coins: number;
  xp: number;
  gems: number;
}
