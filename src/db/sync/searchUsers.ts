import { getApiBase } from '../apiBase';

/** Privacy-safe user-directory result — mirrors the server projection in
 *  app/api/users/search+api.ts (id + public display name + level + avatar).
 *  NEVER carries email / coins / any PII. */
export interface UserSearchResult {
  id: string;
  displayName: string;
  level: number;
  avatarUrl: string | null;
}

/**
 * Search the real registered-user directory by display name.
 *
 * Authed: passes the caller's `authId` (email) as a query param and the sync
 * token as `X-Sync-Token` (same auth shape as placeBet). The server rejects
 * unknown callers, returns an honest empty list for < 2-char queries, and
 * caps + orders the results. No fabricated users are ever returned.
 */
export async function searchUsers(args: {
  query: string;
  authId: string;
  syncToken?: string | null;
}): Promise<UserSearchResult[]> {
  const base = getApiBase();
  const params = new URLSearchParams({ q: args.query, authId: args.authId });

  const headers: Record<string, string> = {};
  if (args.syncToken) headers['X-Sync-Token'] = args.syncToken;

  const res = await fetch(`${base}/api/users/search?${params.toString()}`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `users/search GET failed: ${res.status}`);
  }
  const data = (await res.json()) as { ok: boolean; results?: UserSearchResult[] };
  return data.results ?? [];
}
