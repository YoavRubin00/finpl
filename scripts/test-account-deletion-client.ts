// scripts/test-account-deletion-client.ts
// Run: npx tsx scripts/test-account-deletion-client.ts
//
// The app side of "delete my account" (src/lib/auth/accountDeletionCore.ts):
// which answers wipe the device, which mean "nothing was deleted", which mean
// "we don't know", and the one immediate retry. No React Native, no network.
import {
  classifyDeleteAttempt,
  runDeleteAttempts,
  TIMED_OUT,
} from '../src/lib/auth/accountDeletionCore';

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

async function main(): Promise<void> {
  // ═══ One answer ═══
  check(classifyDeleteAttempt({ answer: { ok: true, deleted: true } }) === 'deleted', 'answer {ok:true, deleted:true} → deleted');
  check(classifyDeleteAttempt({ answer: { ok: true, deleted: false, alreadyDeleted: true } }) === 'deleted',
    'answer {ok:true, alreadyDeleted:true} (a retry after a lost answer) → deleted');
  for (const [label, answer] of [
    ['an empty body (null)', null],
    ['{}', {}],
    ['{ok:false}', { ok: false }],
    ['{ok:"true"}', { ok: 'true' }],
    ['a string', 'ok'],
    ['the timeout marker', TIMED_OUT],
  ] as const) {
    check(classifyDeleteAttempt({ answer }) === 'unknown', `answer ${label} → unknown (never wipes the device)`);
  }
  check(classifyDeleteAttempt({ error: new HttpError(401) }) === 'session_expired', 'error 401 → session_expired (nothing deleted)');
  for (const status of [400, 403, 404, 409, 422]) {
    check(classifyDeleteAttempt({ error: new HttpError(status) }) === 'refused', `error ${status} → refused (nothing deleted)`);
  }
  for (const status of [408, 429, 500, 502, 503, 504]) {
    check(classifyDeleteAttempt({ error: new HttpError(status) }) === 'unknown', `error ${status} → unknown (the server may have deleted)`);
  }
  check(classifyDeleteAttempt({ error: new TypeError('Network request failed') }) === 'unknown', 'network failure → unknown');
  check(classifyDeleteAttempt({ error: new SyntaxError('Unexpected token <') }) === 'unknown', 'a body that is not JSON → unknown');
  check(classifyDeleteAttempt({ error: null }) === 'unknown', 'a null rejection → unknown');

  // ═══ The attempts (retry once only when the outcome is unknown) ═══
  const sender = (answers: Array<() => Promise<unknown>>) => {
    let calls = 0;
    const send = () => {
      const next = answers[Math.min(calls, answers.length - 1)];
      calls++;
      return next();
    };
    return { send, calls: () => calls };
  };
  {
    const s = sender([async () => ({ ok: true, deleted: true })]);
    const r = await runDeleteAttempts(s.send, 200);
    check(r.outcome === 'deleted' && r.attempts === 1 && s.calls() === 1, 'deleted at once → one request', r);
  }
  {
    const s = sender([async () => { throw new TypeError('Network request failed'); }, async () => ({ ok: true, deleted: false, alreadyDeleted: true })]);
    const r = await runDeleteAttempts(s.send, 200);
    check(r.outcome === 'deleted' && r.attempts === 2 && s.calls() === 2,
      'the answer was lost, the retry says "already deleted" → deleted (the device gets wiped)', r);
  }
  {
    const started = Date.now();
    const s = sender([never, async () => ({ ok: true, deleted: true })]);
    const r = await runDeleteAttempts(s.send, 80);
    const ms = Date.now() - started;
    check(r.outcome === 'deleted' && r.attempts === 2 && ms < 1000, 'a stalled request times out, the retry succeeds (no endless overlay)', { r, ms });
  }
  {
    const started = Date.now();
    const s = sender([never]);
    const r = await runDeleteAttempts(s.send, 60);
    const ms = Date.now() - started;
    check(r.outcome === 'unknown' && r.attempts === 2 && ms >= 100 && ms < 1000,
      'two stalled requests → unknown after two timeouts, never more', { r, ms });
  }
  {
    const s = sender([async () => { throw new HttpError(500); }]);
    const r = await runDeleteAttempts(s.send, 200);
    check(r.outcome === 'unknown' && r.attempts === 2 && s.calls() === 2, '5xx twice → unknown, exactly two requests', r);
  }
  {
    const s = sender([async () => null]);
    const r = await runDeleteAttempts(s.send, 200);
    check(r.outcome === 'unknown' && s.calls() === 2, 'an empty 2xx twice → unknown (not wiped)', r);
  }
  for (const status of [401, 404, 403]) {
    const s = sender([async () => { throw new HttpError(status); }]);
    const r = await runDeleteAttempts(s.send, 200);
    check(r.attempts === 1 && s.calls() === 1 && r.outcome === (status === 401 ? 'session_expired' : 'refused'),
      `a definite ${status} → no retry`, r);
  }
  {
    const s = sender([async () => { throw new HttpError(429); }, async () => { throw new HttpError(404); }]);
    const r = await runDeleteAttempts(s.send, 200);
    check(r.outcome === 'refused' && r.attempts === 2, '429 then a definite refusal → refused (nothing deleted)', r);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
