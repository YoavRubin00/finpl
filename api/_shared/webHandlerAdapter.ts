/**
 * Adapter that lets us call Expo-Router-style Web `Request → Response`
 * handlers from a Vercel Node Serverless Function (`VercelRequest`/`VercelResponse`).
 *
 * Why this exists:
 *   - The codebase keeps endpoint logic under `app/api/<route>+api.ts` using
 *     the modern Web Request API (so `npm run web` via Expo Router can serve
 *     them in dev).
 *   - Vercel only deploys files under the top-level `api/` directory (see
 *     `vercel.json` → `functions: { "api/**\/*.ts" }`).
 *   - Without this adapter we'd duplicate every handler. With it, each
 *     `api/<route>.ts` file is 3 lines that re-export the Web handler.
 *
 * Usage:
 *   import { POST, DELETE } from '../../app/api/breaking-news/track+api';
 *   export default toVercelHandler({ POST, DELETE });
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

type WebHandler = (req: Request) => Promise<Response> | Response;

type HandlerMap = Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', WebHandler>>;

function vercelRequestToWebRequest(req: VercelRequest): Request {
  const host = req.headers.host ?? 'localhost';
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const url = `${proto}://${host}${req.url ?? '/'}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else headers.set(key, value);
  }

  const method = (req.method ?? 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  // Vercel parses JSON bodies automatically into `req.body`. The Web handler
  // calls `request.json()`, so we serialize back to a string. For non-JSON
  // payloads (rare in this codebase) we fall through to raw body if present.
  let body: string | undefined;
  if (hasBody && req.body !== undefined && req.body !== null) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!headers.has('content-type') && typeof req.body !== 'string') {
      headers.set('content-type', 'application/json');
    }
  }

  return new Request(url, { method, headers, body });
}

async function writeWebResponse(res: VercelResponse, webRes: Response): Promise<void> {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    // `content-encoding` from the Web Response would confuse Vercel since
    // we're forwarding the already-decoded body. Skip it.
    if (key.toLowerCase() === 'content-encoding') return;
    res.setHeader(key, value);
  });

  const text = await webRes.text();
  res.send(text);
}

/**
 * Wrap a map of Web-style handlers into a single Vercel default export.
 * Unknown methods return 405.
 */
export function toVercelHandler(handlers: HandlerMap) {
  return async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    const method = (req.method ?? 'GET').toUpperCase() as keyof HandlerMap;
    const fn = handlers[method];
    if (!fn) {
      res.status(405).json({ error: `Method ${method} not allowed` });
      return;
    }

    try {
      const webReq = vercelRequestToWebRequest(req);
      const webRes = await fn(webReq);
      await writeWebResponse(res, webRes);
    } catch (err) {
      // Last-resort guard. The wrapped handlers should already catch and
      // return their own structured error responses via `safeErrorResponse`.
      console.error('[webHandlerAdapter] handler threw', err);
      res.status(500).json({ error: 'Internal error' });
    }
  };
}
