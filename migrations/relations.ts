import { relations } from "drizzle-orm/relations";
import { users, follows, likes, clips, comments, userGameFavorites, games, gameStats, monthlyLeaderboard, userPointsHistory, notifications, screenshots, messages, userBlocks, clipReactions, emailVerificationTokens, contentFilterSettings, passwordResetTokens, userBadges, bannedWords } from "./schema";

export const followsRelations = relations(follows, ({one}) => ({
	user_followerId: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: "follows_followerId_users_id"
	}),
	user_followingId: one(users, {
		fields: [follows.followingId],
		references: [users.id],
		relationName: "follows_followingId_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	follows_followerId: many(follows, {
		relationName: "follows_followerId_users_id"
	}),
	follows_followingId: many(follows, {
		relationName: "follows_followingId_users_id"
	}),
	likes: many(likes),
	comments: many(comments),
	userGameFavorites: many(userGameFavorites),
	gameStats: many(gameStats),
	monthlyLeaderboards: many(monthlyLeaderboard),
	clips: many(clips),
	userPointsHistories: many(userPointsHistory),
	notifications_userId: many(notifications, {
		relationName: "notifications_userId_users_id"
	}),
	notifications_fromUserId: many(notifications, {
		relationName: "notifications_fromUserId_users_id"
	}),
	screenshots: many(screenshots),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
	messages_receiverId: many(messages, {
		relationName: "messages_receiverId_users_id"
	}),
	userBlocks_blockerId: many(userBlocks, {
		relationName: "userBlocks_blockerId_users_id"
	}),
	userBlocks_blockedId: many(userBlocks, {
		relationName: "userBlocks_blockedId_users_id"
	}),
	clipReactions: many(clipReactions),
	emailVerificationTokens: many(emailVerificationTokens),
	contentFilterSettings: many(contentFilterSettings),
	passwordResetTokens: many(passwordResetTokens),
	userBadges_userId: many(userBadges, {
		relationName: "userBadges_userId_users_id"
	}),
	userBadges_assignedById: many(userBadges, {
		relationName: "userBadges_assignedById_users_id"
	}),
	bannedWords: many(bannedWords),
}));

export const likesRelations = relations(likes, ({one}) => ({
	user: one(users, {
		fields: [likes.userId],
		references: [users.id]
	}),
	clip: one(clips, {
		fields: [likes.clipId],
		references: [clips.id]
	}),
}));

export const clipsRelations = relations(clips, ({one, many}) => ({
	likes: many(likes),
	comments: many(comments),
	user: one(users, {
		fields: [clips.userId],
		references: [users.id]
	}),
	game: one(games, {
		fields: [clips.gameId],
		references: [games.id]
	}),
	notifications: many(notifications),
	clipReactions: many(clipReactions),
}));

export const commentsRelations = relations(comments, ({one, many}) => ({
	user: one(users, {
		fields: [comments.userId],
		references: [users.id]
	}),
	clip: one(clips, {
		fields: [comments.clipId],
		references: [clips.id]
	}),
	notifications: many(notifications),
}));

export const userGameFavoritesRelations = relations(userGameFavorites, ({one}) => ({
	user: one(users, {
		fields: [userGameFavorites.userId],
		references: [users.id]
	}),
	game: one(games, {
		fields: [userGameFavorites.gameId],
		references: [games.id]
	}),
}));

export const gamesRelations = relations(games, ({many}) => ({
	userGameFavorites: many(userGameFavorites),
	gameStats: many(gameStats),
	clips: many(clips),
	screenshots: many(screenshots),
}));

export const gameStatsRelations = relations(gameStats, ({one}) => ({
	user: one(users, {
		fields: [gameStats.userId],
		references: [users.id]
	}),
	game: one(games, {
		fields: [gameStats.gameId],
		references: [games.id]
	}),
}));

export const monthlyLeaderboardRelations = relations(monthlyLeaderboard, ({one}) => ({
	user: one(users, {
		fields: [monthlyLeaderboard.userId],
		references: [users.id]
	}),
}));

export const userPointsHistoryRelations = relations(userPointsHistory, ({one}) => ({
	user: one(users, {
		fields: [userPointsHistory.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user_userId: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notifications_userId_users_id"
	}),
	user_fromUserId: one(users, {
		fields: [notifications.fromUserId],
		references: [users.id],
		relationName: "notifications_fromUserId_users_id"
	}),
	clip: one(clips, {
		fields: [notifications.clipId],
		references: [clips.id]
	}),
	comment: one(comments, {
		fields: [notifications.commentId],
		references: [comments.id]
	}),
}));

export const screenshotsRelations = relations(screenshots, ({one}) => ({
	user: one(users, {
		fields: [screenshots.userId],
		references: [users.id]
	}),
	game: one(games, {
		fields: [screenshots.gameId],
		references: [games.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
	user_receiverId: one(users, {
		fields: [messages.receiverId],
		references: [users.id],
		relationName: "messages_receiverId_users_id"
	}),
}));

export const userBlocksRelations = relations(userBlocks, ({one}) => ({
	user_blockerId: one(users, {
		fields: [userBlocks.blockerId],
		references: [users.id],
		relationName: "userBlocks_blockerId_users_id"
	}),
	user_blockedId: one(users, {
		fields: [userBlocks.blockedId],
		references: [users.id],
		relationName: "userBlocks_blockedId_users_id"
	}),
}));

export const clipReactionsRelations = relations(clipReactions, ({one}) => ({
	clip: one(clips, {
		fields: [clipReactions.clipId],
		references: [clips.id]
	}),
	user: one(users, {
		fields: [clipReactions.userId],
		references: [users.id]
	}),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({one}) => ({
	user: one(users, {
		fields: [emailVerificationTokens.userId],
		references: [users.id]
	}),
}));

export const contentFilterSettingsRelations = relations(contentFilterSettings, ({one}) => ({
	user: one(users, {
		fields: [contentFilterSettings.updatedBy],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const userBadgesRelations = relations(userBadges, ({one}) => ({
	user_userId: one(users, {
		fields: [userBadges.userId],
		references: [users.id],
		relationName: "userBadges_userId_users_id"
	}),
	user_assignedById: one(users, {
		fields: [userBadges.assignedById],
		references: [users.id],
		relationName: "userBadges_assignedById_users_id"
	}),
}));

export const bannedWordsRelations = relations(bannedWords, ({one}) => ({
	user: one(users, {
		fields: [bannedWords.addedBy],
		references: [users.id]
	}),
}));