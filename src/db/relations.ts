import { relations } from "drizzle-orm/relations";
import { userProfiles, moduleProgress, inventory, aiMentorUsage, paperPortfolio, paperTrades } from "./schema";

export const moduleProgressRelations = relations(moduleProgress, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [moduleProgress.userId],
		references: [userProfiles.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({many}) => ({
	moduleProgresses: many(moduleProgress),
	inventories: many(inventory),
	aiMentorUsages: many(aiMentorUsage),
	paperPortfolios: many(paperPortfolio),
	paperTrades: many(paperTrades),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [inventory.userId],
		references: [userProfiles.id]
	}),
}));

export const aiMentorUsageRelations = relations(aiMentorUsage, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [aiMentorUsage.userId],
		references: [userProfiles.id]
	}),
}));

export const paperPortfolioRelations = relations(paperPortfolio, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [paperPortfolio.userId],
		references: [userProfiles.id]
	}),
}));

export const paperTradesRelations = relations(paperTrades, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [paperTrades.userId],
		references: [userProfiles.id]
	}),
}));