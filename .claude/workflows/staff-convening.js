export const meta = {
  name: 'staff-convening',
  description: 'כינוס עובדים — כל סוכני FinPlay מתכנסים, כל מחלקה מכינה תוצר (נתונים אמיתיים מ-PostHog/קוד + המלצות), ויועצון (Chief of Staff) מנהל את הישיבה ומסכם למצב-חברה, עדיפויות חוצות-מחלקות והחלטות שיואב צריך לקבל.',
  whenToUse: 'כשיואב רוצה "כינוס עובדים" / ישיבת הנהלה / state-of-company / סקירה רוחבית של כל הצוות עם נתונים והמלצות.',
  phases: [
    { title: 'הכנת תוצרים', detail: 'כל מחלקה שולפת נתונים + מגבשת המלצות (במקביל)' },
    { title: 'ישיבת הנהלה', detail: 'יועצון (Chief of Staff) מנהל ומסכם' },
  ],
};

// ── מה כל מחלקה מחזירה ──
const DELIVERABLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    department: { type: 'string', description: 'שם הסוכן/המחלקה' },
    headline: { type: 'string', description: 'משפט אחד — מצב התחום עכשיו' },
    data: {
      type: 'array',
      description: '2-4 מספרים/ממצאים אמיתיים (PostHog 176605 / קוד)',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          metric: { type: 'string' },
          value: { type: 'string' },
          note: { type: 'string', description: 'מגמה/הקשר קצר' },
        },
        required: ['metric', 'value', 'note'],
      },
    },
    recommendations: {
      type: 'array',
      description: '2-3 המלצות ממוקדות',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rec: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
        required: ['rec', 'impact', 'effort'],
      },
    },
    ask: { type: 'string', description: 'בקשה/החלטה אחת שצריך מהחדר (מיואב)' },
  },
  required: ['department', 'headline', 'data', 'recommendations', 'ask'],
};

// ── מה יועצון מחזיר בסוף הישיבה ──
const BRIEFING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stateOfCompany: { type: 'string', description: 'פסקה (≤120 מילים) — מצב החברה היום' },
    topPriorities: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          priority: { type: 'string' },
          owner: { type: 'string', description: 'איזו מחלקה/סוכן מוביל' },
          why: { type: 'string', description: '≤25 מילים' },
        },
        required: ['priority', 'owner', 'why'],
      },
    },
    decisionsNeeded: {
      type: 'array',
      description: 'החלטות שיואב חייב לקבל',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string' },
          options: { type: 'string', description: 'האפשרויות בקצרה' },
        },
        required: ['decision', 'options'],
      },
    },
    conflicts: { type: 'array', items: { type: 'string' }, description: 'מתחים/אי-הסכמות בין מחלקות (ריק אם אין)' },
    oneThing: { type: 'string', description: 'הדבר האחד הכי חשוב לשבוע הקרוב' },
    agenda: { type: 'array', items: { type: 'string' }, description: 'אג׳נדה/פעולות ל-follow-up' },
  },
  required: ['stateOfCompany', 'topPriorities', 'decisionsNeeded', 'conflicts', 'oneThing', 'agenda'],
};

const focus = (typeof args === 'string' && args.length > 0)
  ? args
  : 'מצב כללי של החברה — מה עובד, מה תקוע, ומה הצעד הבא. דגש על הפתיחה (onboarding), רטנשן ומונטיזציה.';

// ── הצוות (persona + תחום + מה לשלוף) ──
const ROSTER = [
  {
    label: 'בר — CMO',
    agentType: 'בר',
    persona: 'אתה בר, ה-CMO. אחראי על אסטרטגיית התוכן והשיווק האורגני (וואטסאפ + אינסטגרם), רכישה ו-$source attribution.',
    brief: 'תחום: רכישה + תוכן. שלוף: מגמת onboarding_started, פילוח $initial_referring_domain/$source, וכל סיגנל של ערוצי קהילה/תוכן. המלצות: איפה לדחוף תוכן/קמפיין כדי להזין את ראש המשפך.',
  },
  {
    label: 'מוני — Economy',
    persona: 'אתה מוני, Game Economy Designer (רף Playtika/Moon Active). מאזן Sinks & Sources, מחירים, drop rates ומונטיזציה.',
    brief: 'תחום: מונטיזציה + כלכלה. שלוף מ-PostHog (dashboard 746425): paywall conversion, subscription_purchased/RC, ו-affordability של ה-Bridge (חציון מטבעות מול תגמול 4,000). המלצות: תזמון paywall, כיול מחיר Bridge, איזון sinks/sources.',
  },
  {
    label: 'רטנשן — LiveOps',
    persona: 'אתה רטנשן, LiveOps Manager (רף Supercell/Moon Active). אירועים, LTOs, push, ועקומות רטנשן.',
    brief: 'תחום: רטנשן. שלוף (dashboard 747334): D1/D7/W1 retention, אימוץ streak, ו-notification_permission_result {granted}. המלצות: 2-3 לוֹבְרים להחזרת משתמשים + push/אירועים.',
  },
  {
    label: 'דואו — Duolingo PM',
    persona: 'אתה דואו, ex-Duolingo PM. מביא מכאניקות ממכרות (streak, compulsion loop, decision-points כל 30-90ש).',
    brief: 'תחום: habit/engagement. שלוף: שיעורים/יום, התפלגות streak (have-streak≥2), השלמת אתגרים יומיים, אורך סשן. המלצות: לחדד את ה-core loop ולהגדיל הרגל.',
  },
  {
    label: 'יפיופי — UX/Game-feel',
    persona: 'אתה יפיופי, UX + Game Designer (רף Supercell/Brawl Stars). Core Loop, friction, game-feel, RTL, נגישות.',
    brief: 'תחום: UX הפתיחה והליבה. שלוף את משפך ה-onboarding (onboarding_step_completed לפי step_name) — הנשירה: started→goal ~-33% (מסך ראשון) ו-intro→signup-gate ~-34%. המלצות: לתקן את המסך הראשון (hook 3ש) ואת שער ההרשמה.',
  },
  {
    label: 'מוני-data → רטנשן בודק PMF',
    persona: 'אתה אנליסט PMF. בודק product-market-fit אמיתי.',
    brief: 'תחום: PMF. שלוף (dashboard 756678): WOW retention, value/active-user, have-streak. המלצה: האם יש "sticky core" או leaky bucket. בקשה: מה ה-North Star למדוד.',
  },
  {
    label: 'וארן — דיוק פיננסי',
    persona: 'אתה וארן, סוכן מודיעין פיננסי. מוודא שהתוכן באפליקציה מדויק ועדכני.',
    brief: 'תחום: דיוק תוכן. סרוק את התוכן האחרון (chapter*/simulations/dilemmas) למספרים/עובדות פיננסיים שעלולים להיות לא מדויקים/מיושנים. המלצות: תיקונים קונקרטיים.',
  },
  {
    label: 'אודרי — Taste',
    persona: 'אתה אודרי 🌹, Taste/Trust/Restraint. שומרת מ-AI גנרי, קזינו-לייט, ומונטיזציה מנצלת.',
    brief: 'תחום: טעם וריסון. סרוק קופי/paywalls/push אחרונים (כולל conversions החדש: bar-content/crowd-question/daily-tips) ל-dark-patterns / AI-generic / FOMO. המלצות: מה לרכך/לתקן (P0 = מונטיזציה-של-פגיעות).',
  },
  {
    label: 'הסורק — Bugs',
    persona: 'אתה הסורק 🐛, צייד באגים.',
    brief: 'תחום: יציבות. הרץ `npx tsc --noEmit | grep -v skills/` (baseline 239 — דווח חריגות), ושלוף $exception מ-PostHog (14 יום) — סוגי קריסות מובילים. המלצות: top fixes.',
  },
  {
    label: 'ארכיטקט — Code/Perf',
    persona: 'אתה ארכיטקט 🏗️, ביצועים וארכיטקטורה. מחובר ל-Neon.',
    brief: 'תחום: בריאות קוד. דווח: god-components (>2000 שורות), בעיות perf חמות, ומצב גודל-אפליקציה/bundle. המלצות: Quick Wins.',
  },
  {
    label: 'קפטן — Release',
    persona: 'אתה קפטן 🚀, מכין את האפליקציה לחנות.',
    brief: 'תחום: מוכנות שחרור. סטטוס: גרסה 1.3.6 על master. תלויים פתוחים: החלפת Firebase config (analytics → 490620), migration DB 0006 (conversions), POSTHOG_API_KEY ב-Vercel, ו-"What\'s New" בחנות. המלצות: סדר הפעולות לשחרור.',
  },
  {
    label: 'יוצרון — Content',
    persona: 'אתה יוצר׳ון ✨, יוצר תוכן (שיעורים/קוויזים/דילמות/תרחישים).',
    brief: 'תחום: כיסוי תוכן. דווח: כמה מודולים/קוויזים/דילמות יש, ואיפה הפערים/מה הכי דליל. המלצות: מה ליצור הבא.',
  },
  {
    label: 'מושן — Motion',
    agentType: 'מושן',
    persona: 'אתה מושן 🎬, Motion Design (Reanimated/Lottie, 60fps, game-feel).',
    brief: 'תחום: ליטוש ותנועה. דווח: מצב האנימציות (כולל מערכת אנימציות האנרגיה החדשה), איפה חסר juice / יש jank. המלצות: ליטושים ברף Supercell.',
  },
  {
    label: 'מאיה — Enablement',
    agentType: 'maya',
    persona: 'אתה מאיה 🎓, ראש Agent Enablement. בריאות צוות הסוכנים והמוח המשותף (knowledge/).',
    brief: 'תחום: בריאות הצוות. דווח: פערי knowledge/ידע סותר, סוכנים לא-מעודכנים, ואיך הכינוס הזה עצמו יכול להשתפר. המלצות: סגירת פערים.',
  },
];

phase('הכנת תוצרים');
log(`כינוס עובדים מתכנס — ${ROSTER.length} מחלקות מכינות תוצרים. מיקוד: ${focus}`);

const deliverables = (await parallel(ROSTER.map((d) => () =>
  agent(
    `${d.persona}

מיקוד הישיבה: ${focus}

${d.brief}

כלים: יש לך גישה ל-PostHog (פרויקט 176605, אזור eu) דרך ToolSearch (חפש "posthog"), ולקוד (Read/Grep/Bash). שלוף 2-4 מספרים/ממצאים אמיתיים לתחום שלך (אל תמציא — אם אין דאטה, אמור זאת), ותן 2-3 המלצות ממוקדות + בקשה אחת מהחדר. עברית, תכל'ס, בלי מילוי. החזר רק את האובייקט המובנה.`,
    {
      label: d.label,
      phase: 'הכנת תוצרים',
      schema: DELIVERABLE_SCHEMA,
      ...(d.agentType ? { agentType: d.agentType } : {}),
    },
  ),
))).filter(Boolean);

phase('ישיבת הנהלה');
log(`${deliverables.length} תוצרים מוכנים — יועצון פותח את הישיבה.`);

const briefing = await agent(
  `אתה יועצון — היועץ האסטרטגי וה-Chief of Staff של יואב רובין (מייסד FinPlay). אתה מנהל את "כינוס העובדים".

לפניך התוצרים של כל המחלקות (נתונים + המלצות + בקשות). נהל את הישיבה:
1. סנתז ל-state-of-company (פסקה אחת).
2. זהה 3-5 עדיפויות חוצות-מחלקות (לא להעתיק כל המלצה — לחבר ולתעדף).
3. הצף מתחים/חפיפות בין מחלקות (איפה ההמלצות מתנגשות או חופפות).
4. נסח את ההחלטות שיואב חייב לקבל (עם האפשרויות).
5. "הדבר האחד" הכי חשוב לשבוע + אג׳נדת follow-up.

מיקוד הישיבה: ${focus}

תוצרי המחלקות:
${JSON.stringify(deliverables)}

עברית, חד, אסטרטגי. החזר רק את האובייקט המובנה.`,
  { label: 'יועצון — Chief of Staff', phase: 'ישיבת הנהלה', schema: BRIEFING_SCHEMA, agentType: 'yoatzon' },
);

return { briefing, deliverables };
