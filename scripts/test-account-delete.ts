// scripts/test-account-delete.ts
// Run: npx tsx scripts/test-account-delete.ts
//
// POST /api/account/delete (api/_shared/accountDelete.ts) with real session
// JWTs (test secret) and an in-memory account world; the SQL plan
// (api/_shared/accountDeleteStore.ts buildAccountDeletePlan) rendered and
// checked statement by statement; and the "deleted account's token is dead"
// paths: withAuth's check (authenticateBearer) and the referral handlers.
// No network, no database.
import jwt from 'jsonwebtoken';
import { PgDialect } from 'drizzle-orm/pg-core';
import { signSession } from '../api/_shared/jwt';
import { handleAccountDelete, type AccountDeleteStore } from '../api/_shared/accountDelete';
import {
  ACCOUNT_DELETE_TABLES,
  buildAccountDeletePlan,
  createAccountDeleteStore,
  profileEmails,
  type ColumnMap,
} from '../api/_shared/accountDeleteStore';
import type { Db } from '../api/_shared/db';
import type { SQL } from 'drizzle-orm';
import { authenticateBearer, lookupFoundRow } from '../api/_shared/withAuth';
import { handleReferralMe, handleReferralCollect, handleReferralRedeem, type ReferralStore } from '../api/_shared/referral';
import { ACCOUNT_DELETE_CONFIRM } from '../src/lib/api/accountDeleteContract';
import type { CallerInput } from '../api/_shared/callerAuth';

const SECRET = 'test-only-secret-for-account-delete-0123456789';
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

// ─── In-memory accounts ──────────────────────────────────────────────────────

const ALICE_ID = '11111111-1111-4111-8111-111111111111';
const BOB_ID = '22222222-2222-4222-8222-222222222222';
const APPLE_ID = '33333333-3333-4333-8333-333333333333';

interface Account { id: string; authId: string; email: string | null }
interface DataRow { table: string; userId: string }

let accounts = new Map<string, Account>();
let rows: DataRow[] = [];
const deleteCalls: string[] = [];

function resetWorld(): void {
  accounts = new Map([
    [ALICE_ID, { id: ALICE_ID, authId: 'alice@example.com', email: 'alice@example.com' }],
    [BOB_ID, { id: BOB_ID, authId: 'bob@example.com', email: 'bob@example.com' }],
    [APPLE_ID, { id: APPLE_ID, authId: '001234.apple-subject.0001', email: 'Kid@PrivateRelay.AppleID.com' }],
  ]);
  rows = [];
  for (const id of [ALICE_ID, BOB_ID, APPLE_ID]) {
    for (const table of ['module_progress', 'coin_events', 'paper_trades', 'friendships', 'support_messages', 'user_stats']) {
      rows.push({ table, userId: id });
    }
  }
  deleteCalls.length = 0;
}

/** Stands in for the one-transaction Neon store: removes only that user's rows. */
const store: AccountDeleteStore = {
  async deleteAccount(userId) {
    deleteCalls.push(userId);
    if (!accounts.has(userId)) return null;
    const before = rows.length;
    rows = rows.filter((r) => r.userId !== userId);
    accounts.delete(userId);
    return { rows: { user_profiles: 1, data: before - rows.length } };
  },
};

const profileEmail = async (userId: string) => accounts.get(userId)?.email ?? null;
const logLines: string[] = [];
const deps = () => ({ profileEmail, store, log: (line: string) => { logLines.push(line); } });

const tokenFor = (id: string, authId: string) => `Bearer ${signSession({ sub: id, authId })}`;
const ALICE = tokenFor(ALICE_ID, 'alice@example.com');
const BOB = tokenFor(BOB_ID, 'bob@example.com');
const APPLE = tokenFor(APPLE_ID, '001234.apple-subject.0001');
const NEAR_EXPIRY = `Bearer ${jwt.sign({ sub: BOB_ID, authId: 'bob@example.com' }, SECRET, { algorithm: 'HS256', expiresIn: 3600 })}`;
const BAD_AUTH: Array<[string, string]> = [
  ['garbage token', 'Bearer not-a-real-token'],
  ['expired token', `Bearer ${jwt.sign({ sub: BOB_ID, authId: 'bob@example.com' }, SECRET, { algorithm: 'HS256', expiresIn: -60 })}`],
  ['token signed with another secret', `Bearer ${jwt.sign({ sub: BOB_ID, authId: 'bob@example.com' }, 'attacker-secret', { algorithm: 'HS256', expiresIn: 3600 })}`],
  ['non-Bearer Authorization header', 'Basic Ym9iOnBhc3M='],
];
const req = (authorization: string | null, body: unknown): CallerInput => ({ authorization, body, clientIp: '203.0.113.7' });
const CONFIRM = { confirm: ACCOUNT_DELETE_CONFIRM };
const rowsOf = (id: string) => rows.filter((r) => r.userId === id).length;

async function main(): Promise<void> {
  // ═══ Who may delete what ════════════════════════════════════════════════════
  resetWorld();
  {
    const r = await handleAccountDelete(req(null, CONFIRM), deps());
    check(r.status === 401 && r.body.error === 'Missing Authorization header' && deleteCalls.length === 0, 'delete: no token → 401, nothing deleted', r);
  }
  for (const [label, auth] of BAD_AUTH) {
    const r = await handleAccountDelete(req(auth, CONFIRM), deps());
    check(r.status === 401 && r.body.error === 'Invalid or expired token' && deleteCalls.length === 0, `delete: ${label} → 401, nothing deleted`, r);
  }
  {
    const missing = await handleAccountDelete(req(ALICE, {}), deps());
    const wrong = await handleAccountDelete(req(ALICE, { confirm: true }), deps());
    const nullBody = await handleAccountDelete(req(ALICE, null), deps());
    check([missing, wrong, nullBody].every((r) => r.status === 400 && r.body.code === 'CONFIRM_REQUIRED') && deleteCalls.length === 0 && accounts.has(ALICE_ID),
      'delete: valid token without the exact confirm value → 400 CONFIRM_REQUIRED, nothing deleted');
  }
  {
    const r = await handleAccountDelete(req(ALICE, { ...CONFIRM, authId: 'bob@example.com' }), deps());
    check(r.status === 403 && r.body.code === 'AUTH_ID_MISMATCH' && deleteCalls.length === 0 && accounts.has(BOB_ID) && rowsOf(BOB_ID) === 6,
      'delete: token + body authId of another user → 403, the other account untouched', r);
  }
  {
    const r = await handleAccountDelete(req(ALICE, CONFIRM), deps());
    check(r.status === 200 && r.body.ok === true && r.body.deleted === true, 'delete: valid token + confirm → 200 { ok, deleted: true }', r);
    check(deleteCalls.length === 1 && deleteCalls[0] === ALICE_ID, 'delete: acts on the token user only (by id)', deleteCalls);
    check(!accounts.has(ALICE_ID) && rowsOf(ALICE_ID) === 0, 'delete: the caller\'s profile and rows are gone');
    check(accounts.has(BOB_ID) && rowsOf(BOB_ID) === 6 && accounts.has(APPLE_ID) && rowsOf(APPLE_ID) === 6, 'delete: every other account and its rows untouched');
    check(!r.headers?.['X-Auth-Refreshed-Token'], 'delete: no refreshed token handed out');
  }
  {
    const before = rows.length;
    const r = await handleAccountDelete(req(ALICE, CONFIRM), deps());
    check(r.status === 200 && r.body.ok === true && r.body.deleted === false && r.body.alreadyDeleted === true && rows.length === before,
      'delete: second call with the same (old) token → 200 alreadyDeleted, idempotent, nothing else touched', r);
  }
  {
    const r = await handleAccountDelete(req(APPLE, { ...CONFIRM, authId: 'kid@privaterelay.appleid.com' }), deps());
    check(r.status === 200 && r.body.deleted === true && !accounts.has(APPLE_ID), 'delete: Apple account (auth_id = Apple subject) sending its relay email → deleted', r);
  }
  {
    const r = await handleAccountDelete(req(NEAR_EXPIRY, CONFIRM), deps());
    check(r.status === 200 && r.body.deleted === true && !r.headers?.['X-Auth-Refreshed-Token'], 'delete: token inside its refresh window → still no refreshed token', r);
  }
  {
    const leaks = logLines.filter((l) => /@|[0-9a-f]{8}-[0-9a-f]{4}-/i.test(l));
    check(logLines.length >= 3 && logLines.every((l) => l.startsWith('[account-delete] ')) && leaks.length === 0,
      'delete: log lines carry outcome + counts only (no email, no id)', logLines);
  }

  // ═══ The deleted account's old token is dead everywhere ═════════════════════
  resetWorld();
  {
    await handleAccountDelete(req(BOB, CONFIRM), deps());
    const exists = async (id: string) => accounts.has(id);
    const after = await authenticateBearer(BOB, exists);
    check(!after.ok && after.status === 401 && after.body.error === 'Invalid or expired token',
      'withAuth: deleted account\'s token → 401 Invalid or expired token (sync, refresh, link all sit behind it)', after);
    check(!after.ok && after.body.code === 'ACCOUNT_NOT_FOUND',
      'withAuth: that 401 carries code ACCOUNT_NOT_FOUND (a rollout can tell it from a normal expiry)', after);
    const expiredLike = await authenticateBearer('Bearer nope', exists);
    check(!expiredLike.ok && expiredLike.body.code === undefined, 'withAuth: an invalid token carries no such code');

    // What counts as "the lookup found a row": a shape we don't know is an
    // error (500), never "account gone" (401 = sign-out + device wipe).
    check(lookupFoundRow({ rows: [{ hit: 1 }] }) === true && lookupFoundRow({ rows: [] }) === false
      && lookupFoundRow([{ hit: 1 }]) === true && lookupFoundRow([]) === false,
      'withAuth: lookup result read from { rows } or a bare array');
    let unknownShapes = 0;
    for (const odd of [undefined, null, {}, { rows: null }, { rows: 'x' }, 'ok', 1]) {
      try { lookupFoundRow(odd); } catch { unknownShapes++; }
    }
    check(unknownShapes === 7, 'withAuth: an unknown result shape throws (→ 500), it is never read as "no row"', unknownShapes);
    const alive = await authenticateBearer(ALICE, exists);
    check(alive.ok && alive.decoded.sub === ALICE_ID, 'withAuth: a live account\'s token still passes');
    const missing = await authenticateBearer('', exists);
    const garbage = await authenticateBearer('Bearer nope', exists);
    check(!missing.ok && missing.status === 401 && missing.body.error === 'Missing Authorization header'
      && !garbage.ok && garbage.status === 401 && garbage.body.error === 'Invalid or expired token', 'withAuth: missing / garbage token → 401 as before');
    const broken = await authenticateBearer(ALICE, async () => { throw new Error('connection reset'); });
    check(!broken.ok && broken.status === 500, 'withAuth: account lookup failure → 500 (never a 401 that would sign the user out)', broken);

    // The referral handlers look the account up by the token's id too.
    const refStore: ReferralStore = {
      async snapshot(id) { return accounts.has(id) ? { referralCode: null, friends: [], alreadyCollectedToday: false, newlyCreditedReferrals: 0 } : null; },
      async friendsYesterdayLearningCoins(id) { return accounts.has(id) ? 0 : null; },
      async recordDividend() { return 'recorded'; },
      async findReferrerByCode() { return { userId: ALICE_ID }; },
      async redeem(referee) { return accounts.has(referee) ? 'redeemed' : 'no_referee'; },
      async befriend() { /* not needed */ },
    };
    const refDeps = { profileEmail, store: refStore, now: () => Date.now(), capture: async () => { /* not needed */ } };
    const me = await handleReferralMe({ ...req(BOB, null), queryAuthId: null }, refDeps);
    const collect = await handleReferralCollect(req(BOB, {}), refDeps);
    const redeem = await handleReferralRedeem(req(BOB, { inviteCode: 'FP-ALICE' }), refDeps);
    check([me, collect, redeem].every((r) => r.status === 401 && r.body.error === 'Invalid or expired token'),
      'referral me / collect / redeem: deleted account\'s token → 401, nothing read or written', [me.status, collect.status, redeem.status]);
    const again = await handleAccountDelete(req(BOB, CONFIRM), deps());
    check(again.status === 200 && again.body.alreadyDeleted === true, 'delete: the old token can only learn "already deleted"');
  }

  // ═══ The SQL plan (api/_shared/accountDeleteStore.ts) ═══════════════════════
  {
    const dialect = new PgDialect();
    const id = ALICE_ID;
    const emails = profileEmails({ email: ' Alice@Example.com ', authId: 'alice@example.com' });
    check(emails.length === 1 && emails[0] === 'alice@example.com', 'plan: profile addresses normalized + de-duplicated', emails);
    check(profileEmails({ email: null, authId: '001234.apple-subject.0001' }).length === 0, 'plan: an Apple-subject auth_id is not an address');

    const allColumns = (referrerNullable: boolean): ColumnMap => {
      const t = (cols: string[], nullable: string[] = []) => new Map(cols.map((c) => [c, { nullable: nullable.includes(c) }]));
      const map: ColumnMap = new Map();
      for (const table of ACCOUNT_DELETE_TABLES) map.set(table, t(['user_id']));
      map.set('content_reports', t(['reporter_user_id', 'target_type', 'target_id']));
      map.set('portfolio_comments', t(['id', 'author_user_id', 'portfolio_id']));
      map.set('portfolio_likes', t(['user_id', 'portfolio_id']));
      map.set('portfolio_ratings', t(['rater_user_id', 'portfolio_id']));
      map.set('shared_portfolios', t(['id', 'user_id']));
      map.set('user_blocks', t(['blocker_user_id', 'blocked_user_id']));
      map.set('friendships', t(['requester_id', 'addressee_id']));
      map.set('referrals', t(['referee_user_id', 'referrer_user_id', 'invite_code'], referrerNullable ? ['referrer_user_id'] : []));
      map.set('support_messages', t(['user_id', 'user_email'], ['user_id']));
      map.set('bridge_clicks', t(['user_id', 'user_email'], ['user_id', 'user_email']));
      map.set('email_login_codes', t(['email']));
      map.set('user_profiles', t(['id', 'email', 'auth_id']));
      return map;
    };

    const ctx = { userId: id, emails };
    const plan = buildAccountDeletePlan(ctx, allColumns(true));
    const rendered = plan.map((s) => ({ name: s.name, ...dialect.sqlToQuery(s.query) }));
    const allowed = new Set<unknown>([id, ...emails]);
    check(rendered.every((q) => / WHERE /.test(q.sql)), 'plan: every DELETE / UPDATE has a WHERE (nothing unscoped)', rendered.filter((q) => !/ WHERE /.test(q.sql)).map((q) => q.name));
    check(rendered.every((q) => q.params.length > 0 && q.params.every((p) => allowed.has(p))),
      'plan: every statement is bound only to the caller\'s id / own addresses', rendered.map((q) => [q.name, q.params]));
    check(rendered.every((q) => q.params.includes(id) || q.name === 'email_login_codes'),
      'plan: every row-owning statement matches the caller\'s id');
    const byEmail = rendered.filter((q) => /lower\(user_email\)/.test(q.sql));
    check(byEmail.length === 2 && byEmail.every((q) => /\(user_id IS NULL AND lower\(user_email\) IN \(/.test(q.sql)),
      'plan: rows matched by address only when they belong to no account (never another account\'s rows)', byEmail.map((q) => q.sql));
    check(!rendered.some((q) => /auth_rate_limits/.test(q.sql)), 'plan: abuse throttle counters are left to expire (deletion can\'t reset them)');
    check(plan[plan.length - 1].name === 'user_profiles' && /^WITH d AS \(DELETE FROM user_profiles WHERE id = \$1::uuid RETURNING 1\)/.test(rendered[rendered.length - 1].sql),
      'plan: the profile row is deleted last', rendered[rendered.length - 1].sql);
    const names = plan.map((s) => s.name);
    const covered = ACCOUNT_DELETE_TABLES.every((t) => names.some((n) => n === t || n.startsWith(`${t}_`)));
    check(covered, 'plan: every table in the deletion list has a step', names);
    check(names.indexOf('content_reports') < names.indexOf('portfolio_comments') && names.indexOf('portfolio_comments') < names.indexOf('shared_portfolios'),
      'plan: reports and reactions before the shares they point at');
    const referrer = rendered.find((q) => q.name.startsWith('referrals_as_referrer'));
    check(referrer?.name === 'referrals_as_referrer_anonymised' && /UPDATE referrals SET referrer_user_id = NULL, invite_code = 'DELETED' WHERE referrer_user_id = \$1::uuid/.test(referrer.sql),
      'plan (after 0019): invitees\' rows kept with the referrer anonymised (no second redemption)', referrer);
    const redemptions = rendered.find((q) => q.name === 'bridge_redemptions');
    const rcEvents = rendered.find((q) => q.name === 'revenuecat_events_anonymised');
    check(!!redemptions && /DELETE FROM "?bridge_redemptions"? WHERE user_id = \$1::uuid/.test(redemptions.sql)
      && !!rcEvents && /UPDATE revenuecat_events SET user_id = NULL WHERE user_id = \$1::uuid/.test(rcEvents.sql),
      'plan (0018 tables): bridge redemptions deleted; RevenueCat purchase events kept without the user (a redelivered webhook stays a no-op)',
      [redemptions?.sql, rcEvents?.sql]);
    const bridge = rendered.find((q) => q.name === 'bridge_clicks_anonymised');
    check(!!bridge && /UPDATE "?bridge_clicks"? SET user_id = NULL, user_email = NULL WHERE/.test(bridge.sql),
      'plan: bridge clicks anonymised (user id + email cleared)', bridge?.sql);

    // 0018 with revenuecat_events.app_user_id (the raw RevenueCat id of a
    // purchase the webhook could not credit).
    const withAppUser = allColumns(true);
    withAppUser.set('revenuecat_events', new Map([['user_id', { nullable: true }], ['app_user_id', { nullable: true }]]));
    const rc2 = buildAccountDeletePlan(ctx, withAppUser).map((s) => ({ name: s.name, ...dialect.sqlToQuery(s.query) }))
      .find((q) => q.name === 'revenuecat_events_anonymised');
    check(!!rc2 && /UPDATE revenuecat_events SET user_id = NULL, app_user_id = NULL WHERE user_id = \$1::uuid OR \(user_id IS NULL AND lower\(app_user_id\) IN \(\$2, \$3\)\)/.test(rc2.sql),
      'plan (0018 + app_user_id): their purchase rows lose user_id AND app_user_id; unlinked rows lose app_user_id when it is one of their addresses or their id',
      rc2?.sql);
    check(!!rc2 && JSON.stringify(rc2.params) === JSON.stringify([id, emails[0], id.toLowerCase()]),
      'plan (0018 + app_user_id): bound only to their id and their own addresses (a row tied to another account is never touched)', rc2?.params);
    const noAddress = buildAccountDeletePlan({ userId: id, emails: [] }, withAppUser).map((s) => ({ name: s.name, ...dialect.sqlToQuery(s.query) }))
      .find((q) => q.name === 'revenuecat_events_anonymised');
    check(!!noAddress && /lower\(app_user_id\) IN \(\$2\)\)/.test(noAddress.sql) && JSON.stringify(noAddress.params) === JSON.stringify([id, id]),
      'plan (0018 + app_user_id): an account with no address still clears unlinked rows holding its id', noAddress);

    const before0019 = buildAccountDeletePlan(ctx, allColumns(false)).map((s) => ({ name: s.name, ...dialect.sqlToQuery(s.query) }));
    const ref0 = before0019.find((q) => q.name.startsWith('referrals_as_referrer'));
    check(ref0?.name === 'referrals_as_referrer_deleted' && /DELETE FROM referrals WHERE referrer_user_id = \$1::uuid/.test(ref0.sql),
      'plan (before 0019, column NOT NULL): those rows deleted instead (what the cascade did), so the transaction never fails', ref0);

    const col = (name: string, nullable: boolean) => new Map<string, { nullable: boolean }>([[name, { nullable }]]);
    const sparse: ColumnMap = new Map([
      ['user_profiles', col('id', false)],
      ['coin_events', col('user_id', false)],
      ['support_messages', col('user_id', true)],
    ]);
    const small = buildAccountDeletePlan({ userId: id, emails: [] }, sparse).map((s) => s.name);
    check(JSON.stringify(small) === JSON.stringify(['coin_events', 'support_messages', 'user_profiles']),
      'plan: tables / columns missing from the database are skipped (inventory, bridge_clicks, …)', small);
  }

  // ═══ The store around the plan (a fake database: the SQL is rendered, nothing runs) ═══
  {
    const dialect = new PgDialect();
    type CatalogueRow = { table_name: string; column_name: string; is_nullable: string };
    const fakeDb = (catalogue: CatalogueRow[], profile: { email: string | null; auth_id: string | null } | null) => {
      const batches: string[][] = [];
      const reads: string[] = [];
      const db = {
        execute(q: SQL) {
          const text = dialect.sqlToQuery(q).sql.replace(/\s+/g, ' ').trim();
          let rows: unknown[] = [{ n: 1 }];
          if (/^SELECT email, auth_id FROM user_profiles WHERE id = \$1::uuid LIMIT 1$/.test(text)) {
            reads.push('profile');
            rows = profile ? [profile] : [];
          } else if (/information_schema\.columns/.test(text)) {
            reads.push('catalogue');
            rows = catalogue;
          }
          return Object.assign(Promise.resolve({ rows }), { text });
        },
        async batch(queries: Array<Promise<unknown> & { text: string }>) {
          batches.push(queries.map((q) => q.text));
          return Promise.all(queries);
        },
      };
      return { store: createAccountDeleteStore(db as unknown as Db), batches, reads };
    };
    const cat = (table: string, column: string, nullable = false): CatalogueRow =>
      ({ table_name: table, column_name: column, is_nullable: nullable ? 'YES' : 'NO' });
    const aliceRow = { email: 'alice@example.com', auth_id: 'alice@example.com' };

    const ok = fakeDb([
      cat('user_profiles', 'id'), cat('coin_events', 'user_id'),
      cat('support_messages', 'user_id', true), cat('support_messages', 'user_email', true),
    ], aliceRow);
    const summary = await ok.store.deleteAccount(ALICE_ID);
    check(ok.batches.length === 1 && ok.batches[0].length === 3
      && /DELETE FROM user_profiles WHERE id = \$1::uuid/.test(ok.batches[0][2])
      && JSON.stringify(summary?.rows) === JSON.stringify({ coin_events: 1, support_messages: 1, user_profiles: 1 }),
      'store: reads the profile and the catalogue, then sends the whole plan as ONE batch (one transaction)', { batches: ok.batches, summary });

    for (const [label, catalogue] of [
      ['an empty catalogue answer', [] as CatalogueRow[]],
      ['a catalogue answer without user_profiles', [cat('coin_events', 'user_id')]],
    ] as const) {
      const bad = fakeDb([...catalogue], aliceRow);
      let message = '';
      try { await bad.store.deleteAccount(ALICE_ID); } catch (err) { message = err instanceof Error ? err.message : String(err); }
      check(/catalogue/.test(message) && bad.batches.length === 0,
        `store: ${label} → error (500), nothing deleted (never a partial plan that leaves email rows behind)`, { message, batches: bad.batches.length });
    }

    const gone = fakeDb([cat('user_profiles', 'id')], null);
    check((await gone.store.deleteAccount(ALICE_ID)) === null && gone.batches.length === 0 && gone.reads.join() === 'profile',
      'store: no such account → null (already deleted), no catalogue read, no batch');
    const notUuid = fakeDb([cat('user_profiles', 'id')], aliceRow);
    check((await notUuid.store.deleteAccount("x' OR 1=1 --")) === null && notUuid.reads.length === 0 && notUuid.batches.length === 0,
      'store: an id that is not a uuid never reaches the database');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
