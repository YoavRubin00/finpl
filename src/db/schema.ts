import { pgTable, unique, uuid, text, integer, date, boolean, timestamp, index, foreignKey, check, jsonb, numeric, serial, bigserial, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const userProfiles = pgTable("user_profiles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	authId: text("auth_id").notNull(),
	displayName: text("display_name"),
	email: text(),
	avatarUrl: text("avatar_url"),
	level: integer().default(1),
	xp: integer().default(0),
	coins: integer().default(0),
	gems: integer().default(0),
	currentStreak: integer("current_streak").default(0),
	longestStreak: integer("longest_streak").default(0),
	lastActiveDate: date("last_active_date"),
	isPro: boolean("is_pro").default(false),
	welcomeEmailSent: boolean("welcome_email_sent").default(false),
	tipEmailSent: boolean("tip_email_sent").default(false),
	proExpiresAt: timestamp("pro_expires_at", { withTimezone: true, mode: 'string' }),
	dailyEmailSentAt: timestamp("daily_email_sent_at", { withTimezone: true, mode: 'string' }),
	dailyEmailEnabled: boolean("daily_email_enabled").default(true),
	syncToken: text("sync_token"),
	preferences: jsonb("preferences"),
	virtualBalance: numeric("virtual_balance", { precision: 18, scale: 2 }).default('100000').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("user_profiles_auth_id_key").on(table.authId),
	unique("user_profiles_email_key").on(table.email),
]);

export const moduleProgress = pgTable("module_progress", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	moduleId: text("module_id").notNull(),
	moduleName: text("module_name"),
	status: text().default('not_started'),
	quizScore: integer("quiz_score"),
	quizAttempts: integer("quiz_attempts").default(0),
	bestScore: integer("best_score").default(0),
	xpEarned: integer("xp_earned").default(0),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_module_progress_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "module_progress_user_id_fkey"
		}).onDelete("cascade"),
	unique("module_progress_user_id_module_id_key").on(table.userId, table.moduleId),
	check("module_progress_status_check", sql`status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])`),
]);

export const aiMentorUsage = pgTable("ai_mentor_usage", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	usageDate: date("usage_date").default(sql`CURRENT_DATE`).notNull(),
	requestCount: integer("request_count").default(1),
}, (table) => [
	index("idx_ai_usage_user_date").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.usageDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "ai_mentor_usage_user_id_fkey"
		}).onDelete("cascade"),
	unique("ai_mentor_usage_user_id_usage_date_key").on(table.userId, table.usageDate),
]);

export const paperPortfolio = pgTable("paper_portfolio", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	assetSymbol: text("asset_symbol").notNull(),
	assetName: text("asset_name"),
	quantity: numeric({ precision: 18, scale:  8 }).default('0'),
	avgBuyPrice: numeric("avg_buy_price", { precision: 18, scale:  2 }).default('0'),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_paper_portfolio_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "paper_portfolio_user_id_fkey"
		}).onDelete("cascade"),
	unique("paper_portfolio_user_id_asset_symbol_key").on(table.userId, table.assetSymbol),
]);

export const paperTrades = pgTable("paper_trades", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	assetSymbol: text("asset_symbol").notNull(),
	assetName: text("asset_name"),
	tradeType: text("trade_type").notNull(),
	quantity: numeric({ precision: 18, scale:  8 }).notNull(),
	priceAtExecution: numeric("price_at_execution", { precision: 18, scale:  2 }).notNull(),
	totalValue: numeric("total_value", { precision: 18, scale:  2 }).notNull(),
	executedAt: timestamp("executed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_paper_trades_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "paper_trades_user_id_fkey"
		}).onDelete("cascade"),
	check("paper_trades_trade_type_check", sql`trade_type = ANY (ARRAY['BUY'::text, 'SELL'::text])`),
]);

export const userFeedback = pgTable("user_feedback", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	message: text("message").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_feedback_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "user_feedback_user_id_fkey"
		}).onDelete("cascade"),
]);

// Inbox for "פנו אלינו לתמיכה" Shark chat. Each row is one user-submitted
// support message; status defaults to 'new' for the ops dashboard.
export const supportMessages = pgTable("support_messages", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	userEmail: text("user_email"),
	message: text("message").notNull(),
	platform: text("platform"),
	appVersion: text("app_version"),
	status: text("status").default('new').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_support_messages_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_support_messages_created").using("btree", table.createdAt.desc().nullsLast()),
	index("idx_support_messages_status").using("btree", table.status.asc().nullsLast()),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "support_messages_user_id_fkey"
		}).onDelete("set null"),
	check("support_messages_status_check", sql`status IN ('new', 'in_progress', 'resolved')`),
]);

export const bridgeClicks = pgTable("bridge_clicks", {
	id: serial().primaryKey(),
	benefitId: text("benefit_id").notNull(),
	userId: uuid("user_id"),
	userEmail: text("user_email"),
	action: text("action").notNull(),
	platform: text("platform"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_bridge_clicks_benefit").using("btree", table.benefitId.asc()),
	index("idx_bridge_clicks_time").using("btree", table.createdAt.desc()),
	index("idx_bridge_clicks_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "bridge_clicks_user_id_fkey"
		}).onDelete("set null"),
	check("bridge_clicks_action_check", sql`action = ANY (ARRAY['redeem'::text, 'link_open'::text])`),
]);

export const crowdQuestionVotes = pgTable("crowd_question_votes", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	questionId: text("question_id").notNull(),
	choice: text().notNull(),
	voteDateIl: date("vote_date_il").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cq_votes_question_date").using("btree", table.questionId.asc(), table.voteDateIl.asc()),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "crowd_question_votes_user_id_fkey"
		}).onDelete("cascade"),
	unique("crowd_question_votes_user_date_key").on(table.userId, table.voteDateIl),
	check("crowd_question_votes_choice_check", sql`choice = ANY (ARRAY['a'::text, 'b'::text])`),
]);

export const banditVariants = pgTable("bandit_variants", {
	experimentId: text("experiment_id").notNull(),
	variantId: text("variant_id").notNull(),
	alpha: integer().notNull().default(1),
	beta: integer().notNull().default(1),
	impressions: integer().notNull().default(0),
	conversions: integer().notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("bandit_variants_pk").on(table.experimentId, table.variantId),
	index("idx_bandit_experiment").using("btree", table.experimentId.asc()),
]);

export const coinEvents = pgTable("coin_events", {
	id: bigserial({ mode: 'number' }).primaryKey().notNull(),
	authId: text("auth_id").notNull(),
	amount: integer().notNull(),
	source: text().notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	index("idx_coin_events_user_date").using("btree", table.authId.asc(), table.grantedAt.asc()),
	index("idx_coin_events_auth_source_date").using("btree", table.authId.asc(), table.source.asc(), table.grantedAt.desc()),
	check("coin_events_amount_check", sql`amount > 0`),
	check("coin_events_source_check", sql`source = ANY (ARRAY['lesson'::text, 'quiz'::text, 'daily-quest'::text, 'signup-bonus'::text, 'referral-signup-bonus'::text, 'referral-dividend'::text])`),
]);

export const dividendCollections = pgTable("dividend_collections", {
	authId: text("auth_id").notNull(),
	dateCollected: date("date_collected").notNull(),
	amount: integer().notNull(),
	collectedAt: timestamp("collected_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	primaryKey({ columns: [table.authId, table.dateCollected], name: "dividend_collections_pkey" }),
	check("dividend_collections_amount_check", sql`amount >= 0`),
]);

export const referrals = pgTable("referrals", {
	refereeAuthId: text("referee_auth_id").primaryKey().notNull(),
	referrerAuthId: text("referrer_auth_id").notNull(),
	inviteCode: text("invite_code").notNull(),
	signupBonusPaid: boolean("signup_bonus_paid").notNull().default(false),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
	referrerLocalCredited: boolean("referrer_local_credited").notNull().default(false),
}, (table) => [
	index("idx_referrals_referrer").using("btree", table.referrerAuthId.asc()),
	index("idx_referrals_code").using("btree", table.inviteCode.asc()),
	check("referrals_check", sql`referrer_auth_id <> referee_auth_id`),
]);

// Breaking News — per-user tickers the user follows for daily AI summaries.
export const breakingNewsTracked = pgTable("breaking_news_tracked", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	ticker: text().notNull(),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	unique("breaking_news_tracked_user_ticker_uniq").on(table.userId, table.ticker),
	index("idx_breaking_news_tracked_ticker").using("btree", table.ticker.asc()),
	foreignKey({ columns: [table.userId], foreignColumns: [userProfiles.id], name: "breaking_news_tracked_user_fk" }).onDelete("cascade"),
]);

// Daily News Challenge — one row per day, shared by all users. Generated by
// the 07:00 IL cron from Tavily news + Gemini paraphrase + Higgsfield images.
// `items` is a JSONB array of 2 news items (headline, image, question, etc.).
export const dailyNewsChallenge = pgTable("daily_news_challenge", {
	id: serial().primaryKey().notNull(),
	dateKey: text("date_key").notNull(),
	heroTitle: text("hero_title").notNull(),
	heroImageUrl: text("hero_image_url"),
	items: jsonb().notNull(),
	sourcesUsed: jsonb("sources_used").notNull().default(sql`'[]'::jsonb`),
	isFallback: boolean("is_fallback").default(false),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	unique("daily_news_challenge_date_uniq").on(table.dateKey),
	index("idx_daily_news_challenge_date").using("btree", table.dateKey.desc()),
]);

// Breaking News — global cache of AI summaries keyed by (ticker, trading_day).
// Shared across all users so we pay Tavily+Gemini once per ticker per day.
export const breakingNewsSummaries = pgTable("breaking_news_summaries", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	ticker: text().notNull(),
	tradingDay: date("trading_day").notNull(),
	summaryText: text("summary_text").notNull(),
	hypeIndex: integer("hype_index").notNull(),
	sentiment: text().notNull(),
	keyEvents: jsonb("key_events").notNull().default(sql`'[]'::jsonb`),
	sources: jsonb().notNull().default(sql`'[]'::jsonb`),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	unique("breaking_news_summaries_ticker_day_uniq").on(table.ticker, table.tradingDay),
	index("idx_breaking_news_summaries_ticker_day").using("btree", table.ticker.asc(), table.tradingDay.desc()),
	check("breaking_news_summaries_hype_check", sql`hype_index BETWEEN 0 AND 100`),
	check("breaking_news_summaries_sentiment_check", sql`sentiment IN ('bullish', 'bearish', 'neutral')`),
]);

export const userStats = pgTable("user_stats", {
  userId: uuid("user_id").primaryKey().notNull(),
  totalSessionSeconds: integer("total_session_seconds").default(0).notNull(),
  moduleDurations: jsonb("module_durations").default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [userProfiles.id],
    name: "user_stats_user_id_fkey"
  }).onDelete("cascade"),
]);
