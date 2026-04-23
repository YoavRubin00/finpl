import type { InteractiveRecallSet } from "./sentenceTypes";

// Content for Interactive Recall. Keyed by moduleId, only modules in the
// MODULES_WITH_INTERACTIVE_RECALL opt-in set (see LessonFlowScreen) are read.
// Each set aims for ~4 prompts mixing fill-blank and timeline-order.

export const recallExerciseSets: Record<string, InteractiveRecallSet> = {
  "mod-0-2": {
    moduleId: "mod-0-2",
    title: "בואו נתרגל!",
    intro: "3 תרגילים מהירים לפני הקוויז. נוודא שהמושגים יושבים.",
    prompts: [
      {
        type: "fill-blank",
        id: "recall-mod-0-2-fb-1",
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
        id: "recall-mod-0-2-fb-2",
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
      {
        type: "timeline-order",
        id: "recall-mod-0-2-to-1",
        instruction: "סדרו את השלבים בתהליך משיכת מזומן מכספומט",
        difficulty: "medium",
        items: [
          { id: "s1", label: "הכנסת כרטיס לכספומט", correctOrder: 0 },
          { id: "s2", label: "הקלדת קוד סודי", correctOrder: 1 },
          { id: "s3", label: "בחירת סכום למשיכה", correctOrder: 2 },
          { id: "s4", label: "קבלת הכסף והחזר הכרטיס", correctOrder: 3 },
        ],
        finn: {
          correct: ["מדויק!", "סדר מושלם!", "כל הכבוד!"],
          empathicFirst: "כמעט, חשבו על הצעדים הפיזיים בסדר הגיוני.",
          hintAfterTwoWrongs: "רמז: קודם מזהים אתכם (כרטיס + קוד), ואז בוחרים סכום.",
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
          { slotId: "w", correctChoiceId: "n3024", explanation: "נכון, נקודת זיכוי שווה כ-₪3,024 בשנה (כ-252 ₪ בחודש) ומפחיתה ישירות את המס." },
        ],
        choices: [
          { id: "n3024", text: "3,024" },
          { id: "n252", text: "252" },
          { id: "n500", text: "500" },
          { id: "n10000", text: "10,000" },
        ],
        finn: {
          correct: ["מדויק!", "יפה!", "זוכרים את השווי!"],
          empathicFirst: "שימו לב אם המספר שנתי או חודשי.",
          hintAfterTwoWrongs: "רמז: 252 זה השווי החודשי — כפול 12 זה השנתי.",
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
};

export function getRecallSet(moduleId: string): InteractiveRecallSet | undefined {
  return recallExerciseSets[moduleId];
}