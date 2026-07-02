/**
 * POST /api/anon-advice/rephrase
 *
 * Rephrases a user-submitted draft post using Gemini in the voice of "קפטן שארק".
 * Preserves all factual information; clarifies wording, fixes typos, structures it.
 * Returns { ok: bool, situation?, question?, options?, error? }.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

interface RephraseRequestBody {
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
const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `אתה קפטן שארק — מנחה פיננסי באפליקציית FinPlay.
המשתמש כתב טיוטה של פוסט אנונימי לפיצ׳ר "ייעוץ אנונימי" ורוצה שתעזור לו לנסח את זה טוב יותר.

המשימה שלך:
1. לשפר ניסוח, פיסוק וזרימה — להפוך את הטקסט לקריא וברור.
2. לשמור על כל המידע העובדתי שהמשתמש מסר (גילאים, סכומים, מצב משפחתי, מקצוע וכו׳) — אסור להוסיף או להחסיר עובדות.
3. להסיר חזרות מיותרות, אבל לא לקצר אגרסיבית — תיאור מצב כספי טוב כולל פרטים.
4. להעניק טון ידידותי, ענייני, לא רשמי מדי. בגוף ראשון.
5. לבדוק שכל אופציה מנוסחת כמשפט שלם וברור.
6. אם יש פרטים מזהים (ת״ז, טלפון, שם פרטי) — להחליף בתיאור גנרי ("...").

החזר JSON תקין בלבד (ללא markdown), במבנה:
{
  "situation": "התיאור המנוסח מחדש",
  "question": "הדילמה המנוסחת מחדש",
  "options": ["אופציה א׳ מנוסחת", "אופציה ב׳ מנוסחת"]
}`;

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'anon-advice-rephrase', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return Response.json({ ok: false, error: 'AI service not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as RephraseRequestBody;

    const situation = sanitizeString(body.situation, 600) ?? '';
    const question = sanitizeString(body.question, 250) ?? '';
    const options = Array.isArray(body.options)
      ? body.options.map((o) => sanitizeString(String(o), 120) ?? '').filter((s) => s.length > 0).slice(0, 2)
      : [];

    if (situation.length < 20) {
      return Response.json(
        { ok: false, error: 'התיאור קצר מדי לניסוח מחדש.' },
        { status: 200 },
      );
    }

    const userMessage = `תיאור המצב (גרסה גולמית):
${situation}

הדילמה (גרסה גולמית):
${question}

האופציות (גרסה גולמית):
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

נסח מחדש את שלושת השדות (תיאור, דילמה, אופציות) ושמור על כל המידע.`;

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
              maxOutputTokens: 800,
              thinkingConfig: { thinkingBudget: 0 },
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeoutId);
      return Response.json({ ok: false, error: 'AI לא זמין כרגע. נסו שוב בעוד רגע.' }, { status: 200 });
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      return Response.json({ ok: false, error: 'AI לא זמין כרגע.' }, { status: 200 });
    }

    const data = (await response.json()) as GeminiResponse;
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    let parsed: { situation?: string; question?: string; options?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ ok: false, error: 'הניסוח לא תקין. נסו שוב.' }, { status: 200 });
    }

    const outSituation = typeof parsed.situation === 'string' ? parsed.situation.slice(0, 500) : situation;
    const outQuestion = typeof parsed.question === 'string' ? parsed.question.slice(0, 200) : question;
    const outOptions = Array.isArray(parsed.options)
      ? parsed.options.map((o) => String(o).slice(0, 100)).slice(0, 2)
      : options;

    return Response.json({
      ok: true,
      situation: outSituation,
      question: outQuestion,
      options: outOptions,
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'anon-advice/rephrase');
  }
}
