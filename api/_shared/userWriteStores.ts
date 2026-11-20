// api/_shared/userWriteStores.ts
//
// Production (Neon) wiring for the session-checked endpoints:
// userPing.ts, coinGrants.ts, referralRegisterCode.ts, referral.ts,
// paperTrade.ts. scripts/test-user-write-auth.ts runs the same handlers with
// in-memory fakes.

import { eq, sql, type SQL } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { createPgRateLimitStore } from './authStores';
import type { CallerDeps } from './callerAuth';
import type { CoinGrantDeps, CoinGrantStore, GrantTarget } from './coinGrants';
import { getDb, type Db } from './db';
import type { PaperTradeStore, TradeDeps } from './paperTrade';
import { capturePostHog } from './posthogCapture';
import type { ReferralDeps, ReferralFriend, ReferralStore } from './referral';
import type { ReferralCodeStore, RegisterCodeDeps } from './referralRegisterCode';
import type { PingDeps, PingStore } from './userPing';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// UTC calendar day boundaries, as dividend_collections.date_collected uses.
const TODAY_UTC = sql`(date_trunc('day', now() AT TIME ZONE 'UTC'))::date`;

function referralStore(db: Db): ReferralStore {
  return {
    async snapshot(userId) {
      if (!UUID_RE.test(userId)) return null;
      const me = rowsOf<{ referral_code: string | null }>(await db.execute(sql`
        SELECT referral_code FROM user_profiles WHERE id = ${userId}::uuid LIMIT 1
      `))[0];
      if (!me) return null;

      // One batch (one HTTP round trip, one transaction), same SQL as before
      // except the friend key: an md5 of the pair instead of the friend's
      // auth_id (= their email). Referral rows whose referrer deleted their
      // account have referrer_user_id NULL (0019) and never match.
      const [friendsResult, todayResult, bonusResult] = await db.batch([
        db.execute(sql`
          SELECT
            substr(md5(r.referee_user_id::text || ':' || r.referrer_user_id::text), 1, 20) AS friend_key,
            ref.display_name  AS display_name,
            r.linked_at       AS linked_at,
            COALESCE((
              SELECT SUM(ce.amount)::int
                FROM coin_events ce
               WHERE ce.user_id = r.referee_user_id
                 AND ce.source IN ('lesson','quiz','daily-quest')
                 AND ce.granted_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day')
                 AND ce.granted_at <  date_trunc('day', now() AT TIME ZONE 'UTC')
            ), 0) AS yesterday_learning_coins
          FROM referrals r
          LEFT JOIN user_profiles ref ON ref.id = r.referee_user_id
          WHERE r.referrer_user_id = ${userId}::uuid
          ORDER BY r.linked_at DESC
        `),
        db.execute(sql`
          SELECT 1 AS hit FROM dividend_collections
           WHERE user_id = ${userId}::uuid AND date_collected = ${TODAY_UTC}
           LIMIT 1
        `),
        db.execute(sql`
          WITH credited AS (
            UPDATE referrals
               SET referrer_local_credited = true
             WHERE referrer_user_id = ${userId}::uuid
               AND referrer_local_credited = false
            RETURNING 1
          )
          SELECT COUNT(*)::int AS n FROM credited
        `),
      ]);

      const friends: ReferralFriend[] = rowsOf<{
        friend_key: string;
        display_name: string | null;
        linked_at: string | Date;
        yesterday_learning_coins: number | string;
      }>(friendsResult).map((row) => ({
        key: row.friend_key,
        displayName: row.display_name ?? null,
        linkedAt: typeof row.linked_at === 'string' ? row.linked_at : row.linked_at.toISOString(),
        yesterdayLearningCoins: Number(row.yesterday_learning_coins) || 0,
      }));
      return {
        referralCode: me.referral_code ?? null,
        friends,
        alreadyCollectedToday: rowsOf(todayResult).length > 0,
        newlyCreditedReferrals: Number(rowsOf<{ n: number | string }>(bonusResult)[0]?.n) || 0,
      };
    },

    async friendsYesterdayLearningCoins(userId) {
      if (!UUID_RE.test(userId)) return null;
      const row = rowsOf<{ has_user: boolean; total: number | string }>(await db.execute(sql`
        SELECT
          EXISTS (SELECT 1 FROM user_profiles WHERE id = ${userId}::uuid) AS has_user,
          COALESCE((
            SELECT SUM(ce.amount)
              FROM referrals r
              JOIN coin_events ce
                ON ce.user_id = r.referee_user_id
               AND ce.source IN ('lesson','quiz','daily-quest')
               AND ce.granted_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day')
               AND ce.granted_at <  date_trunc('day', now() AT TIME ZONE 'UTC')
             WHERE r.referrer_user_id = ${userId}::uuid
          ), 0)::int AS total
      `))[0];
      if (!row || !row.has_user) return null;
      return Number(row.total) || 0;
    },

    async recordDividend(userId, amount) {
      // The PK (user_id, date_collected) is the once-a-day gate; a 0 amount
      // records the "checked today" row with no coin event (as before).
      const result = await db.execute(sql`
        WITH inserted AS (
          INSERT INTO dividend_collections (user_id, date_collected, amount)
          VALUES (${userId}::uuid, ${TODAY_UTC}, ${amount})
          ON CONFLICT (user_id, date_collected) DO NOTHING
          RETURNING user_id
        ),
        granted AS (
          INSERT INTO coin_events (user_id, amount, source)
          SELECT user_id, ${amount}, 'referral-dividend' FROM inserted WHERE ${amount} > 0
          RETURNING 1
        )
        SELECT (SELECT count(*) FROM inserted)::int AS n
      `);
      return Number(rowsOf<{ n: number | string }>(result)[0]?.n) > 0 ? 'recorded' : 'already';
    },

    async findReferrerByCode(code) {
      const row = rowsOf<{ id: string }>(await db.execute(sql`
        SELECT id FROM user_profiles WHERE referral_code = ${code} LIMIT 1
      `))[0];
      return row ? { userId: row.id } : null;
    },

    async redeem(refereeUserId, referrerUserId, code, bonus) {
      if (!UUID_RE.test(refereeUserId)) return 'no_referee';
      // One statement. The referrals PK (referee_user_id) allows one
      // redemption per account, ever: a second one inserts nothing, so no
      // bonus rows either. A missing profile on either side inserts nothing.
      const row = rowsOf<{ has_me: number | string; has_ref: number | string; inserted: number | string }>(await db.execute(sql`
        WITH me AS (
          SELECT id FROM user_profiles WHERE id = ${refereeUserId}::uuid
        ),
        ref AS (
          SELECT id FROM user_profiles WHERE id = ${referrerUserId}::uuid
        ),
        inserted AS (
          INSERT INTO referrals (referee_user_id, referrer_user_id, invite_code, signup_bonus_paid)
          SELECT me.id, ref.id, ${code}, true FROM me, ref
          ON CONFLICT DO NOTHING
          RETURNING referee_user_id, referrer_user_id
        ),
        bonus_referrer AS (
          INSERT INTO coin_events (user_id, amount, source)
          SELECT referrer_user_id, ${bonus}, 'referral-signup-bonus' FROM inserted
        ),
        bonus_referee AS (
          INSERT INTO coin_events (user_id, amount, source)
          SELECT referee_user_id, ${bonus}, 'referral-signup-bonus' FROM inserted
        )
        SELECT (SELECT count(*) FROM me)::int       AS has_me,
               (SELECT count(*) FROM ref)::int      AS has_ref,
               (SELECT count(*) FROM inserted)::int AS inserted
      `))[0];
      if (!row || Number(row.has_me) === 0) return 'no_referee';
      if (Number(row.has_ref) === 0) return 'no_referrer';
      return Number(row.inserted) > 0 ? 'redeemed' : 'already_redeemed';
    },

    async befriend(referrerUserId, refereeUserId) {
      await db.execute(sql`
        INSERT INTO friendships (requester_id, addressee_id, status, accepted_at)
        SELECT ${referrerUserId}::uuid, ${refereeUserId}::uuid, 'accepted', now()
        WHERE NOT EXISTS (
          SELECT 1 FROM friendships
          WHERE (requester_id = ${referrerUserId}::uuid AND addressee_id = ${refereeUserId}::uuid)
             OR (requester_id = ${refereeUserId}::uuid AND addressee_id = ${referrerUserId}::uuid)
        )
        ON CONFLICT (requester_id, addressee_id) DO NOTHING
      `);
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

export function createReferralDeps(): ReferralDeps {
  const db = getDb();
  return {
    ...callerDeps(db),
    store: referralStore(db),
    now: () => Date.now(),
    capture: capturePostHog,
  };
}

export function createTradeDeps(): TradeDeps {
  const db = getDb();
  return { ...callerDeps(db), store: paperTradeStore(db) };
}
