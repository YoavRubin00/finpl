import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

// One AppState listener for the whole app instead of one per caller: the learn
// map alone mounts ~40 pearl nodes plus quest/energy/header widgets that all
// ask this question (perf pass 20.11). Same answer as before: true only while
// AppState is 'active'. RN updates AppState.currentState before it notifies
// listeners, so the snapshot read below is already the new state.
const listeners = new Set<() => void>();
let subscription: NativeEventSubscription | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (subscription === null) {
    subscription = AppState.addEventListener('change', () => {
      listeners.forEach((l) => l());
    });
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && subscription !== null) {
      subscription.remove();
      subscription = null;
    }
  };
}

function getSnapshot(): boolean {
  return AppState.currentState === 'active';
}

/**
 * Returns true while the app is foregrounded (AppState === 'active').
 * Use to gate continuously-running animations / timers so the UI thread can
 * idle when the user backgrounds the app or the screen locks.
 */
export function useAppActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
