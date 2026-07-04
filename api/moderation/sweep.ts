// api/moderation/sweep.ts — hourly UGC moderation sweep (Yoav 2026-07-04).
//
// Vercel cron (see vercel.json) hits this every hour, 05:00–21:00 UTC
// (≈ 08:00–00:00 Israel in summer). It re-reviews the last window of
// server-side community texts — trade-room messages + portfolio comments —
// with the same Captain Shark Gemini moderator used at post time, and hides
// anything that slipped through: spam, profanity, PII, off-topic rants
// (including app-bashing like "אפליקציה גרועה" — not the place for it).
//
// Hiding = UPDATE hidden=true; every feed already filters hidden=false, so a
// hidden row disappears for everyone on the next poll. Fail-open per item
// (Gemini error → keep) so a flaky model can never mass-delete real content.
//
// Anon-advice replies live on-device only (no server rows) — the client-side
// shark bot remains their moderator until that feature grows a backend.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';
import { getDb } from '../_shared/db';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 6000;
const WINDOW = '2 hours'; // hourly runs → each row is reviewed ~twice; idempotent
const MAX_PER_TABLE = 60;

const SYSTEM_PROMPT = `אתה קפטן שארק — בוט המודרציה של קהילת FinPlay, אפליקציה חינוכית פיננסית לצעירים בישראל.
תפקידך: לבדוק הודעה קצרה מהקהילה ולהחליט אם היא נשארת.

ההודעה נשארת (ok=true) אם היא עוסקת בכסף, שוק ההון, כלכלה, חיסכון, קריפטו, או במשחק עצמו (ליגת פנטזי, תיקים, ניחושים) — גם דעות, שאלות מתחילים, וטראש-טוק ידידותי על תיקים הם בסדר גמור.

ההודעה נמחקת (ok=false) אם יש בה אחד מאלה:
1. קללות, איומים, שטנה, בריונות או תוכן מיני.
2. ספאם, פרסומת, קידום ערוצים/קבוצות חיצוניות, או הבטחות רווח ("כפול תוך שבוע").
3. פרטים מזהים (ת"ז, טלפון, כתובת, שם מלא של אדם פרטי).
4. חוסר קשר מוחלט לכסף/כלכלה/המשחק — כולל השמצות על האפליקציה עצמה ("אפליקציה גרועה", "אל תורידו") שאינן דיון ענייני.

היה סלחן לשפה יומיומית וסלנג — מוחקים רק הפרות ברורות.
החזר JSON תקין בלבד, ללא markdown:
{ "ok": true }
או:
{ "ok": false }`;

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
}

/** true = keep, false = hide. Fails open (keep) on any error or timeout.
 *  Timeout via Promise.race (no AbortController — its signal type clashes with
 *  undici's fetch typings in server files; the stray request just resolves
 *  unused inside the function's 120s budget). */
async function reviewText(text: string): Promise<boolean> {
  if (!GEMINI_API_KEY) return true;

  const keepOnTimeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(true), TIMEOUT_MS);
  });

  const review = (async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: text.slice(0, 500) }] }],
            generationConfig: {
              maxOutputTokens: 60,
              thinkingConfig: { thinkingBudget: 0 },
              responseMimeType: 'application/json',
            },
          }),
        },
      );
      if (!response.ok) return true;
      const data = (await response.json()) as GeminiResponse;
      const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
      const parsed = JSON.parse(raw) as { ok?: boolean };
      return parsed.ok !== false;
    } catch {
      return true;
    }
  })();

  return Promise.race([review, keepOnTimeout]);
}

interface Row {
  id: string;
  body: string;
}

function rowsOf(result: unknown): Row[] {
  const raw = (result as { rows?: unknown[] }).rows ?? (result as unknown[]);
  return Array.isArray(raw) ? (raw as Row[]) : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Vercel sends Authorization: Bearer <CRON_SECRET> for cron invocations.
  const authHeader = req.headers.authorization ?? '';
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const db = getDb();
  const summary = { reviewed: 0, hiddenMessages: 0, hiddenComments: 0 };

  const messages = rowsOf(
    await db.execute(sql`
      SELECT id, body FROM trade_room_messages
       WHERE hidden = false AND created_at > now() - interval '2 hours'
       ORDER BY created_at DESC LIMIT ${MAX_PER_TABLE}
    `),
  );
  for (const m of messages) {
    summary.reviewed += 1;
    const keep = await reviewText(m.body);
    if (!keep) {
      await db.execute(sql`UPDATE trade_room_messages SET hidden = true WHERE id = ${m.id}`);
      summary.hiddenMessages += 1;
    }
  }

  const comments = rowsOf(
    await db.execute(sql`
      SELECT id, body FROM portfolio_comments
       WHERE hidden = false AND created_at > now() - interval '2 hours'
       ORDER BY created_at DESC LIMIT ${MAX_PER_TABLE}
    `),
  );
  for (const c of comments) {
    summary.reviewed += 1;
    const keep = await reviewText(c.body);
    if (!keep) {
      await db.execute(sql`UPDATE portfolio_comments SET hidden = true WHERE id = ${c.id}`);
      summary.hiddenComments += 1;
    }
  }

  res.status(200).json({ ok: true, window: WINDOW, ...summary });
}
