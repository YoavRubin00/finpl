// src/features/chapter-1-content/useProgress.ts
import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProgress, upsertModuleProgress, type ModuleProgressRow } from '../../lib/api/progress';
import { queryClient } from '../../lib/queryClient';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';

export const progressQueryKey = ['progress'] as const;

/**
 * Locally-persisted completed module IDs for a chapter prefix. Read from the
 * durable MMKV-backed store so completions survive cold starts and stale/empty
 * server refetches that would otherwise wipe the react-query cache. See
 * useCompletedModulesStore for the full rationale.
 */
function localCompletedForChapter(chapterStoreKey: string): string[] {
  const chNum = chapterStoreKey.replace('ch-', '');
  const prefix = `mod-${chNum}-`;
  return useCompletedModulesStore.getState().completedIds.filter((id) => id.startsWith(prefix));
}

export function useProgress() {
  const query = useQuery({
    queryKey: progressQueryKey,
    queryFn: async () => (await getProgress()).progress,
    staleTime: 5 * 60_000,
  });
  // Backfill the durable local store with whatever the server reports as
  // completed, so the local store stays a superset of the server and never
  // shrinks below a known completion.
  const serverCompletedKey = query.data
    ?.filter((m) => m.status === 'completed')
    .map((m) => m.moduleId)
    .join(',');
  useEffect(() => {
    if (serverCompletedKey) {
      useCompletedModulesStore.getState().markManyCompleted(serverCompletedKey.split(','));
    }
  }, [serverCompletedKey]);
  return query;
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
    // The POST returns the full authoritative progress array — set it directly
    // so the cache reflects the server without a blind refetch that could race
    // and momentarily drop the just-completed row.
    onSuccess: (data) => {
      if (Array.isArray(data)) qc.setQueryData(progressQueryKey, data);
    },
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
  // Subscribe to the local store so the learn map re-renders the instant a
  // completion is marked (before any server round-trip).
  const localIds = useCompletedModulesStore((s) => s.completedIds);
  return useMemo(() => {
    // chapterStoreKey is "ch-0", "ch-1" … → module prefix is "mod-0-", "mod-1-" …
    const chNum = chapterStoreKey.replace('ch-', '');
    const prefix = `mod-${chNum}-`;
    const serverIds = (data ?? [])
      .filter((m) => m.moduleId.startsWith(prefix) && m.status === 'completed')
      .map((m) => m.moduleId);
    const local = localIds.filter((id) => id.startsWith(prefix));
    return [...new Set([...serverIds, ...local])];
  }, [data, localIds, chapterStoreKey]);
}

/**
 * Synchronously read completed moduleIds for a chapter from the React Query
 * cache. Safe to call from non-hook contexts (store actions, callbacks).
 */
export function getCompletedModulesSync(chapterStoreKey: string): string[] {
  const data = queryClient.getQueryData<ModuleProgressRow[]>(progressQueryKey);
  const chNum = chapterStoreKey.replace('ch-', '');
  const prefix = `mod-${chNum}-`;
  const serverIds = (data ?? [])
    .filter((m) => m.moduleId.startsWith(prefix) && m.status === 'completed')
    .map((m) => m.moduleId);
  // Union with durable local completions so a known completion never disappears
  // due to a stale/empty server refetch or cold start.
  return [...new Set([...serverIds, ...localCompletedForChapter(chapterStoreKey)])];
}

/**
 * Synchronously check whether a module is completed, from the query cache OR
 * the durable local store.
 */
export function isModuleCompletedSync(moduleId: string): boolean {
  const data = queryClient.getQueryData<ModuleProgressRow[]>(progressQueryKey);
  if (data?.some((m) => m.moduleId === moduleId && m.status === 'completed')) return true;
  return useCompletedModulesStore.getState().completedIds.includes(moduleId);
}
