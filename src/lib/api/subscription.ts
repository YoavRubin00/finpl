// src/lib/api/subscription.ts
import { api } from './client';

export interface SubscriptionState {
  isPro: boolean | null;
  proExpiresAt: string | null;
}

export function getSubscription() {
  return api.get<{ ok: true; subscription: SubscriptionState | null }>('/api/sync/subscription');
}

export function syncSubscription(payload: { isPro: boolean; proExpiresAt?: string | null }) {
  return api.post<typeof payload, { ok: true; subscription: SubscriptionState | null }>('/api/sync/subscription', payload);
}
