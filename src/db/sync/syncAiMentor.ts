import { getApiBase } from '../apiBase';
import { useAuthStore } from '../../features/auth/useAuthStore';

function getSyncHeaders(): Record<string, string> {
  const token = useAuthStore.getState().syncToken;
  return token
    ? { 'Content-Type': 'application/json', 'X-Sync-Token': token }
    : { 'Content-Type': 'application/json' };
}

/**
 * Returns today's AI mentor request count for this user, from the server.
 * Returns null on any error so the caller can fall back to local cache.
 */
export async function fetchAiMentorUsage(authId: string): Promise<number | null> {
  if (!authId) return null;
  try {
    const base = getApiBase();
    const token = useAuthStore.getState().syncToken;
    const res = await fetch(
      `${base}/api/ai-mentor/usage?authId=${encodeURIComponent(authId)}`,
      token ? { headers: { 'X-Sync-Token': token } } : undefined,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; count: number };
    return json.count ?? 0;
  } catch {
    return null;
  }
}

/**
 * Atomically increments today's AI mentor request count on the server.
 * Returns the new count, or null on error so the caller can fall back to
 * incrementing the local cache.
 */
export async function incrementAiMentorUsage(authId: string): Promise<number | null> {
  if (!authId) return null;
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/ai-mentor/usage`, {
      method: 'POST',
      headers: getSyncHeaders(),
      body: JSON.stringify({ authId }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; count: number };
    return json.count ?? null;
  } catch {
    return null;
  }
}