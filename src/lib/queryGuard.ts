// src/lib/queryGuard.ts
// The app's query guard: queryGuardCore bound to the app query client and the
// signed-in account. See queryGuardCore.ts for what it guarantees.
import { queryClient } from './queryClient';
import { useAuthStore } from '../features/auth/useAuthStore';
import { createQueryGuard } from './queryGuardCore';

const guard = createQueryGuard(queryClient, () => useAuthStore.getState().authId);

export const markSeeded = guard.markSeeded;
export const isSeeded = guard.isSeeded;
export const seedQueryData = guard.seed;
export const guardedQueryFn = guard.guardedQueryFn;
export const serverAnswerSince = guard.serverAnswerSince;
