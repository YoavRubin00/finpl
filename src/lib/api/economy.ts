// src/lib/api/economy.ts
import { api } from './client';
import { withEconomyBusyRetry } from './economyCore';

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

/**
 * POST a delta. When the server answers 503 ECONOMY_BUSY it wrote nothing, so
 * the same delta is sent once more (economyCore.ts); any other failure is
 * passed on as it is.
 */
export function applyEconomyDelta(payload: {
  xpDelta?: number; coinsDelta?: number; gemsDelta?: number; virtualBalanceSet?: number;
}) {
  return withEconomyBusyRetry(() =>
    api.post<typeof payload, { ok: true; economy: Economy | null }>('/api/sync/economy', payload),
  );
}
