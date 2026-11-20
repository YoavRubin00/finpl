// src/features/user-stats/useUserStats.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStats, recordSessionTime, recordModuleDuration, type UserStatsRow } from '../../lib/api/userStats';
import { useAuthStore } from '../auth/useAuthStore';
import { guardedQueryFn } from '../../lib/queryGuard';

export const userStatsQueryKey = ['user-stats'] as const;

/** GET /api/sync/user-stats as a query function that never overwrites a newer
 *  local write such as the session-time POST's answer (queryGuard). */
export const userStatsQueryFn = guardedQueryFn(userStatsQueryKey, async () => (await getUserStats()).userStats);

export function useUserStats() {
  // Skip for guests — server-side aggregate keyed by authId.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: userStatsQueryKey,
    queryFn: userStatsQueryFn,
    staleTime: 5 * 60_000,
    enabled: isAuthenticated && !isGuest,
  });
}

export function useRecordSessionTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seconds: number) => (await recordSessionTime(seconds)).userStats,
    onSuccess: (data) => qc.setQueryData<UserStatsRow | null>(userStatsQueryKey, data),
  });
}

export function useRecordModuleDuration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { moduleId: string; seconds: number }) =>
      (await recordModuleDuration(input.moduleId, input.seconds)).userStats,
    onSuccess: (data) => qc.setQueryData<UserStatsRow | null>(userStatsQueryKey, data),
  });
}
