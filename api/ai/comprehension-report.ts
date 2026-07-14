import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HEBREW_STYLE_RULES } from '../_shared/hebrewStyle';

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
עקרונות הדירוג (חשובים מאוד):
- understandingScore הוא הערכה **כנה והוגנת** של כמה החומר הובן, בטווח המלא 0-100, לפי הראיות (קוויז, תמליל אם יש, ומידת ההבנה שהוצגה).
- **כיול — אל תהיה קמצן.** שפוט את *המשמעות*, לא את הניסוח. תשובה שמסרה את הרעיון המרכזי נכון — גם בעברית מדוברת, חופשית או קצרה — היא הבנה מלאה. שגיאות תמלול, שפת-רחוב או קיצור אינן טעות. עוגני ציון:
  · מסר את הרעיון המרכזי נכון (גם בניסוח חופשי/קצר) → 80-95
  · נכון חלקית / פספס ניואנס אחד → 55-75
  · לרוב לא מדויק או לא התעמק → 30-50
- אל תיתן לכולם ציון זהה — דרג לפי הראיות. אל תיתן 0 (סיום המודולה הוא תמיד בסיס אמיתי). (הערה: שכבה שמעליך ממירה את הציון לטווח-תצוגה — תפקידך רק לדרג נכון את ההבנה, בלי לנפח ובלי לקמץ.)
- הטון תמיד חם ומעודד. חוגג ספציפית מה שהמשתמש תפס ("תפסת ש...") כדי שירגיש מסוגל — תחושת מסוגלות היא מה שמחזיר אותו.
- ערך אמיתי: כל נקודת-שיפור היא צעד-הבא אחד, קטן וקונקרטי שקל לבצע — לא רשימת טעויות ולא "טעית ב...".
- מנטליות צמיחה: ציון בינוני = "אתה בונה את זה, עוד סבב ואתה שם" — לעולם לא ביקורת או טון מאכזב.
- סיים בנימה שמושכת לסבב הבא: תן סיבה אחת מסקרנת/מתגמלת להמשיך ללמוד.
- **התייחסות אישית (חובה כשיש תמלול):** כל חוזקה (strengthsHe) חייבת לצטט או לשקף מה שהמשתמש *באמת אמר* ("כשאמרת ש... ראיתי ש..."), וה-verdictHe מציין דבר קונקרטי אחד שהוא קלע בו. **כשאין תמלול — אל תאמר שהמשתמש "לא דיבר"/"לא ענה"; פשוט סכם את החומר והביצועים של המודולה כולה**, והזמן בחום לנסות גם את בדיקת-ההבנה הקולית.
- improvementsHe: כל פריט הוא צעד-הבא אחד קשור למושג ספציפי שבו היה רופף — לא גנרי.
- חובה: תמיד לפחות חוזקה אחת (strengthsHe) ולפחות צעד-שיפור אחד (improvementsHe), ושורת perConcept אחת לכל מושג ברשימת המושגים.
- עברית, קול שארק, בלי אימוג'ים, בלי המילה "ז'רגון", בלי אנגלית מיותרת, גוף שני יחיד.
החזר JSON תקין בלבד בסכמה:
{"understandingScore": <0-100>, "verdictHe": "<משפט אחד חם שמסכם את כל השיעור + מושך להמשך>", "strengthsHe": ["<מה תפסת טוב, ספציפי וגאה>", ...], "improvementsHe": ["<צעד-הבא אחד קטן ומזמין>", ...], "perConcept": [{"concept": "<שם המושג>", "graspPct": <0-100>}, ...]}
strengthsHe: 1-3 פריטים גאים וספציפיים. improvementsHe: 1-2 פריטים, כל אחד צעד-הבא מזמין (לא טעות). perConcept: שורה לכל מושג מהרשימה.${HEBREW_STYLE_RULES}`;

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
          generationConfig: {
            responseMimeType: 'application/json',
            // 2.5-flash is a thinking model — thought tokens count against
            // maxOutputTokens, and a truncated JSON meant understandingScore
            // parsed as NaN → 0 → pinned at the 70 display floor (Yoav 11.7).
            maxOutputTokens: 2048,
            temperature: 0.5,
            thinkingConfig: { thinkingBudget: 0 },
          },
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

    // The AI returns an HONEST, FAIRLY-CALIBRATED 0-100 read (correct-in-plain-
    // Hebrew answers score high — see the grading rubric in systemPrompt). We map
    // it to a display band that REWARDS good work while keeping real
    // differentiation — the bands chosen: strong→88-100, mid→75-85, weak→70-75.
    // A finished module NEVER reads below 70 (hard floor, Yoav 2026-06-29 —
    // finishing is always a real base) and never reads 0. Applied to BOTH the
    // headline and every per-concept bar so they stay consistent. Map
    // (completed): raw 35→75, 50→81, 65→87, 85→94, 100→100; not-completed
    // (defensive) shows the raw read. Coefficients tunable.
    const toDisplay = (r: number): number =>
      completed ? clampPct(Math.max(70, Math.round(62 + clampPct(r) * 0.38))) : clampPct(r);

    // Raw score guards (Yoav 11.7 — "always 70"): a missing/truncated AI score
    // used to clamp to 0 and pin the display at the floor. Fall back to the
    // quiz evidence; and when there was no voice call, the quiz IS the
    // evidence — never grade below what the quiz proved.
    const aiRaw = Number(parsed.understandingScore);
    const evidenceRaw = quizRatio != null ? Math.round(quizRatio * 100) : null;
    let rawScore = Number.isFinite(aiRaw) ? clampPct(aiRaw) : (evidenceRaw ?? 55);
    if (!hasTranscript && evidenceRaw != null) {
      rawScore = Math.max(rawScore, Math.max(0, evidenceRaw - 5));
    }
    const understandingScore = toDisplay(rawScore);

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
          .map((p) => ({
            concept: p.concept.trim().slice(0, 80),
            // Same NaN guard — a missing per-concept pct inherits the module's
            // raw read instead of collapsing to the 70 floor.
            graspPct: toDisplay(Number.isFinite(Number(p.graspPct)) ? Number(p.graspPct) : rawScore),
          }))
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
