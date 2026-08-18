/**
 * Daily retention email — ONE action: today's dilemma.
 *
 * Rewritten 2026-08-18 after PostHog (3.8–8.8) showed ~200 sends/day, ~20%
 * open rate, and 8 clicks TOTAL in six days. The previous template
 * (src/features/email/retentionEmail.html) opened fine but never drove a tap:
 *   - the CTA sat BELOW the fold (30px wordmark + 160px shark + h2 + three
 *     paragraphs + a 260px non-clickable "card" image, THEN the button);
 *   - the CTA promise didn't match the landing ("ללמוד השקעות", "לפיד
 *     הקהילה", "לפתוח את התיבה של מחר" — all landing on the daily dilemma);
 *   - the copy asked for "שיעור אחד" while the tap opens a 1-minute dilemma;
 *   - nothing was withheld — the emotional nudge was fully consumed in the
 *     inbox, so there was no reason to tap.
 *
 * Structure now (Gmail-safe: tables + inline CSS, transparent PNG mascot only):
 *   hook (1–2 lines, Captain Shark, singular gender-neutral)
 *   → ONE full-width brand-blue button, above the fold
 *   → teaser: TODAY's real dilemma question (never the answer)
 *   → signature + legal footer (unsubscribe only).
 *
 * The teaser is the SAME scenario the app shows behind the deep link
 * (finpl://quest/daily-dilemma → DilemmaCard → getTodayDilemma()), so the
 * curiosity gap is genuine and closes only in-app.
 */
import { getTodayDilemma } from '../../src/features/daily-challenges/dilemma-data';
import {
  CHALLENGE_COIN_REWARD,
  CHALLENGE_XP_REWARD,
} from '../../src/features/daily-challenges/daily-challenge-types';
import type { RetentionVariantId, D1_EMAIL_VARIANT_ID } from '../../src/features/email/emailTemplates';

export type DailyRetentionVariantId = RetentionVariantId | typeof D1_EMAIL_VARIANT_ID;

// Transparent PNGs (NOT webp/gif — Gmail flattens alpha to a black box). Same
// Blob objects the previous template used; regenerate via scripts/upload-mascot-pngs.ts.
const BLOB = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/mascot';
const SHARK_FIRE = `${BLOB}/fin-fire-1.png`;
const SHARK_HAPPY = `${BLOB}/fin-happy.png`;
const SHARK_EMPATHIC = `${BLOB}/fin-empathic.png`;
const SHARK_STANDARD = `${BLOB}/fin-standard.png`;

const BLUE = '#0ea5e9';
const DARK_BLUE = '#0369a1';
const NAVY = '#1e3a5f';
const BG = '#f0f9ff';

/** The single CTA — same verb, same destination, every variant. */
const CTA_TEXT = 'פתרו את הדילמה של היום ←';

interface VariantCopy {
  /** "פרסומת | " prefix is added by the builder (Israeli Communications Law 30A). */
  subject: string;
  /** 1–2 short lines. Captain Shark, singular gender-neutral (BRAND.md). */
  hook: string;
  sharkImg: string;
  sharkAlt: string;
}

/**
 * Placeholders: {{name}} {{streak}} {{streakLabel}} {{longestStreakLabel}}
 * {{category}} {{xp}} {{coins}}. Every variant sells the SAME action — the
 * 1-minute dilemma — so the button never over-promises what the tap opens.
 * Variant ids are kept for analytics continuity (retention_email_sent /
 * _clicked slice by variant_id; bandit_variants impressions).
 */
const VARIANTS: Record<DailyRetentionVariantId, VariantCopy> = {
  // seq 0 — soft welcome-back
  shark_welcome_v1: {
    subject: 'דילמה אחת, {{name}}. דקה.',
    hook: 'היי {{name}}, לא צריך שיעור שלם היום. דילמה אחת של דקה — והרבה אנשים חכמים נופלים בה.',
    sharkImg: SHARK_HAPPY,
    sharkAlt: 'קפטן שארק שמח',
  },
  // seq 1 — gentle miss-you
  shark_sad_v1: {
    subject: 'שמרתי לך את הדילמה של היום',
    hook: 'לא ראיתי אותך אתמול. בלי שיפוט. שמרתי לך את הדילמה של היום — דקה, ושנינו מרוצים.',
    sharkImg: SHARK_EMPATHIC,
    sharkAlt: 'קפטן שארק אמפתי',
  },
  // seq 2 — "תזכורת מספר שלוש" (must stay in its real 3rd slot)
  shark_meta_v1: {
    subject: 'תזכורת מספר שלוש, {{name}}',
    hook: 'ניסיתי בעדינות. ניסיתי באימוג\'ים. אז ישר ולעניין: דילמה אחת. דקה. בלי שיעור.',
    sharkImg: SHARK_STANDARD,
    sharkAlt: 'קפטן שארק רגוע',
  },
  // seq 3 — minimal ask
  shark_minimal_v1: {
    subject: 'דקה אחת. זה הכל.',
    hook: 'פחות זמן מלבחור סדרה: שאלה אחת בנושא {{category}}, תשובה אחת — וגמרנו.',
    sharkImg: SHARK_STANDARD,
    sharkAlt: 'קפטן שארק רגוע',
  },
  // seq 4 — social framing
  shark_social_v1: {
    subject: '{{name}}, מה רוב האנשים היו עונים?',
    hook: 'הדילמה של היום מפילה הרבה אנשים חכמים. איפה עומדת התשובה שלך?',
    sharkImg: SHARK_HAPPY,
    sharkAlt: 'קפטן שארק שמח',
  },
  // seq 5 — feature nudge (investments unlocked) → still ONE action
  shark_invest_v1: {
    subject: '{{name}}, שאלה של כסף אמיתי. דקה.',
    hook: 'פרק ההשקעות פתוח לכולם. אבל היום — רק דילמה אחת בנושא {{category}}, והתשובה נחשפת אחרי הבחירה.',
    sharkImg: SHARK_FIRE,
    sharkAlt: 'קפטן שארק נחוש',
  },
  // seq 6 — reward framing
  shark_tomorrow_v1: {
    subject: 'יש לך פרס שמחכה, {{name}}',
    hook: 'תשובה נכונה היום = +{{coins}} מטבעות ורצף שמתחיל מחדש. דילמה אחת. דקה.',
    sharkImg: SHARK_STANDARD,
    sharkAlt: 'קפטן שארק רגוע',
  },
  // seq 7 — curiosity gap
  shark_curiosity_v1: {
    subject: 'הדילמה של היום: {{category}}. מה התשובה שלך?',
    hook: 'שאלה קצרה — ורוב האנשים נופלים בה. התשובה (והסיבה) מחכות אחרי הבחירה.',
    sharkImg: SHARK_HAPPY,
    sharkAlt: 'קפטן שארק שמח',
  },
  // streak-dependent (only picked when the user has a live streak)
  shark_streak_v1: {
    subject: '⚠️ {{streak}} ימים בסכנה ({{name}})',
    hook: '{{streakLabel}} ברצף זה לא מובן מאליו. הספירה מתאפסת היום — דילמה אחת של דקה מצילה את הרצף.',
    sharkImg: SHARK_FIRE,
    sharkAlt: 'קפטן שארק נחוש',
  },
  // held-out roast (never selected by retentionVariantForSeq; typed for completeness)
  shark_roast_v1: {
    subject: '{{longestStreakLabel}}. זה השיא שלך, {{name}}?',
    hook: 'הרצף הכי ארוך שלך: {{longestStreakLabel}}. וזהו, נגמר שם. רצף חדש מתחיל בדילמה אחת.',
    sharkImg: SHARK_STANDARD,
    sharkAlt: 'קפטן שארק מאוכזב',
  },
  // day-1 cohort (signed up yesterday, didn't return)
  d1_curiosity_v1: {
    subject: '{{name}}, הרצף שלך בן יום. דילמה אחת = יומיים.',
    hook: 'יום ראשון סגור. דילמה אחת היום = יומיים ברצף, והתיבה של יום 2 נפתחת. דקה.',
    sharkImg: SHARK_FIRE,
    sharkAlt: 'קפטן שארק נחוש',
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Hebrew grammar for a streak count: 1→'יום אחד', 2→'יומיים', else 'N ימים'. */
function streakLabel(n: number): string {
  if (n === 1) return 'יום אחד';
  if (n === 2) return 'יומיים';
  return `${n} ימים`;
}

export interface DailyRetentionEmailParams {
  variantId: DailyRetentionVariantId;
  name: string;
  streak: number;
  /** Historical best (userProfiles.longest_streak). Falls back to `streak`. */
  longestStreak?: number;
  /** Tracked CTA URL (/api/email/track-click?u=..&v=..&s=..) — the ONLY action link. */
  ctaUrl: string;
  unsubscribeUrl: string;
  /** Absolute URL of the open-tracking pixel. Omitted → no pixel (previews). */
  openPixelUrl?: string;
}

export interface DailyRetentionEmail {
  subject: string;
  html: string;
  /** Plain-text alternative (deliverability + text-only clients). */
  text: string;
}

export function buildDailyRetentionEmail(params: DailyRetentionEmailParams): DailyRetentionEmail {
  const v = VARIANTS[params.variantId];
  if (!v) throw new Error(`Unknown daily retention variant: ${params.variantId}`);

  // Today's real dilemma — the same one the deep link opens (getTodayDilemma
  // is UTC-day indexed on both sides). Question only; the answer stays in-app.
  const dilemma = getTodayDilemma();
  const longest = params.longestStreak ?? params.streak;

  const fill = (s: string): string =>
    s
      .split('{{name}}').join(params.name)
      .split('{{streak}}').join(String(params.streak))
      .split('{{streakLabel}}').join(streakLabel(params.streak))
      .split('{{longestStreakLabel}}').join(streakLabel(longest))
      .split('{{category}}').join(dilemma.category)
      .split('{{xp}}').join(String(CHALLENGE_XP_REWARD))
      .split('{{coins}}').join(String(CHALLENGE_COIN_REWARD));

  // "פרסומת | " prefix — Israeli Communications Law section 30A.
  const subject = `פרסומת | ${fill(v.subject)}`;
  const hook = fill(v.hook);
  const question = dilemma.scenarioText;
  const rewardLine = `תשובה נכונה = +${CHALLENGE_XP_REWARD} XP ו-${CHALLENGE_COIN_REWARD} מטבעות`;
  // Inbox preview line: the question itself, so the curiosity gap starts
  // before the open (Gmail shows ~90 chars after the subject).
  const preheader = `הדילמה של היום · ${dilemma.category}: ${question}`;

  const cta = escapeHtml(params.ctaUrl);
  const unsub = escapeHtml(params.unsubscribeUrl);
  const openPixel = params.openPixelUrl
    ? `<img src="${escapeHtml(params.openPixelUrl)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;">`
    : '';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <!-- Preheader (hidden in body, shown as the inbox snippet) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;direction:rtl;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};direction:rtl;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;direction:rtl;">

          <!-- Header: compact so the button lands above the fold -->
          <tr>
            <td align="center" bgcolor="${BLUE}" style="background-color:${BLUE};background-image:linear-gradient(135deg,${BLUE},${DARK_BLUE});padding:18px 20px 0;">
              <div style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.3px;margin:0 0 6px;">FinPlay</div>
              <img src="${v.sharkImg}" alt="${escapeHtml(v.sharkAlt)}" width="112" height="112"
                   style="display:block;margin:0 auto -28px;width:112px;height:112px;border:0;">
            </td>
          </tr>

          <!-- Hook -->
          <tr>
            <td style="padding:44px 20px 0;">
              <p dir="rtl" style="margin:0;color:${NAVY};font-size:20px;line-height:1.45;font-weight:900;text-align:right;">
                ${escapeHtml(hook)}
              </p>
            </td>
          </tr>

          <!-- THE button (full width, ≥52px tall, brand blue) -->
          <tr>
            <td style="padding:20px 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${BLUE}" style="background-color:${BLUE};border-radius:14px;">
                    <a href="${cta}"
                       style="display:block;padding:18px 20px;color:#ffffff;font-size:19px;line-height:1.2;font-weight:900;text-decoration:none;text-align:center;direction:rtl;">
                      ${escapeHtml(CTA_TEXT)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;color:#64748b;font-size:13px;text-align:center;">דקה אחת · ${escapeHtml(rewardLine)}</p>
            </td>
          </tr>

          <!-- Teaser: today's real question, answer withheld -->
          <tr>
            <td style="padding:24px 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:14px;border:1px solid #e0f2fe;">
                <tr>
                  <td style="padding:16px 18px;text-align:right;direction:rtl;">
                    <p style="margin:0 0 6px;color:${DARK_BLUE};font-size:12px;font-weight:700;letter-spacing:0.2px;">הדילמה של היום · ${escapeHtml(dilemma.category)}</p>
                    <a href="${cta}" style="color:#374151;text-decoration:none;">
                      <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(question)}</p>
                    </a>
                    <p style="margin:10px 0 0;color:#94a3b8;font-size:13px;">התשובה? רק אחרי שבוחרים.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:20px 20px 28px;text-align:right;">
              <p style="margin:0;color:${NAVY};font-size:15px;font-weight:700;">— קפטן שארק</p>
            </td>
          </tr>

          <!-- Footer (Section 30A compliance) -->
          <tr>
            <td style="padding:0 20px 28px;border-top:1px solid #e5e7eb;">
              <p style="margin:16px 0 6px;color:#64748b;font-size:12px;font-weight:700;text-align:center;">© 2026 FinPlay · finplay.me · support@finplay.me</p>
              <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.7;text-align:center;">
                להסרה מרשימת התפוצה:
                <a href="${unsub}" style="color:${BLUE};text-decoration:underline;">לחצו כאן</a>
                או השיבו למייל זה עם המילה "הסר".
              </p>
              <p style="margin:0;color:#cbd5e1;font-size:11px;line-height:1.6;text-align:center;">
                הודעה זו נשלחה אליך כדיוור על פי הסכמתך בעת הרישום ל-FinPlay,<br>
                בהתאם לסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ"ב-1982.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  ${openPixel}
</body>
</html>`;

  const text = `${hook}

${CTA_TEXT.replace(' ←', '')}: ${params.ctaUrl}
דקה אחת · ${rewardLine}

הדילמה של היום · ${dilemma.category}:
${question}
התשובה? רק אחרי שבוחרים.

— קפטן שארק

להסרה מרשימת התפוצה: ${params.unsubscribeUrl}
או השיבו למייל זה עם המילה "הסר".
© 2026 FinPlay · finplay.me · support@finplay.me`;

  return { subject, html, text };
}
