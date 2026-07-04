import type { JournalKind } from './journalTypes';

/**
 * Mini-glossary for the Investors Journal — the "מה זה X?" pills that make
 * every event approachable for someone with zero background (Yoav 2026-07-04:
 * "שיונגש כמו שמונגש מה זה דיבידנד במשחקים"). Same interaction pattern as
 * GlossaryTermPill in the minigames: pill → bottom sheet → definition + example.
 */
export interface JournalTerm {
  term: string;
  definition: string;
  example: string;
}

const TERMS: Record<string, JournalTerm> = {
  rate: {
    term: 'ריבית',
    definition:
      'המחיר של כסף. כשהבנק המרכזי מעלה ריבית — הלוואות ומשכנתאות מתייקרות וחיסכון מרוויח יותר. כשהוא מוריד — ההפך.',
    example: 'ריבית עלתה ב-0.25%? ההחזר החודשי של משכנתא צמודת-פריים מתייקר תוך חודש.',
  },
  cpi: {
    term: 'מדד המחירים (אינפלציה)',
    definition:
      'מדידה חודשית של כמה התייקרו החיים — סל קניות, שכירות, דלק. עלייה מהירה מדי = אינפלציה, והיא שוחקת את הכסף שיושב בעו"ש.',
    example: 'אינפלציה של 4% בשנה אומרת ש-100 ש"ח של היום יקנו רק כ-96 ש"ח בעוד שנה.',
  },
  earnings: {
    term: 'דוח כספי ותחזיות',
    definition:
      'פעם ברבעון כל חברה ציבורית מפרסמת כמה הרוויחה. השוק משווה את המספרים למה שהאנליסטים ציפו — ההפתעה היא מה שמזיז את המניה, לא המספר עצמו.',
    example: 'חברה הרוויחה מיליארדים אבל פחות מהתחזית? המניה יכולה לרדת באותו יום.',
  },
  jobs: {
    term: 'דוח התעסוקה',
    definition:
      'כמה משרות נוספו למשק בחודש. חזק מדי = חשש מאינפלציה וריבית גבוהה; חלש מדי = חשש ממיתון. השוק מחפש את שביל הזהב.',
    example: 'דוח תעסוקה אמריקאי חזק במיוחד יכול דווקא להפיל מניות — כי הוא מרחיק הורדת ריבית.',
  },
  other: {
    term: 'אירוע שוק',
    definition:
      'התרחשות חד-פעמית שהשוק עוקב אחריה — פסגה כלכלית, החלטה רגולטורית או נתון מיוחד. מה שחשוב הוא הפער בין הציפיות למציאות.',
    example: 'כשכולם כבר מצפים לחדשות טובות — גם חדשות טובות יכולות לאכזב.',
  },
};

export function termForKind(kind: JournalKind): JournalTerm {
  return TERMS[kind] ?? TERMS.other;
}
