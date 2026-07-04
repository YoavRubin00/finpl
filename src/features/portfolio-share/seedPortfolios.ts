import type { RatedPortfolio } from '../../db/sync/syncPortfolioShare';

/**
 * Cold-start example portfolios (Yoav 2026-07-04). Shown ONLY when the real
 * server feed is empty, so a first visitor sees the FORMAT instead of a blank
 * feed — they self-retire the instant any real portfolio exists (the card falls
 * back to `portfolios` whenever it is non-empty).
 *
 * Honesty guard-rails (these are NOT real users):
 *  - zero fabricated engagement: 0 likes / 0 ratings / 0 comments (no invented
 *    "47 people liked this" social proof).
 *  - ids are `seed-*` (never valid UUIDs) so every server write they touch is
 *    rejected → they can't be rated/liked/commented/reported, and the card
 *    hides the report/block menu + no-ops interactions on them.
 *  - clearly framed as "דוגמאות מהקהילה" in the UI, never mixed into a feed that
 *    already has real content.
 */

export function isSeedPortfolio(id: string): boolean {
  return id.startsWith('seed-');
}

/** Rank the REAL feed by engagement for the friends main screen (likes +
 *  comments + ratings), recency as the tie-break. Real data only. */
export function rankPortfoliosByEngagement(list: RatedPortfolio[]): RatedPortfolio[] {
  const score = (p: RatedPortfolio): number => p.likeCount + p.commentCount + p.ratingCount;
  return [...list].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
}

export const SEED_PORTFOLIOS: RatedPortfolio[] = [
  {
    id: 'seed-pf-indices',
    authorUserId: 'seed-user-a',
    authorName: 'דנה כ.',
    authorAvatarId: null,
    isSelf: false,
    picks: [
      { ticker: 'תל35', sector: 'israel', allocationPct: 45, isLeverage: false },
      { ticker: 'SPY', sector: 'tech', allocationPct: 35, isLeverage: false },
      { ticker: 'בנקים', sector: 'banks', allocationPct: 20, isLeverage: false },
    ],
    caption: 'משעמם אבל ישן טוב בלילה — בעיקר מדדים רחבים, בלי לנחש מניה בודדת. פעם בחודש מפקידה ושוכחת.',
    createdAt: '2026-07-01T09:00:00.000Z',
    ratingAvg: null,
    ratingCount: 0,
    yourRating: null,
    likeCount: 0,
    likedByYou: false,
    comments: [],
    commentCount: 0,
  },
  {
    id: 'seed-pf-stocks',
    authorUserId: 'seed-user-b',
    authorName: 'עומר ל.',
    authorAvatarId: null,
    isSelf: false,
    picks: [
      { ticker: 'NVDA', sector: 'tech', allocationPct: 30, isLeverage: false },
      { ticker: 'TSLA', sector: 'consumer', allocationPct: 25, isLeverage: false },
      { ticker: 'טבע', sector: 'health', allocationPct: 20, isLeverage: false },
      { ticker: 'פועלים', sector: 'banks', allocationPct: 15, isLeverage: false },
      { ticker: 'NICE', sector: 'tech', allocationPct: 10, isLeverage: false },
    ],
    caption: 'אוהב לבחור מניות בודדות — יותר תנודתי, אבל אני עוקב מקרוב. מזל טכנולוגי כבד, אני יודע.',
    createdAt: '2026-06-30T18:30:00.000Z',
    ratingAvg: null,
    ratingCount: 0,
    yourRating: null,
    likeCount: 0,
    likedByYou: false,
    comments: [],
    commentCount: 0,
  },
];
