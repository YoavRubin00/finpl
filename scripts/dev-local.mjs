// scripts/dev-local.mjs
// Safety guard for `npm run dev:local`. Reads .env.local, refuses to start
// unless DATABASE_URL is set to a real (non-placeholder) value, and prints the
// DB host so you can confirm it's your Neon TEST branch — never prod.
import fs from 'node:fs';

let raw = '';
try {
  raw = fs.readFileSync('.env.local', 'utf8');
} catch {
  console.error('\n[dev:local] No .env.local found.');
  console.error('Create it with DATABASE_URL (Neon p0-test branch), AUTH_JWT_SECRET,');
  console.error('BACKFILL_V1_ENABLED=true, EXPO_PUBLIC_API_URL=http://localhost:3000\n');
  process.exit(1);
}

const url = (raw.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim();

if (!url || url.includes('REPLACE_ME')) {
  console.error('\n[dev:local] DATABASE_URL in .env.local is not set.');
  console.error('Paste your Neon p0-test BRANCH connection string (NOT prod) and rerun.\n');
  process.exit(1);
}

const host = url.match(/@([^/?]+)/)?.[1] ?? '(unparsed)';
const apiUrl = (raw.match(/^EXPO_PUBLIC_API_URL=(.*)$/m)?.[1] ?? '').trim();

console.log('\n────────────────────────────────────────────');
console.log('[dev:local] Local API database host:');
console.log('   ' + host);
console.log('   ↳ confirm this is your TEST branch, not prod.');
console.log('[dev:local] App will call API at: ' + (apiUrl || '(default)'));
console.log('────────────────────────────────────────────\n');
