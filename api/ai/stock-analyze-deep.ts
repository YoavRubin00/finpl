import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  buildStockAnalystDeepPrompt,
  type StockHorizon,
} from '../_shared/stockAnalystPrompt';
import { StockDeepResponseSchema } from '../_shared/stockAnalystSchemas';

/**
 * POST /api/ai/stock-analyze-deep
 *
 * Multi-section deep stock analysis backed by **Claude Opus 4.7 with
 * extended thinking** — chosen because the user explicitly asked for the
 * highest-quality reasoning model available. Returns the full
 * StockAnalysis JSON per the PORTFOLIO schema.
 *
 * Request body: { ticker, companyName, horizon, exchange?, marketContext? }
 * Response: 200 { ...StockAnalysis }
 *
 * maxDuration is set to 120s to accommodate the thinking budget.
 */

export const config = { maxDuration: 120 };

const ANTHROPIC_MODEL = 'claude-opus-4-7';

interface RequestBody {
  ticker?: string;
  companyName?: string;
  horizon?: StockHorizon;
  exchange?: string;
  marketContext?: {
    price?: number;
    priceChangePct?: number;
    currency?: string;
    range52w?: { low: number; high: number };
    avgVolume?: number;
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

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    // Logged so it shows up in Vercel Logs every time a user hits the
    // deep-analyze CTA — otherwise the misconfig is silent on the server
    // side and only the user sees the shark-voice fallback.
    console.error('[stock-analyze-deep] ANTHROPIC_API_KEY missing — deep analysis disabled');
    return res.status(503).json({ error: 'Deep analysis service not configured.' });
  }

  try {
    const body = (req.body ?? {}) as RequestBody;
    const ticker = sanitizeTicker(body.ticker);
    if (!ticker) return res.status(400).json({ error: 'Invalid ticker.' });

    const horizon = sanitizeHorizon(body.horizon);
    const companyName = typeof body.companyName === 'string' ? body.companyName.slice(0, 80) : ticker;
    const exchange = typeof body.exchange === 'string' ? body.exchange.slice(0, 16) : 'NASDAQ';

    const userPrompt = [
      `טיקר: ${ticker}`,
      `שם חברה: ${companyName}`,
      `בורסה: ${exchange}`,
      `טווח: ${horizon}`,
      body.marketContext?.price !== undefined
        ? `מחיר נוכחי: ${body.marketContext.price} ${body.marketContext.currency ?? 'USD'} (שינוי: ${(body.marketContext.priceChangePct ?? 0).toFixed(2)}%)`
        : 'מחיר נוכחי: לא ידוע.',
      body.marketContext?.range52w
        ? `טווח 52 שבועות: ${body.marketContext.range52w.low} – ${body.marketContext.range52w.high}`
        : '',
      body.marketContext?.avgVolume !== undefined
        ? `נפח ממוצע: ${body.marketContext.avgVolume.toLocaleString()}`
        : '',
      '',
      'החזר ניתוח מעמיק לפי הסכמה. וודא עקביות בין conviction / verdict / ranking / ציוני המשנה.',
      'זכור: כללי ברזל משפטיים, אסור לתת הוראת פעולה ספציפית.',
    ].filter(Boolean).join('\n');

    // We can't use Anthropic's strict structured output mode because the
    // full StockAnalysis grammar is too large for the model's compiled
    // tool schema. Instead: ask for raw JSON in the prompt, parse + Zod
    // validate locally.
    const schemaShape = [
      '{',
      '  "ticker": "<טיקר>",',
      '  "companyName": "<שם חברה>",',
      '  "horizon": "swing|short|medium|long",',
      '  "fundamental": {',
      '    "headline": "<משפט>",',
      '    "revenueGrowthYoY": <number|null>,',
      '    "marginTrend": "improving|stable|declining|unknown",',
      '    "cashPosition": "<טקסט>",',
      '    "debtLoad": "<טקסט>",',
      '    "valuation": { "peRatio": <num|null>, "pegRatio": <num|null>, "relativeNote": "<טקסט>" },',
      '    "highlights": ["..."], "risks": ["..."],',
      '    "commentary": { "pose":"talking|fire|empathic|happy|tablet|hello|dancing", "variant":"info|positive|warning|danger", "message":"..." }',
      '  },',
      '  "businessIntel": {',
      '    "ownership": { "insiderPct": <0-100>, "institutionalPct": <0-100>, "publicPct": <0-100>, "note": "..." },',
      '    "insiderActivity": { "netDirection": "buying|selling|neutral|unknown", "detail": "..." },',
      '    "jobsTrend": [ { "dept":"...", "weight": <0-100> } ],',
      '    "patentActivity": "...",',
      '    "sentiment": { "label":"very-positive|positive|neutral|negative|very-negative|unknown", "summary":"..." },',
      '    "commentary": { "pose":"...", "variant":"...", "message":"..." }',
      '  },',
      '  "thesis": {',
      '    "bullCase": ["..."], "bearCase": ["..."],',
      '    "conviction": <1-10>, "convictionLabel": "...",',
      '    "commentary": { "pose":"...", "variant":"...", "message":"..." }',
      '  },',
      '  "sectorMacro": {',
      '    "sector": "...", "sectorTrend": "tailwind|neutral|headwind",',
      '    "peers": [ { "symbol":"...", "name":"...", "note":"...", "delta":"..." } ],',
      '    "macroNotes": ["..."],',
      '    "commentary": { "pose":"...", "variant":"...", "message":"..." }',
      '  },',
      '  "catalysts": {',
      '    "upcoming": [ { "title":"...", "timing":"...", "impact":"low|medium|high" } ],',
      '    "watchList": ["..."],',
      '    "commentary": { "pose":"...", "variant":"...", "message":"..." }',
      '  },',
      '  "summary": {',
      '    "verdict": "BUY|HOLD|SELL|AVOID",',
      '    "ranking": "Leader|Challenger|Laggard",',
      '    "oneLiner": "...",',
      '    "scoreBreakdown": { "fundamentals": <0-10>, "momentum": <0-10>, "sentiment": <0-10>, "moat": <0-10> },',
      '    "priceTargets": { "bear": <num>, "base": <num>, "bull": <num>, "currency": "USD" },',
      '    "closingNote": { "pose":"...", "variant":"...", "message":"..." }',
      '  }',
      '}',
    ].join('\n');

    const finalPrompt = `${userPrompt}\n\nהחזר JSON תקני בלבד שתואם לסכמה הבאה (בלי טקסט נוסף, בלי \`\`\`):\n${schemaShape}`;

    const anthropic = createAnthropic({ apiKey });
    const result = await generateText({
      model: anthropic(ANTHROPIC_MODEL),
      system: buildStockAnalystDeepPrompt(horizon),
      prompt: finalPrompt,
      // Opus 4.7's adaptive thinking ("high") materially improves the
      // financial reasoning behind the verdict/conviction consistency.
      providerOptions: {
        anthropic: {
          effort: 'high',
        },
      },
      temperature: 0.4,
    });

    // Strip markdown fences if the model wraps the JSON anyway.
    const raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: 'Deep stock analysis: invalid JSON.', detail: raw.slice(0, 200) });
    }

    const validation = StockDeepResponseSchema.safeParse({
      ...(parsed as Record<string, unknown>),
      ticker,
      companyName,
      horizon,
    });
    if (!validation.success) {
      return res.status(502).json({
        error: 'Deep stock analysis: schema mismatch.',
        detail: validation.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }

    return res.status(200).json({ ok: true, ...validation.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return res.status(500).json({ error: 'Deep stock analysis failed.', detail: message.slice(0, 300) });
  }
}
