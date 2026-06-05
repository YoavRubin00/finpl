/**
 * Simplicity validator for AI-generated Hebrew financial copy
 * (breaking-news + daily-news-challenge).
 *
 * Why: BRAND.md asks for "slangy-but-professional" Gen-Z Hebrew, but
 * Gemini Flash 2.5 reverts to dry journalistic style at runtime
 * ("עלייה משמעותית", "תיקון טכני") even with explicit prompt instructions.
 * This module enforces the 4 simplicity principles (Duolingo Stories,
 * Morning Brew, Smart Brevity) as a post-generation gate. Failures are
 * returned, not thrown — the caller decides whether to retry the LLM
 * call or accept the payload as-is.
 *
 * Rules enforced per text block:
 *   1. ≤ 12 words per sentence (Duolingo: 1 idea per sentence)
 *   2. ≤ 1 comma per sentence (chained clauses → split)
 *   3. Jargon tokens (P/E, EBITDA, …) must be followed by "(" in the
 *      same sentence (immediate inline definition)
 *   4. Vague intensifiers (משמעותי, ניכר, מהותי, דרמטי) must co-occur
 *      with a specific number or % in the same sentence — otherwise
 *      it's "ירידה משמעותית" hand-waving instead of "ירידה של 14%"
 *
 * The validator is intentionally narrow — false positives are worse
 * than false negatives here. Rules 3+4 are tunable via the exported
 * constants below.
 */

/** Jargon tokens that REQUIRE an immediate inline definition in
 *  parentheses. Match-mode is whole-word, case-sensitive. */
export const JARGON_TOKENS = [
  'P/E',
  'PEG',
  'EBITDA',
  'EBIT',
  'Beta',
  'P/B',
  'MoM',
  'YoY',
  'QoQ',
  'EPS',
  'CAGR',
  'TAM',
  'ARR',
  'MRR',
  'IPO',
  'SPAC',
] as const;

/** Vague intensifiers — allowed ONLY if a numeric/percent is in the
 *  same sentence to ground the claim. */
export const VAGUE_INTENSIFIERS = [
  'משמעותי',
  'משמעותית',
  'ניכר',
  'ניכרת',
  'מהותי',
  'מהותית',
  'דרמטי',
  'דרמטית',
  'חזק',
  'חזקה',
  'משמעותיים',
  'משמעותיות',
] as const;

export interface SimplicityFailure {
  rule: 'sentence_too_long' | 'too_many_commas' | 'jargon_undefined' | 'vague_no_number';
  /** The field that failed (e.g. 'summary', 'headlineHe', 'items[0].summaryHe') */
  field: string;
  /** The offending sentence (truncated to 120 chars for log readability) */
  sentence: string;
  /** Free-form detail — e.g. "14 words", "EBITDA without definition" */
  detail: string;
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

/** Hebrew + Latin word counter — splits on whitespace AND punctuation
 *  that doesn't end a sentence. Numbers count as one word ("89.4%" = 1). */
function countWords(sentence: string): number {
  const tokens = sentence
    .trim()
    .split(/[\s,;:()"'–—]+/)
    .filter((t) => t.length > 0);
  return tokens.length;
}

function hasNumber(sentence: string): boolean {
  return /\d/.test(sentence);
}

function jargonUndefined(sentence: string): string | null {
  for (const token of JARGON_TOKENS) {
    // Whole-word match (boundary chars: start of string, whitespace,
    // or punctuation). Hebrew text uses Latin punctuation so \b works.
    const re = new RegExp(`(^|[\\s,;:.!?])${token.replace('/', '\\/')}(?=[\\s,;:.!?)]|$)`, 'i');
    const m = sentence.match(re);
    if (!m) continue;
    // Check whether an open-paren appears AFTER the jargon token in the
    // same sentence — if yes, the LLM defined it inline.
    const jargonEnd = (m.index ?? 0) + m[0].length;
    const tail = sentence.slice(jargonEnd, jargonEnd + 60);
    if (!/\(/.test(tail)) return token;
  }
  return null;
}

function vagueNoNumber(sentence: string): string | null {
  if (hasNumber(sentence)) return null; // any digit grounds the claim
  for (const vague of VAGUE_INTENSIFIERS) {
    if (sentence.includes(vague)) return vague;
  }
  return null;
}

/** Check a single text field. Returns a list of failures (empty on pass). */
export function checkText(
  text: string,
  field: string,
  opts: { maxWordsPerSentence?: number; maxCommasPerSentence?: number } = {},
): SimplicityFailure[] {
  const maxWords = opts.maxWordsPerSentence ?? 12;
  const maxCommas = opts.maxCommasPerSentence ?? 1;
  const failures: SimplicityFailure[] = [];
  const sentences = text.split(SENTENCE_SPLIT).filter((s) => s.trim().length > 0);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const shortForm = trimmed.length > 120 ? trimmed.slice(0, 120) + '…' : trimmed;

    const words = countWords(trimmed);
    if (words > maxWords) {
      failures.push({
        rule: 'sentence_too_long',
        field,
        sentence: shortForm,
        detail: `${words} words (max ${maxWords})`,
      });
    }

    const commas = (trimmed.match(/,/g) ?? []).length;
    if (commas > maxCommas) {
      failures.push({
        rule: 'too_many_commas',
        field,
        sentence: shortForm,
        detail: `${commas} commas (max ${maxCommas})`,
      });
    }

    const undefinedJargon = jargonUndefined(trimmed);
    if (undefinedJargon) {
      failures.push({
        rule: 'jargon_undefined',
        field,
        sentence: shortForm,
        detail: `"${undefinedJargon}" used without inline definition in parentheses`,
      });
    }

    const vague = vagueNoNumber(trimmed);
    if (vague) {
      failures.push({
        rule: 'vague_no_number',
        field,
        sentence: shortForm,
        detail: `"${vague}" used without a number/% in the same sentence`,
      });
    }
  }

  return failures;
}

/** Run the validator across a map of named text blocks. Returns the
 *  combined list of failures, sorted by severity (long sentence first). */
export function checkBlocks(
  blocks: Record<string, string | undefined>,
  opts: Parameters<typeof checkText>[2] = {},
): SimplicityFailure[] {
  const all: SimplicityFailure[] = [];
  for (const [field, text] of Object.entries(blocks)) {
    if (!text || typeof text !== 'string') continue;
    all.push(...checkText(text, field, opts));
  }
  return all;
}

/** Format failures into a short Hebrew hint that can be appended to a
 *  retry prompt so the LLM knows what to fix. */
export function formatFailuresForRetryHint(failures: SimplicityFailure[]): string {
  if (failures.length === 0) return '';
  const lines = failures.slice(0, 6).map((f) => {
    const ruleHe: Record<SimplicityFailure['rule'], string> = {
      sentence_too_long: 'משפט ארוך מדי',
      too_many_commas: 'יותר מדי פסיקים — לפצל לשני משפטים',
      jargon_undefined: 'מונח פיננסי בלי הגדרה בסוגריים',
      vague_no_number: 'מילה מעורפלת בלי מספר באותו משפט',
    };
    return `- [${f.field}] ${ruleHe[f.rule]}: "${f.sentence}" (${f.detail})`;
  });
  return [
    'הניסיון הקודם נכשל בכללי כתיבה פשוטה. תכתוב הפעם פשוט יותר:',
    ...lines,
    'תזכר: max 12 מילים למשפט, max פסיק אחד, מונחים פיננסיים → הגדרה בסוגריים מיד אחריהם, מילים כמו "משמעותי" → רק עם מספר.',
  ].join('\n');
}
