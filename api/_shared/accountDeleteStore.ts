// api/_shared/accountDeleteStore.ts
//
// Neon wiring for POST /api/account/delete (handler: accountDelete.ts).
//
// Everything runs as ONE batch = one transaction: either the whole account is
// gone or nothing changed. The rows are deleted explicitly, children first, and
// the profile last, instead of relying on ON DELETE CASCADE alone: that keeps
// the result right even where production drifted from the migrations, and a
// table that blocks the delete (an unknown foreign key without CASCADE) fails
// the whole transaction loudly (500, constraint name in the log) instead of
// leaving half an account behind.
//
// A table or column that doesn't exist in this database is skipped (the plan is
// built from information_schema), so the code is safe before and after
// src/db/0019_referrals_keep_referee_row.sql and on databases missing an
// optional table (inventory, bridge_clicks, ...).
//
// Plan (rows = the deleted user's, matched by user id, or by their email where
// the table has no user id):
//   content_reports         delete: reports they filed + reports about their
//                           shares/comments (which are deleted below)
//   portfolio_comments      delete: theirs + others' comments on their shares
//   portfolio_likes         delete: theirs + others' likes on their shares
//   portfolio_ratings       delete: theirs + others' ratings of their shares
//   shared_portfolios       delete (rows carry their email + name)
//   trade_room_messages     delete (their messages + display name)
//   user_blocks             delete (both directions)
//   friendships             delete (both directions)
//   referrals (as referee)  delete their "invited by X" row. The referrer keeps
//                           what they earned: their own coin_events and
//                           dividend_collections rows are untouched.
//   referrals (as referrer) the rows of the friends they invited: anonymised
//                           (referrer_user_id NULL, invite_code 'DELETED') once
//                           0019 makes the column nullable, so those friends
//                           keep "already redeemed" and can't redeem a second
//                           invite; deleted before 0019 (what the cascade did).
//   dividend_collections, coin_events, crowd_bets, crowd_question_votes,
//   breaking_news_tracked, paper_trades, paper_portfolio, module_progress,
//   ai_mentor_usage, user_stats, user_feedback, parental_consents, inventory
//                           delete
//   support_messages        delete (their messages; also rows sent with their
//                           email and no user id)
//   bridge_clicks           anonymise (user_id and user_email NULL; the
//                           benefit/action/time stay for partner totals)
//   email_login_codes       delete (a pending sign-in code for their address)
//   user_profiles           delete (email, names, provider subjects, invite
//                           code, preferences, economy, email-drip state)
// Nothing kept identifies the person.
//
// Left alone on purpose: auth_rate_limits. Its rows are fixed-window counters
// keyed by sha256(address) that expire within 24 hours and are purged; letting
// account deletion reset them would let it reset the abuse throttles too.

import { sql, type SQL } from 'drizzle-orm';
import { normalizeEmail } from './authProof';
import type { CallerDeps } from './callerAuth';
import type { AccountDeleteDeps, AccountDeleteStore } from './accountDelete';
import { getDb, type Db } from './db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tables with a plain `user_id` column whose rows are deleted. */
const USER_ID_TABLES = [
  'dividend_collections',
  'coin_events',
  'crowd_bets',
  'crowd_question_votes',
  'breaking_news_tracked',
  'paper_trades',
  'paper_portfolio',
  'module_progress',
  'ai_mentor_usage',
  'user_stats',
  'user_feedback',
  'parental_consents',
  'inventory',
] as const;

export const ACCOUNT_DELETE_TABLES = [
  'content_reports',
  'portfolio_comments',
  'portfolio_likes',
  'portfolio_ratings',
  'shared_portfolios',
  'trade_room_messages',
  'user_blocks',
  'friendships',
  'referrals',
  ...USER_ID_TABLES,
  'support_messages',
  'bridge_clicks',
  'email_login_codes',
  'user_profiles',
] as const;

/** table → column → is it nullable. Only what exists in this database. */
export type ColumnMap = Map<string, Map<string, { nullable: boolean }>>;

export interface AccountDeleteContext {
  userId: string;
  /** Normalized (trimmed, lowercased) addresses from the profile. */
  emails: string[];
}

export interface AccountDeleteStep {
  /** Key in the summary (counts only). */
  name: string;
  /** Returns one row { n } = rows deleted or anonymised. */
  query: SQL;
}

/** The profile's addresses: its email and an email-shaped auth_id. */
export function profileEmails(profile: { email: string | null; authId: string | null }): string[] {
  const out = new Set<string>();
  for (const raw of [profile.email, profile.authId]) {
    const email = normalizeEmail(raw);
    if (email) out.add(email);
  }
  return [...out];
}

function counted(statement: SQL): SQL {
  return sql`WITH d AS (${statement} RETURNING 1) SELECT count(*)::int AS n FROM d`;
}

function anyOf(conditions: SQL[]): SQL {
  return sql.join(conditions, sql` OR `);
}

function list(values: string[]): SQL {
  return sql.join(values.map((v) => sql`${v}`), sql`, `);
}

/**
 * The statements, in order. Pure (no database), so the test can render them
 * and check every one is scoped to the caller.
 */
export function buildAccountDeletePlan(ctx: AccountDeleteContext, columns: ColumnMap): AccountDeleteStep[] {
  const id = sql`${ctx.userId}::uuid`;
  const has = (table: string, ...cols: string[]) => {
    const t = columns.get(table);
    return !!t && cols.every((c) => t.has(c));
  };
  const emails = ctx.emails.length > 0 ? list(ctx.emails) : null;
  const steps: AccountDeleteStep[] = [];
  const add = (name: string, statement: SQL) => steps.push({ name, query: counted(statement) });

  const theirShares = has('shared_portfolios', 'id', 'user_id')
    ? sql`SELECT id FROM shared_portfolios WHERE user_id = ${id}`
    : null;
  const theirComments = has('portfolio_comments', 'id', 'author_user_id')
    ? sql`SELECT id FROM portfolio_comments WHERE author_user_id = ${id}`
    : null;

  if (has('content_reports', 'reporter_user_id')) {
    const conds = [sql`reporter_user_id = ${id}`];
    if (has('content_reports', 'target_type', 'target_id')) {
      if (theirShares) conds.push(sql`(target_type = 'portfolio' AND target_id IN (${theirShares}))`);
      if (theirComments) conds.push(sql`(target_type = 'comment' AND target_id IN (${theirComments}))`);
    }
    add('content_reports', sql`DELETE FROM content_reports WHERE ${anyOf(conds)}`);
  }

  // Reactions on their shares go with the shares; their own reactions anywhere go too.
  const reactions: Array<[string, string]> = [
    ['portfolio_comments', 'author_user_id'],
    ['portfolio_likes', 'user_id'],
    ['portfolio_ratings', 'rater_user_id'],
  ];
  for (const [table, userCol] of reactions) {
    if (!has(table, userCol)) continue;
    const conds = [sql`${sql.identifier(userCol)} = ${id}`];
    if (theirShares && has(table, 'portfolio_id')) conds.push(sql`portfolio_id IN (${theirShares})`);
    add(table, sql`DELETE FROM ${sql.identifier(table)} WHERE ${anyOf(conds)}`);
  }

  if (has('shared_portfolios', 'user_id')) add('shared_portfolios', sql`DELETE FROM shared_portfolios WHERE user_id = ${id}`);
  if (has('trade_room_messages', 'user_id')) add('trade_room_messages', sql`DELETE FROM trade_room_messages WHERE user_id = ${id}`);

  const pairs: Array<[string, string, string]> = [
    ['user_blocks', 'blocker_user_id', 'blocked_user_id'],
    ['friendships', 'requester_id', 'addressee_id'],
  ];
  for (const [table, a, b] of pairs) {
    const conds: SQL[] = [];
    if (has(table, a)) conds.push(sql`${sql.identifier(a)} = ${id}`);
    if (has(table, b)) conds.push(sql`${sql.identifier(b)} = ${id}`);
    if (conds.length > 0) add(table, sql`DELETE FROM ${sql.identifier(table)} WHERE ${anyOf(conds)}`);
  }

  if (has('referrals', 'referee_user_id')) {
    add('referrals_as_referee', sql`DELETE FROM referrals WHERE referee_user_id = ${id}`);
  }
  if (has('referrals', 'referrer_user_id')) {
    const nullable = columns.get('referrals')?.get('referrer_user_id')?.nullable === true;
    if (nullable) {
      const code = has('referrals', 'invite_code') ? sql`, invite_code = 'DELETED'` : sql``;
      add('referrals_as_referrer_anonymised',
        sql`UPDATE referrals SET referrer_user_id = NULL${code} WHERE referrer_user_id = ${id}`);
    } else {
      add('referrals_as_referrer_deleted', sql`DELETE FROM referrals WHERE referrer_user_id = ${id}`);
    }
  }

  for (const table of USER_ID_TABLES) {
    if (has(table, 'user_id')) add(table, sql`DELETE FROM ${sql.identifier(table)} WHERE user_id = ${id}`);
  }

  // Rows carrying only an email: matched by address ONLY when they belong to
  // no account (user_id NULL). A row tied to another account is never touched,
  // even if its address differs from theirs only in case (legacy duplicates).
  for (const [table, name, mode] of [
    ['support_messages', 'support_messages', 'delete'],
    ['bridge_clicks', 'bridge_clicks_anonymised', 'anonymise'],
  ] as const) {
    const conds: SQL[] = [];
    const hasUserId = has(table, 'user_id');
    if (hasUserId) conds.push(sql`user_id = ${id}`);
    if (emails && has(table, 'user_email')) {
      conds.push(hasUserId
        ? sql`(user_id IS NULL AND lower(user_email) IN (${emails}))`
        : sql`lower(user_email) IN (${emails})`);
    }
    if (conds.length === 0) continue;
    if (mode === 'delete') {
      add(name, sql`DELETE FROM ${sql.identifier(table)} WHERE ${anyOf(conds)}`);
    } else {
      const sets: SQL[] = [];
      if (hasUserId) sets.push(sql`user_id = NULL`);
      if (has(table, 'user_email')) sets.push(sql`user_email = NULL`);
      add(name, sql`UPDATE ${sql.identifier(table)} SET ${sql.join(sets, sql`, `)} WHERE ${anyOf(conds)}`);
    }
  }

  // A pending sign-in code for their address (an HMAC of the code + expiry).
  if (emails && has('email_login_codes', 'email')) {
    add('email_login_codes', sql`DELETE FROM email_login_codes WHERE email IN (${emails})`);
  }

  add('user_profiles', sql`DELETE FROM user_profiles WHERE id = ${id}`);
  return steps;
}

/** neon-http's db.execute returns { rows }; older paths saw a bare array. */
function rowsOf<T>(result: unknown): T[] {
  const withRows = result as { rows?: unknown };
  if (Array.isArray(withRows?.rows)) return withRows.rows as T[];
  return Array.isArray(result) ? (result as T[]) : [];
}

async function loadColumns(db: Db): Promise<ColumnMap> {
  const result = await db.execute(sql`
    SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name IN (${list([...ACCOUNT_DELETE_TABLES])})
  `);
  const map: ColumnMap = new Map();
  for (const row of rowsOf<{ table_name: string; column_name: string; is_nullable: string }>(result)) {
    let cols = map.get(row.table_name);
    if (!cols) {
      cols = new Map();
      map.set(row.table_name, cols);
    }
    cols.set(row.column_name, { nullable: row.is_nullable === 'YES' });
  }
  return map;
}

export function createAccountDeleteStore(db: Db): AccountDeleteStore {
  return {
    async deleteAccount(userId) {
      if (!UUID_RE.test(userId)) return null;
      const profile = rowsOf<{ email: string | null; auth_id: string | null }>(await db.execute(sql`
        SELECT email, auth_id FROM user_profiles WHERE id = ${userId}::uuid LIMIT 1
      `))[0];
      if (!profile) return null;

      const emails = profileEmails({ email: profile.email, authId: profile.auth_id });
      const plan = buildAccountDeletePlan({ userId, emails }, await loadColumns(db));
      const queries = plan.map((step) => db.execute(step.query));
      const results = await db.batch(queries as [(typeof queries)[number], ...(typeof queries)[number][]]);

      const rows: Record<string, number> = {};
      plan.forEach((step, i) => {
        rows[step.name] = Number(rowsOf<{ n: number | string }>(results[i])[0]?.n) || 0;
      });
      return { rows };
    },
  };
}

export function createAccountDeleteDeps(): AccountDeleteDeps {
  const db = getDb();
  const caller: CallerDeps = {
    async profileEmail(userId) {
      if (!UUID_RE.test(userId)) return null;
      const row = rowsOf<{ email: string | null }>(await db.execute(sql`
        SELECT email FROM user_profiles WHERE id = ${userId}::uuid LIMIT 1
      `))[0];
      return row?.email ?? null;
    },
  };
  return { ...caller, store: createAccountDeleteStore(db) };
}
