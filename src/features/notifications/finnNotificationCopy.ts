/**
 * Captain Shark (קפטן שארק), Notification Copy Bank
 * Passive-aggressive, escalating Hebrew messages with financial humor.
 * Pure data + pure functions, no React, no store imports.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface FinnNotificationContext {
    streak: number;
    daysSinceActive: number;
    xp: number;
    level: number;
    timeOfDay: 'morning' | 'evening' | 'other';
}

interface NotifCopy {
    title: string;
    body: string;
}

type CopyPool = readonly NotifCopy[];

type StreakTier = 'safe' | 'at-risk' | 'broken-1' | 'broken-2' | 'broken-3plus';

// ── Streak Reminder Copy (escalating urgency) ────────────────────────────────

const STREAK_REMINDER_COPY: Record<StreakTier, CopyPool> = {
    safe: [
        { title: "קפטן שארק כאן!", body: "יש לכם 5 דקות? בואו נשמור על הרצף שלכם" },
        { title: "💙 היי! חיכיתי לכם היום", body: "השוקים לא מחכים. בואו נלמד ביחד?" },
        { title: "טיפ מהיר לפני שהיום נגמר", body: "5 דקות של למידה = השקעה בעתיד שלכם" },
        { title: "✨ הרצף שלכם חי!", body: "עוד שיעור קצר וסגרתם עוד יום. קדימה?" },
    ],
    'at-risk': [
        { title: "⚡ הרצף שלכם בסכנה!", body: "אל תשברו את זה עכשיו. בואו נסגור את היום" },
        { title: "🔥 עוד כמה שעות והרצף נשבר", body: "2 דקות זה כל מה שצריך. באמת." },
        { title: "⏰ קפטן שארק שולח תזכורת אחרונה", body: "הרצף שלכם מחכה. השוק לא." },
    ],
    'broken-1': [
        { title: "😤 יום אחד בלי ללמוד?", body: "השקעה בידע היא ההשקעה הכי טובה שיש. חזרו!" },
        { title: "⚡ עוד יום אחד ואיבדתם הכל", body: "הרצף שלכם חיכה לכם. בואו נחזיר אותו?" },
        { title: "שמעו, קפטן שארק לא שופט...", body: "אבל יום אחד בלי ללמוד? בואו נתקן את זה" },
    ],
    'broken-2': [
        { title: "😤 בנאדם, כבר יומיים!", body: "ההשקעה הכי טובה היא בידע. בואו כבר." },
        { title: "📉 יומיים בלי FinPlay", body: "השוקים לא עצרו בשבילכם. בואו להתעדכן!" },
        { title: "קפטן שארק מתחיל לדאוג", body: "יומיים ולא שמענו מכם. הכל בסדר?" },
    ],
    'broken-3plus': [
        { title: "🥺 אוקיי... אני מבין", body: "סתם ישבתי כאן לבד וחיכיתי..." },
        { title: "📉 הפורטפוליו שלכם בוכה", body: "גם אני. חזרו כבר." },
        { title: "קפטן שארק חושב שאתם שכחתם ממנו", body: "אבל הוא לא שכח מכם" },
        { title: "😢 כבר שלושה ימים...", body: "אפילו מניית אפל לא ירדה ככה. חזרו!" },
        { title: "קפטן שארק: 'הם לא חוזרים, נכון?'", body: "תוכיחו לו שהוא טועה. לחצו כאן." },
        { title: "💸 הזמן שלכם שווה כסף", body: "5 דקות של למידה > 5 דקות של TikTok. סתם אומר." },
    ],
};

// ── Morning Motivation Copy ──────────────────────────────────────────────────

const MORNING_MOTIVATION_COPY: CopyPool = [
    { title: "🌅 בוקר טוב מקפטן שארק!", body: "ידעתם? 78% מהמיליונרים קוראים כל יום. בואו נתחיל!" },
    { title: "☀️ טיפ בוקר:", body: "כלל 50/30/20: 50% צרכים, 30% רצונות, 20% חיסכון. פשוט!" },
    { title: "קפטן שארק אומר שלום!", body: "מי שמשקיע בידע מרוויח ריבית דריבית על החיים" },
    { title: "💡 טיפ פיננסי ליום חדש", body: "כסף שעובד בשבילכם > כסף שאתם עובדים בשבילו" },
    { title: "📊 שאלה לבוקר:", body: "מה עדיף: ₪100 היום או ₪110 בעוד שנה? (בואו נלמד!)" },
    { title: "🌞 בוקר של הזדמנויות", body: "וורן באפט התחיל להשקיע בגיל 11. אתם כבר מקדימים!" },
    { title: "קפטן שארק מעיר אתכם עם עובדה:", body: "ריבית דריבית היא הכוח השמיני בעולם (איינשטיין)" },
    { title: "💰 טיפ בוקר מקפטן שארק:", body: "לפני שקונים תשאלו: 'צריך או רוצה?' זה חוסך הון" },
    { title: "📈 בוקר טוב!", body: "מי שלומד 5 דקות ביום יודע יותר מ-95% מהאנשים תוך שנה" },
    { title: "יום חדש, שיעור חדש!", body: "הכסף הכי חכם הוא כסף שמשקיעים בראש" },
];

// ── Market Hook Copy ─────────────────────────────────────────────────────────

const MARKET_HOOK_COPY: CopyPool = [
    { title: "📊 השוקים זזים!", body: "בואו לראות מה קורה בעולם הפיננסי" },
    { title: "📈 תנועה בשוק!", body: "יש חדשות מעניינות. בואו לבדוק" },
    { title: "קפטן שארק זיהה משהו מעניין", body: "בואו לראות מה השוק עושה היום" },
    { title: "💹 עדכון שוק מקפטן שארק", body: "השוקים לא ישנים ואתם גם לא צריכים. בואו לראות!" },
    { title: "📊 מה קורה עם ההשקעות?", body: "קפטן שארק בדק. יש עדכונים. בואו לראות!" },
    { title: "🔔 עדכון מהשוק", body: "דברים זזים. בואו נלמד מה זה אומר בשבילכם" },
];

// ── Daily-goal tone variants (US-008) ────────────────────────────────────────

export type GoalTone = 'casual' | 'regular' | 'serious';

/** Pick a tone from the user's dailyGoalMinutes onboarding answer */
export function getToneFromGoal(goalMinutes: number | null | undefined): GoalTone {
    if (!goalMinutes) return 'regular';
    if (goalMinutes <= 10) return 'casual';
    if (goalMinutes >= 20) return 'serious';
    return 'regular';
}

/** Casual tone, warm, low-pressure, for 5-10 min/day learners */
const CASUAL_SAFE_COPY: CopyPool = [
    { title: "💙 נתחיל עם 5 דקות? 🐟", body: "קפטן שארק כאן. בלי לחץ, סתם 5 דקות קצרות" },
    { title: "🌊 תזכורת עדינה מקפטן שארק", body: "רק טיפ אחד היום? 2 דקות, לא יותר" },
    { title: "✨ 5 דקות של למידה שקטה", body: "בואו נלמד משהו קטן ביחד. אין לחץ" },
];

/** Serious tone, performance-focused, for 20+ min/day learners */
const SERIOUS_SAFE_COPY: CopyPool = [
    { title: "📈 יום חסר, נחזור למסלול", body: "הרצף שלכם הוא משמעת. בואו נסגור היום" },
    { title: "⚡ קפטן שארק: זמן ליעד היומי", body: "20 דקות של מיקוד = שבוע של ידע מצטבר" },
    { title: "🎯 המסלול שלכם ממתין", body: "אלופים לא מדלגים על ימים. קדימה" },
];

/** Returns a streak-reminder CopyPool adjusted for the user's goal tone.
 *  Only overrides the `safe` tier; at-risk/broken tiers stay the same (urgency > tone). */
export function getStreakCopyForGoal(tier: StreakTier, tone: GoalTone): CopyPool {
    if (tier !== 'safe' || tone === 'regular') return STREAK_REMINDER_COPY[tier];
    return tone === 'casual' ? CASUAL_SAFE_COPY : SERIOUS_SAFE_COPY;
}

// ── Pure Helper Functions ────────────────────────────────────────────────────

/** Pick a random message from a copy pool, avoiding the last-used title */
export function pickFinnCopy(pool: CopyPool, avoidTitle?: string | null): NotifCopy {
    if (pool.length === 0) return { title: "קפטן שארק כאן!", body: "בואו נלמד!" };
    if (pool.length === 1) return pool[0];

    const filtered = avoidTitle
        ? pool.filter((c) => c.title !== avoidTitle)
        : [...pool];

    const candidates = filtered.length > 0 ? filtered : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Compute notification context from store states */
export function buildStreakContext(
    economyState: { streak: number; lastDailyTaskDate: string | null; xp: number },
    level: number,
): FinnNotificationContext {
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay: FinnNotificationContext['timeOfDay'] =
        hour >= 6 && hour < 12 ? 'morning' : hour >= 18 ? 'evening' : 'other';

    let daysSinceActive = 999;
    if (economyState.lastDailyTaskDate) {
        const lastActive = new Date(economyState.lastDailyTaskDate);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
        daysSinceActive = Math.floor((today.getTime() - lastDay.getTime()) / 86400000);
    }

    return {
        streak: economyState.streak,
        daysSinceActive,
        xp: economyState.xp,
        level,
        timeOfDay,
    };
}

/** Map context to the appropriate streak copy tier */
export function selectStreakCopyTier(ctx: FinnNotificationContext): StreakTier {
    if (ctx.daysSinceActive === 0) return 'safe';
    if (ctx.daysSinceActive === 1) return 'at-risk';
    if (ctx.daysSinceActive === 2) return 'broken-1';
    if (ctx.daysSinceActive === 3) return 'broken-2';
    return 'broken-3plus';
}

/** Get streak copy pool for a given tier */
export function getStreakCopy(tier: StreakTier): CopyPool {
    return STREAK_REMINDER_COPY[tier];
}

/** Get morning motivation copy pool */
export function getMorningCopy(): CopyPool {
    return MORNING_MOTIVATION_COPY;
}

/** Get market hook copy pool */
export function getMarketHookCopy(): CopyPool {
    return MARKET_HOOK_COPY;
}

/** Build inactivity escalation content (for 24h/48h/72h scheduling) */
export function buildInactivityEscalation(avoidTitle?: string | null): Array<{
    content: { title: string; body: string; data: { screen: string } };
    delayHours: number;
}> {
    const day1 = pickFinnCopy(STREAK_REMINDER_COPY['broken-1'], avoidTitle);
    const day2 = pickFinnCopy(STREAK_REMINDER_COPY['broken-2'], day1.title);
    const day3 = pickFinnCopy(STREAK_REMINDER_COPY['broken-3plus'], day2.title);

    return [
        { content: { ...day1, data: { screen: "/(tabs)/learn" } }, delayHours: 24 },
        { content: { ...day2, data: { screen: "/(tabs)/learn" } }, delayHours: 48 },
        { content: { ...day3, data: { screen: "/(tabs)/learn" } }, delayHours: 72 },
    ];
}
