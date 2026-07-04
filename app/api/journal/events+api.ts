/**
 * /api/journal/events — the Investors Journal ("יומן משקיעים") event feed.
 *
 * GET  ?month=YYYY-MM → the month's REAL, Waren-verified macro events
 *      (earnings / rate decisions / CPI / jobs), visible rows only.
 *      Open read — the content is public in-app editorial, no PII.
 * POST { events: [...] } with X-Bar-Token → upsert rows (cloud curation by
 *      Waren/Bar routines — content updates never need an OTA). Same token
 *      contract as /api/bar/content (BAR_CONTENT_TOKEN).
 *
 * Honesty: rows are curated facts with sources verified by Waren before
 * insert. Nothing here is generated at runtime or fabricated.
 */
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';
import { json } from '../_shared/json';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

interface EventView {
  id: string;
  eventDate: string;
  country: 'us' | 'il';
  kind: 'earnings' | 'rate' | 'cpi' | 'jobs' | 'other';
  emoji: string;
  title: string;
  teaser: string;
  explainWhat: string;
  explainWhyMe: string;
  explainMarket: string;
  question: string;
  optionA: string;
  optionB: string;
  outcome: 0 | 1 | null;
  outcomeNote: string | null;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'journal-events', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const month = sanitizeString(url.searchParams.get('month'), 7);
    if (!month || !MONTH_RE.test(month)) {
      return json({ error: 'Invalid month (expected YYYY-MM)' }, { status: 400 });
    }

    const db = getDb();
    const result = await db.execute(sql`
      SELECT id, event_date, country, kind, emoji, title, teaser,
             explain_what, explain_why_me, explain_market,
             question, option_a, option_b, outcome, outcome_note
        FROM investor_journal_events
       WHERE hidden = false
         AND to_char(event_date, 'YYYY-MM') = ${month}
       ORDER BY event_date ASC, sort ASC
    `);
    const raw = ((result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]));
    const rows = Array.isArray(raw) ? raw : [];

    const events: EventView[] = rows.map((r): EventView => {
      const row = r as {
        id: string;
        event_date: string | Date;
        country: string;
        kind: string;
        emoji: string;
        title: string;
        teaser: string;
        explain_what: string;
        explain_why_me: string;
        explain_market: string;
        question: string;
        option_a: string;
        option_b: string;
        outcome: number | null;
        outcome_note: string | null;
      };
      return {
        id: row.id,
        eventDate:
          typeof row.event_date === 'string'
            ? row.event_date.slice(0, 10)
            : row.event_date.toISOString().slice(0, 10),
        country: row.country === 'il' ? 'il' : 'us',
        kind:
          row.kind === 'earnings' || row.kind === 'rate' || row.kind === 'cpi' || row.kind === 'jobs'
            ? row.kind
            : 'other',
        emoji: row.emoji,
        title: row.title,
        teaser: row.teaser,
        explainWhat: row.explain_what,
        explainWhyMe: row.explain_why_me,
        explainMarket: row.explain_market,
        question: row.question,
        optionA: row.option_a,
        optionB: row.option_b,
        outcome: row.outcome === 0 || row.outcome === 1 ? row.outcome : null,
        outcomeNote: row.outcome_note ?? null,
      };
    });

    return json({ ok: true, events });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'journal/events GET');
  }
}

interface UpsertEvent {
  id?: string;
  eventDate?: string;
  country?: string;
  kind?: string;
  emoji?: string;
  title?: string;
  teaser?: string;
  explainWhat?: string;
  explainWhyMe?: string;
  explainMarket?: string;
  question?: string;
  optionA?: string;
  optionB?: string;
  outcome?: number | null;
  outcomeNote?: string | null;
  hidden?: boolean;
  sort?: number;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'journal-events-write', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const expected = process.env.BAR_CONTENT_TOKEN ?? '';
    const provided = request.headers.get('X-Bar-Token') ?? '';
    if (!expected || provided !== expected) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { events?: UpsertEvent[] };
    const events = Array.isArray(body.events) ? body.events.slice(0, 40) : [];
    if (events.length === 0) return json({ error: 'No events' }, { status: 400 });

    const db = getDb();
    let upserted = 0;
    for (const e of events) {
      const id = sanitizeString(e.id, 64);
      const eventDate = sanitizeString(e.eventDate, 10);
      const title = sanitizeString(e.title, 120);
      const question = sanitizeString(e.question, 160);
      if (!id || !eventDate || !title || !question) continue;
      await db.execute(sql`
        INSERT INTO investor_journal_events (
          id, event_date, country, kind, emoji, title, teaser,
          explain_what, explain_why_me, explain_market,
          question, option_a, option_b, outcome, outcome_note, hidden, sort, updated_at
        ) VALUES (
          ${id}, ${eventDate}, ${e.country === 'il' ? 'il' : 'us'},
          ${['earnings', 'rate', 'cpi', 'jobs'].includes(e.kind ?? '') ? e.kind : 'other'},
          ${sanitizeString(e.emoji, 8) ?? '📊'}, ${title}, ${sanitizeString(e.teaser, 200) ?? ''},
          ${sanitizeString(e.explainWhat, 400) ?? ''}, ${sanitizeString(e.explainWhyMe, 400) ?? ''},
          ${sanitizeString(e.explainMarket, 400) ?? ''},
          ${question}, ${sanitizeString(e.optionA, 60) ?? ''}, ${sanitizeString(e.optionB, 60) ?? ''},
          ${e.outcome === 0 || e.outcome === 1 ? e.outcome : null},
          ${sanitizeString(e.outcomeNote ?? null, 200)}, ${e.hidden === true}, ${typeof e.sort === 'number' ? e.sort : 0},
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          event_date = EXCLUDED.event_date,
          country = EXCLUDED.country,
          kind = EXCLUDED.kind,
          emoji = EXCLUDED.emoji,
          title = EXCLUDED.title,
          teaser = EXCLUDED.teaser,
          explain_what = EXCLUDED.explain_what,
          explain_why_me = EXCLUDED.explain_why_me,
          explain_market = EXCLUDED.explain_market,
          question = EXCLUDED.question,
          option_a = EXCLUDED.option_a,
          option_b = EXCLUDED.option_b,
          outcome = EXCLUDED.outcome,
          outcome_note = EXCLUDED.outcome_note,
          hidden = EXCLUDED.hidden,
          sort = EXCLUDED.sort,
          updated_at = now()
      `);
      upserted += 1;
    }

    return json({ ok: true, upserted });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'journal/events POST');
  }
}
