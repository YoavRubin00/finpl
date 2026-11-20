// api/_shared/economyStores.ts
//
// Production (Neon) wiring for the economy guard (economyGuard.ts), the
// server-checked Bridge redeem (bridgeRedeem.ts), the subscription sync
// (subscriptionSync.ts) and the RevenueCat webhook (revenueCatWebhook.ts).
// Raw SQL on purpose: the 0018 guard columns are not in src/db/schema.ts (see
// the migration). scripts/test-economy-sync.ts runs the same handlers with
// in-memory stores; the local Postgres harness runs this SQL.

import { eq, sql } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { sendBridgeAlert, sendUnmatchedPurchaseAlert } from './bridgeAlert';
import type { BridgeRedeemDeps, BridgeRedeemStore, RedeemOutcome } from './bridgeRedeem';
import type { CallerDeps } from './callerAuth';
import { getDb, type Db } from './db';
import {
  applyGuard,
  casBackoffMs,
  ECONOMY_LIMITS,
  GuardUnavailableError,
  MAX_CAS_ATTEMPTS,
  runGuarded,
  type EconomyDeps,
  type EconomyLimits,
  type EconomyRow,
  type EconomyStore,
  type GuardedRead,
} from './economyGuard';
import {
  pgErrorCode,
  PG_UNDEFINED_COLUMN as UNDEFINED_COLUMN,
  PG_UNDEFINED_TABLE as UNDEFINED_TABLE,
  PG_UNIQUE_VIOLATION as UNIQUE_VIOLATION,
} from './pgError';
import { capturePostHog } from './posthogCapture';
import { verifyProWithRevenueCat } from './revenueCatVerify';
import type {
  PurchaseCreditArgs,
  PurchaseCreditOutcome,
  RcWebhookDeps,
  UnmatchedPurchaseArgs,
  UnmatchedRecordOutcome,
} from './revenueCatWebhook';
import type { SubscriptionDeps, SubscriptionStore } from './subscriptionSync';

// Kept here too: tests and callers import it from this module.
export { pgErrorCode };

/** neon-http's db.execute returns { rows }; older paths saw a bare array. */
function rowsOf<T>(result: unknown): T[] {
  const withRows = result as { rows?: unknown };
  if (Array.isArray(withRows?.rows)) return withRows.rows as T[];
  return Array.isArray(result) ? (result as T[]) : [];
}

interface EconomySqlRow {
  xp: number | string | null;
  coins: number | string | null;
  gems: number | string | null;
  level: number | string | null;
  virtual_balance: string | number | null;
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toEconomy(r: EconomySqlRow): EconomyRow {
  return {
    xp: intOrNull(r.xp),
    coins: intOrNull(r.coins),
    gems: intOrNull(r.gems),
    level: intOrNull(r.level),
    virtualBalance: r.virtual_balance === null || r.virtual_balance === undefined ? '0' : String(r.virtual_balance),
  };
}

function callerDeps(db: Db): CallerDeps {
  return {
    async profileEmail(userId) {
      const rows = await db
        .select({ email: userProfiles.email })
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))
        .limit(1);
      return rows[0]?.email ?? null;
    },
  };
}

// ─── Economy ─────────────────────────────────────────────────────────────────

async function readEconomyRow(db: Db, userId: string): Promise<EconomyRow | null> {
  const result = await db.execute(sql`
    SELECT xp, coins, gems, level, virtual_balance FROM user_profiles WHERE id = ${userId}::uuid LIMIT 1
  `);
  const row = rowsOf<EconomySqlRow>(result)[0];
  return row ? toEconomy(row) : null;
}

export function economyStore(db: Db): EconomyStore {
  return {
    readEconomy: (userId) => readEconomyRow(db, userId),

    async hasPurchaseEvent(userId, gems, sinceMs) {
      try {
        const result = await db.execute(sql`
          SELECT 1 AS hit
            FROM revenuecat_events
           WHERE user_id = ${userId}::uuid
             AND gems = ${gems}::integer
             AND received_at >= ${new Date(sinceMs).toISOString()}::timestamptz
           LIMIT 1
        `);
        return rowsOf(result).length > 0;
      } catch (err) {
        if (pgErrorCode(err) === UNDEFINED_TABLE) return false;
        throw err;
      }
    },

    async read(userId) {
      let result: unknown;
      try {
        result = await db.execute(sql`
          SELECT xp, coins, gems, level, virtual_balance, economy_guard, economy_guard_version
            FROM user_profiles
           WHERE id = ${userId}::uuid
           LIMIT 1
        `);
      } catch (err) {
        if (pgErrorCode(err) === UNDEFINED_COLUMN) throw new GuardUnavailableError();
        throw err;
      }
      const row = rowsOf<EconomySqlRow & { economy_guard: unknown; economy_guard_version: number | string }>(result)[0];
      if (!row) return null;
      return {
        economy: toEconomy(row),
        state: row.economy_guard ?? null,
        version: intOrNull(row.economy_guard_version) ?? 0,
      };
    },

    async writeGuarded(userId, w) {
      const result = await db.execute(sql`
        UPDATE user_profiles
           SET coins = GREATEST(0, COALESCE(coins, 0) + ${w.coinChange}::integer),
               gems  = GREATEST(0, COALESCE(gems, 0) + ${w.gemChange}::integer),
               xp    = GREATEST(0, COALESCE(xp, 0) + ${w.xpChange}::integer),
               virtual_balance = COALESCE(${w.virtualBalanceSet ?? null}::numeric, virtual_balance),
               economy_guard = ${JSON.stringify(w.state)}::jsonb,
               economy_guard_version = economy_guard_version + 1,
               updated_at = now()
         WHERE id = ${userId}::uuid
           AND economy_guard_version = ${w.expectVersion}::integer
           AND coins IS NOT DISTINCT FROM ${w.expectCoins}::integer
           AND gems IS NOT DISTINCT FROM ${w.expectGems}::integer
        RETURNING xp, coins, gems, level, virtual_balance
      `);
      const row = rowsOf<EconomySqlRow>(result)[0];
      return row ? toEconomy(row) : 'conflict';
    },

    async writeSimple(userId, w) {
      // Only the columns this request changes (an XP-only reward must not
      // touch coins/gems, or it would make a concurrent guarded write retry).
      const sets = [sql`updated_at = now()`];
      if (w.coinChange !== 0) sets.push(sql`coins = GREATEST(0, COALESCE(coins, 0) + ${w.coinChange}::integer)`);
      if (w.gemChange !== 0) sets.push(sql`gems = GREATEST(0, COALESCE(gems, 0) + ${w.gemChange}::integer)`);
      if (w.xpChange !== 0) sets.push(sql`xp = GREATEST(0, COALESCE(xp, 0) + ${w.xpChange}::integer)`);
      if (w.virtualBalanceSet !== undefined) sets.push(sql`virtual_balance = ${w.virtualBalanceSet}::numeric`);
      const result = await db.execute(sql`
        UPDATE user_profiles
           SET ${sql.join(sets, sql`, `)}
         WHERE id = ${userId}::uuid
        RETURNING xp, coins, gems, level, virtual_balance
      `);
      const row = rowsOf<EconomySqlRow>(result)[0];
      return row ? toEconomy(row) : null;
    },
  };
}

export function createEconomyDeps(): EconomyDeps {
  return { store: economyStore(getDb()), now: () => Date.now() };
}

// ─── Bridge redeem ───────────────────────────────────────────────────────────

export function bridgeRedeemStore(db: Db): BridgeRedeemStore {
  const readEconomy = (userId: string) => readEconomyRow(db, userId);

  return {
    async redeem(userId, benefitId, costCoins, platform): Promise<RedeemOutcome> {
      let result: unknown;
      try {
        // One statement: the deduction, the redemption row and the stats row
        // happen together or not at all. A concurrent duplicate either sees
        // the committed row (prior) or hits the primary key (23505), which
        // aborts the whole statement, deduction included.
        // An older app build's 'redeem' report for this user and benefit
        // (bridge_clicks) also counts as redeemed: the user already paid on
        // that build, and a reinstall must not charge again. (Such a row is
        // unverified, but all it can do is skip a deduction for its own user.)
        result = await db.execute(sql`
          WITH prior AS (
            SELECT 1 AS x
              FROM bridge_redemptions
             WHERE user_id = ${userId}::uuid AND benefit_id = ${benefitId}::text
            UNION ALL
            SELECT 1 AS x
              FROM bridge_clicks
             WHERE user_id = ${userId}::uuid AND benefit_id = ${benefitId}::text AND action = 'redeem'
          ),
          upd AS (
            UPDATE user_profiles
               SET coins = coins - ${costCoins}::integer,
                   updated_at = now()
             WHERE id = ${userId}::uuid
               AND COALESCE(coins, 0) >= ${costCoins}::integer
               AND NOT EXISTS (SELECT 1 FROM prior)
            RETURNING id, email, xp, coins, gems, level, virtual_balance
          ),
          ins AS (
            INSERT INTO bridge_redemptions (user_id, benefit_id, cost_coins)
            SELECT id, ${benefitId}::text, ${costCoins}::integer FROM upd
            RETURNING 1
          ),
          click AS (
            INSERT INTO bridge_clicks (benefit_id, user_id, user_email, action, platform)
            SELECT ${benefitId}::text, id, email, 'redeem', ${platform}::text FROM upd
            RETURNING 1
          )
          SELECT upd.email, upd.xp, upd.coins, upd.gems, upd.level, upd.virtual_balance,
                 (SELECT count(*) FROM upd)::int   AS redeemed,
                 (SELECT count(*) FROM prior)::int AS prior_count,
                 (SELECT count(*) FROM ins)::int   AS inserted,
                 (SELECT count(*) FROM click)::int AS clicked
            FROM (SELECT 1) AS one
            LEFT JOIN upd ON true
        `);
      } catch (err) {
        const code = pgErrorCode(err);
        if (code === UNDEFINED_TABLE) return { kind: 'unavailable' };
        if (code === UNIQUE_VIOLATION) {
          const economy = await readEconomy(userId);
          return economy ? { kind: 'already', economy } : { kind: 'no_user' };
        }
        throw err;
      }
      const row = rowsOf<EconomySqlRow & { email: string | null; redeemed: number; prior_count: number }>(result)[0];
      if (row && Number(row.redeemed) > 0) {
        return { kind: 'redeemed', economy: toEconomy(row), email: row.email ?? null };
      }
      const economy = await readEconomy(userId);
      if (!economy) return { kind: 'no_user' };
      if (row && Number(row.prior_count) > 0) return { kind: 'already', economy };
      return { kind: 'insufficient', economy };
    },
  };
}

export function createBridgeRedeemDeps(): BridgeRedeemDeps {
  const db = getDb();
  return { ...callerDeps(db), store: bridgeRedeemStore(db), alert: sendBridgeAlert };
}

// ─── Subscription ────────────────────────────────────────────────────────────

const SUBSCRIPTION_COLUMNS = {
  isPro: userProfiles.isPro,
  proExpiresAt: userProfiles.proExpiresAt,
  proSource: userProfiles.proSource,
};

export function subscriptionStore(db: Db): SubscriptionStore {
  return {
    async read(userId) {
      const rows = await db
        .select({ ...SUBSCRIPTION_COLUMNS, email: userProfiles.email })
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))
        .limit(1);
      return rows[0] ?? null;
    },
    async write(userId, fields) {
      const set: Record<string, unknown> = {
        isPro: fields.isPro,
        proExpiresAt: fields.proExpiresAt,
        updatedAt: new Date().toISOString(),
      };
      if (fields.proSource !== undefined) set.proSource = fields.proSource;
      const rows = await db
        .update(userProfiles)
        .set(set)
        .where(eq(userProfiles.id, userId))
        .returning(SUBSCRIPTION_COLUMNS);
      return rows[0] ?? null;
    },
  };
}

export function createSubscriptionDeps(): SubscriptionDeps {
  return {
    store: subscriptionStore(getDb()),
    verify: (ids) => verifyProWithRevenueCat(ids),
    now: () => Date.now(),
  };
}

// ─── RevenueCat webhook ──────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** First candidate key (UUID → id, otherwise → exact email) that names a profile. */
export async function resolveProfileId(db: Db, keys: string[]): Promise<string | null> {
  for (const key of keys) {
    const rows = UUID_RE.test(key)
      ? await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(userProfiles.id, key)).limit(1)
      : key.includes('@')
        ? await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(userProfiles.email, key)).limit(1)
        : [];
    if (rows[0]?.id) return rows[0].id;
  }
  return null;
}

/** Gems added with no ledger (no event key, or no revenuecat_events table yet). */
async function creditGemsWithoutLedger(db: Db, args: PurchaseCreditArgs): Promise<PurchaseCreditOutcome> {
  await db.execute(sql`
    UPDATE user_profiles
       SET gems = COALESCE(gems, 0) + ${args.gems}::integer, updated_at = now()
     WHERE id = ${args.userId}::uuid
  `);
  return 'credited_without_dedupe';
}

/**
 * Credit purchased gems once per RevenueCat event: the ledger insert and the
 * gem update are one statement, and a redelivered event conflicts on the
 * primary key and credits nothing (two concurrent deliveries: the second
 * insert waits for the first and then does nothing). Before migration 0018 (no
 * ledger table) it credits without the duplicate check, as the webhook always did.
 */
export async function creditPurchaseGems(db: Db, args: PurchaseCreditArgs): Promise<PurchaseCreditOutcome> {
  if (!args.eventKey) return creditGemsWithoutLedger(db, args);
  try {
    const result = await db.execute(sql`
      WITH ev AS (
        INSERT INTO revenuecat_events (event_id, user_id, event_type, product_id, gems, coins)
        VALUES (${args.eventKey}::text, ${args.userId}::uuid, ${args.eventType}::text,
                ${args.productId}::text, ${args.gems}::integer, ${args.poolCoins}::integer)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      )
      UPDATE user_profiles
         SET gems = COALESCE(gems, 0) + ${args.gems}::integer, updated_at = now()
       WHERE id = ${args.userId}::uuid AND EXISTS (SELECT 1 FROM ev)
      RETURNING gems
    `);
    return rowsOf<{ gems: number }>(result).length > 0 ? 'credited' : 'duplicate';
  } catch (err) {
    if (pgErrorCode(err) === UNDEFINED_TABLE) return creditGemsWithoutLedger(db, args);
    throw err;
  }
}

export interface PoolCreditDeps {
  now(): number;
  sleep?(ms: number): Promise<void>;
  limits?: Readonly<EconomyLimits>;
  /** Defaults to economyStore(db) (the harness injects a racing one). */
  store?: EconomyStore;
  log?(line: Record<string, unknown>): void;
}

/**
 * A purchase that also funds the returns pool (the starter pack): the pool
 * credit lives in the guard state, so the ledger insert, the gems and the new
 * guard state are written by ONE compare-and-swap statement. Either all of it
 * lands once, or none of it does: a retry after 'busy' (or after any failure)
 * finds no ledger row and starts over; a redelivery after success finds the
 * row and changes nothing.
 *   'credited'  ledger row + gems + pool (+ any held coins it released)
 *   'duplicate' the event was already recorded (credited or not)
 *   'busy'      every compare-and-swap attempt missed: nothing written
 *   'no_user'   the profile is gone
 * Before 0018 (no guard columns) it falls back to creditPurchaseGems: gems
 * only, there is no pool to fund.
 */
export async function creditPurchaseWithPool(db: Db, args: PurchaseCreditArgs, deps: PoolCreditDeps): Promise<PurchaseCreditOutcome> {
  const store = deps.store ?? economyStore(db);
  const limits = deps.limits ?? ECONOMY_LIMITS;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  if (!args.eventKey) {
    // No event id to deduplicate on (RevenueCat always sends one): gems as
    // before, and the pool best-effort.
    const outcome = await creditGemsWithoutLedger(db, args);
    await runGuarded(args.userId, { xp: 0, coins: 0, gems: 0 }, { store, now: deps.now, sleep, limits }, 'webhook/revenuecat', { poolCredit: args.poolCoins });
    return outcome;
  }
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    let read: GuardedRead | null;
    try {
      read = await store.read(args.userId);
    } catch (err) {
      if (err instanceof GuardUnavailableError) return creditPurchaseGems(db, args);
      throw err;
    }
    if (!read) return 'no_user';
    const outcome = applyGuard(read.state, read.economy, { xp: 0, coins: 0, gems: 0 }, deps.now(), { poolCredit: args.poolCoins }, limits);
    let result: unknown;
    try {
      result = await db.execute(sql`
        WITH dup AS (
          SELECT 1 AS x FROM revenuecat_events WHERE event_id = ${args.eventKey}::text
        ),
        upd AS (
          UPDATE user_profiles
             SET gems = GREATEST(0, COALESCE(gems, 0) + ${args.gems + outcome.gemChange}::integer),
                 coins = GREATEST(0, COALESCE(coins, 0) + ${outcome.coinChange}::integer),
                 economy_guard = ${JSON.stringify(outcome.state)}::jsonb,
                 economy_guard_version = economy_guard_version + 1,
                 updated_at = now()
           WHERE id = ${args.userId}::uuid
             AND economy_guard_version = ${read.version}::integer
             AND coins IS NOT DISTINCT FROM ${read.economy.coins}::integer
             AND gems IS NOT DISTINCT FROM ${read.economy.gems}::integer
             AND NOT EXISTS (SELECT 1 FROM dup)
          RETURNING id
        ),
        ev AS (
          INSERT INTO revenuecat_events (event_id, user_id, event_type, product_id, gems, coins)
          SELECT ${args.eventKey}::text, id, ${args.eventType}::text, ${args.productId}::text,
                 ${args.gems}::integer, ${args.poolCoins}::integer
            FROM upd
          RETURNING event_id
        )
        SELECT (SELECT count(*) FROM dup)::int AS duplicate,
               (SELECT count(*) FROM upd)::int AS updated,
               (SELECT count(*) FROM ev)::int  AS recorded
      `);
    } catch (err) {
      const code = pgErrorCode(err);
      if (code === UNDEFINED_TABLE) return creditPurchaseGems(db, args);
      // A concurrent delivery of the same event inserted its row between this
      // statement's snapshot and its insert: the whole statement rolled back.
      if (code === UNIQUE_VIOLATION) return 'duplicate';
      throw err;
    }
    const r = rowsOf<{ duplicate: number; updated: number }>(result)[0];
    if (Number(r?.duplicate) > 0) return 'duplicate';
    if (Number(r?.updated) > 0) {
      if (outcome.reasons.length > 0) deps.log?.({ userId: args.userId, source: 'webhook/revenuecat', reasons: outcome.reasons, ...outcome.report });
      return 'credited';
    }
    await sleep(casBackoffMs(attempt));
  }
  deps.log?.({ userId: args.userId, source: 'webhook/revenuecat', reasons: ['cas_exhausted'], eventId: args.eventKey });
  return 'busy';
}

/**
 * A purchase the webhook could not credit: kept with user_id NULL and the raw
 * RevenueCat app_user_id, so it can be credited by hand. Once per event id.
 */
export async function recordUnmatchedPurchase(db: Db, args: UnmatchedPurchaseArgs): Promise<UnmatchedRecordOutcome> {
  try {
    const result = await db.execute(sql`
      INSERT INTO revenuecat_events (event_id, user_id, app_user_id, event_type, product_id, gems, coins)
      VALUES (${args.eventKey}::text, NULL, ${args.appUserId}::text, ${args.eventType}::text,
              ${args.productId}::text, ${args.gems}::integer, ${args.poolCoins}::integer)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `);
    return rowsOf(result).length > 0 ? 'recorded' : 'duplicate';
  } catch (err) {
    const code = pgErrorCode(err);
    if (code === UNDEFINED_TABLE || code === UNDEFINED_COLUMN) return 'unavailable';
    throw err;
  }
}

export function createRevenueCatWebhookDeps(): RcWebhookDeps {
  const db = getDb();
  const now = () => Date.now();
  return {
    now,
    resolveProfileId: (keys) => resolveProfileId(db, keys),
    creditPurchase: (args) =>
      args.poolCoins > 0
        ? creditPurchaseWithPool(db, args, { now, log: (line) => console.warn(`[economy-guard] ${JSON.stringify(line)}`) })
        : creditPurchaseGems(db, args),
    recordUnmatchedPurchase: (args) => recordUnmatchedPurchase(db, args),
    async grantPro(userId, { expiresAt, proSource }) {
      await db
        .update(userProfiles)
        .set({ isPro: true, proExpiresAt: expiresAt, proSource, updatedAt: new Date().toISOString() })
        .where(eq(userProfiles.id, userId));
    },
    async extendProForGrace(userId, graceExpiresAt) {
      // Never shortens: a later stored expiry (a renewal already processed, a
      // longer server grant) wins, and NULL (no expiry) stays NULL.
      await db.execute(sql`
        UPDATE user_profiles
           SET pro_expires_at = GREATEST(pro_expires_at, ${graceExpiresAt}::timestamptz),
               updated_at = now()
         WHERE id = ${userId}::uuid AND pro_expires_at IS NOT NULL
      `);
    },
    async expirePro(userId, eventExpiresAt) {
      // A late redelivery of an older period's EXPIRATION (the subscription
      // renewed since) must not take Pro away.
      const result = await db.execute(sql`
        UPDATE user_profiles
           SET is_pro = false, updated_at = now()
         WHERE id = ${userId}::uuid
           AND NOT (pro_expires_at IS NOT NULL
                    AND ${eventExpiresAt}::timestamptz IS NOT NULL
                    AND pro_expires_at > ${eventExpiresAt}::timestamptz)
        RETURNING id
      `);
      return rowsOf(result).length > 0 ? 'revoked' : 'skipped';
    },
    capture: capturePostHog,
    alertUnmatchedPurchase: sendUnmatchedPurchaseAlert,
  };
}
