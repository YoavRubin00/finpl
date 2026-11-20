// scripts/test-economy-sync.ts
// Run: npx tsx scripts/test-economy-sync.ts
//
// Exercises the real logic behind GET/POST /api/sync/economy (economyGuard.ts),
// POST /api/bridge/redeem (bridgeRedeem.ts) and the track-click filter,
// POST /api/sync/subscription (subscriptionSync.ts, revenueCatVerify.ts), the
// RevenueCat webhook (revenueCatWebhook.ts, iapCredit.ts) and the legacy
// backfill's guard options with in-memory stores, a fake clock and real session
// JWTs (test secret). No network, no database. The SQL behind the stores is in
// api/_shared/economyStores.ts (run against a local Postgres by the harness).
//
// Coin caps: production runs them in SHADOW mode (ECONOMY_LIMITS.enforceCoinCaps
// false: credited in full, `would_cap` logged). The cap tests inject ENFORCED
// limits, so the enforcement path stays correct for the release that turns it on.
import { readFileSync } from 'fs';
import path from 'path';
import { signSession } from '../api/_shared/jwt';
import {
  ECONOMY_LIMITS,
  DAY_MS,
  HOUR_MS,
  MAX_CAS_ATTEMPTS,
  PURCHASE_LOOKBACK_MS,
  PURCHASE_WAIT_MS,
  GuardUnavailableError,
  applyGuard,
  handleEconomyGet,
  handleEconomyPost,
  normalizeState,
  parseEconomyBody,
  resetGuardWarnings,
  runGuarded,
  type EconomyDeps,
  type EconomyLimits,
  type EconomyRow,
  type EconomyStore,
  type GuardedWrite,
  type SimpleWrite,
} from '../api/_shared/economyGuard';
import {
  BRIDGE_REDEEMABLE,
  handleBridgeRedeem,
  isRedeemableBenefit,
  type BridgeRedeemStore,
  type RedeemOutcome,
} from '../api/_shared/bridgeRedeem';
import {
  BRIDGE_BENEFIT_LABELS,
  bridgeAlertSubject,
  buildBridgeAlertHtml,
  buildPurchaseAlertHtml,
  purchaseAlertSubject,
} from '../api/_shared/bridgeAlert';
import {
  handleSubscriptionPost,
  type RcVerdict,
  type SubscriptionReadRow,
  type SubscriptionRow,
  type SubscriptionStore,
} from '../api/_shared/subscriptionSync';
import {
  parseRcSubscriber,
  RC_REFUSED_KEY_SKIP_MS,
  resetRevenueCatVerifyMemory,
  verifyProWithRevenueCat,
} from '../api/_shared/revenueCatVerify';
import { GEM_PRODUCTS, candidateUserKeys, creditForProduct } from '../api/_shared/iapCredit';
import {
  handleRevenueCatWebhook,
  type PurchaseCreditArgs,
  type RcWebhookDeps,
  type UnmatchedPurchaseAlert,
  type UnmatchedPurchaseArgs,
} from '../api/_shared/revenueCatWebhook';
import { POST as trackClickPost } from '../app/api/bridge/track-click+api';
import { getTodaysStarterPack, STARTER_PACK_PRODUCT_ID } from '../src/features/shop/starterPack';
import { GEM_BUNDLES } from '../src/features/shop/gemBundles';
import { BRIDGE_BENEFITS } from '../src/features/the-bridge/bridgeData';

const SECRET = 'test-only-secret-for-economy-sync-0123456789abcdef';
process.env.AUTH_JWT_SECRET = SECRET;
// Nothing here may reach a database or a mail server.
delete process.env.DATABASE_URL;
delete process.env.OWNER_NOTIFICATION_EMAIL;
delete process.env.RESEND_API_KEY;

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  }
}

// ─── Fake world ──────────────────────────────────────────────────────────────

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const GHOST = '99999999-9999-4999-8999-999999999999';

const ENFORCED: Readonly<EconomyLimits> = { ...ECONOMY_LIMITS, enforceCoinCaps: true };

interface FakeProfile {
  xp: number | null;
  coins: number | null;
  gems: number | null;
  level: number | null;
  virtualBalance: string;
  guard: unknown;
  version: number;
}

// 2026-11-20 08:00 UTC = 10:00 in Israel.
const T0 = Date.UTC(2026, 10, 20, 8, 0, 0);
let nowMs = T0;

class MemoryEconomyStore implements EconomyStore {
  rows = new Map<string, FakeProfile>();
  migrated = true;
  writes = 0;
  /** revenuecat_events rows the webhook wrote (credited purchases). */
  purchases: Array<{ userId: string; gems: number; at: number }> = [];
  purchaseLookups = 0;
  failPurchaseLookup = false;
  /** Runs once before the next guarded write (simulates a concurrent writer). */
  beforeWrite: (() => void) | null = null;

  set(userId: string, p: Partial<FakeProfile>): void {
    this.rows.set(userId, {
      xp: 0, coins: 0, gems: 0, level: 1, virtualBalance: '100000.00', guard: null, version: 0, ...p,
    });
  }
  private row(p: FakeProfile): EconomyRow {
    return { xp: p.xp, coins: p.coins, gems: p.gems, level: p.level, virtualBalance: p.virtualBalance };
  }
  async read(userId: string) {
    if (!this.migrated) throw new GuardUnavailableError();
    const p = this.rows.get(userId);
    if (!p) return null;
    // jsonb round trip
    return { economy: this.row(p), state: p.guard === null ? null : JSON.parse(JSON.stringify(p.guard)), version: p.version };
  }
  async readEconomy(userId: string) {
    const p = this.rows.get(userId);
    return p ? this.row(p) : null;
  }
  async writeGuarded(userId: string, w: GuardedWrite) {
    if (this.beforeWrite) {
      const f = this.beforeWrite;
      this.beforeWrite = null;
      f();
    }
    const p = this.rows.get(userId);
    if (!p || p.version !== w.expectVersion || p.coins !== w.expectCoins || p.gems !== w.expectGems) return 'conflict' as const;
    this.writes++;
    p.coins = Math.max(0, (p.coins ?? 0) + w.coinChange);
    p.gems = Math.max(0, (p.gems ?? 0) + w.gemChange);
    p.xp = Math.max(0, (p.xp ?? 0) + w.xpChange);
    if (w.virtualBalanceSet !== undefined) p.virtualBalance = w.virtualBalanceSet.toFixed(2);
    p.guard = JSON.parse(JSON.stringify(w.state));
    p.version += 1;
    return this.row(p);
  }
  async writeSimple(userId: string, w: SimpleWrite) {
    const p = this.rows.get(userId);
    if (!p) return null;
    this.writes++;
    if (w.coinChange !== 0) p.coins = Math.max(0, (p.coins ?? 0) + w.coinChange);
    if (w.gemChange !== 0) p.gems = Math.max(0, (p.gems ?? 0) + w.gemChange);
    if (w.xpChange !== 0) p.xp = Math.max(0, (p.xp ?? 0) + w.xpChange);
    if (w.virtualBalanceSet !== undefined) p.virtualBalance = w.virtualBalanceSet.toFixed(2);
    return this.row(p);
  }
  async hasPurchaseEvent(userId: string, gems: number, sinceMs: number) {
    this.purchaseLookups++;
    if (this.failPurchaseLookup) throw new Error('lookup failed');
    if (!this.migrated) return false;
    return this.purchases.some((e) => e.userId === userId && e.gems === gems && e.at >= sinceMs);
  }
  /** What the webhook's creditPurchaseGems does: a ledger row and the gems. */
  webhookCredit(userId: string, gems: number, at = nowMs): void {
    this.purchases.push({ userId, gems, at });
    const p = this.rows.get(userId)!;
    p.gems = (p.gems ?? 0) + gems;
  }
}

let store = new MemoryEconomyStore();
let logs: Array<Record<string, unknown>> = [];
let limits: Readonly<EconomyLimits> = ECONOMY_LIMITS;
let sleeps: number[] = [];
/** Runs on each sleep (1-based count), e.g. to land a webhook mid-wait. */
let onSleep: ((n: number) => void) | null = null;
function deps(): EconomyDeps {
  return {
    store,
    now: () => nowMs,
    sleep: async (ms) => { sleeps.push(ms); onSleep?.(sleeps.length); },
    log: (l) => logs.push(l),
    limits,
  };
}
function reset(coins = 0, gems = 0, mode: 'shadow' | 'enforced' = 'shadow'): void {
  store = new MemoryEconomyStore();
  store.set(ALICE, { coins, gems, xp: 0 });
  logs = [];
  sleeps = [];
  onSleep = null;
  limits = mode === 'enforced' ? ENFORCED : ECONOMY_LIMITS;
  nowMs = T0;
  resetGuardWarnings();
}
const bal = () => store.rows.get(ALICE)!;
const guardState = () => normalizeState(bal().guard, nowMs);
const budgetUsed = () => guardState().h.reduce((a, e) => a + e[1], 0);
const poolNow = () => { const p = guardState().p; return p.prev + p.cur; };
async function post(body: unknown, userId = ALICE) {
  return handleEconomyPost(userId, body, deps());
}
async function coins(n: number) { return post({ coinsDelta: n }); }
async function gems(n: number) { return post({ gemsDelta: n }); }
const econ = (r: { body: Record<string, unknown> }) => r.body.economy as EconomyRow;

async function main(): Promise<void> {
// ─── 0. Production mode ──────────────────────────────────────────────────────
check(ECONOMY_LIMITS.enforceCoinCaps === false && ECONOMY_LIMITS.coinHardCeilingPerRequest === 1_000_000,
  'limits: this release runs the coin caps in shadow mode, hard ceiling 1,000,000 per request');
check(MAX_CAS_ATTEMPTS === 16, 'cas: 16 compare-and-swap attempts before 503');

// ─── 1. Today's client request shapes ────────────────────────────────────────
{
  reset(1000, 50);
  const r1 = await post({ xpDelta: 20 });
  check(r1.status === 200 && econ(r1).xp === 20, 'shape: { xpDelta } → 200 { ok, economy }', r1);
  check(!('heldCoins' in r1.body), 'shape: an XP-only write does not know heldCoins → field absent', r1.body);
  const r2 = await post({ coinsDelta: 300 });
  check(r2.status === 200 && r2.body.ok === true && econ(r2).coins === 1300, 'shape: { coinsDelta: 300 } credited', r2);
  check(r2.body.heldCoins === 0 && !('heldCoins' in (r2.body.economy as object)),
    'shape: heldCoins 0 at the top level, never inside economy (old bundles read only economy)', r2.body);
  const r3 = await post({ gemsDelta: -30 });
  check(econ(r3).gems === 20, 'shape: { gemsDelta: -30 } (streak repair) debited', r3);
  const r4 = await post({ virtualBalanceSet: 123.456 });
  check(econ(r4).virtualBalance === '123.46', 'shape: { virtualBalanceSet } number set', r4);
  // The trading store sends the trade answer's STRING balance: ignored, as before.
  const r5 = await post({ virtualBalanceSet: '99.00' });
  check(r5.status === 400 && r5.body.error === 'No deltas provided', 'shape: string virtualBalanceSet ignored → same 400 as before', r5);
  const r6 = await post({});
  check(r6.status === 400 && r6.body.error === 'No deltas provided', 'shape: empty body → 400 as before', r6);
  const r7 = await post({ coinsDelta: 50 }, GHOST);
  check(r7.status === 200 && r7.body.economy === null && !('heldCoins' in r7.body), 'shape: no profile row → 200 { economy: null } as before', r7);
  const r8 = await post({ xpDelta: 5 }, GHOST);
  check(r8.status === 200 && r8.body.economy === null, 'shape: no profile row (xp only) → economy null', r8);
  const r9 = await post({ coinsDelta: 10, xpDelta: 5, gemsDelta: 1 });
  const e9 = econ(r9);
  check(e9.coins === 1310 && e9.xp === 25 && e9.gems === 21, 'shape: several fields in one body', e9);
  check(logs.length === 0, 'honest shapes: no clamp log lines', logs);

  const g = await handleEconomyGet(ALICE, deps());
  check(g.status === 200 && (g.body.economy as EconomyRow).coins === 1310 && g.body.heldCoins === 0,
    'GET: { ok, economy, heldCoins }', g.body);
  const g2 = await handleEconomyGet(GHOST, deps());
  check(g2.status === 200 && g2.body.economy === null && !('heldCoins' in g2.body), 'GET: no profile → economy null', g2.body);
  store.migrated = false;
  const g3 = await handleEconomyGet(ALICE, deps());
  check(g3.status === 200 && (g3.body.economy as EconomyRow).coins === 1310 && !('heldCoins' in g3.body),
    'GET before 0018: the balances, no heldCoins', g3.body);
}

// ─── 2. Numeric validation ───────────────────────────────────────────────────
{
  reset(1000, 0);
  const inf = JSON.parse('{"coinsDelta": 1e400}'); // JSON.parse gives Infinity
  check((await post(inf)).status === 400, 'validation: Infinity (1e400 in JSON) → 400');
  check((await post({ coinsDelta: NaN })).status === 400, 'validation: NaN → 400');
  check((await post({ gemsDelta: 1e12 })).status === 400, 'validation: |delta| > 2e9 → 400');
  check((await post({ xpDelta: -1e15 })).status === 400, 'validation: huge negative → 400');
  check((await post({ virtualBalanceSet: 1e20 })).status === 400, 'validation: absurd virtualBalanceSet → 400');
  const frac = await post({ coinsDelta: 10.6 });
  check(econ(frac).coins === 1011, 'validation: fractions rounded', frac.body);
  check(bal().coins === 1011, 'validation: rejected requests changed nothing');
  const p = parseEconomyBody({ coinsDelta: -0 });
  check(!p.ok, 'validation: -0 is no delta');
}

// ─── 3. Floors: negative deltas never go below zero ──────────────────────────
for (const mode of ['shadow', 'enforced'] as const) {
  reset(100, 5, mode);
  const r = await coins(-2500);
  check(econ(r).coins === 0, `floor (${mode}): -2,500 with 100 coins → 0, not -2,400`, r.body);
  const g = await gems(-30);
  check(econ(g).gems === 0, `floor (${mode}): -30 gems with 5 → 0`, g.body);
  check(logs.some((l) => (l.reasons as string[]).includes('coin_debit_floor')), `floor (${mode}): logged as coin_debit_floor`);
  // Only the coins actually removed fund the returns pool.
  logs = [];
  const back = await coins(2500);
  check(econ(back).coins === 2500 && logs.length === 0, `floor (${mode}): a later credit within budget is fine`, back.body);
  // Pool got 100 (coins really debited) + 5 × 40 (gems really debited) = 300.
  // Budget first: the +2,500 came from the free budget, the pool stays for overflow.
  check(poolNow() === 300 && budgetUsed() === 2500, `floor (${mode}): pool funded only by what was really debited, and kept (budget first)`,
    { pool: poolNow(), used: budgetUsed() });
}

// ─── 4. Honest heavy day (reward table) passes untouched ─────────────────────
for (const mode of ['shadow', 'enforced'] as const) {
  reset(0, 0, mode);
  // Pro, streak 100, weekday, no boosts. Amounts from the app (see header of
  // api/_shared/economyGuard.ts and the report): one POST per reward, spread
  // over the day.
  const coinRewards: number[] = [
    2000, // cold open, session stacking (>=12h away)
    300, // daily task
    375, 375, 375, 375, 375, 375, 375, 375, 375, 375, 675, // 11 module chests (one rare)
    375, 375, // 2 double-or-nothing wins
    ...Array(10).fill(60), ...Array(10).fill(50), // module 100% pops
    ...Array(26).fill(25), // dilemmas / recall / pearls
    720, 1440, // daily quests (regular + Pro), streak 100
    420, 840, // daily news (regular + Pro)
    925, // tomorrow chest (max)
    ...Array(15).fill(100), // daily challenge games
    773, // real assets collection (maxed)
    500, 200, 300, 30, 270, 300, 25, 50, 150, 100, 100, // share, ratings, diamond hands, trade room, anon, …
    100, // referral dividend
    500, // chest rewarded-ad bonus
    250, // bridge rewarded-ad bonus
    2000, // second cold open 12h later
  ];
  const gemRewards = [10, 1, 2, 4, 5, 12, 5, 3, 5, 5];
  const totalCoins = coinRewards.reduce((a, b) => a + b, 0);
  const totalGems = gemRewards.reduce((a, b) => a + b, 0);
  let i = 0;
  for (const c of coinRewards) {
    nowMs = T0 + Math.floor((i++ / coinRewards.length) * 14 * HOUR_MS);
    await coins(c);
  }
  for (const g of gemRewards) await gems(g);
  check(bal().coins === totalCoins, `heavy day (${mode}): all ${totalCoins} earned coins credited`, { coins: bal().coins });
  check(bal().gems === totalGems, `heavy day (${mode}): all ${totalGems} earned gems credited`, { gems: bal().gems });
  check(logs.length === 0, `heavy day (${mode}): no clamp / hold / drop / would_cap`, logs);
  check(totalCoins < ECONOMY_LIMITS.coinFreePer24h / 2 + 2000, 'heavy day uses about half the 24h coin budget (≈2× headroom)', totalCoins);

  // Same user also trades the same day.
  logs = [];
  const before = bal().coins!;
  await coins(-10000); // open a position
  await coins(12500); // close it +25%
  check(bal().coins === before + 2500 && logs.length === 0, `heavy day (${mode}): trading close credited in full, nothing logged`, bal().coins);
}

// ─── 5. Gem → coin exchange (enforced caps), both arrival orders ─────────────
{
  reset(0, 3000, 'enforced');
  await gems(-2500);
  await coins(100000);
  check(bal().coins === 100000 && bal().gems === 500 && logs.length === 0, 'exchange: gems first, then +100,000 coins → full credit', bal());

  reset(0, 3000, 'enforced');
  const first = await coins(100000); // the coin request wins the race
  check(econ(first).coins === ECONOMY_LIMITS.coinFreePerRequest && first.body.heldCoins === 75000,
    'exchange race: coins first → 25,000 now, the rest held (heldCoins 75,000 in the answer)', first.body);
  const second = await gems(-2500);
  check(econ(second).coins === 100000 && bal().gems === 500 && second.body.heldCoins === 0,
    'exchange race: the gem debit releases the held coins in its own answer', second.body);
  const st = guardState();
  check(st.held === 0, 'exchange race: nothing left held', st);
  // Budget first: the held 75,000 took the other 25,000 of the budget and
  // 50,000 of the pool, so 50,000 of the pool is left for later returns.
  check(poolNow() === 50000 && budgetUsed() === 50000, 'exchange race: budget used first, the rest of the pool kept', { pool: poolNow(), used: budgetUsed() });

  // New client (OTA): one combined request.
  reset(0, 400, 'enforced');
  const one = await post({ gemsDelta: -350, coinsDelta: 10000 });
  check(econ(one).coins === 10000 && econ(one).gems === 50 && logs.length === 0,
    'exchange (new client): one combined request', one.body);

  // Exchange without gems mints nothing beyond the free budget.
  reset(0, 0, 'enforced');
  await gems(-2500);
  await coins(100000);
  check(bal().coins === ECONOMY_LIMITS.coinFreePerRequest, 'exchange forged without gems (enforced): only the free budget', bal());

  reset(0, 0);
  await gems(-2500); // nothing to debit (logged as gem_debit_floor)
  logs = [];
  const forged = await coins(100000);
  check(bal().coins === 100000 && forged.body.heldCoins === 0 && guardState().held === 0,
    'exchange forged without gems (shadow): credited in full, nothing held', forged.body);
  const line = logs.find((l) => (l.reasons as string[]).includes('would_cap'));
  check(logs.length === 1 && !!line && line.mode === 'shadow' && line.coinsOverCap === 75000 && line.capHit === 'per_request'
    && line.coinsFromBudget === 25000 && line.userId === ALICE,
  'exchange forged without gems (shadow): ONE would_cap line with the amounts (75,000 over the per-request cap)', logs);
}

// ─── 6. Stakes: fantasy settlement, positions, rewards in between ────────────
{
  reset(120000, 0, 'enforced');
  await coins(-100000); // 100k-tier entry
  nowMs += 7 * DAY_MS + HOUR_MS; // weekly settlement
  await coins(150000); // 150% payout
  check(bal().coins === 145000, 'fantasy (enforced): 150,000 payout → 25,000 (per-request budget) + the 100,000 stake from the pool now', bal());
  await coins(100); // the next reward
  check(bal().coins === 170000 && guardState().held === 100,
    'fantasy (enforced): the other 25,000 of profit arrive with the next reward (its own 100 waits: 24h budget used)', bal());
  nowMs += 61 * DAY_MS;
  const st = guardState();
  check(st.p.prev === 0 && st.p.cur === 0, 'pool: entries expire after two buckets', st.p);

  // Ordinary rewards between the stake and the payout no longer eat the stake.
  reset(120000, 0, 'enforced');
  await coins(-100000);
  for (let day = 0; day < 11; day++) {
    nowMs = T0 + day * DAY_MS + HOUR_MS;
    for (let k = 0; k < 5; k++) await coins(1000); // ~5,000 a day of play
  }
  check(poolNow() === 100000, 'stake + 11 days of 5,000/day rewards (enforced): rewards came from the free budget, the 100,000 stake is still in the pool', poolNow());
  nowMs += HOUR_MS;
  const payout = await coins(150000);
  check(econ(payout).coins === 20000 + 55000 + 125000 && payout.body.heldCoins === 25000,
    'stake + rewards (enforced): the 150,000 payout credits 125,000 now (was 70,000 when the pool paid rewards first), 25,000 held', payout.body);

  // A position held for five weeks: its stake is still in the pool.
  reset(60000, 0, 'enforced');
  await coins(-50000);
  nowMs += 35 * DAY_MS;
  logs = [];
  await coins(55000);
  check(bal().coins === 65000 && logs.length === 0, 'pool (enforced): stake of a 5-week-old position still returns in full', bal());

  // Shadow mode: the payout is credited in full; the cut it would have made is logged.
  reset(120000, 0);
  await coins(-100000);
  nowMs += 7 * DAY_MS + HOUR_MS;
  const shadowPayout = await coins(150000);
  check(econ(shadowPayout).coins === 170000 && shadowPayout.body.heldCoins === 0,
    'fantasy (shadow): 150,000 payout credited in full', shadowPayout.body);
  check(logs.length === 1 && (logs[0].reasons as string[]).includes('would_cap') && logs[0].coinsOverCap === 25000 && logs[0].coinsFromPool === 100000,
    'fantasy (shadow): would_cap logged once with the amounts (pool 100,000, budget 25,000, over 25,000)', logs);
}

// ─── 7. Over-cap / forged credits ────────────────────────────────────────────
{
  reset(0, 0, 'enforced');
  const r = await coins(1_000_000);
  check(econ(r).coins === 25000 && r.status === 200 && r.body.heldCoins === 975000, 'forged +1,000,000 (enforced): 25,000 credited, 200 with server truth', r.body);
  check(logs.length === 1 && (logs[0].reasons as string[]).includes('coin_held') && logs[0].userId === ALICE
    && typeof logs[0].coinsRequested === 'number' && !JSON.stringify(logs[0]).includes('@'),
  'forged (enforced): one structured log line (uuid, source, amounts, no email)', logs);
  // Attacker steady state: 24h of requests can't exceed the 24h budget.
  for (let h = 0; h < 24; h++) {
    nowMs += HOUR_MS / 2;
    await coins(1_000_000);
  }
  const st = guardState();
  const used = st.h.reduce((a, e) => a + e[1], 0);
  check(used <= ECONOMY_LIMITS.coinFreePer24h && bal().coins! <= ECONOMY_LIMITS.coinFreePer24h,
    'forged (enforced): ≤ 50,000 coins per rolling 24h however many requests', { coins: bal().coins, used });
  check(st.held <= ECONOMY_LIMITS.heldCoinsMax, 'forged (enforced): held amount bounded', st.held);
  nowMs += DAY_MS;
  await coins(0 + 1);
  check(bal().coins! <= 2 * ECONOMY_LIMITS.coinFreePer24h + 1, 'forged (enforced): next day again ≤ the daily budget', bal().coins);

  // Honest outlier (e.g. real-assets after 60 days away: 46,000 in one delta)
  // is delayed, never lost.
  reset(0, 0, 'enforced');
  await coins(46000);
  check(bal().coins === 25000, 'outlier (enforced): first 25,000 now', bal().coins);
  await coins(300);
  check(bal().coins === 46300, 'outlier (enforced): held remainder paid with the next reward', bal().coins);
  check(guardState().held === 0, 'outlier (enforced): nothing left held');

  // Whale day above the 24h budget: carried over, not lost.
  reset(0, 0, 'enforced');
  for (let k = 0; k < 7; k++) await coins(10000);
  check(bal().coins === 50000, 'whale (enforced): 70,000 earned in a day → 50,000 today', bal().coins);
  nowMs += DAY_MS;
  await coins(100);
  check(bal().coins === 70100, 'whale (enforced): the held 20,000 arrive with the next reward after the window', bal().coins);

  // Shadow mode (production): no caps, a hard ceiling, would_cap lines.
  reset(0, 0);
  const s1 = await coins(1_000_000);
  check(econ(s1).coins === 1_000_000 && s1.body.heldCoins === 0, 'forged +1,000,000 (shadow): credited in full (the hard ceiling), nothing held', s1.body);
  check(logs.length === 1 && JSON.stringify(logs[0].reasons) === '["would_cap"]' && logs[0].capHit === 'per_request'
    && logs[0].coinsOverCap === 975000 && logs[0].mode === 'shadow',
  'forged (shadow): one would_cap line (per request, 975,000 over)', logs);
  logs = [];
  const s2 = await coins(2_000_000);
  check(econ(s2).coins === 2_000_000 && guardState().held === 0, 'forged +2,000,000 (shadow): 1,000,000 credited, the excess DROPPED (not held)', s2.body);
  check(logs.length === 1 && (logs[0].reasons as string[]).includes('coin_ceiling_dropped') && (logs[0].reasons as string[]).includes('would_cap')
    && logs[0].coinsDroppedOverCeiling === 1_000_000 && logs[0].capHit === 'per_24h',
  'forged (shadow): ceiling drop and would_cap in ONE line', logs);
  check(budgetUsed() === 2_000_000, 'shadow: the 24h counters keep counting what was credited outside the pool', budgetUsed());
  reset(0, 0);
  for (let k = 0; k < 3; k++) await coins(20000);
  check(bal().coins === 60000 && logs.length === 1 && logs[0].capHit === 'per_24h' && logs[0].coinsOverCap === 10000,
    'whale (shadow): 60,000 in an hour credited; the third request logs would_cap against the 24h budget (10,000 over)', logs);
  // Held coins from an earlier enforced period are paid out, never kept, in shadow mode.
  reset(0, 0);
  bal().guard = { v: 1, h: [], p: { t: T0, prev: 0, cur: 0 }, held: 4000 };
  const rel = await coins(100);
  check(econ(rel).coins === 4100 && rel.body.heldCoins === 0, 'shadow: coins an enforced period held are released with the next credit', rel.body);
}

// ─── 8. Gems: no minting without a verified purchase ─────────────────────────
{
  reset(0, 0);
  const r = await gems(14000);
  check(econ(r).gems === 0 && r.status === 200, 'gems: +14,000 (purchase-sized) dropped, 200', r.body);
  check((logs[0]?.reasons as string[] | undefined)?.includes('gem_purchase_size_dropped') === true, 'gems: logged gem_purchase_size_dropped', logs);
  const r2 = await gems(ECONOMY_LIMITS.gemFreePerRequest + 1);
  check(econ(r2).gems === 0, 'gems: 51 dropped');
  for (let k = 0; k < 20; k++) await gems(50);
  check(bal().gems === ECONOMY_LIMITS.gemFreePer24h, 'gems: forged 50s capped at 200 per rolling 24h', bal().gems);
  nowMs += 23 * HOUR_MS;
  await gems(50);
  check(bal().gems === 200, 'gems: still capped 23h later (rolling window)', bal().gems);
  nowMs += 2 * HOUR_MS;
  await gems(50);
  check(bal().gems === 250, 'gems: budget back after 24h', bal().gems);

  // Purchases: an old bundle echoes the bought gems; only the webhook credits them.
  reset(0, 100);
  await gems(500); // IAPModal echo (dropped)
  store.webhookCredit(ALICE, 500);
  check(bal().gems === 600, 'purchase 500 gems: credited exactly once (was twice: echo + webhook)', bal().gems);
}

// ─── 8b. The old bundle's purchase echo waits for the webhook (E2a) ──────────
{
  check(JSON.stringify(PURCHASE_WAIT_MS) === '[1000,1500,2000]' && PURCHASE_LOOKBACK_MS === 120000,
    'purchase wait: re-reads at 1.0 / 1.5 / 2.0 s (4.5 s at most), webhook rows up to 2 minutes old count');

  // The webhook lands during the wait (after the first re-read).
  reset(0, 100);
  onSleep = (n) => { if (n === 2) store.webhookCredit(ALICE, 500); };
  const a = await gems(500);
  check(econ(a).gems === 600 && sleeps.length === 2 && a.body.heldCoins === 0,
    'purchase wait: the webhook lands while waiting → the answer HAS the bought gems (old bundle keeps showing them)', { body: a.body, sleeps });
  check(logs.some((l) => l.outcome === 'purchase_credit_seen' && l.gems === 500), 'purchase wait: logged purchase_credit_seen', logs);

  // The webhook landed before the app's POST: answered at once.
  reset(0, 100);
  store.webhookCredit(ALICE, 500, T0 - 30_000);
  const b = await gems(500);
  check(econ(b).gems === 600 && sleeps.length === 0, 'purchase wait: webhook already in → answered at once with it', { body: b.body, sleeps });

  // No webhook: waits ~4.5 s, then answers as before; never echoes the gems.
  reset(0, 100);
  const c = await gems(500);
  check(econ(c).gems === 100 && JSON.stringify(sleeps) === '[1000,1500,2000]' && bal().gems === 100,
    'purchase wait: no webhook → 3 re-reads, then the server balance WITHOUT the dropped gems (never echoed)', { body: c.body, sleeps });

  // Only a matching row counts: same user, same gem count, not older than 2 minutes.
  reset(0, 100);
  store.set(BOB, { coins: 0, gems: 0 });
  store.webhookCredit(BOB, 500);
  store.webhookCredit(ALICE, 80);
  store.webhookCredit(ALICE, 500, T0 - PURCHASE_LOOKBACK_MS - 1000);
  const d = await gems(500);
  check(econ(d).gems === 680 && sleeps.length === 3,
    "purchase wait: another user's row, another amount or a row older than 2 minutes do not end the wait", { body: d.body, sleeps });

  // Small gem deltas (earned) never wait.
  reset(0, 0);
  const e = await gems(12);
  check(econ(e).gems === 12 && sleeps.length === 0 && store.purchaseLookups === 0, 'purchase wait: an earned gem delta (≤ 50) never waits');

  // The lookup fails: the write already happened, the answer is the usual one (no 500).
  reset(0, 100);
  store.failPurchaseLookup = true;
  const f = await gems(500);
  check(f.status === 200 && econ(f).gems === 100 && logs.some((l) => l.outcome === 'purchase_wait_failed'),
    'purchase wait: a failing lookup → 200 with the written row, logged', f.body);

  // Before 0018 (stateless): no ledger to wait for.
  reset(0, 100);
  store.migrated = false;
  const g = await gems(500);
  check(econ(g).gems === 100 && sleeps.length === 0, 'purchase wait: stateless fallback (before 0018) does not wait', { body: g.body, sleeps });

  // A combined request (new-client shape) with a purchase-sized gem part waits too, but the coins land first.
  reset(0, 100);
  onSleep = (n) => { if (n === 1) store.webhookCredit(ALICE, 2500); };
  const h = await post({ gemsDelta: 2500, coinsDelta: 300 });
  check(econ(h).gems === 2600 && econ(h).coins === 300, 'purchase wait: other fields of the request are applied, the answer includes the webhook credit', h.body);
}

// ─── 9. Starter pack (₪19.90): coins via the pool the webhook funds ──────────
{
  const pack = getTodaysStarterPack(new Date(T0));
  const credit = creditForProduct(STARTER_PACK_PRODUCT_ID, T0, T0);
  check(!!credit && credit.gems === pack.gems && credit.poolCoins === pack.coins, 'starter pack: webhook maps to today\'s pack (not 90 gems)', credit);

  // Webhook first (enforced caps).
  reset(0, 0, 'enforced');
  store.webhookCredit(ALICE, credit!.gems);
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 0 }, deps(), 'webhook/revenuecat', { poolCredit: credit!.poolCoins });
  await coins(pack.coins);
  const echo = await gems(pack.gems);
  check(bal().coins === pack.coins && bal().gems === pack.gems && econ(echo).gems === pack.gems && sleeps.length === 0,
    'starter pack, webhook first: coins and gems once; the old bundle\'s gem echo is answered at once with the credited gems', bal());
  const limited = logs.filter((l) => Array.isArray(l.reasons));
  check(limited.length === 1 && JSON.stringify(limited[0].reasons) === '["gem_purchase_size_dropped"]',
    'starter pack: only the app\'s gem echo is logged (dropped), the coins pass', logs);
  check(budgetUsed() === pack.coins && poolNow() === pack.coins,
    'starter pack: budget first, so the pack\'s coins came from the free budget and its pool credit is kept for overflow', { used: budgetUsed(), pool: poolNow() });

  // App echo first.
  reset(0, 0, 'enforced');
  await coins(pack.coins);
  await gems(pack.gems);
  store.rows.get(ALICE)!.gems! += credit!.gems;
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 0 }, deps(), 'webhook/revenuecat', { poolCredit: credit!.poolCoins });
  check(bal().coins === pack.coins && bal().gems === pack.gems, 'starter pack, app first: coins and gems once', bal());

  // Pack bought after a budget-exhausting day: held, then released by the webhook's pool credit.
  reset(0, 0, 'enforced');
  for (let k = 0; k < 5; k++) await coins(10000);
  logs = [];
  await coins(pack.coins);
  check(bal().coins === 50000, 'starter pack after a budget-exhausting day (enforced): held for now', bal().coins);
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 0 }, deps(), 'webhook/revenuecat', { poolCredit: credit!.poolCoins });
  check(bal().coins === 50000 + pack.coins, 'starter pack (enforced): the webhook\'s pool credit releases the held coins', bal().coins);
}

// ─── 9b. Product table (explicit, no pattern) ────────────────────────────────
{
  const map: Array<[string, number | null]> = [
    ['finplay_gems_80', 80], ['finplay_gems_500', 500], ['finplay_gems_1200', 1200],
    ['finplay_gems_2500', 2500], ['finplay_gems_6500', 6500], ['finplay_gems_14000', 14000],
    ['finplay_gems_500:buy-option', 500],
    ['finplay_gems_20000', null], ['finplay_gems_100', null], ['finplay_gems_999999', null], ['FINPLAY_GEMS_500', null],
    ['gems-pouch', null], ['finplay_pro_monthly_29_90', null], ['__proto__', null], ['constructor', null], ['', null],
  ];
  const wrong = map.filter(([id, gems]) => (creditForProduct(id, T0, T0)?.gems ?? null) !== gems);
  check(wrong.length === 0, 'webhook products: only the six gem bundles (and an Android ":option" suffix of one) credit gems; any other id credits nothing', wrong);
  check(creditForProduct(42, T0, T0) === null, 'webhook products: a non-string product id credits nothing');

  // The table matches what the app sells.
  const rcSource = readFileSync(path.resolve(__dirname, '..', 'src', 'services', 'revenueCat.ts'), 'utf8');
  const block = /GEM_PRODUCT_IDS[^{]*\{([\s\S]*?)\}/.exec(rcSource)?.[1] ?? '';
  const appIds = Object.fromEntries([...block.matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
  const drift = GEM_BUNDLES.filter((b) => GEM_PRODUCTS[appIds[b.id]] !== b.gems).map((b) => b.id);
  check(GEM_BUNDLES.length === 6 && drift.length === 0 && Object.keys(GEM_PRODUCTS).length === GEM_BUNDLES.length,
    'webhook products: the server table == src/services/revenueCat.ts GEM_PRODUCT_IDS × src/features/shop/gemBundles.ts', { appIds, drift });
  check(appIds['starter-pack'] === STARTER_PACK_PRODUCT_ID, 'webhook products: the app\'s starter-pack product id is the one the server maps', appIds['starter-pack']);

  const keys = candidateUserKeys({ app_user_id: '$RCAnonymousID:abc', original_app_user_id: ALICE, aliases: ['$RCAnonymousID:abc', ALICE, 'a@x.com'] });
  check(JSON.stringify(keys) === JSON.stringify([ALICE, 'a@x.com']), 'webhook: candidate keys skip anonymous ids, keep aliases', keys);
}

// ─── 10. Concurrency: CAS conflicts recompute, never double-apply ────────────
{
  reset(0, 0);
  // A concurrent writer spends coins between this request's read and write.
  store.set(ALICE, { coins: 1000, gems: 0 });
  store.beforeWrite = () => {
    const p = store.rows.get(ALICE)!;
    p.coins = 0; // e.g. a bridge redeem landed
  };
  const r = await coins(-1000);
  check(econ(r).coins === 0, 'cas: retried against the new balance (no negative)', r.body);
  check(guardState().p.cur === 0, 'cas: the retry debited 0, so the pool gained nothing', guardState().p);

  // Two interleaved requests can't both use the last of the budget (enforced).
  reset(0, 0, 'enforced');
  for (let k = 0; k < 4; k++) await coins(10000); // 40,000 used
  const snapA = await store.read(ALICE);
  // Request A computes against the snapshot…
  const outA = applyGuard(snapA!.state, snapA!.economy, { xp: 0, coins: 10000, gems: 0 }, nowMs, {}, ENFORCED);
  // …request B (another instance) commits first.
  await coins(10000);
  const wA = await store.writeGuarded(ALICE, {
    expectVersion: snapA!.version, expectCoins: snapA!.economy.coins, expectGems: snapA!.economy.gems,
    state: outA.state, coinChange: outA.coinChange, gemChange: 0, xpChange: 0,
  });
  check(wA === 'conflict', 'cas: stale write refused');
  await coins(10000); // A's real retry path
  check(bal().coins === 50000, 'cas: interleaved requests stay within the 24h budget', bal().coins);

  // Exhausted retries → 503 ECONOMY_BUSY, nothing written.
  reset(100, 0);
  let attempts = 0;
  const origWrite = store.writeGuarded.bind(store);
  store.writeGuarded = async () => { attempts++; return 'conflict' as const; };
  const busy = await coins(5);
  store.writeGuarded = origWrite;
  check(busy.status === 503 && busy.body.code === 'ECONOMY_BUSY' && bal().coins === 100 && attempts === 16 && sleeps.length === 16,
    'cas: 16 misses → 503 ECONOMY_BUSY, nothing applied (safe to resend)', { busy, attempts });
  check(logs.some((l) => (l.reasons as string[]).includes('cas_exhausted')), 'cas: cas_exhausted logged');
}

// ─── 11. Before migration 0018 (stateless fallback) ──────────────────────────
{
  reset(1000, 10);
  store.migrated = false;
  const r1 = await coins(300);
  check(econ(r1).coins === 1300 && r1.body.heldCoins === 0, 'stateless: honest credit works', r1.body);
  const r2 = await gems(500);
  check(econ(r2).gems === 10, 'stateless: purchase-sized gem echo dropped (webhook credits)', r2.body);
  const r3 = await coins(-5000);
  check(econ(r3).coins === 0, 'stateless: floor at zero', r3.body);
  const r4 = await coins(5_000_000);
  check(econ(r4).coins === ECONOMY_LIMITS.coinHardCeilingPerRequest, 'stateless: the same hard ceiling (1,000,000), the excess dropped', r4.body);
  const r5 = await coins(100000);
  check(econ(r5).coins === 1_100_000, 'stateless: a 100,000 exchange still passes (no caps, as in shadow mode)', r5.body);
  check(logs.length === 5 && logs.every((l) => l.mode === 'stateless' && l.userId === ALICE),
    'stateless: EVERY fallback request is logged (mode stateless), not only the limited ones', logs.length);
}

// ─── 12. Corrupt stored state starts fresh, never throws ─────────────────────
{
  reset(0, 0);
  store.rows.get(ALICE)!.guard = { v: 1, h: 'nope', p: { t: 'x' }, held: -5 };
  const r = await coins(100);
  check(econ(r).coins === 100, 'state: malformed jsonb → fresh state', r.body);
  const s = normalizeState('{"v":1,"h":[[1,2,3]],"held":7}', nowMs);
  check(s.h.length === 0 && s.held === 7, 'state: old hours dropped, string jsonb parsed', s);
}

// ─── 12b. Legacy upload (backfill-v1): legacyDifference ──────────────────────
{
  reset(0, 0);
  const a = await runGuarded(ALICE, { xp: 0, coins: 0, gems: 300 }, deps(), 'migrate/backfill', { legacyDifference: true });
  check(a.kind === 'ok' && bal().gems === 200 && a.outcome?.reasons.includes('gem_daily_cap') === true && !a.outcome?.reasons.includes('gem_purchase_size_dropped'),
    'backfill: a legacy gem difference of 300 goes through the 24h earned-gem budget (200 credited), not dropped as purchase-shaped', a.kind === 'ok' ? a.outcome?.report : a);
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 100 }, deps(), 'migrate/backfill', { legacyDifference: true });
  check(bal().gems === 200, 'backfill: repeated uploads stay within the same 24h gem budget (never unbounded)', bal().gems);
  const plainEcho = await gems(300);
  check(econ(plainEcho).gems === 200, 'backfill option only: a plain /api/sync/economy +300 is still dropped', plainEcho.body);

  // Enforced: a retry after a partial failure never counts held coins twice.
  reset(0, 0, 'enforced');
  await runGuarded(ALICE, { xp: 0, coins: 200000, gems: 0 }, deps(), 'migrate/backfill', { legacyDifference: true });
  check(bal().coins === 25000 && guardState().held === 175000, 'backfill (enforced): 200,000 legacy coins → 25,000 now, 175,000 held', { coins: bal().coins, held: guardState().held });
  const retryDiff = 200000 - bal().coins!; // what the route computes on the retry
  await runGuarded(ALICE, { xp: 0, coins: retryDiff, gems: 0 }, deps(), 'migrate/backfill', { legacyDifference: true });
  check(bal().coins! + guardState().held === 200000, 'backfill (enforced): the retry counts the held coins as on their way (200,000 in all, not 375,000)',
    { coins: bal().coins, held: guardState().held });

  reset(0, 0);
  store.migrated = false;
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 300 }, deps(), 'migrate/backfill', { legacyDifference: true });
  check(bal().gems === ECONOMY_LIMITS.gemFreePerRequest, 'backfill before 0018: a legacy gem difference is clamped to one request\'s worth (50)', bal().gems);
}

// ─── 13. Bridge redeem ───────────────────────────────────────────────────────

class MemoryBridgeStore implements BridgeRedeemStore {
  redemptions = new Set<string>();
  clicks: Array<{ userId: string; benefitId: string }> = [];
  constructor(private eco: MemoryEconomyStore, public unavailable = false) {}
  async redeem(userId: string, benefitId: string, cost: number): Promise<RedeemOutcome> {
    if (this.unavailable) return { kind: 'unavailable' };
    const p = this.eco.rows.get(userId);
    if (!p) return { kind: 'no_user' };
    const row = (): EconomyRow => ({ xp: p.xp, coins: p.coins, gems: p.gems, level: p.level, virtualBalance: p.virtualBalance });
    const key = `${userId}:${benefitId}`;
    if (this.redemptions.has(key)) return { kind: 'already', economy: row() };
    if ((p.coins ?? 0) < cost) return { kind: 'insufficient', economy: row() };
    p.coins = (p.coins ?? 0) - cost;
    this.redemptions.add(key);
    this.clicks.push({ userId, benefitId });
    return { kind: 'redeemed', economy: row(), email: 'alice@example.com' };
  }
}

{
  reset(3000, 0);
  const bridge = new MemoryBridgeStore(store);
  const alerts: unknown[] = [];
  const bdeps = {
    store: bridge,
    profileEmail: async () => 'alice@example.com',
    alert: (a: unknown) => alerts.push(a),
    log: () => {},
  };
  const token = signSession({ sub: ALICE, authId: 'alice@example.com' });
  const auth = `Bearer ${token}`;
  const call = (body: unknown, authorization: string | null = auth) =>
    handleBridgeRedeem({ authorization, body, clientIp: '1.2.3.4' }, bdeps);

  const ok = await call({ benefitId: 'bridge-invest-altshuler', platform: 'ios' });
  check(ok.status === 200 && ok.body.redeemed === true && ok.body.alreadyRedeemed === false
    && (ok.body.economy as EconomyRow).coins === 500 && typeof ok.body.partnerUrl === 'string',
  'bridge: redeem deducts 2,500 from the SERVER balance', ok);
  check(alerts.length === 1 && (alerts[0] as { verified: boolean }).verified === true, 'bridge: owner alert marked verified');
  const replay = await call({ benefitId: 'bridge-invest-altshuler' });
  check(replay.status === 200 && replay.body.alreadyRedeemed === true && bal().coins === 500 && alerts.length === 1,
    'bridge: replay → alreadyRedeemed, no second deduction or alert', replay);
  const poor = await call({ benefitId: 'bridge-invest-inter-il' });
  check(poor.status === 409 && poor.body.code === 'INSUFFICIENT_COINS' && bal().coins === 500,
    'bridge: insufficient SERVER balance → 409, nothing deducted', poor);
  // The client can't claim a lower price or a different balance.
  const cheat = await call({ benefitId: 'bridge-invest-inter-il', costCoins: 1, coins: 999999 });
  check(cheat.status === 409, 'bridge: client-sent cost / balance ignored', cheat.status);
  const cover = await call({ benefitId: 'bridge-insurance-cover' });
  check(cover.status === 200 && bal().coins === 0, 'bridge: 500-coin benefit with exactly 500', cover.body);
  check((await call({ benefitId: 'bridge-bank-partner-slot' })).status === 404, 'bridge: placeholder benefit → 404');
  check((await call({ benefitId: '__proto__' })).status === 404, 'bridge: prototype key → 404');
  check((await call({ benefitId: 'constructor' })).status === 404, 'bridge: constructor key → 404');
  check((await call({ benefitId: 'bridge-insurance-cover' }, null)).status === 401, 'bridge: no session → 401');
  check((await call({ benefitId: 'bridge-insurance-cover' }, 'Bearer garbage')).status === 401, 'bridge: bad session → 401');
  const other = await call({ benefitId: 'bridge-insurance-cover', authId: 'victim@example.com' });
  check(other.status === 403, 'bridge: body authId naming another user → 403', other.status);
  const unavailable = await handleBridgeRedeem(
    { authorization: auth, body: { benefitId: 'bridge-insurance-cover' }, clientIp: '1.2.3.4' },
    { ...bdeps, store: new MemoryBridgeStore(store, true) },
  );
  check(unavailable.status === 503 && unavailable.body.code === 'REDEEM_UNAVAILABLE', 'bridge: before 0018 → 503', unavailable);

  // Server table matches the app's benefits; the labels cover exactly the catalogue.
  const appSide = Object.fromEntries(
    BRIDGE_BENEFITS.filter((b) => b.isAvailable && !b.partnerAdSlot && b.costCoins > 0)
      .map((b) => [b.id, { costCoins: b.costCoins, partnerUrl: b.partnerUrl }]),
  );
  check(JSON.stringify(appSide) === JSON.stringify(BRIDGE_REDEEMABLE), 'bridge: server price table == src/features/the-bridge/bridgeData.ts', { appSide });
  check(JSON.stringify(Object.keys(BRIDGE_BENEFIT_LABELS).sort()) === JSON.stringify(Object.keys(BRIDGE_REDEEMABLE).sort()),
    'bridge alert: a label for every redeemable benefit, nothing else');
  check(isRedeemableBenefit('bridge-insurance-cover') && !isRedeemableBenefit('x1') && !isRedeemableBenefit('__proto__')
    && !isRedeemableBenefit('constructor') && !isRedeemableBenefit('toString') && !isRedeemableBenefit(undefined),
  'bridge: isRedeemableBenefit = own catalogue keys only');

  const html = buildBridgeAlertHtml(
    { action: 'redeem', benefitId: 'bridge-insurance-cover', userEmail: '<img src=x onerror=alert(1)>', platform: '"><b>', verified: false },
    'now',
  );
  check(!html.includes('<img') && html.includes('&lt;img') && !html.includes('"><b>'), 'bridge alert: client values HTML-escaped');
  check(bridgeAlertSubject('bridge-insurance-cover').endsWith(BRIDGE_BENEFIT_LABELS['bridge-insurance-cover'])
    && !bridgeAlertSubject('<script>made-up</script>').includes('made-up') && !bridgeAlertSubject('constructor').includes('function')
    && !bridgeAlertSubject('bridge-insurance-cover').includes('—'),
  'bridge alert: the subject carries catalogue labels only (never a client-chosen id), no em-dash');
  const protoHtml = buildBridgeAlertHtml({ action: 'redeem', benefitId: 'constructor', userEmail: null, platform: null, verified: false }, 'now');
  check(protoHtml.includes('constructor') && !protoHtml.includes('[native code]'), 'bridge alert: a prototype-key id renders as text, never Object.prototype');

  // track-click (old bundles' report, no session): a made-up benefit id for
  // 'redeem' is answered ok WITHOUT touching the database or emailing. (No
  // DATABASE_URL here: a database call would fail and answer 500.)
  const track = (body: unknown) =>
    trackClickPost(new Request('https://example.test/api/bridge/track-click', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' }, body: JSON.stringify(body),
    }));
  const statuses: number[] = [];
  for (const benefitId of ['x1', 'x2', '__proto__', 'constructor', 'bridge-bank-partner-slot']) {
    const res = await track({ action: 'redeem', benefitId, authId: 'alice@example.com', userEmail: 'alice@example.com' });
    statuses.push(res.status);
    const body = (await res.json()) as Record<string, unknown>;
    if (body.ok !== true) statuses.push(-1);
  }
  check(statuses.every((s) => s === 200), "track-click: 'redeem' for a benefit outside the server catalogue → 200 ok, no row, no email (no database reached)", statuses);
}

// ─── 14. Subscription sync ───────────────────────────────────────────────────

class MemorySubStore implements SubscriptionStore {
  rows = new Map<string, SubscriptionReadRow>();
  writes: Array<Record<string, unknown>> = [];
  async read(userId: string) {
    const r = this.rows.get(userId);
    return r ? { ...r } : null;
  }
  async write(userId: string, f: { isPro: boolean; proExpiresAt: string | null; proSource?: string | null }) {
    const r = this.rows.get(userId);
    if (!r) return null;
    this.writes.push({ userId, ...f });
    r.isPro = f.isPro;
    r.proExpiresAt = f.proExpiresAt;
    if (f.proSource !== undefined) r.proSource = f.proSource;
    return { isPro: r.isPro, proExpiresAt: r.proExpiresAt, proSource: r.proSource };
  }
}

{
  const NOW = T0;
  const future = new Date(NOW + 30 * DAY_MS).toISOString();
  const past = new Date(NOW - DAY_MS).toISOString();
  const mk = (row: Partial<SubscriptionReadRow>, verdict: RcVerdict = { status: 'unavailable', reason: 'no key' }) => {
    const s = new MemorySubStore();
    s.rows.set(ALICE, { isPro: false, proExpiresAt: null, proSource: null, email: 'alice@example.com', ...row });
    const sleeps: number[] = [];
    const verifyCalls: string[][] = [];
    const d = {
      store: s,
      verify: async (ids: string[]) => { verifyCalls.push(ids); return verdict; },
      now: () => NOW,
      sleep: async (ms: number) => { sleeps.push(ms); },
      log: () => {},
    };
    return { s, d, sleeps, verifyCalls };
  };
  const sub = (r: { status: number; body: Record<string, unknown> }) => r.body.subscription as SubscriptionRow | null;

  // Server grant (promotional / manual / gift) can't be removed by the device.
  for (const source of ['promotional', 'manual', 'gift']) {
    const { s, d } = mk({ isPro: true, proExpiresAt: future, proSource: source });
    const r = await handleSubscriptionPost(ALICE, { isPro: false, proExpiresAt: null }, d);
    check(sub(r)?.isPro === true && s.writes.length === 0 && s.rows.get(ALICE)!.proExpiresAt === future,
      `subscription: client "not Pro" can't remove a ${source} grant`, r);
  }
  {
    const { s, d } = mk({ isPro: true, proExpiresAt: future, proSource: 'promotional' });
    const r = await handleSubscriptionPost(ALICE, { isPro: true, proExpiresAt: new Date(NOW + DAY_MS).toISOString() }, d);
    check(sub(r)?.proExpiresAt === future && s.writes.length === 0, 'subscription: client can\'t shorten a server grant', r);
  }
  {
    const { s, d } = mk({ isPro: true, proExpiresAt: future, proSource: 'store' });
    const r = await handleSubscriptionPost(ALICE, { isPro: true, proExpiresAt: '2099-01-01T00:00:00Z' }, d);
    check(sub(r)?.proExpiresAt === future && s.writes.length === 0, 'subscription: client can\'t extend an active store Pro', r);
  }
  {
    const { s, d } = mk({ isPro: true, proExpiresAt: future, proSource: 'store' });
    const r = await handleSubscriptionPost(ALICE, { isPro: false, proExpiresAt: null }, d);
    check(sub(r)?.isPro === false && s.writes.length === 1, 'subscription: store Pro still follows the device\'s "not Pro" (as before)', r);
  }
  {
    const { s, d } = mk({ isPro: true, proExpiresAt: past, proSource: 'promotional' });
    const r = await handleSubscriptionPost(ALICE, { isPro: false }, d);
    check(sub(r)?.isPro === false && s.writes.length === 1, 'subscription: an EXPIRED server grant is not protected', r);
  }
  {
    const { s, d, sleeps } = mk({});
    const r = await handleSubscriptionPost(ALICE, { isPro: true, proExpiresAt: future }, d);
    check(sub(r)?.isPro === false && s.writes.length === 0 && sleeps.length === 3,
      'subscription: self-upgrade with no purchase refused (no key: waits for the webhook, then no)', { r, sleeps });
  }
  {
    const { s, d, verifyCalls } = mk({}, { status: 'inactive' });
    const r = await handleSubscriptionPost(ALICE, { isPro: true }, d);
    check(sub(r)?.isPro === false && s.writes.length === 0, 'subscription: RevenueCat says not Pro → refused', r);
    check(JSON.stringify(verifyCalls[0]) === JSON.stringify([ALICE, 'alice@example.com']), 'subscription: RevenueCat asked by profile id, then email', verifyCalls);
  }
  {
    const { s, d } = mk({}, { status: 'active', expiresAt: future, source: 'store' });
    const r = await handleSubscriptionPost(ALICE, { isPro: true, proExpiresAt: '2099-01-01T00:00:00Z' }, d);
    check(sub(r)?.isPro === true && sub(r)?.proExpiresAt === future && sub(r)?.proSource === 'store' && s.writes.length === 1,
      'subscription: honest purchaser, app POST first, RevenueCat confirms → Pro with RevenueCat\'s expiry', r);
  }
  {
    const { s, d } = mk({});
    let n = 0;
    d.sleep = async () => {
      if (++n === 2) Object.assign(s.rows.get(ALICE)!, { isPro: true, proExpiresAt: future, proSource: 'store' });
    };
    const r = await handleSubscriptionPost(ALICE, { isPro: true }, d);
    check(sub(r)?.isPro === true && s.writes.length === 0, 'subscription: honest purchaser, no key, webhook lands while waiting → Pro', r);
  }
  {
    const { s, d, verifyCalls } = mk({ isPro: true, proExpiresAt: future, proSource: 'store' });
    const r = await handleSubscriptionPost(ALICE, { isPro: true }, d);
    check(sub(r)?.isPro === true && verifyCalls.length === 0 && s.writes.length === 0, 'subscription: webhook first → already Pro, no lookup', r);
  }
  {
    const { d } = mk({});
    const r = await handleSubscriptionPost(ALICE, { isPro: 'yes' }, d);
    check(r.status === 400, 'subscription: non-boolean isPro → 400 as before');
    const ghost = await handleSubscriptionPost(GHOST, { isPro: true }, d);
    check(ghost.status === 200 && sub(ghost) === null, 'subscription: no profile → { subscription: null } as before');
  }

  // RevenueCat answer parsing.
  const nowIso = (ms: number) => new Date(NOW + ms).toISOString();
  const ent = (e: Record<string, unknown>) => ({ subscriber: { entitlements: { 'FinPlay Pro': e } } });
  check(parseRcSubscriber(ent({ expires_date: nowIso(DAY_MS), product_identifier: 'finplay_pro_monthly' }), NOW).status === 'active', 'rc: future expiry → active');
  check(parseRcSubscriber(ent({ expires_date: nowIso(-DAY_MS) }), NOW).status === 'inactive', 'rc: past expiry → inactive');
  check(parseRcSubscriber(ent({ expires_date: nowIso(-DAY_MS), grace_period_expires_date: nowIso(DAY_MS) }), NOW).status === 'active', 'rc: grace period → active');
  check(parseRcSubscriber(ent({ expires_date: null }), NOW).status === 'active', 'rc: lifetime → active');
  const promo = parseRcSubscriber(ent({ expires_date: nowIso(DAY_MS), product_identifier: 'rc_promo_FinPlay Pro_monthly' }), NOW);
  check(promo.status === 'active' && promo.source === 'promotional', 'rc: rc_promo product → promotional');
  check(parseRcSubscriber({ subscriber: { entitlements: {} } }, NOW).status === 'inactive', 'rc: no entitlement → inactive');
  check(parseRcSubscriber({ code: 7225 }, NOW).status === 'unavailable', 'rc: error body → unavailable');

  // No key: 'unavailable', and console.error ONCE per instance.
  resetRevenueCatVerifyMemory();
  const errors: string[] = [];
  const origError = console.error;
  console.error = (...a: unknown[]) => { errors.push(a.map(String).join(' ')); };
  const noKey1 = await verifyProWithRevenueCat([ALICE], { keys: [] });
  const noKey2 = await verifyProWithRevenueCat([ALICE], { keys: [] });
  console.error = origError;
  check(noKey1.status === 'unavailable' && noKey2.status === 'unavailable' && errors.filter((e) => e.includes('no RevenueCat API key')).length === 1,
    'rc: no key configured → unavailable (fail safe), console.error once per instance', errors);

  const http500 = await verifyProWithRevenueCat([ALICE], {
    keys: [{ key: 'sk_test_500' }],
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
  });
  check(http500.status === 'unavailable', 'rc: HTTP error → unavailable');
  const seen: string[] = [];
  const okFetch = await verifyProWithRevenueCat([ALICE, 'a@x.com'], {
    keys: [{ key: 'sk_test' }],
    nowMs: NOW,
    fetchImpl: async (url) => {
      seen.push(url);
      return { ok: true, status: 200, json: async () => (url.includes('a%40x.com') ? ent({ expires_date: nowIso(DAY_MS) }) : { subscriber: { entitlements: {} } }) };
    },
  });
  check(okFetch.status === 'active' && seen.length === 2, 'rc: falls through to the email app_user_id', { okFetch, seen });

  // A key RevenueCat refuses (401/403) is skipped for 10 minutes (E5b).
  resetRevenueCatVerifyMemory();
  const used: string[] = [];
  const keys = [{ key: 'sk_refused', label: 'secret' }, { key: 'appl_ok', platform: 'ios' as const, label: 'apple public' }];
  const fetchRefusing = async (_url: string, init: { headers: Record<string, string> }) => {
    used.push(init.headers.Authorization);
    return init.headers.Authorization === 'Bearer sk_refused'
      ? { ok: false, status: 401, json: async () => ({ code: 7225 }) }
      : { ok: true, status: 200, json: async () => ent({ expires_date: nowIso(DAY_MS) }) };
  };
  console.error = () => {};
  const k1 = await verifyProWithRevenueCat([ALICE], { keys, nowMs: NOW, fetchImpl: fetchRefusing });
  const afterFirst = used.length;
  const k2 = await verifyProWithRevenueCat([ALICE, 'a@x.com'], { keys, nowMs: NOW + 60_000, fetchImpl: fetchRefusing });
  const afterSecond = used.length;
  const k3 = await verifyProWithRevenueCat([ALICE], { keys, nowMs: NOW + RC_REFUSED_KEY_SKIP_MS + 1, fetchImpl: fetchRefusing });
  console.error = origError;
  check(k1.status === 'active' && afterFirst === 2, 'rc: a refused key (401) is tried once, then the next key answers', used);
  check(k2.status === 'active' && afterSecond - afterFirst === 1 && used[afterFirst] === 'Bearer appl_ok',
    'rc: within 10 minutes the refused key is skipped (no wasted round trip)', used.slice(afterFirst));
  check(k3.status === 'active' && used.length - afterSecond === 2 && used[afterSecond] === 'Bearer sk_refused',
    'rc: after 10 minutes the refused key is tried again', used.slice(afterSecond));
  resetRevenueCatVerifyMemory();
  let calls403 = 0;
  console.error = () => {};
  const only403 = { keys: [{ key: 'sk_403' }], nowMs: NOW, fetchImpl: async () => { calls403++; return { ok: false, status: 403, json: async () => ({}) }; } };
  const f1 = await verifyProWithRevenueCat([ALICE], only403);
  const f2 = await verifyProWithRevenueCat([ALICE], only403);
  console.error = origError;
  check(f1.status === 'unavailable' && f2.status === 'unavailable' && calls403 === 1,
    'rc: every key refused (403) → unavailable without another call for 10 minutes', { f1, f2, calls403 });
  resetRevenueCatVerifyMemory();
  let calls5xx = 0;
  const flaky = { keys: [{ key: 'sk_5xx' }], nowMs: NOW, fetchImpl: async () => { calls5xx++; return { ok: false, status: 503, json: async () => ({}) }; } };
  await verifyProWithRevenueCat([ALICE], flaky);
  await verifyProWithRevenueCat([ALICE], flaky);
  check(calls5xx === 2, 'rc: a 5xx is not a refused key (tried again next time)', calls5xx);
  resetRevenueCatVerifyMemory();
}

// ─── 15. RevenueCat webhook (api/_shared/revenueCatWebhook.ts) ───────────────

interface WebhookProfile { gems: number; isPro: boolean; proExpiresAt: string | null; proSource: string | null }

class MemoryWebhookWorld {
  profiles = new Map<string, WebhookProfile>();
  emails = new Map<string, string>(); // email → profile id
  ledger = new Map<string, { userId: string | null; appUserId: string | null; gems: number; productId: string; poolCoins: number }>();
  alerts: UnmatchedPurchaseAlert[] = [];
  logs: Array<{ level: string; line: Record<string, unknown> }> = [];
  captures: Array<{ event: string; distinctId: string; props: Record<string, unknown> }> = [];
  credits: PurchaseCreditArgs[] = [];
  graceCalls: Array<[string, string]> = [];
  expireCalls: Array<[string, string | null]> = [];
  resolveCalls = 0;
  busyLeft = 0;
  vanishOnCredit = false;
  throwOnCredit: Error | null = null;

  add(id: string, p: Partial<WebhookProfile> = {}, email?: string): void {
    this.profiles.set(id, { gems: 0, isPro: false, proExpiresAt: null, proSource: null, ...p });
    if (email) this.emails.set(email, id);
  }
  deps(env: Record<string, string | undefined> = {}): RcWebhookDeps {
    return {
      env,
      now: () => T0,
      resolveProfileId: async (keys) => {
        this.resolveCalls++;
        for (const k of keys) {
          if (this.profiles.has(k)) return k;
          const byEmail = this.emails.get(k);
          if (byEmail) return byEmail;
        }
        return null;
      },
      creditPurchase: async (args) => {
        this.credits.push(args);
        if (this.throwOnCredit) throw this.throwOnCredit;
        if (this.busyLeft > 0) { this.busyLeft--; return 'busy'; }
        if (this.vanishOnCredit) return 'no_user';
        if (args.eventKey && this.ledger.has(args.eventKey)) return 'duplicate';
        if (args.eventKey) this.ledger.set(args.eventKey, { userId: args.userId, appUserId: null, gems: args.gems, productId: args.productId, poolCoins: args.poolCoins });
        this.profiles.get(args.userId)!.gems += args.gems;
        return 'credited';
      },
      recordUnmatchedPurchase: async (args: UnmatchedPurchaseArgs) => {
        if (this.ledger.has(args.eventKey)) return 'duplicate';
        this.ledger.set(args.eventKey, { userId: null, appUserId: args.appUserId, gems: args.gems, productId: args.productId, poolCoins: args.poolCoins });
        return 'recorded';
      },
      grantPro: async (userId, f) => { Object.assign(this.profiles.get(userId)!, { isPro: true, proExpiresAt: f.expiresAt, proSource: f.proSource }); },
      extendProForGrace: async (userId, grace) => {
        this.graceCalls.push([userId, grace]);
        const p = this.profiles.get(userId)!;
        if (p.proExpiresAt !== null && Date.parse(grace) > Date.parse(p.proExpiresAt)) p.proExpiresAt = grace;
      },
      expirePro: async (userId, exp) => {
        this.expireCalls.push([userId, exp]);
        const p = this.profiles.get(userId)!;
        if (p.proExpiresAt !== null && exp !== null && Date.parse(p.proExpiresAt) > Date.parse(exp)) return 'skipped';
        p.isPro = false;
        return 'revoked';
      },
      capture: async (event, distinctId, props) => { this.captures.push({ event, distinctId, props }); },
      alertUnmatchedPurchase: (a) => { this.alerts.push(a); },
      log: (level, line) => { this.logs.push({ level, line }); },
    };
  }
}

{
  const BUYER = '33333333-3333-4333-8333-333333333333';
  const deliver = (w: MemoryWebhookWorld, event: Record<string, unknown>, env: Record<string, string | undefined> = {}, authorization: string | null = null) =>
    handleRevenueCatWebhook({ authorization, body: { api_version: '1.0', event } }, w.deps(env));
  const purchase = (over: Record<string, unknown> = {}) => ({
    type: 'NON_RENEWING_PURCHASE', id: 'evt-1', app_user_id: BUYER, product_id: 'finplay_gems_500', purchased_at_ms: T0, environment: 'PRODUCTION', ...over,
  });

  // Authentication.
  {
    const w = new MemoryWebhookWorld();
    w.add(BUYER);
    const r = await deliver(w, purchase(), { VERCEL_ENV: 'production' });
    check(r.status === 500 && r.body.error === 'Webhook not configured' && w.resolveCalls === 0 && w.credits.length === 0 && w.profiles.get(BUYER)!.gems === 0
      && w.logs.some((l) => l.level === 'error'),
    'webhook auth: production with NO secret → 500, nothing done (fail closed, RevenueCat retries), console.error', r);
    const empty = await deliver(w, purchase(), { VERCEL_ENV: 'production', RC_WEBHOOK_SECRET: '  ' });
    check(empty.status === 500, 'webhook auth: a blank secret counts as none (production refuses)', empty);
    const preview = await deliver(w, purchase(), { VERCEL_ENV: 'preview' });
    check(preview.status === 200 && w.profiles.get(BUYER)!.gems === 500, 'webhook auth: outside production with no secret → accepted as before', preview);
  }
  {
    const w = new MemoryWebhookWorld();
    w.add(BUYER);
    const env = { VERCEL_ENV: 'production', RC_WEBHOOK_SECRET: 's3cret' };
    const results = [
      await deliver(w, purchase({ id: 'a1' }), env, null),
      await deliver(w, purchase({ id: 'a2' }), env, 'Bearer wrong'),
      await deliver(w, purchase({ id: 'a3' }), env, 's3cret-but-longer'),
      await deliver(w, purchase({ id: 'a4' }), env, 'bearer s3cret'),
    ];
    check(results.every((r) => r.status === 401) && w.credits.length === 0 && w.resolveCalls === 0,
      'webhook auth: missing / wrong / longer / wrong-case header → 401, nothing done', results.map((r) => r.status));
    const raw = await deliver(w, purchase({ id: 'b1' }), env, 's3cret');
    const bearer = await deliver(w, purchase({ id: 'b2' }), env, 'Bearer s3cret');
    check(raw.status === 200 && bearer.status === 200 && w.profiles.get(BUYER)!.gems === 1000, 'webhook auth: the secret raw or as "Bearer <secret>" → accepted', [raw, bearer]);
    const alias = await deliver(w, purchase({ id: 'b3' }), { VERCEL_ENV: 'production', RC_WEBHOOK_SECRET: '', EXPO_PUBLIC_RC_WEBHOOK_SECRET: 'alias' }, 'Bearer alias');
    const aliasWrong = await deliver(w, purchase({ id: 'b4' }), { RC_WEBHOOK_SECRET: '', EXPO_PUBLIC_RC_WEBHOOK_SECRET: 'alias' }, null);
    check(alias.status === 200 && aliasWrong.status === 401, 'webhook auth: an empty RC_WEBHOOK_SECRET falls through to the EXPO_PUBLIC alias (never disables the check)', [alias, aliasWrong]);
  }

  // Credit, duplicate, product table.
  {
    const w = new MemoryWebhookWorld();
    w.add(BUYER, { gems: 10 });
    const a = await deliver(w, purchase());
    check(a.status === 200 && a.body.message === 'Added 500 gems' && w.profiles.get(BUYER)!.gems === 510 && w.ledger.get('evt-1')?.userId === BUYER,
      'webhook: purchase → 200 "Added 500 gems", credited once with a ledger row', a);
    const again = await deliver(w, purchase());
    check(again.status === 200 && again.body.message === 'Already credited' && w.profiles.get(BUYER)!.gems === 510, 'webhook: the same event again → "Already credited", nothing credited', again);
    const android = await deliver(w, purchase({ id: 'evt-android', product_id: 'finplay_gems_1200:one-time' }));
    check(android.body.message === 'Added 1200 gems' && w.profiles.get(BUYER)!.gems === 1710, 'webhook: Google Play "<product>:<option>" id → the product', android);
    const pack = getTodaysStarterPack(new Date(T0));
    await deliver(w, purchase({ id: 'evt-pack', product_id: STARTER_PACK_PRODUCT_ID }));
    const packCredit = w.credits[w.credits.length - 1];
    check(packCredit.gems === pack.gems && packCredit.poolCoins === pack.coins && packCredit.eventKey === 'evt-pack',
      'webhook: the starter pack credits its gems and funds the pool with its coins (one credit call)', packCredit);
    const tx = await deliver(w, purchase({ id: undefined, transaction_id: 'GPA.1234' }));
    check(tx.status === 200 && w.credits[w.credits.length - 1].eventKey === 'NON_RENEWING_PURCHASE:GPA.1234', 'webhook: no event id → keyed by type + transaction id', w.credits[w.credits.length - 1]);
  }

  // Not credited → recorded + one owner alert, 200.
  {
    const w = new MemoryWebhookWorld();
    w.add(BUYER, { gems: 10 });
    const unknown = await deliver(w, purchase({ id: 'evt-unknown', product_id: 'finplay_gems_20000' }));
    const row = w.ledger.get('evt-unknown');
    check(unknown.status === 200 && unknown.body.message === 'Unknown product' && w.profiles.get(BUYER)!.gems === 10
      && row?.userId === null && row.appUserId === BUYER && row.gems === 0 && row.productId === 'finplay_gems_20000',
    'webhook: unknown product (finplay_gems_20000 used to credit 20,000) → nothing credited, RECORDED (user_id NULL, raw app_user_id, 0 gems), 200', { unknown, row });
    check(w.alerts.length === 1 && w.alerts[0].reason === 'unknown_product' && w.alerts[0].eventId === 'evt-unknown' && w.alerts[0].gems === 0,
      'webhook: unknown product → one owner alert (product, gems, event id)', w.alerts);
    await deliver(w, purchase({ id: 'evt-unknown', product_id: 'finplay_gems_20000' }));
    check(w.alerts.length === 1 && w.ledger.size === 1, 'webhook: a redelivered unrecognised event → no second row, no second email', w.alerts.length);

    const email = 'buyer.legacy@example.com';
    const nobody = await deliver(w, purchase({ id: 'evt-nobody', app_user_id: email, product_id: 'finplay_gems_2500' }));
    const nrow = w.ledger.get('evt-nobody');
    check(nobody.status === 200 && nobody.body.message === 'No matching user' && nrow?.userId === null && nrow.appUserId === email && nrow.gems === 2500,
      'webhook: no matching account → recorded with the raw app_user_id and the 2,500 gems it is worth, 200', { nobody, nrow });
    const lastAlert = w.alerts[w.alerts.length - 1];
    check(w.alerts.length === 2 && lastAlert.reason === 'no_matching_account' && lastAlert.gems === 2500 && lastAlert.environment === 'PRODUCTION'
      && !JSON.stringify(lastAlert).includes(email) && !JSON.stringify(lastAlert).includes('@'),
    'webhook: the owner alert carries product, gems and event id, never the app_user_id or an address', lastAlert);
    const anon = await deliver(w, purchase({ id: 'evt-anon', app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc'], product_id: 'finplay_gems_80' }));
    check(anon.body.message === 'No matching user' && w.ledger.get('evt-anon')?.appUserId === '$RCAnonymousID:abc' && w.ledger.get('evt-anon')?.gems === 80,
      'webhook: an anonymous RevenueCat id → recorded (was: 200 "No matching user" and no trace)', w.ledger.get('evt-anon'));
    const viaAlias = await deliver(w, purchase({ id: 'evt-alias', app_user_id: '$RCAnonymousID:def', aliases: ['$RCAnonymousID:def', BUYER], product_id: 'finplay_gems_80' }));
    check(viaAlias.body.message === 'Added 80 gems', 'webhook: an anonymous id aliased to the account → credited', viaAlias);
    const noKey = await deliver(w, purchase({ id: undefined, transaction_id: undefined, app_user_id: email, product_id: 'finplay_gems_80' }));
    const noKeyAgain = await deliver(w, purchase({ id: undefined, transaction_id: undefined, app_user_id: email, product_id: 'finplay_gems_80' }));
    check(noKey.status === 200 && noKeyAgain.status === 200 && w.alerts.length === 4,
      'webhook: an unmatched event with no id at all gets a stable key (a redelivery stays one row, one email)', w.alerts.length);
    const allLogs = JSON.stringify(w.logs);
    check(!allLogs.includes(email) && !allLogs.includes('$RCAnonymousID') && w.logs.some((l) => typeof l.line.appUser === 'string'),
      'webhook logs: never the raw app_user_id (a short hash instead)', w.logs.slice(-4));

    w.vanishOnCredit = true;
    const vanished = await deliver(w, purchase({ id: 'evt-vanished' }));
    check(vanished.body.message === 'No matching user' && w.ledger.get('evt-vanished')?.userId === null, 'webhook: the profile vanished before the credit → recorded, not lost', vanished);
  }

  // Busy (compare-and-swap exhausted) → 5xx, the retry credits once.
  {
    const w = new MemoryWebhookWorld();
    w.add(BUYER);
    w.busyLeft = 1;
    const pack = getTodaysStarterPack(new Date(T0));
    const busy = await deliver(w, purchase({ id: 'evt-busy', product_id: STARTER_PACK_PRODUCT_ID }));
    check(busy.status === 503 && w.profiles.get(BUYER)!.gems === 0 && !w.ledger.has('evt-busy'),
      'webhook: guard busy → 503 (RevenueCat retries), nothing written', busy);
    const retry = await deliver(w, purchase({ id: 'evt-busy', product_id: STARTER_PACK_PRODUCT_ID }));
    const retry2 = await deliver(w, purchase({ id: 'evt-busy', product_id: STARTER_PACK_PRODUCT_ID }));
    check(retry.status === 200 && retry2.body.message === 'Already credited' && w.profiles.get(BUYER)!.gems === pack.gems,
      'webhook: the retry credits once, a later redelivery nothing', [retry.body, retry2.body]);
  }

  // Errors: a generic 500, never the message (drizzle puts SQL and parameters in it).
  {
    const w = new MemoryWebhookWorld();
    w.add(BUYER);
    const err = Object.assign(new Error('Failed query: UPDATE user_profiles SET gems = gems + $1 WHERE id = $2\nparams: 500,buyer@example.com'), { cause: { code: '57014' } });
    w.throwOnCredit = err;
    const r = await deliver(w, purchase());
    check(r.status === 500 && JSON.stringify(r.body) === '{"error":"Internal server error"}', 'webhook: a failing query → 500 with a generic body (no SQL, no parameters)', r);
    check(w.logs.some((l) => l.level === 'error' && l.line.code === '57014') && !JSON.stringify(w.logs).includes('Failed query') && !JSON.stringify(w.logs).includes('@'),
      'webhook: the error log carries the SQLSTATE only', w.logs);
    const bad = await deliver(w, { type: 'INITIAL_PURCHASE' });
    const bad2 = await handleRevenueCatWebhook({ authorization: null, body: 'nope' }, w.deps());
    check(bad.status === 400 && bad2.status === 400, 'webhook: no app_user_id / not an object → 400 Invalid payload (as before)');
  }

  // Pro events.
  {
    const w = new MemoryWebhookWorld();
    const PRO = '44444444-4444-4444-8444-444444444444';
    const periodEnd = Date.UTC(2026, 11, 20);
    w.add(PRO);
    const sub = (over: Record<string, unknown>) => ({
      id: `evt-${Math.random()}`, app_user_id: PRO, entitlement_ids: ['FinPlay Pro'], product_id: 'finplay_pro_monthly',
      purchased_at_ms: T0, expiration_at_ms: periodEnd, ...over,
    });
    await deliver(w, sub({ type: 'INITIAL_PURCHASE', period_type: 'TRIAL' }));
    const p = w.profiles.get(PRO)!;
    check(p.isPro && p.proExpiresAt === new Date(periodEnd).toISOString() && p.proSource === 'store' && w.captures[0]?.event === 'subscription_purchased',
      'webhook Pro: INITIAL_PURCHASE → Pro with the event\'s expiry, source store, captured', { p, captures: w.captures });
    const promoUser = '55555555-5555-4555-8555-555555555555';
    w.add(promoUser);
    await deliver(w, sub({ type: 'INITIAL_PURCHASE', app_user_id: promoUser, period_type: 'PROMOTIONAL' }));
    check(w.profiles.get(promoUser)!.proSource === 'promotional', 'webhook Pro: PROMOTIONAL → source promotional');

    const grace = periodEnd + 16 * DAY_MS;
    const bi = await deliver(w, sub({ type: 'BILLING_ISSUE', grace_period_expiration_at_ms: grace }));
    check(bi.status === 200 && p.isPro === true && p.proExpiresAt === new Date(grace).toISOString() && w.expireCalls.length === 0
      && w.captures.some((c) => c.event === 'subscription_billing_issue'),
    'webhook Pro: BILLING_ISSUE keeps Pro (grace period) and moves the expiry to the grace end; captured', { p, graceCalls: w.graceCalls });
    const bi2 = await deliver(w, sub({ type: 'BILLING_ISSUE' }));
    check(bi2.status === 200 && p.isPro === true && w.graceCalls.length === 1, 'webhook Pro: BILLING_ISSUE without a grace period → Pro untouched, nothing written');

    // Renewed meanwhile (stored expiry later than the event's): a late EXPIRATION is stale.
    p.proExpiresAt = new Date(periodEnd + 30 * DAY_MS).toISOString();
    const stale = await deliver(w, sub({ type: 'EXPIRATION', expiration_at_ms: periodEnd }));
    check(stale.status === 200 && p.isPro === true && w.logs.some((l) => l.line.outcome === 'expiration_skipped_stale'),
      'webhook Pro: an EXPIRATION older than the stored expiry (stale redelivery) → skipped, Pro stays', p);
    const real = await deliver(w, sub({ type: 'EXPIRATION', expiration_at_ms: periodEnd + 30 * DAY_MS }));
    check(real.status === 200 && p.isPro === false && w.captures.filter((c) => c.event === 'subscription_expired').length === 2,
      'webhook Pro: the current period\'s EXPIRATION → Pro removed', p);

    // A refund or an early revocation ends the period BEFORE the stored expiry:
    // not a stale redelivery, Pro is removed (as master did on every EXPIRATION).
    const yearly = '66666666-6666-4666-8666-666666666666';
    w.add(yearly, { isPro: true, proExpiresAt: new Date(T0 + 365 * DAY_MS).toISOString(), proSource: 'store' });
    const refund = await deliver(w, sub({ type: 'EXPIRATION', app_user_id: yearly, expiration_at_ms: T0, expiration_reason: 'CUSTOMER_SUPPORT' }));
    check(refund.status === 200 && w.profiles.get(yearly)!.isPro === false && w.expireCalls[w.expireCalls.length - 1][1] === null
      && w.logs.some((l) => l.line.outcome === 'expiration_revoked' && l.line.userId === yearly && l.line.reason === 'CUSTOMER_SUPPORT'),
    'webhook Pro: a refund (EXPIRATION, reason CUSTOMER_SUPPORT) a year before the stored expiry → Pro removed', w.profiles.get(yearly));
    const promoEarly = '77777777-7777-4777-8777-777777777777';
    w.add(promoEarly, { isPro: true, proExpiresAt: new Date(T0 + 30 * DAY_MS).toISOString(), proSource: 'promotional' });
    const revokedPromo = await deliver(w, sub({ type: 'EXPIRATION', app_user_id: promoEarly, expiration_at_ms: T0, expiration_reason: 'DEVELOPER_INITIATED' }));
    check(revokedPromo.status === 200 && w.profiles.get(promoEarly)!.isPro === false,
      'webhook Pro: a promotional grant revoked early (EXPIRATION, reason DEVELOPER_INITIATED) → Pro removed', w.profiles.get(promoEarly));
    const renewed = '88888888-8888-4888-8888-888888888888';
    w.add(renewed, { isPro: true, proExpiresAt: new Date(periodEnd + 30 * DAY_MS).toISOString(), proSource: 'store' });
    const staleUnsub = await deliver(w, sub({ type: 'EXPIRATION', app_user_id: renewed, expiration_at_ms: periodEnd, expiration_reason: 'UNSUBSCRIBE' }));
    check(staleUnsub.status === 200 && w.profiles.get(renewed)!.isPro === true && w.expireCalls[w.expireCalls.length - 1][1] === new Date(periodEnd).toISOString(),
      'webhook Pro: a natural end (reason UNSUBSCRIBE) older than the stored expiry is still a stale redelivery → skipped', w.profiles.get(renewed));
    const notPro = await deliver(w, { type: 'EXPIRATION', id: 'x', app_user_id: promoUser, entitlement_ids: ['Other'], expiration_at_ms: periodEnd });
    check(notPro.status === 200 && w.profiles.get(promoUser)!.isPro === true, 'webhook Pro: an event for another entitlement changes nothing');
    const cancel = await deliver(w, sub({ type: 'CANCELLATION', app_user_id: promoUser }));
    check(cancel.status === 200 && w.profiles.get(promoUser)!.isPro === true && w.captures.some((c) => c.event === 'subscription_cancelled'),
      'webhook Pro: CANCELLATION → analytics only, Pro untouched');
  }

  // The owner alert's HTML.
  const alertHtml = buildPurchaseAlertHtml({ reason: 'unknown_product', productId: '<b>x</b>', gems: 0, eventId: 'evt"1', environment: 'SANDBOX' }, 'now');
  check(!alertHtml.includes('<b>x</b>') && alertHtml.includes('&lt;b&gt;') && alertHtml.includes('evt&quot;1') && !alertHtml.includes('—')
    && purchaseAlertSubject({ reason: 'no_matching_account', productId: 'p', gems: 500, eventId: 'e', environment: null }).includes('500'),
  'purchase alert: values escaped, the subject carries only fixed text and the gem count, no em-dash');
}

// ─── Done ────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
// Explicit exit: the track-click route's rate limiter keeps a cleanup timer.
process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
