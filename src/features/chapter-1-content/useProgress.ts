// src/features/chapter-1-content/useProgress.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProgress, upsertModuleProgress, type ModuleProgressRow } from '../../lib/api/progress';
import { queryClient } from '../../lib/queryClient';

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

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/**
 * Returns the moduleIds completed for a given chapterId prefix.
 * chapterIdPrefix should be the store-key form, e.g. "ch-1".
 * Modules belonging to this chapter have IDs starting with "mod-<N>-".
 */
export function useCompletedModulesForChapter(chapterStoreKey: string): string[] {
  const { data } = useProgress();
  if (!data) return [];
  // chapterStoreKey is "ch-0", "ch-1" … → module prefix is "mod-0-", "mod-1-" …
  const chNum = chapterStoreKey.replace('ch-', '');
  const prefix = `mod-${chNum}-`;
  return data
    .filter((m) => m.moduleId.startsWith(prefix) && m.status === 'completed')
    .map((m) => m.moduleId);
}

/**
 * Synchronously read completed moduleIds for a chapter from the React Query
 * cache. Safe to call from non-hook contexts (store actions, callbacks).
 */
export function getCompletedModulesSync(chapterStoreKey: string): string[] {
  const data = queryClient.getQueryData<ModuleProgressRow[]>(progressQueryKey);
  if (!data) return [];
  const chNum = chapterStoreKey.replace('ch-', '');
  const prefix = `mod-${chNum}-`;
  return data
    .filter((m) => m.moduleId.startsWith(prefix) && m.status === 'completed')
    .map((m) => m.moduleId);
}

/**
 * Synchronously check whether a module is completed from the query cache.
 */
export function isModuleCompletedSync(moduleId: string): boolean {
  const data = queryClient.getQueryData<ModuleProgressRow[]>(progressQueryKey);
  if (!data) return false;
  return data.some((m) => m.moduleId === moduleId && m.status === 'completed');
}
