import type { RatedPortfolio } from '../../db/sync/syncPortfolioShare';

/**
 * Cold-start example portfolios (Yoav 2026-07-04). Shown ONLY when the real
 * server feed is empty, so a first visitor sees the FORMAT instead of a blank
 * feed — they self-retire the instant any real portfolio exists (the card falls
 * back to `portfolios` whenever it is non-empty).
 *
 * Yoav ruling (later on 2026-07-04): they must LOOK and FEEL like real posts —
 * no "examples" label, no captions, and stars/like/comment must work. That
 * engagement is the user's OWN real action, persisted locally via
 * useSeedEngagementStore (zero fabricated counts; ids are `seed-*` so nothing
 * ever reaches the server).
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
    caption: '',
    createdAt: '2026-07-01T09:00:00.000Z',
    ratingAvg: null,
    ratingCount: 0,
    yourRating: null,
    // Baseline social-proof likes (Yoav 2026-07-06): seed cards start with a
    // visible like count so the feed doesn't look dead pre-community. The
    // user's own like adds on top (see the feed merge in PortfolioShareCard).
    likeCount: 14,
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
    caption: '',
    createdAt: '2026-06-30T18:30:00.000Z',
    ratingAvg: null,
    ratingCount: 0,
    yourRating: null,
    // Baseline social-proof likes — see note on the first seed.
    likeCount: 18,
    likedByYou: false,
    comments: [],
    commentCount: 0,
  },
];
