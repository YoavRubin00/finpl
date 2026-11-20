// api/_shared/userWriteStores.ts
//
// Production (Neon) wiring for the session-checked write endpoints:
// userPing.ts, coinGrants.ts, referralRegisterCode.ts, paperTrade.ts.
// scripts/test-user-write-auth.ts runs the same handlers with in-memory fakes.

import { eq, sql, type SQL } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { createPgRateLimitStore } from './authStores';
import type { CallerDeps } from './callerAuth';
import type { CoinGrantDeps, CoinGrantStore, GrantTarget } from './coinGrants';
import { getDb, type Db } from './db';
import type { PaperTradeStore, TradeDeps } from './paperTrade';
import { capturePostHog } from './posthogCapture';
import type { ReferralCodeStore, RegisterCodeDeps } from './referralRegisterCode';
import type { PingDeps, PingStore } from './userPing';

/** neon-http's db.execute returns { rows }; older paths saw a bare array. */
function rowsOf<T>(result: unknown): T[] {
  const withRows = result as { rows?: unknown };
  if (Array.isArray(withRows?.rows)) return withRows.rows as T[];
  return Array.isArray(result) ? (result as T[]) : [];
}

function targetWhere(target: GrantTarget): SQL {
  return 'userId' in target ? sql`id = ${target.userId}::uuid` : sql`auth_id = ${target.authId}`;
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

function pingStore(db: Db): PingStore {
  return {
    async read(userId) {
      const rows = await db
        .select({
          currentStreak: userProfiles.currentStreak,
          longestStreak: userProfiles.longestStreak,
          lastActiveDate: userProfiles.lastActiveDate,
        })
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))
        .limit(1);
      return rows[0] ?? null;
    },
    async write(userId, next) {
      await db
        .update(userProfiles)
        .set({
          currentStreak: next.currentStreak,
          longestStreak: next.longestStreak,
          lastActiveDate: next.lastActiveDate,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userProfiles.id, userId));
    },
  };
}

function coinGrantStore(db: Db): CoinGrantStore {
  return {
    async insertWithinDailyCap(target, amount, source, capSources, maxPerDay) {
      const sources = sql.join(capSources.map((s) => sql`${s}`), sql`, `);
      const result = await db.execute(sql`
        WITH u AS (
          SELECT id FROM user_profiles WHERE ${targetWhere(target)} LIMIT 1
        ),
        spent AS (
          SELECT COALESCE(SUM(ce.amount), 0)::bigint AS total
            FROM coin_events ce
            JOIN u ON ce.user_id = u.id
           WHERE ce.source IN (${sources})
             AND ce.granted_at > now() - interval '24 hours'
        ),
        ins AS (
          INSERT INTO coin_events (user_id, amount, source)
          SELECT u.id, ${amount}, ${source}
            FROM u, spent
           WHERE spent.total + ${amount} <= ${maxPerDay}
          RETURNING 1
        )
        SELECT (SELECT count(*) FROM u)::int AS users,
               (SELECT count(*) FROM ins)::int AS inserted
      `);
      const row = rowsOf<{ users: number | string; inserted: number | string }>(result)[0];
      if (!row || Number(row.users) === 0) return 'no_user';
      return Number(row.inserted) > 0 ? 'inserted' : 'capped';
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  const code = (err as { code?: unknown } | null)?.code;
  return code === '23505' || msg.includes('unique') || msg.includes('duplicate');
}

function referralCodeStore(db: Db): ReferralCodeStore {
  return {
    async claim(target, code) {
      try {
        const result = await db.execute(sql`
          UPDATE user_profiles
             SET referral_code = ${code}
           WHERE ${targetWhere(target)}
             AND (referral_code IS NULL OR referral_code = ${code})
          RETURNING id, referral_code
        `);
        const row = rowsOf<{ id: string; referral_code: string | null }>(result)[0];
        return row ? { userId: row.id, code: row.referral_code } : null;
      } catch (err) {
        if (isUniqueViolation(err)) return 'collision';
        throw err;
      }
    },
    async current(target) {
      const result = await db.execute(sql`
        SELECT id, referral_code FROM user_profiles WHERE ${targetWhere(target)} LIMIT 1
      `);
      const row = rowsOf<{ id: string; referral_code: string | null }>(result)[0];
      return row ? { userId: row.id, code: row.referral_code } : null;
    },
  };
}

function paperTradeStore(db: Db): PaperTradeStore {
  return {
    async apply(userId, t) {
      // Each branch is ONE statement. balance_update returns the row only if
      // the profile exists; every other CTE reads from it, so a missing
      // profile writes nothing.
      const balanceUpdate = sql`
        balance_update AS (
          UPDATE user_profiles
             SET virtual_balance = virtual_balance + ${t.cashDelta},
                 updated_at      = now()
           WHERE id = ${userId}::uuid
          RETURNING id, virtual_balance
        ),
        ins_trade AS (
          INSERT INTO paper_trades (
            user_id, asset_symbol, asset_name, trade_type,
            quantity, price_at_execution, total_value
          )
          SELECT bu.id, ${t.assetSymbol}, ${t.assetName}, ${t.tradeType},
                 ${t.quantity}, ${t.priceAtExecution}, ${t.totalValue}
            FROM balance_update bu
          RETURNING 1
        )`;

      let result: unknown;
      if (t.tradeType === 'BUY' && !t.skipPortfolio) {
        result = await db.execute(sql`
          WITH ${balanceUpdate},
          upd_portfolio AS (
            INSERT INTO paper_portfolio (user_id, asset_symbol, asset_name, quantity, avg_buy_price)
            SELECT bu.id, ${t.assetSymbol}, ${t.assetName}, ${t.quantity}, ${t.priceAtExecution}
              FROM balance_update bu
            ON CONFLICT (user_id, asset_symbol) DO UPDATE SET
              asset_name    = COALESCE(EXCLUDED.asset_name, paper_portfolio.asset_name),
              quantity      = paper_portfolio.quantity + EXCLUDED.quantity,
              avg_buy_price = (
                paper_portfolio.quantity * paper_portfolio.avg_buy_price
                + EXCLUDED.quantity * EXCLUDED.avg_buy_price
              ) / NULLIF(paper_portfolio.quantity + EXCLUDED.quantity, 0),
              updated_at    = now()
            RETURNING 1
          )
          SELECT virtual_balance FROM balance_update
        `);
      } else if (t.tradeType === 'SELL') {
        // DELETE wins when the remaining quantity is <= 0, UPDATE otherwise.
        result = await db.execute(sql`
          WITH ${balanceUpdate},
          del_if_zero AS (
            DELETE FROM paper_portfolio
             WHERE user_id      = (SELECT id FROM balance_update)
               AND asset_symbol = ${t.assetSymbol}
               AND quantity - ${t.quantity} <= 0
          ),
          upd_portfolio AS (
            UPDATE paper_portfolio
               SET quantity   = quantity - ${t.quantity},
                   updated_at = now()
             WHERE user_id      = (SELECT id FROM balance_update)
               AND asset_symbol = ${t.assetSymbol}
               AND quantity - ${t.quantity} > 0
          )
          SELECT virtual_balance FROM balance_update
        `);
      } else {
        // BUY with skipPortfolio: closing a short — trade log + balance only.
        result = await db.execute(sql`
          WITH ${balanceUpdate}
          SELECT virtual_balance FROM balance_update
        `);
      }

      const row = rowsOf<{ virtual_balance: string | number }>(result)[0];
      return row ? { virtualBalance: String(row.virtual_balance) } : null;
    },
  };
}

export function createPingDeps(): PingDeps {
  const db = getDb();
  return { ...callerDeps(db), store: pingStore(db), now: () => Date.now() };
}

export function createCoinGrantDeps(): CoinGrantDeps {
  const db = getDb();
  return {
    ...callerDeps(db),
    store: coinGrantStore(db),
    rateLimits: createPgRateLimitStore(db),
    now: () => Date.now(),
  };
}

export function createRegisterCodeDeps(): RegisterCodeDeps {
  const db = getDb();
  return {
    ...callerDeps(db),
    store: referralCodeStore(db),
    rateLimits: createPgRateLimitStore(db),
    now: () => Date.now(),
    capture: capturePostHog,
  };
}

export function createTradeDeps(): TradeDeps {
  const db = getDb();
  return { ...callerDeps(db), store: paperTradeStore(db) };
}
