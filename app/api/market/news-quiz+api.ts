/**
 * GET /api/market/news-quiz
 *
 * Pulls a real Globes headline, asks Gemini to paraphrase it (copyright-safe)
 * AND generate a teaching question + 3 choices + explanation.
 * Cached per Israel calendar day on success. Failures aren't cached as
 * "today's quiz" — they retry on every request after a short backoff.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import type { NewsQuizData, NewsQuizChoice } from '../../../src/features/finfeed/liveMarketTypes';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

const TIMEOUT_MS = 8_000;
const sig = () => {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return ctrl.signal;
};

async function fetchGlobesHeadline(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585',
      { headers: { Accept: 'application/xml' }, signal: sig() },
    );
    if (!res.ok) return null;
    const xml = await res.text();
    const match = xml.match(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/);
    if (!match) return null;
    return match[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
  } catch {
    return null;
  }
}

interface GeminiQuizResult {
  rewrittenHeadline: string;
  question: string;
  choices: [NewsQuizChoice, NewsQuizChoice, NewsQuizChoice];
  correctChoiceId: 'a' | 'b' | 'c';
  explanation: string;
}

async function generateQuiz(originalHeadline: string): Promise<GeminiQuizResult | null> {
  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
  if (!GEMINI_API_KEY) return null;

  const prompt = `אתה מורה לחינוך פיננסי לדור Z בישראל. קראת את הכותרת המקורית מגלובס:
"${originalHeadline}"

המשימה שלך — להחזיר JSON שיוצג למשתמש צעיר (20-30) באפליקציית FinPlay:

1. **rewrittenHeadline** — שכתב את הכותרת בעברית **בנוסח שונה לחלוטין** משיקולי זכויות יוצרים. שמור על הנושא והעובדה המרכזית, החלף ניסוח, מבנה משפט, ומילים. עד 14 מילים. אינפורמטיבי, ניטרלי, מעניין. **חובה לשנות לפחות 70% מהמילים מהמקור.**

2. **question** — שאלה חינוכית אמיתית שמלמדת **קונספט פיננסי** הקשור לכותרת. לא 'מה אמרו בחדשות', אלא 'איך הקונספט הזה משפיע על החיים שלי'. בודקת הבנה של עקרון, לא שינון נתון. עד 22 מילים.

3. **choices** — 3 תשובות, כל אחת 8-15 מילים. אחת נכונה. הלא-נכונות יכולות להיות טעויות מחשבה אמיתיות שצעירים עושים (לא 'תשובות שטות'). חובה: נכונה אחת, שתי הסחות.

4. **correctChoiceId** — 'a' / 'b' / 'c'.

5. **explanation** — 2-3 משפטים. מה הקונספט הפיננסי, ולמה זה רלוונטי לחיי היומיום של מישהו בן 25 בישראל. ישיר, ללא קלישאות.

החזר JSON תקין בלבד, ללא markdown, ללא טקסט נוסף:
{
  "rewrittenHeadline": "...",
  "question": "...",
  "choices": [
    {"id": "a", "text": "..."},
    {"id": "b", "text": "..."},
    {"id": "c", "text": "..."}
  ],
  "correctChoiceId": "a",
  "explanation": "..."
}`;

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) return null;
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as GeminiQuizResult;
    if (
      !parsed.rewrittenHeadline ||
      !parsed.question ||
      !parsed.choices ||
      parsed.choices.length !== 3 ||
      !parsed.correctChoiceId ||
      !parsed.explanation
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** YYYY-MM-DD in Asia/Jerusalem so the daily refresh aligns with users' actual day boundary. */
function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Cache: a real (non-fallback) response is cached for the rest of the Israel day.
let _cache: { data: NewsQuizData; date: string } | null = null;
// Backoff: after a fallback, retry only after this timestamp passes.
let _fallbackBackoffUntil = 0;
const FALLBACK_BACKOFF_MS = 5 * 60 * 1000; // 5 min

/** 7 evergreen fallback quizzes — rotate by Israeli day-of-week so the user
 *  sees a different concept each day even when Globes/Gemini are down.
 *  Order: 0=Sunday … 6=Saturday. Topics are timeless (compounding, inflation,
 *  emergency fund, etc.) so they don't go stale across years. */
const EVERGREEN_FALLBACKS: ReadonlyArray<Omit<NewsQuizData, 'quizId' | 'generatedAt' | 'isFallback'>> = [
  // ── Sunday: ריבית דריבית ──
  {
    headline: 'מחקר: 80% מהצעירים מפספסים את כוח ריבית דריבית',
    question: 'בני 25 שמתחיל לחסוך 500₪/חודש בתשואה 8% — כמה יהיו לו בגיל 65?',
    choices: [
      { id: 'a', text: 'בערך 1.7 מיליון ₪ — ריבית דריבית עושה את העבודה' },
      { id: 'b', text: 'בערך 240,000 ₪ — סכום ההפקדות הכולל' },
      { id: 'c', text: 'בערך 480,000 ₪ — כפול ההפקדה' },
    ],
    correctChoiceId: 'a',
    explanation: 'ריבית דריבית = הריבית מרוויחה עוד ריבית. אחרי 40 שנה, החיסכון גדל פי 7. איינשטיין קרא לזה "הפלא השמיני".',
    xpReward: 10,
    coinReward: 5,
  },
  // ── Monday: אינפלציה ──
  {
    headline: 'אינפלציה ב-3% לשנה — מה זה אומר על 100,000 ₪ בחיסכון?',
    question: 'אם משאירים 100,000 ₪ במזומן 10 שנים באינפלציה 3%, כמה הם יקנו בעתיד?',
    choices: [
      { id: 'a', text: 'בערך 74,000 ₪ — האינפלציה אכלה את כוח הקנייה' },
      { id: 'b', text: '100,000 ₪ — ערך הכסף קבוע אם לא מוציאים' },
      { id: 'c', text: '130,000 ₪ — הסכום עולה עם הזמן' },
    ],
    correctChoiceId: 'a',
    explanation: 'מזומן יושב = ערכו נשחק. במזומן בלי השקעה, אינפלציה של 3% לשנה מכרסמת ~26% מכוח הקנייה ב-10 שנים.',
    xpReward: 10,
    coinReward: 5,
  },
  // ── Tuesday: קרן השתלמות ──
  {
    headline: '"היהלום" של שוק ההון: למה קרן השתלמות מנצחת רוב החסכונות',
    question: 'מה הפטור הייחודי של קרן השתלמות אחרי 6 שנים?',
    choices: [
      { id: 'a', text: 'פטור מלא ממס רווחי הון (25%) על כל הרווחים' },
      { id: 'b', text: 'הפקדה ללא הגבלה גם בלי קשר למשכורת' },
      { id: 'c', text: 'משיכה מיידית של החיסכון בלי שום תנאי' },
    ],
    correctChoiceId: 'a',
    explanation: 'קרן השתלמות אחרי 6 שנים = פטורה ממס רווחי הון. בקרן שגדלה מ-50K ל-100K, חוסכים 12,500 ₪ מס. מסיבה זו היא נחשבת לאחד הכלים הכי טובים בשוק הישראלי.',
    xpReward: 10,
    coinReward: 5,
  },
  // ── Wednesday: דמי ניהול ──
  {
    headline: 'דמי ניהול 2% נראים קטנים — אבל אוכלים חצי מהפנסיה',
    question: 'בפנסיה של 30 שנה ב-7% תשואה, איך 2% דמי ניהול שונים מ-0.5%?',
    choices: [
      { id: 'a', text: 'מאבדים בערך 40-50% מהפנסיה הסופית' },
      { id: 'b', text: 'מאבדים בערך 1.5% — זוטות, לא משנה' },
      { id: 'c', text: 'מאבדים בערך 15% — מורגש אבל לא קריטי' },
    ],
    correctChoiceId: 'a',
    explanation: 'דמי ניהול נצברים על תיק שגדל. 2% במקום 0.5% למשך 30 שנה = חצי פנסיה פחות. זה ההבדל בין פרישה ב-65 לפרישה ב-72.',
    xpReward: 10,
    coinReward: 5,
  },
  // ── Thursday: קרן חירום ──
  {
    headline: '60% מהישראלים בני 25-35 בלי קרן חירום בכלל',
    question: 'מה הסכום הסביר לקרן חירום למישהו שמרוויח 12,000 ₪ נטו?',
    choices: [
      { id: 'a', text: '36-72K ₪ — בערך 3-6 חודשי הוצאות' },
      { id: 'b', text: '5,000 ₪ — מספיק לתיקון רכב או רופא שיניים' },
      { id: 'c', text: '200K ₪ — לפחות שנתיים של ביטחון מלא' },
    ],
    correctChoiceId: 'a',
    explanation: 'קרן חירום = 3-6 חודשי הוצאות (לא משכורת!). למי שהוצאות ~9,000 ₪/חודש, היעד הוא 27-54K ₪. נשמר בחשבון נזיל, לא בהשקעה.',
    xpReward: 10,
    coinReward: 5,
  },
  // ── Friday: מדדים ──
  {
    headline: 'S&P 500 הכה כמעט 90% ממנהלי הקרנות בעשור האחרון',
    question: 'למה כל-כך קשה למנהל קרן אקטיבי לנצח את מדד S&P 500?',
    choices: [
      { id: 'a', text: 'דמי ניהול גבוהים + עלויות מסחר אוכלים את התשואה' },
      { id: 'b', text: 'המדד עצמו תופס אוטומטית את הזוכים והמפסידים' },
      { id: 'c', text: 'שני התשובות נכונות — קומבינציה של עלויות + מבנה שוק' },
    ],
    correctChoiceId: 'c',
    explanation: 'מנהל אקטיבי גובה 1-2%/שנה ועושה הרבה מסחר. ה-S&P מחזיק את הטופ-500 אוטומטית בלי עלויות, ומתעדכן אם חברה נופלת או עולה. הקומבינציה הזאת קשה לנצח לאורך זמן.',
    xpReward: 10,
    coinReward: 5,
  },
  // ── Saturday: פיזור סיכונים ──
  {
    headline: 'חוקי הזהב של הפיזור: למה לא לשים הכל במניה אחת',
    question: 'משקיע ישראלי שם 100% מההון במניית בנק לאומי. מה הסיכון העיקרי?',
    choices: [
      { id: 'a', text: 'ירידה אחת בבנק = ירידה של כל ההון, אין עמיד' },
      { id: 'b', text: 'אין סיכון מיוחד — בנקים גדולים תמיד יציבים' },
      { id: 'c', text: 'הסיכון רק מטבעי — אם יורד ההון יחזור לתקן' },
    ],
    correctChoiceId: 'a',
    explanation: 'מניה אחת = idiosyncratic risk. אם החברה נופלת (FTX, Lehman, Wirecard), אין מי שייתן עמידות. פיזור על 30+ מניות / מדד = מבטל את הסיכון הספציפי.',
    xpReward: 10,
    coinReward: 5,
  },
];

function buildFallback(headline?: string): NewsQuizData {
  // Server-side: rotate evergreen fallback by Israel day-of-week so even when
  // Globes/Gemini are down for days in a row, users see different content.
  const israelDate = new Date(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem' }).format(new Date()),
  );
  const dayOfWeek = israelDate.getDay(); // 0=Sun ... 6=Sat
  const evergreen = EVERGREEN_FALLBACKS[dayOfWeek] ?? EVERGREEN_FALLBACKS[0];

  if (headline) {
    return {
      quizId: `fallback-${todayKey()}-headline`,
      headline,
      question: `המומחים בחדשות דנו ב: "${headline.slice(0, 40)}...". איך זה משפיע על חיי היומיום שלך?`,
      choices: [
        { id: 'a', text: 'דרך מחירים, ריביות או שוק העבודה — תמיד יש השלכה' },
        { id: 'b', text: 'רק חברות גדולות מושפעות, צרכנים פרטיים לא' },
        { id: 'c', text: 'חדשות פיננסיות הן רעש, לא משנות בפועל' },
      ],
      correctChoiceId: 'a',
      explanation: 'חדשות מאקרו (ריבית, אינפלציה, שוק) מחלחלות לכל אחד דרך מחירים, ריבית על משכנתא וכוח קנייה. הקשר לא תמיד מיידי, אבל קיים.',
      xpReward: 10,
      coinReward: 5,
      generatedAt: new Date().toISOString(),
      isFallback: true,
    };
  }
  return {
    ...evergreen,
    quizId: `fallback-${todayKey()}-evergreen-${dayOfWeek}`,
    generatedAt: new Date().toISOString(),
    isFallback: true,
  };
}

export async function GET(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, 'market/news-quiz', { limit: 20, windowSec: 60 });
  if (limited) return limited;

  const today = todayKey();

  // Successful response from earlier today — serve from cache.
  if (_cache && _cache.date === today) {
    return Response.json(_cache.data, {
      headers: { 'Cache-Control': 'public, max-age=900', 'X-Cache': 'HIT' },
    });
  }

  // Recent fallback — back off briefly to avoid hammering Globes/Gemini during outages.
  if (Date.now() < _fallbackBackoffUntil && _cache?.data) {
    return Response.json(_cache.data, {
      headers: { 'Cache-Control': 'public, max-age=60', 'X-Cache': 'BACKOFF' },
    });
  }

  try {
    const originalHeadline = await fetchGlobesHeadline();
    if (!originalHeadline) {
      const fallback = buildFallback();
      _cache = { data: fallback, date: '' };
      _fallbackBackoffUntil = Date.now() + FALLBACK_BACKOFF_MS;
      return Response.json(fallback, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    const quiz = await generateQuiz(originalHeadline);
    if (!quiz) {
      // Got a real headline but Gemini failed — keep the original for the badge,
      // serve a minimal teaching question. Still treat as fallback so we retry.
      const fallback = buildFallback(originalHeadline);
      _cache = { data: fallback, date: '' };
      _fallbackBackoffUntil = Date.now() + FALLBACK_BACKOFF_MS;
      return Response.json(fallback, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    const data: NewsQuizData = {
      quizId: `${today}-${simpleHash(quiz.rewrittenHeadline)}`,
      headline: quiz.rewrittenHeadline,
      question: quiz.question,
      choices: quiz.choices,
      correctChoiceId: quiz.correctChoiceId,
      explanation: quiz.explanation,
      xpReward: 10,
      coinReward: 5,
      generatedAt: new Date().toISOString(),
    };

    _cache = { data, date: today };
    _fallbackBackoffUntil = 0;

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, max-age=900', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return safeErrorResponse(err, 'market/news-quiz');
  }
}
