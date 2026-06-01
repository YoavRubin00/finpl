// scripts/sql.mjs
// Ad-hoc SQL runner for verification against the TEST-BRANCH DATABASE_URL in .env.local.
// usage: node scripts/sql.mjs "SELECT count(*) FROM user_profiles"
import fs from 'node:fs';

const query = process.argv[2];
if (!query) { console.error('usage: node scripts/sql.mjs "<SQL>"'); process.exit(1); }

let raw = '';
try { raw = fs.readFileSync('.env.local', 'utf8'); } catch { console.error('No .env.local'); process.exit(1); }
const url = (raw.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
if (!url) { console.error('DATABASE_URL not set in .env.local'); process.exit(1); }

const host = url.match(/@([^/?]+)/)?.[1] ?? '(unparsed)';
console.log(`[sql] host=${host}`);
const { neon } = await import('@neondatabase/serverless');
const sql = neon(url);
const rows = await sql.query(query);
console.log(JSON.stringify(rows, null, 2));
