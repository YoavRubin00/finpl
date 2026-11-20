// api/_shared/bridgeAlert.ts
//
// Owner email on a Bridge redemption ("💰 המרה חדשה"). Shared by the server-
// checked redeem (api/_shared/bridgeRedeem.ts) and the legacy tracking ping
// (app/api/bridge/track-click+api.ts). Every interpolated value is escaped:
// the legacy ping put the client-supplied email straight into the HTML.

import { Resend } from 'resend';

export const BRIDGE_BENEFIT_LABELS: Record<string, string> = {
  'bridge-invest-altshuler': 'אלטשולר שחם טרייד',
  'bridge-invest-inter-il': 'אינטראקטיב ישראל',
  'bridge-insurance-cover': 'Cover',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface BridgeAlertParams {
  action: 'redeem' | 'link_open';
  benefitId: string;
  userEmail: string | null;
  platform: string | null;
  /** true = the server deducted the coins itself (/api/bridge/redeem);
   *  false = an app build's unverified report (/api/bridge/track-click). */
  verified: boolean;
  costCoins?: number;
}

export function buildBridgeAlertHtml(p: BridgeAlertParams, timestamp: string): string {
  const label = escapeHtml(BRIDGE_BENEFIT_LABELS[p.benefitId] ?? p.benefitId);
  const actionLabel = p.action === 'redeem' ? '💰 המרה (הוצאת מטבעות)' : '🔗 פתיחת קישור';
  const check = p.verified
    ? `✅ אומת בשרת${typeof p.costCoins === 'number' ? ` (${p.costCoins} מטבעות נוכו מהיתרה בשרת)` : ''}`
    : '⚠️ דיווח מהאפליקציה, לא אומת בשרת (גרסה ישנה)';
  return `
    <div style="font-family:sans-serif;direction:rtl;text-align:right;max-width:480px;margin:0 auto">
      <h2 style="color:#0369a1">📊 FinPlay — פעולת שותף חדשה</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;font-weight:700;color:#475569">פעולה</td><td style="padding:8px">${actionLabel}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#475569">שותף</td><td style="padding:8px">${label}</td></tr>
        <tr><td style="padding:8px;font-weight:700;color:#475569">משתמש</td><td style="padding:8px">${escapeHtml(p.userEmail ?? 'לא ידוע')}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#475569">פלטפורמה</td><td style="padding:8px">${escapeHtml(p.platform ?? '—')}</td></tr>
        <tr><td style="padding:8px;font-weight:700;color:#475569">זמן</td><td style="padding:8px">${escapeHtml(timestamp)}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#475569">אימות</td><td style="padding:8px">${check}</td></tr>
      </table>
    </div>
  `;
}

/** Fire-and-forget; never throws. */
export function sendBridgeAlert(p: BridgeAlertParams): void {
  const to = process.env.OWNER_NOTIFICATION_EMAIL ?? '';
  if (!to) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? '');
    const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    resend.emails
      .send({
        from: 'FinPlay Alerts <alerts@finplay.co.il>',
        to,
        subject: `💰 המרה חדשה — ${BRIDGE_BENEFIT_LABELS[p.benefitId] ?? p.benefitId}`,
        html: buildBridgeAlertHtml(p, timestamp),
      })
      .catch(() => { /* non-critical */ });
  } catch { /* non-critical */ }
}
