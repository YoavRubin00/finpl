// ─── Upload these WebP files to Vercel Blob and update the URLs below ──────
// Source files: assets/webp/fin-fire-1.webp, fin-happy.webp, fin-empathic.webp
const BLOB = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/mascot';
const SHARK_FIRE    = `${BLOB}/fin-fire-1.webp`;
const SHARK_HAPPY   = `${BLOB}/fin-happy.webp`;
const SHARK_EMPATHIC = `${BLOB}/fin-empathic.webp`;
const SHARK_STANDARD = `${BLOB}/fin-standard.webp`;

const BLUE      = '#0ea5e9';
const DARK_BLUE = '#0369a1';
const ORANGE    = '#f97316';
const BG        = '#f0f9ff';

// ─── Rotating finance tips (Tuesday) ────────────────────────────────────────
const FINANCE_TIPS = [
  'כסף שלא עובד בשבילך, עובד נגדך. האינפלציה שוחקת כל שקל שנשאר בעו"ש.',
  'כלל 50/30/20: 50% לצרכים, 30% לרצונות, 20% לחיסכון. שלושה מספרים שיכולים לשנות הכל.',
  'ETF אחת על S&P 500 ניצחה את רוב מנהלי הקרנות המקצועיים ב-20 שנה האחרונות.',
  'ריבית דריבית: ₪1,000 ב-8% שנתי הופכים ל-₪10,000 תוך 30 שנה. הזמן הוא הנשק הכי חזק.',
  'קרן חירום של 3–6 חודשי הוצאות, זה ההבדל בין משבר לאסון.',
  'דמי ניהול: הפרש של 0.9% בשנה שווה עשרות אלפי שקלים לאורך 30 שנה.',
  'כרטיס אשראי בריבית הוא ריבית דריבית שעובדת נגדך.',
  'פיזור הוא ארוחת החינם היחידה בהשקעות. אל תשימו הכל בסל אחד.',
];

function getTip(weekNumber: number): string {
  return FINANCE_TIPS[weekNumber % FINANCE_TIPS.length];
}

// ─── Day content (Duolingo-style) ────────────────────────────────────────────
interface DayContent {
  subject: string;
  headline: string;
  body: string;
  sharkImg: string;   // URL of the shark WebP to show
  sharkAlt: string;
}

function getDayContent(
  dayOfWeek: number,
  name: string,
  streak: number,
  weeklyModules: number,
  weeklyXp: number,
  weekNumber: number,
): DayContent {
  const days: DayContent[] = [
    // ── 0 · Sunday, Weekly review ──────────────────────────────────────────
    {
      subject: `שארק עשה לך סיכום שבועי 🦈`,
      headline: `${name}, הנה השבוע שלך`,
      sharkImg: SHARK_HAPPY,
      sharkAlt: 'שארק שמח',
      body: `
        <p style="font-size:17px;margin:0 0 12px;">שבוע מצוין! הנה מה שעשית:</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:12px;text-align:center;">
          <span style="font-size:32px;">🔥</span>
          <div style="font-size:40px;font-weight:900;color:${ORANGE};">${streak}</div>
          <div style="color:#6b7280;font-size:14px;">ימים ברצף</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
          <div style="background:white;border-radius:10px;padding:12px 20px;text-align:center;flex:1;border:1.5px solid #e0f2fe;">
            <div style="font-size:24px;font-weight:900;color:${BLUE};">${weeklyModules}</div>
            <div style="font-size:12px;color:#6b7280;">שיעורים</div>
          </div>
          <div style="background:white;border-radius:10px;padding:12px 20px;text-align:center;flex:1;border:1.5px solid #e0f2fe;">
            <div style="font-size:24px;font-weight:900;color:${BLUE};">${weeklyXp}</div>
            <div style="font-size:12px;color:#6b7280;">XP</div>
          </div>
        </div>
        <p style="font-size:15px;color:#374151;margin:0;">שבוע הבא, בואו נשבור את השיא 💪</p>
      `,
    },

    // ── 1 · Monday, New week ────────────────────────────────────────────────
    {
      subject: `שבוע חדש. שארק מחכה. 🦈`,
      headline: `${name}, שני, פתחו דף חדש`,
      sharkImg: SHARK_FIRE,
      sharkAlt: 'שארק עם אש',
      body: `
        <p style="font-size:17px;margin:0 0 12px;">שבוע חדש = הזדמנות חדשה.</p>
        <p style="font-size:15px;color:#374151;margin:0 0 12px;">
          הרצף שלכם: <strong style="color:${ORANGE};">${streak} ימים 🔥</strong><br>
          שארק שם עליכם שתלמדו גם השבוע.
        </p>
        <p style="font-size:15px;color:#374151;margin:0;">יום אחד בכל פעם. זה הסוד.</p>
      `,
    },

    // ── 2 · Tuesday, Finance tip ────────────────────────────────────────────
    {
      subject: `${name}, שארק מצא לך סוד פיננסי 👀`,
      headline: `הטיפ הפיננסי של השבוע`,
      sharkImg: SHARK_STANDARD,
      sharkAlt: 'שארק סטנדרטי',
      body: `
        <div style="background:#fef3c7;border-radius:12px;padding:20px;margin-bottom:16px;border-right:4px solid ${ORANGE};">
          <p style="font-size:16px;font-weight:700;color:#92400e;margin:0 0 8px;">💡 הידעתם?</p>
          <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">"${getTip(weekNumber)}"</p>
        </div>
        <p style="font-size:14px;color:#6b7280;margin:0;">רוצים להבין את זה לעומק? השיעור המלא מחכה באפליקציה.</p>
      `,
    },

    // ── 3 · Wednesday, Mid-week urgency ─────────────────────────────────────
    {
      subject: `⚠️ ${streak} ימים ברצף, אל תפרו עכשיו`,
      headline: `אמצע השבוע. הרצף בסכנה?`,
      sharkImg: SHARK_FIRE,
      sharkAlt: 'שארק עם אש',
      body: `
        <p style="font-size:17px;margin:0 0 12px;">
          ${name}, יש לכם <strong style="color:${ORANGE};">${streak} ימים ברצף</strong>.
        </p>
        <p style="font-size:15px;color:#374151;margin:0 0 12px;">
          משתמשים שמחזיקים רצף של שבוע+ מגיעים ל-3× יותר ידע פיננסי.<br>
          שארק לא יסלח אם תשברו את זה ביום רביעי.
        </p>
        <p style="font-size:15px;color:#374151;margin:0;">
          5 דקות. זה הכל שצריך היום. ⏱️
        </p>
      `,
    },

    // ── 4 · Thursday, Mascot emotion ────────────────────────────────────────
    {
      subject: `שארק בודק מה קרה לך, ${name} 😢`,
      headline: `שארק מתגעגע...`,
      sharkImg: SHARK_EMPATHIC,
      sharkAlt: 'שארק אמפתי',
      body: `
        <p style="font-size:17px;margin:0 0 12px;">
          (אנחנו רק בודקים שהכל בסדר...)
        </p>
        <p style="font-size:15px;color:#374151;margin:0 0 12px;">
          הרצף שלכם עומד על <strong style="color:${ORANGE};">${streak} ימים 🔥</strong><br>
          שיעור אחד קצר יוכיח לשארק שאתם חזרתם.
        </p>
        <p style="font-size:14px;color:#6b7280;margin:0;">לוקח פחות מ-5 דקות. מבטיחים.</p>
      `,
    },

    // ── 5 · Friday, FOMO / urgency ──────────────────────────────────────────
    {
      subject: `הסוף שבוע מגיע. הרצף לא מנוח. 🦈`,
      headline: `שישי, עוד שעות ספורות`,
      sharkImg: SHARK_FIRE,
      sharkAlt: 'שארק עם אש',
      body: `
        <p style="font-size:17px;margin:0 0 12px;">
          עוד כמה שעות ויש לכם חופשה מהכל.
        </p>
        <p style="font-size:15px;color:#374151;margin:0 0 12px;">
          חוץ מהרצף. הוא לא נח בסוף שבוע.
        </p>
        <p style="font-size:15px;color:#374151;margin:0;">
          <strong>3 דקות עכשיו</strong> = רצף שמור לכל הסוף שבוע 💪
        </p>
      `,
    },

    // ── 6 · Saturday, Warm & light ──────────────────────────────────────────
    {
      subject: `🦈 שבת שלום, ${name}!`,
      headline: `שבת שלום מהשארק 💙`,
      sharkImg: SHARK_HAPPY,
      sharkAlt: 'שארק שמח',
      body: `
        <p style="font-size:17px;margin:0 0 12px;">נהנים מהסוף שבוע? מצוין!</p>
        <p style="font-size:15px;color:#374151;margin:0 0 12px;">
          שיעור קצר אחד ישמור על הרצף שלכם ויוסיף ידע שיעזור לכם בחיים האמיתיים.
        </p>
        <p style="font-size:15px;color:#374151;margin:0;">
          הרצף שלכם: <strong style="color:${ORANGE};">${streak} ימים 🔥</strong>, שמרו עליו ♥️
        </p>
      `,
    },
  ];

  return days[dayOfWeek] ?? days[0];
}

// ─── Main template builder ───────────────────────────────────────────────────
export function buildDailyEmailHtml(params: {
  name: string;
  streak: number;
  weeklyModules: number;
  weeklyXp: number;
  dayOfWeek: number;
  weekNumber: number;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const { name, streak, weeklyModules, weeklyXp, dayOfWeek, weekNumber, unsubscribeUrl } = params;
  const c = getDayContent(dayOfWeek, name, streak, weeklyModules, weeklyXp, weekNumber);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${c.subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;direction:rtl;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,${BLUE},${DARK_BLUE});padding:28px 24px 0;text-align:center;">
    <h1 style="color:white;margin:0 0 20px;font-size:26px;font-weight:900;letter-spacing:-0.5px;">🦈 FinPlay</h1>
    <!-- Shark mascot, bottom half emerges from header -->
    <img src="${c.sharkImg}" alt="${c.sharkAlt}"
         width="140" height="140"
         style="display:block;margin:0 auto -20px;border-radius:50%;background:rgba(255,255,255,0.15);object-fit:contain;"
         onerror="this.style.display='none'">
  </div>

  <!-- Body -->
  <div style="max-width:520px;margin:0 auto;padding:32px 16px 24px;">

    <!-- Headline -->
    <h2 style="color:#1e3a5f;font-size:22px;margin:0 0 20px;text-align:right;">${c.headline}</h2>

    <!-- Day-specific content -->
    <div style="background:white;border-radius:16px;padding:20px 24px;margin:0 0 24px;
                box-shadow:0 2px 12px rgba(0,0,0,0.08);text-align:right;">
      ${c.body}
    </div>

    <!-- CTA buttons -->
    <div style="text-align:center;margin:0 0 12px;">
      <a href="finpl://learn"
         style="display:inline-block;background:${BLUE};color:white;padding:16px 40px;
                border-radius:14px;font-size:18px;font-weight:900;text-decoration:none;
                box-shadow:0 4px 14px rgba(14,165,233,0.45);">
        להתחיל ללמוד ←
      </a>
    </div>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="finpl://index"
         style="display:inline-block;background:${ORANGE};color:white;padding:14px 32px;
                border-radius:14px;font-size:16px;font-weight:900;text-decoration:none;
                box-shadow:0 4px 14px rgba(249,115,22,0.4);">
        🎮 שחקו עכשיו
      </a>
    </div>

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
    <div style="text-align:center;font-size:12px;color:#9ca3af;">
      <p style="margin:0 0 6px;">© 2025 FinPlay, כל הזכויות שמורות</p>
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">הסרה מרשימת תפוצה</a>
    </div>
  </div>

</body>
</html>`;

  return { subject: c.subject, html };
}
