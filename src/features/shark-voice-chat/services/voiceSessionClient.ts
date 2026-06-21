/**
 * Client helper for /api/voice/session.
 *
 * Fetches a short-lived signed WebSocket URL for the ElevenLabs Conversational
 * AI agent. Throws when the backend is misconfigured or unreachable.
 *
 * On local web dev (localhost:8082) Expo Router doesn't serve `+api.ts`
 * routes in `output: "single"` mode, so we hit the deployed Vercel API
 * directly. Everywhere else we use the shared `getApiBase()` resolver.
 */

import { Platform } from 'react-native';
import { getApiBase } from '../../../db/apiBase';

const PROD_API_BASE = 'https://finpl.vercel.app';

interface SessionResponse {
  signedUrl?: string;
  error?: string;
}

interface TokenResponse {
  conversationToken?: string;
  error?: string;
}

function resolveBase(): string {
  // `window` isn't in the project's TS lib (no DOM) — read location off
  // globalThis instead, mirroring the other voice/report API-base resolvers.
  if (Platform.OS === 'web') {
    const w = (globalThis as { location?: { hostname?: string } }).location;
    const host = w?.hostname ?? '';
    if (host === 'localhost' || host === '127.0.0.1') {
      return PROD_API_BASE;
    }
  }
  const base = getApiBase();
  return base || PROD_API_BASE;
}

export async function fetchSignedUrl(): Promise<string> {
  const base = resolveBase();
  const res = await fetch(`${base}/api/voice/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(`voice/session failed: ${res.status}`);
  }

  const data = (await res.json()) as SessionResponse;
  if (!data.signedUrl) {
    throw new Error('voice/session: missing signedUrl');
  }
  return data.signedUrl;
}

/**
 * Native (iOS/Android) counterpart of `fetchSignedUrl`. The React Native
 * SDK (`@elevenlabs/react-native`) connects via LiveKit/WebRTC, not the
 * raw WSS transport the web SDK uses — so it needs a conversation token
 * (`/api/voice/token`), not a signed URL.
 */
export async function fetchConversationToken(): Promise<string> {
  const base = resolveBase();
  const res = await fetch(`${base}/api/voice/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(`voice/token failed: ${res.status}`);
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.conversationToken) {
    throw new Error('voice/token: missing conversationToken');
  }
  return data.conversationToken;
}
