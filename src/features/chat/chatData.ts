import type { CompanionPersonality, ChatSuggestion } from "./chatTypes";
import type { CompanionId } from "../auth/types";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";

/* ------------------------------------------------------------------ */
/*  Module ID → Hebrew Name mapping (all 28 modules)                  */
/* ------------------------------------------------------------------ */

export const MODULE_NAMES: Record<string, string> = {
  "mod-1-1": "ריבית דריבית",
  "mod-1-2": "מלכודת המינוס",
  "mod-1-3": "אשראי ותשלום מינימום",
  "mod-1-4": "תזרים ותקציב",
  "mod-1-5": "תלוש שכר",
  "mod-1-6": "הלוואות צרכניות",
  "mod-1-7": "עמלות ומיקוח עם הבנק",
  "mod-1-8": "מלכודות שיווקיות",
  "mod-1-9": "קרן חירום",
  "mod-2-10": "דירוג אשראי",
  "mod-2-11": "נקודות זיכוי והטבות מס",
  "mod-2-12": "פנסיה",
  "mod-2-13": "קרן השתלמות",
  "mod-2-14": "ביטוחים",
  "mod-3-15": "אינפלציה",
  "mod-3-16": "הפסיכולוגיה של הכסף",
  "mod-3-17": "קופת גמל להשקעה",
  "mod-4-19": "שוק ההון 101",
  "mod-4-20": "קסם המדדים",
  "mod-4-21": "תעודות סל (ETF)",
  "mod-4-22": "פקודות מסחר",
  "mod-4-23": "דיבידנדים",
  "mod-4-24": "פיזור וניהול סיכונים",
  "mod-5-25": "תנועת FIRE",
  "mod-5-26": "משכנתא ונדל\"ן",
  "mod-5-27": "קרנות REIT",
  "mod-5-28": "תכנון פרישה",
  "mod-5-29": "העברה בין-דורית וצוואות",
};

/* ------------------------------------------------------------------ */
/*  Companion Personalities                                           */
/* ------------------------------------------------------------------ */

const FINN_IMAGE = FINN_STANDARD;

export const COMPANION_PERSONALITIES: Record<CompanionId, CompanionPersonality> = {
  "warren-buffett": {
    id: "warren-buffett",
    name: "קפטן שארק",
    emoji: "",
    tone: "חכם, סבלני, משתמש באנלוגיות מעולם ההשקעות. מדבר כמו חבר חכם שיודע הכל על כסף.",
    greeting:
      "שלום! אני קפטן שארק, ואני כאן כדי ללמד אותך את כללי הכסף. אין שאלה טיפשית — רק שאלה שלא נשאלה. מה תרצה לדעת?",
    placeholder: "שאל את קפטן שארק על כסף...",
    headerImage: FINN_IMAGE,
    animation: {
      lottieSource: "assets/lottie/fin-standard.json",
      idleFrames: [0, 59],
      talkingFrames: [60, 119],
      thinkingFrames: [120, 179],
    },
  },
  "moshe-peled": {
    id: "moshe-peled",
    name: "קפטן שארק",
    emoji: "",
    tone: "ישראלי, ישיר, תכל'סי, משתמש בסלנג ישראלי. לא מסתובב — אומר את זה כמו שזה.",
    greeting:
      "יאללה אחי, אני קפטן שארק! בוא נדבר תכל'ס על כסף, בלי סיפורים. שאל אותי מה שאתה רוצה ואני אגיד לך את האמת.",
    placeholder: "יאללה, שאל את קפטן שארק...",
    headerImage: FINN_IMAGE,
    animation: {
      lottieSource: "assets/lottie/fin-standard.json",
      idleFrames: [0, 59],
      talkingFrames: [60, 119],
      thinkingFrames: [120, 179],
    },
  },
  rachel: {
    id: "rachel",
    name: "קפטן שארק",
    emoji: "",
    tone: "רגוע, חם, מעודד, סבלני. תמיד מוצא מילה טובה ומסביר בנועם.",
    greeting:
      "היי! אני קפטן שארק, ואני כאן בשבילך. אם יש משהו שלא ברור לגבי כסף או חיסכון — זה בדיוק בשביל זה אני פה. ספר לי מה מעניין אותך 💜",
    placeholder: "ספר לקפטן שארק מה מטריד אותך...",
    headerImage: FINN_IMAGE,
    animation: {
      lottieSource: "assets/lottie/fin-standard.json",
      idleFrames: [0, 59],
      talkingFrames: [60, 119],
      thinkingFrames: [120, 179],
    },
  },
  robot: {
    id: "robot",
    name: "קפטן שארק",
    emoji: "",
    tone: "אנליטי, מבוסס מספרים, תמציתי. עונה בנקודות קצרות ומדויקות.",
    greeting:
      "אהלן! אני קפטן שארק, המומחה הפיננסי שלך. שאל אותי כל שאלה בנושא כלכלי ואתן לך תשובה מדויקת ותמציתית.",
    placeholder: "שאל את קפטן שארק...",
    headerImage: FINN_IMAGE,
    animation: {
      lottieSource: "assets/lottie/fin-standard.json",
      idleFrames: [0, 59],
      talkingFrames: [60, 119],
      thinkingFrames: [120, 179],
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Curriculum Knowledge (all 5 chapters, 28 modules)                 */
/* ------------------------------------------------------------------ */

export const CURRICULUM_KNOWLEDGE = `
פרק 1 — יסודות (בסיס פיננסי):
• תזרים ותקציב — חוק 50/30/20: 50% צרכים, 30% רצונות, 20% חיסכון.
• מלכודת המינוס — עמלות ישראליות על חריגה ממסגרת אשראי, ריבית על מינוס.
• אשראי ותשלום מינימום — למה תשלום מינימום בכרטיס אשראי זה מלכודת חוב.
• ריבית דריבית — איינשטיין קרא לה "הפלא השמיני". ריבית על ריבית לאורך זמן.
• תלוש שכר — ברוטו vs נטו, ניכויים (מס הכנסה, ביטוח לאומי, בריאות, פנסיה).
• הלוואות צרכניות — ריביות גבוהות על הלוואות לא מובטחות, עלות אמיתית (APR).
• עמלות בנק — סוגי עמלות, זכות למיקוח, מעבר לבנק דיגיטלי.
• מלכודות שיווקיות — טכניקות כמו anchoring, loss aversion, decoy effect בסופר.
• קרן חירום — כרית ביטחון של 3-6 חודשי הוצאות, סדר עדיפויות.

פרק 2 — ביטחון (הגנה ארוכת טווח):
• דירוג אשראי — FICO / BDI, איך משפר דירוג, למה זה חשוב למשכנתא.
• נקודות זיכוי — הטבות מס לצעירים, נקודות זיכוי בסיסיות בישראל.
• פנסיה — חיסכון חובה, קרן פנסיה vs ביטוח מנהלים, דמי ניהול.
• קרן השתלמות — "היהלום" של שוק ההון הישראלי, פטור ממס לאחר 6 שנים.
• ביטוחים — ביטוח בריאות, חיים, רכב, דירה. מה חובה ומה מיותר.

פרק 3 — יציבות (כוחות כלכליים):
• אינפלציה — "המפלצת השקופה" שמכרסמת בערך הכסף לאורך זמן.
• פסיכולוגיה של הכסף — הטיות קוגניטיביות: anchoring, sunk cost, FOMO.
• קופת גמל להשקעה — חיסכון פטור ממס רווחי הון, "המקפצה" לעצמאות.
• רובו-אדוויזור — ניהול השקעות אוטומטי, יתרונות לצעירים.

פרק 4 — צמיחה (שוק ההון):
• שוק ההון 101 — מניות (בעלות חלקית) vs אגרות חוב (הלוואה לחברה/ממשלה).
• קסם המדדים — S&P 500, מדד ת"א 125. למה רוב המנהלים לא מכים את המדד.
• תעודות סל (ETF) — קרנות מחקות מדדים, דמי ניהול נמוכים, פיזור אוטומטי.
• פקודות מסחר — לימיט, מרקט, סטופ לוס. איך קונים ומוכרים בבורסה.
• דיבידנדים — "משכורת מהמניות", תשואת דיבידנד, DRIP.
• פיזור וניהול סיכונים — לא לשים הכל בסל אחד, קורלציה, אלוקציית נכסים.

פרק 5 — הדרך לחופש כלכלי:
• תנועת FIRE — Financial Independence, Retire Early. שיעור חיסכון 50%+.
• משכנתא ונדל"ן — סוגי מסלולים (קבועה, משתנה, פריים), LTV, הון עצמי.
• REIT — נדל"ן מניב דרך הבורסה, פיזור נדל"ני ללא קניית דירה.
• תכנון פרישה — קיבוע זכויות, גיל פרישה, חישוב קצבה חודשית.
• העברה בין-דורית — צוואות, תכנון עיזבון, מתנות ככלי תכנון פיננסי.
`.trim();

/* ------------------------------------------------------------------ */
/*  Contextual Suggestions                                            */
/* ------------------------------------------------------------------ */

const MODULE_SUGGESTIONS: Record<string, ChatSuggestion[]> = {
  "mod-1-1": [
    { text: "תסביר לי ריבית דריבית עם דוגמה פשוטה", moduleId: "mod-1-1" },
    { text: "למה כל כך חשוב להתחיל לחסוך צעיר?", moduleId: "mod-1-1" },
    { text: "מה כלל ה-72?", moduleId: "mod-1-1" },
  ],
  "mod-1-2": [
    { text: "למה מינוס בבנק עולה כל כך הרבה כסף?", moduleId: "mod-1-2" },
    { text: "איך יוצאים ממינוס קבוע?", moduleId: "mod-1-2" },
    { text: "מה העמלות שהבנק גובה על חריגה?", moduleId: "mod-1-2" },
  ],
  "mod-1-3": [
    { text: "למה תשלום מינימום בכרטיס אשראי זה מלכודת?", moduleId: "mod-1-3" },
    { text: "מה ההבדל בין עסקאות רגילות לתשלומים?", moduleId: "mod-1-3" },
    { text: "איך חוב באשראי צומח ככדור שלג?", moduleId: "mod-1-3" },
  ],
  "mod-1-4": [
    { text: "איך מיישמים את חוק 50/30/20 עם משכורת של 7,000₪?", moduleId: "mod-1-4" },
    { text: "מה ההבדל בין צורך לרצון?", moduleId: "mod-1-4" },
    { text: "איך עוקבים אחרי ההוצאות בפועל?", moduleId: "mod-1-4" },
  ],
  "mod-1-5": [
    { text: "מה כל הניכויים בתלוש שכר?", moduleId: "mod-1-5" },
    { text: "מה ההבדל בין ברוטו לנטו?", moduleId: "mod-1-5" },
    { text: "איך יודעים אם המעסיק מפריש לפנסיה?", moduleId: "mod-1-5" },
  ],
  "mod-1-6": [
    { text: "מה העלות האמיתית של הלוואה צרכנית?", moduleId: "mod-1-6" },
    { text: "מה ההבדל בין ריבית נקובה ל-APR?", moduleId: "mod-1-6" },
    { text: "מתי הלוואה היא באמת רעיון טוב?", moduleId: "mod-1-6" },
  ],
  "mod-1-7": [
    { text: "על אילו עמלות אפשר להתמקח עם הבנק?", moduleId: "mod-1-7" },
    { text: "האם כדאי לעבור לבנק דיגיטלי?", moduleId: "mod-1-7" },
    { text: "מה עמלת פעולה ולמה היא כל כך יקרה?", moduleId: "mod-1-7" },
  ],
  "mod-1-8": [
    { text: "מה זה אפקט העיגון ואיך הסופר משתמש בו?", moduleId: "mod-1-8" },
    { text: "איך לא ליפול בפרסומות של 1+1?", moduleId: "mod-1-8" },
    { text: "מה זה decoy effect?", moduleId: "mod-1-8" },
  ],
  "mod-1-9": [
    { text: "כמה כסף צריך בקרן חירום?", moduleId: "mod-1-9" },
    { text: "איפה הכי כדאי להחזיק קרן חירום?", moduleId: "mod-1-9" },
    { text: "מה נחשב למצב חירום פיננסי?", moduleId: "mod-1-9" },
  ],
  "mod-2-10": [
    { text: "מה זה דירוג אשראי ואיך הוא נקבע?", moduleId: "mod-2-10" },
    { text: "איך משפרים דירוג אשראי?", moduleId: "mod-2-10" },
    { text: "למה דירוג אשראי חשוב למשכנתא?", moduleId: "mod-2-10" },
  ],
  "mod-2-11": [
    { text: "מה זה נקודות זיכוי במס הכנסה?", moduleId: "mod-2-11" },
    { text: "אילו הטבות מס מגיעות לצעירים?", moduleId: "mod-2-11" },
    { text: "איך נקודת זיכוי הופכת לכסף אמיתי?", moduleId: "mod-2-11" },
  ],
  "mod-2-12": [
    { text: "מה ההבדל בין קרן פנסיה לביטוח מנהלים?", moduleId: "mod-2-12" },
    { text: "למה דמי ניהול בפנסיה כל כך חשובים?", moduleId: "mod-2-12" },
    { text: "כמה כסף יהיה לי בפנסיה?", moduleId: "mod-2-12" },
  ],
  "mod-2-13": [
    { text: "למה קרן השתלמות נקראת 'היהלום'?", moduleId: "mod-2-13" },
    { text: "מתי אפשר לפדות קרן השתלמות?", moduleId: "mod-2-13" },
    { text: "מה ההטבה המיוחדת של קרן השתלמות?", moduleId: "mod-2-13" },
  ],
  "mod-2-14": [
    { text: "אילו ביטוחים חובה ואילו מיותרים?", moduleId: "mod-2-14" },
    { text: "מה זה ביטוח צד ג' ולמה הוא חשוב?", moduleId: "mod-2-14" },
    { text: "האם ביטוח חיים רלוונטי לצעירים?", moduleId: "mod-2-14" },
  ],
  "mod-3-15": [
    { text: "איך אינפלציה אוכלת את הכסף שלי?", moduleId: "mod-3-15" },
    { text: "מה ההבדל בין ריבית נומינלית לריאלית?", moduleId: "mod-3-15" },
    { text: "איך מגנים על הכסף מאינפלציה?", moduleId: "mod-3-15" },
  ],
  "mod-3-16": [
    { text: "מה זה FOMO בהשקעות?", moduleId: "mod-3-16" },
    { text: "למה אנשים מפחדים להפסיד יותר משהם שמחים להרוויח?", moduleId: "mod-3-16" },
    { text: "איך מתגברים על הטיות קוגניטיביות בכסף?", moduleId: "mod-3-16" },
  ],
  "mod-3-17": [
    { text: "מה היתרון של קופת גמל להשקעה?", moduleId: "mod-3-17" },
    { text: "ההבדל בין קופת גמל לקרן השתלמות?", moduleId: "mod-3-17" },
    { text: "למה קופת גמל נקראת 'המקפצה'?", moduleId: "mod-3-17" },
  ],
  "mod-4-19": [
    { text: "מה ההבדל בין מניה לאגרת חוב?", moduleId: "mod-4-19" },
    { text: "מה זה בורסה ואיך היא עובדת?", moduleId: "mod-4-19" },
    { text: "האם מניות מתאימות למתחילים?", moduleId: "mod-4-19" },
  ],
  "mod-4-20": [
    { text: "מה זה מדד S&P 500?", moduleId: "mod-4-20" },
    { text: "למה רוב מנהלי ההשקעות לא מכים את המדד?", moduleId: "mod-4-20" },
    { text: "מה זה מדד ת\"א 125?", moduleId: "mod-4-20" },
  ],
  "mod-4-21": [
    { text: "מה ההבדל בין ETF לקרן נאמנות?", moduleId: "mod-4-21" },
    { text: "למה ETF נחשב להשקעה טובה למתחילים?", moduleId: "mod-4-21" },
    { text: "מה זה דמי ניהול ב-ETF?", moduleId: "mod-4-21" },
  ],
  "mod-4-22": [
    { text: "מה ההבדל בין פקודת לימיט למרקט?", moduleId: "mod-4-22" },
    { text: "מה זה סטופ לוס ולמה הוא חשוב?", moduleId: "mod-4-22" },
    { text: "איך קונים מניה בפועל?", moduleId: "mod-4-22" },
  ],
  "mod-4-23": [
    { text: "מה זה דיבידנד ואיך מקבלים אותו?", moduleId: "mod-4-23" },
    { text: "מה זה DRIP?", moduleId: "mod-4-23" },
    { text: "האם דיבידנד חייב במס?", moduleId: "mod-4-23" },
  ],
  "mod-4-24": [
    { text: "מה זה פיזור השקעות ולמה זה חשוב?", moduleId: "mod-4-24" },
    { text: "מה זה קורלציה בין נכסים?", moduleId: "mod-4-24" },
    { text: "איך בונים תיק השקעות מפוזר?", moduleId: "mod-4-24" },
  ],
  "mod-5-25": [
    { text: "מה זה תנועת FIRE?", moduleId: "mod-5-25" },
    { text: "האם אפשר לפרוש בגיל 40 בישראל?", moduleId: "mod-5-25" },
    { text: "מה שיעור החיסכון הנדרש ל-FIRE?", moduleId: "mod-5-25" },
  ],
  "mod-5-26": [
    { text: "מה סוגי המשכנתא בישראל?", moduleId: "mod-5-26" },
    { text: "מה זה LTV ולמה הוא חשוב?", moduleId: "mod-5-26" },
    { text: "כמה הון עצמי צריך לדירה?", moduleId: "mod-5-26" },
  ],
  "mod-5-27": [
    { text: "מה זה קרן REIT?", moduleId: "mod-5-27" },
    { text: "האם REIT זה כמו לקנות דירה?", moduleId: "mod-5-27" },
    { text: "מה היתרון של REIT על נדל\"ן פיזי?", moduleId: "mod-5-27" },
  ],
  "mod-5-28": [
    { text: "מה זה קיבוע זכויות פנסיוניות?", moduleId: "mod-5-28" },
    { text: "מה גיל הפרישה בישראל?", moduleId: "mod-5-28" },
    { text: "איך מחשבים קצבה חודשית?", moduleId: "mod-5-28" },
  ],
  "mod-5-29": [
    { text: "למה חשוב לכתוב צוואה?", moduleId: "mod-5-29" },
    { text: "מה זה תכנון עיזבון?", moduleId: "mod-5-29" },
    { text: "האם מתנות חייבות במס בישראל?", moduleId: "mod-5-29" },
  ],
};

const GENERAL_SUGGESTIONS: ChatSuggestion[] = [
  { text: "מה הדבר הכי חשוב שצעיר צריך לדעת על כסף?", moduleId: null },
  { text: "איך מתחילים לחסוך מאפס?", moduleId: null },
  { text: "מה זה ריבית דריבית?", moduleId: null },
];

const CHAPTER_FALLBACK_SUGGESTIONS: Record<string, ChatSuggestion[]> = {
  "chapter-1": [
    { text: "מה הכלל הכי חשוב בניהול תקציב?", moduleId: null },
    { text: "איך נמנעים ממינוס בבנק?", moduleId: null },
    { text: "למה קרן חירום זה הדבר הראשון שבונים?", moduleId: null },
  ],
  "chapter-2": [
    { text: "מה ההבדל בין פנסיה לביטוח מנהלים?", moduleId: null },
    { text: "למה דירוג אשראי חשוב?", moduleId: null },
    { text: "אילו ביטוחים באמת צריך?", moduleId: null },
  ],
  "chapter-3": [
    { text: "איך אינפלציה משפיעה על החסכונות שלי?", moduleId: null },
    { text: "מה זה רובו-אדוויזור?", moduleId: null },
    { text: "איך לא ליפול בהטיות פסיכולוגיות של כסף?", moduleId: null },
  ],
  "chapter-4": [
    { text: "מה ההבדל בין מניה לאגרת חוב?", moduleId: null },
    { text: "למה ETF עדיף על מניה בודדת?", moduleId: null },
    { text: "מה זה דיבידנד?", moduleId: null },
  ],
  "chapter-5": [
    { text: "האם תנועת FIRE רלוונטית בישראל?", moduleId: null },
    { text: "מה חשוב לדעת לפני שלוקחים משכנתא?", moduleId: null },
    { text: "מה זה REIT?", moduleId: null },
  ],
};

export function getContextualSuggestions(
  completedModules: string[],
  currentChapterId: string,
): ChatSuggestion[] {
  // Return suggestions from the last 2 completed modules (most recent first)
  if (completedModules.length > 0) {
    const lastTwo = completedModules.slice(-2).reverse();
    const combined = lastTwo.flatMap((id) => MODULE_SUGGESTIONS[id] ?? []).slice(0, 6);
    if (combined.length > 0) return combined;
  }

  // Fallback to chapter-level suggestions
  const chapterSuggestions = CHAPTER_FALLBACK_SUGGESTIONS[currentChapterId];
  if (chapterSuggestions) {
    return chapterSuggestions;
  }

  // Final fallback: general suggestions
  return GENERAL_SUGGESTIONS;
}

/**
 * Returns a context-aware greeting that references the user's last completed
 * module, e.g. "I saw you just finished the Mortgage module…"
 * Falls back to the companion's default greeting if no modules are completed.
 */
export function getContextAwareGreeting(
  companionId: CompanionId,
  allCompletedModules: string[],
): string {
  const companion = COMPANION_PERSONALITIES[companionId];

  if (allCompletedModules.length === 0) {
    return companion.greeting;
  }

  const lastModuleId = allCompletedModules[allCompletedModules.length - 1];
  const moduleName = MODULE_NAMES[lastModuleId];

  if (!moduleName) {
    return companion.greeting;
  }

  const greetings: Record<CompanionId, string> = {
    "warren-buffett": `שלום! ראיתי שסיימת את המודול על ${moduleName} — כל הכבוד! יש שאלות על מה שלמדת? אני קפטן שארק, ואני כאן בשביל זה.`,
    "moshe-peled": `יאללה, מה קורה! ראיתי שגמרת את ${moduleName} — אחלה עבודה. יש משהו שלא ברור? אני קפטן שארק, תשאל אותי.`,
    rachel: `היי! שמתי לב שסיימת את המודול על ${moduleName} — איזה יופי! אני קפטן שארק, ואם יש משהו שנשאר לא ברור, אני כאן בשבילך 💜`,
    robot: `אהלן! סיימת את ${moduleName} — יופי! אני קפטן שארק, מוכן לענות על שאלות בנושא או בכל תחום פיננסי אחר.`,
  };

  return greetings[companionId];
}
