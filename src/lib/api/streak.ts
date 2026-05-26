// src/lib/api/streak.ts
import { api } from './client';

export interface StreakState {
  currentStreak: number | null;
  longestStreak: number | null;
  lastActiveDate: string | null;
}

export function getStreak() {
  return api.get<{ ok: true; streak: StreakState | null }>('/api/sync/streak');
}

export function recordDailyActivity(dateIl: string) {
  return api.post<{ dateIl: string }, { ok: true; streak: StreakState }>('/api/sync/streak', { dateIl });
}
