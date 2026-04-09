import type { Config } from 'drizzle-kit';

export default {
  out: './src/db',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
