import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { banditVariants } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const dbSql = neon(url);
  return drizzle(dbSql);
}

export interface BanditServerVariant {
  variantId: string;
  alpha: number;
  beta: number;
  impressions: number;
  conversions: number;
}

/** GET /api/bandit/state — returns global alpha/beta for all variants, grouped by experiment. */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bandit-state-get', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const db = getDb();
    const rows = await db.select().from(banditVariants);

    const grouped: Record<string, BanditServerVariant[]> = {};
    for (const row of rows) {
      const list = grouped[row.experimentId] ?? (grouped[row.experimentId] = []);
      list.push({
        variantId: row.variantId,
        alpha: row.alpha,
        beta: row.beta,
        impressions: row.impressions,
        conversions: row.conversions,
      });
    }

    return Response.json({ ok: true, experiments: grouped });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bandit/state GET');
  }
}
