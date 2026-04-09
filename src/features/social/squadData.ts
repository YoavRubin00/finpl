import type { Squad, SquadChestReward, SquadMember, SquadTier } from "./squadTypes";

// ---------------------------------------------------------------------------
// Mock members
// ---------------------------------------------------------------------------

export const MOCK_MEMBERS: SquadMember[] = [
  { id: "m-1", name: "דניאל", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=daniel", weeklyXP: 340 },
  { id: "m-2", name: "מאיה", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=maya", weeklyXP: 510 },
  { id: "m-3", name: "עומר", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=omer", weeklyXP: 180 },
  { id: "m-4", name: "נועה", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=noa", weeklyXP: 420 },
];

// ---------------------------------------------------------------------------
// Mock rival squads (for leaderboard)
// ---------------------------------------------------------------------------

export const MOCK_RIVAL_SQUADS: Pick<Squad, "id" | "name" | "weeklyScore" | "tier" | "rank">[] = [
  { id: "sq-r1", name: "אלפא פייננס", weeklyScore: 2800, tier: "gold", rank: 1 },
  { id: "sq-r2", name: "וולף סטריט", weeklyScore: 2350, tier: "gold", rank: 2 },
  { id: "sq-r3", name: "הכרישים", weeklyScore: 1900, tier: "silver", rank: 3 },
  { id: "sq-r4", name: "קריפטו קינגז", weeklyScore: 1400, tier: "silver", rank: 4 },
  { id: "sq-r5", name: "הבנקאים", weeklyScore: 900, tier: "bronze", rank: 5 },
];

// ---------------------------------------------------------------------------
// Mock squad registry (simulates server-side squad lookup by invite code)
// ---------------------------------------------------------------------------

export interface SquadListing {
  name: string;
  memberCount: number;
  tier: SquadTier;
  weeklyScore: number;
}

export const MOCK_SQUAD_REGISTRY: Record<string, SquadListing> = {
  ALPHA1: { name: "אלפא פייננס", memberCount: 7, tier: "gold", weeklyScore: 2800 },
  WOLF22: { name: "וולף סטריט", memberCount: 5, tier: "gold", weeklyScore: 2350 },
  SHARK3: { name: "הכרישים", memberCount: 8, tier: "silver", weeklyScore: 1900 },
  CRYPT4: { name: "קריפטו קינגז", memberCount: 6, tier: "silver", weeklyScore: 1400 },
  BANK55: { name: "הבנקאים", memberCount: 4, tier: "bronze", weeklyScore: 900 },
};

export function lookupSquadByCode(code: string): SquadListing | null {
  const upper = code.toUpperCase();
  // Exact match from registry
  if (MOCK_SQUAD_REGISTRY[upper]) return MOCK_SQUAD_REGISTRY[upper];
  // For demo: any 4+ char code generates a random squad
  if (upper.length >= 4) {
    return {
      name: `סקוואד ${upper.slice(0, 4)}`,
      memberCount: 3 + Math.floor(Math.random() * 5),
      tier: "bronze",
      weeklyScore: 100 + Math.floor(Math.random() * 500),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_SQUAD_MEMBERS = 10;
export const INVITE_CODE_LENGTH = 6;

export const TIER_THRESHOLDS: Record<SquadTier, number> = {
  bronze: 0,
  silver: 1000,
  gold: 2500,
  diamond: 5000,
};

export const TIER_COLORS: Record<SquadTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#d4a017",
  diamond: "#b9f2ff",
};

export const TIER_LABELS: Record<SquadTier, string> = {
  bronze: "ארד",
  silver: "כסף",
  gold: "זהב",
  diamond: "יהלום",
};

export const CHEST_REWARDS: Record<SquadTier, SquadChestReward> = {
  bronze: { gems: 3, coins: 50 },
  silver: { gems: 5, coins: 100 },
  gold: { gems: 10, coins: 200 },
  diamond: { gems: 20, coins: 400 },
};

// Ranking multipliers: top squads get bonus rewards on their weekly chest
export const RANK_MULTIPLIERS: Record<number, number> = {
  1: 2.0,
  2: 1.5,
  3: 1.25,
};

/** Returns the multiplier for a given rank (1st=2x, 2nd=1.5x, 3rd=1.25x, else 1x) */
export function getRankMultiplier(rank: number): number {
  return RANK_MULTIPLIERS[rank] ?? 1.0;
}

/** Compute final chest reward factoring in tier + ranking */
export function computeChestReward(tier: SquadTier, rank: number): SquadChestReward {
  const base = CHEST_REWARDS[tier];
  const multiplier = getRankMultiplier(rank);
  return {
    gems: Math.floor(base.gems * multiplier),
    coins: Math.floor(base.coins * multiplier),
  };
}

/** Get the ISO week number for a date (used for weekly reset detection) */
export function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function computeTier(weeklyScore: number): SquadTier {
  if (weeklyScore >= TIER_THRESHOLDS.diamond) return "diamond";
  if (weeklyScore >= TIER_THRESHOLDS.gold) return "gold";
  if (weeklyScore >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}
