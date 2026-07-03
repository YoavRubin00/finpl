import { getApiBase } from '../apiBase';

/** Privacy-safe profile view served by /api/friends/graph. */
export interface FriendView {
  id: string;
  displayName: string;
  level: number;
  avatarUrl: string | null;
}

export interface FriendRequestView extends FriendView {
  requestId: string;
}

export interface FriendGraph {
  friends: FriendView[];
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
}

interface AuthArgs {
  authId: string;
  syncToken?: string | null;
}

function headers(syncToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (syncToken) h['X-Sync-Token'] = syncToken;
  return h;
}

/** The caller's full friend graph (accepted + incoming + outgoing). */
export async function fetchFriendGraph(args: AuthArgs): Promise<FriendGraph> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/friends/graph?authId=${encodeURIComponent(args.authId)}`,
    { headers: headers(args.syncToken) },
  );
  if (!res.ok) throw new Error(`friends/graph GET failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean } & FriendGraph;
  return { friends: data.friends ?? [], incoming: data.incoming ?? [], outgoing: data.outgoing ?? [] };
}

export type FriendActionState = 'pending' | 'friends' | 'declined' | 'removed';

/** Send (or idempotently re-send) a friend request. A reverse pending request
 *  is treated as mutual intent by the server → returns state 'friends'. */
export async function sendFriendRequestApi(
  args: AuthArgs & { targetUserId: string },
): Promise<FriendActionState> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/friends/graph`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({ authId: args.authId, action: 'request', targetUserId: args.targetUserId }),
  });
  if (!res.ok) throw new Error(`friends/graph request failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; state: FriendActionState };
  return data.state;
}

/** Accept or decline an INCOMING request (addressee only). */
export async function respondFriendRequestApi(
  args: AuthArgs & { requestId: string; accept: boolean },
): Promise<FriendActionState> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/friends/graph`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({ authId: args.authId, action: 'respond', requestId: args.requestId, accept: args.accept }),
  });
  if (!res.ok) throw new Error(`friends/graph respond failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; state: FriendActionState };
  return data.state;
}

/** Unfriend / cancel my outgoing pending request. */
export async function removeFriendApi(
  args: AuthArgs & { targetUserId: string },
): Promise<FriendActionState> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/friends/graph`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({ authId: args.authId, action: 'remove', targetUserId: args.targetUserId }),
  });
  if (!res.ok) throw new Error(`friends/graph remove failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; state: FriendActionState };
  return data.state;
}
