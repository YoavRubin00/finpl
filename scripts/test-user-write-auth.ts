// scripts/test-user-write-auth.ts
// Run: npx tsx scripts/test-user-write-auth.ts
//
// Exercises the real handlers behind POST /api/users/ping,
// /api/economy/grant-coins, /api/referral/register-code, GET /api/referral/me,
// POST /api/referral/collect, POST /api/referral/redeem and /api/trading/trade
// (api/_shared/{userPing,coinGrants,referralRegisterCode,referral,paperTrade}.ts
// + callerAuth.ts) with real session JWTs (test secret), in-memory stores and a
// fake clock. No network, no database.
import jwt from 'jsonwebtoken';
import { signSession, verifySession } from '../api/_shared/jwt';
import type { RateLimitStore } from '../api/_shared/authStores';
import { logLegacyCall, type CallerInput, type LegacyOutcome } from '../api/_shared/callerAuth';
import { handlePing, nextStreak, type PingStore, type StreakRow } from '../api/_shared/userPing';
import {
  COIN_GRANT_LIMITS,
  LEGACY_GRANT_LIMITS,
  handleGrantCoins,
  type CoinGrantStore,
  type GrantSource,
  type GrantTarget,
} from '../api/_shared/coinGrants';
import {
  LEGACY_REGISTER_LIMITS,
  handleRegisterCode,
  type ReferralCodeRow,
  type ReferralCodeStore,
} from '../api/_shared/referralRegisterCode';
import { handleTrade, type PaperTrade, type PaperTradeStore } from '../api/_shared/paperTrade';
import {
  DIVIDEND_DAILY_CAP,
  SIGNUP_BONUS_COINS,
  handleReferralCollect,
  handleReferralMe,
  handleReferralRedeem,
  type ReferralStore,
} from '../api/_shared/referral';

const SECRET = 'test-only-secret-for-user-write-auth-0123456789';
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

interface FakeUser {
  id: string;
  authId: string;
  email: string | null;
  streak: StreakRow;
  referralCode: string | null;
  virtualBalance: number;
}

const ALICE_ID = '11111111-1111-4111-8111-111111111111';
const APPLE_ID = '22222222-2222-4222-8222-222222222222';
const VICTIM_ID = '33333333-3333-4333-8333-333333333333';
const NOCODE_ID = '44444444-4444-4444-8444-444444444444';
const GHOST_ID = '99999999-9999-4999-8999-999999999999'; // valid token, no row

function freshUsers(): Map<string, FakeUser> {
  const users: FakeUser[] = [
    { id: ALICE_ID, authId: 'alice@example.com', email: 'alice@example.com', streak: { currentStreak: 3, longestStreak: 5, lastActiveDate: '2026-11-19' }, referralCode: null, virtualBalance: 100000 },
    // Older Apple account: auth_id is the Apple subject; the app sends the relay email as `authId`.
    { id: APPLE_ID, authId: '001234.apple-subject.0001', email: 'Kid@PrivateRelay.AppleID.com', streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null }, referralCode: null, virtualBalance: 100000 },
    { id: VICTIM_ID, authId: 'victim@example.com', email: 'victim@example.com', streak: { currentStreak: 7, longestStreak: 7, lastActiveDate: '2026-11-18' }, referralCode: 'FP-VICTM', virtualBalance: 100000 },
    { id: NOCODE_ID, authId: 'nocode@example.com', email: 'nocode@example.com', streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null }, referralCode: null, virtualBalance: 100000 },
  ];
  return new Map(users.map((u) => [u.id, u]));
}

let users = freshUsers();
// 2026-11-20 10:00 UTC = 12:00 in Israel → IL date 2026-11-20 (a Friday).
const T0 = Date.UTC(2026, 10, 20, 10, 0, 0);
let nowMs = T0;
const clock = () => nowMs;

function findTarget(target: GrantTarget): FakeUser | undefined {
  if ('userId' in target) return users.get(target.userId);
  return [...users.values()].find((u) => u.authId === target.authId); // SQL: exact auth_id match
}

const profileEmail = async (userId: string) => users.get(userId)?.email ?? null;

class MemoryRateLimitStore implements RateLimitStore {
  rows = new Map<string, { windowStartMs: number; count: number }>();
  broken = false;
  async hit(key: string, windowSec: number, now: number): Promise<{ count: number; resetAtMs: number }> {
    if (this.broken) throw new Error('relation "auth_rate_limits" does not exist');
    const row = this.rows.get(key);
    if (!row || row.windowStartMs <= now - windowSec * 1000) {
      this.rows.set(key, { windowStartMs: now, count: 1 });
      return { count: 1, resetAtMs: now + windowSec * 1000 };
    }
    row.count += 1;
    return { count: row.count, resetAtMs: row.windowStartMs + windowSec * 1000 };
  }
  async purgeOld(): Promise<void> { /* not needed */ }
}

const pingWrites: string[] = [];
const pingStore: PingStore = {
  async read(userId) {
    const u = users.get(userId);
    return u ? { ...u.streak } : null;
  },
  async write(userId, next) {
    pingWrites.push(userId);
    const u = users.get(userId);
    if (u) u.streak = { ...next };
  },
};

interface CoinEvent { userId: string; amount: number; source: GrantSource; atMs: number }
let coinEvents: CoinEvent[] = [];
const coinStore: CoinGrantStore = {
  async insertWithinDailyCap(target, amount, source, capSources, maxPerDay) {
    const u = findTarget(target);
    if (!u) return 'no_user';
    const spent = coinEvents
      .filter((e) => e.userId === u.id && capSources.includes(e.source) && e.atMs > nowMs - 24 * 3600 * 1000)
      .reduce((s, e) => s + e.amount, 0);
    if (spent + amount > maxPerDay) return 'capped';
    coinEvents.push({ userId: u.id, amount, source, atMs: nowMs });
    return 'inserted';
  },
};

const referralStore: ReferralCodeStore = {
  async claim(target, code) {
    const u = findTarget(target);
    if (!u) return null;
    if (u.referralCode !== null && u.referralCode !== code) return null; // guard didn't match
    if ([...users.values()].some((o) => o.id !== u.id && o.referralCode === code)) return 'collision';
    u.referralCode = code;
    return { userId: u.id, code };
  },
  async current(target): Promise<ReferralCodeRow | null> {
    const u = findTarget(target);
    return u ? { userId: u.id, code: u.referralCode } : null;
  },
};

// Referral world (me / collect / redeem). Victim invited Alice and the Apple
// account; both earned learning coins yesterday.
interface ReferralRow { refereeId: string; referrerId: string | null; code: string; credited: boolean; linkedAt: string }
let referralRows: ReferralRow[] = [];
let yesterdayCoins = new Map<string, number>();
let dividendRows = new Map<string, number>(); // `${userId}:${utcDate}` → amount
let refCoinEvents: Array<{ userId: string; amount: number; source: string }> = [];
let friendshipsMade: Array<[string, string]> = [];
const displayNames: Record<string, string> = { [ALICE_ID]: 'Alice', [APPLE_ID]: 'Kid', [VICTIM_ID]: 'Victim', [NOCODE_ID]: 'Nocode' };
const utcToday = () => new Date(nowMs).toISOString().slice(0, 10);

function freshReferrals(): void {
  referralRows = [
    { refereeId: ALICE_ID, referrerId: VICTIM_ID, code: 'FP-VICTM', credited: false, linkedAt: '2026-11-10T10:00:00.000Z' },
    { refereeId: APPLE_ID, referrerId: VICTIM_ID, code: 'FP-VICTM', credited: false, linkedAt: '2026-11-12T10:00:00.000Z' },
  ];
  yesterdayCoins = new Map([[ALICE_ID, 1_000], [APPLE_ID, 3_000]]);
  dividendRows = new Map();
  refCoinEvents = [];
  friendshipsMade = [];
}

const refStore: ReferralStore = {
  async snapshot(userId) {
    const u = users.get(userId);
    if (!u) return null;
    const mine = referralRows.filter((r) => r.referrerId === userId);
    const friends = mine.map((r) => ({
      key: `k${r.refereeId.slice(0, 8)}`,
      displayName: displayNames[r.refereeId] ?? null,
      linkedAt: r.linkedAt,
      yesterdayLearningCoins: yesterdayCoins.get(r.refereeId) ?? 0,
    }));
    let credited = 0;
    for (const r of mine) if (!r.credited) { r.credited = true; credited++; }
    return {
      referralCode: u.referralCode,
      friends,
      alreadyCollectedToday: dividendRows.has(`${userId}:${utcToday()}`),
      newlyCreditedReferrals: credited,
    };
  },
  async friendsYesterdayLearningCoins(userId) {
    if (!users.has(userId)) return null;
    return referralRows.filter((r) => r.referrerId === userId).reduce((s, r) => s + (yesterdayCoins.get(r.refereeId) ?? 0), 0);
  },
  async recordDividend(userId, amount) {
    const key = `${userId}:${utcToday()}`;
    if (dividendRows.has(key)) return 'already';
    dividendRows.set(key, amount);
    if (amount > 0) refCoinEvents.push({ userId, amount, source: 'referral-dividend' });
    return 'recorded';
  },
  async findReferrerByCode(code) {
    const u = [...users.values()].find((o) => o.referralCode === code);
    return u ? { userId: u.id } : null;
  },
  async redeem(refereeId, referrerId, code, bonus) {
    if (!users.has(refereeId)) return 'no_referee';
    if (!users.has(referrerId)) return 'no_referrer';
    if (referralRows.some((r) => r.refereeId === refereeId)) return 'already_redeemed';
    referralRows.push({ refereeId, referrerId, code, credited: false, linkedAt: new Date(nowMs).toISOString() });
    refCoinEvents.push({ userId: referrerId, amount: bonus, source: 'referral-signup-bonus' });
    refCoinEvents.push({ userId: refereeId, amount: bonus, source: 'referral-signup-bonus' });
    return 'redeemed';
  },
  async befriend(a, b) {
    friendshipsMade.push([a, b]);
  },
};

const tradesApplied: Array<{ userId: string; trade: PaperTrade }> = [];
const tradeStore: PaperTradeStore = {
  async apply(userId, trade) {
    const u = users.get(userId);
    if (!u) return null;
    u.virtualBalance += trade.cashDelta;
    tradesApplied.push({ userId, trade });
    return { virtualBalance: u.virtualBalance.toFixed(2) };
  },
};

const legacyLog: Array<{ endpoint: string; outcome: LegacyOutcome }> = [];
const logLegacy = (endpoint: string, outcome: LegacyOutcome) => { legacyLog.push({ endpoint, outcome }); };
const captures: Array<{ event: string; distinctId: string; props: Record<string, unknown> }> = [];
const capture = async (event: string, distinctId: string, props: Record<string, unknown>) => {
  captures.push({ event, distinctId, props });
};

let grantLimits = new MemoryRateLimitStore();
let registerLimits = new MemoryRateLimitStore();

const pingDeps = () => ({ profileEmail, store: pingStore, now: clock, logLegacy });
const grantDeps = () => ({ profileEmail, store: coinStore, rateLimits: grantLimits, now: clock, logLegacy });
const registerDeps = () => ({ profileEmail, store: referralStore, rateLimits: registerLimits, now: clock, capture, logLegacy });
const tradeDeps = () => ({ profileEmail, store: tradeStore });
const refDeps = () => ({ profileEmail, store: refStore, now: clock, capture, logLegacy });

function resetWorld(): void {
  users = freshUsers();
  freshReferrals();
  pingWrites.length = 0;
  coinEvents = [];
  tradesApplied.length = 0;
  legacyLog.length = 0;
  captures.length = 0;
  grantLimits = new MemoryRateLimitStore();
  registerLimits = new MemoryRateLimitStore();
  nowMs = T0;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

const tokenFor = (id: string) => {
  const u = users.get(id);
  return signSession({ sub: id, authId: u ? u.authId : 'ghost@example.com' });
};
const ALICE = () => `Bearer ${tokenFor(ALICE_ID)}`;
const APPLE = () => `Bearer ${tokenFor(APPLE_ID)}`;
const NOCODE = () => `Bearer ${tokenFor(NOCODE_ID)}`;
const VICTIM = () => `Bearer ${tokenFor(VICTIM_ID)}`;
const GHOST = `Bearer ${signSession({ sub: GHOST_ID, authId: 'ghost@example.com' })}`;
const GARBAGE = 'Bearer not-a-real-token';
const EXPIRED = `Bearer ${jwt.sign({ sub: ALICE_ID, authId: 'alice@example.com' }, SECRET, { algorithm: 'HS256', expiresIn: -60 })}`;
const WRONG_SECRET = `Bearer ${jwt.sign({ sub: VICTIM_ID, authId: 'victim@example.com' }, 'attacker-secret', { algorithm: 'HS256', expiresIn: 3600 })}`;
const ALG_NONE = `Bearer ${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: VICTIM_ID, authId: 'victim@example.com', iat: 1, exp: 4102444800 })).toString('base64url')}.`;
const NOT_BEARER = 'Basic dmljdGltOnBhc3M=';
const NEAR_EXPIRY = () => `Bearer ${jwt.sign({ sub: ALICE_ID, authId: 'alice@example.com' }, SECRET, { algorithm: 'HS256', expiresIn: 3600 })}`;

const BAD_AUTH: Array<[string, string]> = [
  ['garbage token', GARBAGE],
  ['expired token', EXPIRED],
  ['token signed with another secret', WRONG_SECRET],
  ['alg:none token', ALG_NONE],
  ['non-Bearer Authorization header', NOT_BEARER],
];

const req = (authorization: string | null, body: unknown, clientIp = '203.0.113.7'): CallerInput => ({ authorization, body, clientIp });

async function main(): Promise<void> {
  // ═══ POST /api/users/ping ═══════════════════════════════════════════════════
  resetWorld();
  {
    const r = await handlePing(req(ALICE(), { authId: 'alice@example.com' }), pingDeps());
    check(r.status === 200 && r.body.ok === true && r.body.date === '2026-11-20', 'ping: valid token → 200 with the IL date', r);
    check(pingWrites.length === 1 && pingWrites[0] === ALICE_ID, 'ping: valid token → writes the token user (by id)', pingWrites);
    check(users.get(ALICE_ID)?.streak.currentStreak === 4 && users.get(ALICE_ID)?.streak.lastActiveDate === '2026-11-20', 'ping: consecutive day advances the streak 3 → 4');
    const again = await handlePing(req(ALICE(), {}), pingDeps());
    check(again.status === 200 && pingWrites.length === 1, 'ping: same IL day again → 200, no second write (body authId optional)');
  }
  {
    const r = await handlePing(req(APPLE(), { authId: 'kid@privaterelay.appleid.com' }), pingDeps());
    check(r.status === 200 && pingWrites.includes(APPLE_ID), 'ping: Apple account sending its EMAIL as authId (1.5.1 client) → accepted, writes that user', r);
  }
  {
    const before = pingWrites.length;
    const r = await handlePing(req(ALICE(), { authId: 'victim@example.com' }), pingDeps());
    check(r.status === 403 && r.body.code === 'AUTH_ID_MISMATCH', 'ping: token + body authId of another user → 403 AUTH_ID_MISMATCH', r);
    check(pingWrites.length === before && users.get(VICTIM_ID)?.streak.lastActiveDate === '2026-11-18', 'ping: mismatch writes nothing (victim untouched)');
  }
  {
    const before = pingWrites.length;
    const r = await handlePing(req(null, { authId: 'victim@example.com' }), pingDeps());
    check(r.status === 401 && r.body.error === 'Missing Authorization header', 'ping: no token → 401 Missing Authorization header', r);
    check(pingWrites.length === before && users.get(VICTIM_ID)?.streak.currentStreak === 7, 'ping: no token writes nothing (victim streak untouched)');
    check(legacyLog.some((l) => l.endpoint === 'users/ping' && l.outcome === 'refused'), 'ping: no token → [legacy-tokenless] refused logged');
  }
  for (const [label, auth] of BAD_AUTH) {
    const before = pingWrites.length;
    const logsBefore = legacyLog.length;
    const r = await handlePing(req(auth, { authId: 'victim@example.com' }), pingDeps());
    check(r.status === 401 && r.body.error === 'Invalid or expired token' && pingWrites.length === before && legacyLog.length === logsBefore,
      `ping: ${label} → 401, no write, no legacy fallback`, r);
  }
  {
    const r = await handlePing(req(GHOST, {}), pingDeps());
    check(r.status === 200 && !pingWrites.includes(GHOST_ID), 'ping: valid token for a deleted profile → 200, nothing written');
  }
  {
    const r = await handlePing(req(NEAR_EXPIRY(), {}), pingDeps());
    const refreshed = r.headers?.['X-Auth-Refreshed-Token'];
    let refreshedSub = '';
    try { refreshedSub = refreshed ? verifySession(refreshed).sub : ''; } catch { /* stays empty */ }
    check(r.status === 200 && refreshedSub === ALICE_ID, 'ping: token inside its refresh window → X-Auth-Refreshed-Token for the same user');
    const plain = await handlePing(req(ALICE(), {}), pingDeps());
    check(!plain.headers?.['X-Auth-Refreshed-Token'], 'ping: fresh token → no refresh header');
  }
  {
    // Streak math kept identical to /api/sync/streak.
    check(JSON.stringify(nextStreak({ currentStreak: 4, longestStreak: 4, lastActiveDate: '2026-11-20' }, '2026-11-22')) === JSON.stringify({ currentStreak: 6, longestStreak: 6, lastActiveDate: '2026-11-22' }), 'ping: Shabbat bridge Fri → Sun adds 2');
    check(nextStreak({ currentStreak: 9, longestStreak: 9, lastActiveDate: '2026-11-17' }, '2026-11-20')?.currentStreak === 1, 'ping: a gap resets the streak to 1');
    check(nextStreak({ currentStreak: 9, longestStreak: 9, lastActiveDate: '2026-11-21' }, '2026-11-20') === null, 'ping: a future stored date is never rewound');
  }

  // ═══ POST /api/economy/grant-coins ══════════════════════════════════════════
  resetWorld();
  {
    const r = await handleGrantCoins(req(ALICE(), { authId: 'alice@example.com', amount: 50, source: 'lesson' }), grantDeps());
    check(r.status === 200 && r.body.ok === true, 'grant: valid token → 200 { ok: true }', r);
    check(coinEvents.length === 1 && coinEvents[0].userId === ALICE_ID && coinEvents[0].amount === 50, 'grant: valid token → row for the token user', coinEvents);
  }
  {
    const r = await handleGrantCoins(req(APPLE(), { authId: 'kid@privaterelay.appleid.com', amount: 20, source: 'quiz' }), grantDeps());
    check(r.status === 200 && coinEvents.some((e) => e.userId === APPLE_ID), 'grant: Apple account sending its email as authId → accepted');
  }
  {
    const before = coinEvents.length;
    const r = await handleGrantCoins(req(ALICE(), { authId: 'victim@example.com', amount: 50, source: 'lesson' }), grantDeps());
    check(r.status === 403 && coinEvents.length === before, 'grant: token + body authId of another user → 403, nothing recorded', r);
  }
  for (const [label, auth] of BAD_AUTH) {
    const before = coinEvents.length;
    const logsBefore = legacyLog.length;
    const r = await handleGrantCoins(req(auth, { authId: 'victim@example.com', amount: 50, source: 'lesson' }), grantDeps());
    check(r.status === 401 && coinEvents.length === before && legacyLog.length === logsBefore, `grant: ${label} → 401, nothing recorded, no legacy fallback`, r);
  }
  {
    const r = await handleGrantCoins(req(ALICE(), { amount: 999_999, source: 'lesson' }), grantDeps());
    const last = coinEvents[coinEvents.length - 1];
    check(r.status === 200 && last.amount === COIN_GRANT_LIMITS.lesson.maxPerEvent, 'grant: session amount clamped to the per-event cap (lesson 2,000)', last);
  }
  {
    let lastStatus = 0;
    let code: unknown;
    for (let i = 0; i < 11; i++) {
      const r = await handleGrantCoins(req(NOCODE(), { amount: 1_000, source: 'quiz' }), grantDeps());
      lastStatus = r.status;
      code = r.body.code;
    }
    const recorded = coinEvents.filter((e) => e.userId === NOCODE_ID).reduce((s, e) => s + e.amount, 0);
    check(lastStatus === 429 && code === 'DAILY_CAP' && recorded === COIN_GRANT_LIMITS.quiz.maxPerDay, 'grant: session per-source daily cap (quiz 10,000) → 429 DAILY_CAP, nothing over the cap', { lastStatus, recorded });
    nowMs += 24 * 3600 * 1000 + 1;
    const next = await handleGrantCoins(req(NOCODE(), { amount: 1_000, source: 'quiz' }), grantDeps());
    check(next.status === 200, 'grant: the daily cap rolls off after 24 hours');
    nowMs = T0;
  }
  {
    const bad = await handleGrantCoins(req(ALICE(), { amount: 10, source: 'referral-dividend' }), grantDeps());
    const zero = await handleGrantCoins(req(ALICE(), { amount: 0, source: 'lesson' }), grantDeps());
    const neg = await handleGrantCoins(req(ALICE(), { amount: -500, source: 'lesson' }), grantDeps());
    const str = await handleGrantCoins(req(ALICE(), { amount: '50', source: 'lesson' }), grantDeps());
    check(bad.status === 400 && zero.status === 400 && neg.status === 400 && str.status === 400, 'grant: server-only source / zero / negative / non-number amount → 400');
  }
  {
    const before = coinEvents.length;
    const r = await handleGrantCoins(req(GHOST, { amount: 10, source: 'lesson' }), grantDeps());
    check(r.status === 200 && coinEvents.length === before, 'grant: valid token for a deleted profile → 200, nothing recorded');
  }
  // Legacy tokenless path (today's 1.5.1 bundle sends no token on this call).
  resetWorld();
  {
    const r = await handleGrantCoins(req(null, { authId: 'victim@example.com', amount: 50, source: 'lesson' }), grantDeps());
    check(r.status === 200 && r.body.ok === true && coinEvents.length === 1 && coinEvents[0].userId === VICTIM_ID, 'grant: no token (1.5.1 client) → legacy path records the row', r);
    check(legacyLog.length === 1 && legacyLog[0].endpoint === 'economy/grant-coins' && legacyLog[0].outcome === 'accepted', 'grant: legacy call logged as [legacy-tokenless] accepted', legacyLog);
  }
  {
    await handleGrantCoins(req(null, { authId: 'victim@example.com', amount: 100_000, source: 'lesson' }), grantDeps());
    check(coinEvents[coinEvents.length - 1].amount === LEGACY_GRANT_LIMITS.maxPerEvent, 'grant: legacy amount clamped to 500 (was 100,000)');
  }
  {
    resetWorld();
    const sources: GrantSource[] = ['lesson', 'quiz', 'daily-quest', 'quiz', 'lesson'];
    for (const source of sources) {
      await handleGrantCoins(req(null, { authId: 'victim@example.com', amount: 500, source }), grantDeps());
    }
    const total = coinEvents.filter((e) => e.userId === VICTIM_ID).reduce((s, e) => s + e.amount, 0);
    const last = await handleGrantCoins(req(null, { authId: 'victim@example.com', amount: 10, source: 'lesson' }), grantDeps());
    const total2 = coinEvents.filter((e) => e.userId === VICTIM_ID).reduce((s, e) => s + e.amount, 0);
    check(total === LEGACY_GRANT_LIMITS.maxPerDayAllSources && total2 === total, 'grant: legacy daily cap 2,000 across lesson+quiz+daily-quest per user (= the 100/day dividend cap at 5%)', { total, total2 });
    check(last.status === 200 && last.body.ok === true && legacyLog[legacyLog.length - 1].outcome === 'not_recorded', 'grant: legacy over the cap → same 200 { ok: true } (no oracle), logged not_recorded');
  }
  {
    const r = await handleGrantCoins(req(null, { authId: 'nobody@example.com', amount: 50, source: 'lesson' }), grantDeps());
    check(r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ ok: true }), 'grant: legacy unknown authId → identical 200 { ok: true } (no account-existence oracle)');
  }
  {
    const r = await handleGrantCoins(req(null, { authId: 'victim@example.com', amount: 500, source: 'signup-bonus' }), grantDeps());
    check(r.status === 401 && legacyLog[legacyLog.length - 1].outcome === 'refused', 'grant: legacy non-dividend source (signup-bonus) → 401, logged refused');
    const noId = await handleGrantCoins(req(null, { amount: 5, source: 'lesson' }), grantDeps());
    check(noId.status === 400, 'grant: legacy without authId → 400');
  }
  {
    resetWorld();
    let status = 0;
    for (let i = 0; i < LEGACY_GRANT_LIMITS.perAuthId.max; i++) {
      status = (await handleGrantCoins(req(null, { authId: 'nocode@example.com', amount: 1, source: 'lesson' }, `198.51.100.${i % 250}`), grantDeps())).status;
    }
    const over = await handleGrantCoins(req(null, { authId: 'nocode@example.com', amount: 1, source: 'lesson' }, '198.51.100.251'), grantDeps());
    check(status === 200 && over.status === 429 && !!over.headers?.['Retry-After'], 'grant: legacy per-authId limit (120/hour, across IPs) → 429 with Retry-After', over);
    check(legacyLog[legacyLog.length - 1].outcome === 'rate_limited', 'grant: legacy rate limit logged as rate_limited');
  }
  {
    resetWorld();
    let status = 0;
    for (let i = 0; i < LEGACY_GRANT_LIMITS.perIp.max; i++) {
      status = (await handleGrantCoins(req(null, { authId: `user${i % 20}@example.com`, amount: 1, source: 'lesson' }, '203.0.113.99'), grantDeps())).status;
    }
    const over = await handleGrantCoins(req(null, { authId: 'fresh@example.com', amount: 1, source: 'lesson' }, '203.0.113.99'), grantDeps());
    check(status === 200 && over.status === 429, 'grant: legacy per-IP limit (1,000/hour) → 429', { status, over: over.status });
    const signedIn = await handleGrantCoins(req(ALICE(), { amount: 1, source: 'lesson' }, '203.0.113.99'), grantDeps());
    check(signedIn.status === 200, 'grant: the legacy IP limit never blocks a signed-in caller on the same IP');
  }
  {
    resetWorld();
    grantLimits.broken = true;
    const r = await handleGrantCoins(req(null, { authId: 'victim@example.com', amount: 5, source: 'lesson' }), grantDeps());
    check(r.status === 200 && coinEvents.length === 1, 'grant: durable limiter unavailable → legacy path fails open (per-user SQL caps still apply)');
  }

  // ═══ POST /api/referral/register-code ═══════════════════════════════════════
  resetWorld();
  {
    const r = await handleRegisterCode(req(ALICE(), { authId: 'alice@example.com', referralCode: 'FP-AAAAA' }), registerDeps());
    check(r.status === 200 && r.body.canonicalCode === 'FP-AAAAA' && users.get(ALICE_ID)?.referralCode === 'FP-AAAAA', 'register: valid token → code set on the token user, canonicalCode returned', r);
    const again = await handleRegisterCode(req(ALICE(), { referralCode: 'FP-BBBBB' }), registerDeps());
    check(again.status === 200 && again.body.canonicalCode === 'FP-AAAAA' && users.get(ALICE_ID)?.referralCode === 'FP-AAAAA', 'register: valid token, different code → keeps the stored one and returns it (self-heal)', again);
  }
  {
    const r = await handleRegisterCode(req(ALICE(), { authId: 'victim@example.com', referralCode: 'FP-ZZZZZ' }), registerDeps());
    check(r.status === 403 && users.get(VICTIM_ID)?.referralCode === 'FP-VICTM', 'register: token + body authId of another user → 403, victim untouched', r);
  }
  for (const [label, auth] of BAD_AUTH) {
    const logsBefore = legacyLog.length;
    const r = await handleRegisterCode(req(auth, { authId: 'nocode@example.com', referralCode: 'FP-EVILX' }), registerDeps());
    check(r.status === 401 && users.get(NOCODE_ID)?.referralCode === null && legacyLog.length === logsBefore, `register: ${label} → 401, nothing set, no legacy fallback`, r);
  }
  {
    const r = await handleRegisterCode(req(NOCODE(), { referralCode: 'FP-AAAAA' }), registerDeps());
    check(r.status === 409 && r.body.code === 'COLLISION', 'register: code held by another account → 409 COLLISION', r);
    const bad = await handleRegisterCode(req(NOCODE(), { referralCode: 'fp aa' }), registerDeps());
    check(bad.status === 400, 'register: invalid code format → 400');
  }
  // Legacy tokenless path.
  {
    const r = await handleRegisterCode(req(null, { authId: 'victim@example.com', referralCode: 'FP-ZZZZZ' }), registerDeps());
    check(r.status === 200 && r.body.canonicalCode === null && users.get(VICTIM_ID)?.referralCode === 'FP-VICTM', 'register: no token, account already has a code → canonicalCode null (stored code NOT revealed), untouched', r);
    const unknown = await handleRegisterCode(req(null, { authId: 'nobody@example.com', referralCode: 'FP-ZZZZZ' }), registerDeps());
    check(JSON.stringify(unknown.body) === JSON.stringify(r.body) && unknown.status === r.status, 'register: no token, unknown authId → identical answer (no account-existence oracle)');
  }
  {
    const r = await handleRegisterCode(req(null, { authId: 'kid@privaterelay.appleid.com', referralCode: 'FP-CCCCC' }), registerDeps());
    check(r.status === 200 && r.body.canonicalCode === null, 'register: no token + email of an account whose auth_id differs → not found, same null answer (as before)');
    const own = await handleRegisterCode(req(null, { authId: 'nocode@example.com', referralCode: 'FP-NNNNN' }), registerDeps());
    check(own.status === 200 && own.body.canonicalCode === 'FP-NNNNN' && users.get(NOCODE_ID)?.referralCode === 'FP-NNNNN', 'register: no token (1.5.1 client), account without a code → registered, echoes the sent code', own);
    check(legacyLog.some((l) => l.endpoint === 'referral/register-code' && l.outcome === 'accepted'), 'register: legacy call logged as [legacy-tokenless] accepted');
    const same = await handleRegisterCode(req(null, { authId: 'nocode@example.com', referralCode: 'FP-NNNNN' }), registerDeps());
    check(same.status === 200 && same.body.canonicalCode === 'FP-NNNNN', 'register: legacy re-register of the same code is idempotent');
  }
  {
    const noId = await handleRegisterCode(req(null, { referralCode: 'FP-QQQQQ' }), registerDeps());
    check(noId.status === 400, 'register: legacy without authId → 400');
  }
  {
    let status = 0;
    for (let i = 0; i < LEGACY_REGISTER_LIMITS.perAuthId.max; i++) {
      status = (await handleRegisterCode(req(null, { authId: 'ratelimit@example.com', referralCode: 'FP-RRRRR' }, `192.0.2.${i}`), registerDeps())).status;
    }
    const over = await handleRegisterCode(req(null, { authId: 'ratelimit@example.com', referralCode: 'FP-RRRRR' }, '192.0.2.200'), registerDeps());
    check(status === 200 && over.status === 429, 'register: legacy per-authId limit (20/day, across IPs) → 429', { status, over: over.status });
  }
  {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    check(captures.length > 0 && captures.every((c) => uuidRe.test(c.distinctId)), 'register: analytics distinct ids are always profile uuids (never an email)', captures.map((c) => c.distinctId));
    check(captures.some((c) => c.props.auth === 'legacy') && captures.some((c) => c.props.auth === 'session'), 'register: analytics events tag auth=session|legacy (legacy decline visible in PostHog)');
    check(!captures.some((c) => c.props.auth === 'legacy' && c.distinctId === VICTIM_ID && 'canonical_code' in c.props), 'register: legacy kept_existing event carries no stored code');
  }

  // ═══ POST /api/trading/trade ════════════════════════════════════════════════
  resetWorld();
  const buy = { assetSymbol: 'AAPL', tradeType: 'BUY', quantity: 2.5, priceAtExecution: 200, cashDelta: -500, skipPortfolio: false };
  {
    const r = await handleTrade(req(ALICE(), buy), tradeDeps());
    check(r.status === 200 && r.body.ok === true && r.body.virtualBalance === '99500.00', 'trade: valid token → 200 { ok, virtualBalance } as a numeric string', r);
    check(tradesApplied.length === 1 && tradesApplied[0].userId === ALICE_ID && tradesApplied[0].trade.totalValue === 500, 'trade: applied to the token user with total = qty × price');
    const old = await handleTrade(req(ALICE(), { ...buy, authId: 'alice@example.com' }), tradeDeps());
    check(old.status === 200, 'trade: 1.5.1 client body (…params, authId: email) with its token → 200');
  }
  {
    const before = tradesApplied.length;
    const r = await handleTrade(req(ALICE(), { ...buy, authId: 'victim@example.com' }), tradeDeps());
    check(r.status === 403 && tradesApplied.length === before, 'trade: token + body authId of another user → 403, nothing applied', r);
    const none = await handleTrade(req(null, { ...buy, authId: 'victim@example.com' }), tradeDeps());
    check(none.status === 401 && none.body.error === 'Missing Authorization header' && tradesApplied.length === before, 'trade: no token → 401, nothing applied');
  }
  for (const [label, auth] of BAD_AUTH) {
    const before = tradesApplied.length;
    const r = await handleTrade(req(auth, buy), tradeDeps());
    check(r.status === 401 && tradesApplied.length === before, `trade: ${label} → 401, nothing applied`, r);
  }
  {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['bad symbol', { ...buy, assetSymbol: "AAPL'; DROP TABLE x" }],
      ['bad tradeType', { ...buy, tradeType: 'HOLD' }],
      ['zero quantity', { ...buy, quantity: 0 }],
      ['price over 1e9', { ...buy, priceAtExecution: 2e9 }],
      ['qty × price over 1e12', { ...buy, quantity: 1e9, priceAtExecution: 1e6 }],
      ['string cashDelta', { ...buy, cashDelta: '-500' }],
      ['cashDelta over 1e9', { ...buy, cashDelta: -2e9 }],
    ];
    const before = tradesApplied.length;
    const statuses = await Promise.all(cases.map(async ([, body]) => (await handleTrade(req(ALICE(), body), tradeDeps())).status));
    check(statuses.every((s) => s === 400) && tradesApplied.length === before, 'trade: invalid symbol / type / quantity / price / total / cashDelta → 400, nothing applied', statuses);
  }
  {
    const r = await handleTrade(req(ALICE(), { assetSymbol: 'TA125.TA', tradeType: 'SELL', quantity: 0.1, priceAtExecution: 2600, cashDelta: -150_000 }), tradeDeps());
    check(r.status === 200 && Number(r.body.virtualBalance) < 0, 'trade: no affordability gate — an open larger than virtual_balance is recorded (no 402 rollback in the app)', r);
    const noDelta = await handleTrade(req(ALICE(), { assetSymbol: 'BTC', tradeType: 'BUY', quantity: 0.001, priceAtExecution: 90000 }), tradeDeps());
    check(noDelta.status === 200 && tradesApplied[tradesApplied.length - 1].trade.cashDelta === 0, 'trade: missing cashDelta defaults to 0 (pre-balance clients)');
  }
  {
    const r = await handleTrade(req(GHOST, buy), tradeDeps());
    check(r.status === 404, 'trade: valid token for a deleted profile → 404, nothing written');
  }

  // ═══ GET /api/referral/me ═══════════════════════════════════════════════════
  resetWorld();
  const meReq = (authorization: string | null, queryAuthId?: string | null) => ({ ...req(authorization, null), queryAuthId });
  {
    // Before the owner looks: an attacker with their own token names the victim.
    const r = await handleReferralMe(meReq(ALICE(), 'victim@example.com'), refDeps());
    check(r.status === 403 && r.body.code === 'AUTH_ID_MISMATCH', 'me: token + ?authId of another user → 403', r);
    const none = await handleReferralMe(meReq(null, 'victim@example.com'), refDeps());
    check(none.status === 401 && none.body.error === 'Missing Authorization header' && !('friends' in none.body),
      'me: no token (1.5.1 client) → 401, no friends / code / numbers returned', none);
    check(legacyLog.some((l) => l.endpoint === 'referral/me' && l.outcome === 'refused'), 'me: no token → [legacy-tokenless] referral/me refused');
    check(referralRows.every((row) => !row.credited), 'me: refused calls flip no pending signup bonus (the owner still gets them)');
  }
  for (const [label, auth] of BAD_AUTH) {
    const logsBefore = legacyLog.length;
    const r = await handleReferralMe(meReq(auth, 'victim@example.com'), refDeps());
    check(r.status === 401 && r.body.error === 'Invalid or expired token' && legacyLog.length === logsBefore && referralRows.every((row) => !row.credited),
      `me: ${label} → 401, no data, no legacy fallback`, r);
  }
  {
    const r = await handleReferralMe(meReq(VICTIM()), refDeps());
    const friends = r.body.friends as Array<Record<string, unknown>>;
    check(r.status === 200 && friends.length === 2 && r.body.referralCode === 'FP-VICTM', 'me: valid token → 200 with the token user\'s friends and code', r);
    check(friends.every((f) => typeof f.authId === 'string' && !String(f.authId).includes('@') && !Object.values(f).some((v) => typeof v === 'string' && v.includes('@'))),
      'me: friends carry an opaque key, never an email', friends);
    check(r.body.totalYesterdayLearningCoins === 4_000 && r.body.dividendAvailable === DIVIDEND_DAILY_CAP && r.body.alreadyCollectedToday === false,
      'me: dividend = 5% of 4,000 capped at 100', r.body);
    check(r.body.pendingSignupBonus === 2 * SIGNUP_BONUS_COINS && r.body.todayDateUTC === '2026-11-20', 'me: both uncredited signup bonuses returned once (1,000)', r.body);
    const again = await handleReferralMe(meReq(VICTIM(), 'victim@example.com'), refDeps());
    check(again.status === 200 && again.body.pendingSignupBonus === 0, 'me: second call (1.5.1-style ?authId of self) → bonus already credited, 0');
  }
  {
    const r = await handleReferralMe(meReq(APPLE(), 'kid@privaterelay.appleid.com'), refDeps());
    check(r.status === 200 && (r.body.friends as unknown[]).length === 0, 'me: Apple account sending its relay email as ?authId → accepted');
    const ghost = await handleReferralMe(meReq(GHOST), refDeps());
    check(ghost.status === 401 && ghost.body.error === 'Invalid or expired token', 'me: valid token for a deleted account → 401 (not 500, not an empty 200)', ghost);
    const near = await handleReferralMe(meReq(`Bearer ${jwt.sign({ sub: VICTIM_ID, authId: 'victim@example.com' }, SECRET, { algorithm: 'HS256', expiresIn: 3600 })}`), refDeps());
    check(near.status === 200 && !!near.headers?.['X-Auth-Refreshed-Token'], 'me: token inside its refresh window → X-Auth-Refreshed-Token');
  }

  // ═══ POST /api/referral/collect ═════════════════════════════════════════════
  resetWorld();
  {
    const none = await handleReferralCollect(req(null, { authId: 'victim@example.com' }), refDeps());
    check(none.status === 401 && dividendRows.size === 0 && refCoinEvents.length === 0, 'collect: no token (1.5.1 client) → 401, nothing collected (victim can still collect)', none);
    check(legacyLog.some((l) => l.endpoint === 'referral/collect' && l.outcome === 'refused'), 'collect: no token → [legacy-tokenless] referral/collect refused');
    const mismatch = await handleReferralCollect(req(ALICE(), { authId: 'victim@example.com' }), refDeps());
    check(mismatch.status === 403 && dividendRows.size === 0, 'collect: token + body authId of another user → 403, nothing collected', mismatch);
  }
  for (const [label, auth] of BAD_AUTH) {
    const r = await handleReferralCollect(req(auth, { authId: 'victim@example.com' }), refDeps());
    check(r.status === 401 && dividendRows.size === 0 && refCoinEvents.length === 0, `collect: ${label} → 401, nothing collected`, r);
  }
  {
    const r = await handleReferralCollect(req(VICTIM(), { authId: 'victim@example.com' }), refDeps());
    check(r.status === 200 && r.body.amount === DIVIDEND_DAILY_CAP && r.body.alreadyCollected === false, 'collect: valid token → 200, 100 collected', r);
    check(refCoinEvents.length === 1 && refCoinEvents[0].userId === VICTIM_ID && refCoinEvents[0].source === 'referral-dividend', 'collect: the coin event goes to the token user');
    const again = await handleReferralCollect(req(VICTIM(), {}), refDeps());
    check(again.status === 200 && again.body.amount === 0 && again.body.alreadyCollected === true && refCoinEvents.length === 1, 'collect: second call the same UTC day → amount 0, alreadyCollected (once a day)');
    const me = await handleReferralMe(meReq(VICTIM()), refDeps());
    check(me.body.alreadyCollectedToday === true && me.body.dividendAvailable === 0, 'collect: me afterwards shows collected, 0 available');
  }
  {
    const r = await handleReferralCollect(req(NOCODE(), {}), refDeps());
    check(r.status === 200 && r.body.amount === 0 && r.body.alreadyCollected === true && dividendRows.get(`${NOCODE_ID}:2026-11-20`) === 0,
      'collect: no friends → amount 0, a 0 "checked today" row (as before)', r);
    const ghost = await handleReferralCollect(req(GHOST, {}), refDeps());
    check(ghost.status === 401, 'collect: valid token for a deleted account → 401');
  }

  // ═══ POST /api/referral/redeem ══════════════════════════════════════════════
  resetWorld();
  // What the 1.5.1 app does with a redeem failure (src/db/sync/syncReferral.ts before 2026-11-20).
  const oldClientIsFinal = (status: number, body: Record<string, unknown>): boolean => {
    let reason = status >= 500 || status === 429 ? 'NETWORK' : 'INVALID';
    const known = ['ALREADY_REDEEMED', 'SELF_REFERRAL', 'CODE_NOT_FOUND', 'REFEREE_NOT_FOUND'];
    if (typeof body.code === 'string' && known.includes(body.code)) reason = body.code;
    return ['ALREADY_REDEEMED', 'SELF_REFERRAL', 'CODE_NOT_FOUND', 'INVALID'].includes(reason);
  };
  {
    const none = await handleReferralRedeem(req(null, { inviteCode: 'FP-VICTM', refereeAuthId: 'nocode@example.com' }), refDeps());
    check(none.status === 401 && !referralRows.some((r) => r.refereeId === NOCODE_ID) && refCoinEvents.length === 0,
      'redeem: no token (1.5.1 client) → 401, nothing redeemed for the named account', none);
    check(!oldClientIsFinal(none.status, none.body), 'redeem: the tokenless 401 is one the 1.5.1 app retries next launch (keeps the pending invite)', none.body);
    check(legacyLog.some((l) => l.endpoint === 'referral/redeem' && l.outcome === 'refused'), 'redeem: no token → [legacy-tokenless] referral/redeem refused');
    const bad = await handleReferralRedeem(req(null, { inviteCode: 'bad code!', refereeAuthId: 'nocode@example.com' }), refDeps());
    check(bad.status === 400, 'redeem: no token + malformed code → 400 (final, as before)');
  }
  {
    // Someone else's account named as the referee.
    const r = await handleReferralRedeem(req(ALICE(), { inviteCode: 'FP-VICTM', refereeAuthId: 'nocode@example.com' }), refDeps());
    check(r.status === 403 && !referralRows.some((row) => row.refereeId === NOCODE_ID) && refCoinEvents.length === 0,
      'redeem: token + refereeAuthId of another user → 403, nothing redeemed', r);
  }
  for (const [label, auth] of BAD_AUTH) {
    const r = await handleReferralRedeem(req(auth, { inviteCode: 'FP-VICTM', refereeAuthId: 'nocode@example.com' }), refDeps());
    check(r.status === 401 && r.body.error === 'Invalid or expired token' && refCoinEvents.length === 0, `redeem: ${label} → 401, nothing redeemed`, r);
  }
  {
    const self = await handleReferralRedeem(req(VICTIM(), { inviteCode: 'fp-victm', refereeAuthId: 'victim@example.com' }), refDeps());
    check(self.status === 400 && self.body.code === 'SELF_REFERRAL' && refCoinEvents.length === 0, 'redeem: own code (any case) → 400 SELF_REFERRAL, nothing written', self);
    const unknown = await handleReferralRedeem(req(NOCODE(), { inviteCode: 'FP-NOPE1' }), refDeps());
    check(unknown.status === 404 && unknown.body.code === 'CODE_NOT_FOUND', 'redeem: unknown code → 404 CODE_NOT_FOUND');
  }
  {
    const r = await handleReferralRedeem(req(NOCODE(), { inviteCode: 'FP-VICTM', refereeAuthId: 'nocode@example.com' }), refDeps());
    check(r.status === 200 && r.body.ok === true && r.body.bonusGranted === SIGNUP_BONUS_COINS, 'redeem: valid token → 200, 500 bonus', r);
    check(r.body.referrerAuthId === '', 'redeem: the referrer\'s email is no longer returned (referrerAuthId empty)', r.body);
    const row = referralRows.find((x) => x.refereeId === NOCODE_ID);
    check(!!row && row.referrerId === VICTIM_ID, 'redeem: the referee is the token user, linked to the code owner');
    check(refCoinEvents.filter((e) => e.source === 'referral-signup-bonus').length === 2
      && refCoinEvents.some((e) => e.userId === VICTIM_ID) && refCoinEvents.some((e) => e.userId === NOCODE_ID), 'redeem: 500 to each side (reward logic unchanged)');
    check(friendshipsMade.length === 1 && friendshipsMade[0][0] === VICTIM_ID && friendshipsMade[0][1] === NOCODE_ID, 'redeem: auto-friendship referrer ↔ referee');
    const twice = await handleReferralRedeem(req(NOCODE(), { inviteCode: 'FP-VICTM' }), refDeps());
    check(twice.status === 409 && twice.body.code === 'ALREADY_REDEEMED' && refCoinEvents.length === 2, 'redeem: second redeem by the same user → 409 ALREADY_REDEEMED, no new coins', twice);
    users.get(ALICE_ID)!.referralCode = 'FP-ALICE';
    const other = await handleReferralRedeem(req(NOCODE(), { inviteCode: 'FP-ALICE' }), refDeps());
    check(other.status === 409 && refCoinEvents.length === 2, 'redeem: a different code after redeeming → still 409 (one redemption per account, ever)');
  }
  {
    users.get(VICTIM_ID)!.referralCode = 'FP-VICTM';
    const apple = await handleReferralRedeem(req(APPLE(), { inviteCode: 'FP-ALICE', refereeAuthId: 'kid@privaterelay.appleid.com' }), refDeps());
    check(apple.status === 409, 'redeem: Apple account sending its relay email as refereeAuthId → accepted (already redeemed in the fixture → 409)', apple);
    const ghost = await handleReferralRedeem(req(GHOST, { inviteCode: 'FP-VICTM' }), refDeps());
    check(ghost.status === 401 && ghost.body.error === 'Invalid or expired token', 'redeem: valid token for a deleted account → 401', ghost);
  }
  {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const redeemEvents = captures.filter((c) => c.event === 'referral_redeem_server');
    check(redeemEvents.length > 0 && redeemEvents.every((c) => uuidRe.test(c.distinctId)), 'redeem: analytics distinct ids are profile uuids (never an email)', redeemEvents.map((c) => c.distinctId));
  }

  // ═══ The real legacy log line carries no PII ═══════════════════════════════
  {
    const lines: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
    try { logLegacyCall('economy/grant-coins', 'accepted'); } finally { console.info = original; }
    check(lines.length === 1 && lines[0] === '[legacy-tokenless] {"endpoint":"economy/grant-coins","outcome":"accepted"}', 'log: one structured [legacy-tokenless] line, endpoint + outcome only', lines);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
