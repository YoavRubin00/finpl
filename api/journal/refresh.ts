// api/journal/refresh.ts — monthly self-refresh of the Investors Journal
// (Yoav 2026-07-04: "קוד שיודע פעם בחודש לעדכן את הלוח בעצמו").
//
// Vercel cron (vercel.json) runs on the 25th each month and prepares the NEXT
// month's calendar. Guard-rails against fabrication:
//  - If the target month already has >= 3 events (Waren's curation), it SKIPS —
//    the cron never overwrites human-verified content.
//  - Generation runs Gemini WITH Google-Search grounding, so dates come from
//    live sources, not model memory; the prompt demands only well-known,
//    verifiable events.
//  - Hard validation: dates must parse and fall inside the target month,
//    required fields present, kinds whitelisted — invalid rows are dropped.
//  - Waren's monthly review remains the human safety net (audits the table,
//    fixes copy, records outcomes).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';
import { getDb } from '../_shared/db';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 45_000;
const MIN_EXISTING_TO_SKIP = 3;
const MAX_EVENTS = 6;
const KINDS = new Set(['earnings', 'rate', 'cpi', 'jobs', 'other']);

interface GenEvent {
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
}

function buildPrompt(month: string): string {
  return `אתה עורך התוכן של "יומן משקיעים" — לוח אירועי המקרו החודשי באפליקציית FinPlay (חינוך פיננסי לצעירים בישראל, קול "קפטן שארק": חם, פשוט, בגובה העיניים).

המשימה: הרכב את לוח האירועים לחודש ${month} — 4 עד ${MAX_EVENTS} אירועי המקרו הגדולים באמת: החלטות ריבית (הפד ובנק ישראל), פרסומי מדד המחירים (ארה"ב וישראל), דוח תעסוקה אמריקאי, ודוחות כספיים של ענקיות (אפל/מיקרוסופט/אנבידיה/טסלה/גוגל/מטא וכד').

חובה: השתמש בחיפוש כדי לאמת כל תאריך מול לוחות רשמיים (federalreserve.gov, boi.org.il, bls.gov, הודעות IR של החברות). אל תכלול אירוע שהתאריך שלו אינו ודאי — עדיף 4 אירועים נכונים מ-6 מנוחשים. תאריכי דוחות שטרם אושרו רשמית — השמט.

לכל אירוע כתוב בעברית פשוטה (בלי ז'רגון — במילים של בני אדם):
- title: כותרת קצרה במסגור "לוח שידורים" ("מחר ב-21:00 הפד מחליט")
- teaser: משפט hook אחד
- explainWhat: מה זה בכלל — הסבר לחסר-ידע מוחלט, 1-2 משפטים
- explainWhyMe: למה זה נוגע לחיים שלי (משכנתא/שכירות/חיסכון), 1-2 משפטים
- explainMarket: איך זה יכול להשפיע על השוק — מאוזן, בלי כיוון מובטח, 1-2 משפטים
- question: שאלת תחזית עם שני מחנות ("מה יעשה הפד?")
- optionA / optionB: שתי התשובות (קצרות)

אסור בהחלט: המלצות השקעה ("כדאי לקנות"), הבטחות כיוון, המילה "הימור" (רק "תחזית"), אמוג'י כריש.

החזר JSON בלבד (בלי markdown, בלי טקסט נוסף): מערך של אובייקטים עם השדות:
id (באנגלית, קצר, למשל "aug26-fed-rate"), eventDate (YYYY-MM-DD בתוך ${month}), country ("us"/"il"), kind ("earnings"/"rate"/"cpi"/"jobs"/"other"), emoji (אחד), title, teaser, explainWhat, explainWhyMe, explainMarket, question, optionA, optionB.`;
}

async function generateEvents(month: string): Promise<GenEvent[]> {
  if (!GEMINI_API_KEY) return [];
  const keepOnTimeout = new Promise<GenEvent[]>((resolve) => {
    setTimeout(() => resolve([]), TIMEOUT_MS);
  });
  const run = (async (): Promise<GenEvent[]> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt(month) }] }],
            tools: [{ google_search: {} }],
            generationConfig: { maxOutputTokens: 4000 },
          }),
        },
      );
      if (!response.ok) return [];
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? '')
        .join('')
        .trim();
      const jsonText = raw.replace(/^```(json)?/m, '').replace(/```\s*$/m, '').trim();
      const start = jsonText.indexOf('[');
      const end = jsonText.lastIndexOf(']');
      if (start < 0 || end <= start) return [];
      const parsed = JSON.parse(jsonText.slice(start, end + 1)) as unknown;
      return Array.isArray(parsed) ? (parsed as GenEvent[]) : [];
    } catch {
      return [];
    }
  })();
  return Promise.race([run, keepOnTimeout]);
}

function nextMonthISO(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based current
  const next = new Date(Date.UTC(y, m + 1, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const authHeader = req.headers.authorization ?? '';
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // ?month=YYYY-MM overrides (manual runs); default = next month.
  const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : nextMonthISO();

  const db = getDb();

  // Never clobber curated content.
  const existing = await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM investor_journal_events
     WHERE to_char(event_date, 'YYYY-MM') = ${month}
  `);
  const rawN = ((existing as unknown as { rows?: { n: number }[] }).rows
    ?? (existing as unknown as { n: number }[]))[0]?.n ?? 0;
  if (Number(rawN) >= MIN_EXISTING_TO_SKIP) {
    res.status(200).json({ ok: true, month, skipped: true, existing: Number(rawN) });
    return;
  }

  const generated = await generateEvents(month);

  // Hard validation — drop anything that fails; never insert junk.
  let inserted = 0;
  for (const e of generated.slice(0, MAX_EVENTS)) {
    const id = clean(e.id, 64).replace(/[^a-zA-Z0-9_-]/g, '');
    const eventDate = clean(e.eventDate, 10);
    const title = clean(e.title, 120);
    const question = clean(e.question, 160);
    const optionA = clean(e.optionA, 60);
    const optionB = clean(e.optionB, 60);
    const kind = KINDS.has(clean(e.kind, 16)) ? clean(e.kind, 16) : 'other';
    const country = e.country === 'il' ? 'il' : 'us';
    if (!id || !title || !question || !optionA || !optionB) continue;
    if (!eventDate.startsWith(month) || Number.isNaN(new Date(`${eventDate}T00:00:00Z`).getTime())) continue;

    await db.execute(sql`
      INSERT INTO investor_journal_events (
        id, event_date, country, kind, emoji, title, teaser,
        explain_what, explain_why_me, explain_market,
        question, option_a, option_b, hidden, sort, updated_at
      ) VALUES (
        ${id}, ${eventDate}, ${country}, ${kind},
        ${clean(e.emoji, 8) || '📊'}, ${title}, ${clean(e.teaser, 200)},
        ${clean(e.explainWhat, 400)}, ${clean(e.explainWhyMe, 400)}, ${clean(e.explainMarket, 400)},
        ${question}, ${optionA}, ${optionB}, false, 0, now()
      )
      ON CONFLICT (id) DO NOTHING
    `);
    inserted += 1;
  }

  res.status(200).json({ ok: true, month, generated: generated.length, inserted });
}
