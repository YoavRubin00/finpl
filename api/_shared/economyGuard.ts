// api/_shared/economyGuard.ts
//
// Server-side bounds on the client-reported economy. Used by
// POST /api/sync/economy (api/sync/economy.ts), the legacy-data upload
// (api/migrate/backfill-v1.ts) and the RevenueCat webhook (starter-pack coins).
//
// The economy is still client-driven: the app sends signed deltas
// ({ coinsDelta: +300 }) and the server applies them. Until 2026-11-20 it
// applied ANY delta, so one signed-in request could mint a million coins (which
// unlock partner benefits in the Bridge) or 14,000 gems (sold for real money).
// The server can't tell a lesson chest from a forged number, so instead of
// trusting the source it bounds the totals:
//
//   Debits (negative deltas)
//     Never take a balance below zero: the debit is min(requested, balance).
//     Every coin actually debited goes into the user's "returns pool", and
//     every gem debited adds 40 coins to it (the best gem→coin rate the shop
//     sells: 2,500 gems → 100,000 coins). Trading closes, refunds, fantasy
//     settlements and exchanges give coins BACK; the pool lets them through
//     1:1 without touching the free budget. The pool only ever holds what the
//     user really spent, so it can't grow the balance; it expires after 30–60
//     days (two 30-day buckets).
//   Coin credits (positive coinsDelta)
//     Paid from the pool first, then from the free budget: at most
//     COIN_FREE_PER_REQUEST per request and COIN_FREE_PER_24H per rolling 24h
//     (hourly buckets). Whatever doesn't fit is HELD (stored, not credited)
//     and paid out automatically on later requests as pool or budget frees
//     up — an honest outlier day is delayed, never lost.
//   Gem credits (positive gemsDelta)
//     Earned gems are small (largest single reward in the app: 12). A delta
//     above GEM_FREE_PER_REQUEST is the shape of a purchase echo (IAPModal /
//     StarterPackModal add the bought gems client-side after the store sheet)
//     or a forgery; purchased gems are credited by the RevenueCat webhook
//     (authenticated, idempotent), so such a delta is dropped. Smaller deltas
//     come out of GEM_FREE_PER_24H.
//   XP
//     Not convertible to anything; only a per-request sanity clamp, floor 0.
//
// When a cap bites, the request still answers 200 with the server's balance:
// the app's fireEconomyDelta() writes that answer into its cache (so the
// display snaps to the truth) and never retries a POST. A 4xx would leave the
// optimistic number on screen until the next refetch and gain nothing.
//
// Concurrency: read balances + guard state, compute here (pure), write with
// compare-and-swap (economy_guard_version, coins and gems unchanged since the
// read). A concurrent write makes the CAS miss and the request re-reads and
// recomputes. Two parallel requests can never both spend the same budget.
//
// Before migration 0018 adds the guard columns the store throws
// GuardUnavailableError and the handler falls back to stateless per-request
// limits (validation, floors, the gem rule, a high coin ceiling).

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Caps, derived from the app's reward table (see scripts/test-economy-sync.ts
 * for the honest-heavy-day scenarios they must pass):
 * - Largest single newly-earned coin reward without boosts: 2,500 (starter
 *   capital, once). With legal multipliers (seasonal ×1.3, stacked shop boosts
 *   up to ×6) a streak-scaled chest can reach ~18,700; a real-assets
 *   collection after 30 days away ~23,200; a referrer batch 500 × friends.
 * - Realistic heavy day: ~20,000 earned coins (Pro, streak 100, 10 modules,
 *   every daily system, 2 cold opens 12h apart), ~25,000–28,000 on a seasonal
 *   event day.
 * - Largest single earned gem reward: 12 (chapter-end chest). Heavy day: 22–45.
 */
export const ECONOMY_LIMITS = {
  coinFreePerRequest: 25_000,
  coinFreePer24h: 50_000,
  gemFreePerRequest: 50,
  gemFreePer24h: 200,
  xpPerRequest: 50_000,
  /** Coins added to the returns pool per gem debited (2,500 gems → 100,000 coins). */
  exchangeCoinsPerGem: 40,
  /** Pool entries live one to two buckets (30–60 days: covers weekly fantasy
   *  settlements and positions held for weeks). */
  poolBucketMs: 30 * DAY_MS,
  poolMax: 100_000_000,
  heldCoinsMax: 5_000_000,
  /** Request validation: anything bigger is not a delta any build sends. */
  maxAbsDelta: 2_000_000_000,
  maxAbsVirtualBalance: 1e13,
  /** Stateless fallback (guard columns missing): ceiling for one coin credit. */
  statelessCoinPerRequest: 1_000_000,
} as const;

export type EconomyLimits = typeof ECONOMY_LIMITS;

// ─── Request parsing ─────────────────────────────────────────────────────────

export interface EconomyDelta {
  /** Integers; 0 = not sent. */
  xp: number;
  coins: number;
  gems: number;
  virtualBalanceSet?: number;
}

export type ParsedEconomyBody = { ok: true; delta: EconomyDelta } | { ok: false; error: string };

/**
 * Same field handling as before for every value today's app sends (numbers;
 * a non-number such as the trading store's string virtualBalance is ignored,
 * as it always was). New: a number that is not finite or absurdly large is a
 * 400 instead of a 500 from Postgres; fractions are rounded.
 */
export function parseEconomyBody(body: unknown, limits: EconomyLimits = ECONOMY_LIMITS): ParsedEconomyBody {
  const b = typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const delta: EconomyDelta = { xp: 0, coins: 0, gems: 0 };
  const fields: Array<[keyof Omit<EconomyDelta, 'virtualBalanceSet'>, string]> = [
    ['xp', 'xpDelta'],
    ['coins', 'coinsDelta'],
    ['gems', 'gemsDelta'],
  ];
  for (const [key, name] of fields) {
    const v = b[name];
    if (typeof v !== 'number') continue;
    if (!Number.isFinite(v) || Math.abs(v) > limits.maxAbsDelta) return { ok: false, error: `Invalid ${name}` };
    const n = Math.round(v);
    delta[key] = n === 0 ? 0 : n; // no -0
  }
  const vb = b.virtualBalanceSet;
  if (typeof vb === 'number') {
    if (!Number.isFinite(vb) || Math.abs(vb) > limits.maxAbsVirtualBalance) {
      return { ok: false, error: 'Invalid virtualBalanceSet' };
    }
    delta.virtualBalanceSet = Math.round(vb * 100) / 100;
  }
  if (delta.xp === 0 && delta.coins === 0 && delta.gems === 0 && delta.virtualBalanceSet === undefined) {
    return { ok: false, error: 'No deltas provided' };
  }
  return { ok: true, delta };
}

// ─── Guard state ─────────────────────────────────────────────────────────────

export interface GuardState {
  v: 1;
  /** [hourIndex, freeCoins, freeGems] — free credits per hour, last 24 hours. */
  h: Array<[number, number, number]>;
  /** Returns pool: two buckets of `poolBucketMs`; `t` = start of `cur`. */
  p: { t: number; prev: number; cur: number };
  /** Coins over a cap, waiting for pool or budget. */
  held: number;
}

function nonNegInt(v: unknown, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), max) : 0;
}

export function freshState(nowMs: number): GuardState {
  return { v: 1, h: [], p: { t: nowMs, prev: 0, cur: 0 }, held: 0 };
}

/** Defensive parse of the stored jsonb + time housekeeping (old hours drop
 *  out, pool buckets rotate). Anything malformed starts fresh. */
export function normalizeState(raw: unknown, nowMs: number, limits: EconomyLimits = ECONOMY_LIMITS): GuardState {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<GuardState>;
  const nowHour = Math.floor(nowMs / HOUR_MS);

  const h: Array<[number, number, number]> = [];
  if (Array.isArray(r.h)) {
    for (const e of r.h) {
      if (!Array.isArray(e) || e.length < 3) continue;
      const hour = typeof e[0] === 'number' ? Math.floor(e[0]) : NaN;
      // Keep the current hour and the 23 before it. Future hours (clock skew
      // between instances) are kept too, so a skewed write can't reset usage.
      if (!(hour > nowHour - 24) || hour > nowHour + 1) continue;
      h.push([hour, nonNegInt(e[1], limits.maxAbsDelta), nonNegInt(e[2], limits.maxAbsDelta)]);
    }
  }

  let p = { t: nowMs, prev: 0, cur: 0 };
  if (r.p && typeof r.p === 'object' && typeof r.p.t === 'number' && Number.isFinite(r.p.t)) {
    p = { t: r.p.t, prev: nonNegInt(r.p.prev, limits.poolMax), cur: nonNegInt(r.p.cur, limits.poolMax) };
    const elapsed = nowMs - p.t;
    if (elapsed >= 2 * limits.poolBucketMs) {
      p = { t: nowMs, prev: 0, cur: 0 };
    } else if (elapsed >= limits.poolBucketMs) {
      p = { t: p.t + limits.poolBucketMs, prev: p.cur, cur: 0 };
    }
  }

  return { v: 1, h, p, held: nonNegInt(r.held, limits.heldCoinsMax) };
}

function used24h(s: GuardState): { coins: number; gems: number } {
  let coins = 0;
  let gems = 0;
  for (const [, c, g] of s.h) {
    coins += c;
    gems += g;
  }
  return { coins, gems };
}

function addHour(s: GuardState, nowMs: number, coins: number, gems: number): void {
  if (coins <= 0 && gems <= 0) return;
  const hour = Math.floor(nowMs / HOUR_MS);
  const e = s.h.find((x) => x[0] === hour);
  if (e) {
    e[1] += coins;
    e[2] += gems;
  } else {
    s.h.push([hour, coins, gems]);
  }
}

function addPool(s: GuardState, amount: number, limits: EconomyLimits): void {
  if (amount > 0) s.p.cur = Math.min(s.p.cur + amount, limits.poolMax);
}

/** Take up to `amount` from the pool, oldest bucket first. */
function takePool(s: GuardState, amount: number): number {
  const fromPrev = Math.min(amount, s.p.prev);
  s.p.prev -= fromPrev;
  const fromCur = Math.min(amount - fromPrev, s.p.cur);
  s.p.cur -= fromCur;
  return fromPrev + fromCur;
}

// ─── The policy (pure) ───────────────────────────────────────────────────────

export interface Balances {
  coins: number | null;
  gems: number | null;
}

export type LimitReason =
  | 'coin_debit_floor'
  | 'gem_debit_floor'
  | 'coin_held'
  | 'gem_purchase_size_dropped'
  | 'gem_daily_cap'
  | 'xp_request_cap';

export interface GuardReport {
  coinsRequested: number;
  coinsCredited: number;
  coinsFromPool: number;
  coinsFromBudget: number;
  coinsReleasedFromHeld: number;
  coinsHeldAfter: number;
  coinsDebited: number;
  gemsRequested: number;
  gemsCredited: number;
  gemsDropped: number;
  gemsDebited: number;
  xpRequested: number;
  xpApplied: number;
  poolAfter: number;
  budgetUsed24hAfter: { coins: number; gems: number };
}

export interface GuardOutcome {
  coinChange: number;
  gemChange: number;
  xpChange: number;
  state: GuardState;
  reasons: LimitReason[];
  report: GuardReport;
}

export interface GuardOptions {
  /** Coins added to the pool before credits (verified purchase of coins). */
  poolCredit?: number;
}

export function applyGuard(
  rawState: unknown,
  balances: Balances,
  delta: EconomyDelta,
  nowMs: number,
  opts: GuardOptions = {},
  limits: EconomyLimits = ECONOMY_LIMITS,
): GuardOutcome {
  const s = normalizeState(rawState, nowMs, limits);
  const coins = Math.max(0, balances.coins ?? 0);
  const gems = Math.max(0, balances.gems ?? 0);
  const reasons: LimitReason[] = [];

  // 1. Debits (they also fund the pool, so a same-request credit can use them).
  let gemsDebited = 0;
  if (delta.gems < 0) {
    gemsDebited = Math.min(-delta.gems, gems);
    if (gemsDebited < -delta.gems) reasons.push('gem_debit_floor');
    addPool(s, gemsDebited * limits.exchangeCoinsPerGem, limits);
  }
  let coinsDebited = 0;
  if (delta.coins < 0) {
    coinsDebited = Math.min(-delta.coins, coins);
    if (coinsDebited < -delta.coins) reasons.push('coin_debit_floor');
    addPool(s, coinsDebited, limits);
  }
  if (opts.poolCredit && opts.poolCredit > 0) addPool(s, Math.floor(opts.poolCredit), limits);

  // 2. Coin credits: this request's credit plus anything held earlier.
  const want = Math.max(0, delta.coins);
  const heldBefore = s.held;
  const total = want + heldBefore;
  const fromPool = takePool(s, total);
  const rest = total - fromPool;
  const budgetLeft = Math.max(0, limits.coinFreePer24h - used24h(s).coins);
  const fromBudget = Math.min(rest, limits.coinFreePerRequest, budgetLeft);
  addHour(s, nowMs, fromBudget, 0);
  s.held = Math.min(rest - fromBudget, limits.heldCoinsMax);
  const credited = fromPool + fromBudget;
  // Attribute this request's own credit first; the remainder was released.
  const releasedFromHeld = Math.max(0, credited - want);
  if (want > 0 && credited < want) reasons.push('coin_held');

  // 3. Gem credits.
  let gemsCredited = 0;
  let gemsDropped = 0;
  if (delta.gems > 0) {
    if (delta.gems > limits.gemFreePerRequest) {
      gemsDropped = delta.gems;
      reasons.push('gem_purchase_size_dropped');
    } else {
      const left = Math.max(0, limits.gemFreePer24h - used24h(s).gems);
      gemsCredited = Math.min(delta.gems, left);
      gemsDropped = delta.gems - gemsCredited;
      addHour(s, nowMs, 0, gemsCredited);
      if (gemsDropped > 0) reasons.push('gem_daily_cap');
    }
  }

  // 4. XP.
  let xpApplied = delta.xp;
  if (delta.xp > limits.xpPerRequest) {
    xpApplied = limits.xpPerRequest;
    reasons.push('xp_request_cap');
  }

  const after = used24h(s);
  return {
    coinChange: credited - coinsDebited,
    gemChange: gemsCredited - gemsDebited,
    xpChange: xpApplied,
    state: s,
    reasons,
    report: {
      coinsRequested: delta.coins,
      coinsCredited: credited,
      coinsFromPool: fromPool,
      coinsFromBudget: fromBudget,
      coinsReleasedFromHeld: releasedFromHeld,
      coinsHeldAfter: s.held,
      coinsDebited,
      gemsRequested: delta.gems,
      gemsCredited,
      gemsDropped,
      gemsDebited,
      xpRequested: delta.xp,
      xpApplied,
      poolAfter: s.p.prev + s.p.cur,
      budgetUsed24hAfter: after,
    },
  };
}

/**
 * Stateless fallback (guard columns not migrated yet): the per-request rules
 * only. Debits are floored by SQL (GREATEST(0, …)); no pool, no daily caps.
 */
export function applyStateless(
  delta: EconomyDelta,
  limits: EconomyLimits = ECONOMY_LIMITS,
): { coinChange: number; gemChange: number; xpChange: number; reasons: LimitReason[]; report: Partial<GuardReport> } {
  const reasons: LimitReason[] = [];
  let coinChange = delta.coins;
  if (coinChange > limits.statelessCoinPerRequest) {
    coinChange = limits.statelessCoinPerRequest;
    reasons.push('coin_held'); // not stored: there is nowhere to hold it
  }
  let gemChange = delta.gems;
  if (gemChange > limits.gemFreePerRequest) {
    gemChange = 0;
    reasons.push('gem_purchase_size_dropped');
  }
  let xpChange = delta.xp;
  if (xpChange > limits.xpPerRequest) {
    xpChange = limits.xpPerRequest;
    reasons.push('xp_request_cap');
  }
  return {
    coinChange,
    gemChange,
    xpChange,
    reasons,
    report: {
      coinsRequested: delta.coins,
      coinsCredited: Math.max(0, coinChange),
      gemsRequested: delta.gems,
      gemsCredited: Math.max(0, gemChange),
      gemsDropped: delta.gems > 0 ? delta.gems - Math.max(0, gemChange) : 0,
      xpRequested: delta.xp,
      xpApplied: xpChange,
    },
  };
}

// ─── Store + runner ──────────────────────────────────────────────────────────

/** The row /api/sync/economy has always returned. */
export interface EconomyRow {
  xp: number | null;
  coins: number | null;
  gems: number | null;
  level: number | null;
  virtualBalance: string;
}

export interface GuardedRead {
  economy: EconomyRow;
  state: unknown;
  version: number;
}

export interface GuardedWrite {
  expectVersion: number;
  expectCoins: number | null;
  expectGems: number | null;
  state: GuardState;
  coinChange: number;
  gemChange: number;
  xpChange: number;
  virtualBalanceSet?: number;
}

export interface SimpleWrite {
  coinChange: number;
  gemChange: number;
  xpChange: number;
  virtualBalanceSet?: number;
}

/** Thrown by a store whose database lacks the 0018 guard columns. */
export class GuardUnavailableError extends Error {
  constructor(message = 'economy guard columns missing (migration 0018 not applied)') {
    super(message);
    this.name = 'GuardUnavailableError';
  }
}

export interface EconomyStore {
  /** null = no profile row. Throws GuardUnavailableError before 0018. */
  read(userId: string): Promise<GuardedRead | null>;
  /** Compare-and-swap write; 'conflict' when the row changed since the read
   *  (or vanished). Floors every balance at 0. */
  writeGuarded(userId: string, w: GuardedWrite): Promise<EconomyRow | 'conflict'>;
  /** Unconditional relative write (XP / virtual balance only, or the
   *  stateless fallback). Floors at 0. null = no profile row. */
  writeSimple(userId: string, w: SimpleWrite): Promise<EconomyRow | null>;
}

export type GuardLogger = (line: Record<string, unknown>) => void;

/** One structured line per limited request (user uuid only, never an email). */
export const logGuard: GuardLogger = (line) => {
  console.warn(`[economy-guard] ${JSON.stringify(line)}`);
};

export interface EconomyDeps {
  store: EconomyStore;
  now(): number;
  sleep?(ms: number): Promise<void>;
  log?: GuardLogger;
}

export const MAX_CAS_ATTEMPTS = 8;

export type GuardRunResult =
  | { kind: 'ok'; economy: EconomyRow | null; outcome?: GuardOutcome; stateless?: boolean }
  | { kind: 'busy' };

let warnedUnavailable = false;

/**
 * Apply one delta for `userId` under the guard. `source` names the caller in
 * the log line ('sync/economy', 'migrate/backfill', 'webhook/revenuecat').
 */
export async function runGuarded(
  userId: string,
  delta: EconomyDelta,
  deps: EconomyDeps,
  source: string,
  opts: GuardOptions = {},
): Promise<GuardRunResult> {
  const log = deps.log ?? logGuard;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const touchesBalances = delta.coins !== 0 || delta.gems !== 0 || (opts.poolCredit ?? 0) > 0;

  if (!touchesBalances) {
    let xpChange = delta.xp;
    if (xpChange > ECONOMY_LIMITS.xpPerRequest) {
      xpChange = ECONOMY_LIMITS.xpPerRequest;
      log({ userId, source, reasons: ['xp_request_cap'], xpRequested: delta.xp, xpApplied: xpChange });
    }
    const economy = await deps.store.writeSimple(userId, {
      coinChange: 0,
      gemChange: 0,
      xpChange,
      virtualBalanceSet: delta.virtualBalanceSet,
    });
    return { kind: 'ok', economy };
  }

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    let read: GuardedRead | null;
    try {
      read = await deps.store.read(userId);
    } catch (err) {
      if (!(err instanceof GuardUnavailableError)) throw err;
      if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.warn('[economy-guard] guard columns missing: per-request limits only until migration 0018 runs');
      }
      const st = applyStateless(delta);
      if (st.reasons.length > 0) log({ userId, source, mode: 'stateless', reasons: st.reasons, ...st.report });
      const economy = await deps.store.writeSimple(userId, {
        coinChange: st.coinChange,
        gemChange: st.gemChange,
        xpChange: st.xpChange,
        virtualBalanceSet: delta.virtualBalanceSet,
      });
      return { kind: 'ok', economy, stateless: true };
    }
    if (!read) return { kind: 'ok', economy: null };

    const outcome = applyGuard(read.state, read.economy, delta, deps.now(), opts);
    const written = await deps.store.writeGuarded(userId, {
      expectVersion: read.version,
      expectCoins: read.economy.coins,
      expectGems: read.economy.gems,
      state: outcome.state,
      coinChange: outcome.coinChange,
      gemChange: outcome.gemChange,
      xpChange: outcome.xpChange,
      virtualBalanceSet: delta.virtualBalanceSet,
    });
    if (written === 'conflict') {
      // Another write landed between the read and this one: recompute.
      await sleep(5 + Math.floor(Math.random() * 20) * (attempt + 1));
      continue;
    }
    if (outcome.reasons.length > 0) {
      log({ userId, source, reasons: outcome.reasons, ...outcome.report });
    }
    return { kind: 'ok', economy: written, outcome };
  }
  log({ userId, source, reasons: ['cas_exhausted'], coinsRequested: delta.coins, gemsRequested: delta.gems });
  return { kind: 'busy' };
}

/** Testing hook: reset the once-per-instance "columns missing" warning. */
export function resetGuardWarnings(): void {
  warnedUnavailable = false;
}

// ─── POST /api/sync/economy ──────────────────────────────────────────────────

export interface EconomyApiResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleEconomyPost(userId: string, body: unknown, deps: EconomyDeps): Promise<EconomyApiResult> {
  const parsed = parseEconomyBody(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const result = await runGuarded(userId, parsed.delta, deps, 'sync/economy');
  if (result.kind === 'busy') {
    return { status: 503, body: { error: 'Busy, try again', code: 'ECONOMY_BUSY' } };
  }
  return { status: 200, body: { ok: true, economy: result.economy } };
}
