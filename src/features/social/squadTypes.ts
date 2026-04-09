export type SquadTier = "bronze" | "silver" | "gold" | "diamond";

export interface SquadMember {
  id: string;
  name: string;
  avatar: string;
  weeklyXP: number;
}

export interface Squad {
  id: string;
  name: string;
  inviteCode: string;
  tier: SquadTier;
  members: SquadMember[];
  weeklyScore: number;
  rank: number;
  createdAt: string;
}

export interface SquadChestReward {
  gems: number;
  coins: number;
}
