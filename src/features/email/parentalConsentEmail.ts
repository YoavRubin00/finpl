/**
 * HTML + text builders for the parental-consent email sent to a minor's
 * (16-17) parent when they request Pro. The email is intentionally calm,
 * factual, and Hebrew-first — the parent should immediately understand:
 *
 *   1. Who sent it (FinPlay, a financial-literacy app, NOT a financial service)
 *   2. What is being asked (consent for a paid subscription by their child)
 *   3. Why their consent matters (Israeli Capacity Act sec. 4-6)
 *   4. How to confirm (one click)
 *   5. How to refuse / revoke (separate link, equal weight)
 *
 * Returns the strings only — the caller (sendParentalConsentEmail) handles
 * Resend SDK + DB updates + error handling, same pattern as the welcome
 * email.
 */

interface BuildParentalConsentEmailParams {
  /** The minor's display name (or 'הילד/ה שלך' fallback). */
  childName: string | null;
  /** Absolute https URL the parent clicks to grant consent. */
  confirmUrl: string;
  /** Absolute https URL the parent clicks to refuse. */
  revokeUrl: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildParentalConsentEmail({
  childName,
  confirmUrl,
  revokeUrl,
}: BuildParentalConsentEmailParams): BuiltEmail {
  const safeName = childName?.trim() || 'הילד/ה שלך';
  const subject = `אישור הורה — ${safeName} מבקש/ת להירשם ל-FinPlay Pro`;

  const text = [
    'שלום,',
    '',
    `${safeName} מבקש/ת להירשם למנוי Pro של FinPlay — אפליקציה חינוכית ללימוד פיננסים לבני נוער.`,
    '',
    'לפי חוק הכשרות המשפטית והאפוטרופסות (סע\' 4-6), רכישה מתמשכת של קטין דורשת אישור הורה. לכן אנחנו פונים אליך.',
    '',
    'חשוב לדעת:',
    '- FinPlay היא אפליקציית למידה. אין באפליקציה השקעות בכסף אמיתי או פתיחת חשבון בנק.',
    '- המנוי הוא 14.90 ש"ח/חודש (או 119 ש"ח/שנה). החיוב נעשה דרך App Store / Google Play.',
    '- ניתן לבטל את המנוי בכל עת תוך 14 ימים מהרכישה ולקבל החזר מלא.',
    '- אם תאשר/י עכשיו, תוכל/י לבטל את ההסכמה בעתיד דרך הקישור התחתון.',
    '',
    `✅ לאישור (הילד/ה יוכל לרכוש Pro):`,
    confirmUrl,
    '',
    `❌ לדחייה (החסימה תישאר):`,
    revokeUrl,
    '',
    'הקישורים תקפים ל-14 ימים.',
    '',
    'שאלות? support@finplay.me',
    '— צוות FinPlay',
  ].join('\n');

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;direction:rtl;text-align:right;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="padding:28px 28px 8px 28px;background:linear-gradient(135deg,#0a2540,#164e63);color:#ffffff;">
        <div style="font-size:24px;font-weight:900;letter-spacing:-0.4px;">🦈 FinPlay</div>
        <div style="font-size:13px;opacity:0.85;margin-top:6px;">אפליקציית למידה פיננסית</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <h1 style="font-size:20px;font-weight:900;margin:0 0 14px;color:#0f172a;">בקשת אישור הורה</h1>
        <p style="font-size:15px;line-height:24px;margin:0 0 14px;">
          <strong>${escapeHtml(safeName)}</strong> מבקש/ת להירשם למנוי <strong>FinPlay Pro</strong> — אפליקציית למידה פיננסית לבני נוער.
        </p>
        <p style="font-size:14px;line-height:22px;margin:0 0 16px;color:#475569;">
          לפי חוק הכשרות המשפטית והאפוטרופסות (סע' 4-6), רכישה מתמשכת של קטין דורשת אישור הורה. לכן אנחנו פונים אליך לאישור.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">מה זה אומר בפועל?</div>
          <ul style="font-size:13px;line-height:21px;margin:0;padding-right:18px;color:#475569;">
            <li>FinPlay היא אפליקציית למידה. <strong>אין באפליקציה השקעות בכסף אמיתי</strong> או פתיחת חשבון בנק.</li>
            <li>המנוי: כ-14.90 ש"ח לחודש או 119 ש"ח לשנה. החיוב דרך App Store / Google Play.</li>
            <li>ניתן <strong>לבטל את המנוי תוך 14 יום</strong> ולקבל החזר מלא.</li>
            <li>אם תאשר/י עכשיו, תוכל/י לבטל את ההסכמה בעתיד בלחיצה אחת.</li>
          </ul>
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:18px 0 4px;">
          <tr>
            <td align="center" style="padding:0 0 10px;">
              <a href="${escapeAttr(confirmUrl)}"
                 style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:14px 28px;border-radius:12px;letter-spacing:0.2px;">
                ✅ אני מאשר/ת את הרכישה
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${escapeAttr(revokeUrl)}"
                 style="display:inline-block;background:#ffffff;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;border:1.5px solid #cbd5e1;">
                ❌ דחיית הרכישה
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size:12px;line-height:18px;color:#64748b;margin:20px 0 0;">
          הקישורים תקפים ל-14 יום. שאלות? פנו אלינו ב-<a href="mailto:support@finplay.me" style="color:#0c4a6e;">support@finplay.me</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
        FinPlay — אפליקציית למידה פיננסית לבני נוער. <br>
        <a href="https://finplay.me/privacy-policy" style="color:#94a3b8;">מדיניות פרטיות</a> · <a href="https://finplay.me/terms-of-service" style="color:#94a3b8;">תנאי שימוש</a>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
