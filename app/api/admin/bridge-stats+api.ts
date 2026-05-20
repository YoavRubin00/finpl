import { neon } from '@neondatabase/serverless';
import { safeErrorResponse } from '../_shared/safeError';

interface BenefitTotals {
  benefit_id: string;
  link_opens: number;
  redeems: number;
  unique_redeemers: number;
  conversion_pct: number | null;
}

interface DailyRow {
  day: string;
  platform: string | null;
  redeems: number;
}

interface OverallRow {
  total_redeems: number;
  total_link_opens: number;
  unique_redeemers: number;
  first_click: string | null;
  last_click: string | null;
}

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.ADMIN_API_SECRET ?? '';
  if (!expected) {
    return Response.json({ error: 'Admin endpoint not configured.' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!provided || provided !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL ?? '');

    const [perBenefitRaw, dailyRaw, overallRaw] = await Promise.all([
      sql`
        SELECT
          benefit_id,
          COUNT(*) FILTER (WHERE action = 'link_open')::int AS link_opens,
          COUNT(*) FILTER (WHERE action = 'redeem')::int    AS redeems,
          COUNT(DISTINCT COALESCE(user_id::text, user_email))
            FILTER (WHERE action = 'redeem')::int           AS unique_redeemers
        FROM bridge_clicks
        GROUP BY benefit_id
        ORDER BY redeems DESC
      ` as Array<Omit<BenefitTotals, 'conversion_pct'>>,
      sql`
        SELECT
          to_char(DATE(created_at), 'YYYY-MM-DD') AS day,
          platform,
          COUNT(*)::int AS redeems
        FROM bridge_clicks
        WHERE action = 'redeem'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day, platform
        ORDER BY day DESC, redeems DESC
      ` as DailyRow[],
      sql`
        SELECT
          COUNT(*) FILTER (WHERE action = 'redeem')::int    AS total_redeems,
          COUNT(*) FILTER (WHERE action = 'link_open')::int AS total_link_opens,
          COUNT(DISTINCT COALESCE(user_id::text, user_email))
            FILTER (WHERE action = 'redeem')::int           AS unique_redeemers,
          MIN(created_at)::text AS first_click,
          MAX(created_at)::text AS last_click
        FROM bridge_clicks
      ` as OverallRow[],
    ]);

    const perBenefit: BenefitTotals[] = perBenefitRaw.map((row) => ({
      ...row,
      conversion_pct: row.link_opens > 0
        ? Math.round((row.redeems / row.link_opens) * 1000) / 10
        : null,
    }));

    return Response.json({
      ok: true,
      overall: overallRaw[0] ?? null,
      perBenefit,
      dailyLast30Days: dailyRaw,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'admin/bridge-stats');
  }
}
