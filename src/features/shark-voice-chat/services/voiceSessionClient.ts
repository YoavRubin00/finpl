/**
 * Client helper for /api/voice/session.
 *
 * Fetches a short-lived signed WebSocket URL for the ElevenLabs Conversational
 * AI agent. Throws when the backend is misconfigured or unreachable.
 */

import Constants from 'expo-constants';

interface SessionResponse {
  signedUrl?: string;
  error?: string;
}

function getApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE;
  if (explicit) return explicit.replace(/\/$/, '');
  const hostUri = (Constants.expoConfig?.hostUri ?? '').split(':')[0];
  if (hostUri) return `http://${hostUri}:8081`;
  return '';
}

export async function fetchSignedUrl(): Promise<string> {
  const base = getApiBase();
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
