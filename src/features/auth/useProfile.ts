// src/features/auth/useProfile.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, type ProfileRow } from '../../lib/api/profile';

export const profileQueryKey = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => (await getProfile()).profile,
    staleTime: 60_000,
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
