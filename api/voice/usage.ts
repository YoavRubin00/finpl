import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/voice/usage
 *
 * Backend acknowledgement for shark-voice session minutes. The primary source
 * of truth is useSubscriptionStore on the client; this exists for future
 * server-side aggregation/analytics and to clamp absurd reports.
 */

// Soft target is 45s, but a call may run up to 60s when the user is still
// answering (the client graces them rather than cutting mid-sentence).
const MAX_REPORT_SECONDS = 60;

interface UsageBody {
  seconds?: unknown;
}

function clampSeconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(MAX_REPORT_SECONDS, Math.round(value)));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = (req.body ?? {}) as UsageBody;
    const seconds = clampSeconds(body.seconds);
    if (seconds === null) {
      return res.status(400).json({ error: 'Invalid seconds value.' });
    }
    return res.status(200).json({ ok: true, seconds });
  } catch {
    return res.status(500).json({ error: 'Usage report error.' });
  }
}
