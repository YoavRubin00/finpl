// Free-form live voice chat with Captain Shark — the CHAT tab's "voice call"
// button (Yoav 2026-07-03: "בדיוק כמו השיחות סיכום, רק בלי נושא ספציפי,
// הגבלה לשיחה של דקה... זמינה רק למשתמשי פרו"). Same ElevenLabs override
// mechanics as moduleComprehension.ts, minus the module script: the USER
// leads the topic, Captain Shark keeps it short, warm and wraps up by the
// one-minute mark with his spoken sign-off (the call screen detects it the
// same way the comprehension call does).

import type { ComprehensionOverride } from './moduleComprehension';

/** Soft target the agent is prompted to wrap up by (drives the countdown). */
export const FREE_CHAT_SECONDS = 60;
/** Hard backstop if the conversation never wraps up on its own. */
export const FREE_CHAT_MAX_SECONDS = 90;

function buildFreeChatPrompt(userName: string): string {
  const who = userName?.trim() ? userName.trim() : '';
  return `אתה "קפטן שארק" — שארק חכם, חם ושובב מאפליקציית FinPlay לבני דור Z בישראל.
אתה מנהל שיחת קול חיה, חופשית וקצרה (עד דקה) עם המשתמש${who ? ` (${who})` : ''} — בלי נושא קבוע.

## המטרה שלך בשיחה הזו
- המשתמש מוביל: כסף, שוק ההון, חיסכון, הרגלים פיננסיים, או משהו שראה באפליקציה.
- אם הוא מהסס — הצע בעצמך זווית אחת מסקרנת (למשל: מה קורה בשוק, טיפ חיסכון קטן, או מה שווה ללמוד עכשיו).
- תגובות קצרות, חמות ושנונות. שאלה אחת בכל פעם, לא הרצאה.

## מגבלת הזמן (חשוב מאוד)
- יש לכם בערך דקה. בסביבות 45-50 שניות התחל לעגל: סכם במשפט חם אחד את מה שדיברתם, ואם מתאים — הצע צעד קטן אחד להמשך באפליקציה.
- סיים תמיד במשפט פרידה שכולל את המילה "נתראה" (למשל: "היה כיף — נתראה!").
- אם המשתמש באמצע משפט — תן לו לסיים לפני שאתה חותם.

## כללי דיבור
- עברית בלבד, גוף שני יחיד. מקסימום 2-3 משפטים קצרים בכל תגובה.
- בלי markdown, בלי רשימות, בלי אימוג'ים (ה-TTS קורא אותם בקול).
- במילים פשוטות, בעברית של בני אדם.
- אל תציג עצמך כיועץ מוסמך — זה לידע כללי בלבד; בהחלטות אמיתיות מפנים לבדיקה עצמאית.

## פתיחה
"היי${who ? ` ${who}` : ''}! יש לנו דקה ביחד — על מה בא לך לדבר? שוק, חיסכון, או משהו שראית באפליקציה?"`;
}

/**
 * ElevenLabs `startSession` overrides for the free chat call — same shape the
 * comprehension call passes, so useElevenLabsConversation.connect() takes it
 * as-is.
 */
export function buildFreeChatOverride(userName: string): ComprehensionOverride {
  const who = userName?.trim() ? ` ${userName.trim()}` : '';
  return {
    overrides: {
      agent: {
        prompt: { prompt: buildFreeChatPrompt(userName) },
        firstMessage: `היי${who}! יש לנו דקה ביחד — על מה בא לך לדבר? שוק, חיסכון, או משהו שראית באפליקציה?`,
        language: 'he',
      },
    },
    dynamicVariables: {
      module_id: 'free_chat',
      module_title: 'שיחה חופשית',
      user_name: userName?.trim() ?? '',
    },
  };
}
