/**
 * POST /api/moderation/check
 *
 * Shark moderator bot — reviews short community texts (trade-room messages,
 * portfolio captions, comments) via Gemini. Rules: finance-related, no
 * profanity/hate, no PII, no spam/ads/pump-and-dump.
 * Returns { ok: bool, reason?: string }. On Gemini error/timeout: graceful pass.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

interface CheckRequestBody {
  text: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 5000;

const SYSTEM_PROMPT = `אתה קפטן שארק — בוט המודרציה של קהילת FinPlay, אפליקציה חינוכית פיננסית לצעירים בישראל.
תפקידך: לבדוק הודעת צ'אט קצרה מקהילת המשקיעים ולהחליט אם היא נשארת.

ההודעה נשארת (ok=true) אם היא עוסקת בכסף, שוק ההון, כלכלה, חיסכון, קריפטו, או במשחק עצמו (ליגת פנטזי, תיקים, ניחושים) — גם דעות, שאלות מתחילים, וטראש-טוק ידידותי על תיקים הם בסדר גמור.

ההודעה נמחקת (ok=false) אם יש בה אחד מאלה:
1. קללות, איומים, שטנה, בריונות או תוכן מיני.
2. ספאם, פרסומת, קידום ערוצים/קבוצות חיצוניות, או הבטחות רווח ("כפול תוך שבוע").
3. פרטים מזהים (ת"ז, טלפון, כתובת, שם מלא של אדם פרטי).
4. חוסר קשר מוחלט לכסף/כלכלה/המשחק.

היה סלחן לשפה יומיומית וסלנג — מוחקים רק הפרות ברורות.
החזר JSON תקין בלבד, ללא markdown:
{ "ok": true }
או:
{ "ok": false, "reason": "משפט קצר למשתמש בעברית, בטון של קפטן שארק" }`;

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'moderation-check', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as CheckRequestBody;
    const text = sanitizeString(body.text, 500) ?? '';

    if (text.length === 0) {
      return Response.json({ ok: false, reason: 'הודעה ריקה.' });
    }

    if (!GEMINI_API_KEY) {
      // No moderation service configured — graceful pass.
      return Response.json({ ok: true });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              maxOutputTokens: 120,
              thinkingConfig: { thinkingBudget: 0 },
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeoutId);
      return Response.json({ ok: true });
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      return Response.json({ ok: true });
    }

    const data = (await response.json()) as GeminiResponse;
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    let parsed: { ok?: boolean; reason?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ ok: true });
    }

    if (parsed.ok === false) {
      return Response.json({
        ok: false,
        reason:
          typeof parsed.reason === 'string' && parsed.reason.length > 0
            ? parsed.reason.slice(0, 160)
            : 'ההודעה לא מתאימה לחדרי הקהילה.',
      });
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'moderation/check');
  }
}
