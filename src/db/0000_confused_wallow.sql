-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"auth_id" text NOT NULL,
	"display_name" text,
	"email" text,
	"avatar_url" text,
	"level" integer DEFAULT 1,
	"xp" integer DEFAULT 0,
	"coins" integer DEFAULT 0,
	"gems" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_active_date" date,
	"is_pro" boolean DEFAULT false,
	"pro_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_profiles_auth_id_key" UNIQUE("auth_id"),
	CONSTRAINT "user_profiles_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "module_progress" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"module_name" text,
	"status" text DEFAULT 'not_started',
	"quiz_score" integer,
	"quiz_attempts" integer DEFAULT 0,
	"best_score" integer DEFAULT 0,
	"xp_earned" integer DEFAULT 0,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "module_progress_user_id_module_id_key" UNIQUE("user_id","module_id"),
	CONSTRAINT "module_progress_status_check" CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text]))
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text,
	"quantity" integer DEFAULT 1,
	"is_active" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"acquired_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	CONSTRAINT "inventory_user_id_item_id_key" UNIQUE("user_id","item_id"),
	CONSTRAINT "inventory_item_type_check" CHECK (item_type = ANY (ARRAY['chest'::text, 'streak_multiplier'::text, 'booster'::text, 'cosmetic'::text]))
);
--> statement-breakpoint
CREATE TABLE "ai_mentor_usage" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"usage_date" date DEFAULT CURRENT_DATE NOT NULL,
	"request_count" integer DEFAULT 1,
	CONSTRAINT "ai_mentor_usage_user_id_usage_date_key" UNIQUE("user_id","usage_date")
);
--> statement-breakpoint
CREATE TABLE "paper_portfolio" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_symbol" text NOT NULL,
	"asset_name" text,
	"quantity" numeric(18, 8) DEFAULT '0',
	"avg_buy_price" numeric(18, 2) DEFAULT '0',
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "paper_portfolio_user_id_asset_symbol_key" UNIQUE("user_id","asset_symbol")
);
--> statement-breakpoint
CREATE TABLE "paper_trades" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_symbol" text NOT NULL,
	"asset_name" text,
	"trade_type" text NOT NULL,
	"quantity" numeric(18, 8) NOT NULL,
	"price_at_execution" numeric(18, 2) NOT NULL,
	"total_value" numeric(18, 2) NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "paper_trades_trade_type_check" CHECK (trade_type = ANY (ARRAY['BUY'::text, 'SELL'::text]))
);
--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_mentor_usage" ADD CONSTRAINT "ai_mentor_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_portfolio" ADD CONSTRAINT "paper_portfolio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_module_progress_user" ON "module_progress" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_user" ON "inventory" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user_date" ON "ai_mentor_usage" USING btree ("user_id" date_ops,"usage_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_paper_portfolio_user" ON "paper_portfolio" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_paper_trades_user" ON "paper_trades" USING btree ("user_id" uuid_ops);
*/