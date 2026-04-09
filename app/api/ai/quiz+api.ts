/**
 * POST /api/ai/quiz
 *
 * Backend proxy for Gemini AI quiz generation.
 * Keeps GOOGLE_AI_API_KEY server-side.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

interface QuizRequestBody {
  prompt: string;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.0-flash';

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 5 quiz generations per minute per client
  const blocked = enforceRateLimit(request, 'ai-quiz', { limit: 5, windowSec: 60 });
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return Response.json({ error: 'AI service not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as QuizRequestBody;

    if (!body.prompt || typeof body.prompt !== 'string') {
      return Response.json({ error: 'Missing prompt.' }, { status: 400 });
    }

    const prompt = body.prompt.slice(0, 3000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      console.error(`[ai/quiz] Gemini returned ${response.status}`);
      return Response.json({ error: 'AI service temporarily unavailable.' }, { status: 502 });
    }

    const json = await response.json();
    const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return Response.json({ ok: true, text });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai/quiz');
  }
}
