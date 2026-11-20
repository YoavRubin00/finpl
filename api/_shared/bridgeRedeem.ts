// api/_shared/bridgeRedeem.ts
//
// POST /api/bridge/redeem  (Authorization: Bearer <session>)
//   Body: { benefitId, platform? }
//
// Until 2026-11-20 a Bridge redemption was decided on the device: the app
// compared its CACHED coin balance with the cost, sent a negative delta to
// /api/sync/economy and pinged /api/bridge/track-click (no session, any
// authId). The server never checked anything. Now the server does it, in one
// statement (api/_shared/economyStores.ts):
//   * the cost comes from the server's table below, never from the client;
//   * coins are deducted from the SERVER balance only if it covers the cost
//     (`coins >= cost` in the UPDATE's WHERE);
//   * a bridge_redemptions row (primary key user + benefit) is inserted in the
//     same statement, so a replay, a double tap or two devices at once deduct
//     once: the second request finds the row and answers alreadyRedeemed (an
//     old build's 'redeem' report for the same user and benefit counts too, so
//     a reinstall never charges twice);
//   * a bridge_clicks 'redeem' row (owner stats / partner billing) is written
//     with the server-known email, and the owner alert says "verified".
//
// Answers
//   200 { ok, redeemed: true, alreadyRedeemed, benefitId, costCoins, partnerUrl, economy }
//   409 { error, code: 'INSUFFICIENT_COINS', costCoins, economy }
//   404 { error, code: 'UNKNOWN_BENEFIT' } · 404 profile missing
//   401 no / invalid session · 403 body authId names another user
//   503 { code: 'REDEEM_UNAVAILABLE' } before migration 0018
// `economy` is the same row /api/sync/economy returns, so the app can write it
// straight into its cache.

import {
  isRecord,
  missingToken,
  resolveCaller,
  sanitizeText,
  type ApiResult,
  type CallerDeps,
  type CallerInput,
} from './callerAuth';
import type { EconomyRow } from './economyGuard';
import type { BridgeAlertParams } from './bridgeAlert';

/** Must match src/features/the-bridge/bridgeData.ts (available, non-placeholder
 *  benefits). scripts/test-economy-sync.ts fails if they drift. */
export const BRIDGE_REDEEMABLE: Readonly<Record<string, { costCoins: number; partnerUrl: string }>> = {
  'bridge-invest-altshuler': {
    costCoins: 2500,
    partnerUrl: 'https://digitalsolutions.as-invest.co.il/trade_OnBoarding/?utm_source=Finplay&utm_medium=link',
  },
  'bridge-invest-inter-il': {
    costCoins: 2500,
    partnerUrl: 'https://lp3.inter-il.com/ab/790',
  },
  'bridge-insurance-cover': {
    costCoins: 500,
    partnerUrl: 'https://my.coverai.co.il/?li=finplay',
  },
};

/** A benefit id the server can redeem (own keys only: '__proto__' and
 *  'constructor' are not benefits). */
export function isRedeemableBenefit(benefitId: string | null | undefined): benefitId is string {
  return typeof benefitId === 'string' && Object.prototype.hasOwnProperty.call(BRIDGE_REDEEMABLE, benefitId);
}

export type RedeemOutcome =
  | { kind: 'redeemed'; economy: EconomyRow; email: string | null }
  | { kind: 'already'; economy: EconomyRow }
  | { kind: 'insufficient'; economy: EconomyRow }
  | { kind: 'no_user' }
  | { kind: 'unavailable' };

export interface BridgeRedeemStore {
  /** Atomic: deduct `costCoins` from the server balance and record the
   *  redemption, or nothing. */
  redeem(userId: string, benefitId: string, costCoins: number, platform: string | null): Promise<RedeemOutcome>;
}

export interface BridgeRedeemDeps extends CallerDeps {
  store: BridgeRedeemStore;
  alert?(p: BridgeAlertParams): void;
  log?(line: Record<string, unknown>): void;
}

const defaultLog = (line: Record<string, unknown>): void => {
  console.info(`[bridge-redeem] ${JSON.stringify(line)}`);
};

export async function handleBridgeRedeem(input: CallerInput, deps: BridgeRedeemDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;
  if (who.caller.kind === 'none') return missingToken();
  const headers = who.caller.headers;
  const userId = who.caller.userId;
  const log = deps.log ?? defaultLog;

  const body = isRecord(input.body) ? input.body : {};
  const benefitId = sanitizeText(body.benefitId, 100);
  if (!isRedeemableBenefit(benefitId)) {
    return { status: 404, body: { error: 'Unknown benefit', code: 'UNKNOWN_BENEFIT' }, headers };
  }
  const benefit = BRIDGE_REDEEMABLE[benefitId];
  const platform = sanitizeText(body.platform, 10) ?? null;

  const r = await deps.store.redeem(userId, benefitId, benefit.costCoins, platform);
  switch (r.kind) {
    case 'redeemed':
      log({ userId, benefitId, outcome: 'redeemed', costCoins: benefit.costCoins, coinsAfter: r.economy.coins });
      deps.alert?.({ action: 'redeem', benefitId, userEmail: r.email, platform, verified: true, costCoins: benefit.costCoins });
      return {
        status: 200,
        body: {
          ok: true,
          redeemed: true,
          alreadyRedeemed: false,
          benefitId,
          costCoins: benefit.costCoins,
          partnerUrl: benefit.partnerUrl,
          economy: r.economy,
        },
        headers,
      };
    case 'already':
      log({ userId, benefitId, outcome: 'already_redeemed' });
      return {
        status: 200,
        body: {
          ok: true,
          redeemed: true,
          alreadyRedeemed: true,
          benefitId,
          costCoins: benefit.costCoins,
          partnerUrl: benefit.partnerUrl,
          economy: r.economy,
        },
        headers,
      };
    case 'insufficient':
      log({ userId, benefitId, outcome: 'insufficient_coins', costCoins: benefit.costCoins, coins: r.economy.coins });
      return {
        status: 409,
        body: { error: 'Not enough coins', code: 'INSUFFICIENT_COINS', costCoins: benefit.costCoins, economy: r.economy },
        headers,
      };
    case 'no_user':
      return { status: 404, body: { error: 'Profile not found' }, headers };
    case 'unavailable':
      return { status: 503, body: { error: 'Redemption unavailable, try again later', code: 'REDEEM_UNAVAILABLE' }, headers };
  }
}
