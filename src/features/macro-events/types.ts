/** PRD 29a — MacroEvents Mini-Game types */

export type MacroEventCategory = 'crisis' | 'boom' | 'shock' | 'policy' | 'tech';

export const MACRO_CATEGORY_LABELS: Record<MacroEventCategory, string> = {
  crisis: 'משבר',
  boom:   'גאות',
  shock:  'זעזוע',
  policy: 'מדיניות',
  tech:   'טכנולוגיה',
};

export const MACRO_CATEGORY_ICONS: Record<MacroEventCategory, string> = {
  crisis: '🏦',
  boom:   '🚀',
  shock:  '⚡',
  policy: '🏛️',
  tech:   '💻',
};

export interface MacroEvent {
  id: string;
  year: number;
  headline: string;       // short Hebrew headline, e.g. "לימן ברדרס קרסו"
  context: string;        // 1-2 sentences of background (Hebrew, RTL) — must NOT reveal the answer
  question: string;       // custom question replacing generic "מה קרה לשוק?"
  direction: 'up' | 'down';
  magnitude: string;      // e.g. "−38% ב-2008" — shown after reveal
  explanation: string;    // "למה זה קרה" — causal analysis shown after reveal
  lesson: string;         // "הלקח" — one-line key takeaway for the investor
  category: MacroEventCategory;
  difficulty: 1 | 2 | 3;
  isPremium?: boolean;
}
