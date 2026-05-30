/**
 * Client wrappers around the Daily News Challenge server endpoints.
 *
 *   - fetchTodayChallenge(): read-only, no auth required (shared row).
 *   - postChatMessage(): per-item follow-up Q&A. Requires authId + syncToken.
 */

import { getApiBase } from '../../db/apiBase';
import { useAuthStore } from '../auth/useAuthStore';
import { tokenStore } from '../../lib/auth/secureStore';
import type { DailyChallenge, ChatTurn } from './types';

interface TodayResponse {
  ok: boolean;
  dateKey: string;
  isToday: boolean;
  isFallback: boolean;
  heroTitle: string;
  heroImageUrl: string | null;
  items: DailyChallenge['items'];
  sourcesUsed: DailyChallenge['sourcesUsed'];
}

export async function fetchTodayChallenge(): Promise<DailyChallenge> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/daily-news-challenge/today`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`daily-news-challenge/today ${res.status}`);

  const data = (await res.json()) as TodayResponse;
  return {
    dateKey: data.dateKey,
    isToday: data.isToday,
    isFallback: data.isFallback,
    heroTitle: data.heroTitle,
    heroImageUrl: data.heroImageUrl,
    items: data.items,
    sourcesUsed: data.sourcesUsed,
  };
}

interface ChatResponse {
  ok: boolean;
  reply: string;
}

export async function postChatMessage(args: {
  itemContext: string;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
  const { email } = useAuthStore.getState();
  if (!email) throw new Error('Not authenticated');
  const syncToken = await tokenStore.get();

  const base = getApiBase();
  const res = await fetch(`${base}/api/daily-news-challenge/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(syncToken ? { 'X-Sync-Token': syncToken } : {}),
    },
    body: JSON.stringify({
      authId: email,
      itemContext: args.itemContext,
      history: args.history.map((t) => ({ role: t.role, text: t.text })),
      message: args.message,
    }),
  });
  if (!res.ok) throw new Error(`daily-news-challenge/chat ${res.status}`);

  const data = (await res.json()) as ChatResponse;
  return data.reply;
}
