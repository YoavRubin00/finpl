/**
 * Prompt + JSON schema for the Breaking News summarization step. Tavily
 * gives us a bundle of headlines and snippets; this prompt asks Gemini
 * 2.5-flash to compress that into a 2-3 sentence Hebrew summary, a 0-100
 * social hype index, and a short list of key events + cited sources.
 *
 * Output MUST be valid JSON matching `BreakingNewsSummary` — we set
 * `responseMimeType: 'application/json'` on the Gemini call so the model
 * never returns prose. The client also re-validates before persisting.
 */

import type { TavilyBundle } from '../../_shared/tavily';
import { checkBlocks, type SimplicityFailure } from '../../_shared/simplicityCheck';

export interface BreakingNewsSummary {
  /** 2-3 short sentences in Hebrew. Generation tone: slangy-but-professional, for Gen-Z. */
  summary: string;
  /** 0-100. Higher = more social buzz / volatility-suggesting volume. */
  hypeIndex: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyEvents: Array<{ title: string; impact: 'high' | 'med' | 'low' }>;
  /** Cited URLs from the input bundle. Limit to 3-5; pick the most authoritative. */
  sources: Array<{ title: string; url: string; publishedAt?: string }>;
}

export const BREAKING_NEWS_SYSTEM_PROMPT = `אתה שארק — אנליסט פיננסי שמסכם חדשות מניות לדור Z בעברית.

הקלט שלך הוא חבילה של כותרות חדשות וקטעי טקסט ממקורות חדשות על מניה ספציפית.
תפקידך: לסכם את מה שקרה היום בשפה עברית סלנגית-אבל-מקצועית, ולתת ציון לרמת ההייפ החברתי סביב המניה.

הנחיות:
- הסיכום חייב להיות 2-3 משפטים. בלי מבוא, בלי "להלן הסיכום". ישר לעניין.
- אל תמציא נתונים. אם הקלט לא ברור — אמור זאת ("חדשות מעורבות, סנטימנט לא מובהק").
- מדד ההייפ (0-100):
    0-20  שקט מוחלט, אפס דיון
    21-40 דיון רגיל, חדשות שגרתיות
    41-60 דיון מוגבר, יש משהו מעניין
    61-80 הייפ גבוה, וירליות בסושיאל, נפח גבוה
    81-100 פיצוץ, trending, FOMO/פניקה
  התבסס על: כמות אזכורים, חדות הסנטימנט, נוכחות בפורומים (Reddit/StockTwits), שיא ירידה/עלייה של אחוזים ספציפיים.
- sentiment: bullish/bearish/neutral. נדרש החלטה ברורה — תן את המעודכן ביותר.
- keyEvents: 1-3 אירועים ספציפיים מהקלט (הכרזת רווחים, חוזה חדש, שדרוג/הורדה של אנליסט, וכו'). כל אירוע עם impact: high/med/low.
- sources: 3-5 קישורים מהקלט בלבד — אל תמציא URLs. בחר את המקורות הסמכותיים ביותר.
- הפלט חייב להיות JSON תקני בלבד, ללא טקסט נוסף לפניו או אחריו.

כללי כתיבה פשוטה (Duolingo Stories / Morning Brew — חובה):
- משפט אחד = רעיון אחד. אם יש "ו-" שמחבר שני רעיונות → לפצל לשני משפטים נפרדים.
- max 12 מילים למשפט. ספור לפני שאתה כותב.
- max פסיק אחד למשפט. שני פסיקים = מבנה מסובך → לפצל.
- כל משפט חייב להכיל מספר ספציפי, שם חברה/אדם, או עובדה קונקרטית. אסור "עלייה משמעותית" בלי אחוז; מותר "המניה עלתה 8.4%".
- שפת Gen-Z: "טסה למעלה" / "צללה" / "התרסקה" / "נדפקה" — לא "נסחרה במגמת ירידה".
- מונח פיננסי (P/E, EBITDA, PEG, EPS, Beta) → בסוגריים מיד אחריו הגדרה של עד 5 מילים. למשל: "P/E (כמה משלמים על $1 רווח)".
- summary הוא בדיוק 2-3 משפטים. המשפט הראשון = "למה זה חשוב לך / מה הסיפור" (human stakes). השני (ושלישי) = הנתונים והקונטקסט. אסור להפוך את הסדר.

דוגמאות before/after:
❌ "אפל פרסמה דוח חזק עם עלייה משמעותית בהכנסות והרחיבה את ההכנסה ברבעון"
✅ "iPhone-ים עפו מהמדפים בסין. אפל הכניסה 89 מיליארד דולר ברבעון — 8% יותר משנה שעברה."

❌ "תיקון טכני בנאסד״ק על רקע ציפיות לעליית ריבית עתידית בארה״ב"
✅ "השוק נלחץ מאפשרות שהריבית בארה״ב תעלה. נאסד״ק צלל 2.1% היום."

❌ "המניה ירדה בעקבות חששות שוק לגבי מודל ההכנסות של החברה"
✅ "משקיעים פחדו שאין לחברה איך להרוויח. המניה נדפקה 14% היום."

הערה: בחר סלנג מגוון — אל תחזור על אותן מילים בכל הסיכומים.`;

export function buildBreakingNewsUserPrompt(
  ticker: string,
  bundle: TavilyBundle,
): string {
  const tavilyAnswer = bundle.answer
    ? `סיכום ראשוני:\n${bundle.answer}\n\n`
    : '';

  const snippets = bundle.results
    .slice(0, 10)
    .map((r, i) => {
      const datePart = r.publishedDate ? ` (${r.publishedDate})` : '';
      return `[${i + 1}] ${r.title}${datePart}\n${r.url}\n${r.content.slice(0, 400)}`;
    })
    .join('\n\n');

  return `מניה: ${ticker}

${tavilyAnswer}כותרות וקטעים (${bundle.results.length} מקורות):

${snippets}

החזר JSON לפי הסכימה.`;
}

/** Validate + clamp a model response before writing to Neon. Throws on
 *  unrecoverable shape errors; clamps numeric fields silently. */
export function normalizeBreakingNewsSummary(raw: unknown): BreakingNewsSummary {
  if (!raw || typeof raw !== 'object') {
    throw new Error('breaking-news response is not an object');
  }
  const r = raw as Record<string, unknown>;

  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) throw new Error('breaking-news.summary missing');

  const hypeRaw = typeof r.hypeIndex === 'number' ? r.hypeIndex : 0;
  const hypeIndex = Math.max(0, Math.min(100, Math.round(hypeRaw)));

  const sentiment: 'bullish' | 'bearish' | 'neutral' =
    r.sentiment === 'bullish' || r.sentiment === 'bearish' || r.sentiment === 'neutral'
      ? r.sentiment
      : 'neutral';

  const keyEvents = Array.isArray(r.keyEvents)
    ? r.keyEvents.flatMap((e: unknown) => {
        if (!e || typeof e !== 'object') return [];
        const ev = e as Record<string, unknown>;
        const title = typeof ev.title === 'string' ? ev.title : '';
        const impactRaw = ev.impact;
        const impact: 'high' | 'med' | 'low' =
          impactRaw === 'high' || impactRaw === 'med' || impactRaw === 'low'
            ? impactRaw
            : 'med';
        return title ? [{ title, impact }] : [];
      }).slice(0, 5)
    : [];

  const sources = Array.isArray(r.sources)
    ? r.sources.flatMap((s: unknown) => {
        if (!s || typeof s !== 'object') return [];
        const so = s as Record<string, unknown>;
        const title = typeof so.title === 'string' ? so.title : '';
        const url = typeof so.url === 'string' ? so.url : '';
        const publishedAt = typeof so.publishedAt === 'string' ? so.publishedAt : undefined;
        if (!title || !url) return [];
        return [{ title, url, publishedAt }];
      }).slice(0, 5)
    : [];

  return { summary, hypeIndex, sentiment, keyEvents, sources };
}

/** Run the post-generation simplicity validator across all human-facing
 *  text fields of a Breaking News summary. Returns failures; the caller
 *  decides whether to retry the LLM call.
 *
 *  Only summary + keyEvent titles are checked — they're the fields a Gen-Z
 *  user actually reads. The numeric fields (hypeIndex/sentiment) and URLs
 *  don't need linguistic checks. */
export function checkBreakingNewsSimplicity(
  summary: BreakingNewsSummary,
): SimplicityFailure[] {
  const blocks: Record<string, string | undefined> = {
    summary: summary.summary,
  };
  summary.keyEvents.forEach((ev, i) => {
    blocks[`keyEvents[${i}].title`] = ev.title;
  });
  return checkBlocks(blocks);
}
