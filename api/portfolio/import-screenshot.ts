import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

/**
 * POST /api/portfolio/import-screenshot
 *
 * Screenshot → shareable portfolio (Yoav 11.7): the user uploads a screenshot
 * from their REAL investing app (eToro / Blink / Bit / Pepper Invest / Meitav /
 * IBI / broker web) and Claude vision extracts the holdings into the exact
 * shape the community feed renders (ticker / sector / allocation %).
 *
 * PRIVACY BY DESIGN — nothing is persisted here and absolute amounts are
 * NEVER extracted: the model returns percentage allocations + P&L% only.
 * Account numbers / balances / names in the screenshot are explicitly
 * instructed to be ignored. The client shows a mandatory confirm/edit
 * preview before anything is shared.
 *
 * Request body: { imageBase64: string, mediaType?: 'image/png'|'image/jpeg'|'image/webp' }
 * Response: 200 { ok: true, broker: string|null, positions: [...] }
 */

export const config = { maxDuration: 60 };

const ANTHROPIC_MODEL = 'claude-sonnet-5';

/** Max accepted base64 payload (~4MB binary) — Vercel body cap is ~4.5MB. */
const MAX_BASE64_LEN = 5_500_000;
const MAX_POSITIONS = 20;

/** Mirrors FantasySectorId on the client (src/constants/theme.ts F2_SECTORS). */
const SECTORS = [
  'tech', 'spec_growth', 'banks', 'energy', 'israel', 'health', 'crypto', 'consumer', 'hype',
] as const;

const ImportSchema = z.object({
  broker: z.string().nullable().describe('App/broker name if identifiable from the UI, else null'),
  positions: z
    .array(
      z.object({
        ticker: z.string().describe('Uppercase ticker symbol, e.g. AAPL. For Israeli stocks use the TASE symbol.'),
        name: z.string().describe('Short display name of the holding'),
        sector: z.enum(SECTORS).describe('Closest sector bucket for this holding'),
        allocationPct: z.number().min(0).max(100).describe('Percent of the visible portfolio this holding represents'),
        plPct: z.number().nullable().describe('Profit/loss percent shown for the holding, or null if not visible'),
      }),
    )
    .max(MAX_POSITIONS),
});

function normalizeAllocations(
  positions: z.infer<typeof ImportSchema>['positions'],
): z.infer<typeof ImportSchema>['positions'] {
  const total = positions.reduce((s, p) => s + (Number.isFinite(p.allocationPct) ? p.allocationPct : 0), 0);
  if (total <= 0) {
    // No allocation info in the screenshot → equal split.
    const equal = Math.floor(100 / Math.max(1, positions.length));
    return positions.map((p, i) => ({
      ...p,
      allocationPct: equal + (i === 0 ? 100 - equal * positions.length : 0),
    }));
  }
  // Scale to exactly 100, integer percents, remainder to the largest holding.
  const scaled = positions.map((p) => ({ ...p, allocationPct: Math.max(1, Math.round((p.allocationPct / total) * 100)) }));
  let drift = 100 - scaled.reduce((s, p) => s + p.allocationPct, 0);
  if (drift !== 0) {
    const biggest = scaled.reduce((a, b) => (b.allocationPct > a.allocationPct ? b : a), scaled[0]);
    biggest.allocationPct = Math.max(1, biggest.allocationPct + drift);
  }
  return scaled;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Token');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const { imageBase64, mediaType } = (req.body ?? {}) as { imageBase64?: string; mediaType?: string };
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ ok: false, error: 'missing_image' });
    }
    if (imageBase64.length > MAX_BASE64_LEN) {
      return res.status(413).json({ ok: false, error: 'image_too_large' });
    }
    const mime = mediaType === 'image/png' || mediaType === 'image/webp' ? mediaType : 'image/jpeg';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'server_not_configured' });
    const anthropic = createAnthropic({ apiKey });

    const { object } = await generateObject({
      model: anthropic(ANTHROPIC_MODEL),
      schema: ImportSchema,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'This is a screenshot from an investing/brokerage app (possibly Hebrew, possibly dark mode).',
                'Extract the portfolio HOLDINGS into the schema.',
                'Rules:',
                '- PRIVACY: NEVER extract account numbers, absolute currency amounts, balances, or personal names. Percentages and tickers only.',
                '- allocationPct: derive from visible amounts/weights if shown; the server re-normalizes, so relative sizes matter more than exact numbers.',
                '- plPct: the per-holding return % if visible, else null.',
                '- Only include ACTUAL holdings (skip watchlist items, ads, cash rows unless cash is a stated allocation).',
                '- If this is not a portfolio screenshot at all, return an empty positions array.',
              ].join('\n'),
            },
            { type: 'image', image: `data:${mime};base64,${imageBase64}` },
          ],
        },
      ],
    });

    const cleaned = (object.positions ?? [])
      .filter((p) => /^[A-Z0-9.\-]{1,10}$/i.test(p.ticker.trim()))
      .slice(0, MAX_POSITIONS)
      .map((p) => ({ ...p, ticker: p.ticker.trim().toUpperCase() }));

    if (cleaned.length === 0) {
      return res.status(200).json({ ok: true, broker: object.broker ?? null, positions: [] });
    }

    return res.status(200).json({
      ok: true,
      broker: object.broker ?? null,
      positions: normalizeAllocations(cleaned),
    });
  } catch (err) {
    console.error('[import-screenshot] failed', err);
    return res.status(500).json({ ok: false, error: 'import_failed' });
  }
}
