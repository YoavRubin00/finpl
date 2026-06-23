/**
 * POST /api/voice/token
 *
 * Issues a short-lived conversation token for the ElevenLabs Conversational
 * AI agent over the LiveKit/WebRTC transport — used by the React Native SDK
 * (`@elevenlabs/react-native`) which connects via WebRTC, not the raw WSS
 * transport that the web SDK uses against /api/voice/session.
 *
 * Auth + Pro gating are enforced client-side via useSubscriptionStore. This
 * endpoint adds defense-in-depth via rate limiting.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID ?? '';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

interface TokenResponse {
  token: string;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'voice-token', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return Response.json({ error: 'Voice service not configured.' }, { status: 503 });
  }

  try {
    const url = `${ELEVENLABS_BASE}/convai/conversation/token?agent_id=${encodeURIComponent(
      ELEVENLABS_AGENT_ID,
    )}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    if (!upstream.ok) {
      // Log the real ElevenLabs failure SERVER-SIDE only — the body echoes the
      // configured agent_id back, which can be a misconfigured secret, so it
      // must NEVER be returned to the client. Status code alone is safe.
      const detail = await upstream.text().catch(() => '');
      console.error(`[voice/token] ElevenLabs ${upstream.status}: ${detail.slice(0, 300)}`);
      return Response.json(
        { error: 'Voice service upstream error.', upstreamStatus: upstream.status },
        { status: upstream.status === 401 ? 503 : 502 },
      );
    }

    const data = (await upstream.json()) as TokenResponse;
    if (!data.token) {
      return Response.json({ error: 'Invalid voice service response.' }, { status: 502 });
    }

    return Response.json({ conversationToken: data.token });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'voice/token');
  }
}
