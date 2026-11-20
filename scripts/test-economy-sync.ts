// scripts/test-economy-sync.ts
// Run: npx tsx scripts/test-economy-sync.ts
//
// Exercises the real logic behind POST /api/sync/economy (economyGuard.ts),
// POST /api/bridge/redeem (bridgeRedeem.ts), POST /api/sync/subscription
// (subscriptionSync.ts, revenueCatVerify.ts) and the webhook's purchase
// mapping (iapCredit.ts) with in-memory stores, a fake clock and real session
// JWTs (test secret). No network, no database. The SQL behind the stores is in
// api/_shared/economyStores.ts.
import { signSession } from '../api/_shared/jwt';
import {
  ECONOMY_LIMITS,
  DAY_MS,
  HOUR_MS,
  GuardUnavailableError,
  applyGuard,
  handleEconomyPost,
  normalizeState,
  parseEconomyBody,
  resetGuardWarnings,
  runGuarded,
  type EconomyDeps,
  type EconomyRow,
  type EconomyStore,
  type GuardedWrite,
  type SimpleWrite,
} from '../api/_shared/economyGuard';
import { BRIDGE_REDEEMABLE, handleBridgeRedeem, type BridgeRedeemStore, type RedeemOutcome } from '../api/_shared/bridgeRedeem';
import { buildBridgeAlertHtml } from '../api/_shared/bridgeAlert';
import {
  handleSubscriptionPost,
  type RcVerdict,
  type SubscriptionReadRow,
  type SubscriptionRow,
  type SubscriptionStore,
} from '../api/_shared/subscriptionSync';
import { parseRcSubscriber, verifyProWithRevenueCat } from '../api/_shared/revenueCatVerify';
import { candidateUserKeys, creditForProduct } from '../api/_shared/iapCredit';
import { getTodaysStarterPack } from '../src/features/shop/starterPack';
import { BRIDGE_BENEFITS } from '../src/features/the-bridge/bridgeData';

const SECRET = 'test-only-secret-for-economy-sync-0123456789abcdef';
process.env.AUTH_JWT_SECRET = SECRET;

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
}

let store = new MemoryEconomyStore();
let logs: Array<Record<string, unknown>> = [];
function deps(): EconomyDeps {
  return { store, now: () => nowMs, sleep: async () => {}, log: (l) => logs.push(l) };
}
function reset(coins = 0, gems = 0): void {
  store = new MemoryEconomyStore();
  store.set(ALICE, { coins, gems, xp: 0 });
  logs = [];
  nowMs = T0;
  resetGuardWarnings();
}
const bal = () => store.rows.get(ALICE)!;
async function post(body: unknown, userId = ALICE) {
  return handleEconomyPost(userId, body, deps());
}
async function coins(n: number) { return post({ coinsDelta: n }); }
async function gems(n: number) { return post({ gemsDelta: n }); }

async function main(): Promise<void> {
// ─── 1. Today's client request shapes ────────────────────────────────────────
{
  reset(1000, 50);
  const r1 = await post({ xpDelta: 20 });
  check(r1.status === 200 && (r1.body.economy as EconomyRow).xp === 20, 'shape: { xpDelta } → 200 { ok, economy }', r1);
  const r2 = await post({ coinsDelta: 300 });
  check(r2.status === 200 && r2.body.ok === true && (r2.body.economy as EconomyRow).coins === 1300, 'shape: { coinsDelta: 300 } credited', r2);
  const r3 = await post({ gemsDelta: -30 });
  check((r3.body.economy as EconomyRow).gems === 20, 'shape: { gemsDelta: -30 } (streak repair) debited', r3);
  const r4 = await post({ virtualBalanceSet: 123.456 });
  check((r4.body.economy as EconomyRow).virtualBalance === '123.46', 'shape: { virtualBalanceSet } number set', r4);
  // The trading store sends the trade answer's STRING balance: ignored, as before.
  const r5 = await post({ virtualBalanceSet: '99.00' });
  check(r5.status === 400 && r5.body.error === 'No deltas provided', 'shape: string virtualBalanceSet ignored → same 400 as before', r5);
  const r6 = await post({});
  check(r6.status === 400 && r6.body.error === 'No deltas provided', 'shape: empty body → 400 as before', r6);
  const r7 = await post({ coinsDelta: 50 }, GHOST);
  check(r7.status === 200 && r7.body.economy === null, 'shape: no profile row → 200 { economy: null } as before', r7);
  const r8 = await post({ xpDelta: 5 }, GHOST);
  check(r8.status === 200 && r8.body.economy === null, 'shape: no profile row (xp only) → economy null', r8);
  const r9 = await post({ coinsDelta: 10, xpDelta: 5, gemsDelta: 1 });
  const e9 = r9.body.economy as EconomyRow;
  check(e9.coins === 1310 && e9.xp === 25 && e9.gems === 21, 'shape: several fields in one body', e9);
  check(logs.length === 0, 'honest shapes: no clamp log lines', logs);
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
  check((frac.body.economy as EconomyRow).coins === 1011, 'validation: fractions rounded', frac.body);
  check(bal().coins === 1011, 'validation: rejected requests changed nothing');
  const p = parseEconomyBody({ coinsDelta: -0 });
  check(!p.ok, 'validation: -0 is no delta');
}

// ─── 3. Floors: negative deltas never go below zero ──────────────────────────
{
  reset(100, 5);
  const r = await coins(-2500);
  check((r.body.economy as EconomyRow).coins === 0, 'floor: -2,500 with 100 coins → 0, not -2,400', r.body);
  const g = await gems(-30);
  check((g.body.economy as EconomyRow).gems === 0, 'floor: -30 gems with 5 → 0', g.body);
  check(logs.some((l) => (l.reasons as string[]).includes('coin_debit_floor')), 'floor: logged as coin_debit_floor');
  // Only the coins actually removed fund the returns pool.
  logs = [];
  const back = await coins(2500);
  check((back.body.economy as EconomyRow).coins === 2500 && logs.length === 0, 'floor: a later credit within budget is fine', back.body);
  // Pool got 100 (coins really debited) + 5 × 40 (gems really debited) = 300;
  // the +2,500 used those 300 and 2,200 of the free budget.
  const st = normalizeState(bal().guard, nowMs);
  const usedBudget = st.h.reduce((a, e) => a + e[1], 0);
  check(st.p.prev + st.p.cur === 0 && usedBudget === 2200, 'floor: pool funded only by what was really debited', { p: st.p, usedBudget });
}

// ─── 4. Honest heavy day (reward table) passes untouched ─────────────────────
{
  reset(0, 0);
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
  check(bal().coins === totalCoins, `heavy day: all ${totalCoins} earned coins credited`, { coins: bal().coins });
  check(bal().gems === totalGems, `heavy day: all ${totalGems} earned gems credited`, { gems: bal().gems });
  check(logs.length === 0, 'heavy day: no clamp / hold / drop', logs);
  check(totalCoins < ECONOMY_LIMITS.coinFreePer24h / 2 + 2000, 'heavy day uses about half the 24h coin budget (≈2× headroom)', totalCoins);

  // Same user also trades, exchanges and plays fantasy the same day.
  logs = [];
  const before = bal().coins!;
  await coins(-10000); // open a position
  await coins(12500); // close it +25%
  check(bal().coins === before + 2500 && logs.length === 0, 'heavy day: trading close (stake back from pool, profit from budget)', bal().coins);
}

// ─── 5. Gem → coin exchange, both arrival orders (today's two requests) ──────
{
  reset(0, 3000);
  await gems(-2500);
  await coins(100000);
  check(bal().coins === 100000 && bal().gems === 500 && logs.length === 0, 'exchange: gems first, then +100,000 coins → full credit', bal());

  reset(0, 3000);
  const first = await coins(100000); // the coin request wins the race
  check((first.body.economy as EconomyRow).coins === ECONOMY_LIMITS.coinFreePerRequest, 'exchange race: coins first → 25,000 now, rest held', first.body);
  const second = await gems(-2500);
  check((second.body.economy as EconomyRow).coins === 100000 && bal().gems === 500, 'exchange race: gem debit releases the held coins in its own answer', second.body);
  const st = normalizeState(bal().guard, nowMs);
  check(st.held === 0, 'exchange race: nothing left held', st);
  // The budget the race borrowed is not lost: pool leftover covers it.
  check(st.p.cur === 25000, 'exchange race: pool keeps the 25,000 the budget lent', st.p);

  // New client (OTA): one combined request.
  reset(0, 400);
  const one = await post({ gemsDelta: -350, coinsDelta: 10000 });
  check((one.body.economy as EconomyRow).coins === 10000 && (one.body.economy as EconomyRow).gems === 50 && logs.length === 0,
    'exchange (new client): one combined request', one.body);

  // Exchange without gems mints nothing beyond the free budget.
  reset(0, 0);
  await gems(-2500);
  await coins(100000);
  check(bal().coins === ECONOMY_LIMITS.coinFreePerRequest, 'exchange forged without gems: only the free budget', bal());
}

// ─── 6. Fantasy settlement a week later: stake from last week's pool ─────────
{
  reset(120000, 0);
  await coins(-100000); // 100k-tier entry
  nowMs += 7 * DAY_MS + HOUR_MS; // weekly settlement
  await coins(150000); // 150% payout
  check(bal().coins === 145000, 'fantasy: 150,000 payout → stake 100,000 from the pool + 25,000 (per-request budget) now', bal());
  await coins(100); // the next reward
  check(bal().coins === 170000 && normalizeState(bal().guard, nowMs).held === 100,
    'fantasy: the other 25,000 of profit arrive with the next reward (its own 100 waits: 24h budget used)', bal());
  nowMs += 61 * DAY_MS;
  const st = normalizeState(bal().guard, nowMs);
  check(st.p.prev === 0 && st.p.cur === 0, 'pool: entries expire after two buckets', st.p);

  // A position held for five weeks: its stake is still in the pool.
  reset(60000, 0);
  await coins(-50000);
  nowMs += 35 * DAY_MS;
  logs = [];
  await coins(55000);
  check(bal().coins === 65000 && logs.length === 0, 'pool: stake of a 5-week-old position still returns in full', bal());
}

// ─── 7. Over-cap / forged credits ────────────────────────────────────────────
{
  reset(0, 0);
  const r = await coins(1_000_000);
  check((r.body.economy as EconomyRow).coins === 25000 && r.status === 200, 'forged +1,000,000: 25,000 credited, 200 with server truth', r.body);
  check(logs.length === 1 && (logs[0].reasons as string[]).includes('coin_held') && logs[0].userId === ALICE
    && typeof logs[0].coinsRequested === 'number' && !JSON.stringify(logs[0]).includes('@'),
  'forged: one structured log line (uuid, source, amounts, no email)', logs);
  // Attacker steady state: 24h of requests can't exceed the 24h budget.
  for (let h = 0; h < 24; h++) {
    nowMs += HOUR_MS / 2;
    await coins(1_000_000);
  }
  const st = normalizeState(bal().guard, nowMs);
  const used = st.h.reduce((a, e) => a + e[1], 0);
  check(used <= ECONOMY_LIMITS.coinFreePer24h && bal().coins! <= ECONOMY_LIMITS.coinFreePer24h,
    'forged: ≤ 50,000 coins per rolling 24h however many requests', { coins: bal().coins, used });
  check(st.held <= ECONOMY_LIMITS.heldCoinsMax, 'forged: held amount bounded', st.held);
  nowMs += DAY_MS;
  await coins(0 + 1);
  check(bal().coins! <= 2 * ECONOMY_LIMITS.coinFreePer24h + 1, 'forged: next day again ≤ the daily budget', bal().coins);

  // Honest outlier (e.g. real-assets after 60 days away: 46,000 in one delta)
  // is delayed, never lost.
  reset(0, 0);
  await coins(46000);
  check(bal().coins === 25000, 'outlier: first 25,000 now', bal().coins);
  await coins(300);
  check(bal().coins === 46300, 'outlier: held remainder paid with the next reward', bal().coins);
  check(normalizeState(bal().guard, nowMs).held === 0, 'outlier: nothing left held');

  // Whale day above the 24h budget: carried over, not lost.
  reset(0, 0);
  for (let k = 0; k < 7; k++) await coins(10000);
  check(bal().coins === 50000, 'whale: 70,000 earned in a day → 50,000 today', bal().coins);
  nowMs += DAY_MS;
  await coins(100);
  check(bal().coins === 70100, 'whale: the held 20,000 arrive with the next reward after the window', bal().coins);
}

// ─── 8. Gems: no minting without a verified purchase ─────────────────────────
{
  reset(0, 0);
  const r = await gems(14000);
  check((r.body.economy as EconomyRow).gems === 0 && r.status === 200, 'gems: +14,000 (purchase-sized) dropped, 200', r.body);
  check((logs[0]?.reasons as string[] | undefined)?.includes('gem_purchase_size_dropped') === true, 'gems: logged gem_purchase_size_dropped', logs);
  const r2 = await gems(ECONOMY_LIMITS.gemFreePerRequest + 1);
  check((r2.body.economy as EconomyRow).gems === 0, 'gems: 51 dropped');
  for (let k = 0; k < 20; k++) await gems(50);
  check(bal().gems === ECONOMY_LIMITS.gemFreePer24h, 'gems: forged 50s capped at 200 per rolling 24h', bal().gems);
  nowMs += 23 * HOUR_MS;
  await gems(50);
  check(bal().gems === 200, 'gems: still capped 23h later (rolling window)', bal().gems);
  nowMs += 2 * HOUR_MS;
  await gems(50);
  check(bal().gems === 250, 'gems: budget back after 24h', bal().gems);

  // Purchases: today's client echoes the bought gems; the webhook credits them.
  reset(0, 100);
  await gems(500); // IAPModal echo (dropped)
  store.rows.get(ALICE)!.gems! += 500; // webhook credit (economyStores.creditPurchaseGems)
  check(bal().gems === 600, 'purchase 500 gems: credited exactly once (was twice: echo + webhook)', bal().gems);
}

// ─── 9. Starter pack (₪19.90): coins via the pool the webhook funds ──────────
{
  const pack = getTodaysStarterPack(new Date(T0));
  const credit = creditForProduct('finplay_starter_pack_19_90', T0, T0);
  check(!!credit && credit.gems === pack.gems && credit.poolCoins === pack.coins, 'starter pack: webhook maps to today\'s pack (not 90 gems)', credit);

  // Webhook first.
  reset(0, 0);
  store.rows.get(ALICE)!.gems! += credit!.gems;
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 0 }, deps(), 'webhook/revenuecat', { poolCredit: credit!.poolCoins });
  await coins(pack.coins);
  await gems(pack.gems);
  check(bal().coins === pack.coins && bal().gems === pack.gems, 'starter pack, webhook first: coins and gems once', bal());
  check(logs.length === 1 && JSON.stringify(logs[0].reasons) === '["gem_purchase_size_dropped"]',
    'starter pack: only the app\'s gem echo is logged (dropped), the coins pass', logs);
  check(normalizeState(bal().guard, nowMs).h.reduce((a, e) => a + e[1], 0) === 0, 'starter pack: coins came from the pool, budget untouched');

  // App echo first.
  reset(0, 0);
  await coins(pack.coins);
  await gems(pack.gems);
  store.rows.get(ALICE)!.gems! += credit!.gems;
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 0 }, deps(), 'webhook/revenuecat', { poolCredit: credit!.poolCoins });
  check(bal().coins === pack.coins && bal().gems === pack.gems, 'starter pack, app first: coins and gems once', bal());

  // Pack exhausted the budget earlier in the day: held, then released by the webhook.
  reset(0, 0);
  for (let k = 0; k < 5; k++) await coins(10000);
  logs = [];
  await coins(pack.coins);
  check(bal().coins === 50000, 'starter pack after a budget-exhausting day: held for now', bal().coins);
  await runGuarded(ALICE, { xp: 0, coins: 0, gems: 0 }, deps(), 'webhook/revenuecat', { poolCredit: credit!.poolCoins });
  check(bal().coins === 50000 + pack.coins, 'starter pack: webhook pool releases the held coins', bal().coins);

  check(creditForProduct('finplay_gems_500', T0, T0)?.gems === 500, 'webhook: finplay_gems_500 → 500 gems');
  check(creditForProduct('finplay_gems_14000', T0, T0)?.gems === 14000, 'webhook: finplay_gems_14000 → 14,000 gems');
  check(creditForProduct('finplay_pro_monthly_29_90', T0, T0) === null, 'webhook: other products credit nothing (no trailing-digit guess)');
  check(creditForProduct('finplay_gems_999999', T0, T0) === null, 'webhook: absurd gem product refused');
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
  check((r.body.economy as EconomyRow).coins === 0, 'cas: retried against the new balance (no negative)', r.body);
  const st = normalizeState(bal().guard, nowMs);
  check(st.p.cur === 0, 'cas: the retry debited 0, so the pool gained nothing', st.p);

  // Two interleaved requests can't both use the last of the budget.
  reset(0, 0);
  for (let k = 0; k < 4; k++) await coins(10000); // 40,000 used
  const a = store.read(ALICE);
  const snapA = await a;
  // Request A computes against the snapshot…
  const outA = applyGuard(snapA!.state, snapA!.economy, { xp: 0, coins: 10000, gems: 0 }, nowMs);
  // …request B (another instance) commits first.
  await coins(10000);
  const wA = await store.writeGuarded(ALICE, {
    expectVersion: snapA!.version, expectCoins: snapA!.economy.coins, expectGems: snapA!.economy.gems,
    state: outA.state, coinChange: outA.coinChange, gemChange: 0, xpChange: 0,
  });
  check(wA === 'conflict', 'cas: stale write refused');
  await coins(10000); // A's real retry path
  check(bal().coins === 50000, 'cas: interleaved requests stay within the 24h budget', bal().coins);

  // Exhausted retries → 503, nothing written.
  reset(100, 0);
  const busyStore = store;
  const origWrite = busyStore.writeGuarded.bind(busyStore);
  busyStore.writeGuarded = async () => 'conflict' as const;
  const busy = await coins(5);
  busyStore.writeGuarded = origWrite;
  check(busy.status === 503 && bal().coins === 100, 'cas: retries exhausted → 503, nothing applied', busy);
}

// ─── 11. Before migration 0018 (stateless fallback) ──────────────────────────
{
  reset(1000, 10);
  store.migrated = false;
  const r1 = await coins(300);
  check((r1.body.economy as EconomyRow).coins === 1300, 'stateless: honest credit works', r1.body);
  const r2 = await gems(500);
  check((r2.body.economy as EconomyRow).gems === 10, 'stateless: purchase-sized gem echo dropped (webhook credits)', r2.body);
  const r3 = await coins(-5000);
  check((r3.body.economy as EconomyRow).coins === 0, 'stateless: floor at zero', r3.body);
  const r4 = await coins(5_000_000);
  check((r4.body.economy as EconomyRow).coins === ECONOMY_LIMITS.statelessCoinPerRequest, 'stateless: per-request coin ceiling', r4.body);
  const r5 = await coins(100000);
  check((r5.body.economy as EconomyRow).coins === 1_100_000, 'stateless: a 100,000 exchange still passes', r5.body);
}

// ─── 12. Corrupt stored state starts fresh, never throws ─────────────────────
{
  reset(0, 0);
  store.rows.get(ALICE)!.guard = { v: 1, h: 'nope', p: { t: 'x' }, held: -5 };
  const r = await coins(100);
  check((r.body.economy as EconomyRow).coins === 100, 'state: malformed jsonb → fresh state', r.body);
  const s = normalizeState('{"v":1,"h":[[1,2,3]],"held":7}', nowMs);
  check(s.h.length === 0 && s.held === 7, 'state: old hours dropped, string jsonb parsed', s);
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

  // Server table matches the app's benefits.
  const appSide = Object.fromEntries(
    BRIDGE_BENEFITS.filter((b) => b.isAvailable && !b.partnerAdSlot && b.costCoins > 0)
      .map((b) => [b.id, { costCoins: b.costCoins, partnerUrl: b.partnerUrl }]),
  );
  check(JSON.stringify(appSide) === JSON.stringify(BRIDGE_REDEEMABLE), 'bridge: server price table == src/features/the-bridge/bridgeData.ts', { appSide });

  const html = buildBridgeAlertHtml(
    { action: 'redeem', benefitId: 'bridge-insurance-cover', userEmail: '<img src=x onerror=alert(1)>', platform: '"><b>', verified: false },
    'now',
  );
  check(!html.includes('<img') && html.includes('&lt;img') && !html.includes('"><b>'), 'bridge alert: client values HTML-escaped');
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
  const noKey = await verifyProWithRevenueCat([ALICE], { keys: [] });
  check(noKey.status === 'unavailable', 'rc: no key configured → unavailable (fail safe)');
  const http500 = await verifyProWithRevenueCat([ALICE], {
    keys: [{ key: 'sk_test' }],
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
}

// ─── Done ────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
