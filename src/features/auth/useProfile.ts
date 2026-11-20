// src/features/auth/useProfile.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, type ProfileRow } from '../../lib/api/profile';
import { useAuthStore } from './useAuthStore';
import { guardedQueryFn } from '../../lib/queryGuard';

export const profileQueryKey = ['profile'] as const;

/** GET /api/sync/profile as a query function that never overwrites a newer
 *  local write (queryGuard). */
export const profileQueryFn = guardedQueryFn(profileQueryKey, async () => (await getProfile()).profile);

export function useProfile() {
  // Skip for guests — they have no server-side profile and would just 401.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: profileQueryFn,
    staleTime: 60_000,
    enabled: isAuthenticated && !isGuest,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Parameters<typeof updateProfile>[0]) => (await updateProfile(patch)).profile,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: profileQueryKey });
      const prev = qc.getQueryData<ProfileRow | null>(profileQueryKey);
      qc.setQueryData<ProfileRow | null>(profileQueryKey, (old) =>
        old ? { ...old, ...patch } : old,
      );
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(profileQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: profileQueryKey }),
  });
}
