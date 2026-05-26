/**
 * Thin client wrappers around the Breaking News server endpoints.
 *
 * Authn: all calls include the user's `authId` (= email in this codebase)
 * + `X-Sync-Token` from the auth store. Failures throw — the caller
 * decides whether to swallow (e.g. background refresh) or surface to the
 * user (e.g. "couldn't add ticker, try again").
 */

import { getApiBase } from '../../db/apiBase';
import { useAuthStore } from '../auth/useAuthStore';
import { tokenStore } from '../../lib/auth/secureStore';
import type { BreakingNewsSummary } from './types';

interface AuthCtx {
  authId: string;
  syncToken: string;
}

async function getAuthOrThrow(): Promise<AuthCtx> {
  const { email } = useAuthStore.getState();
  if (!email) throw new Error('Not authenticated');
  const token = (await tokenStore.get()) ?? '';
  return { authId: email, syncToken: token };
}

function headers(syncToken: string): Record<string, string> {
  return syncToken
    ? { 'Content-Type': 'application/json', 'X-Sync-Token': syncToken }
    : { 'Content-Type': 'application/json' };
}

export interface ListItemDTO {
  ticker: string;
  addedAt: string;
  summary: BreakingNewsSummary | null;
  tradingDay: string | null;
  generatedAt: string | null;
  pendingToday: boolean;
}

interface ListResponse {
  ok: boolean;
  items: ListItemDTO[];
  tradingDay: string;
}

export async function fetchBreakingNewsList(): Promise<ListResponse> {
  const { authId, syncToken } = await getAuthOrThrow();
  const base = getApiBase();
  const url = `${base}/api/breaking-news/list?authId=${encodeURIComponent(authId)}`;
  const res = await fetch(url, { headers: headers(syncToken) });
  if (!res.ok) throw new Error(`list ${res.status}`);
  return (await res.json()) as ListResponse;
}

export async function addTrackedTicker(ticker: string): Promise<void> {
  const { authId, syncToken } = await getAuthOrThrow();
  const base = getApiBase();
  const res = await fetch(`${base}/api/breaking-news/track`, {
    method: 'POST',
    headers: headers(syncToken),
    body: JSON.stringify({ authId, ticker }),
  });
  if (!res.ok) throw new Error(`track POST ${res.status}`);
}

export async function removeTrackedTicker(ticker: string): Promise<void> {
  const { authId, syncToken } = await getAuthOrThrow();
  const base = getApiBase();
  const url = `${base}/api/breaking-news/track?authId=${encodeURIComponent(authId)}&ticker=${encodeURIComponent(ticker)}`;
  const res = await fetch(url, { method: 'DELETE', headers: headers(syncToken) });
  if (!res.ok) throw new Error(`track DELETE ${res.status}`);
}

interface GenerateResponse {
  ok: boolean;
  ticker: string;
  tradingDay: string;
  cached: boolean;
  summary: BreakingNewsSummary;
}

export async function generateBreakingNewsForTicker(ticker: string): Promise<GenerateResponse> {
  const { authId, syncToken } = await getAuthOrThrow();
  const base = getApiBase();
  const res = await fetch(`${base}/api/breaking-news/generate`, {
    method: 'POST',
    headers: headers(syncToken),
    body: JSON.stringify({ authId, ticker }),
  });
  if (!res.ok) throw new Error(`generate ${res.status}`);
  return (await res.json()) as GenerateResponse;
}
