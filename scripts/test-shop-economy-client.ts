// scripts/test-shop-economy-client.ts
// Run: node node_modules/tsx/dist/cli.mjs scripts/test-shop-economy-client.ts
//
// App-side economy and shop decisions from the economy fix round (20.11), with
// no React Native and no network:
//  - E4 (src/lib/api/economyCore.ts): a POST /api/sync/economy answered
//    503 ECONOMY_BUSY (nothing written) is sent once more; nothing else is.
import { ECONOMY_BUSY_CODE, isEconomyBusy, withEconomyBusyRetry } from '../src/lib/api/economyCore';

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

const busy = () => new HttpError(503, { error: 'Busy, try again', code: ECONOMY_BUSY_CODE });
const noPause = async () => { /* no wait in tests */ };

async function economyBusyRetry(): Promise<void> {
  // ═══ What counts as "busy" ═══
  check(isEconomyBusy(busy()), 'E4: 503 {code:ECONOMY_BUSY} is busy');
  for (const [label, err] of [
    ['503 without a code', new HttpError(503, { error: 'Service unavailable' })],
    ['503 with an empty body', new HttpError(503, null)],
    ['500 {code:ECONOMY_BUSY}', new HttpError(500, { code: ECONOMY_BUSY_CODE })],
    ['502', new HttpError(502)],
    ['409', new HttpError(409, { code: 'X' })],
    ['a network failure', new TypeError('Network request failed')],
    ['a body that is not JSON', new SyntaxError('Unexpected token <')],
    ['null', null],
  ] as const) {
    check(!isEconomyBusy(err), `E4: ${label} is not busy (may have been applied: never repeated)`);
  }

  // ═══ The retry ═══
  const answer = { ok: true, economy: { xp: 1, coins: 2, gems: 3, level: 1, virtualBalance: '0' } };
  {
    let calls = 0;
    const r = await withEconomyBusyRetry(async () => { calls++; return answer; }, noPause);
    check(r === answer && calls === 1, 'E4: an answer at once → one request', { calls });
  }
  {
    let calls = 0;
    let pauses = 0;
    const r = await withEconomyBusyRetry(async () => {
      calls++;
      if (calls === 1) throw busy();
      return answer;
    }, async () => { pauses++; });
    check(r === answer && calls === 2 && pauses === 1, 'E4: busy, then an answer → sent once more after a pause, answer kept', { calls, pauses });
  }
  {
    let calls = 0;
    let caught: unknown = null;
    try {
      await withEconomyBusyRetry(async () => { calls++; throw busy(); }, noPause);
    } catch (err) { caught = err; }
    check(calls === 2 && isEconomyBusy(caught), 'E4: busy twice → exactly two requests, the busy error is passed on', { calls });
  }
  for (const [label, err] of [
    ['a network failure', new TypeError('Network request failed')],
    ['a 500', new HttpError(500, { error: 'Internal error' })],
    ['a 503 without the code', new HttpError(503, null)],
    ['a 401', new HttpError(401)],
  ] as const) {
    let calls = 0;
    let caught: unknown = null;
    try {
      await withEconomyBusyRetry(async () => { calls++; throw err; }, noPause);
    } catch (e) { caught = e; }
    check(calls === 1 && caught === err, `E4: ${label} → no retry (a reward could be paid twice), error passed on`, { calls });
  }
  {
    // The default pause is short and random (150–500 ms).
    let calls = 0;
    const started = Date.now();
    await withEconomyBusyRetry(async () => {
      calls++;
      if (calls === 1) throw busy();
      return answer;
    });
    const ms = Date.now() - started;
    check(calls === 2 && ms >= 140 && ms < 1500, 'E4: the default pause before the retry is short', { ms });
  }
}

async function main(): Promise<void> {
  await economyBusyRetry();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
