// src/lib/api/profile.ts
import { api } from './client';

export interface ProfileRow {
  id: string; authId: string;
  displayName: string | null; email: string | null; avatarUrl: string | null;
  level: number | null; xp: number | null; coins: number | null; gems: number | null;
  currentStreak: number | null; longestStreak: number | null;
  lastActiveDate: string | null;
  isPro: boolean | null; proExpiresAt: string | null;
  virtualBalance: string;
  preferences: Record<string, unknown> | null;
  createdAt: string | null; updatedAt: string | null;
}

export function getProfile() {
  return api.get<{ ok: true; profile: ProfileRow | null }>('/api/sync/profile');
}

export function updateProfile(patch: Partial<Pick<ProfileRow, 'displayName' | 'avatarUrl' | 'preferences'>>) {
  return api.post<typeof patch, { ok: true; profile: ProfileRow | null }>('/api/sync/profile', patch);
}
