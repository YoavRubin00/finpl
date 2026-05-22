// src/lib/api/migrate.ts
import { api } from './client';
import type { ProfileRow } from './profile';
import type { ModuleProgressRow } from './progress';

export interface BackfillPayload {
  profile?: {
    xp?: number; coins?: number; gems?: number;
    currentStreak?: number; longestStreak?: number;
    virtualBalance?: number;
    isPro?: boolean;
    preferences?: Record<string, unknown>;
  };
  modules?: Array<{
    moduleId: string;
    moduleName?: string;
    status?: 'not_started' | 'in_progress' | 'completed';
    bestScore?: number;
    xpEarned?: number;
  }>;
}

export function postBackfillV1(payload: BackfillPayload) {
  return api.post<BackfillPayload, { ok: true; profile: ProfileRow; progress: ModuleProgressRow[] }>(
    '/api/migrate/backfill-v1',
    payload,
  );
}
