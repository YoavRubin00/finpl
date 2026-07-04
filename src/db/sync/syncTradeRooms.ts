import { getApiBase } from '../apiBase';

/** A chat message as the server returns it (real users only). */
export interface ServerRoomMessage {
  id: string;
  roomId: string;
  displayName: string;
  avatarId: string | null;
  body: string;
  sentiment: 'bull' | 'bear' | null;
  isSelf: boolean;
  sentAt: string;
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

const ENDPOINT = '/api/trade-rooms/messages';

/** Fetch the room's real message feed (oldest-first). */
export async function fetchRoomMessagesApi(
  args: AuthArgs & { roomId: string; since?: string | null },
): Promise<ServerRoomMessage[]> {
  const base = getApiBase();
  const qs = new URLSearchParams({ authId: args.authId, roomId: args.roomId });
  if (args.since) qs.set('since', args.since);
  const res = await fetch(`${base}${ENDPOINT}?${qs.toString()}`, { headers: headers(args.syncToken) });
  if (!res.ok) throw new Error(`room messages GET failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; messages?: ServerRoomMessage[] };
  return data.messages ?? [];
}

/** Send a message to the room's server feed. Returns the server row id. */
export async function sendRoomMessageApi(
  args: AuthArgs & {
    roomId: string;
    body: string;
    sentiment?: 'bull' | 'bear';
    displayName: string;
    avatarId?: string | null;
  },
): Promise<{ id: string | null; sentAt: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({
      authId: args.authId,
      roomId: args.roomId,
      body: args.body,
      sentiment: args.sentiment,
      displayName: args.displayName,
      avatarId: args.avatarId ?? null,
    }),
  });
  if (!res.ok) throw new Error(`room message POST failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; id?: string | null; sentAt?: string };
  return { id: data.id ?? null, sentAt: data.sentAt ?? new Date().toISOString() };
}
