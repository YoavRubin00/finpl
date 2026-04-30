-- Bandit Multi-Armed Bandit A/B testing — global variant state.
-- Each row = one variant of one experiment, aggregated across ALL users.
-- Updated atomically via INSERT ... ON CONFLICT DO UPDATE on bandit events.

CREATE TABLE IF NOT EXISTS "bandit_variants" (
	"experiment_id" TEXT NOT NULL,
	"variant_id" TEXT NOT NULL,
	"alpha" INTEGER NOT NULL DEFAULT 1,
	"beta" INTEGER NOT NULL DEFAULT 1,
	"impressions" INTEGER NOT NULL DEFAULT 0,
	"conversions" INTEGER NOT NULL DEFAULT 0,
	"updated_at" TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT "bandit_variants_pk" PRIMARY KEY ("experiment_id", "variant_id")
);

CREATE INDEX IF NOT EXISTS "idx_bandit_experiment" ON "bandit_variants" USING btree ("experiment_id");