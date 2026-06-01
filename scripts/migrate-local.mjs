// scripts/migrate-local.mjs
// One-time schema setup for a Neon test branch: applies the idempotent
// migration SQL files to whatever DATABASE_URL is in .env.local.
// Run once per new/fresh branch: `npm run db:migrate:local`
// (Not run on every `npm run dev:local` — the schema persists on the branch.)
import fs from 'node:fs';

function fail(msg) {
  console.error('\n[db:migrate:local] ' + msg + '\n');
  process.exit(1);
}

let raw = '';
try {
  raw = fs.readFileSync('.env.local', 'utf8');
} catch {
  fail('No .env.local found.');
}

const url = (raw.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
if (!url || url.includes('REPLACE_ME')) {
  fail('DATABASE_URL in .env.local is not set to a real branch.');
}

const host = url.match(/@([^/?]+)/)?.[1] ?? '(unparsed)';
console.log('\n[db:migrate:local] Applying migrations to: ' + host);

const migrationFiles = [
  'src/db/migrations/0001_add_preferences.sql',
  'src/db/migrations/0002_add_user_stats.sql',
  'src/db/migrations/0003_identity_additive.sql',
];

try {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  for (const file of migrationFiles) {
    const ddl = fs.readFileSync(file, 'utf8');
    // Strip line comments BEFORE splitting on ';' — a comment may legitimately
    // contain a ';' (prose) that would otherwise break a statement in two.
    const statements = ddl
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await sql.query(stmt);
    }
    console.log('[db:migrate:local] applied: ' + file);
  }
  console.log('[db:migrate:local] schema ready.\n');
} catch (e) {
  fail('Failed to apply migrations:\n  ' + (e?.message ?? e));
}
