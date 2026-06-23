import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/voice/session
 *
 * Issues a short-lived signed WebSocket URL for the ElevenLabs Conversational
 * AI agent. The signed URL embeds agent context so the client connects directly
 * to ElevenLabs without exposing our API key.
 */

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

interface SignedUrlResponse {
  signed_url: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  const agentId = process.env.ELEVENLABS_AGENT_ID ?? '';
  if (!apiKey || !agentId) {
    return res.status(503).json({ error: 'Voice service not configured.' });
  }

  try {
    const url = `${ELEVENLABS_BASE}/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`;
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    });

    if (!upstream.ok) {
      // Log the real ElevenLabs failure SERVER-SIDE only. The body echoes the
      // configured agent_id back (e.g. "Agent with ID '...' not found"), which
      // can be a misconfigured secret — so it must NEVER be returned to the
      // client. The status code alone is safe to surface for diagnosis.
      const detail = await upstream.text().catch(() => '');
      console.error(`[voice/session] ElevenLabs ${upstream.status}: ${detail.slice(0, 300)}`);
      return res.status(upstream.status === 401 ? 503 : 502).json({
        error: 'Voice service upstream error.',
        upstreamStatus: upstream.status,
      });
    }

    const data = (await upstream.json()) as SignedUrlResponse;
    if (!data.signed_url) {
      return res.status(502).json({ error: 'Invalid voice service response.' });
    }

    return res.status(200).json({ signedUrl: data.signed_url });
  } catch (err) {
    return res.status(500).json({ error: 'Voice service error.' });
  }
}
