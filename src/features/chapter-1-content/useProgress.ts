// src/features/chapter-1-content/useProgress.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProgress, upsertModuleProgress, type ModuleProgressRow } from '../../lib/api/progress';

export const progressQueryKey = ['progress'] as const;

export function useProgress() {
  return useQuery({
    queryKey: progressQueryKey,
    queryFn: async () => (await getProgress()).progress,
    staleTime: 5 * 60_000,
  });
}

export function useIsModuleCompleted(moduleId: string): boolean {
  const { data } = useProgress();
  if (!data) return false;
  const row = data.find((m) => m.moduleId === moduleId);
  return row?.status === 'completed';
}

export function useUpsertModuleProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof upsertModuleProgress>[0]) =>
      (await upsertModuleProgress(payload)).progress,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: progressQueryKey });
      const prev = qc.getQueryData<ModuleProgressRow[]>(progressQueryKey);
      qc.setQueryData<ModuleProgressRow[]>(progressQueryKey, (old) => {
        const next = old ? [...old] : [];
        const idx = next.findIndex((m) => m.moduleId === payload.moduleId);
        const optimistic: ModuleProgressRow = {
          moduleId: payload.moduleId,
          moduleName: payload.moduleName ?? null,
          status: payload.status ?? 'completed',
          quizScore: payload.quizScore ?? null,
          quizAttempts: payload.quizAttempts ?? null,
          bestScore: payload.bestScore ?? null,
          xpEarned: payload.xpEarned ?? null,
          completedAt: payload.status === 'completed' ? new Date().toISOString() : null,
        };
        if (idx >= 0) next[idx] = optimistic;
        else next.push(optimistic);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(progressQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: progressQueryKey }),
  });
}
