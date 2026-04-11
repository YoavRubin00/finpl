import type { Challenge, LeaderboardEntry } from "./types";

export const DAILY_CHALLENGES: readonly Challenge[] = [
  {
    id: "challenge-001",
    title: "Check Your Balance",
    description: "Open your banking app and note your current balance.",
    coinReward: 150,
    xpReward: 10,
  },
  {
    id: "challenge-002",
    title: "Log One Expense",
    description: "Write down one expense you made today, no matter how small.",
    coinReward: 200,
    xpReward: 15,
  },
  {
    id: "challenge-003",
    title: "Skip One Impulse Buy",
    description: "Identify something you wanted to buy today and chose not to.",
    coinReward: 250,
    xpReward: 20,
  },
];

export const MOCK_LEADERBOARD: readonly LeaderboardEntry[] = [
  { rank: 1, name: "Noa T.", xp: 820, isCurrentUser: false },
  { rank: 2, name: "Eidan R.", xp: 710, isCurrentUser: false },
  { rank: 3, name: "Maya S.", xp: 630, isCurrentUser: false },
  { rank: 4, name: "Yotam K.", xp: 520, isCurrentUser: false },
  { rank: 5, name: "Dana L.", xp: 480, isCurrentUser: false },
];
