import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Returns true while the app is foregrounded (AppState === 'active').
 * Use to gate continuously-running animations / timers so the UI thread can
 * idle when the user backgrounds the app or the screen locks.
 */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return active;
}
