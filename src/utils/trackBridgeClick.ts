import { Platform } from 'react-native';
import { getApiBase } from '../db/apiBase';
import { captureEvent } from '../lib/posthog';

export type BridgeClickAction = 'redeem' | 'link_open';

export function trackBridgeClick(
  benefitId: string,
  action: BridgeClickAction,
  userEmail?: string | null,
): void {
  // Mirror the click into PostHog so monetization dashboards (e.g. the daily
  // הוג report) can read bridge conversions alongside gem/starter/pro paywalls,
  // not just from the bridge_clicks Neon table.
  try {
    captureEvent(action === 'redeem' ? 'bridge_redeem_clicked' : 'bridge_link_opened', {
      benefit_id: benefitId,
      platform: Platform.OS,
    });
  } catch { /* analytics best-effort */ }

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
