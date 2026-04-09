/**
 * POST /api/ai/chat
 *
 * Backend proxy for Gemini AI chat.
 * Keeps GOOGLE_AI_API_KEY server-side (no EXPO_PUBLIC_ prefix).
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

interface ChatRequestBody {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  maxOutputTokens?: number;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_SYSTEM_PROMPT_LENGTH = 4000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 50;

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 30 requests per minute per client
  const blocked = enforceRateLimit(request, 'ai-chat', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: 'AI service not configured.' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as ChatRequestBody;

    // Validate & sanitize
    const systemPrompt = sanitizeString(body.systemPrompt, MAX_SYSTEM_PROMPT_LENGTH);
    if (!systemPrompt) {
      return Response.json({ error: 'Missing systemPrompt.' }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json({ error: 'Missing messages array.' }, { status: 400 });
    }

    // Truncate conversation to last N messages
    const messages = body.messages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: sanitizeString(m.content, MAX_MESSAGE_LENGTH) ?? '' }],
    }));

    const maxTokens = Math.min(body.maxOutputTokens ?? 2048, 4096);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages,
          generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );

    if (!response.ok) {
      console.error(`[ai/chat] Gemini returned ${response.status}`);
      return Response.json(
        { error: 'AI service temporarily unavailable.' },
        { status: 502 },
      );
    }

    const data = (await response.json()) as GeminiResponse;
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'סליחה, לא הצלחתי ליצור תשובה.';

    return Response.json({ ok: true, reply });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai/chat');
  }
}
