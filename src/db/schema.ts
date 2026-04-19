import { pgTable, unique, uuid, text, integer, date, boolean, timestamp, index, foreignKey, check, jsonb, numeric } from "drizzle-orm/pg-core"
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

export const inventory = pgTable("inventory", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	itemType: text("item_type").notNull(),
	itemId: text("item_id").notNull(),
	itemName: text("item_name"),
	quantity: integer().default(1),
	isActive: boolean("is_active").default(false),
	metadata: jsonb().default({}),
	acquiredAt: timestamp("acquired_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_inventory_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "inventory_user_id_fkey"
		}).onDelete("cascade"),
	unique("inventory_user_id_item_id_key").on(table.userId, table.itemId),
	check("inventory_item_type_check", sql`item_type = ANY (ARRAY['chest'::text, 'streak_multiplier'::text, 'booster'::text, 'cosmetic'::text])`),
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
	userId: text("user_id"),
	message: text("message").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
