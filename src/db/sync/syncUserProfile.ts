import { getApiBase } from '../apiBase';
import { useAuthStore } from '../../features/auth/useAuthStore';

function getSyncHeaders(): Record<string, string> {
  const token = useAuthStore.getState().syncToken;
  return token
    ? { 'Content-Type': 'application/json', 'X-Sync-Token': token }
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
    headers: getSyncHeaders(),
    body: JSON.stringify({ authId, ...data }),
  });

  if (!res.ok) {
    throw new Error(`sync/profile POST failed: ${res.status}`);
  }
}

/** Delete a user profile and all associated data. Used for in-app account deletion (Apple 5.1.1(v)). */
export async function deleteUserProfile(authId: string): Promise<void> {
  const base = getApiBase();
  const token = useAuthStore.getState().syncToken;
  const res = await fetch(
    `${base}/api/sync/profile?authId=${encodeURIComponent(authId)}`,
    { method: 'DELETE', headers: token ? { 'X-Sync-Token': token } : {} },
  );
  if (!res.ok) {
    throw new Error(`sync/profile DELETE failed: ${res.status}`);
  }
}

/** Fetch a user profile from API by authId. Returns null if not found. */
export async function fetchUserProfile(authId: string) {
  const base = getApiBase();
  const fetchToken = useAuthStore.getState().syncToken;
  const res = await fetch(
    `${base}/api/sync/profile?authId=${encodeURIComponent(authId)}`,
    fetchToken ? { headers: { 'X-Sync-Token': fetchToken } } : undefined,
  );

  if (!res.ok) {
    throw new Error(`sync/profile GET failed: ${res.status}`);
  }

  const json = (await res.json()) as { ok: boolean; profile: Record<string, unknown> | null };
  return json.profile ?? null;
}
