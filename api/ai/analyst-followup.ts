import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HEBREW_STYLE_RULES } from '../_shared/hebrewStyle';

// POST /api/ai/analyst-followup
//
// Free-text Q&A about a stock analysis the user just received from the FinPlay
// educational analyst (/api/ai/stock-analyze-quick|deep). After the analysis
// card lands, the user can "talk to Captain Shark about the report" — "למה
// HOLD?", "תסביר את יעד המחיר", "מה הסיכון הכי גדול?". Captain Shark answers
// grounded ONLY in the supplied analysis JSON + the prior follow-up turns + the
// question — he never invents prices, numbers or facts not in the analysis.
// Educational only, NOT licensed investment advice. Shark voice, Hebrew, no
// jargon word, no shark emoji. Mirrors api/ai/comprehension-followup.ts.

const GEMINI_MODEL = 'gemini-2.5-flash';

interface Turn {
  role: 'user' | 'shark';
  text: string;
}
interface FollowupRequestBody {
  ticker?: string;
  companyName?: string;
  mode?: 'quick' | 'deep';
  analysisJson?: string;
  history?: Turn[];
  question?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
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
    const body = (req.body ?? {}) as FollowupRequestBody;
    const question = (body.question ?? '').toString().trim().slice(0, 600);
    if (!question) return res.status(400).json({ error: 'Missing question' });

    const ticker = (body.ticker ?? '').toString().trim().slice(0, 12).toUpperCase();
    const companyName = (body.companyName ?? '').toString().trim().slice(0, 80) || ticker || 'המניה';
    const mode = body.mode === 'deep' ? 'deep' : 'quick';
    const modeLabel = mode === 'deep' ? 'ניתוח עומק' : 'סקירה מהירה';
    // The client sends JSON.stringify(analysis).slice(0, 12000); re-clamp defensively.
    const analysisJson = (body.analysisJson ?? '').toString().slice(0, 12000);

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const historyText =
      history
        .map((t) => `${t.role === 'user' ? 'משתמש' : 'שארק'}: ${String(t.text ?? '').slice(0, 500)}`)
        .join('\n') || '(אין)';

    const stockLabel = `${companyName}${ticker ? ` (${ticker})` : ''}`;

    const systemPrompt = `אתה "קפטן שארק" מ-FinPlay, אנליסט פיננסי חינוכי וחם לבני דור Z בישראל.
המשתמש בדיוק קיבל ${modeLabel} על המניה ${stockLabel}, ושואל אותך שאלות המשך עליה.
תפקידך: לענות בקצרה, בחום ובבהירות, בקול שלך — לעזור לו להבין את הניתוח.
חוקים:
- ענה אך ורק לפי נתוני הניתוח שסופקו, שאלות ההמשך הקודמות, והשאלה. אל תמציא מספרים, מחירים, יעדים או עובדות שלא מופיעים בניתוח.
- אם נשאלת על משהו שאין עליו מידע בניתוח — אמור זאת בכנות והחזר בעדינות למה שכן ידוע.
- 2-4 משפטים קצרים. עברית בלבד, גוף שני יחיד. בלי אימוג'ים, בלי המילה "ז'רגון", בלי אנגלית מיותרת (טיקר מותר).
- חשוב: זה ידע כללי לחינוך פיננסי, לא ייעוץ השקעות מוסמך. אל תיתן הוראת קנייה/מכירה אישית — הסבר את ההיגיון, וההחלטה היא של המשתמש.${HEBREW_STYLE_RULES}`;

    const userPrompt = `נתוני הניתוח (JSON) שהמשתמש קיבל על ${stockLabel}:
${analysisJson || '(לא סופק)'}

שיחה קודמת על הניתוח:
${historyText}

שאלת המשתמש עכשיו:
${question}

ענה עכשיו בקול קפטן שארק, מעוגן בניתוח בלבד.`;

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          // thinkingBudget:0 — disable Gemini 2.5 "thinking" so it doesn't eat
          // the output budget and truncate the visible Hebrew answer mid-sentence
          // (Yoav 2026-06-30: follow-up answers cut off). The reply is a short
          // grounded 2-4 sentence answer — no reasoning needed. 1024 gives Hebrew
          // headroom.
          generationConfig: { maxOutputTokens: 1024, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );

    if (!upstream.ok) {
      console.error(`[ai/analyst-followup] Gemini returned ${upstream.status}`);
      return res.status(502).json({ error: 'AI service temporarily unavailable.' });
    }

    const json = (await upstream.json()) as GeminiResponse;
    const answer =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';

    if (!answer) {
      return res.status(502).json({ error: 'Empty answer from AI service.' });
    }

    return res.status(200).json({ ok: true, answer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[ai/analyst-followup] error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
