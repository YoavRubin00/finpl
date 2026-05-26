// src/features/economy/useStreak.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStreak, recordDailyActivity, type StreakState } from '../../lib/api/streak';

export const streakQueryKey = ['streak'] as const;

export function useStreak() {
  return useQuery({
    queryKey: streakQueryKey,
    queryFn: async () => (await getStreak()).streak,
    staleTime: 60_000,
  });
}

function todayIsraelDate(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

export function useRecordDailyActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await recordDailyActivity(todayIsraelDate())).streak,
    onSuccess: (streak) => {
      qc.setQueryData<StreakState | null>(streakQueryKey, streak);
    },
  });
}
