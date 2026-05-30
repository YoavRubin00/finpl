// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Skip retries on 401. Guest sessions hit auth-required endpoints and
        // get 401s — without this guard each of the 6 background hooks
        // (profile / economy / streak / subscription / userStats / progress)
        // burns its retry budget (2 retries × 6 hooks = 12 wasted round-trips
        // on every cold start while signed-out). Other errors still retry up
        // to 2 times for transient network blips.
        retry: (failureCount, err) => {
          if (err instanceof ApiError && err.status === 401) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        // Mutations must not retry by default. /api/sync/economy.ts applies
        // deltas as COALESCE(value, 0) + delta with no Idempotency-Key — a POST
        // that succeeded server-side but failed to return (transient network) +
        // a retry = double-granted coins/XP/gems. Until the endpoint becomes
        // idempotent (request-id based dedup), every mutation gets one shot.
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();

import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});
