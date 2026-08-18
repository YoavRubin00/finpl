/**
 * bridgeToast — copy + presentation for the Bridge's in-app feedback toasts.
 *
 * Replaces the native `Alert.alert(...)` product messaging (Yoav directive
 * 9.8) with the same `SharkInsightToast` the Shop uses. This module only
 * decides WHAT to say and which shark/accent to show; BridgeScreen owns the
 * single-toast state and renders it.
 *
 * Voice (docs/BRAND.md): the system speaks → second person PLURAL. Short,
 * warm, no scolding. Genuine confirmation dialogs (RedemptionModal) are not
 * toasts and stay as they are.
 */
import type { ImageSource } from 'expo-image';
import { FINN_EMPATHIC, FINN_TALKING } from '../retention-loops/finnMascotConfig';

export interface BridgeToast {
  title: string;
  body: string;
  shark: ImageSource;
  accentColor: string;
}

export type BridgeToastRequest =
  | { kind: 'not_available' }
  | { kind: 'insufficient_coins'; cost: number; coins: number }
  | { kind: 'redeem_failed' }
  | { kind: 'link_failed' };

const ACCENT_SOON = '#a855f7';   // same purple as the Shop's "coming soon"
const ACCENT_COINS = '#f59e0b';  // same amber as the Shop's "not enough gems"
const ACCENT_ERROR = '#ef4444';

export function bridgeToastFor(req: BridgeToastRequest): BridgeToast {
  switch (req.kind) {
    case 'not_available':
      return {
        title: 'ההטבה לא זמינה כרגע',
        body: 'חזרו לבדוק בקרוב, אנחנו עובדים על זה.',
        shark: FINN_TALKING,
        accentColor: ACCENT_SOON,
      };
    case 'insufficient_coins': {
      const missing = Math.max(0, req.cost - req.coins);
      return {
        title: 'אין מספיק מטבעות',
        body:
          `להטבה הזו צריך ${req.cost.toLocaleString()} מטבעות ויש לכם ${req.coins.toLocaleString()}. ` +
          `עוד ${missing.toLocaleString()} ואתם שם.`,
        shark: FINN_EMPATHIC,
        accentColor: ACCENT_COINS,
      };
    }
    case 'redeem_failed':
      return {
        title: 'ההמרה לא הצליחה',
        body: 'נסו שוב בעוד רגע.',
        shark: FINN_EMPATHIC,
        accentColor: ACCENT_ERROR,
      };
    case 'link_failed':
      return {
        title: 'הקישור לא נפתח',
        body: 'בדקו את החיבור לאינטרנט ונסו שוב.',
        shark: FINN_EMPATHIC,
        accentColor: ACCENT_ERROR,
      };
  }
}
