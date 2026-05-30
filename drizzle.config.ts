import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

// Drizzle-kit doesn't auto-load env files; pull from .env.local (then .env)
// so `drizzle-kit push|generate|introspect` work without a wrapper command.
dotenv.config({ path: '.env.local' });
dotenv.config();

export default {
  out: './src/db',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
