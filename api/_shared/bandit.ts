/**
 * Global multi-armed-bandit state, shared by both API trees:
 *   api/bandit/{state,event}.ts        (what production runs)
 *   app/api/bandit/{state,event}+api.ts (expo-router dev server)
 * so the two can never drift apart again. The logic here is the production
 * (api/) logic verbatim; only the plumbing moved.
 */
import { sql } from 'drizzle-orm';
import { banditVariants } from '../../src/db/schema';
import type { Db } from './db';
import { cdnCacheValue } from './cdnCache';

export interface BanditServerVariant {
  variantId: string;
  alpha: number;
  beta: number;
  impressions: number;
  conversions: number;
}

/** The posterior is a global aggregate that clients re-read every 5 minutes
 *  and on every foreground; a minute of staleness cannot change a Thompson
 *  sample in any meaningful way. 60s fresh at the CDN, then up to 10 minutes
 *  stale-while-revalidate (served instantly while one background request
 *  refreshes it). */
export const BANDIT_STATE_CDN_CACHE = cdnCacheValue(60, 600);

/** All variants of all experiments, grouped by experiment id. */
export async function loadBanditState(db: Db): Promise<Record<string, BanditServerVariant[]>> {
  const rows = await db
    .select({
      experimentId: banditVariants.experimentId,
      variantId: banditVariants.variantId,
      alpha: banditVariants.alpha,
      beta: banditVariants.beta,
      impressions: banditVariants.impressions,
      conversions: banditVariants.conversions,
    })
    .from(banditVariants);

  const experiments: Record<string, BanditServerVariant[]> = {};
  for (const row of rows) {
    const bucket = experiments[row.experimentId] ?? [];
    bucket.push({
      variantId: row.variantId,
      alpha: row.alpha,
      beta: row.beta,
      impressions: row.impressions,
      conversions: row.conversions,
    });
    experiments[row.experimentId] = bucket;
  }
  return experiments;
}

export type BanditEvent = 'impression' | 'conversion' | 'dismiss';

const ID_RE = /^[a-z0-9_-]{1,80}$/i;

function sanitizeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, 80) || undefined;
}

export type ParsedBanditEvent =
  | { ok: true; experimentId: string; variantId: string; event: BanditEvent }
  | { ok: false; error: string };

/** Validates a POST /api/bandit/event body (messages are part of the API). */
export function parseBanditEvent(body: unknown): ParsedBanditEvent {
  const b = (body ?? {}) as { experimentId?: unknown; variantId?: unknown; event?: unknown };
  const experimentId = sanitizeId(b.experimentId);
  const variantId = sanitizeId(b.variantId);
  const event = b.event;

  if (!experimentId || !variantId) {
    return { ok: false, error: 'Missing required fields' };
  }
  if (!ID_RE.test(experimentId) || !ID_RE.test(variantId)) {
    return { ok: false, error: 'Invalid experimentId or variantId' };
  }
  if (event !== 'impression' && event !== 'conversion' && event !== 'dismiss') {
    return { ok: false, error: 'Invalid event' };
  }
  return { ok: true, experimentId, variantId, event };
}

/** Atomic upsert-and-increment of one bandit event. */
export async function recordBanditEvent(
  db: Db,
  experimentId: string,
  variantId: string,
  event: BanditEvent,
): Promise<void> {
  const nowIso = new Date().toISOString();

  if (event === 'impression') {
    await db
      .insert(banditVariants)
      .values({
        experimentId,
        variantId,
        alpha: 1,
        beta: 1,
        impressions: 1,
        conversions: 0,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: [banditVariants.experimentId, banditVariants.variantId],
        set: {
          impressions: sql`${banditVariants.impressions} + 1`,
          updatedAt: nowIso,
        },
      });
  } else if (event === 'conversion') {
    await db
      .insert(banditVariants)
      .values({
        experimentId,
        variantId,
        alpha: 2,
        beta: 1,
        impressions: 0,
        conversions: 1,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: [banditVariants.experimentId, banditVariants.variantId],
        set: {
          alpha: sql`${banditVariants.alpha} + 1`,
          conversions: sql`${banditVariants.conversions} + 1`,
          updatedAt: nowIso,
        },
      });
  } else {
    await db
      .insert(banditVariants)
      .values({
        experimentId,
        variantId,
        alpha: 1,
        beta: 2,
        impressions: 0,
        conversions: 0,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: [banditVariants.experimentId, banditVariants.variantId],
        set: {
          beta: sql`${banditVariants.beta} + 1`,
          updatedAt: nowIso,
        },
      });
  }
}
