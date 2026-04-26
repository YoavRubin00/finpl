import type { CrowdQuestion, SelectionContext } from './types';

const EVERGREEN_FALLBACK_ID = 'cq-market-green-today';

function hashISODate(iso: string): number {
  let hash = 0;
  for (let i = 0; i < iso.length; i++) {
    hash = (Math.imul(31, hash) + iso.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function scoreQuestion(q: CrowdQuestion, ctx: SelectionContext): number {
  const triggers = q.tags.triggers;
  if (!triggers) {
    return q.tags.timing === 'evergreen' ? 1 : 0;
  }

  let score = 0;
  let anyTrigger = false;

  if (triggers.dayOfWeek) {
    anyTrigger = true;
    if (triggers.dayOfWeek.includes(ctx.dayOfWeek)) score += 4;
  }
  if (triggers.monthDay) {
    anyTrigger = true;
    if (triggers.monthDay.includes(ctx.monthDay)) score += 4;
  }
  if (triggers.btcNear !== undefined && ctx.market?.btcPrice !== undefined) {
    anyTrigger = true;
    const within = Math.abs(ctx.market.btcPrice - triggers.btcNear) / triggers.btcNear;
    if (within < 0.05) score += 5;
  }
  if (triggers.spyNear !== undefined && ctx.market?.spyPrice !== undefined) {
    anyTrigger = true;
    const within = Math.abs(ctx.market.spyPrice - triggers.spyNear) / triggers.spyNear;
    if (within < 0.05) score += 5;
  }
  if (triggers.gtBtcPrice !== undefined && ctx.market?.btcPrice !== undefined) {
    anyTrigger = true;
    if (ctx.market.btcPrice > triggers.gtBtcPrice) score += 3;
  }
  if (triggers.vixGt !== undefined && ctx.market?.vix !== undefined) {
    anyTrigger = true;
    if (ctx.market.vix > triggers.vixGt) score += 3;
  }

  if (!anyTrigger) return q.tags.timing === 'evergreen' ? 1 : 0;
  return score;
}

export function buildSelectionContext(now: Date, market?: SelectionContext['market']): SelectionContext {
  return {
    todayISO: now.toISOString().slice(0, 10),
    dayOfWeek: now.getDay(),
    monthDay: now.getDate(),
    market,
  };
}

export function selectTodayQuestion(pool: readonly CrowdQuestion[], ctx: SelectionContext): string {
  if (pool.length === 0) return EVERGREEN_FALLBACK_ID;

  const scored = pool.map((q) => ({ id: q.id, score: scoreQuestion(q, ctx) }));
  const maxScore = scored.reduce((m, s) => (s.score > m ? s.score : m), 0);

  if (maxScore <= 0) {
    const fallback = pool.find((q) => q.id === EVERGREEN_FALLBACK_ID) ?? pool[pool.length - 1];
    return fallback.id;
  }

  const top = scored.filter((s) => s.score === maxScore);
  if (top.length === 1) return top[0].id;

  const tieBreaker = hashISODate(ctx.todayISO) % top.length;
  return top[tieBreaker].id;
}