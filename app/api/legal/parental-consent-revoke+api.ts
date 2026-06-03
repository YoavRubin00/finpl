/**
 * GET /api/legal/parental-consent-revoke?token=XXX
 *
 * Parent clicks the "decline" or "revoke" link in their email. We mark the
 * row 'revoked' (even if it was already 'confirmed' — that's the whole
 * point, a parent can withdraw consent later) and return an HTML page.
 *
 * Token-as-auth, same as confirm.
 *
 * IMPORTANT — revocation policy: this endpoint flips the consent record
 * itself. It does NOT cancel a Pro subscription the minor already bought
 * — that happens through App Store / Google Play and is the parent's
 * responsibility to actually trigger via their refund/cancellation UI.
 * The app's client store will see status='revoked' and re-gate Pro
 * purchases going forward.
 */

import { eq } from 'drizzle-orm';
import { parentalConsents } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { sanitizeString } from '../_shared/validate';
import { getDb, htmlPage } from './_lib';

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'legal-parental-consent-revoke', {
    limit: 30,
    windowSec: 60,
  });
  if (blocked) {
    return htmlPage({
      title: 'יותר מדי בקשות',
      heading: 'נסה/י שוב מאוחר יותר',
      bodyHtml: '<p>נסה/י לטעון את הדף שוב בעוד דקה.</p>',
      tone: 'error',
    });
  }

  try {
    const url = new URL(request.url);
    const token = sanitizeString(url.searchParams.get('token'), 200);
    if (!token) {
      return htmlPage({
        title: 'קישור לא תקין',
        heading: 'קישור לא תקין',
        bodyHtml: '<p>הקישור שעליו לחצת חסר או פגום.</p>',
        tone: 'error',
      });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(parentalConsents)
      .where(eq(parentalConsents.token, token))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return htmlPage({
        title: 'קישור לא נמצא',
        heading: 'קישור לא תקין',
        bodyHtml: '<p>הקישור הזה כבר לא פעיל.</p>',
        tone: 'error',
      });
    }

    if (row.status === 'revoked') {
      return htmlPage({
        title: 'כבר בוטל',
        heading: 'כבר בוטל',
        bodyHtml: '<p>סימנת בעבר שאינך מאשר/ת. הסטטוס הנוכחי: <strong>הסכמה בוטלה</strong>.</p>',
        tone: 'neutral',
      });
    }

    // Flip to revoked regardless of previous status (pending OR confirmed).
    await db
      .update(parentalConsents)
      .set({
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      })
      .where(eq(parentalConsents.token, token));

    const wasConfirmed = row.status === 'confirmed';
    return htmlPage({
      title: 'בוטל',
      heading: 'ההסכמה בוטלה',
      bodyHtml: wasConfirmed
        ? `<p>ההסכמה שנתת בעבר בוטלה. הילד/ה לא יוכל/תוכל לרכוש מנוי Pro מעכשיו והלאה.</p>
           <p style="margin-top:14px;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:13px;color:#92400e;">
             <strong>חשוב:</strong> אם הילד/ה כבר רכש/ה מנוי Pro בעבר על סמך ההסכמה הזו, נדרשת פעולה נפרדת לבטל אותו דרך App Store או Google Play. ניתן לבקש החזר תוך 14 ימים מהרכישה.
           </p>`
        : '<p>סימנת שאינך מאשר/ת את הרכישה. הילד/ה לא יוכל/תוכל לרכוש מנוי Pro.</p>',
      tone: 'neutral',
    });
  } catch {
    return htmlPage({
      title: 'שגיאה',
      heading: 'שגיאה זמנית',
      bodyHtml: '<p>אירעה שגיאה בעת עיבוד הבקשה. אנא נסה/י שוב מאוחר יותר.</p>',
      tone: 'error',
    });
  }
}
