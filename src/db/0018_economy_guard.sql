-- 0018: server-side bounds on the client-reported economy (2026-11-20).
--
-- POST /api/sync/economy applied whatever coinsDelta / gemsDelta a signed-in
-- client sent, and POST /api/migrate/backfill-v1 set coins / gems / is_pro to
-- max(server, client). Coins unlock partner benefits in the Bridge, gems are
-- sold for real money. This migration adds the state the server needs to bound
-- them (logic: api/_shared/economyGuard.ts):
--
-- user_profiles.economy_guard          jsonb, NULL until the user's first coin
--                                      or gem change after this ships. Holds
--                                      per-hour free-credit counters (rolling
--                                      24h), the "returns" pool (coins/gems the
--                                      user spent, which may come back: trading
--                                      closes, refunds, gem→coin exchange) and
--                                      coins held back by a cap. Written only
--                                      by the server.
-- user_profiles.economy_guard_version  compare-and-swap counter: every guarded
--                                      write is "UPDATE … WHERE version = $read
--                                      AND coins/gems unchanged", so two
--                                      concurrent requests can't both spend the
--                                      same budget.
--   Neither column is declared in src/db/schema.ts on purpose: several
--   endpoints `select()` every declared column, and a column declared before
--   this file runs would break them. They are read and written with raw SQL.
--
-- bridge_redemptions   one row per (user, benefit): POST /api/bridge/redeem
--                      deducts the cost from the SERVER balance and inserts
--                      this row in the same statement. The primary key makes a
--                      replay or a double tap a no-op.
--
-- revenuecat_events    one row per RevenueCat webhook purchase event. A credited
--                      event carries the user id. An event the webhook could
--                      NOT credit (no matching account, an anonymous RevenueCat
--                      id, an unknown product) is kept too: user_id NULL, the
--                      raw RevenueCat id in app_user_id and the gems it is
--                      worth, so it can be credited by hand (the owner gets an
--                      email with the event id). The primary key (RevenueCat's
--                      event id) makes a redelivered webhook a no-op instead of
--                      a second credit. Account deletion sets user_id and
--                      app_user_id to NULL on that user's rows and clears
--                      app_user_id on unlinked rows holding their address or
--                      their profile id.
--
-- Additive + idempotent: safe to run twice, and every statement is safe on its
-- own (scripts/apply-sql.mjs sends them one by one, each with a 5 s lock
-- timeout). No rewrite of user_profiles (ADD COLUMN with a constant default is
-- metadata-only on Postgres 11+); each ALTER holds its lock for a moment only.
-- Run manually against the production database BEFORE the server deploy
-- (NOT drizzle-kit push: known schema drift):
--   node scripts/apply-sql.mjs src/db/0018_economy_guard.sql
-- Until it runs the new server still works: /api/sync/economy uses its
-- stateless fallback (the same rules without the 24 h counters),
-- /api/bridge/redeem answers 503, and the webhook credits without the
-- duplicate-event check (a purchase it cannot credit is only emailed to the
-- owner, not recorded).

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "economy_guard" jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "economy_guard_version" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "bridge_redemptions" (
  "user_id" uuid NOT NULL,
  "benefit_id" text NOT NULL,
  "cost_coins" integer NOT NULL,
  "redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "bridge_redemptions_pkey" PRIMARY KEY ("user_id", "benefit_id"),
  CONSTRAINT "bridge_redemptions_user_fk" FOREIGN KEY ("user_id")
    REFERENCES "user_profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "bridge_redemptions_cost_check" CHECK ("cost_coins" >= 0)
);

CREATE TABLE IF NOT EXISTS "revenuecat_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "user_id" uuid,
  "app_user_id" text,
  "event_type" text NOT NULL,
  "product_id" text,
  "gems" integer DEFAULT 0 NOT NULL,
  "coins" integer DEFAULT 0 NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "revenuecat_events_user_fk" FOREIGN KEY ("user_id")
    REFERENCES "user_profiles" ("id") ON DELETE SET NULL
);

-- For a database where an earlier draft of this file created the table
-- without the column (a no-op otherwise).
ALTER TABLE "revenuecat_events" ADD COLUMN IF NOT EXISTS "app_user_id" text;

CREATE INDEX IF NOT EXISTS "idx_revenuecat_events_user"
  ON "revenuecat_events" USING btree ("user_id");
