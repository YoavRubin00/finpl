/**
 * The sign-in code email (POST /api/auth/email-code). Short, Hebrew, from
 * FinPlay. System voice, so plural per docs/BRAND.md. The code sits in the
 * subject and the body so iOS / Android can offer it as autofill.
 *
 * Transactional, not advertising, so no "פרסומת" prefix. Keep it that way: the
 * Israeli spam rules (Communications Law section 30A) cover advertising
 * messages, and any marketing content added here would pull it under them.
 */

export interface BuiltLoginCodeEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildLoginCodeEmail({ code, ttlMinutes }: { code: string; ttlMinutes: number }): BuiltLoginCodeEmail {
  const subject = `קוד הכניסה שלכם ל-FinPlay: ${code}`;

  const text = [
    'היי,',
    '',
    'קוד הכניסה שלכם ל-FinPlay:',
    '',
    code,
    '',
    `הקוד תקף ל-${ttlMinutes} דקות.`,
    'לא ביקשתם קוד? אפשר להתעלם מהמייל. בלי הקוד אף אחד לא נכנס לחשבון.',
    '',
    '— צוות FinPlay',
  ].join('\n');

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;direction:rtl;text-align:right;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="padding:22px 28px;background:#0891b2;color:#ffffff;">
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.3px;">FinPlay</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 28px 8px;">
        <h1 style="font-size:19px;font-weight:900;margin:0 0 16px;color:#0f172a;">קוד הכניסה שלכם</h1>
        <div dir="ltr" style="text-align:center;font-size:34px;font-weight:900;letter-spacing:10px;color:#0e7490;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:16px 8px;margin:0 0 18px;">${code}</div>
        <p style="font-size:14px;line-height:22px;margin:0 0 8px;color:#334155;">הקוד תקף ל-${ttlMinutes} דקות.</p>
        <p style="font-size:13px;line-height:21px;margin:0 0 20px;color:#64748b;">לא ביקשתם קוד? אפשר להתעלם מהמייל. בלי הקוד אף אחד לא נכנס לחשבון.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
        צוות FinPlay · <a href="https://finplay.me/privacy-policy" style="color:#94a3b8;">מדיניות פרטיות</a>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
