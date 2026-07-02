// Shark moderator bot — client wrapper for /api/moderation/check.
// Reviews community texts (room messages, portfolio captions, comments) and
// tells the caller to retract content that fails review (spam / profanity /
// not money-related). Network failures pass gracefully — the fast local
// regex checks at the send site remain the first line of defense.

export interface SharkBotVerdict {
  ok: boolean;
  reason?: string;
}

const TIMEOUT_MS = 8000;

export async function moderateWithSharkBot(text: string): Promise<SharkBotVerdict> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('/api/moderation/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { ok: true };
    const verdict = (await res.json()) as SharkBotVerdict;
    return typeof verdict.ok === 'boolean' ? verdict : { ok: true };
  } catch {
    return { ok: true };
  }
}