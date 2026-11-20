// src/features/economy/launchStreakWait.ts
//
// The launch's daily login bonus waits for the server's streak (boot fix B5,
// 20.11). Pure module, no React Native imports: scripts/test-launch-streak-wait.ts
// runs it in Node; app/_layout.tsx waits on it and useStreak.ts notes answers.
//
// awardLoginBonus (useEconomyUIStore) also decides whether a missed day spends
// a streak freeze, and reads the server's calendar from the ['streak'] query
// to do it (a day only the server knows, e.g. one used on another device, is
// not a hole). On a cold start that query first holds the LOCAL calendar's
// streak: the economy store seeds it when it loads from storage, before any
// server answer. Run at that moment, the bonus could burn a freeze, and show
// "the shark saved your streak", for a streak that never broke. So a launch
// with a session token runs it once a real server streak answer has been
// accepted in this launch, or after LAUNCH_STREAK_WAIT_MS at the latest; guests
// and launches without a token run it at once, as before.
//
// A real server streak answer is noted only where one is accepted (useStreak.ts:
// the guarded GET's kept answer, the daily tick's and an activity's POST
// answer). The economy store's local seed never notes one, so it cannot end
// the wait. (Not serverAnswerSince(['streak'], ...): since boot fix B8 the local
// seed is stored as a seed (updatedAt 0) and no longer counts there, but any
// local write does, e.g. completeDailyTask's mirror of the local calendar.)

/** Longest the launch's login bonus waits for the server's streak. */
export const LAUNCH_STREAK_WAIT_MS = 3000;

export interface StreakArrivals {
  /** A real server streak answer was accepted and is in the query cache now
   *  (so a waiter that runs at once reads it, not the seed it replaced). */
  note(): void;
  /** How many have been noted in this process so far. A launch takes this as
   *  its mark and waits for a later one, so an answer from an earlier launch
   *  in the same process (the root layout mounting again) never counts. */
  count(): number;
  /** Calls `fn` once more than `mark` answers have been noted (at once if
   *  that is already so). Returns a function that cancels the call. */
  whenAfter(mark: number, fn: () => void): () => void;
}

export function createStreakArrivals(): StreakArrivals {
  let noted = 0;
  const waiting = new Set<{ mark: number; fn: () => void }>();
  return {
    note() {
      noted += 1;
      for (const w of [...waiting]) {
        if (noted <= w.mark) continue;
        waiting.delete(w);
        try { w.fn(); } catch { /* a waiter's error stays its own */ }
      }
    },
    count: () => noted,
    whenAfter(mark, fn) {
      if (noted > mark) {
        fn();
        return () => {};
      }
      const w = { mark, fn };
      waiting.add(w);
      return () => { waiting.delete(w); };
    },
  };
}

/** The app's record, one per JS process. Noted by useStreak.ts. */
export const serverStreakArrivals = createStreakArrivals();

export type LaunchStreakWait =
  /** Ran at once: a guest, or no session token on this device. */
  | { waited: false; reason: 'guest' | 'no_token' }
  /** Waited: `arrived` false means the limit ran out first. */
  | { waited: true; arrived: boolean; ms: number };

/**
 * Resolves when the launch's login bonus may run (it never rejects): at once
 * for a guest or a launch with no session token; otherwise when a server
 * streak answer later than `mark` has been noted, or after `capMs`. The limit
 * covers the token read too (SecureStore reads have no limit of their own).
 */
export function waitForLaunchStreak(opts: {
  /** arrivals.count() when the launch began (the root layout's mount). */
  mark: number;
  capMs: number;
  /** A guest has no server streak (its GET is disabled). */
  isGuest: () => boolean;
  /** Whether a session token is stored; a failed read counts as none. */
  hasToken: () => Promise<boolean>;
  arrivals: StreakArrivals;
  now?: () => number;
}): Promise<LaunchStreakWait> {
  const now = opts.now ?? Date.now;
  let guest = false;
  try { guest = opts.isGuest(); } catch { /* unknown: the token decides */ }
  if (guest) return Promise.resolve<LaunchStreakWait>({ waited: false, reason: 'guest' });

  const startedAt = now();
  return new Promise<LaunchStreakWait>((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    const finish = (result: LaunchStreakWait): void => {
      if (done) return;
      done = true;
      if (timer !== undefined) clearTimeout(timer);
      if (cancel) cancel();
      resolve(result);
    };
    timer = setTimeout(() => finish({ waited: true, arrived: false, ms: now() - startedAt }), opts.capMs);
    Promise.resolve()
      .then(() => opts.hasToken())
      .then((has) => has === true, () => false)
      .then((has) => {
        if (done) return;
        if (!has) {
          finish({ waited: false, reason: 'no_token' });
          return;
        }
        cancel = opts.arrivals.whenAfter(opts.mark, () => finish({ waited: true, arrived: true, ms: now() - startedAt }));
      });
  });
}

export interface LaunchLoginBonus {
  /** The launch's run (root layout mount, once the economy store has
   *  loaded): waits, then awards. A call while one waits joins it. */
  launch(mark: number): Promise<void>;
  /** A foreground's run: awards at once, except while the launch's run
   *  waits, which then awards for both. */
  foreground(): void;
  isWaiting(): boolean;
}

/**
 * The login bonus runs the root layout makes (cold start and every return to
 * the foreground). While the launch's run waits for the server's streak, a
 * foreground run is left to it: iOS can report 'active' right at launch, and
 * that run would read the local seed the launch is waiting past. The bonus is
 * once per Israeli day (awardLoginBonus checks lastLoginBonusDate), so one
 * run awards for both. The root layout can also mount twice at launch: the
 * second launch() joins the first instead of waiting again.
 */
export function createLaunchLoginBonus(deps: {
  wait: (mark: number) => Promise<LaunchStreakWait>;
  award: () => void;
  onWaited?: (result: LaunchStreakWait) => void;
}): LaunchLoginBonus {
  let pending: Promise<void> | null = null;
  const award = (): void => {
    try { deps.award(); } catch { /* non-fatal */ }
  };
  return {
    launch(mark) {
      if (pending) return pending;
      const run = Promise.resolve()
        .then(() => deps.wait(mark))
        .then((result) => result, () => null)
        .then((result) => {
          pending = null;
          if (result && deps.onWaited) {
            try { deps.onWaited(result); } catch { /* non-fatal */ }
          }
          award();
        });
      pending = run;
      return run;
    },
    foreground() {
      if (pending) return;
      award();
    },
    isWaiting: () => pending !== null,
  };
}
