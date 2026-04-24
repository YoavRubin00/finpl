import { getApiBase } from '../db/apiBase';

// React Native's fetch accepts a non-standard `reactNative` option to enable
// true chunked streaming on `response.body`. Augment the standard type so we
// can pass it without a cast.
declare global {
  interface RequestInit {
    reactNative?: { textStreaming?: boolean };
  }
}

export interface StreamChatBody {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  maxOutputTokens?: number;
}

/**
 * Streams a chat response from the backend, calling onChunk for each text piece.
 * Falls back to full-JSON mode if response.body (ReadableStream) is unavailable.
 * Resolves when the stream is complete or aborted.
 */
export async function streamChatRequest(
  body: StreamChatBody,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${getApiBase()}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
      // Without this, RN's fetch buffers the whole response and delivers it as a single chunk.
      reactNative: { textStreaming: true },
    });

    if (!response.ok) {
      return { ok: false, error: 'שגיאה בשירות. נסה שוב.' };
    }

    // Fallback for environments where ReadableStream is not exposed on response.body
    // (e.g. some RN fetch builds). Read the full text body once and deliver as a
    // single chunk so the chat still works, just without a typewriter effect.
    if (!response.body) {
      const text = await response.text();
      if (text) onChunk(text);
      return { ok: true };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunk(chunk);
    }

    return { ok: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: true };
    }
    return { ok: false, error: 'שגיאת רשת. בדוק את החיבור לאינטרנט.' };
  }
}