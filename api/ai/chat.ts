import type { VercelRequest, VercelResponse } from '@vercel/node';

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

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_SYSTEM_PROMPT_LENGTH = 4000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 50;

function sanitizeString(input: unknown, maxLen: number): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLen);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for native clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }

  try {
    const body = req.body as ChatRequestBody;

    const systemPrompt = sanitizeString(body.systemPrompt, MAX_SYSTEM_PROMPT_LENGTH);
    if (!systemPrompt) {
      return res.status(400).json({ error: 'Missing systemPrompt.' });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: 'Missing messages array.' });
    }

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
      return res.status(502).json({ error: 'AI service temporarily unavailable.' });
    }

    const data = (await response.json()) as GeminiResponse;
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'סליחה, לא הצלחתי ליצור תשובה.';

    return res.status(200).json({ ok: true, reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[ai/chat] error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}