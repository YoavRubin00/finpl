import { getApiBase } from '../apiBase';

/**
 * Upsert economy values (xp, coins, gems) into user_profiles via API route.
 * Uses the profile sync endpoint since economy lives on user_profiles.
 * Fire-and-forget — caller should not await in UI-critical paths.
 */
export async function upsertInventory(
  authId: string,
  data: { xp: number; coins: number; gems: number },
): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/sync/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authId, xp: data.xp, coins: data.coins, gems: data.gems }),
  });

  if (!res.ok) {
    throw new Error(`sync/profile POST (economy) failed: ${res.status}`);
  }
}

/**
 * Fetch economy values (xp, coins, gems) from API by authId.
 * Returns null if user not found.
 */
export async function fetchInventory(authId: string) {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/sync/profile?authId=${encodeURIComponent(authId)}`,
  );

  if (!res.ok) {
    throw new Error(`sync/profile GET (economy) failed: ${res.status}`);
  }

  const json = (await res.json()) as { ok: boolean; profile: { xp: number; coins: number; gems: number } | null };
  if (!json.profile) return null;

  return {
    xp: json.profile.xp,
    coins: json.profile.coins,
    gems: json.profile.gems,
  };
}
