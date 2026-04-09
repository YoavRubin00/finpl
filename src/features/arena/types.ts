export interface Challenge {
  id: string;
  title: string;
  description: string;
  coinReward: number;
  xpReward: number;
}

export interface ChallengeProgress {
  completedDate: string | null; // "YYYY-MM-DD" — null means not done today
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  isCurrentUser: boolean;
}
