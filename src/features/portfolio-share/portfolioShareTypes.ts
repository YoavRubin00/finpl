// Types for the community portfolio-sharing feed ("תיקי השקעות מהקהילה").

import type { FantasySectorId } from '../../constants/theme';

export interface SharedPick {
  ticker: string;
  sector: FantasySectorId;
  weeklyChange: number;
  /** Allocation as % of the whole portfolio — all picks sum to exactly 100. */
  allocationPct: number;
  isLeverage?: boolean;
}

export interface PortfolioComment {
  id: string;
  author: string;
  /** Game avatar id (AvatarImage); falls back to initials tile when null. */
  avatarId: string | null;
  isSelf?: boolean;
  text: string;
  ago: string;
  likes: number;
}

export interface SharedPortfolio {
  id: string;
  author: string;
  avatarId: string | null;
  isSelf?: boolean;
  tier: 'silver' | 'gold' | 'diamond';
  totalReturn: number;
  weekDay: number;
  picks: SharedPick[];
  likes: number;
  likedBySelf: boolean;
  comments: PortfolioComment[];
  caption: string;
  createdAt: string;
}
