/**
 * Accessibility-aware animation hook.
 * When the user has enabled "reduce motion" in OS settings,
 * returns duration=0 so animations complete instantly (WCAG 2.3.3).
 *
 * Usage:
 *   const { animDuration, shouldAnimate } = useAccessibleAnimation();
 *   // Use animDuration(300) instead of hardcoded 300
 *   opacity.value = withTiming(1, { duration: animDuration(300) });
 */
import { useReducedMotion } from 'react-native-reanimated';

export function useAccessibleAnimation() {
    const reduceMotion = useReducedMotion();

    const animDuration = (ms: number) => reduceMotion ? 0 : ms;
    const shouldAnimate = !reduceMotion;

    return { animDuration, shouldAnimate, reduceMotion };
}