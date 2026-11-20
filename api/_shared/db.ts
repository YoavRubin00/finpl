// api/_shared/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

function createDb(url: string) {
  return drizzle(neon(url));
}

export type Db = ReturnType<typeof createDb>;

// One client per warm function instance instead of one per request. The
// neon-http driver is stateless (every query is its own HTTPS call over the
// runtime's keep-alive pool), so sharing it across requests is safe; this just
// skips rebuilding the drizzle wrapper on every hit. Keyed by URL so a changed
// DATABASE_URL can never be served by a stale client.
let cached: { url: string; db: Db } | null = null;

export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!cached || cached.url !== url) {
    cached = { url, db: createDb(url) };
  }
  return cached.db;
}
