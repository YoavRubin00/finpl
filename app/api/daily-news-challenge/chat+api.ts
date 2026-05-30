/**
 * POST /api/daily-news-challenge/chat
 *
 * Follow-up Q&A scoped to a specific news item from today's challenge.
 * Uses the item's `chatContext` (1-paragraph briefing baked at generation
 * time) as a system message, plus the user's message history.
 *
 * Body: { authId, itemContext, history: [{role, text}], message }
 *   - itemContext: from the client (passed through from
 *     dailyNewsChallenge.items[i].chatContext)
 *   - history: prior turns in this thread (we don't persist server-side)
 *   - message: the user's latest question
 *
 * Returns: { ok, reply }
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../../src/db/schema';
import { getDb } from './_lib';

const GEMINI_MODEL = 'gemini-2.5-flash';

interface ChatBody {
  authId?: string;
  itemContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  message?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const SYSTEM_PROMPT = `אתה הקפטן שארק — מנטור פיננסי ידידותי לדור Z ב-FinPlay.
אתה עונה לשאלות המשך על כתבה פיננסית שהמשתמש קרא היום.

חוקים:
- תשובה קצרה, ענייני, עברית קולחת (1-3 פסקאות מקסימום).
- אם השאלה לא קשורה לכתבה — להחזיר בעדינות לנושא או לתת תשובה כללית קצרה.
- אסור להמליץ על מניות ספציפיות לקנייה / מכירה — רק חינוך פיננסי.
- אסור להמציא מספרים שלא ידועים לך מהקונטקסט.
- אמוג'י 1-2 בכל הודעה לשמירה על נימה חיובית.`;

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'daily-news-challenge-chat', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as ChatBody;
    const authId = sanitizeString(body.authId, 254);
    const itemContext = sanitizeString(body.itemContext, 2000);
    const message = sanitizeString(body.message, 1000);

    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!itemContext) return Response.json({ error: 'Missing itemContext' }, { status: 400 });
    if (!message) return Response.json({ error: 'Missing message' }, { status: 400 });

    // Auth check — Pro gating / per-user quotas are handled client-side via
    // useSubscriptionStore; here we just verify the sync token to block
    // anonymous abuse.
    const db = getDb();
    const userRows = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = userRows[0];
    if (!validateSyncAuth(request, user?.syncToken ?? null) || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'AI not configured' }, { status: 500 });
    }

    // Build the conversation. Item context is baked into the system prompt
    // so the model can't be tricked into ignoring it by user input.
    const fullSystem = `${SYSTEM_PROMPT}\n\nכתבה היום:\n${itemContext}`;
    const contents = [
      ...(body.history ?? []).slice(-8).map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiBody = {
      system_instruction: { parts: [{ text: fullSystem }] },
      contents,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.6,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error('Gemini returned empty content');

    return Response.json({ ok: true, reply });
  } catch (err) {
    return safeErrorResponse(err, 'daily-news-challenge/chat');
  }
}
