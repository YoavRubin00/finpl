import type { InteractiveRecallSet } from "./sentenceTypes";

// Content for Interactive Recall. Keyed by moduleId, only modules in the
// MODULES_WITH_INTERACTIVE_RECALL opt-in set (see LessonFlowScreen) are read.
// Each set aims for ~4 prompts mixing fill-blank and timeline-order.

export const recallExerciseSets: Record<string, InteractiveRecallSet> = {
  "mod-1-1": {
    moduleId: "mod-1-1",
    title: "בואו נתרגל!",
    intro: "4 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-1-1-fb-1",
        template: "ריבית דריבית היא צבירת תשואה על הקרן וגם על ה-\n{{w}} שנצברו בעבר.",
        difficulty: "easy",
        slots: [
          {
            slotId: "w",
            correctChoiceId: "profits",
            explanation: "בדיוק, הרווחים שנצברו בתקופות הקודמות הופכים לחלק מהקרן החדשה.",
          },
        ],
        choices: [
          { id: "profits", text: "רווחים" },
          { id: "expenses", text: "הוצאות" },
          { id: "taxes", text: "מיסים" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "אלופים!"],
          empathicFirst: "קרוב, חשבו מה צובר ריבית מעבר לקרן עצמה.",
          hintAfterTwoWrongs: "רמז: זה משהו חיובי שההשקעה מייצרת לאורך הזמן.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-1-1-to-1",
        instruction: "סדר את שנות החיסכון לפי גודל הצבירה (₪1,000 בריבית שנתית 7%)",
        difficulty: "medium",
        items: [
          { id: "y1",  label: "1,070 ₪",  yearNumber: "1",  correctOrder: 0 },
          { id: "y5",  label: "1,403 ₪",  yearNumber: "5",  correctOrder: 1 },
          { id: "y10", label: "1,967 ₪",  yearNumber: "10", correctOrder: 2 },
          { id: "y20", label: "3,870 ₪",  yearNumber: "20", correctOrder: 3 },
        ],
        finn: {
          correct: ["יפהפה!", "הבנתם את הקסם!", "זו הצמיחה האקספוננציאלית."],
          empathicFirst: "כמעט, זכרו שהזמן הוא המעריך, והצמיחה מאיצה עם השנים.",
          hintAfterTwoWrongs: "רמז: הפער בין שנה 10 ל-20 גדול בהרבה מהפער בין שנה 1 ל-5.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-1-1-fb-2",
        template: "לפי כלל ה-72, אם הריבית השנתית 8%, ההון יכפיל את עצמו כל {{y}} שנים.",
        difficulty: "medium",
        slots: [
          {
            slotId: "y",
            correctChoiceId: "nine",
            explanation: "72 לחלק ב-8 = 9. בכל 9 שנים הכסף מכפיל את עצמו.",
          },
        ],
        choices: [
          { id: "nine", text: "9" },
          { id: "eighteen", text: "18" },
          { id: "six", text: "6" },
          { id: "twelve", text: "12" },
        ],
        finn: {
          correct: ["חישבתם כמו פרו!", "מדויק!", "זה הטריק של הקוסמים הפיננסיים."],
          empathicFirst: "נסו לחלק 72 בשיעור הריבית השנתי.",
          hintAfterTwoWrongs: "רמז: 72 חלקי 8 = ?",
        },
      },
    ],
  },
};

export function getRecallSet(moduleId: string): InteractiveRecallSet | undefined {
  return recallExerciseSets[moduleId];
}