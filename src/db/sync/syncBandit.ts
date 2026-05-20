import { getApiBase } from '../apiBase';

export type BanditEvent = 'impression' | 'conversion' | 'dismiss';

export interface BanditServerVariant {
  variantId: string;
  alpha: number;
  beta: number;
  impressions: number;
  conversions: number;
}

/**
 * Fire-and-forget bandit event reporting. Increments global alpha/beta on the server.
 * Caller should not await in UI-critical paths; use .catch(() => {}) at call sites.
 */
export async function postBanditEvent(
  experimentId: string,
  variantId: string,
  event: BanditEvent,
): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/bandit/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experimentId, variantId, event }),
  });

  if (!res.ok) {
    throw new Error(`bandit/event POST failed: ${res.status}`);
  }
}

/**
 * Fetch global bandit state (alpha/beta for every variant of every experiment).
 * Returns null on failure so callers can fall back to local cache silently.
 */
export async function fetchBanditState(): Promise<Record<string, BanditServerVariant[]> | null> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/bandit/state`);

  if (!res.ok) return null;

  const json = (await res.json()) as {
    ok: boolean;
    experiments: Record<string, BanditServerVariant[]>;
  };

  return json.experiments ?? null;
}
