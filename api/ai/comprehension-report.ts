import type { VercelRequest, VercelResponse } from '@vercel/node';

// POST /api/ai/comprehension-report
//
// Grades a finished live Captain Shark comprehension check. Input: the module's
// concepts + questions + grading rubric (keyPoints), the user's in-module
// performance, and the spoken-conversation transcript. Output: a structured
// JSON report (understanding score + shark-voice verdict + strengths +
// improvement points + per-concept grasp). Gemini grades ONLY against the
// supplied material/transcript — it must not invent facts or credit unspoken
// understanding. Shark voice, Hebrew, no jargon word, no shark emoji.

const GEMINI_MODEL = 'gemini-2.5-flash';

interface Turn {
  role: 'user' | 'shark';
  text: string;
}
interface ReportRequestBody {
  moduleId?: string;
  moduleTitle?: string;
  concepts?: string[];
  questions?: string[];
  keyPoints?: string[];
  performance?: {
    quizCorrect?: number;
    quizTotal?: number;
    recallMistakes?: number;
  };
  transcript?: Turn[];
}

interface PerConcept {
  concept: string;
  graspPct: number;
}
interface ComprehensionReport {
  understandingScore: number;
  verdictHe: string;
  strengthsHe: string[];
  improvementsHe: string[];
  perConcept: PerConcept[];
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function clampPct(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
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
    const body = (req.body ?? {}) as ReportRequestBody;
    const title = (body.moduleTitle ?? '').toString().slice(0, 120) || 'המודולה';
    const concepts = asStringArray(body.concepts, 8);
    const questions = asStringArray(body.questions, 6);
    const keyPoints = asStringArray(body.keyPoints, 8);
    const turns = Array.isArray(body.transcript) ? body.transcript.slice(0, 40) : [];

    const transcriptText =
      turns
        .map((t) => `${t.role === 'user' ? 'משתמש' : 'שארק'}: ${String(t.text ?? '').slice(0, 600)}`)
        .join('\n') || '(לא נאמר דבר — המשתמש כמעט ולא דיבר)';

    const perf = body.performance ?? {};
    const perfText = `קוויזים במודולה: ${perf.quizCorrect ?? 0}/${perf.quizTotal ?? 0} נכון. טעויות בתרגול: ${perf.recallMistakes ?? 0}.`;

    const systemPrompt = `אתה "קפטן שארק" מ-FinPlay, מאמן פיננסי חם ומעורר-השראה לבני דור Z בישראל.
הרגע סיימת שיחת בדיקת-הבנה קצרה עם המשתמש על המודולה "${title}".
המטרה: דוח שמרגיש כמו מאמן אישי שמאמין בך — מחמיא, ספציפי, ונותן ערך אמיתי, כך שהמשתמש *ירצה לחזור ולשחק עוד*.
עקרונות (חשובים):
- חם ומעודד תמיד. חוגג ספציפית מה שהמשתמש כן תפס ("תפסת ש...") כדי שירגיש מסוגל — תחושת מסוגלות היא מה שמחזיר אותו.
- ערך אמיתי: כל נקודת-שיפור היא צעד-הבא אחד, קטן וקונקרטי שקל לבצע — לא רשימת טעויות ולא "טעית ב...".
- מנטליות צמיחה: ציון נמוך = "אתה בונה את זה, עוד סבב ואתה שם" — לעולם לא ביקורת, בושה או טון מאכזב.
- סיים בנימה שמושכת לסבב הבא: תן סיבה אחת מסקרנת/מתגמלת להמשיך ללמוד.
- הוגנות: דרג לפי מה שבאמת נאמר בתמלול + הביצועים, אל תמציא ואל תזכה הבנה שלא הוצגה — אבל נסח כל ציון בעידוד. כשיש תמלול, התייחס ישירות למה שהמשתמש אמר ("כשאמרת ... ראיתי ש..."). אם אין תמלול עדיין, דרג לפי הקוויז/התרגול ונסח כהזמנה חמה לבדיקה הקולית.
- עברית, קול שארק, בלי אימוג'ים, בלי המילה "ז'רגון", בלי אנגלית מיותרת, גוף שני יחיד.
החזר JSON תקין בלבד בסכמה:
{"understandingScore": <0-100>, "verdictHe": "<משפט אחד חם שמסכם + מושך להמשך>", "strengthsHe": ["<מה תפסת טוב, ספציפי וגאה>", ...], "improvementsHe": ["<צעד-הבא אחד קטן ומזמין>", ...], "perConcept": [{"concept": "<שם המושג>", "graspPct": <0-100>}, ...]}
strengthsHe: 1-3 פריטים גאים וספציפיים. improvementsHe: 1-2 פריטים, כל אחד צעד-הבא מזמין (לא טעות). perConcept: שורה לכל מושג מהרשימה.`;

    const userPrompt = `המושגים שהמודולה לימדה:
${concepts.map((c) => `- ${c}`).join('\n') || '- (לא סופקו)'}

מה נחשב הבנה טובה (רוּבריקה):
${keyPoints.map((k) => `- ${k}`).join('\n') || '- (לא סופקה)'}

השאלות ששארק שאל:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n') || '(לא סופקו)'}

${perfText}

תמלול השיחה:
${transcriptText}

הפק עכשיו את דוח-ההבנה כ-JSON לפי הסכמה.`;

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024, temperature: 0.5 },
        }),
      },
    );

    if (!upstream.ok) {
      console.error(`[ai/comprehension-report] Gemini returned ${upstream.status}`);
      return res.status(502).json({ error: 'AI service temporarily unavailable.' });
    }

    const json = (await upstream.json()) as GeminiResponse;
    const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    let parsed: Partial<ComprehensionReport> = {};
    try {
      parsed = JSON.parse(raw) as Partial<ComprehensionReport>;
    } catch {
      // Gemini occasionally wraps JSON in prose despite the mime type — extract.
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<ComprehensionReport>;
        } catch {
          parsed = {};
        }
      }
    }

    const report: ComprehensionReport = {
      understandingScore: clampPct(parsed.understandingScore),
      verdictHe:
        (typeof parsed.verdictHe === 'string' && parsed.verdictHe.trim()) ||
        'כיף שלמדת איתי! בוא נראה איפה אתה כבר זוהר — ומה ננצח יחד בסבב הבא.',
      strengthsHe: asStringArray(parsed.strengthsHe, 3),
      improvementsHe: asStringArray(parsed.improvementsHe, 3),
      perConcept: Array.isArray(parsed.perConcept)
        ? parsed.perConcept
            .filter((p): p is PerConcept => !!p && typeof p.concept === 'string')
            .map((p) => ({ concept: p.concept.trim().slice(0, 80), graspPct: clampPct(p.graspPct) }))
            .slice(0, 8)
        : [],
    };

    return res.status(200).json({ ok: true, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[ai/comprehension-report] error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
