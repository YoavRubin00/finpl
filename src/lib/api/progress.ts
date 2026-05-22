// src/lib/api/progress.ts
import { api } from './client';

export interface ModuleProgressRow {
  moduleId: string;
  moduleName: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  quizScore: number | null;
  quizAttempts: number | null;
  bestScore: number | null;
  xpEarned: number | null;
  completedAt: string | null;
}

export function getProgress() {
  return api.get<{ ok: true; progress: ModuleProgressRow[] }>('/api/sync/progress');
}

export function upsertModuleProgress(payload: {
  moduleId: string; moduleName?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  quizScore?: number; quizAttempts?: number; bestScore?: number; xpEarned?: number;
}) {
  return api.post<typeof payload, { ok: true; progress: ModuleProgressRow[] }>('/api/sync/progress', payload);
}
