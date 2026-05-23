import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * POST /api/ai/analyst-followup
 *
 * Lightweight follow-up Q&A for the Stock Analyst feature, powered by
 * Gemini 2.5 Flash (cheap + fast). Receives the original analysis as
 * context plus any prior turns of the follow-up conversation, and
 * returns a short Hebrew answer scoped to that analysis.
 *
 * Body:
 *   { ticker, companyName, mode: 'quick'|'deep',
 *     analysisJson: string (stringified analysis),
 *     history: Array<{ role: 'user'|'shark', text: string }>,
 *     question: string }
 *
 * Response: 200 { ok: true, answer: string }
 */

const MODEL = 'gemini-2.5-flash';

interface RequestBody {
  ticker?: string;
  companyName?: string;
  mode?: 'quick' | 'deep';
  analysisJson?: string;
  history?: Array<{ role?: string; text?: string }>;
  question?: string;
}

const SYSTEM = `אתה "קפטן שארק" — מנטור פיננסי חינוכי באפליקציית FinPlay לבני דור Z בישראל. אתה ממשיך שיחה על ניתוח מניה ספציפי שכבר נתת בפלטפורמה.

כללי דיבור:
- עברית בלבד. אם המשתמש כותב באנגלית, ענה בעברית.
- 2-5 משפטים. תמציתי, ידידותי, אנליטי.
- אם המשתמש שואל משהו שמופיע בניתוח — תפנה אליו ("כמו שראית בקטע על פונדמנטלים…") במקום לחזור על הכל.
- אם השאלה מחוץ לטווח הניתוח (לא קשורה למניה הזו / לא קשורה לנושאים פיננסיים) — הסבר בעדינות שאתה ממוקד בניתוח הזה ותציע לחזור לאנליסט עם טיקר אחר.
- בלי markdown, רשימות, סוגריים מרובעים [], או אימוג'ים מוגזמים. אימוג'י אחד כל כמה תשובות לכל היותר.

🛡️ חוקי ברזל:
- אתה לא יועץ השקעות מורשה. אסור לכתוב "תקנה", "תמכור", "כדאי לקנות". במקום זה: "תובנה", "שווה לחקור", "מעניין מבחינה לימודית".
- ביצועי עבר אינם מנבאים את העתיד.
- כל תשובה חינוכית בלבד; להחלטה — לפנות ליועץ מורשה.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured.' });

  try {
    const body = (req.body ?? {}) as RequestBody;
    const question = typeof body.question === 'string' ? body.question.trim().slice(0, 600) : '';
    if (!question) return res.status(400).json({ error: 'Missing question.' });

    const ticker = typeof body.ticker === 'string' ? body.ticker.toUpperCase().slice(0, 10) : '?';
    const companyName = typeof body.companyName === 'string' ? body.companyName.slice(0, 80) : ticker;
    const mode = body.mode === 'deep' ? 'deep' : 'quick';
    const analysisJson = typeof body.analysisJson === 'string'
      ? body.analysisJson.slice(0, 12000)
      : '';
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    const historyText = history
      .filter((t) => t && (t.role === 'user' || t.role === 'shark') && typeof t.text === 'string')
      .map((t) => `${t.role === 'user' ? 'משתמש' : 'שארק'}: ${(t.text ?? '').slice(0, 500)}`)
      .join('\n');

    const userPrompt = [
      `המניה הנדונה: ${companyName} (${ticker})`,
      `מצב ניתוח: ${mode === 'deep' ? 'מעמיק' : 'מהיר'}`,
      '',
      'הניתוח שניתן למשתמש (JSON מלא, חינוכי):',
      analysisJson || '(לא סופק ניתוח — ענה כללית בהקשר של המניה.)',
      '',
      historyText ? `שיחה קודמת:\n${historyText}\n` : '',
      `שאלת המשתמש החדשה: ${question}`,
      '',
      'ענה קצר ומדויק לפי הניתוח. אם השאלה מחוץ לטווח — הסבר בעדינות.',
    ].filter(Boolean).join('\n');

    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(MODEL),
      system: SYSTEM,
      prompt: userPrompt,
      temperature: 0.6,
    });

    const answer = (result.text ?? '').trim().slice(0, 1500);
    return res.status(200).json({ ok: true, answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return res.status(500).json({ error: 'Follow-up failed.', detail: message.slice(0, 200) });
  }
}
