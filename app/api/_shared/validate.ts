/**
 * Shared validation helpers for API endpoints.
 */

/** Clamp a number to a safe range. Returns undefined if the value isn't a valid number. */
export function clampNumber(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Sanitize a string: trim, enforce max length, strip control characters. */
export function sanitizeString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  // Strip control characters (except newlines/tabs for multi-line text)
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

/** Validate email format. */
export function isValidEmail(email: string): boolean {
  // RFC 5322 simplified — stricter than the old regex
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
    email,
  ) && email.length <= 254;
}

/** Validate that metadata is a plain object with limited size. */
export function sanitizeMetadata(
  value: unknown,
  maxKeys = 20,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > maxKeys) {
    return Object.fromEntries(entries.slice(0, maxKeys));
  }
  // Ensure JSON stringified size isn't absurd (max 4KB)
  const json = JSON.stringify(value);
  if (json.length > 4096) return {};
  return value as Record<string, unknown>;
}
