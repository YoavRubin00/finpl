import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { STOCK_ANALYST_QUICK_PROMPT, type StockHorizon } from '../_shared/stockAnalystPrompt';
import { StockQuickResponseSchema } from '../_shared/stockAnalystSchemas';

/**
 * POST /api/ai/stock-analyze-quick
 *
 * Quick educational stock analysis backed by Gemini 2.5 Flash. Returns a
 * single card payload (verdict + confidence + captain note + commentary).
 * Market data (price, sparkline) is fetched separately on the client via
 * the existing market service.
 *
 * Request body: { ticker, companyName, horizon, exchange?, priceContext? }
 * Response: 200 { verdict, confidence, captainNote, targetNote?, commentary }
 */

const GEMINI_MODEL = 'gemini-2.5-flash';

interface RequestBody {
  ticker?: string;
  companyName?: string;
  horizon?: StockHorizon;
  exchange?: string;
  priceContext?: {
    price?: number;
    priceChangePct?: number;
    currency?: string;
  };
}

function sanitizeTicker(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeHorizon(value: unknown): StockHorizon {
  if (value === 'swing' || value === 'short' || value === 'medium' || value === 'long') return value;
  return 'medium';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }

  try {
    const body = (req.body ?? {}) as RequestBody;
    const ticker = sanitizeTicker(body.ticker);
    if (!ticker) {
      return res.status(400).json({ error: 'Invalid ticker.' });
    }
    const horizon = sanitizeHorizon(body.horizon);
    const companyName = typeof body.companyName === 'string'
      ? body.companyName.slice(0, 80)
      : ticker;
    const exchange = typeof body.exchange === 'string' ? body.exchange.slice(0, 16) : 'NASDAQ';

    const userPrompt = [
      `טיקר: ${ticker}`,
      `שם חברה: ${companyName}`,
      `בורסה: ${exchange}`,
      `טווח: ${horizon}`,
      body.priceContext?.price !== undefined
        ? `מחיר נוכחי: ${body.priceContext.price} ${body.priceContext.currency ?? 'USD'} (שינוי: ${(body.priceContext.priceChangePct ?? 0).toFixed(2)}%)`
        : 'מחיר נוכחי: לא ידוע — תסביר בהתאם.',
      '',
      'החזר ניתוח מהיר לפי הסכמה. תזכור: כללי ברזל משפטיים, אסור להמליץ על פעולה ספציפית.',
    ].join('\n');

    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateObject({
      model: google(GEMINI_MODEL),
      system: STOCK_ANALYST_QUICK_PROMPT,
      prompt: userPrompt,
      schema: StockQuickResponseSchema as unknown as z.ZodSchema,
      temperature: 0.4,
    });

    const obj = result.object as Record<string, unknown>;
    return res.status(200).json({ ok: true, ...obj });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return res.status(500).json({ error: 'Stock analysis failed.', detail: message.slice(0, 200) });
  }
}
