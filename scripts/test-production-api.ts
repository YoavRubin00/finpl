import assert from 'node:assert/strict';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import quote from '../api/trading/quote';
import banner from '../api/ai/banner-tip';

function response() {
  const state = { code: 200, body: undefined as unknown, headers: new Map<string, string>() };
  const res = {
    status(code: number) { state.code = code; return res; },
    json(body: unknown) { state.body = body; return res; },
    setHeader(key: string, value: string) { state.headers.set(key, value); return res; },
    end() { return res; },
  };
  return { state, res: res as unknown as VercelResponse };
}
const request = (query: Record<string, string | string[]>, method = 'GET') => ({ method, query, body: {} }) as VercelRequest;
const goodChart = (price = 120, currency = 'ILA') => Response.json({ chart: { result: [{
  meta: { regularMarketPrice: price, previousClose: 118, currency },
  timestamp: [1], indicators: { quote: [{ close: [119], open: [118], high: [120], low: [117], volume: [4] }] } },
] } });
const originalFetch = globalThis.fetch;
const originalKey = process.env.GOOGLE_AI_API_KEY;
function mockFetch(fn: (input: unknown, options?: { signal?: unknown; body?: unknown }) => Promise<unknown>) {
  // Native and Node fetch declarations coexist in this Expo project; tests
  // execute with Node's actual Response implementation.
  globalThis.fetch = fn as typeof globalThis.fetch;
}

async function main() {
  let calls: string[] = [];
  mockFetch(async (input, options) => {
    calls.push(String(input));
    assert.ok(options?.signal, 'upstream requests have deadlines');
    return calls.length === 1 ? new Response('', { status: 503 }) : goodChart();
  });
  const fallback = response();
  await quote(request({ ticker: 'teva.ta' }), fallback.res);
  assert.equal(fallback.state.code, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /^https:\/\/query2\.finance\.yahoo\.com/);
  assert.deepEqual(fallback.state.body, { ok: true, ticker: 'TEVA.TA', timeframe: '1D', price: 120, previousClose: 118, currency: 'ILA', chart: [{ timestamp: 1000, price: 119, open: 118, high: 120, low: 117, close: 119, volume: 4 }] });
  assert.equal(fallback.state.headers.get('Cache-Control'), 'public, s-maxage=5, max-age=0');

  calls = [];
  mockFetch(async (input) => { calls.push(String(input)); const error = new Error('deadline'); error.name = 'TimeoutError'; throw error; });
  const unavailable = response();
  await quote(request({ ticker: 'AAPL' }), unavailable.res);
  assert.equal(unavailable.state.code, 502);
  assert.equal(calls.length, 2);
  assert.ok(!unavailable.state.headers.has('Cache-Control'));
  const badQueries: Array<Record<string, string | string[]>> = [{ ticker: ['AAPL', 'BTC'] }, { ticker: '../secrets' }, { ticker: 'AAPL', timeframe: ['1D'] }];
  for (const query of badQueries) {
    const invalid = response();
    await quote(request(query), invalid.res);
    assert.equal(invalid.state.code, 400);
  }
  assert.equal(calls.length, 2, 'invalid inputs never reach the upstream');

  let attempts = 0;
  mockFetch(async () => { attempts++; return new Response('', { status: 404 }); });
  const missing = response();
  await quote(request({ ticker: 'MISSING' }), missing.res);
  assert.equal(missing.state.code, 404);
  assert.equal(attempts, 1, 'missing symbols are not retried');
  mockFetch(async () => goodChart(0));
  const invalidPrice = response();
  await quote(request({ ticker: 'AAPL' }), invalidPrice.res);
  assert.equal(invalidPrice.state.code, 502, 'invalid prices never become tradable quotes');

  process.env.GOOGLE_AI_API_KEY = 'test-only';
  mockFetch(async (_input, options) => {
    const body = JSON.parse(String(options?.body)) as { generationConfig: { maxOutputTokens: number; thinkingConfig: { thinkingBudget: number } } };
    assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
    assert.equal(body.generationConfig.maxOutputTokens, 128);
    assert.ok(options?.signal);
    return Response.json({ candidates: [{ content: { parts: [{ text: 'internal', thought: true }, { text: 'visible ' }, { text: 'tip' }] } }] });
  });
  const tip = response();
  await banner(request({}, 'POST'), tip.res);
  assert.equal(tip.state.code, 200);
  assert.deepEqual(tip.state.body, { ok: true, message: 'visible tip' });
  mockFetch(async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] }));
  const empty = response();
  await banner(request({}, 'POST'), empty.res);
  assert.equal(empty.state.code, 502, 'empty model output is never passed off as a tip');
  console.log('PASS: provider fallback/deadlines, currency/OHLCV, input validation, missing/invalid quotes, banner thinking budget and parts');
}

main().finally(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GOOGLE_AI_API_KEY;
  else process.env.GOOGLE_AI_API_KEY = originalKey;
}).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
