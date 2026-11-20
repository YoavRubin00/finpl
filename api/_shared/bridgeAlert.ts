// api/_shared/bridgeAlert.ts
//
// Owner emails (Resend, OWNER_NOTIFICATION_EMAIL), fire-and-forget:
//   * a Bridge redemption ("💰 המרה חדשה"), shared by the server-checked redeem
//     (api/_shared/bridgeRedeem.ts) and the legacy tracking ping
//     (app/api/bridge/track-click+api.ts);
//   * a store purchase the RevenueCat webhook could not credit
//     (api/_shared/revenueCatWebhook.ts), so it can be credited by hand.
// Every interpolated value is escaped: the legacy ping put the client-supplied
// email straight into the HTML. Subjects carry only fixed text, catalogue
// labels and numbers, never a value a client chose.

import { Resend } from 'resend';

export const BRIDGE_BENEFIT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'bridge-invest-altshuler': 'אלטשולר שחם טרייד',
  'bridge-invest-inter-il': 'אינטראקטיב ישראל',
  'bridge-insurance-cover': 'Cover',
});

/** The catalogue label of a benefit id (prototype keys are not benefits). */
export function bridgeBenefitLabel(benefitId: string): string | null {
  return Object.prototype.hasOwnProperty.call(BRIDGE_BENEFIT_LABELS, benefitId) ? BRIDGE_BENEFIT_LABELS[benefitId] : null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function israelTime(): string {
  return new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
}

/** Never throws or rejects; resolves when the send settled. No recipient
 *  configured = nothing sent. */
function sendOwnerEmail(subject: string, html: string): Promise<void> {
  const to = process.env.OWNER_NOTIFICATION_EMAIL ?? '';
  if (!to) return Promise.resolve();
  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? '');
    return resend.emails
      .send({ from: 'FinPlay Alerts <alerts@finplay.co.il>', to, subject, html })
      .then(() => undefined, () => undefined);
  } catch {
    return Promise.resolve();
  }
}

function row(label: string, valueHtml: string, shaded: boolean): string {
  return `<tr${shaded ? ' style="background:#f8fafc"' : ''}><td style="padding:8px;font-weight:700;color:#475569">${label}</td><td style="padding:8px">${valueHtml}</td></tr>`;
}

// ─── Bridge redemption ───────────────────────────────────────────────────────

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
  const label = escapeHtml(bridgeBenefitLabel(p.benefitId) ?? p.benefitId);
  const actionLabel = p.action === 'redeem' ? '💰 המרה (הוצאת מטבעות)' : '🔗 פתיחת קישור';
  const check = p.verified
    ? `✅ אומת בשרת${typeof p.costCoins === 'number' ? ` (${p.costCoins} מטבעות נוכו מהיתרה בשרת)` : ''}`
    : '⚠️ דיווח מהאפליקציה, לא אומת בשרת (גרסה ישנה)';
  return `
    <div style="font-family:sans-serif;direction:rtl;text-align:right;max-width:480px;margin:0 auto">
      <h2 style="color:#0369a1">📊 FinPlay: פעולת שותף חדשה</h2>
      <table style="width:100%;border-collapse:collapse">
        ${row('פעולה', actionLabel, false)}
        ${row('שותף', label, true)}
        ${row('משתמש', escapeHtml(p.userEmail ?? 'לא ידוע'), false)}
        ${row('פלטפורמה', escapeHtml(p.platform ?? 'לא ידוע'), true)}
        ${row('זמן', escapeHtml(timestamp), false)}
        ${row('אימות', check, true)}
      </table>
    </div>
  `;
}

export function bridgeAlertSubject(benefitId: string): string {
  return `💰 המרה חדשה: ${bridgeBenefitLabel(benefitId) ?? 'הטבה לא מוכרת'}`;
}

/** Fire-and-forget; never throws. */
export function sendBridgeAlert(p: BridgeAlertParams): void {
  try {
    void sendOwnerEmail(bridgeAlertSubject(p.benefitId), buildBridgeAlertHtml(p, israelTime()));
  } catch { /* non-critical */ }
}

// ─── A store purchase that was not credited ──────────────────────────────────

export interface PurchaseAlertParams {
  reason: 'unknown_product' | 'no_matching_account';
  productId: string;
  gems: number;
  /** RevenueCat's event id (the revenuecat_events key). */
  eventId: string;
  /** RevenueCat's environment ('PRODUCTION' / 'SANDBOX'), when sent. */
  environment: string | null;
}

export function purchaseAlertSubject(p: PurchaseAlertParams): string {
  return `⚠️ רכישה שלא זוכתה: ${p.gems > 0 ? `${p.gems} יהלומים` : 'מוצר לא מוכר'}`;
}

/** Product, gems and the event id only: never the RevenueCat app_user_id or an address. */
export function buildPurchaseAlertHtml(p: PurchaseAlertParams, timestamp: string): string {
  const reason = p.reason === 'unknown_product' ? 'מוצר שלא מופיע ברשימת המוצרים בשרת' : 'לא נמצא חשבון שתואם לרכישה';
  return `
    <div style="font-family:sans-serif;direction:rtl;text-align:right;max-width:480px;margin:0 auto">
      <h2 style="color:#b45309">⚠️ FinPlay: רכישה שלא זוכתה</h2>
      <p>הקונה שילם, והיהלומים לא נוספו לאף חשבון. צריך לזכות ידנית.</p>
      <table style="width:100%;border-collapse:collapse">
        ${row('סיבה', reason, false)}
        ${row('מוצר', escapeHtml(p.productId || 'ריק'), true)}
        ${row('יהלומים', String(p.gems), false)}
        ${row('מזהה אירוע', escapeHtml(p.eventId), true)}
        ${row('סביבה', escapeHtml(p.environment ?? 'לא ידוע'), false)}
        ${row('זמן', escapeHtml(timestamp), true)}
      </table>
      <p style="color:#475569">הרכישה נשמרה בטבלה revenuecat_events לפי מזהה האירוע, עם מזהה הקונה ב-RevenueCat.</p>
    </div>
  `;
}

/** This email is the only prompt for a manual credit, so the webhook awaits it
 *  (at most ~3 s, so a slow mail service never delays RevenueCat's answer much):
 *  a send left running after the function answers can be cut off. Never rejects. */
export async function sendUnmatchedPurchaseAlert(p: PurchaseAlertParams): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      sendOwnerEmail(purchaseAlertSubject(p), buildPurchaseAlertHtml(p, israelTime())),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, 3000); }),
    ]);
  } catch { /* non-critical */ } finally {
    if (timer) clearTimeout(timer);
  }
}
