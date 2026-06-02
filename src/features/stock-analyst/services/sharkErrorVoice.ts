/**
 * Translate technical fetch / server errors into Captain Shark's voice.
 *
 * Why: the raw error messages (e.g. "deep analysis failed (500):
 * {"error":"Deep stock analysis failed.","detail":"invalid x-api-key"}")
 * leak implementation details and frighten non-technical users. Per
 * docs/BRAND.md the shark is the AI voice — singular, gender-neutral,
 * warm. Keep it short, optimistic, and action-oriented (always tell the
 * user what to do next).
 *
 * Used by both `useAnalystSubmit` (chat error bubble) and the raw
 * `StockAnalystScreen` catch.
 */

export function toSharkVoiceError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  const lower = raw.toLowerCase();

  // Bad ticker — server-side validation rejected the symbol.
  if (lower.includes('invalid ticker') || lower.includes('(400)')) {
    return 'לא מצאתי את המניה הזאת. אשמח אם תכתוב שוב, או תנסה סמל אחר.';
  }

  // Quota / rate limit.
  if (lower.includes('(429)') || lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'הרבה פניות כרגע — תן לי דקה לנשום ונסה שוב.';
  }

  // Pro gate / unauthorized at endpoint level (different from auth bug).
  if (lower.includes('(401)') || lower.includes('unauthorized')) {
    return 'נראה שצריך להיכנס מחדש לחשבון. נסה לסגור ולפתוח את האפליקציה.';
  }

  // Timeout — Vercel function exceeded duration cap.
  if (
    lower.includes('(504)') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('aborted')
  ) {
    return 'הניתוח לקח יותר זמן מהרגיל הפעם. נסה שוב — בדרך כלל זה עובד מיד.';
  }

  // Network / offline.
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('typeerror: network')
  ) {
    return 'נראה שהחיבור לא יציב כרגע. בדוק את האינטרנט ונסה שוב.';
  }

  // 503 — service intentionally off (e.g. ANTHROPIC_API_KEY missing in
  // Vercel env). Distinct from transient 500/502 so the user understands
  // "the team knows, don't keep retrying" vs "try again in a minute".
  if (lower.includes('(503)') || lower.includes('not configured')) {
    return 'הניתוח המתקדם לא זמין כרגע. אנחנו מטפלים בזה — חזרה תוך זמן קצר.';
  }

  // 500 / 502 — transient outage or bad request to the upstream model.
  // We deliberately don't say "API key" — it confuses end users and the
  // detail belongs in logs, not in the shark's bubble.
  if (lower.includes('(500)') || lower.includes('(502)')) {
    return 'התנתקתי לרגע מהאוקיינוס. נסה שוב בעוד דקה — אני אהיה כאן.';
  }

  // Last-resort default — friendly + retry-oriented.
  return 'משהו השתבש כרגע. נסה שוב בעוד רגע.';
}
