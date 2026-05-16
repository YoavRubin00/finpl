import crypto from 'crypto';

/**
 * 16-char HMAC-SHA256 over `${userId}.${variantId}`.
 * Used to sign email click-tracking URLs so they can't be forged by bots.
 * Imported by both the email sender (`send-daily+api.ts`) and the click
 * handler (`track-click+api.ts`).
 */
export function signEmailClick(userId: string, variantId: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${userId}.${variantId}`).digest('hex').slice(0, 16);
}

/** Constant-time signature comparison. */
export function verifyEmailClickSig(
  userId: string,
  variantId: string,
  providedSig: string,
  secret: string,
): boolean {
  const expected = signEmailClick(userId, variantId, secret);
  if (expected.length !== providedSig.length) return false;
  return crypto.timingSafeEqual(
    new Uint8Array(Buffer.from(expected)),
    new Uint8Array(Buffer.from(providedSig)),
  );
}
