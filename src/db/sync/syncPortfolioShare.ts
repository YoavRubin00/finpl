import { getApiBase } from '../apiBase';
import type { FantasySectorId } from '../../constants/theme';

/** A holding's composition (no return figure — the server never stores one). */
export interface RatedPick {
  ticker: string;
  sector: FantasySectorId;
  allocationPct: number;
  isLeverage?: boolean;
}

export interface RatedComment {
  id: string;
  authorName: string;
  authorAvatarId: string | null;
  body: string;
  createdAt: string;
  isSelf: boolean;
}

/** A shared portfolio with its REAL community aggregates from the server. */
export interface RatedPortfolio {
  id: string;
  authorUserId: string;
  authorName: string;
  authorAvatarId: string | null;
  isSelf: boolean;
  picks: RatedPick[];
  caption: string;
  createdAt: string;
  /** null when nobody has rated yet — never a fabricated default. */
  ratingAvg: number | null;
  ratingCount: number;
  /** the caller's own rating, or null. */
  yourRating: number | null;
  likeCount: number;
  likedByYou: boolean;
  comments: RatedComment[];
  commentCount: number;
}

interface AuthArgs {
  authId: string;
  syncToken?: string | null;
}

function headers(syncToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (syncToken) h['X-Sync-Token'] = syncToken;
  return h;
}

const ENDPOINT = '/api/portfolio-share/feed';

/** The community feed (real portfolios + real ratings/likes/comments).
 *  PUBLIC READ (Yoav 2026-07-07): auth is OPTIONAL — a guest (no authId) gets
 *  the same community-wide feed, just without personal fields (isSelf/
 *  yourRating/likedByYou come back false/null). Writes still require auth. */
export async function fetchPortfolioFeed(
  args: Partial<AuthArgs> & { cursor?: string | null },
): Promise<{ portfolios: RatedPortfolio[]; nextCursor: string | null }> {
  const base = getApiBase();
  const qs = new URLSearchParams();
  if (args.authId) qs.set('authId', args.authId);
  if (args.cursor) qs.set('cursor', args.cursor);
  const res = await fetch(`${base}${ENDPOINT}?${qs.toString()}`, { headers: headers(args.syncToken) });
  if (!res.ok) throw new Error(`portfolio feed GET failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; portfolios?: RatedPortfolio[]; nextCursor?: string | null };
  return { portfolios: data.portfolios ?? [], nextCursor: data.nextCursor ?? null };
}

/** Share a portfolio to the server feed. `isAnonymous` masks the author
 *  (name/avatar/id) in every response — see feed+api.ts (Yoav 2026-07-07). */
export async function sharePortfolioApi(
  args: AuthArgs & {
    picks: RatedPick[];
    caption: string;
    displayName: string;
    avatarId: string | null;
    isAnonymous?: boolean;
  },
): Promise<RatedPortfolio> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({
      authId: args.authId,
      action: 'share',
      picks: args.picks.map((p) => ({
        ticker: p.ticker,
        sector: p.sector,
        allocationPct: p.allocationPct,
        isLeverage: p.isLeverage === true,
      })),
      caption: args.caption,
      displayName: args.displayName,
      avatarId: args.avatarId,
      isAnonymous: args.isAnonymous === true,
    }),
  });
  if (!res.ok) throw new Error(`portfolio share failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; portfolio: RatedPortfolio };
  return data.portfolio;
}

/** Set (or change) your 1-5 star rating. Returns the recomputed server average. */
export async function ratePortfolioApi(
  args: AuthArgs & { portfolioId: string; stars: number },
): Promise<{ ratingAvg: number | null; ratingCount: number; yourRating: number }> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({ authId: args.authId, action: 'rate', portfolioId: args.portfolioId, stars: args.stars }),
  });
  if (!res.ok) throw new Error(`portfolio rate failed: ${res.status}`);
  return (await res.json()) as { ratingAvg: number | null; ratingCount: number; yourRating: number };
}

/** Toggle your like. Returns the recomputed server like count. */
export async function toggleLikeApi(
  args: AuthArgs & { portfolioId: string },
): Promise<{ likeCount: number; likedByYou: boolean }> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({ authId: args.authId, action: 'like', portfolioId: args.portfolioId }),
  });
  if (!res.ok) throw new Error(`portfolio like failed: ${res.status}`);
  return (await res.json()) as { likeCount: number; likedByYou: boolean };
}

/** Add a comment. Returns the created comment (isSelf=true). */
export async function addCommentApi(
  args: AuthArgs & { portfolioId: string; body: string; displayName: string; avatarId: string | null },
): Promise<RatedComment> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({
      authId: args.authId,
      action: 'comment',
      portfolioId: args.portfolioId,
      body: args.body,
      displayName: args.displayName,
      avatarId: args.avatarId,
    }),
  });
  if (!res.ok) throw new Error(`portfolio comment failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; comment: RatedComment };
  return data.comment;
}

/** Report a portfolio or comment as objectionable (Apple Guideline 1.2). */
export async function reportContentApi(
  args: AuthArgs & { targetType: 'portfolio' | 'comment'; targetId: string; reason?: string },
): Promise<{ reported: boolean; hidden: boolean }> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({
      authId: args.authId,
      action: 'report',
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
    }),
  });
  if (!res.ok) throw new Error(`report failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; reported: boolean; hidden: boolean };
  return { reported: data.reported === true, hidden: data.hidden === true };
}

/** Block a user — hides all their shares + comments from the caller (Apple 1.2). */
export async function blockUserApi(
  args: AuthArgs & { targetUserId: string },
): Promise<{ blocked: boolean }> {
  const base = getApiBase();
  const res = await fetch(`${base}${ENDPOINT}`, {
    method: 'POST',
    headers: headers(args.syncToken),
    body: JSON.stringify({ authId: args.authId, action: 'block', targetUserId: args.targetUserId }),
  });
  if (!res.ok) throw new Error(`block failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; blocked: boolean };
  return { blocked: data.blocked === true };
}
