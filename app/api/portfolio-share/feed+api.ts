/**
 * The REAL community portfolio feed (Yoav 2026-07-03: the device-local feed
 * couldn't be rated/liked/commented cross-user without fabricating data). This
 * is the genuine store — shares + 1-5 star ratings + likes + comments, all real.
 *
 * GET  /api/portfolio-share/feed?authId=<email?>&cursor=<iso?>
 *   → { ok, portfolios: RatedPortfolioView[], nextCursor }
 *   PUBLIC READ (Yoav 2026-07-07): the feed is community-wide — everyone,
 *   including guests (no authId), sees every shared portfolio. Personal fields
 *   (isSelf/yourRating/likedByYou) and block-filtering apply only to an
 *   authenticated caller. Writes below still REQUIRE auth.
 *
 * POST /api/portfolio-share/feed  { authId, action, ... }
 *   action 'share'   { picks, caption, displayName, avatarId, isAnonymous? } → new portfolio
 *     isAnonymous=true keeps the real user_id on the row (moderation/blocks
 *     work) but every response masks the author (name→'משקיע אנונימי',
 *     avatar→null, authorUserId→'anon' so cross-post identity can't be linked).
 *   action 'rate'    { portfolioId, stars }                    → { ratingAvg, ratingCount, yourRating }
 *   action 'like'    { portfolioId }                           → { likeCount, likedByYou }  (toggle)
 *   action 'comment' { portfolioId, body, displayName, avatarId } → new comment
 *
 * Auth mirrors friends/graph: registered caller (authId → user_profiles) +
 * validateSyncAuth. Aggregates (avg/count) are computed SERVER-SIDE only — never
 * defaulted, seeded, or invented. Empty = null/0 (honest).
 */

import { and, desc, eq, inArray, lt, notInArray, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  userProfiles,
  sharedPortfolios,
  portfolioRatings,
  portfolioLikes,
  portfolioComments,
  contentReports,
  userBlocks,
} from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { json } from '../_shared/json';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

type Db = ReturnType<typeof getDb>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 20;
/** Display name for anonymous shares — the ONLY author identity ever exposed. */
const ANON_NAME = 'משקיע אנונימי';
/** authorUserId placeholder for anonymous rows: the real uuid must not leak,
 *  or two posts (one named, one anonymous) by the same user become linkable. */
const ANON_USER_ID = 'anon';
const MIN_PICKS = 2;
const MAX_PICKS = 6;
const MAX_CAPTION = 140;
const MAX_COMMENT = 300;
const MAX_REASON = 300;
// Distinct reporters that auto-hide a target globally (a moderator can also hide
// manually). The reporter always stops seeing it immediately, client-side.
const REPORT_AUTO_HIDE = 3;

interface Pick {
  ticker: string;
  sector: string;
  allocationPct: number;
  isLeverage: boolean;
}

interface CommentView {
  id: string;
  authorName: string;
  authorAvatarId: string | null;
  body: string;
  createdAt: string;
  isSelf: boolean;
}

interface RatedPortfolioView {
  id: string;
  authorUserId: string;
  authorName: string;
  authorAvatarId: string | null;
  isSelf: boolean;
  picks: Pick[];
  caption: string;
  createdAt: string;
  ratingAvg: number | null;
  ratingCount: number;
  yourRating: number | null;
  likeCount: number;
  likedByYou: boolean;
  comments: CommentView[];
  commentCount: number;
}

async function authCaller(db: Db, request: Request, authId: string | null | undefined) {
  if (!authId) return null;
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  const caller = rows[0];
  if (!caller) return null;
  if (!validateSyncAuth(request, caller.syncToken)) return null;
  return caller;
}

/** Keep composition only — ticker/sector/allocation/leverage. A stored return
 *  figure would age into a lie, so it is deliberately dropped (G7). */
function sanitizePicks(raw: unknown): Pick[] | null {
  if (!Array.isArray(raw) || raw.length < MIN_PICKS || raw.length > MAX_PICKS) return null;
  const picks: Pick[] = [];
  let sum = 0;
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const p = item as Record<string, unknown>;
    const ticker = sanitizeString(p.ticker, 8);
    const sector = sanitizeString(p.sector, 24);
    const allocationPct =
      typeof p.allocationPct === 'number' && Number.isFinite(p.allocationPct)
        ? Math.round(p.allocationPct)
        : NaN;
    if (!ticker || !sector || !Number.isFinite(allocationPct) || allocationPct <= 0 || allocationPct > 100) {
      return null;
    }
    sum += allocationPct;
    picks.push({ ticker, sector, allocationPct, isLeverage: p.isLeverage === true });
  }
  if (sum !== 100) return null;
  return picks;
}

// ─── GET: the feed with real per-portfolio aggregates ────────────────────────
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'pf-feed', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;
  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);
    const cursor = sanitizeString(url.searchParams.get('cursor'), 40);
    const db = getDb();
    // PUBLIC READ (Yoav 2026-07-07): no authId → guest browsing, serve the feed
    // without personal fields. An authId that FAILS validation is still a hard
    // 401 (never let a caller impersonate someone's personal view).
    const caller = await authCaller(db, request, authId);
    if (authId && !caller) return json({ error: 'Unauthorized' }, { status: 401 });

    // Users this caller has blocked — their shares + comments are filtered out
    // entirely (Apple 1.2: a way to block abusive users). Guests have no blocks.
    const blocks = caller
      ? await db
          .select({ blockedUserId: userBlocks.blockedUserId })
          .from(userBlocks)
          .where(eq(userBlocks.blockerUserId, caller.id))
      : [];
    const blockedIds = blocks.map((b) => b.blockedUserId);

    // hidden=false (moderated content is removed) + not-from-blocked + cursor.
    const feedConds = [eq(sharedPortfolios.hidden, false)];
    if (cursor) feedConds.push(lt(sharedPortfolios.createdAt, cursor));
    if (blockedIds.length) feedConds.push(notInArray(sharedPortfolios.userId, blockedIds));

    const rows = await db
      .select()
      .from(sharedPortfolios)
      .where(and(...feedConds))
      .orderBy(desc(sharedPortfolios.createdAt))
      .limit(PAGE_SIZE);

    if (rows.length === 0) return json({ ok: true, portfolios: [], nextCursor: null });
    const ids = rows.map((r) => r.id);

    // Aggregates — server-computed, never defaulted.
    const ratingAgg = await db
      .select({
        portfolioId: portfolioRatings.portfolioId,
        avg: sql<string>`ROUND(AVG(${portfolioRatings.stars})::numeric, 2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(portfolioRatings)
      .where(inArray(portfolioRatings.portfolioId, ids))
      .groupBy(portfolioRatings.portfolioId);

    const myRatings = caller
      ? await db
          .select({ portfolioId: portfolioRatings.portfolioId, stars: portfolioRatings.stars })
          .from(portfolioRatings)
          .where(and(inArray(portfolioRatings.portfolioId, ids), eq(portfolioRatings.raterUserId, caller.id)))
      : [];

    const likeAgg = await db
      .select({ portfolioId: portfolioLikes.portfolioId, count: sql<number>`COUNT(*)::int` })
      .from(portfolioLikes)
      .where(inArray(portfolioLikes.portfolioId, ids))
      .groupBy(portfolioLikes.portfolioId);

    const myLikes = caller
      ? await db
          .select({ portfolioId: portfolioLikes.portfolioId })
          .from(portfolioLikes)
          .where(and(inArray(portfolioLikes.portfolioId, ids), eq(portfolioLikes.userId, caller.id)))
      : [];

    const commentConds = [inArray(portfolioComments.portfolioId, ids), eq(portfolioComments.hidden, false)];
    if (blockedIds.length) commentConds.push(notInArray(portfolioComments.authorUserId, blockedIds));
    const commentRows = await db
      .select()
      .from(portfolioComments)
      .where(and(...commentConds))
      .orderBy(portfolioComments.createdAt);

    const ratingMap = new Map(ratingAgg.map((r) => [r.portfolioId, r]));
    const myRatingMap = new Map(myRatings.map((r) => [r.portfolioId, r.stars]));
    const likeMap = new Map(likeAgg.map((r) => [r.portfolioId, r.count]));
    const likedSet = new Set(myLikes.map((r) => r.portfolioId));
    const commentMap = new Map<string, CommentView[]>();
    for (const c of commentRows) {
      const list = commentMap.get(c.portfolioId) ?? [];
      list.push({
        id: c.id,
        authorName: c.authorName ?? 'משתמש FinPlay',
        authorAvatarId: c.authorAvatarId ?? null,
        body: c.body,
        createdAt: c.createdAt ?? '',
        isSelf: caller ? c.authorUserId === caller.id : false,
      });
      commentMap.set(c.portfolioId, list);
    }

    const portfolios: RatedPortfolioView[] = rows.map((r) => {
      const agg = ratingMap.get(r.id);
      const comments = commentMap.get(r.id) ?? [];
      // Anonymous mask: name/avatar/id hidden for EVERYONE (the owner still
      // gets isSelf=true so the client can badge "אתה, בעילום שם").
      const anon = r.isAnonymous === true;
      return {
        id: r.id,
        authorUserId: anon ? ANON_USER_ID : r.userId,
        authorName: anon ? ANON_NAME : (r.authorName ?? 'משתמש FinPlay'),
        authorAvatarId: anon ? null : (r.authorAvatarId ?? null),
        isSelf: caller ? r.userId === caller.id : false,
        picks: Array.isArray(r.picks) ? (r.picks as Pick[]) : [],
        caption: r.caption ?? '',
        createdAt: r.createdAt ?? '',
        ratingAvg: agg && agg.avg != null ? Number(agg.avg) : null,
        ratingCount: agg ? Number(agg.count) : 0,
        yourRating: myRatingMap.get(r.id) ?? null,
        likeCount: Number(likeMap.get(r.id) ?? 0),
        likedByYou: likedSet.has(r.id),
        comments,
        commentCount: comments.length,
      };
    });

    const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].createdAt : null;
    return json({ ok: true, portfolios, nextCursor });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'portfolio-share/feed GET');
  }
}

// ─── POST: share / rate / like / comment ─────────────────────────────────────
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'pf-feed-write', { limit: 40, windowSec: 60 });
  if (blocked) return blocked;
  try {
    const body = (await request.json().catch(() => null)) as {
      authId?: string;
      action?: string;
      picks?: unknown;
      caption?: string;
      portfolioId?: string;
      stars?: number;
      body?: string;
      displayName?: string;
      avatarId?: string;
      isAnonymous?: boolean;
      targetType?: string;
      targetId?: string;
      targetUserId?: string;
      reason?: string;
    } | null;
    if (!body) return json({ error: 'Bad request' }, { status: 400 });

    const authId = sanitizeString(body.authId ?? null, 254);
    const db = getDb();
    const caller = await authCaller(db, request, authId);
    if (!caller) return json({ error: 'Unauthorized' }, { status: 401 });

    // ── share ──
    if (body.action === 'share') {
      const picks = sanitizePicks(body.picks);
      if (!picks) return json({ error: 'Bad picks' }, { status: 400 });
      const caption = sanitizeString(body.caption ?? null, MAX_CAPTION) ?? '';
      const isAnonymous = body.isAnonymous === true;
      // Anonymous share: never store the display snapshot at all — the mask
      // must hold even against a future query that forgets to check the flag.
      const authorName = isAnonymous ? null : (sanitizeString(body.displayName ?? null, 64) ?? null);
      const authorAvatarId = isAnonymous ? null : (sanitizeString(body.avatarId ?? null, 48) ?? null);

      const inserted = await db
        .insert(sharedPortfolios)
        .values({
          userId: caller.id,
          authorAuthId: authId as string,
          authorName,
          authorAvatarId,
          picks,
          caption,
          isAnonymous,
        })
        .returning();
      const row = inserted[0];
      const view: RatedPortfolioView = {
        id: row.id,
        authorUserId: isAnonymous ? ANON_USER_ID : row.userId,
        authorName: isAnonymous ? ANON_NAME : (row.authorName ?? 'משתמש FinPlay'),
        authorAvatarId: isAnonymous ? null : (row.authorAvatarId ?? null),
        isSelf: true,
        picks,
        caption: row.caption ?? '',
        createdAt: row.createdAt ?? '',
        ratingAvg: null,
        ratingCount: 0,
        yourRating: null,
        likeCount: 0,
        likedByYou: false,
        comments: [],
        commentCount: 0,
      };
      return json({ ok: true, portfolio: view });
    }

    // ── block a user (Apple 1.2: hide all their content from the caller) ──
    if (body.action === 'block') {
      const targetUserId = sanitizeString(body.targetUserId ?? null, 64);
      if (!targetUserId || !UUID_RE.test(targetUserId)) {
        return json({ error: 'Bad user id' }, { status: 400 });
      }
      if (targetUserId === caller.id) return json({ error: 'cannot_block_self' }, { status: 403 });
      await db
        .insert(userBlocks)
        .values({ blockerUserId: caller.id, blockedUserId: targetUserId })
        .onConflictDoNothing();
      return json({ ok: true, blocked: true });
    }

    // ── report content (Apple 1.2: flag objectionable content) ──
    if (body.action === 'report') {
      const targetType =
        body.targetType === 'comment' ? 'comment' : body.targetType === 'portfolio' ? 'portfolio' : null;
      const targetId = sanitizeString(body.targetId ?? null, 64);
      if (!targetType || !targetId || !UUID_RE.test(targetId)) {
        return json({ error: 'Bad report target' }, { status: 400 });
      }
      const reason = sanitizeString(body.reason ?? null, MAX_REASON) ?? null;
      await db
        .insert(contentReports)
        .values({ reporterUserId: caller.id, reporterAuthId: authId as string, targetType, targetId, reason })
        .onConflictDoNothing();

      // Auto-hide once REPORT_AUTO_HIDE distinct users have flagged the same
      // target (a moderator can also hide manually by setting hidden=true).
      const distinct = await db
        .select({ n: sql<number>`COUNT(DISTINCT ${contentReports.reporterUserId})::int` })
        .from(contentReports)
        .where(and(eq(contentReports.targetType, targetType), eq(contentReports.targetId, targetId)));
      const reportCount = distinct[0] ? Number(distinct[0].n) : 0;
      let hidden = false;
      if (reportCount >= REPORT_AUTO_HIDE) {
        if (targetType === 'portfolio') {
          await db.update(sharedPortfolios).set({ hidden: true }).where(eq(sharedPortfolios.id, targetId));
        } else {
          await db.update(portfolioComments).set({ hidden: true }).where(eq(portfolioComments.id, targetId));
        }
        hidden = true;
      }
      return json({ ok: true, reported: true, hidden });
    }

    const portfolioId = sanitizeString(body.portfolioId ?? null, 64);
    if (!portfolioId || !UUID_RE.test(portfolioId)) {
      return json({ error: 'Bad portfolio id' }, { status: 400 });
    }

    // Owner lookup — needed for self-rating block + existence check.
    const owner = await db
      .select({ userId: sharedPortfolios.userId })
      .from(sharedPortfolios)
      .where(eq(sharedPortfolios.id, portfolioId))
      .limit(1);
    if (!owner[0]) return json({ error: 'Not found' }, { status: 404 });
    const isOwn = owner[0].userId === caller.id;

    // ── rate ──
    if (body.action === 'rate') {
      const stars = typeof body.stars === 'number' ? Math.round(body.stars) : NaN;
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        return json({ error: 'Bad stars' }, { status: 400 });
      }
      // G3: you cannot rate your own portfolio (would inflate your average).
      if (isOwn) return json({ error: 'cannot_rate_own' }, { status: 403 });

      await db
        .insert(portfolioRatings)
        .values({ portfolioId, raterUserId: caller.id, raterAuthId: authId as string, stars })
        .onConflictDoUpdate({
          target: [portfolioRatings.portfolioId, portfolioRatings.raterUserId],
          set: { stars, updatedAt: new Date().toISOString() },
        });

      const agg = await db
        .select({
          avg: sql<string>`ROUND(AVG(${portfolioRatings.stars})::numeric, 2)`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(portfolioRatings)
        .where(eq(portfolioRatings.portfolioId, portfolioId));
      return json({
        ok: true,
        ratingAvg: agg[0] && agg[0].avg != null ? Number(agg[0].avg) : null,
        ratingCount: agg[0] ? Number(agg[0].count) : 0,
        yourRating: stars,
      });
    }

    // ── like (toggle) ──
    if (body.action === 'like') {
      const existing = await db
        .select({ userId: portfolioLikes.userId })
        .from(portfolioLikes)
        .where(and(eq(portfolioLikes.portfolioId, portfolioId), eq(portfolioLikes.userId, caller.id)))
        .limit(1);
      let likedByYou: boolean;
      if (existing[0]) {
        await db
          .delete(portfolioLikes)
          .where(and(eq(portfolioLikes.portfolioId, portfolioId), eq(portfolioLikes.userId, caller.id)));
        likedByYou = false;
      } else {
        await db
          .insert(portfolioLikes)
          .values({ portfolioId, userId: caller.id })
          .onConflictDoNothing();
        likedByYou = true;
      }
      const agg = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(portfolioLikes)
        .where(eq(portfolioLikes.portfolioId, portfolioId));
      return json({ ok: true, likeCount: agg[0] ? Number(agg[0].count) : 0, likedByYou });
    }

    // ── comment ──
    if (body.action === 'comment') {
      const text = sanitizeString(body.body ?? null, MAX_COMMENT);
      if (!text) return json({ error: 'Empty comment' }, { status: 400 });
      const authorName = sanitizeString(body.displayName ?? null, 64) ?? null;
      const authorAvatarId = sanitizeString(body.avatarId ?? null, 48) ?? null;
      const inserted = await db
        .insert(portfolioComments)
        .values({
          portfolioId,
          authorUserId: caller.id,
          authorAuthId: authId as string,
          authorName,
          authorAvatarId,
          body: text,
        })
        .returning();
      const c = inserted[0];
      const view: CommentView = {
        id: c.id,
        authorName: c.authorName ?? 'משתמש FinPlay',
        authorAvatarId: c.authorAvatarId ?? null,
        body: c.body,
        createdAt: c.createdAt ?? '',
        isSelf: true,
      };
      return json({ ok: true, comment: view });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'portfolio-share/feed POST');
  }
}
