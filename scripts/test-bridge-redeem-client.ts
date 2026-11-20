// scripts/test-bridge-redeem-client.ts
// Run: node node_modules/tsx/dist/cli.mjs scripts/test-bridge-redeem-client.ts
//
// The app side of a Bridge redemption (economy fix round E6a/E6b,
// src/features/the-bridge/bridgeRedeemCore.ts), with no React Native and no
// network:
//  - bridge #0: the server deducted, the answer was lost, the app said
//    "failed", and once the lowered balance reached the screen the user could
//    not even ask the server again. Now an unknown outcome is sent once more
//    (the server answers alreadyRedeemed when the first landed), and a still
//    unknown one is kept as "pending" so the next tap reaches the server;
//  - bridge #4: a 401 is its own outcome ('signed_out'), never "try again";
//  - definite answers are never repeated.
import {
  classifyRedeemError,
  isRedeemAnswer,
  nextPendingRedeemIds,
  runRedeemAttempts,
} from '../src/features/the-bridge/bridgeRedeemCore';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  }
}

/** Same shape as the shared client's ApiError (status + body). */
class HttpError extends Error {
  constructor(public readonly status: number, public readonly body: unknown = null) {
    super(`HTTP ${status}`);
  }
}

const never = () => new Promise<never>(() => { /* a stalled connection */ });
const FAST = { timeoutMs: 50, retryDelayMs: 0 };

/**
 * A stand-in for POST /api/bridge/redeem with the server's real rules: the
 * cost is deducted from the server balance once per account and benefit, a
 * repeat answers alreadyRedeemed, too little balance answers 409.
 * `loseAnswers` = how many of the next answers are lost after the server
 * committed (no network on the way back).
 */
function fakeServer(balance: number, cost: number) {
  const state = { balance, redeemed: false, requests: 0, loseAnswers: 0 };
  const send = async (): Promise<unknown> => {
    state.requests++;
    const economy = () => ({ xp: 0, coins: state.balance, gems: 0, level: 1, virtualBalance: '0' });
    let answer: unknown;
    if (state.redeemed) {
      answer = { ok: true, redeemed: true, alreadyRedeemed: true, economy: economy() };
    } else if (state.balance >= cost) {
      state.balance -= cost;
      state.redeemed = true;
      answer = { ok: true, redeemed: true, alreadyRedeemed: false, economy: economy() };
    } else {
      throw new HttpError(409, { error: 'Not enough coins', code: 'INSUFFICIENT_COINS', costCoins: cost, economy: economy() });
    }
    if (state.loseAnswers > 0) {
      state.loseAnswers--;
      throw new TypeError('Network request failed');
    }
    return answer;
  };
  return { state, send };
}

async function main(): Promise<void> {
  // ═══ What a failure means ═══
  {
    const c = classifyRedeemError(new HttpError(409, { economy: { coins: 7 } }));
    const body = c.kind === 'insufficient' ? (c.body as { economy?: { coins?: number } } | null) : null;
    check(c.kind === 'insufficient' && body?.economy?.coins === 7, '409 → insufficient, with the server economy from the body', c);
  }
  check(classifyRedeemError(new HttpError(404)).kind === 'not_available', '404 → not_available');
  check(classifyRedeemError(new HttpError(401, { error: 'Missing Authorization header' })).kind === 'signed_out',
    'bridge #4: 401 (no token on a ghost session, or a rejected one) → signed_out, its own outcome');
  for (const status of [400, 403, 422, 429]) {
    const c = classifyRedeemError(new HttpError(status));
    check(c.kind === 'refused' && c.status === status, `${status} → refused (nothing done, not repeated)`);
  }
  for (const [label, err] of [
    ['500', new HttpError(500, { error: 'Internal error' })],
    ['502', new HttpError(502)],
    ['503', new HttpError(503, { code: 'REDEEM_UNAVAILABLE' })],
    ['a network failure', new TypeError('Network request failed')],
    ['a body that is not JSON (Vercel\'s HTML page)', new SyntaxError('Unexpected token <')],
    ['null', null],
  ] as const) {
    check(classifyRedeemError(err).kind === 'unknown', `${label} → unknown (the server may have deducted)`);
  }
  check(isRedeemAnswer({ ok: true, redeemed: true, alreadyRedeemed: false }), 'answer {ok, redeemed} is a redemption');
  for (const [label, v] of [['{ok:true}', { ok: true }], ['null', null], ['a string', 'ok'], ['{redeemed:true}', { redeemed: true }]] as const) {
    check(!isRedeemAnswer(v), `answer ${label} is not (an empty or odd 2xx proves nothing)`);
  }

  // ═══ The attempts ═══
  {
    const s = fakeServer(3000, 2500);
    const r = await runRedeemAttempts(s.send, isRedeemAnswer, FAST);
    check(r.outcome.kind === 'redeemed' && r.attempts === 1 && s.state.requests === 1 && s.state.balance === 500,
      'answered at once → one request, deducted once', { r, state: s.state });
  }
  {
    // bridge #0: the server committed, the answer was lost; the retry tells the truth.
    const s = fakeServer(3000, 2500);
    s.state.loseAnswers = 1;
    const r = await runRedeemAttempts(s.send, isRedeemAnswer, FAST);
    const answer = r.outcome.kind === 'redeemed' ? r.outcome.answer : null;
    check(r.outcome.kind === 'redeemed' && answer?.alreadyRedeemed === true && r.attempts === 2 && s.state.balance === 500,
      'bridge #0: answer lost after the deduction → the retry answers alreadyRedeemed, deducted ONCE, the app marks it redeemed', { r, state: s.state });
  }
  {
    const s = fakeServer(3000, 2500);
    let calls = 0;
    const send = async () => { calls++; if (calls === 1) throw new HttpError(502); return s.send(); };
    const r = await runRedeemAttempts(send, isRedeemAnswer, FAST);
    check(r.outcome.kind === 'redeemed' && r.attempts === 2, 'a 5xx then an answer → redeemed on the retry', r);
  }
  {
    const s = fakeServer(3000, 2500);
    s.state.loseAnswers = 2;
    const r = await runRedeemAttempts(s.send, isRedeemAnswer, FAST);
    check(r.outcome.kind === 'unknown' && r.attempts === 2 && s.state.requests === 2 && s.state.balance === 500,
      'both answers lost → unknown after exactly two requests (still deducted once)', { r, state: s.state });
    // The next tap (the Bridge lets it through because the id is pending) gets the truth.
    const next = await runRedeemAttempts(s.send, isRedeemAnswer, FAST);
    check(next.outcome.kind === 'redeemed' && (next.outcome.kind === 'redeemed' && next.outcome.answer.alreadyRedeemed === true) && s.state.balance === 500,
      'the next tap → alreadyRedeemed, nothing deducted again', next);
  }
  {
    const started = Date.now();
    let calls = 0;
    const s = fakeServer(3000, 2500);
    const send = () => { calls++; return calls === 1 ? never() : s.send(); };
    const r = await runRedeemAttempts(send, isRedeemAnswer, FAST);
    const ms = Date.now() - started;
    check(r.outcome.kind === 'redeemed' && r.attempts === 2 && ms < 1000, 'a request that never answers times out; the retry answers', { r, ms });
  }
  {
    const started = Date.now();
    const r = await runRedeemAttempts(never, isRedeemAnswer, FAST);
    const ms = Date.now() - started;
    check(r.outcome.kind === 'unknown' && r.attempts === 2 && ms >= 90 && ms < 1000, 'two stalled requests → unknown after two timeouts, never a hang', { r, ms });
  }
  {
    let calls = 0;
    const r = await runRedeemAttempts(async () => { calls++; return null; }, isRedeemAnswer, FAST);
    check(r.outcome.kind === 'unknown' && calls === 2, 'an empty 2xx twice → unknown (not counted as redeemed)', { r, calls });
  }
  {
    const s = fakeServer(1000, 2500);
    const r = await runRedeemAttempts(s.send, isRedeemAnswer, FAST);
    check(r.outcome.kind === 'insufficient' && r.attempts === 1 && s.state.requests === 1, '409 → no retry', r);
  }
  for (const [label, err, kind] of [
    ['401', new HttpError(401), 'signed_out'],
    ['404', new HttpError(404, { code: 'UNKNOWN_BENEFIT' }), 'not_available'],
    ['429', new HttpError(429), 'refused'],
  ] as const) {
    let calls = 0;
    const r = await runRedeemAttempts(async () => { calls++; throw err; }, isRedeemAnswer, FAST);
    check(r.outcome.kind === kind && calls === 1, `${label} → ${kind}, no retry`, { r, calls });
  }
  {
    // The default pause before the retry gives a network blip a moment.
    const started = Date.now();
    let calls = 0;
    await runRedeemAttempts(async () => { calls++; if (calls === 1) throw new TypeError('Network request failed'); return { ok: true, redeemed: true }; },
      isRedeemAnswer, { timeoutMs: 1000 });
    const ms = Date.now() - started;
    check(calls === 2 && ms >= 500 && ms < 2000, 'the default retry waits a moment (about 0.6 s)', { ms });
  }

  // ═══ Pending ids ═══
  {
    let ids = nextPendingRedeemIds([], 'bridge-invest-altshuler', 'unknown');
    check(ids.join() === 'bridge-invest-altshuler', 'unknown → the benefit becomes pending');
    ids = nextPendingRedeemIds(ids, 'bridge-invest-altshuler', 'unknown');
    check(ids.length === 1, 'unknown again → listed once');
    ids = nextPendingRedeemIds(ids, 'bridge-insurance-cover', 'unknown');
    check(ids.length === 2, 'another benefit can be pending too');
    for (const kind of ['signed_out', 'refused'] as const) {
      const kept = nextPendingRedeemIds(ids, 'bridge-invest-altshuler', kind);
      check(kept.includes('bridge-invest-altshuler'), `${kind} says nothing about the lost request → still pending`);
    }
    for (const kind of ['redeemed', 'insufficient', 'not_available'] as const) {
      const cleared = nextPendingRedeemIds(ids, 'bridge-invest-altshuler', kind);
      check(!cleared.includes('bridge-invest-altshuler') && cleared.includes('bridge-insurance-cover'),
        `${kind} (a definite answer) → no longer pending, the other one stays`);
    }
    check(nextPendingRedeemIds(undefined, 'x', 'unknown').join() === 'x' && nextPendingRedeemIds(null, 'x', 'redeemed').length === 0,
      'a missing list (saved by an older build) counts as empty');
    check(nextPendingRedeemIds(['a', 7 as unknown as string, 'b'], 'c', 'refused').join() === 'a,b', 'damaged entries are dropped');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
