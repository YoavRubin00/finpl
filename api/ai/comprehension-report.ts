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
    /** Did the user finish the whole module (reach the chest)? Defaults true. */
    completed?: boolean;
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

    const hasTranscript = turns.length > 0;
    const transcriptText = hasTranscript
      ? turns
          .map((t) => `${t.role === 'user' ? 'משתמש' : 'שארק'}: ${String(t.text ?? '').slice(0, 600)}`)
          .join('\n')
      : '(לא התקיימה שיחה קולית — הדוח מבוסס על כל פעילות המודולה: המושגים שנלמדו, ביצועי הקוויז, והשלמת המודולה)';

    const perf = body.performance ?? {};
    const completed = perf.completed !== false; // a report means the module was finished
    const quizTotal = Number(perf.quizTotal ?? 0);
    const quizCorrect = Number(perf.quizCorrect ?? 0);
    const quizRatio = quizTotal > 0 ? Math.max(0, Math.min(1, quizCorrect / quizTotal)) : null;
    const perfText = [
      completed ? 'המשתמש סיים את כל המודולה (הגיע לתיבה) — השלמה מלאה.' : 'המשתמש עדיין באמצע המודולה.',
      quizTotal > 0
        ? `ביצועי קוויז במודולה: ${quizCorrect}/${quizTotal} נכון.`
        : 'לא נצברו נתוני קוויז במפורש במודולה הזו (לדרג לפי ההשלמה והחומר).',
    ].join(' ');

    const systemPrompt = `אתה "קפטן שארק" מ-FinPlay, מאמן פיננסי חם ומעורר-השראה לבני דור Z בישראל.
המשתמש הרגע **סיים את כל המודולה** "${title}" — זו הצלחה בפני עצמה. אתה כותב לו "דוח סיכום שיעור": סיכום חם ואישי של כל מה שלמד והפגין במודולה כולה.
הדוח מבוסס על **כל פעילות המודולה** — המושגים שנלמדו, ביצועי הקוויז, ועצם השלמת המודולה — ובנוסף, אם התקיימה שיחת-הבנה קולית עם שארק, גם מה שנאמר בה. השיחה היא רק חלק אחד; גם בלעדיה יש דוח מלא ומשמעותי על כל השיעור.
עקרונות (חשובים):
- מי שסיים את המודולה כבר בנה בסיס מוצק. הציון משקף כמה החומר הוטמע, ומתחיל מבסיס טוב — **לעולם לא 0, לעולם לא בושה**. גם סיכום מעולה מקבל לפחות אמצע-הדרך.
- חם ומעודד תמיד. חוגג ספציפית מה שהמשתמש כן תפס ("תפסת ש...") כדי שירגיש מסוגל — תחושת מסוגלות היא מה שמחזיר אותו.
- ערך אמיתי: כל נקודת-שיפור היא צעד-הבא אחד, קטן וקונקרטי שקל לבצע — לא רשימת טעויות ולא "טעית ב...".
- מנטליות צמיחה: ציון בינוני = "אתה בונה את זה, עוד סבב ואתה שם" — לעולם לא ביקורת או טון מאכזב.
- סיים בנימה שמושכת לסבב הבא: תן סיבה אחת מסקרנת/מתגמלת להמשיך ללמוד.
- הוגנות: דרג לפי הראיות (השלמה, קוויז, ותמלול אם יש). כשיש תמלול — התייחס ישירות למה שהמשתמש אמר ("כשאמרת ... ראיתי ש..."). **כשאין תמלול — אל תאמר שהמשתמש "לא דיבר"/"לא ענה"; פשוט סכם את החומר והביצועים של המודולה כולה**, והזמן בחום לנסות גם את בדיקת-ההבנה הקולית.
- חובה: תמיד לפחות חוזקה אחת (strengthsHe) ולפחות צעד-שיפור אחד (improvementsHe), ושורת perConcept אחת לכל מושג ברשימת המושגים.
- עברית, קול שארק, בלי אימוג'ים, בלי המילה "ז'רגון", בלי אנגלית מיותרת, גוף שני יחיד.
החזר JSON תקין בלבד בסכמה:
{"understandingScore": <0-100>, "verdictHe": "<משפט אחד חם שמסכם את כל השיעור + מושך להמשך>", "strengthsHe": ["<מה תפסת טוב, ספציפי וגאה>", ...], "improvementsHe": ["<צעד-הבא אחד קטן ומזמין>", ...], "perConcept": [{"concept": "<שם המושג>", "graspPct": <0-100>}, ...]}
strengthsHe: 1-3 פריטים גאים וספציפיים. improvementsHe: 1-2 פריטים, כל אחד צעד-הבא מזמין (לא טעות). perConcept: שורה לכל מושג מהרשימה.`;

    const userPrompt = `המושגים שהמודולה לימדה:
${concepts.map((c) => `- ${c}`).join('\n') || '- (לא סופקו)'}

מה נחשב הבנה טובה (רוּבריקה):
${keyPoints.map((k) => `- ${k}`).join('\n') || '- (לא סופקה)'}

${hasTranscript ? `השאלות ששארק שאל בשיחה:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n') || '(לא סופקו)'}` : 'לא התקיימה שיחת-הבנה קולית במודולה הזו.'}

ביצועים במודולה: ${perfText}

תמלול השיחה הקולית:
${transcriptText}

הפק עכשיו את דוח-סיכום-השיעור (על כל המודולה) כ-JSON לפי הסכמה.`;

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

    // Completion floor: finishing the whole module is a real achievement, so a
    // completed module can NEVER score 0. Base 50 for completion; the quiz nudges
    // it up to 90. We only FLOOR the AI's score — never cap a higher one (e.g. a
    // great voice transcript can still push past the floor).
    const completionFloor = completed
      ? quizRatio !== null
        ? Math.round(45 + quizRatio * 45) // quiz 0%→45, 50%→67, 100%→90
        : 50 // completed, no quiz signal → solid "you've got the base"
      : 0;
    const understandingScore = Math.max(clampPct(parsed.understandingScore), completionFloor);

    // Never show an empty report. A finished module always gets at least one
    // proud strength and one inviting next-step, plus a per-concept recap — so
    // the screen shows real content even when the AI returns sparse arrays.
    let strengthsHe = asStringArray(parsed.strengthsHe, 3);
    if (strengthsHe.length === 0) {
      strengthsHe = [`סיימת את כל "${title}" — הבסיס כבר אצלך, וזה הדבר הכי חשוב.`];
    }
    let improvementsHe = asStringArray(parsed.improvementsHe, 3);
    if (improvementsHe.length === 0) {
      improvementsHe = concepts[0]
        ? [`סבב חזרה קצר על "${concepts[0]}" יקבע את זה אצלך עוד יותר חזק.`]
        : ['סבב חזרה קצר על המודולה יחדד את מה שכבר תפסת.'];
    }
    let perConcept: PerConcept[] = Array.isArray(parsed.perConcept)
      ? parsed.perConcept
          .filter((p): p is PerConcept => !!p && typeof p.concept === 'string')
          .map((p) => ({ concept: p.concept.trim().slice(0, 80), graspPct: clampPct(p.graspPct) }))
          .slice(0, 8)
      : [];
    if (perConcept.length === 0 && concepts.length > 0) {
      // Recap fallback: list every concept at the module's overall grasp level.
      perConcept = concepts.slice(0, 8).map((c) => ({ concept: c.slice(0, 80), graspPct: understandingScore }));
    }

    const report: ComprehensionReport = {
      understandingScore,
      verdictHe:
        (typeof parsed.verdictHe === 'string' && parsed.verdictHe.trim()) ||
        'כיף שלמדת איתי! בוא נראה איפה אתה כבר זוהר — ומה ננצח יחד בסבב הבא.',
      strengthsHe,
      improvementsHe,
      perConcept,
    };

    return res.status(200).json({ ok: true, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[ai/comprehension-report] error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
