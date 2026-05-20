import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { banditVariants } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

interface ServerVariant {
  variantId: string;
  alpha: number;
  beta: number;
  impressions: number;
  conversions: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
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

    const experiments: Record<string, ServerVariant[]> = {};
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

    return res.status(200).json({ ok: true, experiments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[bandit/state]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
