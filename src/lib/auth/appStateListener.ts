// src/lib/auth/appStateListener.ts
import { AppState, type AppStateStatus } from 'react-native';
import { queryClient } from '../queryClient';
import { profileQueryKey } from '../../features/auth/useProfile';
import { economyQueryKey } from '../../features/economy/useEconomy';
import { streakQueryKey } from '../../features/economy/useStreak';
import { subscriptionQueryKey } from '../../features/subscription/useSubscription';
import { useAuthStore } from '../../features/auth/useAuthStore';

const REHYDRATE_AFTER_MS = 5 * 60 * 1000;

let lastBackgroundedAt: number | null = null;
let currentState: AppStateStatus = AppState.currentState;

export function startAppStateListener(): () => void {
  const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (currentState.match(/active/) && next.match(/inactive|background/)) {
      lastBackgroundedAt = Date.now();
    }
    if (next === 'active') {
      const isAuthed = useAuthStore.getState().isAuthenticated;
      if (
        isAuthed &&
        lastBackgroundedAt !== null &&
        Date.now() - lastBackgroundedAt > REHYDRATE_AFTER_MS
      ) {
        queryClient.invalidateQueries({ queryKey: profileQueryKey });
        queryClient.invalidateQueries({ queryKey: economyQueryKey });
        queryClient.invalidateQueries({ queryKey: streakQueryKey });
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
      }
      lastBackgroundedAt = null;
    }
    currentState = next;
  });
  return () => sub.remove();
}
