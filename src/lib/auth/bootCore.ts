// src/lib/auth/bootCore.ts
//
// The cold boot's pure decisions, free of React Native imports so
// scripts/test-boot-snapshots.ts can run them in Node. Used by lifecycle.ts.

export const TIMED_OUT = Symbol('timed-out');

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

/** Waits for `promise` at most `capMs`; reports how long and whether it capped. */
export async function waitCapped(promise: Promise<unknown>, capMs: number): Promise<{ ms: number; capped: boolean }> {
  const startedAt = Date.now();
  const result = await withTimeout(promise.then(() => undefined, () => undefined), capMs);
  return { ms: Date.now() - startedAt, capped: result === TIMED_OUT };
}

/**
 * 'cached' = render at once from saved state and finish the server work in
 * the background. Only for a signed-in user whose last server Pro state is
 * known on this device (so a paying user never opens as free), whose legacy
 * backfill is done (the reads must follow it), and whose token is not past its
 * own expiry (the server would reject it: wait for that instead).
 */
export function decideBootPath(input: {
  hasSession: boolean;
  proKnown: boolean;
  backfillDone: boolean;
  tokenExpired: boolean;
}): 'cached' | 'network' {
  return input.hasSession && input.proKnown && input.backfillDone && !input.tokenExpired ? 'cached' : 'network';
}

/**
 * One boot per launch. The root layout can mount twice at launch (seen on
 * devices: two boot_completed events 40-400 ms apart, the first boot
 * 'superseded'), and every mount asks for the boot: a later caller joins the
 * attempt already running or finished instead of starting another. `fresh`
 * starts a genuinely new attempt (the retry button), which later callers then
 * join; `replace` swaps in a settled result (e.g. "continue without signing
 * in", so a remount doesn't show the retry screen again).
 */
export function createSingleFlight<T>() {
  let current: Promise<T> | null = null;
  return {
    run(start: () => Promise<T>, opts?: { fresh?: boolean }): Promise<T> {
      if (current && !opts?.fresh) return current;
      current = start();
      return current;
    },
    replace(value: T): void {
      current = Promise.resolve(value);
    },
    hasRun(): boolean {
      return current !== null;
    },
  };
}
