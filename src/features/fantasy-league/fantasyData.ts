import type { FantasyLeague, LeaderboardEntry } from './fantasyTypes';

/**
 * Returns the ISO date string for the most recent Monday (start of week)
 * and the upcoming Sunday (end of week).
 */
function getCurrentWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

const { start, end } = getCurrentWeekBounds();

export const CURRENT_LEAGUE: FantasyLeague = {
  id: 'league-weekly-001',
  name: 'ליגת השבוע',
  startDate: start,
  endDate: end,
  budgetPerPlayer: 10_000,
  status: 'active',
};

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, playerId: 'ai-01', displayName: 'נועה כהן', portfolioValue: 11_200, pnlPercent: 12.0, change: '+1' },
  { rank: 2, playerId: 'ai-02', displayName: 'איתי לוי', portfolioValue: 10_980, pnlPercent: 9.8, change: '-1' },
  { rank: 3, playerId: 'ai-03', displayName: 'מאיה אברהם', portfolioValue: 10_750, pnlPercent: 7.5, change: 'new' },
  // Rank 4 reserved for local player (inserted dynamically by store)
  { rank: 5, playerId: 'ai-04', displayName: 'עומר דוד', portfolioValue: 10_450, pnlPercent: 4.5, change: '+1' },
  { rank: 6, playerId: 'ai-05', displayName: 'שירה מזרחי', portfolioValue: 10_320, pnlPercent: 3.2, change: '-1' },
  { rank: 7, playerId: 'ai-06', displayName: 'יונתן פרץ', portfolioValue: 10_150, pnlPercent: 1.5, change: '+1' },
  { rank: 8, playerId: 'ai-07', displayName: 'תמר ביטון', portfolioValue: 10_050, pnlPercent: 0.5, change: 'new' },
  { rank: 9, playerId: 'ai-08', displayName: 'אורי גולדשטיין', portfolioValue: 9_800, pnlPercent: -2.0, change: '-1' },
  { rank: 10, playerId: 'ai-09', displayName: 'הילה רוזנברג', portfolioValue: 9_650, pnlPercent: -3.5, change: '+1' },
  { rank: 11, playerId: 'ai-10', displayName: 'דניאל שמעוני', portfolioValue: 9_500, pnlPercent: -5.0, change: '-1' },
];
