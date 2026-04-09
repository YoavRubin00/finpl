/** Types for the Wisdom Flashes system (PRD12 + PRD13) */

/** A famous quote from a notable figure (PRD12) */
export interface WisdomQuote {
    id: string;
    text: string;
    author: string;
    authorRole: string;
    icon: string;
    type: 'quote';
}

/** Psychological / behavioral finance insight categories (PRD13) */
export type WisdomCategory =
    | 'cognitive-bias'
    | 'emotional-control'
    | 'discipline'
    | 'contrarian'
    | 'money-psychology'
    | 'right-approach';

/** Hebrew labels for categories */
export const CATEGORY_LABELS: Record<WisdomCategory, string> = {
    'cognitive-bias': 'הטיות קוגניטיביות',
    'emotional-control': 'שליטה רגשית',
    'discipline': 'משמעת השקעתית',
    'contrarian': 'חשיבה נגד הזרם',
    'money-psychology': 'פסיכולוגיה של כסף',
    'right-approach': 'בניית גישה נכונה',
};

/** Category icons */
export const CATEGORY_ICONS: Record<WisdomCategory, string> = {
    'cognitive-bias': '🧩',
    'emotional-control': '🎭',
    'discipline': '📏',
    'contrarian': '🔄',
    'money-psychology': '💭',
    'right-approach': '🧭',
};

/** A psychological wisdom flash (PRD13) */
export interface PsychWisdomFlash {
    id: string;
    text: string;
    category: WisdomCategory;
    icon: string;
    type: 'psych';
}

/** Union type for any wisdom item */
export type WisdomItem = WisdomQuote | PsychWisdomFlash;
