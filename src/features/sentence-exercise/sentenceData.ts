import type { InteractiveRecallSet } from "./sentenceTypes";

// Content for Interactive Recall. Keyed by moduleId, only modules in the
// MODULES_WITH_INTERACTIVE_RECALL opt-in set (see LessonFlowScreen) are read.
// Each set aims for ~4 prompts mixing fill-blank and timeline-order.

export const recallExerciseSets: Record<string, InteractiveRecallSet> = {
  // 2026-05-30 chapter-0 swap: "מושגי יסוד פיננסיים" moved to mod-0-1.
  // The recall prompts below (interest / overdraft / current-account /
  // loan) are explicitly Financial Basics, so the set key + moduleId both
  // shift to mod-0-1 to follow the content.
  "mod-0-1": {
    moduleId: "mod-0-1",
    title: "בואו נתרגל!",
    // ים 2026-07-02: the set has 2 prompts (the copy said "3"), and in mod-0-1
    // recall now sits AFTER the chest+quiz — so no "לפני הקוויז".
    intro: "2 תרגילים מהירים לחיזוק. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-1-fb-1",
        template: "ריבית היא המחיר של {{w}} — הסכום שהבנק גובה או משלם על כסף לאורך זמן.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "loan", explanation: "בדיוק, ריבית היא העלות של שימוש בכסף של מישהו אחר, או התמורה על הלוואת הכסף שלך לבנק." },
        ],
        choices: [
          { id: "loan", text: "הלוואה" },
          { id: "ammala", text: "עמלה" },
          { id: "mas", text: "מס" },
          { id: "bituach", text: "ביטוח" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנת את הבסיס!"],
          empathicFirst: "כמעט, חשבו על התמורה שמקבלים בעד מתן כסף לזמן מוגבל.",
          hintAfterTwoWrongs: "רמז: זה משהו שאתם לוקחים מהבנק כשאין לכם מספיק כסף להוצאה גדולה.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-0-1-fb-2",
        template: "חשבון עובר ושב (עו\"ש) הוא חשבון ל{{w}} יומי, בניגוד לחשבון חיסכון שנועד לצבירה.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "shimush", explanation: "נכון, העו\"ש הוא חשבון התפעול — ממנו משלמים, מושכים ומקבלים משכורת." },
        ],
        choices: [
          { id: "shimush", text: "שימוש" },
          { id: "hashkaa", text: "השקעה" },
          { id: "hiskon", text: "חיסכון" },
          { id: "pensiya", text: "פנסיה" },
        ],
        finn: {
          correct: ["מדויק!", "יפה מאוד!", "הבנתם את ההבדל!"],
          empathicFirst: "קרוב, חשבו לאן נכנסת המשכורת ומאיפה משלמים חשבונות.",
          hintAfterTwoWrongs: "רמז: זה החשבון שבו הכסף נכנס ויוצא מדי יום.",
        },
      },
    ],
  },
  "mod-0-3": {
    moduleId: "mod-0-3",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-3-fb-1",
        template: "אינפלציה היא עלייה כללית ברמת ה{{w}} במשק, מה שמקטין את כוח הקנייה של הכסף.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "mehirim", explanation: "בדיוק, כשהמחירים עולים, באותו שקל קונים פחות — זה 'הגנב השקוף'." },
        ],
        choices: [
          { id: "mehirim", text: "המחירים" },
          { id: "sahar", text: "השכר" },
          { id: "ribit", text: "הריבית" },
          { id: "mas", text: "המס" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "תפסתם את הרעיון!"],
          empathicFirst: "חשבו מה עולה בסופר משנה לשנה.",
          hintAfterTwoWrongs: "רמז: שוקולד שעלה 5 ₪ והיום עולה 6 ₪ — מה השתנה?",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-0-3-fb-2",
        template: "באינפלציה של כ-3% בשנה, 1,000 ₪ היום יהיו שווים בערכם הריאלי בערך {{w}} ₪ בעוד שנה.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "n970", explanation: "נכון, כוח הקנייה נשחק בכ-3%, אז 1,000 ₪ שוקלים כמו 970 ₪ של היום." },
        ],
        choices: [
          { id: "n970", text: "970" },
          { id: "n1030", text: "1,030" },
          { id: "n900", text: "900" },
          { id: "n1000", text: "1,000" },
        ],
        finn: {
          correct: ["מדויק!", "חישוב מעולה!", "אלופים!"],
          empathicFirst: "זכרו, אינפלציה מקטינה את הערך, לא מגדילה.",
          hintAfterTwoWrongs: "רמז: 1,000 פחות 3% = ?",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-0-3-to-1",
        instruction: "סדרו מהפגיע ביותר לפחות פגיע מאינפלציה",
        difficulty: "medium",
        items: [
          { id: "cash", label: "מזומן מתחת לבלטה", correctOrder: 0 },
          { id: "oksh", label: "עו\"ש ללא ריבית", correctOrder: 1 },
          { id: "fixed", label: "פיקדון בריבית קבועה 2%", correctOrder: 2 },
          { id: "stocks", label: "תיק מניות מפוזר", correctOrder: 3 },
        ],
        finn: {
          correct: ["מעולה!", "הבנתם את ההיררכיה!", "בדיוק!"],
          empathicFirst: "חשבו מה מייצר תשואה שמדביקה את האינפלציה.",
          hintAfterTwoWrongs: "רמז: מזומן לא מייצר תשואה כלל, מניות לרוב עולות על האינפלציה לאורך זמן.",
        },
      },
    ],
  },
  "mod-1-2": {
    moduleId: "mod-1-2",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-1-2-fb-1",
        template: "ריבית על מסגרת אשראי (מינוס) בישראל נעה בדרך כלל סביב {{w}} בשנה — יקרה בהרבה מהלוואה רגילה.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p13", explanation: "נכון, מסגרות אשראי בבנקים בישראל גובות בערך 12%-15% בשנה — זו אחת ההלוואות היקרות ביותר." },
        ],
        choices: [
          { id: "p13", text: "12%-15%" },
          { id: "p3", text: "2%-3%" },
          { id: "p30", text: "25%-30%" },
          { id: "p7", text: "6%-8%" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "זוכרים למה המינוס יקר!"],
          empathicFirst: "חשבו, המינוס יקר מהלוואה אבל לא כמו חוב בכרטיס אשראי חו\"ל.",
          hintAfterTwoWrongs: "רמז: בישראל הטווח הטיפוסי הוא בין 12 ל-15 אחוז.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-1-2-fb-2",
        template: "ריבית המינוס נצברת מדי {{w}}, מה שגורם לחוב לצמוח מהר גם ללא הוצאות נוספות.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "yom", explanation: "נכון, הריבית מחושבת על היתרה השלילית מדי יום ומתווספת לחוב." },
        ],
        choices: [
          { id: "yom", text: "יום" },
          { id: "shana", text: "שנה" },
          { id: "shavua", text: "שבוע" },
          { id: "asor", text: "עשור" },
        ],
        finn: {
          correct: ["בדיוק!", "מצוין!", "הבנתם למה זה מסוכן!"],
          empathicFirst: "חשבו כמה מהר המינוס 'נושם' — זה לא פעם בחודש.",
          hintAfterTwoWrongs: "רמז: הבנק סוגר יתרה מדי סוף יום עסקים.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-1-2-to-1",
        instruction: "סדרו את אפיקי המימון מהזול ליקר ביותר",
        difficulty: "medium",
        items: [
          { id: "mashkanta", label: "משכנתא", correctOrder: 0 },
          { id: "halvaa", label: "הלוואה אישית בבנק", correctOrder: 1 },
          { id: "minus", label: "מסגרת מינוס", correctOrder: 2 },
          { id: "ashrai", label: "חוב בכרטיס אשראי חו\"ל", correctOrder: 3 },
        ],
        finn: {
          correct: ["מדויק!", "הבנתם את הסדר!", "אלופים!"],
          empathicFirst: "חשבו מה מובטח בנכס ומה חשוף לגמרי.",
          hintAfterTwoWrongs: "רמז: כשיש בטוחה (דירה) הריבית נמוכה, כשאין — היא גבוהה.",
        },
      },
    ],
  },
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
  "mod-2-10": {
    moduleId: "mod-2-10",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-2-10-fb-1",
        template: "בישראל, דירוג האשראי של BDI נע בסקאלה שבין {{w}} — וככל שהמספר גבוה יותר, הדירוג טוב יותר.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "r200", explanation: "נכון, דירוג BDI בישראל נע בין 200 ל-1000, ו-1000 הוא הדירוג המושלם." },
        ],
        choices: [
          { id: "r200", text: "200 ל-1000" },
          { id: "r300", text: "300 ל-850" },
          { id: "r0", text: "0 ל-100" },
          { id: "r1", text: "1 ל-10" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "זוכרים את הסקאלה!"],
          empathicFirst: "הסקאלה האמריקאית שונה משלנו — חשבו על BDI הישראלי.",
          hintAfterTwoWrongs: "רמז: הגבול העליון הוא מספר עגול של אלף.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-2-10-fb-2",
        template: "הגורם המשפיע ביותר לרעה על דירוג האשראי הוא {{w}} בהחזרי חובות.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "pigur", explanation: "בדיוק, פיגורים בתשלומים הם הדגל האדום המרכזי בדוח BDI." },
        ],
        choices: [
          { id: "pigur", text: "פיגורים" },
          { id: "hafkadot", text: "הפקדות קבועות" },
          { id: "meshichot", text: "משיכות מזומן" },
          { id: "gimla", text: "תשלומי גמלאות" },
        ],
        finn: {
          correct: ["בדיוק!", "מצוין!", "זוכרים מה פוגע!"],
          empathicFirst: "חשבו מה גורם לבנק להסס לתת הלוואה.",
          hintAfterTwoWrongs: "רמז: זה קורה כשלא משלמים בזמן.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-2-10-to-1",
        instruction: "סדרו את הדירוגים מהחלש לחזק ביותר (סקאלת BDI)",
        difficulty: "easy",
        items: [
          { id: "b300", label: "320 — דירוג נמוך", correctOrder: 0 },
          { id: "b500", label: "550 — דירוג בינוני", correctOrder: 1 },
          { id: "b750", label: "780 — דירוג טוב", correctOrder: 2 },
          { id: "b950", label: "960 — דירוג מצוין", correctOrder: 3 },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "אלופים!"],
          empathicFirst: "זכרו, גבוה יותר = טוב יותר בסקאלה של BDI.",
          hintAfterTwoWrongs: "רמז: סדרו מהמספר הקטן לגדול.",
        },
      },
    ],
  },
  "mod-2-11": {
    moduleId: "mod-2-11",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-2-11-fb-1",
        template: "שווי נקודת זיכוי אחת במס הכנסה בישראל הוא כ-{{w}} ₪ בשנה (2026).",
        difficulty: "medium",
        slots: [
          // Updated 2026-05-26 from rashut-hamisim — Israeli tax credit point
          // value 2026 = 242₪/month × 12 = 2,904₪/year (frozen 2025-2027).
          { slotId: "w", correctChoiceId: "n2904", explanation: "נכון, נקודת זיכוי שווה כ-₪2,904 בשנה (כ-242 ₪ בחודש) ומפחיתה ישירות את המס." },
        ],
        choices: [
          { id: "n2904", text: "2,904" },
          { id: "n242", text: "242" },
          { id: "n500", text: "500" },
          { id: "n10000", text: "10,000" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "זוכרים את השווי!"],
          empathicFirst: "שימו לב אם המספר שנתי או חודשי.",
          hintAfterTwoWrongs: "רמז: 242 זה השווי החודשי — כפול 12 זה השנתי.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-2-11-fb-2",
        template: "נקודת זיכוי {{w}} את חבות המס עצמה, ולא רק את ההכנסה החייבת במס.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "mafhita", explanation: "נכון, נקודת זיכוי מורידה ישירות מסכום המס שאתם צריכים לשלם — הטבה רבת עוצמה." },
        ],
        choices: [
          { id: "mafhita", text: "מפחיתה" },
          { id: "magdila", text: "מגדילה" },
          { id: "mavtala", text: "מבטלת לחלוטין" },
          { id: "mechapelet", text: "מכפילה" },
        ],
        finn: {
          correct: ["בדיוק!", "מצוין!", "הבנתם את הכוח!"],
          empathicFirst: "חשבו על הכיוון — האם נקודת זיכוי עוזרת או פוגעת?",
          hintAfterTwoWrongs: "רמז: זיכוי = פחות מס לשלם.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-2-11-to-1",
        instruction: "סדרו את מדרגות המס השוליות בישראל מהנמוכה לגבוהה ביותר",
        difficulty: "medium",
        items: [
          { id: "t10", label: "10% — הכנסה נמוכה", correctOrder: 0 },
          { id: "t20", label: "20% — מדרגה ביניים", correctOrder: 1 },
          { id: "t35", label: "35% — מדרגה גבוהה", correctOrder: 2 },
          { id: "t50", label: "50% — המדרגה העליונה", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "מדויק!", "זוכרים את הסולם!"],
          empathicFirst: "זכרו, במס שולי כל שקל נוסף ממוסה במדרגה הגבוהה יותר.",
          hintAfterTwoWrongs: "רמז: פשוט סדרו את האחוזים מהנמוך לגבוה.",
        },
      },
    ],
  },
  "mod-3-15": {
    moduleId: "mod-3-15",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-3-15-fb-1",
        template: "ריבית ריאלית = ריבית נומינלית פחות שיעור ה{{w}}.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "inflatzia", explanation: "נכון, הריאלית היא התשואה האמיתית אחרי שמנטרלים את שחיקת הכסף מהאינפלציה." },
        ],
        choices: [
          { id: "inflatzia", text: "האינפלציה" },
          { id: "mas", text: "המס" },
          { id: "amla", text: "העמלה" },
          { id: "tsmiha", text: "הצמיחה" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "נוסחה חשובה!"],
          empathicFirst: "חשבו מה שוחק את הכסף שלכם גם כשהוא מרוויח ריבית.",
          hintAfterTwoWrongs: "רמז: אותו 'גנב שקוף' שלמדנו עליו בפרק 0.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-3-15-fb-2",
        template: "אם פיקדון מניב 5% בשנה והאינפלציה 3%, התשואה הריאלית היא בערך {{w}}.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p2", explanation: "נכון, 5% פחות 3% = 2% — זו התוספת האמיתית לכוח הקנייה שלכם." },
        ],
        choices: [
          { id: "p2", text: "2%" },
          { id: "p8", text: "8%" },
          { id: "p5", text: "5%" },
          { id: "p0", text: "0%" },
        ],
        finn: {
          correct: ["בדיוק!", "חישוב מעולה!", "אלופים!"],
          empathicFirst: "פשוט חסרו את האינפלציה מהריבית הנומינלית.",
          hintAfterTwoWrongs: "רמז: 5 פחות 3 = ?",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-3-15-to-1",
        instruction: "סדרו מהתשואה הריאלית הגבוהה ביותר לנמוכה ביותר (בהנחת אינפלציה 3%)",
        difficulty: "hard",
        items: [
          { id: "i8", label: "פיקדון נומינלי 8%", correctOrder: 0 },
          { id: "i5", label: "פיקדון נומינלי 5%", correctOrder: 1 },
          { id: "i3", label: "פיקדון נומינלי 3%", correctOrder: 2 },
          { id: "i1", label: "פיקדון נומינלי 1%", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את הנוסחה!", "בדיוק!"],
          empathicFirst: "כל הריביות ממוסות באותה אינפלציה — מי נותן הכי הרבה מעליה?",
          hintAfterTwoWrongs: "רמז: האינפלציה קבועה, אז פשוט מה הנומינלי הגבוה ביותר.",
        },
      },
    ],
  },
  "mod-4-19": {
    moduleId: "mod-4-19",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-4-19-fb-1",
        template: "כשקונים מניה, קונים {{w}} קטן בחברה — עם זכות לחלק מהרווחים ומהצמיחה שלה.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "helek", explanation: "נכון, מניה = חלק בבעלות על החברה, ולכן מחזיקי מניות מרוויחים מהצלחתה." },
        ],
        choices: [
          { id: "helek", text: "חלק בבעלות" },
          { id: "halvaa", text: "הלוואה לחברה" },
          { id: "mutsar", text: "מוצר של החברה" },
          { id: "bituach", text: "ביטוח כנגד הפסד" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנתם את ההבדל!"],
          empathicFirst: "חשבו מה בדיוק מקבלים כשקונים מניה — זה לא הלוואה.",
          hintAfterTwoWrongs: "רמז: אגרת חוב זו הלוואה, מניה היא משהו אחר.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-4-19-fb-2",
        template: "התשואה השנתית הממוצעת ההיסטורית של מדד S&P 500 עומדת על כ-{{w}} בשנה (לפני אינפלציה).",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p10", explanation: "נכון, ה-S&P 500 הניב בממוצע כ-10% בשנה לאורך עשרות שנים — עם תנודתיות גבוהה בדרך." },
        ],
        choices: [
          { id: "p10", text: "10%" },
          { id: "p3", text: "3%" },
          { id: "p25", text: "25%" },
          { id: "p50", text: "50%" },
        ],
        finn: {
          correct: ["מדויק!", "זוכרים את המספר!", "אלופים!"],
          empathicFirst: "חשבו על ממוצע ארוך טווח, לא על שנה בודדת.",
          hintAfterTwoWrongs: "רמז: מספר עגול בסביבות 10.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-4-19-to-1",
        instruction: "סדרו את אפיקי ההשקעה מהפחות תנודתי לתנודתי ביותר",
        difficulty: "medium",
        items: [
          { id: "pikad", label: "פיקדון בנקאי", correctOrder: 0 },
          { id: "agahot", label: "אגרות חוב ממשלתיות", correctOrder: 1 },
          { id: "metzion", label: "מדד מניות מפוזר", correctOrder: 2 },
          { id: "bodeded", label: "מניה בודדת בחברת צמיחה", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את סולם הסיכון!", "בדיוק!"],
          empathicFirst: "חשבו מה מובטח ומה תלוי בשוק.",
          hintAfterTwoWrongs: "רמז: ככל שהתשואה הפוטנציאלית גבוהה יותר — גם התנודתיות.",
        },
      },
    ],
  },
  "mod-4-20": {
    moduleId: "mod-4-20",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-4-20-fb-1",
        template: "ETF הוא קרן סל שעוקבת אחרי {{w}} ומאפשרת לקנות פיזור רחב בעסקה אחת.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "madad", explanation: "נכון, ה-ETF מחקה מדד (כמו ת\"א 125 או S&P 500) ומעניק חשיפה למאות חברות בבת אחת." },
        ],
        choices: [
          { id: "madad", text: "מדד" },
          { id: "mania", text: "מניה בודדת" },
          { id: "dolar", text: "שער הדולר" },
          { id: "zahav", text: "מחיר הזהב בלבד" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנתם את הרעיון!"],
          empathicFirst: "זכרו, ETF הוא סל — לא השקעה בנכס בודד.",
          hintAfterTwoWrongs: "רמז: זה המושג שראינו בפרק הקודם — ת\"א 125 למשל.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-4-20-fb-2",
        template: "דמי הניהול הממוצעים ב-ETF מחקה מדד הם בדרך כלל {{w}} בשנה — נמוכים בהרבה מקרנות מנוהלות אקטיבית.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "low", explanation: "נכון, ETFs של ספקים כמו Vanguard ו-Blackrock גובים בין 0.03% ל-0.5% בשנה — זול משמעותית מקרנות אקטיביות." },
        ],
        choices: [
          { id: "low", text: "0.03%-0.5%" },
          { id: "mid", text: "2%-3%" },
          { id: "high", text: "5%-10%" },
          { id: "zero", text: "ללא דמי ניהול כלל" },
        ],
        finn: {
          correct: ["מדויק!", "אלופים!", "זוכרים את היתרון!"],
          empathicFirst: "חשבו למה ETFs נחשבים זולים במיוחד.",
          hintAfterTwoWrongs: "רמז: מדובר באחוזים קטנים מאוד — עשיריות או מאיות.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-4-20-to-1",
        instruction: "סדרו את רמת הפיזור מהנמוכה לגבוהה ביותר",
        difficulty: "medium",
        items: [
          { id: "single", label: "מניה בודדת", correctOrder: 0 },
          { id: "sector", label: "ETF סקטוריאלי (בנקים)", correctOrder: 1 },
          { id: "country", label: "ETF של ת\"א 125", correctOrder: 2 },
          { id: "global", label: "ETF של מדד עולמי MSCI World", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "בדיוק!", "הבנתם את הפיזור!"],
          empathicFirst: "חשבו כמה חברות ובאילו שווקים יש בכל מוצר.",
          hintAfterTwoWrongs: "רמז: ככל שה-ETF מכסה יותר מדינות וסקטורים, הפיזור גדול יותר.",
        },
      },
    ],
  },
  "mod-5-25": {
    moduleId: "mod-5-25",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-5-25-fb-1",
        template: "לפי 'כלל 4%', כדי לפרוש צריך לצבור הון בגודל של כ-{{w}} מההוצאות השנתיות שלכם.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "x25", explanation: "נכון, 25 כפול ההוצאה השנתית = הון שמאפשר משיכה של 4% בשנה ללא שחיקה משמעותית של הקרן." },
        ],
        choices: [
          { id: "x25", text: "פי 25" },
          { id: "x10", text: "פי 10" },
          { id: "x100", text: "פי 100" },
          { id: "x4", text: "פי 4" },
        ],
        finn: {
          correct: ["מדויק!", "אלופים!", "הבנתם את הכלל!"],
          empathicFirst: "חשבו: אם מושכים 4% בשנה, בכמה שנים הקרן מתכסה?",
          hintAfterTwoWrongs: "רמז: 100 חלקי 4 = ?",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-5-25-fb-2",
        template: "שיעור החיסכון (Savings Rate) הוא המרכיב ה{{w}} ביותר למהירות ההגעה לעצמאות כלכלית.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "crit", explanation: "נכון, הזמן לעצמאות כלכלית תלוי הרבה יותר באחוז שחוסכים מאשר בגובה המשכורת או בתשואה בודדת." },
        ],
        choices: [
          { id: "crit", text: "הקריטי" },
          { id: "shuli", text: "השולי" },
          { id: "lo_relev", text: "הלא רלוונטי" },
          { id: "muhlat", text: "המוחלט" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "זה הלב של FIRE!"],
          empathicFirst: "חשבו מה משפיע יותר: להרוויח עוד 10% או לחסוך עוד 10%?",
          hintAfterTwoWrongs: "רמז: אם חוסכים 50% אפשר לפרוש בכ-17 שנה — זה השפעה דרמטית.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-5-25-to-1",
        instruction: "סדרו את שיעורי החיסכון מהמסלול הארוך ביותר ל-FIRE לקצר ביותר",
        difficulty: "hard",
        items: [
          { id: "s10", label: "חיסכון 10% — פרישה בכ-51 שנים", correctOrder: 0 },
          { id: "s25", label: "חיסכון 25% — פרישה בכ-32 שנים", correctOrder: 1 },
          { id: "s50", label: "חיסכון 50% — פרישה בכ-17 שנים", correctOrder: 2 },
          { id: "s70", label: "חיסכון 70% — פרישה בכ-8.5 שנים", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את הכוח!", "מדויק!"],
          empathicFirst: "ככל שחוסכים יותר — מגיעים מהר יותר. סדרו לפי זה.",
          hintAfterTwoWrongs: "רמז: 10% איטי ביותר, 70% מהיר ביותר.",
        },
      },
    ],
  },
  "mod-5-26": {
    moduleId: "mod-5-26",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-5-26-fb-1",
        template: "בישראל, משכנתא לדירה ראשונה מוגבלת לרוב ל-{{w}} משווי הנכס (LTV מקסימלי).",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p75", explanation: "נכון, בנק ישראל מגביל LTV לדירה ראשונה עד 75% — כלומר צריך הון עצמי של לפחות 25%." },
        ],
        choices: [
          { id: "p75", text: "75%" },
          { id: "p50", text: "50%" },
          { id: "p100", text: "100%" },
          { id: "p30", text: "30%" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "זוכרים את התקרה!"],
          empathicFirst: "חשבו כמה הון עצמי צריך להביא כזוג צעיר.",
          hintAfterTwoWrongs: "רמז: הבנק נותן את הרוב, אבל לא יותר משלושה רבעים מהשווי.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-5-26-fb-2",
        template: "בתשלום חודשי של משכנתא בלוח שפיצר, החלק של הריבית {{w}} עם השנים, והחלק של הקרן גדל.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "yored", explanation: "נכון, בלוח שפיצר התשלום קבוע אך הרכבו משתנה: בהתחלה רובו ריבית, ובסוף רובו קרן." },
        ],
        choices: [
          { id: "yored", text: "יורד" },
          { id: "oleh", text: "עולה" },
          { id: "kavua", text: "נשאר קבוע" },
          { id: "mitaafes", text: "מתאפס מיד" },
        ],
        finn: {
          correct: ["בדיוק!", "אלופים!", "הבנתם את שפיצר!"],
          empathicFirst: "חשבו על יתרת החוב — היא קטנה, אז גם הריבית עליה קטנה.",
          hintAfterTwoWrongs: "רמז: בהתחלה החוב גדול, בסוף כמעט אפסי — הריבית הולכת בהתאם.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-5-26-to-1",
        instruction: "סדרו את תשואות השכירות (yield) השנתיות הטיפוסיות מהנמוכה לגבוהה ביותר",
        difficulty: "medium",
        items: [
          { id: "tla", label: "דירת יוקרה במרכז ת\"א — כ-2.5%", correctOrder: 0 },
          { id: "cen", label: "דירה 3 חדרים בערי מרכז — כ-3%", correctOrder: 1 },
          { id: "per", label: "דירה בפריפריה — כ-4.5%", correctOrder: 2 },
          { id: "mis", label: "נכס מסחרי קטן — כ-6%", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "מדויק!", "זוכרים את הטווחים!"],
          empathicFirst: "חשבו על היחס בין שכירות חודשית למחיר הדירה.",
          hintAfterTwoWrongs: "רמז: ככל שהנכס יקר יותר יחסית לשכירות — התשואה נמוכה יותר.",
        },
      },
    ],
  },

  // ===== Batch 1 (2026-06-20): opening modules, chapters 0–1 =====
  // Each set is grounded in the module's own flashcards/quiz content
  // (chapter0Data.ts / chapter1Data.ts). Adding a moduleId here also requires
  // adding it to MODULES_WITH_INTERACTIVE_RECALL in LessonFlowScreen.tsx.
  "mod-0-1b": {
    moduleId: "mod-0-1b",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-1b-fb-1",
        template: "פנסיה היא קופת חיסכון שאליה מופרשים כספים מדי חודש גם מהמשכורת שלכם וגם {{w}}, ומושקעים לטווח ארוך.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "maasik", explanation: "נכון, חלק מההפרשה לפנסיה מגיע מכם וחלק נוסף מהמעסיק — ולכן זו הטבה שלא כדאי לוותר עליה." },
        ],
        choices: [
          { id: "maasik", text: "מהמעסיק" },
          { id: "bituach", text: "מהביטוח הלאומי" },
          { id: "bank", text: "מהבנק" },
          { id: "keren", text: "מקרן החירום" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנתם את הבסיס!"],
          empathicFirst: "חשבו מי עוד מוסיף כסף לפנסיה שלכם מלבדכם.",
          hintAfterTwoWrongs: "רמז: זה מי שמשלם לכם את המשכורת.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-0-1b-fb-2",
        template: "כשמפצלים קנייה ל'תשלומים בקליק', בפועל לוקחים {{w}} — לרוב בריבית גבוהה.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "halvaa", explanation: "בדיוק, פריסה לתשלומים אינה 'חינם' — זו הלוואה שעולה ריבית." },
        ],
        choices: [
          { id: "halvaa", text: "הלוואה" },
          { id: "matana", text: "מתנה" },
          { id: "hanaha", text: "הנחה" },
          { id: "hiskon", text: "חיסכון" },
        ],
        finn: {
          correct: ["מדויק!", "יפה מאוד!", "זוכרים את המלכודת!"],
          empathicFirst: "חשבו מה באמת קורה כשדוחים תשלום לעתיד.",
          hintAfterTwoWrongs: "רמז: זה משהו שלוקחים מהבנק ומחזירים עם תוספת.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-0-1b-to-1",
        instruction: "סדרו את שלבי חיסכון הפנסיה לפי סדר הזמן",
        difficulty: "medium",
        items: [
          { id: "hafrasha", label: "הפרשה חודשית מהמשכורת ומהמעסיק", correctOrder: 0 },
          { id: "tsvira", label: "צבירה והשקעה לאורך עשרות שנים", correctOrder: 1 },
          { id: "prisha", label: "הגעה לגיל פרישה", correctOrder: 2 },
          { id: "kitsba", label: "קבלת קצבה חודשית קבועה", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את התהליך!", "בדיוק!"],
          empathicFirst: "חשבו מה קורה קודם — חוסכים או מקבלים קצבה?",
          hintAfterTwoWrongs: "רמז: קודם מפרישים שנים רבות, ורק בפרישה מקבלים קצבה.",
        },
      },
    ],
  },
  "mod-0-2": {
    moduleId: "mod-0-2",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-2-fb-1",
        template: "לכסף המודרני (שקל, דולר) אין ערך פנימי — ערכו נשען על {{w}} בממשלה ועל כך שכולם מסכימים לקבל אותו.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "emun", explanation: "נכון, כסף כזה נקרא 'פיאט' — ערכו נובע מאמון ומכך שהמדינה מגבה אותו." },
        ],
        choices: [
          { id: "emun", text: "אמון" },
          { id: "zahav", text: "כיסוי בזהב" },
          { id: "neft", text: "מאגרי נפט" },
          { id: "kesef", text: "כסף פיזי בכספת" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנתם מה זה פיאט!"],
          empathicFirst: "חשבו על מה באמת מבוסס הערך של שטר של 100 ₪.",
          hintAfterTwoWrongs: "רמז: זה לא זהב — זה משהו שאנחנו נותנים זה לזה.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-0-2-fb-2",
        template: "הכסף הומצא כדי לפתור את בעיית {{w}} — הקושי למצוא מישהו שגם רוצה את מה שיש לכם וגם מציע את מה שאתם צריכים.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "halifin", explanation: "בדיוק, סחר חליפין דרש 'צירוף מקרים' נדיר — הכסף פתר זאת כאמצעי חליפין אוניברסלי." },
        ],
        choices: [
          { id: "halifin", text: "סחר החליפין" },
          { id: "inflatzia", text: "האינפלציה" },
          { id: "mas", text: "המיסוי" },
          { id: "ribit", text: "הריבית" },
        ],
        finn: {
          correct: ["מדויק!", "יפה מאוד!", "תפסתם את הרעיון!"],
          empathicFirst: "חשבו למה קשה היה להחליף שק תפוחי אדמה בנעליים.",
          hintAfterTwoWrongs: "רמז: זו השיטה הישנה של 'מוצר תמורת מוצר'.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-0-2-to-1",
        instruction: "סדרו לפי סדר הופעתם בהיסטוריה — מהקדום לחדיש",
        difficulty: "medium",
        items: [
          { id: "barter", label: "סחר חליפין — מוצר תמורת מוצר", correctOrder: 0 },
          { id: "coins", label: "מטבעות ממתכת יקרה (זהב/כסף)", correctOrder: 1 },
          { id: "backed", label: "שטרות נייר מגובים בזהב", correctOrder: 2 },
          { id: "fiat", label: "כסף פיאט — מבוסס אמון בלבד", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את ההתפתחות!", "בדיוק!"],
          empathicFirst: "חשבו מה היה קודם — זהב או שטר נייר?",
          hintAfterTwoWrongs: "רמז: סחר חליפין הכי קדום, פיאט (אמון) הכי חדיש.",
        },
      },
    ],
  },
  "mod-0-4": {
    moduleId: "mod-0-4",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-4-fb-1",
        template: "הרווח האישי שלכם הוא מה שנשאר כשמחסירים מההכנסות את {{w}}.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "hotsaot", explanation: "נכון, הכנסות פחות הוצאות = הדלתא. דלתא חיובית היא חיסכון, דלתא שלילית היא גירעון." },
        ],
        choices: [
          { id: "hotsaot", text: "ההוצאות" },
          { id: "hiskon", text: "החיסכון" },
          { id: "mas", text: "המיסים בלבד" },
          { id: "hachnasot", text: "ההכנסות הנוספות" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנתם את הדלתא!"],
          empathicFirst: "חשבו מה צריך לרדת מההכנסות כדי לדעת כמה נשאר.",
          hintAfterTwoWrongs: "רמז: זה כל הכסף שיוצא מכם בחודש.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-0-4-fb-2",
        template: "תשלומים שחייבים לשלם כמו שכר דירה, חשמל ואוכל בסיסי נקראים {{w}}, להבדיל מ'רצונות' שאפשר לקצץ בהם.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "tsrahim", explanation: "בדיוק, צרכים הם הוצאות חובה; רצונות (מסעדות, טיסות) הם הראשונים שאפשר לצמצם." },
        ],
        choices: [
          { id: "tsrahim", text: "צרכים" },
          { id: "retsonot", text: "רצונות" },
          { id: "nechasim", text: "נכסים" },
          { id: "hithayvuyot", text: "התחייבויות" },
        ],
        finn: {
          correct: ["מדויק!", "יפה מאוד!", "זוכרים את ההבדל!"],
          empathicFirst: "חשבו מה אי-אפשר לוותר עליו בחודש הקרוב.",
          hintAfterTwoWrongs: "רמז: דיור, חשמל ואוכל בסיסי הם חובה — לא בחירה.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-0-4-to-1",
        instruction: "סדרו את מסלול הכסף בחודש לפי הסדר ההגיוני",
        difficulty: "medium",
        items: [
          { id: "income", label: "ההכנסה נכנסת לחשבון", correctOrder: 0 },
          { id: "needs", label: "תשלום צרכים חיוניים (דיור, חשמל, אוכל)", correctOrder: 1 },
          { id: "wants", label: "הוצאה על רצונות (אם נשאר)", correctOrder: 2 },
          { id: "delta", label: "הדלתא שנשארת — חיסכון", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את התזרים!", "בדיוק!"],
          empathicFirst: "חשבו מה קורה קודם — נכנס כסף או יוצא כסף?",
          hintAfterTwoWrongs: "רמז: קודם נכנסת ההכנסה, ובסוף רואים מה נשאר.",
        },
      },
    ],
  },
  "mod-0-5": {
    moduleId: "mod-0-5",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-5-fb-1",
        template: "בניגוד לצריכה (קניית מוצר שמאבד ערך), {{w}} היא נטיעת הכסף בנכס שמחזיר תשואה — כמו מניות, ריבית או נדל\"ן.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "hashkaa", explanation: "נכון, השקעה גורמת לכסף 'לעבוד' ולייצר תשואה לאורך זמן." },
        ],
        choices: [
          { id: "hashkaa", text: "השקעה" },
          { id: "hotsaa", text: "הוצאה" },
          { id: "tsricha", text: "צריכה" },
          { id: "halvaa", text: "הלוואה" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "הבנתם את ההבדל!"],
          empathicFirst: "חשבו מה גורם לכסף לגדול במקום להישחק.",
          hintAfterTwoWrongs: "רמז: זה ההפך מצריכה — שמים כסף בנכס שמחזיר תשואה.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-0-5-fb-2",
        template: "לטווח ארוך, הסיכון האמיתי דווקא הוא {{w}} — כי כסף שלא מושקע נשחק מהאינפלציה.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "lo", explanation: "בדיוק, תנודתיות קצרת-טווח חולפת, אבל כסף ששוכב ללא תשואה מאבד מערכו בוודאות." },
        ],
        choices: [
          { id: "lo", text: "לא להשקיע" },
          { id: "maniot", text: "להשקיע במניות" },
          { id: "pizur", text: "לפזר את ההשקעות" },
          { id: "bank", text: "לחסוך בבנק" },
        ],
        finn: {
          correct: ["מדויק!", "תובנה חזקה!", "אלופים!"],
          empathicFirst: "חשבו מה קורה לכסף ששוכב בעו\"ש עשר שנים.",
          hintAfterTwoWrongs: "רמז: הגנב השקוף (אינפלציה) שוחק כל כסף שלא עובד.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-0-5-to-1",
        instruction: "סדרו את מסלול 'הכסף עובד בשבילכם' לפי הסדר הנכון",
        difficulty: "medium",
        items: [
          { id: "work", label: "עבודה מייצרת הכנסה", correctOrder: 0 },
          { id: "save", label: "חוסכים חלק מההכנסה", correctOrder: 1 },
          { id: "invest", label: "משקיעים את החיסכון", correctOrder: 2 },
          { id: "yield", label: "ההשקעה מניבה תשואה שמייצרת עוד כסף", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את הקסם!", "בדיוק!"],
          empathicFirst: "חשבו מאיפה מגיע הכסף שמשקיעים בכלל.",
          hintAfterTwoWrongs: "רמז: קודם עובדים וחוסכים, ורק אז הכסף מתחיל לעבוד לבד.",
        },
      },
    ],
  },
  "mod-1-3": {
    moduleId: "mod-1-3",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-1-3-fb-1",
        template: "ניצול קבוע של מעל {{w}} ממסגרת האשראי בכרטיס עלול להוריד את דירוג האשראי שלכם.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p30", explanation: "נכון, שימוש גבוה ועקבי במסגרת (מעל 30%-40%) מסמן סיכון ופוגע בדירוג." },
        ],
        choices: [
          { id: "p30", text: "30%-40%" },
          { id: "p5", text: "5%-10%" },
          { id: "p70", text: "70%-80%" },
          { id: "p100", text: "100%" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "זוכרים את הסף!"],
          empathicFirst: "חשבו כמה מהמסגרת 'בטוח' לנצל באופן קבוע.",
          hintAfterTwoWrongs: "רמז: זה סף נמוך יחסית — שליש עד שני חמישיות מהמסגרת.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-1-3-fb-2",
        template: "בעסקת תשלומים, סכום הקנייה המלא נתפס ממסגרת האשראי כבר {{w}}, ולא רק התשלום החודשי.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "yom", explanation: "בדיוק, כל הסכום 'תופס' מהמסגרת מיד ביום הקנייה — ולכן עסקאות תשלומים עלולות לחסום את הכרטיס." },
        ],
        choices: [
          { id: "yom", text: "ביום הקנייה" },
          { id: "last", text: "בתשלום האחרון" },
          { id: "year", text: "בסוף השנה" },
          { id: "monthly", text: "בכל חודש בנפרד" },
        ],
        finn: {
          correct: ["בדיוק!", "מצוין!", "הבנתם את האשליה!"],
          empathicFirst: "חשבו מתי באמת 'נתפס' הכסף במסגרת — בהתחלה או בסוף?",
          hintAfterTwoWrongs: "רמז: כל הסכום נתפס מיד, גם אם תשלמו אותו לאורך שנה.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-1-3-to-1",
        instruction: "סדרו את אפיקי האשראי מהבטוח והזול ביותר ליקר והמסוכן ביותר",
        difficulty: "medium",
        items: [
          { id: "debit", label: "כרטיס דביט — בלי אפשרות להיכנס לחוב", correctOrder: 0 },
          { id: "regular", label: "אשראי רגיל שמשולם במלואו כל חודש", correctOrder: 1 },
          { id: "rolling", label: "אשראי מתגלגל — ריבית על היתרה", correctOrder: 2 },
          { id: "club", label: "כרטיס מועדון חוץ-בנקאי בריבית הגבוהה ביותר", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את הסדר!", "בדיוק!"],
          empathicFirst: "חשבו היכן בכלל אי-אפשר להיכנס לחוב, והיכן הריבית הכי גבוהה.",
          hintAfterTwoWrongs: "רמז: דביט הכי בטוח, כרטיס מועדון חוץ-בנקאי הכי יקר.",
        },
      },
    ],
  },
  "mod-1-4": {
    moduleId: "mod-1-4",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-1-4-fb-1",
        template: "לפי כלל 50/30/20, ההמלצה היא להקצות {{w}} מההכנסה לצרכים בסיסיים.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "p50", explanation: "נכון, 50% לצרכים, 30% לרצונות, ו-20% לעתיד (חיסכון והשקעה)." },
        ],
        choices: [
          { id: "p50", text: "50%" },
          { id: "p30", text: "30%" },
          { id: "p20", text: "20%" },
          { id: "p70", text: "70%" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "זוכרים את החלוקה!"],
          empathicFirst: "חשבו על המחצית הראשונה של הכלל — לְמה היא מיועדת.",
          hintAfterTwoWrongs: "רמז: המספר הראשון בכלל 50/30/20 שייך לצרכים.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-1-4-fb-2",
        template: "בשיטת 'שלם לעצמך תחילה', מעבירים את {{w}} לחיסכון מיד עם קבלת המשכורת — לפני ההוצאות.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p20", explanation: "נכון, מעבירים 20% לחיסכון מיד — כך החיסכון הופך למחויבות קבועה ולא תלוי במה שנשאר בסוף החודש." },
        ],
        choices: [
          { id: "p20", text: "20%" },
          { id: "p50", text: "50%" },
          { id: "p5", text: "5%" },
          { id: "rest", text: "כל מה שנשאר" },
        ],
        finn: {
          correct: ["מדויק!", "אלופים!", "זה הסוד של החיסכון!"],
          empathicFirst: "חשבו על החלק שהכלל מייעד לעתיד — אותו מעבירים קודם.",
          hintAfterTwoWrongs: "רמז: זה ה-20 בכלל 50/30/20.",
        },
      },
      {
        type: "timeline-order",
        id: "recall-mod-1-4-to-1",
        instruction: "סדרו את חלוקת המשכורת לפי שיטת 'שלם לעצמך תחילה'",
        difficulty: "medium",
        items: [
          { id: "salary", label: "המשכורת נכנסת", correctOrder: 0 },
          { id: "save", label: "מעבירים 20% לחיסכון מיד", correctOrder: 1 },
          { id: "needs", label: "משלמים 50% על צרכים", correctOrder: 2 },
          { id: "wants", label: "מה שנשאר (30%) לרצונות", correctOrder: 3 },
        ],
        finn: {
          correct: ["מצוין!", "הבנתם את השיטה!", "בדיוק!"],
          empathicFirst: "ב'שלם לעצמך תחילה' — מה עושים מיד אחרי שהמשכורת נכנסת?",
          hintAfterTwoWrongs: "רמז: החיסכון קודם, ורק אחר כך משלמים את שאר ההוצאות.",
        },
      },
    ],
  },
  "mod-1-5": {
    moduleId: "mod-1-5",
    title: "בואו נתרגל!",
    intro: "2 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-1-5-fb-1",
        template: "שכר {{w}} הוא הסכום המלא לפני כל הניכויים, ומשמש לחישוב זכויות סוציאליות כמו פנסיה ופיצויים.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "bruto", explanation: "נכון, ברוטו = לפני ניכויים; נטו = מה שמגיע בפועל לחשבון הבנק." },
        ],
        choices: [
          { id: "bruto", text: "ברוטו" },
          { id: "neto", text: "נטו" },
          { id: "panui", text: "פנוי" },
          { id: "shuli", text: "שולי" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "זוכרים את ההבדל!"],
          empathicFirst: "חשבו מהו הסכום לפני שמורידים ממנו מס וביטוח לאומי.",
          hintAfterTwoWrongs: "רמז: זה הסכום הגדול בתלוש, לפני כל הניכויים.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-1-5-fb-2",
        template: "עלות המעביד בפועל גבוהה מהברוטו בכ-{{w}}, כי המעסיק מוסיף הפרשות סוציאליות ומיסי מעסיק.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "p25", explanation: "נכון, על ברוטו של 10,000 ₪ המעסיק עשוי לשלם בפועל כ-12,500-13,000 ₪." },
        ],
        choices: [
          { id: "p25", text: "20%-30%" },
          { id: "p5", text: "5%" },
          { id: "p55", text: "50%-60%" },
          { id: "p0", text: "0% (זהה לברוטו)" },
        ],
        finn: {
          correct: ["מדויק!", "אלופים!", "זוכרים את עלות המעביד!"],
          empathicFirst: "חשבו שהמעסיק מוסיף מעבר לברוטו גם הפרשות ומיסים.",
          hintAfterTwoWrongs: "רמז: על ברוטו 10,000 ₪ המעסיק משלם בערך 12,500 ₪.",
        },
      },
    ],
  },
  "mod-1-9": {
    moduleId: "mod-1-9",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-1-9-fb-1",
        template: "גודל קרן החירום המומלץ הוא {{w}} של הוצאות מחיה בסיסיות.",
        difficulty: "easy",
        slots: [
          { slotId: "w", correctChoiceId: "m36", explanation: "נכון, 3-6 חודשי הוצאות — בערך הזמן הממוצע למצוא עבודה חדשה אם פוטרתם." },
        ],
        choices: [
          { id: "m36", text: "3 עד 6 חודשים" },
          { id: "w1", text: "שבוע עד חודש" },
          { id: "y12", text: "שנה עד שנתיים" },
          { id: "y10", text: "10 שנים" },
        ],
        finn: {
          correct: ["בדיוק!", "יפה!", "זוכרים את הכלל!"],
          empathicFirst: "חשבו כמה זמן לוקח בממוצע למצוא עבודה חדשה.",
          hintAfterTwoWrongs: "רמז: בין שלושה לשישה חודשי הוצאות בסיסיות.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-1-9-fb-2",
        template: "קרן חירום חייבת להיות נזילה וזמינה תוך {{w}}, ולכן לא משקיעים אותה במניות תנודתיות.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "h48", explanation: "נכון, צריך גישה כמעט מיידית — בדיוק כשצריך אותה (משבר) השוק עלול דווקא לרדת." },
        ],
        choices: [
          { id: "h48", text: "24-48 שעות" },
          { id: "d30", text: "30 יום" },
          { id: "y1", text: "שנה" },
          { id: "y5", text: "5 שנים" },
        ],
        finn: {
          correct: ["מדויק!", "אלופים!", "הבנתם למה לא מניות!"],
          empathicFirst: "חשבו מתי תזדקקו לכסף — ומה קורה אז לשוק המניות.",
          hintAfterTwoWrongs: "רמז: צריך אותה מיד — תוך יום-יומיים, לא חודשים.",
        },
      },
      {
        type: "fill-blank",
        id: "recall-mod-1-9-fb-3",
        template: "עצמאי זקוק לקרן חירום גדולה יותר — כ-{{w}} חודשי הוצאות — בשל הכנסה תנודתית והיעדר דמי אבטלה.",
        difficulty: "medium",
        slots: [
          { slotId: "w", correctChoiceId: "m69", explanation: "נכון, לעצמאי אין רשת ביטחון של אבטלה, ולכן מומלצת קרן גדולה יותר מ-3-6 החודשים של שכיר." },
        ],
        choices: [
          { id: "m69", text: "6 עד 9" },
          { id: "m12", text: "1 עד 2" },
          { id: "m24", text: "12 עד 24" },
          { id: "half", text: "חצי חודש" },
        ],
        finn: {
          correct: ["בדיוק!", "מצוין!", "זוכרים את ההבדל בין שכיר לעצמאי!"],
          empathicFirst: "חשבו מי לא מקבל דמי אבטלה אם ההכנסה נעצרת.",
          hintAfterTwoWrongs: "רמז: עצמאי צריך כרית גדולה יותר משכיר (3-6) — בערך 6-9 חודשים.",
        },
      },
    ],
  },
};

export function getRecallSet(moduleId: string): InteractiveRecallSet | undefined {
  return recallExerciseSets[moduleId];
}