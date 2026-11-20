// api/_shared/subscriptionSync.ts
//
// POST /api/sync/subscription — the app reports its RevenueCat Pro state.
//
// Until 2026-11-20 the server wrote whatever the app sent:
//   * { isPro: true } made any signed-in account Pro with no purchase;
//   * { isPro: false } (RevenueCat says "not Pro") wiped a Pro granted on the
//     server only — a promotional / manual / gift grant (pro_source other than
//     'store') — on the next app launch.
// Now:
//   Client says NOT Pro
//     * an unexpired server grant (pro_source set and not 'store') is kept;
//     * otherwise written as before (store state keeps following the device).
//   Client says Pro
//     * already Pro on the server (unexpired): nothing is written — the
//       client's expiry is never trusted, so it can't extend (or shorten) a
//       grant; RevenueCat's webhook keeps store expiries current;
//     * not Pro on the server: written only when RevenueCat itself confirms the
//       entitlement (REST lookup, api/_shared/revenueCatVerify.ts). When the
//       lookup is unavailable (no key configured, timeout), the server waits a
//       few seconds for the purchase webhook to land and answers with whatever
//       the database says then. No verification → no upgrade.
// The answer is always the server's state ({ ok, subscription }), same shape
// as before, so the app's cache shows the truth.

export interface SubscriptionRow {
  isPro: boolean | null;
  proExpiresAt: string | null;
  proSource: string | null;
}

export interface SubscriptionReadRow extends SubscriptionRow {
  email: string | null;
}

export interface SubscriptionStore {
  read(userId: string): Promise<SubscriptionReadRow | null>;
  write(
    userId: string,
    fields: { isPro: boolean; proExpiresAt: string | null; proSource?: string | null },
  ): Promise<SubscriptionRow | null>;
}

export type RcVerdict =
  | { status: 'active'; expiresAt: string | null; source: 'store' | 'promotional' }
  | { status: 'inactive' }
  | { status: 'unavailable'; reason: string };

export interface SubscriptionDeps {
  store: SubscriptionStore;
  /** RevenueCat lookup for these app_user_ids (the profile id, then the email). */
  verify(appUserIds: string[]): Promise<RcVerdict>;
  now(): number;
  sleep?(ms: number): Promise<void>;
  log?(line: Record<string, unknown>): void;
  /** Re-reads while waiting for the purchase webhook (ms between reads). */
  webhookWaitMs?: number[];
}

export const DEFAULT_WEBHOOK_WAIT_MS = [1000, 1500, 2000];

function expiryMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Pro right now: is_pro and no expiry or an expiry in the future. */
export function isActivePro(row: SubscriptionRow | null | undefined, nowMs: number): boolean {
  if (!row || row.isPro !== true) return false;
  if (row.proExpiresAt === null) return true;
  const ms = expiryMs(row.proExpiresAt);
  // An unparsable stored expiry: trust is_pro (the webhook wrote it).
  return ms === null ? true : ms > nowMs;
}

/** A Pro granted on the server only (promotional / manual / gift), still valid. */
export function isServerGrant(row: SubscriptionRow | null | undefined, nowMs: number): boolean {
  return isActivePro(row, nowMs) && !!row?.proSource && row.proSource !== 'store';
}

/**
 * Report-only expiry guard (Yoav 2026-07-19): a grant whose pro_expires_at is
 * in the past must never be REPORTED as Pro, even when is_pro=true is still
 * stored (e.g. a promotional entitlement whose EXPIRATION webhook was missed).
 */
export function applyExpiry(row: SubscriptionRow | null | undefined, nowMs = Date.now()): SubscriptionRow | null {
  if (!row) return null;
  const expired = row.proExpiresAt !== null && new Date(row.proExpiresAt).getTime() <= nowMs;
  return expired ? { ...row, isPro: false } : row;
}

function publicRow(row: SubscriptionReadRow | SubscriptionRow | null): SubscriptionRow | null {
  if (!row) return null;
  return { isPro: row.isPro, proExpiresAt: row.proExpiresAt, proSource: row.proSource };
}

function cleanExpiry(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 64) return null;
  return Number.isFinite(Date.parse(v)) ? v : null;
}

const defaultLog = (line: Record<string, unknown>): void => {
  console.warn(`[subscription-sync] ${JSON.stringify(line)}`);
};

export async function handleSubscriptionPost(
  userId: string,
  body: unknown,
  deps: SubscriptionDeps,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (typeof b.isPro !== 'boolean') {
    return { status: 400, body: { error: 'Missing isPro boolean' } };
  }
  const log = deps.log ?? defaultLog;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const answer = (row: SubscriptionRow | null) => ({
    status: 200,
    body: { ok: true, subscription: applyExpiry(row, deps.now()) },
  });

  const row = await deps.store.read(userId);
  if (!row) return answer(null);
  const now = deps.now();

  if (b.isPro === false) {
    if (isServerGrant(row, now)) {
      log({ userId, outcome: 'kept_server_grant', proSource: row.proSource, proExpiresAt: row.proExpiresAt });
      return answer(publicRow(row));
    }
    const written = await deps.store.write(userId, { isPro: false, proExpiresAt: cleanExpiry(b.proExpiresAt) });
    return answer(written);
  }

  // Client says Pro.
  if (isActivePro(row, now)) return answer(publicRow(row));

  const ids = [userId];
  if (row.email && row.email.includes('@') && row.email !== userId) ids.push(row.email);
  let verdict: RcVerdict;
  try {
    verdict = await deps.verify(ids);
  } catch (err) {
    verdict = { status: 'unavailable', reason: err instanceof Error ? err.message : String(err) };
  }

  if (verdict.status === 'active') {
    const written = await deps.store.write(userId, {
      isPro: true,
      proExpiresAt: verdict.expiresAt,
      proSource: verdict.source,
    });
    log({ userId, outcome: 'upgrade_verified_with_revenuecat', proSource: verdict.source, proExpiresAt: verdict.expiresAt });
    return answer(written);
  }
  if (verdict.status === 'inactive') {
    log({ userId, outcome: 'upgrade_refused_revenuecat_inactive' });
    return answer(publicRow(row));
  }

  // No way to ask RevenueCat: give the purchase webhook a few seconds.
  let latest: SubscriptionReadRow | null = row;
  for (const ms of deps.webhookWaitMs ?? DEFAULT_WEBHOOK_WAIT_MS) {
    await sleep(ms);
    latest = await deps.store.read(userId);
    if (isActivePro(latest, deps.now())) {
      log({ userId, outcome: 'upgrade_by_webhook_while_waiting' });
      return answer(publicRow(latest));
    }
  }
  log({ userId, outcome: 'upgrade_refused_unverified', reason: verdict.reason });
  return answer(publicRow(latest));
}
