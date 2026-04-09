/**
 * SIM 4-27: מנהל המשבר (Crisis Manager) — Module 4-27
 * 5 historical market crises with Hebrew headlines and recovery data.
 */

import type { CrisisEvent, CrisisConfig } from './crisisManagerTypes';

// ── Crisis Events (chronological) ────────────────────────────────────────

const dotcomBubble: CrisisEvent = {
  id: 'dotcom-2000',
  title: 'בועת הדוט-קום',
  emoji: '💻',
  year: 2000,
  headline: 'בועת הטכנולוגיה התפוצצה — הנאסד"ק צנח 78% משיאו',
  marketDropPercent: 45,
  recoveryMonths: 84,
  postRecoveryGainPercent: 85,
};

const gfc2008: CrisisEvent = {
  id: 'gfc-2008',
  title: 'המשבר הפיננסי העולמי',
  emoji: '🏚️',
  year: 2008,
  headline: 'ליהמן בראדרס קרס — בנקים ברחבי העולם על סף פשיטת רגל',
  marketDropPercent: 38,
  recoveryMonths: 48,
  postRecoveryGainPercent: 65,
};

const covidCrash: CrisisEvent = {
  id: 'covid-2020',
  title: 'קריסת הקורונה',
  emoji: '🦠',
  year: 2020,
  headline:
    'מגפת COVID-19 סגרה את הכלכלה העולמית — השווקים צנחו ב-5 שבועות',
  marketDropPercent: 34,
  recoveryMonths: 5,
  postRecoveryGainPercent: 70,
};

const inflationBear: CrisisEvent = {
  id: 'inflation-2022',
  title: 'שוק הדובים של 2022',
  emoji: '📈',
  year: 2022,
  headline: 'אינפלציה של 9.1% — הפד העלה ריבית בקצב חסר תקדים',
  marketDropPercent: 20,
  recoveryMonths: 18,
  postRecoveryGainPercent: 30,
};

const oct7Crisis: CrisisEvent = {
  id: 'oct7-2023',
  title: 'מלחמת חרבות ברזל',
  emoji: '🇮🇱',
  year: 2023,
  headline: 'מתקפת 7 באוקטובר — מדד ת"א 35 צנח ושער השקל נחלש',
  marketDropPercent: 8,
  recoveryMonths: 12,
  postRecoveryGainPercent: 15,
};

// ── Chronological Events Array ───────────────────────────────────────────

const CRISIS_EVENTS: CrisisEvent[] = [
  dotcomBubble,
  gfc2008,
  covidCrash,
  inflationBear,
  oct7Crisis,
];

// ── Config Export ────────────────────────────────────────────────────────

const INITIAL_BALANCE = 100_000;

export const crisisManagerConfig: CrisisConfig = {
  initialBalance: INITIAL_BALANCE,
  events: CRISIS_EVENTS,
};

/** Total number of crisis events */
export const TOTAL_EVENTS = CRISIS_EVENTS.length;
