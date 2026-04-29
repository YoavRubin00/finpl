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
  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY ?? '';
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

function buildFallback(headline?: string): NewsQuizData {
  if (headline) {
    return {
      quizId: `fallback-${todayKey()}`,
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
    quizId: `fallback-${todayKey()}`,
    headline: 'הריבית בישראל נותרת על 4.5%',
    question: 'מה קורה להחזר משכנתא קיימת כשבנק ישראל לא משנה את הריבית?',
    choices: [
      { id: 'a', text: 'בריבית פריים — ההחזר נשאר אותו דבר עד השינוי הבא' },
      { id: 'b', text: 'ההחזר עולה אוטומטית כל חודש שהריבית קבועה' },
      { id: 'c', text: 'הקרן יורדת מהר יותר כדי לפצות על הריבית' },
    ],
    correctChoiceId: 'a',
    explanation: 'ריבית פריים = בנק ישראל + 1.5%. כשבנק ישראל לא זז, מסלול פריים במשכנתא לא זז. למשכנתאות חדשות זה אומר שתנאי הכניסה לא משתפרים.',
    xpReward: 10,
    coinReward: 5,
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
