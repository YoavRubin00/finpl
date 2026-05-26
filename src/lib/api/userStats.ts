// src/lib/api/userStats.ts
import { api } from './client';

export interface UserStatsRow {
  userId: string;
  totalSessionSeconds: number;
  moduleDurations: Record<string, number> | null;
  updatedAt: string | null;
}

export function getUserStats() {
  return api.get<{ ok: true; userStats: UserStatsRow | null }>('/api/sync/user-stats');
}

export function recordSessionTime(seconds: number) {
  return api.post<{ sessionSecondsDelta: number }, { ok: true; userStats: UserStatsRow | null }>(
    '/api/sync/user-stats',
    { sessionSecondsDelta: seconds },
  );
}

export function recordModuleDuration(moduleId: string, seconds: number) {
  return api.post<
    { moduleId: string; moduleSecondsDelta: number },
    { ok: true; userStats: UserStatsRow | null }
  >('/api/sync/user-stats', { moduleId, moduleSecondsDelta: seconds });
}
