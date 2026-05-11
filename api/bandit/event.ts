import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { banditVariants } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

const ID_RE = /^[a-z0-9_-]{1,80}$/i;
type BanditEvent = 'impression' | 'conversion' | 'dismiss';

interface EventBody {
  experimentId: string;
  variantId: string;
  event: BanditEvent;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as Partial<EventBody>;
    const experimentId = sanitizeString(body.experimentId, 80);
    const variantId = sanitizeString(body.variantId, 80);
    const event = body.event;

    if (!experimentId || !variantId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!ID_RE.test(experimentId) || !ID_RE.test(variantId)) {
      return res.status(400).json({ error: 'Invalid experimentId or variantId' });
    }
    if (event !== 'impression' && event !== 'conversion' && event !== 'dismiss') {
      return res.status(400).json({ error: 'Invalid event' });
    }

    const db = getDb();
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

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[bandit/event]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
