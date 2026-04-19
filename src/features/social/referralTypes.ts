// ---------------------------------------------------------------------------
// PRD 32, US-005: Wealth Network (Refer a Friend) Types
// ---------------------------------------------------------------------------

export interface ReferredFriend {
  id: string;
  displayName: string;
  avatarEmoji: string;
  joinedAt: number; // timestamp
  hasCompletedOnboarding: boolean;
  yesterdayXP: number;
  yesterdayGold: number;
  currentModuleId?: string; // module the friend is currently on
}

export type ReferralTier = "starter" | "gold_investor" | "whale";

export interface ReferralTierInfo {
  tier: ReferralTier;
  label: string;
  requiredReferrals: number;
  color: string;
  badgeEmoji: string;
}

export interface ReferralState {
  referralCode: string;
  referredFriends: ReferredFriend[];
  totalDividendXP: number;
  totalDividendCoins: number;
  hasClaimedDiamondChest: Record<string, boolean>; // friendId → claimed
  lastDividendDate: string; // ISO date key of last collection (e.g. "2026-03-18")

  // Actions
  generateCode: () => void;
  addReferredFriend: (friend: ReferredFriend) => void;
  claimDiamondChest: (friendId: string) => void;
  collectDividend: () => void;
  refreshDailyActivity: () => void; // simulate mock friends earning XP each day
  canCollectDividend: () => boolean;
}
