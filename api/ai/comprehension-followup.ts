import type { VercelRequest, VercelResponse } from '@vercel/node';

// POST /api/ai/comprehension-followup
//
// Free-text Q&A about a finished lesson comprehension report. The user just
// received their "דוח סיכום שיעור" (understanding score + strengths +
// improvements, graded by /api/ai/comprehension-report) and wants to talk to
// Captain Shark about it — "why is my score 60?", "explain the second point",
// "how do I improve on X?". Captain Shark answers grounded ONLY in the report +
// what the user actually said in the module (transcript) + the module's
// concepts. He never invents new grades or facts. Shark voice, Hebrew, no
// jargon word, no shark emoji.

const GEMINI_MODEL = 'gemini-2.5-flash';

interface Turn {
  role: 'user' | 'shark';
  text: string;
}
interface ReportSummary {
  understandingScore?: number;
  verdictHe?: string;
  strengthsHe?: string[];
  improvementsHe?: string[];
  perConcept?: Array<{ concept?: string; graspPct?: number }>;
}
interface FollowupRequestBody {
  moduleTitle?: string;
  concepts?: string[];
  keyPoints?: string[];
  report?: ReportSummary;
  transcript?: Turn[];
  history?: Turn[];
  question?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
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

    const title = (body.moduleTitle ?? '').toString().slice(0, 120) || 'המודולה';
    const concepts = asStringArray(body.concepts, 8);
    const keyPoints = asStringArray(body.keyPoints, 8);
    const report = body.report ?? {};
    const score = Number.isFinite(Number(report.understandingScore))
      ? Math.round(Number(report.understandingScore))
      : null;

    const turns = Array.isArray(body.transcript) ? body.transcript.slice(0, 30) : [];
    const transcriptText =
      turns
        .map((t) => `${t.role === 'user' ? 'משתמש' : 'שארק'}: ${String(t.text ?? '').slice(0, 500)}`)
        .join('\n') || '(לא התקיימה שיחה קולית — הדוח התבסס על פעילות המודולה)';

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const historyText =
      history
        .map((t) => `${t.role === 'user' ? 'משתמש' : 'שארק'}: ${String(t.text ?? '').slice(0, 500)}`)
        .join('\n') || '(אין)';

    const reportText = [
      score !== null ? `ציון הבנה: ${score}/100` : '',
      report.verdictHe ? `שורת סיכום: ${report.verdictHe}` : '',
      asStringArray(report.strengthsHe, 3).length
        ? `חוזקות: ${asStringArray(report.strengthsHe, 3).join(' · ')}`
        : '',
      asStringArray(report.improvementsHe, 3).length
        ? `לשיפור: ${asStringArray(report.improvementsHe, 3).join(' · ')}`
        : '',
      Array.isArray(report.perConcept) && report.perConcept.length
        ? `לפי מושג: ${report.perConcept
            .filter((p) => p && typeof p.concept === 'string')
            .map((p) => `${p.concept} ${Math.round(Number(p.graspPct ?? 0))}%`)
            .join(' · ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const systemPrompt = `אתה "קפטן שארק" מ-FinPlay, מחנך פיננסי חם לבני דור Z בישראל.
המשתמש בדיוק קיבל דוח-הבנה על מודולת הלמידה "${title}", ושואל אותך שאלות עליו.
תפקידך: לענות בקצרה, בחום ובכנות, בקול שלך — לעזור לו להבין את הדוח ולהשתפר.
חוקים: ענה אך ורק לפי הדוח, מה שהמשתמש אמר, והמושגים שהמודולה לימדה. אל תמציא ציונים או עובדות חדשות. אם נשאלת על משהו מחוץ למודולה — החזר אותו בעדינות לחומר. 2-4 משפטים קצרים. עברית בלבד, גוף שני יחיד. בלי אימוג'ים, בלי המילה "ז'רגון", בלי אנגלית מיותרת. אתה לא יועץ השקעות מוסמך — זה ידע כללי לחינוך.`;

    const userPrompt = `המושגים שהמודולה לימדה:
${concepts.map((c) => `- ${c}`).join('\n') || '- (לא סופקו)'}

מה נחשב הבנה טובה:
${keyPoints.map((k) => `- ${k}`).join('\n') || '- (לא סופק)'}

הדוח שהמשתמש קיבל:
${reportText || '(לא סופק)'}

תמלול מה שהמשתמש אמר במודולה:
${transcriptText}

שיחה קודמת על הדוח:
${historyText}

שאלת המשתמש עכשיו:
${question}

ענה עכשיו בקול קפטן שארק.`;

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          // thinkingBudget:0 — disable Gemini 2.5 "thinking" so it doesn't eat
          // the output budget and truncate the visible Hebrew answer mid-sentence.
          // The reply is a short grounded 2-4 sentence answer — no reasoning
          // needed. 1024 gives Hebrew headroom. (Mirrors analyst-followup.)
          generationConfig: { maxOutputTokens: 1024, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );

    if (!upstream.ok) {
      console.error(`[ai/comprehension-followup] Gemini returned ${upstream.status}`);
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
    console.error('[ai/comprehension-followup] error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
