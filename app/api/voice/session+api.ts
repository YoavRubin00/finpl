/**
 * POST /api/voice/session
 *
 * Issues a short-lived signed WebSocket URL for the ElevenLabs Conversational
 * AI agent. The signed URL embeds the agent context so the client can connect
 * directly to ElevenLabs without exposing the API key.
 *
 * Auth + Pro gating are enforced on the client side via useSubscriptionStore.
 * This endpoint adds defense-in-depth via rate limiting only — entitlement
 * checks live in the Zustand store (see canUseSharkVoice).
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID ?? '';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

interface SignedUrlResponse {
  signed_url: string;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'voice-session', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return Response.json({ error: 'Voice service not configured.' }, { status: 503 });
  }

  try {
    const url = `${ELEVENLABS_BASE}/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(
      ELEVENLABS_AGENT_ID,
    )}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    if (!upstream.ok) {
      return Response.json(
        { error: 'Voice service upstream error.' },
        { status: upstream.status === 401 ? 503 : 502 },
      );
    }

    const data = (await upstream.json()) as SignedUrlResponse;
    if (!data.signed_url) {
      return Response.json({ error: 'Invalid voice service response.' }, { status: 502 });
    }

    return Response.json({ signedUrl: data.signed_url });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'voice/session');
  }
}
