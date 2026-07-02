// Seed community portfolios + reward config for the portfolio-share feed.
// Authors carry real game avatar ids (AvatarImage renders the Pip mascots).

import type { SharedPick, SharedPortfolio } from './portfolioShareTypes';

/** Coins for sharing a portfolio you built — once per day. */
export const SHARE_REWARD_COINS = 500;
export const MIN_PICKS = 2;
export const MAX_PICKS = 6;
export const ALLOCATION_STEP = 5;
export const MAX_CAPTION_LENGTH = 140;

/** Allocation-weighted return; leveraged picks count double. */
export function computePortfolioReturn(picks: SharedPick[]): number {
  const total = picks.reduce(
    (sum, p) => sum + (p.weeklyChange * (p.isLeverage ? 2 : 1) * p.allocationPct) / 100,
    0,
  );
  return parseFloat(total.toFixed(2));
}

function seed(
  partial: Omit<SharedPortfolio, 'totalReturn' | 'likedBySelf' | 'createdAt'> & { hoursAgo: number },
): SharedPortfolio {
  const { hoursAgo, ...rest } = partial;
  return {
    ...rest,
    totalReturn: computePortfolioReturn(partial.picks),
    likedBySelf: false,
    createdAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
  };
}

export const SEED_PORTFOLIOS: SharedPortfolio[] = [
  seed({
    id: 'pf-seed-1',
    author: 'נועה, המשקיעה',
    avatarId: 'avatar-investor',
    tier: 'gold',
    weekDay: 3,
    hoursAgo: 2,
    caption: 'הולכת חזק על AI השבוע — NVDA לקפטן עם מינוף. אם עונת הדוחות ממשיכה ככה, זה השבוע שלי.',
    picks: [
      { ticker: 'NVDA', sector: 'tech',        weeklyChange: 5.1,  allocationPct: 40, isLeverage: true },
      { ticker: 'OKLO', sector: 'spec_growth', weeklyChange: 8.2,  allocationPct: 20 },
      { ticker: 'TEVA', sector: 'israel',      weeklyChange: 1.6,  allocationPct: 15 },
      { ticker: 'XOM',  sector: 'energy',      weeklyChange: 1.2,  allocationPct: 15 },
      { ticker: 'BTC',  sector: 'crypto',      weeklyChange: 4.1,  allocationPct: 10 },
    ],
    likes: 47,
    comments: [
      { id: 'c-1a', author: 'דניאל, האסטרטג', avatarId: 'avatar-strategist', text: 'אגרסיבי אבל מנומק. הייתי מקטין את המינוף לפני הדוח', ago: '12 דק׳', likes: 4 },
      { id: 'c-1b', author: 'יעל, הסוחרת',    avatarId: 'avatar-trader',     text: '40% על מניה אחת עם מינוף — אמיץ. מחזיקה אצבעות', ago: '8 דק׳',  likes: 12 },
      { id: 'c-1c', author: 'אמיר, הסקרן',    avatarId: 'cat',               text: 'שאלת מתחיל: למה בכלל מינוף אם התיק כבר מרוכז?',   ago: '3 דק׳',  likes: 7 },
    ],
  }),
  seed({
    id: 'pf-seed-2',
    author: 'איתי, המגן',
    avatarId: 'avatar-defender',
    tier: 'diamond',
    weekDay: 3,
    hoursAgo: 7,
    caption: 'תיק הגנה קלאסי: פיזור רחב, בלי הרפתקאות. בשוק תנודתי — מי שלא מפסיד, מנצח.',
    picks: [
      { ticker: 'AAPL', sector: 'tech',   weeklyChange: 2.4,  allocationPct: 30 },
      { ticker: 'BEZQ', sector: 'israel', weeklyChange: 0.5,  allocationPct: 25 },
      { ticker: 'CVX',  sector: 'energy', weeklyChange: -1.8, allocationPct: 20 },
      { ticker: 'GOOGL', sector: 'tech',  weeklyChange: 1.8,  allocationPct: 15 },
      { ticker: 'ETH',  sector: 'crypto', weeklyChange: 2.9,  allocationPct: 10 },
    ],
    likes: 23,
    comments: [
      { id: 'c-2a', author: 'רותם, החולמת', avatarId: 'avatar-grower',  text: 'שני טק ביחד זה לא בדיוק פיזור, לא?', ago: '1ש׳',    likes: 9 },
      { id: 'c-2b', author: 'גיא, הסבלני',  avatarId: 'turtle',         text: 'תיק כזה לא מנצח שבוע — הוא מנצח שנה. מכבד', ago: '45 דק׳', likes: 8 },
    ],
  }),
  seed({
    id: 'pf-seed-3',
    author: 'שירה, הסוחרת',
    avatarId: 'avatar-trader',
    tier: 'silver',
    weekDay: 3,
    hoursAgo: 26,
    caption: 'שבוע ראשון בליגה — הלכתי על ספקולציות מחושבות. או שאעוף לצמרת או שאלמד שיעור יקר.',
    picks: [
      { ticker: 'ASTS', sector: 'spec_growth', weeklyChange: 9.1, allocationPct: 30, isLeverage: true },
      { ticker: 'IONQ', sector: 'spec_growth', weeklyChange: 6.5, allocationPct: 25 },
      { ticker: 'NVDA', sector: 'tech',        weeklyChange: 5.1, allocationPct: 20 },
      { ticker: 'SOL',  sector: 'crypto',      weeklyChange: 6.1, allocationPct: 15 },
      { ticker: 'ENLT', sector: 'israel',      weeklyChange: 2.7, allocationPct: 10 },
    ],
    likes: 89,
    comments: [
      { id: 'c-3a', author: 'תום, הלוחם',   avatarId: 'lion',           text: '55% על ספקולציות — זה כבר לא תיק, זו רכבת הרים', ago: '2ש׳',    likes: 27 },
      { id: 'c-3b', author: 'אביב, המנתח', avatarId: 'avatar-analyst', text: 'המספרים דווקא עובדים לה עד עכשיו. נראה בשישי',   ago: '1ש׳',    likes: 14 },
      { id: 'c-3c', author: 'הילה, הנבונה', avatarId: 'fox',           text: 'לפחות זה כסף וירטואלי. פה לומדים בזול',           ago: '20 דק׳', likes: 6 },
    ],
  }),
];