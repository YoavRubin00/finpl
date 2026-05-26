// src/lib/api/economy.ts
import { api } from './client';

export interface Economy {
  xp: number | null;
  coins: number | null;
  gems: number | null;
  level: number | null;
  virtualBalance: string;
}

export function getEconomy() {
  return api.get<{ ok: true; economy: Economy | null }>('/api/sync/economy');
}

export function applyEconomyDelta(payload: {
  xpDelta?: number; coinsDelta?: number; gemsDelta?: number; virtualBalanceSet?: number;
}) {
  return api.post<typeof payload, { ok: true; economy: Economy | null }>('/api/sync/economy', payload);
}
