/**
 * First-visit Captain Shark tour of the friends hub.
 *
 * One step per hub component, in the same order the cards appear in the
 * feed (trade rooms → fantasy → crowd wisdom → anon advice → portfolio
 * share) so each step describes what the user sees behind the overlay.
 * Rendered through the shared ToolTutorialOverlay — same look as the
 * financial-tools tutorials. No audio (audioUrl is optional there).
 */

import type { ToolTutorialStep } from '../../financial-tools/data/toolTutorials';

export const FRIENDS_HUB_TUTORIAL_STEPS: ToolTutorialStep[] = [
  {
    title: 'ברוכים הבאים לחברים',
    emoji: '👋',
    message: 'זה הבית החברתי שלכם — תחרויות, התייעצויות ומשחקי שוק עם כל הלהקה. בואו נעשה סיבוב מהיר.',
  },
  {
    title: 'חדרי שיח',
    emoji: '💬',
    message: 'מדברים על השוק בזמן אמת, בלי שמות אמיתיים — לכל אחד כינוי משחק. אני שם בתור מנחה.',
  },
  {
    title: 'פנטזי ליגה',
    emoji: '🏆',
    message: 'מרכיבים נבחרת מניות בתחילת השבוע ומתחרים מול חברים עד שישי. מי שמוביל זוכה בפרסים.',
  },
  {
    title: 'חכמת ההמונים',
    emoji: '📊',
    message: 'מצביעים על שאלות שוק ורואים מה כולם חושבים. אפשר גם להמר במטבעות — ניחוש נגד הזרם שווה יותר.',
  },
  {
    title: 'התייעצות אנונימית',
    emoji: '🎭',
    message: 'שאלות כסף שלא נעים לשאול? כאן שואלים בעילום שם והקהילה עוזרת. תשובות טובות מזכות במטבעות.',
  },
  {
    title: 'שיתוף תיקים',
    emoji: '📈',
    message: 'בונים תיק מהמניות שאתם מאמינים בהן ומשתפים עם כולם. השיתוף הראשון שווה 500 מטבעות. המים שלכם!',
  },
];
