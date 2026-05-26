// scripts/dev-local.mjs
// Pre-flight for `npm run dev:local`: validate .env.local has a real DATABASE_URL
// and print the DB host so you can confirm it's your Neon TEST branch — never prod.
// (Schema setup is a separate one-time command: `npm run db:migrate:local`.)
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
    + 'AUTH_JWT_SECRET, BACKFILL_V1_ENABLED=true, EXPO_PUBLIC_API_URL=http://localhost:5050');
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
console.log('────────────────────────────────────────────\n');
