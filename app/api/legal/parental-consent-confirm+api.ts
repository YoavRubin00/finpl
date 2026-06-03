/**
 * GET /api/legal/parental-consent-confirm?token=XXX
 *
 * Parent clicks the confirm link in their email. We validate the token,
 * mark the row 'confirmed', and return an HTML landing page (not JSON) —
 * the parent is in a browser, not the app.
 *
 * Idempotent: clicking the link twice is fine, the second click renders
 * the "already confirmed" page.
 *
 * No auth header — possession of the token IS the auth, by design (the
 * email was sent to the parent's address). Token entropy is 192 bits.
 */

import { eq } from 'drizzle-orm';
import { parentalConsents } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { sanitizeString } from '../_shared/validate';
import { getClientIp, getDb, htmlPage } from '../../../src/lib/api/legal-helpers';

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'legal-parental-consent-confirm', {
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
        bodyHtml: '<p>הקישור שעליו לחצת חסר או פגום. אנא בקש/י קישור חדש מהאפליקציה.</p>',
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
        heading: 'קישור לא תקין או פג תוקף',
        bodyHtml: '<p>הקישור הזה כבר לא פעיל. אם הילד/ה עדיין מבקש/ת אישור, אנא בקשו ממנו/ה לשלוח לך קישור חדש מהאפליקציה.</p>',
        tone: 'error',
      });
    }

    if (row.status === 'confirmed') {
      return htmlPage({
        title: 'כבר אושר',
        heading: 'כבר אישרת',
        bodyHtml: '<p>האישור הזה כבר ניתן בעבר. הילד/ה כבר יכול/ה להירשם ל-FinPlay Pro.</p><p style="margin-top:14px;color:#475569;font-size:13px;">אם תרצה/י לבטל את ההסכמה — חזור/חזרי לאימייל המקורי ולחץ/י על "דחיית הרכישה".</p>',
        tone: 'ok',
      });
    }
    if (row.status === 'revoked') {
      return htmlPage({
        title: 'הוסר',
        heading: 'ההסכמה בוטלה',
        bodyHtml: '<p>סימנת בעבר שאינך מאשר/ת את הרכישה. אם זו טעות, אנא בקש/י מהילד/ה לשלוח קישור חדש מהאפליקציה.</p>',
        tone: 'neutral',
      });
    }
    if (row.status === 'expired' || new Date(row.expiresAt) < new Date()) {
      // Best-effort mark as expired if not already.
      if (row.status !== 'expired') {
        await db
          .update(parentalConsents)
          .set({ status: 'expired' })
          .where(eq(parentalConsents.token, token));
      }
      return htmlPage({
        title: 'פג תוקף',
        heading: 'הקישור פג תוקף',
        bodyHtml: '<p>הקישור פג תוקף (14 יום). אנא בקש/י מהילד/ה לשלוח קישור חדש מהאפליקציה.</p>',
        tone: 'error',
      });
    }

    // Status is 'pending' and not expired — confirm it.
    await db
      .update(parentalConsents)
      .set({
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        ipWhenConfirmed: getClientIp(request),
      })
      .where(eq(parentalConsents.token, token));

    return htmlPage({
      title: 'אושר',
      heading: 'אישרת — תודה',
      bodyHtml: `<p>הילד/ה יכול/ה כעת להירשם ל-FinPlay Pro דרך האפליקציה.</p>
        <p style="margin-top:12px;">תזכורת: ניתן לבטל את המנוי תוך 14 ימים מהרכישה ולקבל החזר מלא דרך App Store / Google Play.</p>
        <p style="margin-top:18px;color:#475569;font-size:13px;">אם תרצה/י לבטל את ההסכמה בעתיד — שמור/שמרי את האימייל המקורי, יש שם קישור "דחיית הרכישה" שעדיין יעבוד.</p>`,
      tone: 'ok',
    });
  } catch {
    return htmlPage({
      title: 'שגיאה',
      heading: 'שגיאה זמנית',
      bodyHtml: '<p>אירעה שגיאה בעת עיבוד הבקשה. אנא נסה/י שוב בעוד מספר דקות.</p>',
      tone: 'error',
    });
  }
}
