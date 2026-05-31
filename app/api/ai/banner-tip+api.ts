/**
 * POST /api/ai/banner-tip
 *
 * Generates a single short personalized Hebrew message from "קפטן שארק".
 * Used as the weekly retention banner message.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';
import { withRetry, isTransientAiError } from '../_shared/retry';

interface BannerTipRequestBody {
  name: string;
  xp: number;
  streak: number;
  completedModuleCount: number;
  lastModuleName: string | null;
  financialGoal?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const GOAL_LABELS: Record<string, string> = {
  'cash-flow':       'ניהול תזרים',
  'investing':       'השקעות',
  'army-release':    'שחרור מהצבא',
  'expand-horizons': 'הרחבת אופקים',
  'unsure':          'כללי',
};

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'ai-banner-tip', { limit: 5, windowSec: 60 });
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return Response.json({ error: 'AI service not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as BannerTipRequestBody;

    const name = sanitizeString(body.name, 50) ?? 'חבר';
    const xp = Number(body.xp) || 0;
    const streak = Number(body.streak) || 0;
    const completedModuleCount = Number(body.completedModuleCount) || 0;
    const lastModuleName = body.lastModuleName
      ? (sanitizeString(String(body.lastModuleName), 80) ?? null)
      : null;
    const financialGoal = GOAL_LABELS[body.financialGoal ?? ''] ?? 'כללי';

    const systemPrompt = `אתה קפטן שארק, מנחה חם ומוטיבציוני של ${name} באפליקציית FinPlay.
כתוב הודעת דחיפה אחת, קצרה של עד 10 מילים בעברית, בגוף שני רבים.
ההודעה צריכה:
- להרגיש שנכתבה ספציפית עבור המשתמש (השתמש בנתון אמיתי שלהם)
- להיות חמה, מוטיבציונית, קצת "כריש" אבל לא מוגזמת
- לא להתחיל ב"היי" או "שלום"
- להחזיר רק את ההודעה עצמה, ללא כותרת, ללא ציטוטים`;

    const userMessage = `שם: ${name}
XP: ${xp.toLocaleString()}
רצף: ${streak} ימים
מודולים שהושלמו: ${completedModuleCount}
הנושא האחרון: ${lastModuleName ?? 'לא ידוע'}
מטרה: ${financialGoal}`;

    const data = await withRetry<GeminiResponse>(
      async () => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userMessage }] }],
              generationConfig: {
                maxOutputTokens: 60,
              },
            }),
          },
        );
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Gemini ${response.status}: ${text.slice(0, 200)}`);
        }
        return (await response.json()) as GeminiResponse;
      },
      { attempts: 2, baseDelayMs: 300, shouldRetry: isTransientAiError, label: 'gemini/banner-tip' },
    );

    const message = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    if (!message) {
      return Response.json({ error: 'Empty response.' }, { status: 502 });
    }

    return Response.json({ ok: true, message });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai/banner-tip');
  }
}