import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const dbSql = neon(url);
  return drizzle(dbSql);
}

type BanditEvent = 'impression' | 'conversion' | 'dismiss';

interface BanditEventBody {
  experimentId: string;
  variantId: string;
  event: BanditEvent;
}

const VALID_EVENTS = new Set<BanditEvent>(['impression', 'conversion', 'dismiss']);

/** POST /api/bandit/event — anonymously records one bandit event globally. */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bandit-event-post', { limit: 100, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as BanditEventBody;
    const experimentId = sanitizeString(body.experimentId, 64);
    const variantId = sanitizeString(body.variantId, 64);
    const event = body.event;

    if (!experimentId) {
      return Response.json({ error: 'Missing experimentId' }, { status: 400 });
    }
    if (!variantId) {
      return Response.json({ error: 'Missing variantId' }, { status: 400 });
    }
    if (!event || !VALID_EVENTS.has(event)) {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    const db = getDb();

    // Atomic upsert-and-increment: any number of users hit this simultaneously,
    // Postgres serializes the increments correctly via ON CONFLICT DO UPDATE.
    const impDelta = event === 'impression' ? 1 : 0;
    const convDelta = event === 'conversion' ? 1 : 0;
    const alphaDelta = event === 'conversion' ? 1 : 0;
    const betaDelta = event === 'dismiss' ? 1 : 0;

    await db.execute(sql`
      INSERT INTO bandit_variants
        (experiment_id, variant_id, alpha, beta, impressions, conversions)
      VALUES
        (${experimentId}, ${variantId}, 1, 1, ${impDelta}, ${convDelta})
      ON CONFLICT (experiment_id, variant_id) DO UPDATE SET
        alpha       = bandit_variants.alpha + ${alphaDelta},
        beta        = bandit_variants.beta + ${betaDelta},
        impressions = bandit_variants.impressions + ${impDelta},
        conversions = bandit_variants.conversions + ${convDelta},
        updated_at  = NOW();
    `);

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bandit/event POST');
  }
}