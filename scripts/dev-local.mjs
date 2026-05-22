// scripts/dev-local.mjs
// Pre-flight for `npm run dev:local`:
//   1. Read .env.local, refuse to start unless DATABASE_URL is a real (non-placeholder) value.
//   2. Print the DB host so you can confirm it's your Neon TEST branch — never prod.
//   3. Auto-apply the idempotent migrations to that DB so you never do it by hand.
// Exits non-zero on any problem so the servers don't start against a broken/unsafe DB.
import fs from 'node:fs';

function fail(msg) {
  console.error('\n[dev:local] ' + msg + '\n');
  process.exit(1);
}

let raw = '';
try {
  raw = fs.readFileSync('.env.local', 'utf8');
} catch {
  fail('No .env.local found. Create it with DATABASE_URL (Neon p0-test branch), '
    + 'AUTH_JWT_SECRET, BACKFILL_V1_ENABLED=true, EXPO_PUBLIC_API_URL=http://localhost:3000');
}

const url = (raw.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim();
if (!url || url.includes('REPLACE_ME')) {
  fail('DATABASE_URL in .env.local is not set. Paste your Neon p0-test BRANCH '
    + 'connection string (NOT prod) and rerun.');
}

const host = url.match(/@([^/?]+)/)?.[1] ?? '(unparsed)';
const apiUrl = (raw.match(/^EXPO_PUBLIC_API_URL=(.*)$/m)?.[1] ?? '').trim();

console.log('\n────────────────────────────────────────────');
console.log('[dev:local] Database host : ' + host);
console.log('            ↳ confirm this is your TEST branch, not prod.');
console.log('[dev:local] App calls API : ' + (apiUrl || '(default)'));
console.log('────────────────────────────────────────────');

// Auto-apply idempotent migrations so the branch always has the right schema.
const migrationFiles = [
  'src/db/migrations/0001_add_preferences.sql',
  'src/db/migrations/0002_add_user_stats.sql',
];

try {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  for (const file of migrationFiles) {
    const ddl = fs.readFileSync(file, 'utf8');
    // Strip comment lines, run each statement.
    const statements = ddl
      .split(';')
      .map((s) => s.replace(/--.*$/gm, '').trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await sql.query(stmt);
    }
    console.log('[dev:local] applied migration: ' + file);
  }
  console.log('[dev:local] schema ready.\n');
} catch (e) {
  fail('Failed to apply migrations to the test branch:\n  ' + (e?.message ?? e)
    + '\nCheck that DATABASE_URL points at a reachable Neon branch.');
}
