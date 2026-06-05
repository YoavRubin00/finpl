/**
 * Shared helpers for the Daily News Challenge API surface.
 *
 *   - generateTodaysChallenge(): idempotent Tavily → Gemini Flash 2.5 → (image
 *     URLs) → Neon pipeline. Produces one row per dateKey (YYYY-MM-DD in IL
 *     time). Called by `cron` (auto-daily) and can be force-refreshed from
 *     admin.
 *   - getDateKeyIL(): YYYY-MM-DD anchored to Asia/Jerusalem (no overnight
 *     roll like breaking-news — challenge resets at midnight IL).
 *
 * Higgsfield image generation is fire-and-forget here: we kick off the job
 * and store the image URL when it lands. If the job hasn't completed by the
 * time we INSERT, we record `null` and the client renders a gradient
 * placeholder. A later admin re-run can fill in the URLs.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';

import { withRetry, isTransientAiError } from '../_shared/retry';

import { dailyNewsChallenge } from '../../../src/db/schema';
import { tavilyNewsSearch } from '../_shared/tavily';

const GEMINI_MODEL = 'gemini-2.5-flash';

export function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

/** YYYY-MM-DD anchored to Asia/Jerusalem. Resets at midnight local.
 *
 *  Implementation note (2026-06-01): previously this used
 *  `new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })).toISOString()`,
 *  which silently re-interpreted the locale string in the SERVER's TZ
 *  (UTC on Vercel) — so during 21:00–23:59 UTC, when IL was already on
 *  the next calendar day, the function returned the UTC date and clients
 *  asked `/today` for yesterday's row. Using Intl.DateTimeFormat with
 *  'en-CA' locale yields a YYYY-MM-DD format directly, no parsing. */
export function getDateKeyIL(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

/* ─────────────────── Types ─────────────────── */

export interface ChallengeOption {
  text: string;
}

export interface ChallengeItem {
  headlineHe: string;        // paraphrased — NEVER verbatim source
  summaryHe: string;          // 2 sentences, casual Hebrew — revealed AFTER pick
  source: string;             // "Calcalist" / "Globes" / "CNBC"
  sourceUrl: string;
  originalTitle: string;      // stored for audit only; NEVER shown to user
  imageUrl: string | null;    // Higgsfield CDN URL or null (fallback gradient)
  explanation: string;        // "תכל'ס" 2-3 sentences
  historicalExample: string;  // similar past event
  chatContext: string;        // briefing fed to AI mentor on "ask" tap

  // Blanked-Headline v2 — curiosity-gap question format.
  blankedHeadline: string;    // headlineHe with the central entity replaced by ____
  blankedEntity: string;      // exact entity that was blanked (matches one chip)
  chips: [string, string, string, string];
  correctChipIdx: 0 | 1 | 2 | 3;
}

export interface DailyChallengePayload {
  heroTitle: string;
  heroImageUrl: string | null;
  items: [ChallengeItem, ChallengeItem];
  sourcesUsed: Array<{ name: string; url: string; originalTitle: string }>;
}

/* ─────────────────── Tavily — multi-source IL + global ─────────────────── */

interface TavilyHeadlineBundle {
  query: string;
  results: Array<{ title: string; url: string; content: string; source?: string }>;
}

/**
 * Aggregate news from IL financial press + US markets. Two parallel searches:
 *   1. Israeli macro/markets (Tel Aviv exchange, Bank of Israel, local economy).
 *   2. US markets — S&P 500, NASDAQ, big tech, Fed decisions, earnings — the
 *      market most Israeli retail investors actually trade in (IBKR / Blink /
 *      local brokers all funnel to US equities), so this is high-relevance.
 * Results combine into a single bundle the LLM picks from.
 */
async function fetchDailyNewsBundle(): Promise<TavilyHeadlineBundle> {
  const [il, us] = await Promise.all([
    tavilyNewsSearch('Israel economy Bank of Israel interest rate Tel Aviv stock exchange', { timeRange: 'day', maxResults: 8 }),
    tavilyNewsSearch('US stock market S&P 500 NASDAQ Fed today big tech earnings', { timeRange: 'day', maxResults: 8 }),
  ]);

  const combined = [...il.results, ...us.results]
    .filter((r) => r.title && r.url)
    .slice(0, 14)
    .map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      source: extractSourceFromUrl(r.url),
    }));

  return { query: 'daily-news-challenge', results: combined };
}

function extractSourceFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const map: Record<string, string> = {
      'calcalist.co.il': 'Calcalist',
      'themarker.com': 'TheMarker',
      'globes.co.il': 'Globes',
      'ynet.co.il': 'Ynet',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg',
      'cnbc.com': 'CNBC',
      'marketwatch.com': 'MarketWatch',
      'wsj.com': 'WSJ',
      'finance.yahoo.com': 'Yahoo Finance',
      'investing.com': 'Investing.com',
    };
    return map[host] ?? host;
  } catch {
    return 'unknown';
  }
}

/* ─────────────────── Gemini Flash 2.5 — paraphrase + Qs ─────────────────── */

const SYSTEM_PROMPT = `אתה כותב את "אקטואליה פיננסית" — אפליקציית גיימיפיקציה פיננסית לדור Z בעברית, לישראלים שמשקיעים גם בבורסת תל אביב וגם בארה"ב (S&P 500, NASDAQ, מניות גדולות).

המשימה: מקבל אוסף כותרות חדשות פיננסיות אמיתיות מ-24 השעות האחרונות, מחזיר JSON עם:
- heroTitle: כותרת באנר (עד 8 מילים, סגנון דור Z, אמוג'י 1 בסוף).
- בדיוק שני items — לפי הסדר הבא:
    1) item[0] = השוק הישראלי (בנק ישראל, ריבית, בורסת ת"א, מק"מ, מניות ת"א-35, נדל"ן, פנסיה).
    2) item[1] = שוק ארה"ב (S&P/NASDAQ, החלטות הפד, אינפלציה אמריקאית, ענקיות הטק AAPL/NVDA/MSFT/GOOG/META/TSLA/AMZN, דוחות רבעוניים).
   אם אין כותרת ישראלית טובה ב-24 שעות האחרונות — תקן את item[0] למקרו עולמי שמשפיע ישירות על השווקים בארץ (למשל החלטת ריבית באירופה/ארה"ב, מלחמת סחר), והבהר בסיכום את ההשפעה על משקיע ישראלי.

- לכל item:
  * headlineHe: כותרת מנוסחת מחדש (לא העתק מהמקור), עברית קולחת, דור Z, 6-12 מילים. **חובה** שבכותרת יופיע entity מרכזי אחד (שם חברה ספציפי, סכום כספי, מספר אחוז, מדינה, שם אישיות) — לא רק מילים גנריות.
  * summaryHe: 2 משפטים תמציתיים — מה קרה ולמה זה חשוב למשקיע ישראלי. ה-summary ייחשף **רק אחרי** שהמשתמש פותר את הכותרת.
  * source + sourceUrl + originalTitle: חובה להעתיק מתוך הכותרות שהוזנו לך. אסור להמציא URL או מקור.
  * blankedEntity: ה-entity המדויק מהכותרת שיוסתר (חברה / סכום / אחוז / מדינה — מספיק ייחודי שאי אפשר לנחש סתם, אבל גם לא משפט שלם). חובה להופיע מילה-במילה ב-headlineHe.
  * blankedHeadline: ה-headlineHe המקורי כשה-blankedEntity מוחלף בארבעה underscores (____). חובה להכיל בדיוק "____" פעם אחת.
  * chips: מערך של 4 מועמדים. אחד מהם **חייב** להיות זהה מילולית ל-blankedEntity. שלושת השאר distractors מאותה קטגוריה (אם blankedEntity הוא חברה → השאר חברות מאותו תחום; אם הוא אחוז → השאר אחוזים בטווח דומה; אם הוא סכום → השאר סכומים באותו סדר גודל).
  * correctChipIdx: 0-3 — האינדקס של ה-chip שזהה ל-blankedEntity. ערבב את הסדר אקראית.
  * explanation: 2-3 משפטים "תכל'ס" למה התשובה נכונה ולמה זה חשוב.
  * historicalExample: דוגמה דומה מהעבר (תאריך + מה קרה אז) — רק אם אתה בטוח במאה אחוז שזה אמיתי, אחרת השאר מחרוזת ריקה.
  * chatContext: פסקה אחת ש-AI mentor יקבל כקונטקסט אם המשתמש לוחץ "שאל".

חוקי זהב — אקטואליה אמיתית בלבד:
- כל פריט חייב להתבסס על אחת מהכותרות בקלט. אסור לסנתז עובדות מכמה כותרות לאחת ולהציג אותה כסיפור חדש.
- ה-sourceUrl חייב להיות אחד מה-URLs שהוזנו לך — מילה במילה. אם תמציא, המערכת תזרוק שגיאה.
- אסור לציין מספרים, אחוזים, שמות חברות או תאריכים שלא מופיעים במקור או שאינך בטוח בהם.
- עברית טבעית, לא תרגום מילולי מאנגלית.
- אסור להעתיק כותרות מילולית — לנסח מחדש.
- אם כותרת שטחית / לא קשורה לפיננסי — דלג ובחר אחרת.
- chips חייבות להיות סבירות באמת — distractors מאותה קטגוריה גרמטית וסמנטית (אם הנכון "אנבידיה" → תן "AMD", "אינטל", "ברודקום" — לא "פיצה", "תפוח", "תרדמת").
- chips[correctChipIdx] חייב להיות זהה תוויתית ל-blankedEntity. המערכת תפיל את הפריט אם לא.

דוגמה לפלט תקין:
{
  "headlineHe": "אנבידיה חצתה שווי שוק של 4 טריליון דולר",
  "blankedHeadline": "אנבידיה חצתה שווי שוק של ____ דולר",
  "blankedEntity": "4 טריליון",
  "chips": ["2 טריליון", "4 טריליון", "6 טריליון", "8 טריליון"],
  "correctChipIdx": 1,
  ...
}`;

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

interface RawGeminiPayload {
  heroTitle?: string;
  items?: Array<{
    headlineHe?: string;
    summaryHe?: string;
    source?: string;
    sourceUrl?: string;
    originalTitle?: string;
    blankedHeadline?: string;
    blankedEntity?: string;
    chips?: string[];
    correctChipIdx?: number;
    explanation?: string;
    historicalExample?: string;
    chatContext?: string;
  }>;
}

async function generateChallengePayload(
  bundle: TavilyHeadlineBundle,
): Promise<DailyChallengePayload> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not configured');

  const userPrompt = [
    'הנה אוסף כותרות מ-24 השעות האחרונות (חלקן ישראליות, חלקן גלובליות).',
    'בחר 2 הכי מעניינות / רלוונטיות לדור Z, ונסח מחדש לפי הפורמט.',
    'החזר JSON תקין ויחיד — בלי כל טקסט אחר.',
    '',
    'כותרות:',
    ...bundle.results.map((r, i) => `[${i + 1}] (${r.source}) ${r.title} — ${r.url}`),
  ].join('\n');

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      // Bumped 4096 → 16384 after 3 consecutive cron failures (02/03/04-06)
      // where Gemini's JSON output was truncated mid-string at character
      // ~330–340, causing a deterministic `Unterminated string in JSON`
      // SyntaxError before the INSERT ran. The two-item Hebrew payload (long
      // summaryHe + explanation + chatContext fields) consistently exceeded
      // the old budget. 16384 leaves ~3× headroom for the longest plausible
      // response without bloating cost (Gemini Flash 2.5 is cheap).
      maxOutputTokens: 16384,
      temperature: 0.55,
      responseMimeType: 'application/json',
    },
  };

  // Wrap the Gemini call + JSON.parse + payload validation in a single
  // retry-with-backoff (3 attempts: 500ms, 1000ms, 2000ms). Previously the
  // retry only wrapped the fetch — a truncated/malformed Gemini response
  // would parse-fail on the first try and never retry, killing the cron
  // (user incident 2026-06-05). Now any parse error or schema-mismatch
  // inside normalizePayload also triggers a re-roll of the LLM call.
  return await withRetry<DailyChallengePayload>(
    async () => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as GeminiResponse;
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) throw new Error('Gemini returned empty content');
      let parsed: RawGeminiPayload;
      try {
        parsed = JSON.parse(rawJson) as RawGeminiPayload;
      } catch (err) {
        // Surface the snippet around the failure so cron logs show WHY the
        // parse died (was the response truncated? did the model emit
        // trailing commas?) — the bare SyntaxError message used to leave
        // us guessing for days.
        const msg = err instanceof Error ? err.message : String(err);
        const snippet = rawJson.slice(Math.max(0, rawJson.length - 200));
        throw new Error(`Gemini JSON.parse failed (${msg}). Last 200 chars: ${JSON.stringify(snippet)}`);
      }
      return normalizePayload(parsed, bundle);
    },
    {
      attempts: 3,
      baseDelayMs: 500,
      // Always retry on parse / validation errors — these are usually
      // probabilistic (truncated tail, missing chip, hallucinated URL) and
      // a re-roll commonly recovers. isTransientAiError still handles
      // HTTP-layer transients.
      shouldRetry: (err) => {
        if (isTransientAiError(err)) return true;
        const msg = err instanceof Error ? err.message : String(err);
        return /JSON\.parse|Unterminated|malformed|fabricated|chips|blankedHeadline|missing|underscores/i.test(msg);
      },
      label: 'gemini/dnc',
    },
  );
}

function normalizePayload(
  raw: RawGeminiPayload,
  bundle: TavilyHeadlineBundle,
): DailyChallengePayload {
  // Build a lookup of real Tavily URLs so we can reject any URL the LLM
  // hallucinated — keeps "אקטואליה אמיתית, לא בכאילו" honest.
  const realUrls = new Set(bundle.results.map((r) => r.url));
  if (!raw.heroTitle || typeof raw.heroTitle !== 'string') {
    throw new Error('Gemini payload missing heroTitle');
  }
  if (!Array.isArray(raw.items) || raw.items.length < 2) {
    throw new Error('Gemini payload missing 2 items');
  }

  const items = raw.items.slice(0, 2).map((it, idx): ChallengeItem => {
    if (
      !it.headlineHe ||
      !it.summaryHe ||
      !it.blankedHeadline ||
      !it.blankedEntity ||
      !Array.isArray(it.chips) ||
      it.chips.length !== 4 ||
      typeof it.correctChipIdx !== 'number' ||
      it.correctChipIdx < 0 ||
      it.correctChipIdx > 3 ||
      !it.explanation
    ) {
      throw new Error(`Gemini item ${idx} malformed (missing required v2 fields)`);
    }
    // Anti-hallucination: the sourceUrl MUST be one of the URLs we fed Tavily
    // → Gemini. If the LLM invented or mangled the URL, fail loudly so we
    // never publish made-up "actuality".
    if (!it.sourceUrl || !realUrls.has(it.sourceUrl)) {
      throw new Error(
        `Gemini item ${idx} has fabricated sourceUrl: ${it.sourceUrl ?? '(missing)'} — not in Tavily bundle`,
      );
    }
    // Blanked-Headline integrity: the chip at correctChipIdx must equal the
    // blankedEntity, otherwise the UI's reveal animation will show the wrong
    // text. Fail loudly so we regenerate rather than ship a broken puzzle.
    if (it.chips[it.correctChipIdx] !== it.blankedEntity) {
      throw new Error(
        `Gemini item ${idx}: chips[correctChipIdx]="${it.chips[it.correctChipIdx]}" ≠ blankedEntity="${it.blankedEntity}"`,
      );
    }
    // The blanked headline must contain exactly one "____" marker, otherwise
    // the morph animation has nowhere to splice the answer in.
    const blanks = it.blankedHeadline.match(/____/g);
    if (!blanks || blanks.length !== 1) {
      throw new Error(
        `Gemini item ${idx}: blankedHeadline must contain exactly one "____" marker (found ${blanks?.length ?? 0})`,
      );
    }
    // Chips must be unique — duplicates make the puzzle ambiguous.
    const uniqueChips = new Set(it.chips);
    if (uniqueChips.size !== 4) {
      throw new Error(`Gemini item ${idx}: chips contain duplicates`);
    }
    return {
      headlineHe: it.headlineHe,
      summaryHe: it.summaryHe,
      source: it.source ?? 'unknown',
      sourceUrl: it.sourceUrl ?? '',
      originalTitle: it.originalTitle ?? '',
      imageUrl: null, // filled in by Higgsfield step
      blankedHeadline: it.blankedHeadline,
      blankedEntity: it.blankedEntity,
      chips: it.chips as [string, string, string, string],
      correctChipIdx: it.correctChipIdx as 0 | 1 | 2 | 3,
      explanation: it.explanation,
      historicalExample: it.historicalExample ?? '',
      chatContext: it.chatContext ?? `${it.headlineHe}\n\n${it.summaryHe}`,
    };
  }) as [ChallengeItem, ChallengeItem];

  const sourcesUsed = items.map((it) => ({
    name: it.source,
    url: it.sourceUrl,
    originalTitle: it.originalTitle,
  }));

  return {
    heroTitle: raw.heroTitle,
    heroImageUrl: null, // filled by Higgsfield step
    items,
    sourcesUsed,
  };
}

/* ─────────────────── Higgsfield image generation ─────────────────── */

/** Brand-style image prompt that anchors on Finn the Captain Shark cartoon
 *  language (Supercell / Hay Day vibe), STITCH cyan + gold accents. */
function buildImagePrompt(subject: string): string {
  return [
    'Cartoon illustration in Supercell / Brawl Stars / Hay Day style.',
    `Subject: ${subject}`,
    'Style: bright, playful, gamified, ocean-themed.',
    'Color palette: cyan (#9ccee6) primary, deep blue (#005bb1) accents, gold (#d4a017) for premium accents.',
    'Composition: 16:9, no text, no logos, mobile-card optimized, center-weighted, friendly tone.',
    'Avoid: photo-realism, dark/grim tones, generic stock imagery, copyrighted brand logos.',
  ].join(' ');
}

/**
 * Higgsfield is invoked via MCP from the Claude Code session that triggers
 * the cron locally. In remote/scheduled cron runs (Vercel) there's no MCP
 * client, so images stay null and the client renders a gradient placeholder.
 *
 * Future: replace this with a direct REST call to the Higgsfield public API
 * once we have credentials in env.
 */
export function buildImagePromptsForPayload(payload: DailyChallengePayload): {
  hero: string;
  item1: string;
  item2: string;
} {
  return {
    hero: buildImagePrompt(payload.heroTitle),
    item1: buildImagePrompt(payload.items[0].headlineHe),
    item2: buildImagePrompt(payload.items[1].headlineHe),
  };
}

/* ─────────────────── Main pipeline ─────────────────── */

/**
 * Generate today's challenge (or fetch cached). Idempotent by `date_key`.
 * Images stay null on first pass; the cron operator can run an image-fill
 * step separately via Higgsfield once it's wired to a non-MCP transport.
 */
export async function generateTodaysChallenge(
  options: { force?: boolean } = {},
): Promise<{ dateKey: string; payload: DailyChallengePayload; cached: boolean }> {
  const db = getDb();
  const dateKey = getDateKeyIL();

  if (!options.force) {
    const existing = await db
      .select()
      .from(dailyNewsChallenge)
      .where(eq(dailyNewsChallenge.dateKey, dateKey))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      return {
        dateKey,
        cached: true,
        payload: {
          heroTitle: row.heroTitle,
          heroImageUrl: row.heroImageUrl,
          items: row.items as DailyChallengePayload['items'],
          sourcesUsed: row.sourcesUsed as DailyChallengePayload['sourcesUsed'],
        },
      };
    }
  }

  const bundle = await fetchDailyNewsBundle();
  if (bundle.results.length === 0) {
    throw new Error('Tavily returned 0 results for daily challenge');
  }

  const payload = await generateChallengePayload(bundle);

  await db
    .insert(dailyNewsChallenge)
    .values({
      dateKey,
      heroTitle: payload.heroTitle,
      heroImageUrl: payload.heroImageUrl,
      items: payload.items,
      sourcesUsed: payload.sourcesUsed,
      isFallback: false,
    })
    .onConflictDoUpdate({
      target: dailyNewsChallenge.dateKey,
      set: {
        heroTitle: payload.heroTitle,
        heroImageUrl: payload.heroImageUrl,
        items: payload.items,
        sourcesUsed: payload.sourcesUsed,
        isFallback: false,
        generatedAt: new Date().toISOString(),
      },
    });

  return { dateKey, payload, cached: false };
}

/** Fetch today's challenge if already generated (read-only, no LLM call). */
export async function fetchChallengeForDate(dateKey: string): Promise<DailyChallengePayload | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(dailyNewsChallenge)
    .where(eq(dailyNewsChallenge.dateKey, dateKey))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    heroTitle: row.heroTitle,
    heroImageUrl: row.heroImageUrl,
    items: row.items as DailyChallengePayload['items'],
    sourcesUsed: row.sourcesUsed as DailyChallengePayload['sourcesUsed'],
  };
}
