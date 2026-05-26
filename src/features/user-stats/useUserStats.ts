// src/features/user-stats/useUserStats.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStats, recordSessionTime, recordModuleDuration, type UserStatsRow } from '../../lib/api/userStats';

export const userStatsQueryKey = ['user-stats'] as const;

export function useUserStats() {
  return useQuery({
    queryKey: userStatsQueryKey,
    queryFn: async () => (await getUserStats()).userStats,
    staleTime: 5 * 60_000,
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
