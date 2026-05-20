/**
 * POST /api/ai/chat
 *
 * Backend proxy for Gemini AI chat — streams the response via Vercel AI SDK.
 * Keeps GOOGLE_AI_API_KEY server-side (no EXPO_PUBLIC_ prefix).
 */

import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

interface ChatRequestBody {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  maxOutputTokens?: number;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const MAX_SYSTEM_PROMPT_LENGTH = 4000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 50;

const googleAI = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 30 requests per minute per client
  const blocked = enforceRateLimit(request, 'ai-chat', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return Response.json({ error: 'AI service not configured.' }, { status: 503 });
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

    const messages = body.messages.slice(-MAX_MESSAGES).map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: sanitizeString(m.content, MAX_MESSAGE_LENGTH) ?? '',
    }));

    const maxTokens = Math.min(body.maxOutputTokens ?? 2048, 4096);

    const result = streamText({
      model: googleAI('gemini-2.5-flash'),
      system: systemPrompt,
      messages,
      maxOutputTokens: maxTokens,
    });

    // Pipe raw UTF-8 text chunks (no SSE framing) so React Native's fetch
    // with `reactNative: { textStreaming: true }` can read them off response.body.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (streamErr) {
          controller.error(streamErr);
        }
      },
    });
    return new Response(stream as unknown as BodyInit_, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai/chat');
  }
}