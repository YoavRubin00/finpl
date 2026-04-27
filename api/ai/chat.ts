import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatRequestBody {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  maxOutputTokens?: number;
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    // SSE streaming endpoint — Gemini emits `data: {...}\n\n` events with
    // partial candidates. Parsing these into raw text and writing them to
    // `res` lets the RN client read clean UTF-8 chunks off `response.body`,
    // without the JSON envelope leaking mid-stream.
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
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

    if (!upstream.ok || !upstream.body) {
      console.error(`[ai/chat] Gemini stream returned ${upstream.status}`);
      return res.status(502).json({ error: 'AI service temporarily unavailable.' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const flushEvent = (eventBlock: string) => {
      for (const rawLine of eventBlock.split('\n')) {
        if (!rawLine.startsWith('data:')) continue;
        const payload = rawLine.slice(5).trim();
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload) as GeminiStreamChunk;
          const parts = parsed.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const p of parts) {
            if (p.text) res.write(p.text);
          }
        } catch {
          // Ignore malformed events — stream continues.
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Normalize CRLF so SSE event boundaries (\n\n) parse even if upstream
      // ever switches to CRLF line endings.
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');

      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        flushEvent(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }

    // Final decode flush + drain any trailing event that didn't end with \n\n.
    buffer = (buffer + decoder.decode()).replace(/\r\n/g, '\n').trim();
    if (buffer) flushEvent(buffer);

    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[ai/chat] error:', message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.end();
  }
}