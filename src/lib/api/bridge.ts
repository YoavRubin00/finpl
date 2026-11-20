// src/lib/api/bridge.ts
import { Platform } from 'react-native';
import { api } from './client';
import type { Economy } from './economy';

export interface BridgeRedeemOk {
  ok: true;
  redeemed: true;
  /** true = this account had already redeemed it (other device / replay); nothing was deducted now. */
  alreadyRedeemed: boolean;
  benefitId: string;
  costCoins: number;
  partnerUrl: string;
  economy: Economy;
}

/**
 * Server-checked Bridge redemption (api/_shared/bridgeRedeem.ts): the server
 * deducts the cost from ITS balance, once per account and benefit. Throws
 * ApiError on 409 INSUFFICIENT_COINS (body carries the server economy), 404,
 * 401 and 503.
 */
export function redeemBridgeBenefit(benefitId: string) {
  return api.post<{ benefitId: string; platform: string }, BridgeRedeemOk>('/api/bridge/redeem', {
    benefitId,
    platform: Platform.OS,
  });
}
