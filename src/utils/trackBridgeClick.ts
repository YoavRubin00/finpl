import { Platform } from 'react-native';
import { getApiBase } from '../db/apiBase';
import { useAuthStore } from '../features/auth/useAuthStore';

export type BridgeClickAction = 'redeem' | 'link_open';

/**
 * Fire-and-forget DB tracking ping for partner-bridge clicks.
 *
 * Pulls authId from the auth store so the server can resolve user_id —
 * without it every row landed in `bridge_clicks` with NULL user_id and
 * we lost the ability to link conversions to specific users.
 */
export function trackBridgeClick(
  benefitId: string,
  action: BridgeClickAction,
  userEmail?: string | null,
): void {
  const authId = useAuthStore.getState().authId ?? null;
  fetch(`${getApiBase()}/api/bridge/track-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      benefitId,
      action,
      authId,
      userEmail: userEmail ?? null,
      platform: Platform.OS,
    }),
  }).catch(() => { /* fire-and-forget */ });
}
