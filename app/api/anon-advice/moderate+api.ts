/**
 * POST /api/anon-advice/moderate
 *
 * Moderates a user-submitted anonymous advice post via Gemini.
 * Returns { ok: bool, reason?: string, tags?: string[] }.
 * On Gemini error/timeout: graceful pass — returns { ok: true, tags: [] }.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

interface ModerateRequestBody {
  situation: string;
  question: string;
  options: string[];
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 5000;

const SYSTEM_PROMPT = `אתה מודרטור של פורום ייעוץ פיננסי בעברית בשם "ייעוץ אנונימי".
תפקידך: לבדוק האם פוסט שמשתמש שלח עומד בכללים ולסווג אותו עם תגיות.

כללי הפרסום:
1. הפוסט חייב להיות קשור לפיננסים אישיים (משכנתא, חיסכון, השקעות, רכב, פנסיה, חוב, תקציב, שכר וכד׳).
2. אסור שיכיל פרטים מזהים כמו ת״ז, כתובת מלאה, מספר טלפון, או שם של אדם פרטי.
3. אסור שיכיל קללות, איומים, דברי שטנה, או תוכן מיני.
4. אסור שיהיה ספאם או פרסומת.

החזר JSON תקין בלבד (ללא markdown, ללא הסבר), במבנה הזה:
{ "ok": true, "tags": ["משכנתא", "השקעות"] }
או:
{ "ok": false, "reason": "סיבה קצרה למשתמש בעברית" }

תגיות מותרות: "משכנתא","השקעות","חיסכון","קרן השתלמות","דירה ראשונה","רכב","תקציב","פנסיה","מס","חוב".`;

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'anon-advice-moderate', { limit: 5, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as ModerateRequestBody;

    const situation = sanitizeString(body.situation, 600) ?? '';
    const question = sanitizeString(body.question, 250) ?? '';
    const options = Array.isArray(body.options)
      ? body.options.map((o) => sanitizeString(String(o), 120) ?? '').filter((s) => s.length > 0)
      : [];

    if (situation.length < 30 || question.length < 10) {
      return Response.json(
        { ok: false, reason: 'התיאור או הדילמה קצרים מדי.' },
        { status: 200 },
      );
    }

    if (!GEMINI_API_KEY) {
      // No moderation service configured — graceful pass.
      return Response.json({ ok: true, tags: [] });
    }

    const userMessage = `תיאור המצב:
${situation}

הדילמה:
${question}

האופציות:
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;

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
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
              maxOutputTokens: 200,
              thinkingConfig: { thinkingBudget: 0 },
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeoutId);
      // Network error / timeout — graceful pass
      return Response.json({ ok: true, tags: [] });
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      return Response.json({ ok: true, tags: [] });
    }

    const data = (await response.json()) as GeminiResponse;
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    let parsed: { ok?: boolean; reason?: string; tags?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Bad JSON — graceful pass
      return Response.json({ ok: true, tags: [] });
    }

    if (parsed.ok === false) {
      return Response.json({
        ok: false,
        reason: typeof parsed.reason === 'string' && parsed.reason.length > 0
          ? parsed.reason.slice(0, 200)
          : 'התוכן לא מתאים לפיצ׳ר ייעוץ אנונימי.',
      });
    }

    return Response.json({
      ok: true,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4).map((t) => String(t).slice(0, 30)) : [],
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'anon-advice/moderate');
  }
}