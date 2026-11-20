import { useIsFocused } from '@react-navigation/native';
import { useAppActive } from './useAppActive';

/**
 * True while the hosting screen is focused AND the app is in the foreground —
 * the only time a looping animation, an animated image or a ticking countdown
 * is actually seen. Gate continuous motion and timers on it.
 *
 * Needs a navigation screen above it (it reads the screen's focus): use it only
 * in components rendered inside a route, never in root-layout hosts. Tabs keep
 * blurred screens mounted (and frozen), and the root stack keeps the screens
 * under a pushed one mounted, so without this their native loops run unseen.
 */
export function useScreenLive(): boolean {
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  return isFocused && appActive;
}
