/** PRD 34 US-003, Hidden module definitions unlocked by AI recommendations */

import type { RecommendedAction } from './types';
import type { Module } from '../chapter-1-content/types';

export interface HiddenModuleDef {
  /** Which AI action triggers this module */
  trigger: RecommendedAction;
  /** Which chapter map should display this node */
  chapterId: string;
  /** The module data (stub, content can be expanded later) */
  module: Module;
}

export const HIDDEN_MODULES: HiddenModuleDef[] = [
  {
    trigger: 'UNLOCK_CRYPTO_NODE',
    chapterId: 'chapter-4',
    module: {
      id: 'hidden-crypto-advanced',
      title: 'קריפטו מתקדם',
      videoHook: 'גלה את עולם הקריפטו המתקדם',
      interactiveIntro: 'מודול סודי שנפתח בזכות הביצועים שלך!',
      flashcards: [
        { id: 'hc-1', text: 'מודול זה ייפתח בקרוב עם תוכן מלא.' },
      ],
      quizzes: [
        {
          id: 'hq-1',
          question: 'מה היתרון המרכזי של DeFi?',
          options: ['ביזור', 'מהירות', 'עלות נמוכה', 'כל התשובות'],
          correctAnswer: 3,
          successFeedback: 'מצוין! DeFi משלב את כל היתרונות.',
          failFeedback: 'DeFi מציע ביזור, מהירות ועלות נמוכה.',
          type: 'multiple-choice',
          conceptTag: 'crypto_advanced',
        },
      ],
      simConcept: {
        id: 'sim-crypto-adv',
        title: 'סימולטור קריפטו מתקדם',
        description: 'בחן את יכולת קבלת ההחלטות שלך בשוק הקריפטו.',
      },
    },
  },
  {
    trigger: 'UNLOCK_TAX_NODE',
    chapterId: 'chapter-3',
    module: {
      id: 'hidden-tax-planning',
      title: 'תכנון מס חכם',
      videoHook: 'למד איך לחסוך במיסים בצורה חוקית',
      interactiveIntro: 'מודול סודי, תכנון מס מתקדם!',
      flashcards: [
        { id: 'ht-1', text: 'מודול זה ייפתח בקרוב עם תוכן מלא.' },
      ],
      quizzes: [
        {
          id: 'htq-1',
          question: 'מהו ניכוי מס?',
          options: ['הוצאה שמפחיתה הכנסה חייבת', 'קנס מס', 'מס נוסף', 'ביטוח'],
          correctAnswer: 0,
          successFeedback: 'נכון! ניכוי מפחית את ההכנסה החייבת.',
          failFeedback: 'ניכוי מס הוא הוצאה מוכרת שמפחיתה הכנסה חייבת.',
          type: 'multiple-choice',
          conceptTag: 'tax_planning',
        },
      ],
      simConcept: {
        id: 'sim-tax-plan',
        title: 'סימולטור מיסוי',
        description: 'תרגל תכנון מס שנתי חכם.',
      },
    },
  },
  {
    trigger: 'UNLOCK_ADVANCED_INVESTING',
    chapterId: 'chapter-5',
    module: {
      id: 'hidden-advanced-investing',
      title: 'השקעות מתקדמות',
      videoHook: 'אסטרטגיות השקעה ברמה הגבוהה ביותר',
      interactiveIntro: 'מודול סודי, מסחר אופציות ונגזרים!',
      flashcards: [
        { id: 'hi-1', text: 'מודול זה ייפתח בקרוב עם תוכן מלא.' },
      ],
      quizzes: [
        {
          id: 'hiq-1',
          question: 'מה זו אופציית CALL?',
          options: ['זכות לקנות', 'חובה לקנות', 'זכות למכור', 'חובה למכור'],
          correctAnswer: 0,
          successFeedback: 'מצוין! אופציית CALL נותנת זכות לקנות.',
          failFeedback: 'אופציית CALL היא זכות (לא חובה) לקנות נכס במחיר קבוע.',
          type: 'multiple-choice',
          conceptTag: 'advanced_investing',
        },
      ],
      simConcept: {
        id: 'sim-adv-invest',
        title: 'סימולטור נגזרים',
        description: 'נסה לסחור באופציות בסביבה בטוחה.',
      },
    },
  },
];

/** Get hidden modules unlocked for a specific chapter */
export function getUnlockedHiddenModules(
  chapterId: string,
  unlockedActions: RecommendedAction[],
): HiddenModuleDef[] {
  return HIDDEN_MODULES.filter(
    (hm) => hm.chapterId === chapterId && unlockedActions.includes(hm.trigger),
  );
}
