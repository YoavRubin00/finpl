// src/features/shark-voice-chat/moduleComprehension.ts
//
// Per-module comprehension scripts for the live Captain Shark voice check.
// At the end of a module, Captain Shark runs a ~1-minute spoken check: he asks
// 2-3 grounded comprehension questions, listens to the user's spoken answers,
// and (after the call) an AI grader produces an understanding report.
//
// The questions here are injected into the ElevenLabs Conversational AI agent
// at session start via `Conversation.startSession({ overrides, dynamicVariables })`
// — see buildComprehensionOverride(). They are grounded in what each module's
// flashcards actually teach (verified against chapter*Data.ts), so the check
// tests the real material, never invented facts.

export interface ModuleComprehension {
  moduleId: string;
  titleHe: string;
  /** The key concepts the module teaches — the grading rubric + agent context. */
  conceptsHe: string[];
  /** 2-3 spoken, open comprehension questions Captain Shark asks, in order. */
  questionsHe: string[];
  /** What a solid answer demonstrates — the rubric the report grades against. */
  keyPointsHe: string[];
}

// Keyed by moduleId. Authored batch 1: opening modules. Pro users get the check
// on any module — modules without a curated entry fall back to a generic check
// built from the module title (see buildComprehensionForModule).
export const MODULE_COMPREHENSION: Record<string, ModuleComprehension> = {
  // Free-trial module (2nd in the learning order). Money basics.
  'mod-0-2': {
    moduleId: 'mod-0-2',
    titleHe: 'מה זה בכלל כסף?',
    conceptsHe: [
      'הכסף הומצא כדי לפתור את בעיית סחר החליפין (הקושי למצוא מישהו שגם רוצה את מה שיש לך וגם מציע את מה שאתה צריך)',
      'לכסף מודרני אין ערך פנימי — ערכו נשען על אמון ועל גיבוי המדינה (כסף פיאט)',
      'תפקידי הכסף: אמצעי חליפין, שמירת ערך, ויחידת מידה',
    ],
    questionsHe: [
      'אם היינו חוזרים לעולם בלי כסף, ורצית להחליף משהו עם מישהו — איזו בעיה גדולה היית פוגש?',
      'ולמה בעצם לשטר של מאה שקל יש ערך, אם הוא בסך הכל פיסת נייר?',
    ],
    keyPointsHe: [
      'מבין שבסחר חליפין צריך "צירוף מקרים" של רצונות הדדיים, ולכן הוא מסורבל',
      'מבין שערך הכסף המודרני (פיאט) נובע מאמון ומגיבוי המדינה, לא מחומר שממנו הוא עשוי',
    ],
  },
  'mod-0-1': {
    moduleId: 'mod-0-1',
    titleHe: 'מושגי יסוד פיננסיים',
    conceptsHe: [
      'ריבית = המחיר של כסף לאורך זמן (מה שגובים או משלמים על הלוואה)',
      'חשבון עובר ושב (עו"ש) הוא חשבון לשימוש יומי, לעומת חשבון חיסכון לצבירה',
      'מסגרת אשראי (מינוס) היא הלוואה יקרה מהבנק',
    ],
    questionsHe: [
      'במילים שלך — מה זה ריבית? מה היא בעצם מתמחרת?',
      'מה ההבדל בין הכסף שיושב בעו"ש לבין כסף בחשבון חיסכון?',
    ],
    keyPointsHe: [
      'מבין שריבית היא העלות של שימוש בכסף לאורך זמן',
      'מבחין בין עו"ש (תפעול יומי) לחיסכון (צבירה)',
    ],
  },
  'mod-0-4': {
    moduleId: 'mod-0-4',
    titleHe: 'כמה נכנס וכמה יוצא',
    conceptsHe: [
      'רווח אישי = הכנסות פחות הוצאות (דלתא חיובית = חיסכון, שלילית = גירעון)',
      '"צרכים" הם הוצאות חובה (דיור, חשמל, אוכל), "רצונות" אפשר לקצץ',
      'תזרים חיובי הוא התנאי לפני שמשקיעים',
    ],
    questionsHe: [
      'איך אתה יודע אם החודש הזה היה "בפלוס" או "במינוס"?',
      'תן לי דוגמה אחת ל"צורך" ואחת ל"רצון" מהחיים שלך.',
    ],
    keyPointsHe: [
      'מבין שהדלתא היא הכנסות פחות הוצאות',
      'מבחין נכון בין צורך (חובה) לרצון (ניתן לקיצוץ)',
    ],
  },
  'mod-1-1': {
    moduleId: 'mod-1-1',
    titleHe: 'ריבית דריבית',
    conceptsHe: [
      'ריבית דריבית = צבירת תשואה על הקרן וגם על הרווחים שנצברו',
      'הזמן הוא הגורם החזק ביותר — הצמיחה מאיצה עם השנים',
      'כלל ה-72: 72 חלקי הריבית = שנים להכפלת ההון',
    ],
    questionsHe: [
      'מה ההבדל בין ריבית רגילה לריבית דריבית? על מה בדיוק נצברת התשואה?',
      'אם יש לך 30 שנה להשקעה, מה הדבר הכי חשוב שעובד לטובתך?',
    ],
    keyPointsHe: [
      'מבין שבריבית דריבית הרווחים עצמם מתחילים לייצר רווח',
      'מזהה שהזמן (הטווח הארוך) הוא המנוף המרכזי',
    ],
  },
};

export function getModuleComprehension(moduleId: string): ModuleComprehension | undefined {
  return MODULE_COMPREHENSION[moduleId];
}

/**
 * For Pro users on a module without a curated script, fall back to a generic
 * check built from the module title. Captain Shark improvises 2-3 questions
 * about the module's topic (the agent already holds the curriculum context).
 */
export function buildComprehensionForModule(
  moduleId: string,
  titleHe: string,
): ModuleComprehension {
  return (
    getModuleComprehension(moduleId) ?? {
      moduleId,
      titleHe,
      conceptsHe: [`המושגים המרכזיים של "${titleHe}"`],
      questionsHe: [
        `בוא נראה מה קלטת מ"${titleHe}". מה הדבר המרכזי שלמדת עכשיו?`,
        'תן לי דוגמה מהחיים שבה זה רלוונטי.',
      ],
      keyPointsHe: [
        `מזהה את הרעיון המרכזי של "${titleHe}"`,
        'מקשר את החומר למצב אמיתי',
      ],
    }
  );
}

/**
 * The persona + comprehension-mode instructions, sent to the ElevenLabs agent
 * as a full prompt override so the check works regardless of the agent's stored
 * config. Mirrors the spoken-Hebrew constraints of app/api/ai/_prompts/
 * sharkVoicePrompt.ts (kept client-side so startSession can inject it).
 */
function buildComprehensionPrompt(m: ModuleComprehension, userName: string): string {
  const who = userName?.trim() ? userName.trim() : '';
  const questions = m.questionsHe.map((q, i) => `${i + 1}. ${q}`).join('\n');
  return `אתה "קפטן שארק" — שארק חכם, חם ושובב מאפליקציית FinPlay לבני דור Z בישראל.
אתה מנהל שיחת קול חיה וקצרה (כ-45 שניות) של בדיקת-הבנה אחרי שהמשתמש${who ? ` (${who})` : ''} סיים את המודולה "${m.titleHe}".

## המטרה שלך בשיחה הזו
- לוודא בעדינות שהמשתמש הבין את החומר — לא מבחן, אלא שיחה חברית.
- לשאול את שאלות-ההבנה הבאות, אחת-אחת, לפי הסדר. אחרי כל תשובה: תגובה קצרה (משפט), ואם צריך — רמז קטן, ואז השאלה הבאה.
- אם תשובה חלקית, עודד והשלם בעצמך במשפט. אם מצוינת — שבח קצר ותמשיך.

## שאלות-ההבנה (שאל בקול, בניסוח טבעי, לא להקריא מספרים):
${questions}

## המושגים שהמודולה לימדה (לעיגון התגובות שלך):
${m.conceptsHe.map((c) => `- ${c}`).join('\n')}

## כללי דיבור (חשוב מאוד)
- עברית בלבד, גוף שני יחיד. מקסימום 2-3 משפטים קצרים בכל תגובה.
- בלי markdown, בלי רשימות, בלי אימוג'ים (ה-TTS קורא אותם בקול).
- אל תציג עצמך כיועץ מוסמך — זה לידע כללי.
- אל תסיים את השיחה בפתאומיות. אחרי השאלה האחרונה: סכם במשפט אחד חם ("יפה, אתה בכיוון", או "שווה לחזור על X"), הזכר שתכף יוצג סיכום קצר, וסיים תמיד במשפט פרידה: "נתראה במודולה הבאה!".
- אם המשתמש עדיין באמצע תשובה — אל תקטע אותו, תן לו לסיים לפני שאתה חותם.

## פתיחה
"${m.titleHe} — כל הכבוד שסיימת! בוא נוודא ביחד שהכל יושב. ${m.questionsHe[0]}"`;
}

export interface ComprehensionOverride {
  overrides: {
    agent: {
      prompt: { prompt: string };
      firstMessage: string;
      language: string;
    };
  };
  dynamicVariables: Record<string, string>;
}

/**
 * Build the ElevenLabs `startSession` overrides for a module comprehension
 * check. Pass the result's `overrides` + `dynamicVariables` straight into
 * `Conversation.startSession({ signedUrl, ...override })`.
 */
export function buildComprehensionOverride(
  m: ModuleComprehension,
  userName: string,
): ComprehensionOverride {
  const firstMessage = `${m.titleHe} — כל הכבוד שסיימת! בוא נוודא ביחד שהכל יושב. ${m.questionsHe[0]}`;
  return {
    overrides: {
      agent: {
        prompt: { prompt: buildComprehensionPrompt(m, userName) },
        firstMessage,
        language: 'he',
      },
    },
    dynamicVariables: {
      module_id: m.moduleId,
      module_title: m.titleHe,
      user_name: userName?.trim() ?? '',
    },
  };
}
