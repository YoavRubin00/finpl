import { getApiBase } from '../apiBase';
import { tokenStore } from '../../lib/auth/secureStore';

async function getSyncHeaders(): Promise<Record<string, string>> {
  const token = await tokenStore.get();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

interface UpsertUserProfileData {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  level?: number;
  xp?: number;
  coins?: number;
  gems?: number;
  currentStreak?: number;
  longestStreak?: number;
  isPro?: boolean;
}

/**
 * Upsert a user profile via API route.
 * Fire-and-forget — caller should not await in UI-critical paths.
 */
export async function upsertUserProfile(
  authId: string,
  data: UpsertUserProfileData,
): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/sync/profile`, {
    method: 'POST',
    headers: await getSyncHeaders(),
    body: JSON.stringify({ authId, ...data }),
  });

  if (!res.ok) {
    throw new Error(`sync/profile POST failed: ${res.status}`);
  }
}

/** Delete a user profile and all associated data. Used for in-app account deletion (Apple 5.1.1(v)). */
export async function deleteUserProfile(authId: string): Promise<void> {
  const base = getApiBase();
  const token = await tokenStore.get();
  const res = await fetch(
    `${base}/api/sync/profile?authId=${encodeURIComponent(authId)}`,
    { method: 'DELETE', headers: token ? { 'Authorization': `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    throw new Error(`sync/profile DELETE failed: ${res.status}`);
  }
}

/** Fetch a user profile from API by authId. Returns null if not found. */
export async function fetchUserProfile(authId: string) {
  const base = getApiBase();
  const fetchToken = await tokenStore.get();
  const res = await fetch(
    `${base}/api/sync/profile?authId=${encodeURIComponent(authId)}`,
    fetchToken ? { headers: { 'Authorization': `Bearer ${fetchToken}` } } : undefined,
  );

  if (!res.ok) {
    throw new Error(`sync/profile GET failed: ${res.status}`);
  }

  const json = (await res.json()) as { ok: boolean; profile: Record<string, unknown> | null };
  return json.profile ?? null;
}
