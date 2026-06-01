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

  // Generic 5xx — server-side problem (includes api-key / Anthropic outage).
  // We deliberately don't say "API key" — it confuses end users and the
  // detail belongs in logs, not in the shark's bubble.
  if (lower.includes('(500)') || lower.includes('(502)') || lower.includes('(503)')) {
    return 'התנתקתי לרגע מהאוקיינוס. נסה שוב בעוד דקה — אני אהיה כאן.';
  }

  // Last-resort default — friendly + retry-oriented.
  return 'משהו השתבש כרגע. נסה שוב בעוד רגע.';
}
