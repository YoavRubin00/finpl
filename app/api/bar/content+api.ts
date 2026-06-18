/**
 * /api/bar/content — Bar's cloud-managed content (tips / VS polls / CTAs),
 * so the marketing routine can push new content LIVE without an app release.
 *
 *   GET  ?type=tip|poll|cta   → active items of that type (read-only, shared)
 *   POST { contentType, contentKey, payload, active?, dateKey? }  → upsert one
 *        row. Protected by the X-Bar-Token header (process.env.BAR_CONTENT_TOKEN)
 *        — only Bar's morning routine / the seed script holds the token.
 *
 * `payload` shape per content_type:
 *   tip  → { titleHe, bodyHe, tagHe }
 *   poll → a CrowdQuestion (id, text, options:[a,b], baselinePct, baselineN, tags)
 *   cta  → { kind:'trading'|'referral'|'whatsapp', title, body, cta, imageUrl?, destination }
 */
import { and, desc, eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { barContent } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

const TYPES = new Set(['tip', 'poll', 'cta']);

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bar-content-get', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const type = new URL(request.url).searchParams.get('type') ?? '';
    if (!TYPES.has(type)) {
      return Response.json({ ok: false, error: 'Invalid type' }, { status: 400 });
    }
    const db = getDb();
    const rows = await db
      .select({ contentKey: barContent.contentKey, payload: barContent.payload, dateKey: barContent.dateKey })
      .from(barContent)
      .where(and(eq(barContent.contentType, type), eq(barContent.active, true)))
      .orderBy(desc(barContent.dateKey), desc(barContent.updatedAt))
      .limit(50);

    const items = rows.map((r) => ({ key: r.contentKey, ...((r.payload ?? {}) as object) }));
    return Response.json({ ok: true, items });
  } catch (err) {
    return safeErrorResponse(err, 'bar/content GET');
  }
}

interface PostBody {
  contentType?: string;
  contentKey?: string;
  payload?: unknown;
  active?: boolean;
  dateKey?: string | null;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bar-content-post', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const token = request.headers.get('x-bar-token') ?? '';
    const expected = process.env.BAR_CONTENT_TOKEN ?? '';
    if (!expected || token !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PostBody;
    const contentType = String(body.contentType ?? '');
    const contentKey = String(body.contentKey ?? '').slice(0, 80);
    if (!TYPES.has(contentType) || !contentKey || body.payload == null || typeof body.payload !== 'object') {
      return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    await db
      .insert(barContent)
      .values({
        contentType,
        contentKey,
        payload: body.payload as object,
        active: body.active ?? true,
        dateKey: body.dateKey ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [barContent.contentType, barContent.contentKey],
        set: {
          payload: body.payload as object,
          active: body.active ?? true,
          dateKey: body.dateKey ?? null,
          updatedAt: now,
        },
      });

    return Response.json({ ok: true });
  } catch (err) {
    return safeErrorResponse(err, 'bar/content POST');
  }
}
