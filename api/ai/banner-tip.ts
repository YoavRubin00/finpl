import type { VercelRequest, VercelResponse } from '@vercel/node';

interface BannerTipRequestBody {
  name: string;
  xp: number;
  streak: number;
  completedModuleCount: number;
  lastModuleName: string | null;
  financialGoal?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

const GEMINI_MODEL = 'gemini-2.5-flash';

const GOAL_LABELS: Record<string, string> = {
  'cash-flow':       'ניהול תזרים',
  'investing':       'השקעות',
  'army-release':    'שחרור מהצבא',
  'expand-horizons': 'הרחבת אופקים',
  'unsure':          'כללי',
};

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }

  try {
    const body = (req.body ?? {}) as Partial<BannerTipRequestBody>;

    const name = sanitizeString(body.name, 50) ?? 'חבר';
    const xp = Number(body.xp) || 0;
    const streak = Number(body.streak) || 0;
    const completedModuleCount = Number(body.completedModuleCount) || 0;
    const lastModuleName = body.lastModuleName
      ? (sanitizeString(String(body.lastModuleName), 80) ?? null)
      : null;
    const financialGoal = GOAL_LABELS[body.financialGoal ?? ''] ?? 'כללי';

    const systemPrompt = `אתה קפטן שארק, מנחה חם ומוטיבציוני של ${name} באפליקציית FinPlay.
כתוב הודעת דחיפה אחת, קצרה של עד 10 מילים בעברית, בגוף שני רבים.
ההודעה צריכה:
- להרגיש שנכתבה ספציפית עבור המשתמש (השתמש בנתון אמיתי שלהם)
- להיות חמה, מוטיבציונית, קצת "כריש" אבל לא מוגזמת
- לא להתחיל ב"היי" או "שלום"
- להחזיר רק את ההודעה עצמה, ללא כותרת, ללא ציטוטים`;

    const userMessage = `שם: ${name}
XP: ${xp.toLocaleString()}
רצף: ${streak} ימים
מודולים שהושלמו: ${completedModuleCount}
הנושא האחרון: ${lastModuleName ?? 'לא ידוע'}
מטרה: ${financialGoal}`;

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            maxOutputTokens: 60,
          },
        }),
      },
    );

    if (!upstream.ok) {
      console.error(`[ai/banner-tip] Gemini returned ${upstream.status}`);
      return res.status(502).json({ error: 'AI service temporarily unavailable.' });
    }

    const data = (await upstream.json()) as GeminiResponse;
    const message = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    if (!message) {
      return res.status(502).json({ error: 'Empty response.' });
    }

    return res.status(200).json({ ok: true, message });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[ai/banner-tip] error:', errMsg);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}