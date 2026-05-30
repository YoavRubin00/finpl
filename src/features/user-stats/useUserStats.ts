// src/features/user-stats/useUserStats.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStats, recordSessionTime, recordModuleDuration, type UserStatsRow } from '../../lib/api/userStats';
import { useAuthStore } from '../auth/useAuthStore';

export const userStatsQueryKey = ['user-stats'] as const;

export function useUserStats() {
  // Skip for guests — server-side aggregate keyed by authId.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: userStatsQueryKey,
    queryFn: async () => (await getUserStats()).userStats,
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
