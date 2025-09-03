import { pgTable, foreignKey, serial, integer, timestamp, text, unique, boolean, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const follows = pgTable("follows", {
	id: serial().primaryKey().notNull(),
	followerId: integer("follower_id").notNull(),
	followingId: integer("following_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "follows_follower_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "follows_following_id_users_id_fk"
		}),
]);

export const followRequests = pgTable("follow_requests", {
	id: serial().primaryKey().notNull(),
	requesterId: integer("requester_id").notNull(),
	requestedId: integer("requested_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.requesterId],
			foreignColumns: [users.id],
			name: "follow_requests_requester_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.requestedId],
			foreignColumns: [users.id],
			name: "follow_requests_requested_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const likes = pgTable("likes", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	clipId: integer("clip_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "likes_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clipId],
			foreignColumns: [clips.id],
			name: "likes_clip_id_clips_id_fk"
		}),
]);

export const comments = pgTable("comments", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	clipId: integer("clip_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comments_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clipId],
			foreignColumns: [clips.id],
			name: "comments_clip_id_clips_id_fk"
		}),
]);

export const userGameFavorites = pgTable("user_game_favorites", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	gameId: integer("game_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_game_favorites_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "user_game_favorites_game_id_games_id_fk"
		}),
]);

export const profileBanners = pgTable("profile_banners", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	imageUrl: text("image_url").notNull(),
	category: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const games = pgTable("games", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	twitchId: text("twitch_id"),
}, (table) => [
	unique("games_name_unique").on(table.name),
]);

export const gameStats = pgTable("game_stats", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	gameId: integer("game_id").notNull(),
	statName: text("stat_name").notNull(),
	statValue: text("stat_value").notNull(),
	verified: boolean().default(false).notNull(),
	verificationImage: text("verification_image"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "game_stats_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "game_stats_game_id_games_id_fk"
		}),
]);

export const monthlyLeaderboard = pgTable("monthly_leaderboard", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	month: text().notNull(),
	year: integer().notNull(),
	uploadsCount: integer("uploads_count").default(0).notNull(),
	likesGivenCount: integer("likes_given_count").default(0).notNull(),
	commentsCount: integer("comments_count").default(0).notNull(),
	totalPoints: integer("total_points").default(0).notNull(),
	rank: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "monthly_leaderboard_user_id_users_id_fk"
		}),
]);

export const clips = pgTable("clips", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	gameId: integer("game_id"),
	title: text().notNull(),
	description: text(),
	videoUrl: text("video_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	duration: integer(),
	views: integer().default(0).notNull(),
	tags: text().array(),
	filter: text().default('none'),
	trimStart: integer("trim_start").default(0),
	trimEnd: integer("trim_end").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	videoType: text("video_type").default('clip'),
	shareCode: text("share_code"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "clips_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "clips_game_id_games_id_fk"
		}),
]);

export const userPointsHistory = pgTable("user_points_history", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	action: text().notNull(),
	points: integer().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_points_history_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	email: text(),
	emailVerified: boolean("email_verified").default(false),
	displayName: text("display_name").notNull(),
	bio: text(),
	avatarUrl: text("avatar_url"),
	bannerUrl: text("banner_url").default('/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg'),
	accentColor: text("accent_color").default('#4C8'),
	primaryColor: text("primary_color").default('#02172C'),
	backgroundColor: text("background_color").default('#0B2232'),
	cardColor: text("card_color").default('#1E3A8A'),
	layoutStyle: text("layout_style").default('grid'),
	steamUsername: text("steam_username"),
	xboxUsername: text("xbox_username"),
	playstationUsername: text("playstation_username"),
	twitterUsername: text("twitter_username"),
	youtubeUsername: text("youtube_username"),
	userType: text("user_type"),
	ageRange: text("age_range"),
	role: text().default('user').notNull(),
	status: text().default('active').notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	bannedReason: text("banned_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	discordUsername: text("discord_username"),
	epicUsername: text("epic_username"),
	nintendoUsername: text("nintendo_username"),
	authProvider: text("auth_provider").default('local'),
	externalId: text("external_id"),
	totalLoginTime: integer("total_login_time").default(0).notNull(),
	messagingEnabled: boolean("messaging_enabled").default(true),
	isPrivate: boolean("is_private").default(false).notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	fromUserId: integer("from_user_id"),
	clipId: integer("clip_id"),
	commentId: integer("comment_id"),
	actionUrl: text("action_url"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "notifications_from_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clipId],
			foreignColumns: [clips.id],
			name: "notifications_clip_id_clips_id_fk"
		}),
	foreignKey({
			columns: [table.commentId],
			foreignColumns: [comments.id],
			name: "notifications_comment_id_comments_id_fk"
		}),
]);

export const screenshots = pgTable("screenshots", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	gameId: integer("game_id"),
	title: text().notNull(),
	description: text(),
	imageUrl: text("image_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	tags: text().array(),
	views: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	shareCode: text("share_code"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "screenshots_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "screenshots_game_id_games_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	sid: text().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	senderId: integer("sender_id").notNull(),
	receiverId: integer("receiver_id").notNull(),
	content: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.receiverId],
			foreignColumns: [users.id],
			name: "messages_receiver_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userBlocks = pgTable("user_blocks", {
	id: serial().primaryKey().notNull(),
	blockerId: integer("blocker_id").notNull(),
	blockedId: integer("blocked_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.blockerId],
			foreignColumns: [users.id],
			name: "user_blocks_blocker_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.blockedId],
			foreignColumns: [users.id],
			name: "user_blocks_blocked_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const clipReactions = pgTable("clip_reactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	clipId: integer("clip_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	emoji: text().notNull(),
	positionX: integer("position_x").default(50).notNull(),
	positionY: integer("position_y").default(50).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clipId],
			foreignColumns: [clips.id],
			name: "clip_reactions_clip_id_clips_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "clip_reactions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const emailVerificationTokens = pgTable("email_verification_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "email_verification_tokens_user_id_users_id_fk"
		}),
]);

export const contentFilterSettings = pgTable("content_filter_settings", {
	id: serial().primaryKey().notNull(),
	fieldName: text("field_name").notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	maxLength: integer("max_length"),
	allowProfanity: boolean("allow_profanity").default(false).notNull(),
	cleanAutomatically: boolean("clean_automatically").default(false).notNull(),
	updatedBy: integer("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "content_filter_settings_updated_by_users_id_fk"
		}),
	unique("content_filter_settings_field_name_unique").on(table.fieldName),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_users_id_fk"
		}),
]);

export const userBadges = pgTable("user_badges", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	badgeType: text("badge_type").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	assignedBy: text("assigned_by").notNull(),
	assignedById: integer("assigned_by_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_badges_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedById],
			foreignColumns: [users.id],
			name: "user_badges_assigned_by_id_users_id_fk"
		}),
]);

export const bannedWords = pgTable("banned_words", {
	id: serial().primaryKey().notNull(),
	word: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	addedBy: integer("added_by").notNull(),
	reason: text(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "banned_words_added_by_users_id_fk"
		}),
	unique("banned_words_word_unique").on(table.word),
]);
