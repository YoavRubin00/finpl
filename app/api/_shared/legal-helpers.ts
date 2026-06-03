/**
 * Shared helpers for the /api/legal/* surface (parental-consent flow).
 *   - getDb(): neon-http drizzle handle, same pattern as breaking-news/_lib.
 *   - getOrigin(): public origin to embed in confirm/revoke links — prefers
 *     the explicit env, falls back to the request's own origin.
 *   - generateToken(): URL-safe random token for the email link.
 *   - htmlPage(): minimal styled HTML for the confirm/revoke landing pages
 *     (parent sees these in a web browser, not in the app).
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
// `crypto` (not `node:crypto`) — the rest of the +api.ts surface uses the
// bare specifier and Metro resolves it via Vercel's Node polyfill at deploy
// time. The `node:` prefix is rejected by Metro at the client-bundle step
// (preview Android build 2026-06-03), even though this file is server-only.
import { randomUUID } from 'crypto';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const sql = neon(url);
  return drizzle(sql);
}

export function getOrigin(request: Request): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL ?? process.env.PUBLIC_BASE_URL;
  if (explicit && /^https?:\/\//.test(explicit)) {
    return explicit.replace(/\/+$/, '');
  }
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'https://finpl.vercel.app';
  }
}

/** ~256 bits of entropy from two concatenated UUIDv4s, hyphens stripped.
 *  Two UUIDs because a single one (~122 bits) is borderline; we want the
 *  email-link token to be brute-force infeasible during its 14-day window. */
export function generateToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, '');
}

/** Best-effort client IP for audit trail. Vercel/Cloudflare both populate
 *  these headers; we fall back to 'unknown' so the column stays non-empty
 *  for forensics later. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('cf-connecting-ip')
    ?? 'unknown'
  );
}

interface HtmlPageOptions {
  title: string;
  heading: string;
  bodyHtml: string;
  /** 'ok' green, 'error' red, 'neutral' gray. */
  tone: 'ok' | 'error' | 'neutral';
}

/** Minimal RTL-Hebrew HTML page returned by confirm/revoke endpoints.
 *  Inline CSS only — recipients open it in a random email client's preview
 *  webview where external stylesheets often fail. */
export function htmlPage({ title, heading, bodyHtml, tone }: HtmlPageOptions): Response {
  const accent =
    tone === 'ok' ? '#16a34a'
      : tone === 'error' ? '#dc2626'
        : '#475569';
  const accentBg =
    tone === 'ok' ? '#dcfce7'
      : tone === 'error' ? '#fee2e2'
        : '#f1f5f9';

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — FinPlay</title>
</head>
<body style="margin:0;padding:48px 16px;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#0a2540,#164e63);color:#ffffff;">
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.4px;">🦈 FinPlay</div>
    </div>
    <div style="padding:28px;">
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${accentBg};color:${accent};font-weight:900;font-size:13px;margin-bottom:14px;">
        ${escapeHtml(heading)}
      </div>
      <div style="font-size:15px;line-height:24px;color:#0f172a;">${bodyHtml}</div>
      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
        שאלות? <a href="mailto:support@finplay.me" style="color:#0c4a6e;">support@finplay.me</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
