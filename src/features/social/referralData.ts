// ---------------------------------------------------------------------------
// PRD 32 — US-005: Wealth Network — Constants & Mock Data
// ---------------------------------------------------------------------------

import type { ReferredFriend, ReferralTierInfo, ReferralTier } from "./referralTypes";

// ── Tier Definitions ──

export const REFERRAL_TIERS: ReferralTierInfo[] = [
  {
    tier: "starter",
    label: "מתחיל",
    requiredReferrals: 0,
    color: "#64748b",
    badgeEmoji: "🌱",
  },
  {
    tier: "gold_investor",
    label: "משקיע זהב",
    requiredReferrals: 3,
    color: "#ca8a04",
    badgeEmoji: "🥇",
  },
  {
    tier: "whale",
    label: "לוויתן",
    requiredReferrals: 5,
    color: "#0ea5e9",
    badgeEmoji: "🐋",
  },
];

export function computeReferralTier(referralCount: number): ReferralTierInfo {
  // Return highest tier the user qualifies for
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (referralCount >= REFERRAL_TIERS[i].requiredReferrals) {
      return REFERRAL_TIERS[i];
    }
  }
  return REFERRAL_TIERS[0];
}

export function getNextTier(currentTier: ReferralTier): ReferralTierInfo | null {
  const idx = REFERRAL_TIERS.findIndex((t) => t.tier === currentTier);
  if (idx < REFERRAL_TIERS.length - 1) return REFERRAL_TIERS[idx + 1];
  return null;
}

// ── Status Unlock Definitions ──

export interface StatusUnlock {
  tier: ReferralTier;
  label: string;
  description: string;
  frameColor?: string;
  frameShadowColor?: string;
}

/** Cosmetic rewards unlocked at each referral tier */
export const STATUS_UNLOCKS: Record<string, StatusUnlock> = {
  gold_investor: {
    tier: "gold_investor",
    label: "מסגרת משקיע זהב",
    description: "מסגרת אווטאר זהובה בפרופיל",
    frameColor: "#ca8a04",
    frameShadowColor: "#a16207",
  },
  whale: {
    tier: "whale",
    label: "תג לוויתן הולוגרפי",
    description: "תג 3D הולוגרפי ליד השם",
  },
};

// ── Reward Constants ──

export const DIAMOND_CHEST_GEMS = 5;
export const DIVIDEND_PERCENT = 0.05; // 5% of referred friends' daily XP/gold

// ── ISO Date Helper ──

/** Returns ISO date key like "2026-03-18" */
export function getISODateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Referral Code Generation ──

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "FP-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Mock Referred Friends ──

const MOCK_NAMES = ["דנה כ.", "עומר ש.", "נועה ל.", "יובל מ.", "שירה א."];
const MOCK_EMOJIS = ["🦊", "🐼", "🦁", "🐨", "🦄"];
const MOCK_MODULES = ["mod-1-3", "mod-1-5", "mod-2-8", "mod-1-2", "mod-2-10"];

export function generateMockFriends(count: number): ReferredFriend[] {
  const friends: ReferredFriend[] = [];
  const now = Date.now();
  for (let i = 0; i < Math.min(count, MOCK_NAMES.length); i++) {
    friends.push({
      id: `ref-${i + 1}`,
      displayName: MOCK_NAMES[i],
      avatarEmoji: MOCK_EMOJIS[i],
      joinedAt: now - (i + 1) * 86400000 * 3, // staggered by 3 days
      hasCompletedOnboarding: i < count - 1, // last one hasn't completed
      yesterdayXP: Math.floor(Math.random() * 300) + 50,
      yesterdayGold: Math.floor(Math.random() * 400) + 100,
      currentModuleId: MOCK_MODULES[i],
    });
  }
  return friends;
}
