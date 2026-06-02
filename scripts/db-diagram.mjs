// scripts/db-diagram.mjs
// Live node-based ER diagram of the Neon database — self-contained, free, no third party.
//
// Runs a tiny LOCAL server: the DB credentials stay in this Node process, and the page
// only ever talks to localhost. Every page load (and the in-page "Refresh" button) runs
// a fresh, read-only introspection query against Neon — so the diagram always reflects
// the real, current schema, including columns/tables/FKs you add directly in Neon.
// Schema metadata only — never table rows.
//
// Run: `npm run db:diagram`  (Ctrl+C to stop).   Flags: --no-open (don't launch browser).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

const DIR = import.meta.dirname;
const QUERY_FILE = path.join(DIR, 'db-introspect.sql');
const TEMPLATE_FILE = path.join(DIR, 'db-diagram.template.html');
const PORT = 4985;
const noOpen = process.argv.includes('--no-open');

function fail(msg) {
  console.error('\n[db:diagram] ' + msg + '\n');
  process.exit(1);
}

// Mirror scripts/migrate-local.mjs: read DATABASE_URL straight from .env.local.
let env = '';
try {
  env = fs.readFileSync('.env.local', 'utf8');
} catch {
  fail('No .env.local found.');
}
const url = (env.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
if (!url || url.includes('REPLACE_ME')) {
  fail('DATABASE_URL in .env.local is not set to a real branch.');
}
const host = url.match(/@([^/?]+)/)?.[1] ?? '(unparsed)';

// Single statement; strip only the trailing semicolon (the HTTP driver runs one).
const query = fs.readFileSync(QUERY_FILE, 'utf8').trim().replace(/;\s*$/, '');

const { neon } = await import('@neondatabase/serverless');
const sql = neon(url);

async function introspect() {
  const rows = await sql.query(query);
  return rows?.[0]?.metadata_json_to_import ?? '{}';
}

const server = http.createServer(async (req, res) => {
  const route = (req.url || '/').split('?')[0];
  if (route === '/' || route === '/index.html') {
    // Read fresh each request so editing the template shows on a plain browser reload.
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(TEMPLATE_FILE, 'utf8'));
    return;
  }
  if (route === '/schema') {
    try {
      const json = await introspect();
      const parsed = JSON.parse(json);
      const base = (parsed.tables || []).filter((t) => t.type === 'BASE TABLE').length;
      console.log(`[db:diagram] /schema -> ${base} tables, ${(parsed.fk_info || []).length} FKs`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(json);
    } catch (e) {
      console.error('[db:diagram] introspection failed: ' + (e?.message ?? e));
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(e?.message ?? e) }));
    }
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') fail(`Port ${PORT} is already in use. Is another db:diagram already running?`);
  fail('Server error: ' + (e?.message ?? e));
});

function openBrowser(target) {
  const platform = process.platform;
  const cmd =
    platform === 'win32'
      ? `start "" "${target}"`
      : platform === 'darwin'
        ? `open "${target}"`
        : `xdg-open "${target}"`;
  exec(cmd, () => {});
}

server.listen(PORT, '127.0.0.1', () => {
  const local = `http://localhost:${PORT}`;
  console.log(`\n[db:diagram] Live diagram for: ${host}`);
  console.log(`[db:diagram] Serving ${local}  (read-only · schema only)`);
  console.log('[db:diagram] Every load + the in-page ⟳ Refresh re-queries live Neon.');
  console.log('[db:diagram] Press Ctrl+C to stop.\n');
  if (!noOpen) openBrowser(local);
});
