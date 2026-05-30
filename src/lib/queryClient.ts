// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
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
