// src/lib/api/economyCore.ts
//
// POST /api/sync/economy: one retry when the server says it was busy
// (economy fix round E4, 20.11). Pure logic, no React Native imports, so
// scripts/test-shop-economy-client.ts runs it in Node; src/lib/api/economy.ts
// uses it.
//
// Since 2026-11-20 the server applies a delta with a compare-and-swap on the
// account's row. When it keeps losing that race to the account's other writes
// it gives up and answers 503 { code: 'ECONOMY_BUSY' } having written NOTHING,
// so sending the same delta again cannot count it twice. Any other failure is
// passed on unchanged: a lost answer (no network, a 5xx without that code) may
// have been applied, and repeating it could pay a reward twice.

export const ECONOMY_BUSY_CODE = 'ECONOMY_BUSY';

/** Wait before the retry: a short random pause so two busy requests don't collide again. */
export const ECONOMY_BUSY_RETRY_MIN_MS = 150;
export const ECONOMY_BUSY_RETRY_SPREAD_MS = 350;

/** The shared client's ApiError for a 503 whose body says ECONOMY_BUSY. */
export function isEconomyBusy(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: unknown; body?: unknown };
  if (e.status !== 503) return false;
  const body = e.body;
  return !!body && typeof body === 'object' && (body as { code?: unknown }).code === ECONOMY_BUSY_CODE;
}

function defaultPause(): Promise<void> {
  const ms = ECONOMY_BUSY_RETRY_MIN_MS + Math.floor(Math.random() * ECONOMY_BUSY_RETRY_SPREAD_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sends; on ECONOMY_BUSY sends the same request once more. */
export async function withEconomyBusyRetry<T>(send: () => Promise<T>, pause: () => Promise<void> = defaultPause): Promise<T> {
  try {
    return await send();
  } catch (err) {
    if (!isEconomyBusy(err)) throw err;
    await pause();
    return send();
  }
}
