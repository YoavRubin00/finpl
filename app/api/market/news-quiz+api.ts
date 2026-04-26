/**
 * GET /api/market/news-quiz
 *
 * Fetches one Globes headline, sends to Gemini, returns a quiz
 * question + 3 choices + explanation. Cached 24 hours.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import type { NewsQuizData, NewsQuizChoice } from '../../../src/features/finfeed/liveMarketTypes';

const CACHE_MS = 15 * 60 * 1000; // 15 minutes
let _cache: { data: NewsQuizData; expiresAt: number } | null = null;

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
  question: string;
  choices: [NewsQuizChoice, NewsQuizChoice, NewsQuizChoice];
  correctChoiceId: 'a' | 'b' | 'c';
  explanation: string;
}

async function generateQuiz(headline: string): Promise<GeminiQuizResult | null> {
  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY ?? '';
  if (!GEMINI_API_KEY) return null;

  const prompt = `אתה מורה לחינוך פיננסי לדור Z בישראל. קראת כותרת פיננסית:
"${headline}"

צור שאלה אינטראקטיבית בעברית שתעזור לאדם צעיר (20-30) להבין מה הכותרת הזו אומרת על חייו הפיננסיים.

דרישות:
- השאלה: קצרה וסקרנית, עד 20 מילה, ישירה
- 3 תשובות אמינות, כל אחת 8-15 מילה, אחת נכונה
- הסבר: 2-3 משפטים, ישיר ומועיל לחיי היומיום

החזר JSON בלבד (ללא markdown, ללא הסברים):
{
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
    if (!parsed.question || !parsed.choices || !parsed.correctChoiceId || !parsed.explanation) return null;
    return parsed;
  } catch {
    return null;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, 'market/news-quiz', { limit: 20, windowSec: 60 });
  if (limited) return limited;

  if (_cache && _cache.expiresAt > Date.now()) {
    return Response.json(_cache.data, {
      headers: { 'Cache-Control': 'public, max-age=900', 'X-Cache': 'HIT' },
    });
  }

  try {
    const headline = await fetchGlobesHeadline();

    if (!headline) {
      const fallback: NewsQuizData = {
        quizId: todayKey(),
        headline: 'הריבית בישראל נותרת על 4.5%',
        question: 'מה קורה להחזר המשכנתא שלך כשהריבית לא יורדת?',
        choices: [
          { id: 'a', text: 'ההחזר החודשי נשאר אותו דבר ולא משתנה' },
          { id: 'b', text: 'ההחזר החודשי עולה יחד עם הריבית' },
          { id: 'c', text: 'ההחזר יורד כי הבנק מפחית את הקרן' },
        ],
        correctChoiceId: 'a',
        explanation: 'כשהריבית נשארת קבועה, גם ההחזר החודשי נשאר קבוע. הבעיה היא שמשכנתאות חדשות ממשיכות להיות יקרות, מה שקשה לרוכשי דירות ראשונה.',
        xpReward: 10,
        coinReward: 5,
        generatedAt: new Date().toISOString(),
      };
      return Response.json(fallback, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    const quiz = await generateQuiz(headline);

    if (!quiz) {
      const fallback: NewsQuizData = {
        quizId: todayKey(),
        headline,
        question: `מה הכוונה ב: "${headline.slice(0, 40)}..."?`,
        choices: [
          { id: 'a', text: 'זה משפיע ישירות על הוצאות היומיום שלי' },
          { id: 'b', text: 'זה רלוונטי רק לחברות גדולות' },
          { id: 'c', text: 'זה לא קשור כלל למצב הכלכלי שלי' },
        ],
        correctChoiceId: 'a',
        explanation: 'חדשות פיננסיות תמיד משפיעות על חיי היומיום — דרך מחירים, ריביות, או שוק העבודה.',
        xpReward: 10,
        coinReward: 5,
        generatedAt: new Date().toISOString(),
      };
      return Response.json(fallback, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    const data: NewsQuizData = {
      quizId: `${todayKey()}-${simpleHash(headline)}`,
      headline,
      question: quiz.question,
      choices: quiz.choices,
      correctChoiceId: quiz.correctChoiceId,
      explanation: quiz.explanation,
      xpReward: 10,
      coinReward: 5,
      generatedAt: new Date().toISOString(),
    };

    _cache = { data, expiresAt: Date.now() + CACHE_MS };

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, max-age=900', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return safeErrorResponse(err, 'market/news-quiz');
  }
}