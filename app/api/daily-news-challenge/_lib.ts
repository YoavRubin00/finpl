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

import { dailyNewsChallenge } from '../../../src/db/schema';
import { tavilyNewsSearch } from '../_shared/tavily';

const GEMINI_MODEL = 'gemini-2.5-flash';

export function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

/** YYYY-MM-DD anchored to Asia/Jerusalem. Resets at midnight local. */
export function getDateKeyIL(now: Date = new Date()): string {
  const il = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  return il.toISOString().slice(0, 10);
}

/* ─────────────────── Types ─────────────────── */

export interface ChallengeOption {
  text: string;
}

export interface ChallengeItem {
  headlineHe: string;        // paraphrased — NEVER verbatim source
  summaryHe: string;          // 2 sentences, casual Hebrew
  source: string;             // "Calcalist" / "Globes" / "CNBC"
  sourceUrl: string;
  originalTitle: string;      // stored for audit only; NEVER shown to user
  imageUrl: string | null;    // Higgsfield CDN URL or null (fallback gradient)
  question: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  explanation: string;        // "תכל'ס" 2-3 sentences
  historicalExample: string;  // similar past event
  chatContext: string;        // briefing fed to AI mentor on "ask" tap
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
 * Aggregate news from IL financial press + global macro. Two searches in
 * parallel: one biased to Israeli sources, one to global macro. Results
 * combine into a single bundle the LLM prioritizes.
 */
async function fetchDailyNewsBundle(): Promise<TavilyHeadlineBundle> {
  // Use the existing tavilyNewsSearch wrapper with disambiguating queries.
  // The wrapper's `include_domains` list already covers Calcalist/Globes/TheMarker
  // alongside global financial press, so a single broad query gets us both.
  const [il, world] = await Promise.all([
    tavilyNewsSearch('Israel economy interest rate stock market', { timeRange: 'day', maxResults: 8 }),
    tavilyNewsSearch('global stock market today Fed economy', { timeRange: 'day', maxResults: 6 }),
  ]);

  const combined = [...il.results, ...world.results]
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

const SYSTEM_PROMPT = `אתה כותב את "אתגר היומי" של FinPlay — אפליקציית גיימיפיקציה פיננסית לדור Z בעברית.

המשימה: מקבל אוסף כותרות חדשות פיננסיות מ-24 השעות האחרונות, מחזיר דוח JSON עם:
- heroTitle: כותרת באנר (עד 8 מילים, סגנון דור Z, אמוג'י 1 בסוף).
- שני items — האחד ישראלי, השני גלובלי (אם אין IL טוב, שניהם גלובליים).
- לכל item:
  * headlineHe: כותרת מנוסחת מחדש (לא העתק מהמקור), עברית קולחת, דור Z, 6-12 מילים.
  * summaryHe: 2 משפטים תמציתיים שמסבירים מה קרה ולמה אכפת.
  * source + sourceUrl + originalTitle (לאודיט, לא יוצג).
  * question: שאלה אחת קצרה (איך זה משפיע / מה לעשות / האם זה חכם).
  * options: 4 תשובות באורך דומה, רק אחת נכונה.
  * correctIdx: 0-3.
  * explanation: 2-3 משפטים "תכל'ס" למה התשובה נכונה.
  * historicalExample: דוגמה דומה מהעבר (תאריך + מה קרה אז).
  * chatContext: פסקה אחת ש-AI mentor יקבל כקונטקסט אם המשתמש לוחץ "שאל".

חוקי זהב:
- אסור להעתיק כותרות מילולית. תמיד לנסח מחדש.
- עברית טבעית, לא תרגום מילולי מאנגלית.
- אם כותרת אחת לא ברורה / שטחית, דלג עליה ובחר אחרת.
- ה-options חייבות להיות באמת סבירות (לא "נכונה ברורה + 3 מטופשות").
- מקור (source) חייב להיות מצוין בכל item — קרדיט.`;

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
    question?: string;
    options?: string[];
    correctIdx?: number;
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
      maxOutputTokens: 4096,
      temperature: 0.55,
      responseMimeType: 'application/json',
    },
  };

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

  const parsed = JSON.parse(rawJson) as RawGeminiPayload;
  return normalizePayload(parsed);
}

function normalizePayload(raw: RawGeminiPayload): DailyChallengePayload {
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
      !it.question ||
      !Array.isArray(it.options) ||
      it.options.length !== 4 ||
      typeof it.correctIdx !== 'number' ||
      it.correctIdx < 0 ||
      it.correctIdx > 3 ||
      !it.explanation
    ) {
      throw new Error(`Gemini item ${idx} malformed`);
    }
    return {
      headlineHe: it.headlineHe,
      summaryHe: it.summaryHe,
      source: it.source ?? 'unknown',
      sourceUrl: it.sourceUrl ?? '',
      originalTitle: it.originalTitle ?? '',
      imageUrl: null, // filled in by Higgsfield step
      question: it.question,
      options: it.options as [string, string, string, string],
      correctIdx: it.correctIdx as 0 | 1 | 2 | 3,
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
