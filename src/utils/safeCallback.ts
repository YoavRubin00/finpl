/**
 * Defensive wrappers for gesture / async callbacks.
 *
 * Why this exists: on iPad iOS 26.4.1, an uncaught error inside a gesture
 * callback (PanResponder, Pressable.onPress, etc.) propagates to Hermes as
 * `throwPendingError`, which becomes a C++ exception and aborts the process
 * with SIGABRT. `ErrorUtils.setGlobalHandler` does NOT catch this path —
 * the error never reaches React Native's JS error boundary because Hermes
 * has already started unwinding the C++ stack.
 *
 * The fix is to catch the error inside the JS callback itself, BEFORE
 * control returns to native code. This file provides the wrappers used in
 * onboarding and other gesture-heavy paths.
 *
 * Apple rejection 2.1(a) on build 1.0 (90) — iPad Air 5th gen — was
 * triggered by an unwrapped onboarding gesture. This is the second fix
 * for the same category; the first (`setGlobalHandler` in app/_layout.tsx)
 * does not catch the C++ propagation path.
 */

/** Wrap a no-arg callback (e.g. Pressable's onPress) so any throw is logged, not propagated. */
export function safeCallback(fn: (() => void) | undefined | null, label = "callback"): () => void {
  return () => {
    if (typeof fn !== "function") return;
    try {
      fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[safeCallback:${label}] swallowed:`, msg);
    }
  };
}

/** Wrap an arbitrary-arg callback (e.g. PanResponder onPanResponderMove) so any throw is logged. */
export function safeHandler<TArgs extends unknown[], TReturn>(
  fn: ((...args: TArgs) => TReturn) | undefined | null,
  label = "handler",
): (...args: TArgs) => TReturn | undefined {
  return (...args: TArgs) => {
    if (typeof fn !== "function") return undefined;
    try {
      return fn(...args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[safeHandler:${label}] swallowed:`, msg);
      return undefined;
    }
  };
}

/** Wrap a Promise-returning callback so any rejection is logged, not propagated. */
export function safeAsync<TArgs extends unknown[]>(
  fn: ((...args: TArgs) => Promise<unknown>) | undefined | null,
  label = "async",
): (...args: TArgs) => void {
  return (...args: TArgs) => {
    if (typeof fn !== "function") return;
    try {
      const p = fn(...args);
      if (p && typeof (p as Promise<unknown>).then === "function") {
        (p as Promise<unknown>).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[safeAsync:${label}] rejection:`, msg);
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[safeAsync:${label}] sync throw:`, msg);
    }
  };
}
