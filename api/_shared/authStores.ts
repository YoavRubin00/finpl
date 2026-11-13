// api/_shared/authStores.ts
//
// Storage for email sign-in codes and for the durable (cross-instance) auth
// throttles. The interfaces let scripts/test-auth-verify.ts run the real
// verify / email-code logic against an in-memory implementation.

import { createHash } from 'crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { authRateLimits, emailLoginCodes } from '../../src/db/schema';

export interface StoredEmailCode {
  codeHash: string;
  expiresAtMs: number;
  /** Guesses recorded so far (including the one just registered, when returned by registerAttempt). */
  attempts: number;
  lastSentAtMs: number;
}

export interface EmailCodeStore {
  /**
   * Replace the address's code (attempts reset to 0) unless one was sent less
   * than `cooldownSec` ago. Returns false when the cooldown blocked it.
   * Atomic: two concurrent requests can't both issue a code.
   */
  issue(email: string, codeHash: string, expiresAtMs: number, nowMs: number, cooldownSec: number): Promise<boolean>;
  get(email: string): Promise<StoredEmailCode | null>;
  /** Atomically count one guess and return the row after the increment (null = no code on file). */
  registerAttempt(email: string): Promise<StoredEmailCode | null>;
  /** Delete the row if it still holds this hash. True only for the one caller that consumed it. */
  consume(email: string, codeHash: string): Promise<boolean>;
  remove(email: string): Promise<void>;
  /** Drop rows that expired more than a day ago (housekeeping). */
  purgeExpired(nowMs: number): Promise<void>;
}

export interface RateLimitStore {
  /** Count one hit for `key` in a fixed window; returns the count so far and when the window resets. */
  hit(key: string, windowSec: number, nowMs: number): Promise<{ count: number; resetAtMs: number }>;
  purgeOld(nowMs: number): Promise<void>;
}

/** Throttle keys never hold a raw IP or email. */
export function throttleKey(scope: string, value: string): string {
  return `${scope}:${createHash('sha256').update(value).digest('hex').slice(0, 40)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function createPgEmailCodeStore(db: NeonHttpDatabase): EmailCodeStore {
  const toStored = (row: typeof emailLoginCodes.$inferSelect): StoredEmailCode => ({
    codeHash: row.codeHash,
    expiresAtMs: row.expiresAt.getTime(),
    attempts: row.attempts,
    lastSentAtMs: row.lastSentAt.getTime(),
  });

  return {
    async issue(email, codeHash, expiresAtMs, nowMs, cooldownSec) {
      const now = new Date(nowMs);
      const cooldownCutoff = new Date(nowMs - cooldownSec * 1000);
      const rows = await db
        .insert(emailLoginCodes)
        .values({ email, codeHash, expiresAt: new Date(expiresAtMs), attempts: 0, lastSentAt: now, createdAt: now })
        .onConflictDoUpdate({
          target: emailLoginCodes.email,
          set: { codeHash, expiresAt: new Date(expiresAtMs), attempts: 0, lastSentAt: now },
          setWhere: lt(emailLoginCodes.lastSentAt, cooldownCutoff),
        })
        .returning({ email: emailLoginCodes.email });
      return rows.length > 0;
    },

    async get(email) {
      const rows = await db.select().from(emailLoginCodes).where(eq(emailLoginCodes.email, email)).limit(1);
      return rows[0] ? toStored(rows[0]) : null;
    },

    async registerAttempt(email) {
      const rows = await db
        .update(emailLoginCodes)
        .set({ attempts: sql`${emailLoginCodes.attempts} + 1` })
        .where(eq(emailLoginCodes.email, email))
        .returning();
      return rows[0] ? toStored(rows[0]) : null;
    },

    async consume(email, codeHash) {
      const rows = await db
        .delete(emailLoginCodes)
        .where(and(eq(emailLoginCodes.email, email), eq(emailLoginCodes.codeHash, codeHash)))
        .returning({ email: emailLoginCodes.email });
      return rows.length > 0;
    },

    async remove(email) {
      await db.delete(emailLoginCodes).where(eq(emailLoginCodes.email, email));
    },

    async purgeExpired(nowMs) {
      await db.delete(emailLoginCodes).where(lt(emailLoginCodes.expiresAt, new Date(nowMs - DAY_MS)));
    },
  };
}

export function createPgRateLimitStore(db: NeonHttpDatabase): RateLimitStore {
  return {
    async hit(key, windowSec, nowMs) {
      const nowIso = new Date(nowMs).toISOString();
      const cutoffIso = new Date(nowMs - windowSec * 1000).toISOString();
      // One statement: a new window starts when the stored one is older than
      // windowSec; otherwise the count goes up. Both CASEs read the OLD row.
      const rows = await db
        .insert(authRateLimits)
        .values({ key, windowStart: new Date(nowMs), count: 1 })
        .onConflictDoUpdate({
          target: authRateLimits.key,
          set: {
            count: sql`CASE WHEN ${authRateLimits.windowStart} <= ${cutoffIso}::timestamptz THEN 1 ELSE ${authRateLimits.count} + 1 END`,
            windowStart: sql`CASE WHEN ${authRateLimits.windowStart} <= ${cutoffIso}::timestamptz THEN ${nowIso}::timestamptz ELSE ${authRateLimits.windowStart} END`,
          },
        })
        .returning({ count: authRateLimits.count, windowStart: authRateLimits.windowStart });
      const row = rows[0];
      if (!row) return { count: 1, resetAtMs: nowMs + windowSec * 1000 };
      return { count: row.count, resetAtMs: row.windowStart.getTime() + windowSec * 1000 };
    },

    async purgeOld(nowMs) {
      await db.delete(authRateLimits).where(lt(authRateLimits.windowStart, new Date(nowMs - DAY_MS)));
    },
  };
}
