// ===== CHAT =====

export type ClanChatMessage = ClanChatTextMessage | ClanChatSystemMessage;

export interface ClanChatTextMessage {
  kind: 'text';
  id: string;
  sentAt: string; // ISO
  authorId: string;
  authorName: string;
  authorAvatar: string;
  body: string; // max 280 chars
}

export type ClanChatEvent =
  | 'member_joined'
  | 'member_left'
  | 'donation_sent'
  | 'donation_request'
  | 'group_buy_started'
  | 'group_buy_funded'
  | 'group_buy_payout'
  | 'chest_unlocked'
  | 'weekly_reset'
  | 'tier_promoted';

export interface ClanChatSystemMessage {
  kind: 'system';
  id: string;
  sentAt: string;
  event: ClanChatEvent;
  body: string; // pre-rendered Hebrew
  payload?: {
    memberId?: string;
    amount?: number;
    currency?: ClanCurrency;
    projectId?: string;
  };
}

// ===== DONATIONS =====

export type ClanCurrency = 'coins' | 'gems';

export interface DonationRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  currency: ClanCurrency;
  amountRequested: number;
  amountReceived: number;
  createdAt: string;
  expiresAt: string; // 24h auto-expire
  status: 'open' | 'fulfilled' | 'expired';
  donorIds: string[];
  note?: string;
}

export interface Donation {
  id: string;
  requestId: string;
  donorId: string;
  recipientId: string;
  currency: ClanCurrency;
  amount: number;
  donatedAt: string;
  reputationGained: number;
  thanked: boolean;
}

export interface DonorDailyLimits {
  date: string; // YYYY-MM-DD
  coinsDonated: number; // cap 50
  gemsDonated: number;  // cap 5
}

// ===== GROUP BUY =====

export type ContributionCurrency = 'coins' | 'gems' | 'fantasyCash';

export interface GroupBuyProject {
  id: string;
  name: string;
  emoji: string;
  descriptionHebrew: string;
  goalCurrency: ContributionCurrency;
  goalAmount: number;
  raisedAmount: number;
  status: 'active' | 'funded' | 'cancelled';
  startedAt: string;
  fundedAt?: string;
  dailyYieldCoins: number;
  dailyYieldGems: number;
  createdBy: string;
  contributorIds: string[];
}

export interface GroupBuyContribution {
  id: string;
  projectId: string;
  contributorId: string;
  contributorName: string;
  currency: ContributionCurrency;
  amount: number;
  amountInGoalCurrency: number;
  contributedAt: string;
}

export interface OwnedAsset {
  id: string;
  sourceProjectId: string;
  name: string;
  emoji: string;
  acquiredAt: string;
  dailyYieldCoins: number;
  dailyYieldGems: number;
  shares: Record<string, number>; // memberId -> share (0..1)
  lastDistributedDate: string | null;
  lifetimeCoinsPaid: number;
  lifetimeGemsPaid: number;
}

// ===== GOALS / CHEST =====

export type ClanGoalKind =
  | 'duels_won'
  | 'xp_earned'
  | 'donations_made'
  | 'lessons_completed';

export interface ClanGoal {
  id: string;
  kind: ClanGoalKind;
  labelHebrew: string;
  target: number;
  rewardCoins: number;
  rewardGems: number;
  rewardChestPoints: number;
}

export interface ClanChestProgress {
  weekKey: string; // ISO week "YYYY-Www"
  progressByGoalId: Record<string, number>;
  completedGoalIds: string[];
  chestPoints: number;
  claimed: boolean;
}
