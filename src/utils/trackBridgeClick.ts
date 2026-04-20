import { Platform } from 'react-native';
import { getApiBase } from '../db/apiBase';

export type BridgeClickAction = 'redeem' | 'link_open';

export function trackBridgeClick(
  benefitId: string,
  action: BridgeClickAction,
  userEmail?: string | null,
): void {
  fetch(`${getApiBase()}/api/bridge/track-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      benefitId,
      action,
      userEmail: userEmail ?? null,
      platform: Platform.OS,
    }),
  }).catch(() => { /* fire-and-forget */ });
}
