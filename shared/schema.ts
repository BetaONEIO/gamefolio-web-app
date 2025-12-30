import { pgTable, text, serial, integer, boolean, timestamp, json, unique, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url").default("/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg"),
  // Customization options
  accentColor: text("accent_color").default("#4C8"), // Default green accent
  primaryColor: text("primary_color").default("#02172C"), // Default navy primary
  backgroundColor: text("background_color").default("#0B2232"), // Default navy background
  cardColor: text("card_color").default("#1E3A8A"), // Default card background
  avatarBorderColor: text("avatar_border_color").default("#4ADE80"), // Default avatar border color
  layoutStyle: text("layout_style").default("grid"), // grid, masonry, classic
  // Platform connections
  steamUsername: text("steam_username"),
  xboxUsername: text("xbox_username"),
  playstationUsername: text("playstation_username"),
  twitterUsername: text("twitter_username"),  // X/Twitter
  youtubeUsername: text("youtube_username"),  // YouTube
  discordUsername: text("discord_username"),  // Discord
  epicUsername: text("epic_username"),        // Epic Games
  nintendoUsername: text("nintendo_username"), // Nintendo
  instagramUsername: text("instagram_username"), // Instagram
  facebookUsername: text("facebook_username"), // Facebook
  // Onboarding data for analytics and personalization
  userType: text("user_type"), // User type selection
  showUserType: boolean("show_user_type").default(true), // Whether to show user type badge on profile
  ageRange: text("age_range"), // Age range: 13-17, 18-24, 25-34, 35-44, 45-54, 55+
  // Authentication provider fields
  authProvider: text("auth_provider").default("local"), // "local", "google", "discord", "steam"
  externalId: text("external_id"), // Provider-specific user ID
  // User status and role
  role: text("role").default("user").notNull(), // "user", "admin", "moderator"
  status: text("status").default("active").notNull(), // "active", "banned", "suspended"
  lastLoginAt: timestamp("last_login_at"),
  totalLoginTime: integer("total_login_time").default(0).notNull(), // Total time in minutes
  bannedReason: text("banned_reason"),
  // Privacy preferences
  messagingEnabled: boolean("messaging_enabled").default(true),
  isPrivate: boolean("is_private").default(false),
  // XP System
  totalXP: real("total_xp").default(0).notNull(), // Total experience points earned from views
  level: integer("level").default(1).notNull(), // User level based on XP
  // Login Streak System
  currentStreak: integer("current_streak").default(0).notNull(), // Current consecutive login days
  longestStreak: integer("longest_streak").default(0).notNull(), // Longest streak ever achieved
  lastStreakUpdate: timestamp("last_streak_update"), // Last date streak was updated
  // Crossmint Wallet
  walletAddress: text("wallet_address"),
  walletChain: text("wallet_chain").default("skale-nebula-testnet"),
  walletCreatedAt: timestamp("wallet_created_at"),
  // GF Token Balance
  gfTokenBalance: real("gf_token_balance").default(1000).notNull(), // Starting balance of 1000 GF tokens
  // Selected Avatar Border (from lootbox rewards)
  selectedAvatarBorderId: integer("selected_avatar_border_id"), // References asset_rewards table
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Games table
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  imageUrl: text("image_url"),
  twitchId: text("twitch_id"), // Twitch game ID for mapping
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clips table
export const clips = pgTable("clips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameId: integer("game_id").references(() => games.id),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  gameName: text("game_name"),
  gameImageUrl: text("game_image_url"),
  views: integer("views").default(0),
  filter: text("filter").default("none"),
  tags: text("tags").array(),
  duration: integer("duration").default(0),
  trimStart: integer("trim_start").default(0),
  trimEnd: integer("trim_end").default(0),
  videoType: text("video_type").default("clip"), // "clip" or "reel"
  ageRestricted: boolean("age_restricted").default(false).notNull(),
  shareCode: text("share_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Likes table
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  clipId: integer("clip_id").references(() => clips.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screenshot likes table (Added missing FKs)
export const screenshotLikes = pgTable("screenshot_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  screenshotId: integer("screenshot_id").references(() => screenshots.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clipId: integer("clip_id").notNull().references(() => clips.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screenshots table
export const screenshots = pgTable("screenshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameId: integer("game_id").references(() => games.id),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags").array(),
  views: integer("views").default(0),
  ageRestricted: boolean("age_restricted").default(false).notNull(),
  shareCode: text("share_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UserGameFavorites table
export const userGameFavorites = pgTable("user_game_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameId: integer("game_id").notNull().references(() => games.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game stats table - for tracking player achievements and stats
export const gameStats = pgTable("game_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameId: integer("game_id").notNull().references(() => games.id),
  statName: text("stat_name").notNull(),
  statValue: text("stat_value").notNull(),
  verified: boolean("verified").default(false).notNull(),
  verificationImage: text("verification_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Follows table
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate follows between the same two users
  uniqueFollow: unique().on(table.followerId, table.followingId),
}));

// Follow Requests table
export const followRequests = pgTable("follow_requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => users.id),
  addresseeId: integer("addressee_id").notNull().references(() => users.id),
  status: text("status").default("pending").notNull(), // "pending", "approved", "rejected"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User blocks table
export const userBlocks = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: integer("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Predefined banners for users to choose from
export const profileBanners = pgTable("profile_banners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // "abstract", "gaming", "esports", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Track which banners users have unlocked
export const userUnlockedBanners = pgTable("user_unlocked_banners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bannerId: integer("banner_id").notNull().references(() => profileBanners.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

export const insertUserUnlockedBannerSchema = createInsertSchema(userUnlockedBanners).omit({
  id: true,
  unlockedAt: true,
});

export type UserUnlockedBanner = typeof userUnlockedBanners.$inferSelect;
export type InsertUserUnlockedBanner = z.infer<typeof insertUserUnlockedBannerSchema>;

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Who receives the notification
  type: text("type").notNull(), // "like", "comment", "follow", "upload", "reply", "clip_mention", "comment_mention"
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  // References to related entities
  fromUserId: integer("from_user_id").references(() => users.id), // Who triggered the notification
  clipId: integer("clip_id").references(() => clips.id), // Related clip (if applicable)
  screenshotId: integer("screenshot_id").references(() => screenshots.id), // Related screenshot (if applicable)
  commentId: integer("comment_id").references(() => comments.id), // Related comment (if applicable)
  // Metadata for additional context (JSON format)
  metadata: json("metadata"), // For storing additional context like mention details
  // Metadata
  actionUrl: text("action_url"), // URL to navigate to when clicked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clip mentions table - for tracking user mentions in clip uploads
export const clipMentions = pgTable("clip_mentions", {
  id: serial("id").primaryKey(),
  clipId: integer("clip_id").notNull().references(() => clips.id, { onDelete: "cascade" }),
  mentionedUserId: integer("mentioned_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who was mentioned
  mentionedByUserId: integer("mentioned_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who created the mention
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comment mentions table - for tracking user mentions in comments
export const commentMentions = pgTable("comment_mentions", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  mentionedUserId: integer("mentioned_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who was mentioned
  mentionedByUserId: integer("mentioned_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who created the mention
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screenshot comment mentions table - for tracking user mentions in screenshot comments
export const screenshotCommentMentions = pgTable("screenshot_comment_mentions", {
  id: serial("id").primaryKey(),
  screenshotCommentId: integer("screenshot_comment_id").notNull().references(() => screenshotComments.id, { onDelete: "cascade" }),
  mentionedUserId: integer("mentioned_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who was mentioned
  mentionedByUserId: integer("mentioned_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who created the mention
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  token: text("token").notNull(), // Unique token for email verification
  code: text("code").notNull(), // 6-digit verification code
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Allow multiple codes per user but only track the most recent one
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Emoji reactions table
export const clipReactions = pgTable("clip_reactions", {
  id: serial("id").primaryKey(),
  clipId: integer("clip_id").notNull().references(() => clips.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(), // The emoji character (e.g., "❤️", "🔥", "😂")
  positionX: integer("position_x").notNull().default(50), // Position on video (0-100)
  positionY: integer("position_y").notNull().default(50), // Position on video (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screenshot comments table
export const screenshotComments = pgTable("screenshot_comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  screenshotId: integer("screenshot_id").notNull().references(() => screenshots.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screenshot reactions table (Added missing FKs)
export const screenshotReactions = pgTable("screenshot_reactions", {
  id: serial("id").primaryKey(),
  screenshotId: integer("screenshot_id").notNull().references(() => screenshots.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(), // The emoji character (e.g., "❤️", "🔥", "😂")
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comment reports table for moderation
export const commentReports = pgTable("comment_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  screenshotCommentId: integer("screenshot_comment_id").references(() => screenshotComments.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  additionalMessage: text("additional_message"),
  status: text("status").default("pending").notNull(), // "pending", "reviewed", "dismissed", "action_taken"
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clip reports table for content moderation
export const clipReports = pgTable("clip_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clipId: integer("clip_id").notNull().references(() => clips.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  additionalMessage: text("additional_message"),
  status: text("status").default("pending").notNull(), // "pending", "reviewed", "dismissed", "action_taken"
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Screenshot reports table for content moderation
export const screenshotReports = pgTable("screenshot_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  screenshotId: integer("screenshot_id").notNull().references(() => screenshots.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  additionalMessage: text("additional_message"),
  status: text("status").default("pending").notNull(), // "pending", "reviewed", "dismissed", "action_taken"
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NFT Watchlist table - for tracking NFTs users want to watch
export const nftWatchlist = pgTable("nft_watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nftId: integer("nft_id").notNull(), // NFT identifier (for now just the ID from the NFT collection)
  nftName: text("nft_name").notNull(),
  nftImage: text("nft_image").notNull(),
  nftPrice: real("nft_price").notNull(), // GF token price when added to watchlist
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate watchlist entries for the same user and NFT
  uniqueWatchlist: unique().on(table.userId, table.nftId),
}));

// Content filter settings and custom banned words table
export const contentFilterSettings = pgTable("content_filter_settings", {
  id: serial("id").primaryKey(),
  fieldName: text("field_name").notNull().unique(), // "comments", "messages", "bio", "displayName", etc.
  isEnabled: boolean("is_enabled").default(true).notNull(),
  maxLength: integer("max_length"),
  allowProfanity: boolean("allow_profanity").default(false).notNull(),
  cleanAutomatically: boolean("clean_automatically").default(false).notNull(),
  updatedBy: integer("updated_by").references(() => users.id), // Admin who last updated
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom banned words table for persistent storage
export const bannedWords = pgTable("banned_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  addedBy: integer("added_by").notNull().references(() => users.id), // Admin who added the word
  reason: text("reason"), // Optional reason for banning the word
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Site-wide banner settings table
export const bannerSettings = pgTable("banner_settings", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  title: text("title").default("Alpha Stage").notNull(),
  message: text("message").default("This app is currently in Alpha. You may encounter issues while using it.").notNull(),
  linkText: text("link_text").default("report a bug"),
  linkUrl: text("link_url").default("/contact"),
  variant: text("variant").default("primary").notNull(), // "primary", "warning", "info", "danger"
  showIcon: boolean("show_icon").default(true).notNull(),
  isDismissible: boolean("is_dismissible").default(true).notNull(),
  updatedBy: integer("updated_by").references(() => users.id), // Admin who last updated
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User uploaded banners table for banner history
export const uploadedBanners = pgTable("uploaded_banners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bannerUrl: text("banner_url").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting a user
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for password reset request
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Schema for password reset confirmation
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Schema for email verification
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// Types
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerification = z.infer<typeof emailVerificationSchema>;

// Schema for inserting a game
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a clip
export const insertClipSchema = createInsertSchema(clips).omit({
  id: true,
  views: true,
  createdAt: true,
}).extend({
  shareCode: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional(),
  tags: z.array(z.string().max(50, "Each tag must be 50 characters or less")).max(20, "Maximum 20 tags allowed").optional(),
});

// Schema for inserting a like
export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a comment
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a screenshot
export const insertScreenshotSchema = createInsertSchema(screenshots).omit({
  id: true,
  views: true,
  createdAt: true,
}).extend({
  shareCode: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional(),
  tags: z.array(z.string().max(50, "Each tag must be 50 characters or less")).max(20, "Maximum 20 tags allowed").optional(),
});

// Schema for inserting a user game favorite
export const insertUserGameFavoriteSchema = createInsertSchema(userGameFavorites).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a follow
export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a follow request
export const insertFollowRequestSchema = createInsertSchema(followRequests).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Schema for inserting a user block
export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({
  id: true,
  createdAt: true,
});



// Schema for inserting a game stat
export const insertGameStatSchema = createInsertSchema(gameStats).omit({
  id: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting a profile banner
export const insertProfileBannerSchema = createInsertSchema(profileBanners).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a notification
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Schema for inserting content filter settings
export const insertContentFilterSettingsSchema = createInsertSchema(contentFilterSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting banned words
export const insertBannedWordSchema = createInsertSchema(bannedWords).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

// Schema for inserting banner settings
export const insertBannerSettingsSchema = createInsertSchema(bannerSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for content filtering
export type ContentFilterSettings = typeof contentFilterSettings.$inferSelect;
export type InsertContentFilterSettings = typeof contentFilterSettings.$inferInsert;
export type BannedWord = typeof bannedWords.$inferSelect;
export type InsertBannedWord = typeof bannedWords.$inferInsert;

// Types for banner settings
export type BannerSettings = typeof bannerSettings.$inferSelect;
export type InsertBannerSettings = typeof bannerSettings.$inferInsert;

// Schema for inserting uploaded banners
export const insertUploadedBannerSchema = createInsertSchema(uploadedBanners).omit({
  id: true,
  createdAt: true,
});

// Types for uploaded banners
export type UploadedBanner = typeof uploadedBanners.$inferSelect;
export type InsertUploadedBanner = z.infer<typeof insertUploadedBannerSchema>;

// Sessions table for express-session with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { mode: 'date' }).notNull(),
});

// Monthly Leaderboard table
export const monthlyLeaderboard = pgTable("monthly_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  month: text("month").notNull(), // Format: "2024-01", "2024-02", etc.
  year: integer("year").notNull(),
  uploadsCount: integer("uploads_count").default(0).notNull(),
  likesGivenCount: integer("likes_given_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  firesGivenCount: integer("fires_given_count").default(0).notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  totalPoints: real("total_points").default(0).notNull(),
  rank: integer("rank").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserMonth: unique().on(table.userId, table.month, table.year),
}));

// User Points History table
export const userPointsHistory = pgTable("user_points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // "upload", "like", "comment", "fire"
  points: real("points").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User XP History table - tracks XP earned from clip views
export const userXPHistory = pgTable("user_xp_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clipId: integer("clip_id").notNull().references(() => clips.id),
  xpAmount: integer("xp_amount").notNull(), // XP earned (1 XP per view)
  viewCount: integer("view_count").notNull(), // The view count milestone that triggered this XP
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Weekly Leaderboard table
export const weeklyLeaderboard = pgTable("weekly_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  week: text("week").notNull(), // Format: "2024-W01", "2024-W02", etc.
  year: integer("year").notNull(),
  uploadsCount: integer("uploads_count").default(0).notNull(),
  likesGivenCount: integer("likes_given_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  firesGivenCount: integer("fires_given_count").default(0).notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  totalPoints: real("total_points").default(0).notNull(),
  rank: integer("rank").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserWeek: unique().on(table.userId, table.week, table.year),
}));

// Top Contributors table - stores historical winners when periods end
export const topContributors = pgTable("top_contributors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  periodType: text("period_type").notNull(), // "weekly" or "monthly"
  period: text("period").notNull(), // Format: "2024-W01" for weekly, "2024-01" for monthly
  year: integer("year").notNull(),
  totalPoints: real("total_points").notNull(),
  uploadsCount: integer("uploads_count").default(0).notNull(),
  likesGivenCount: integer("likes_given_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  firesGivenCount: integer("fires_given_count").default(0).notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(), // When they achieved this top position
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting monthly leaderboard entries
export const insertMonthlyLeaderboardSchema = createInsertSchema(monthlyLeaderboard).omit({
  id: true,
  rank: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting user points history
export const insertUserPointsHistorySchema = createInsertSchema(userPointsHistory).omit({
  id: true,
}).partial({ createdAt: true }); // Make createdAt optional for historic migrations

// Schema for inserting user XP history
export const insertUserXPHistorySchema = createInsertSchema(userXPHistory).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting weekly leaderboard entries
export const insertWeeklyLeaderboardSchema = createInsertSchema(weeklyLeaderboard).omit({
  id: true,
  rank: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting top contributors
export const insertTopContributorSchema = createInsertSchema(topContributors).omit({
  id: true,
  achievedAt: true,
  createdAt: true,
});

// Schema for inserting clip reactions
export const insertClipReactionSchema = createInsertSchema(clipReactions).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting screenshot comments
export const insertScreenshotCommentSchema = createInsertSchema(screenshotComments).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting screenshot reactions
export const insertScreenshotReactionSchema = createInsertSchema(screenshotReactions).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting comment reports
export const insertCommentReportSchema = createInsertSchema(commentReports).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

// Schema for inserting clip reports
export const insertClipReportSchema = createInsertSchema(clipReports).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

// Schema for inserting screenshot reports
export const insertScreenshotReportSchema = createInsertSchema(screenshotReports).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

// Badges definition table - stores custom badge types
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Badge name like "Newcomer", "Founder", etc.
  description: text("description"), // Optional description
  imageUrl: text("image_url"), // Badge image/icon URL
  textColor: text("text_color").default("#FFFFFF").notNull(), // Text color for badge
  backgroundColor: text("background_color").default("#6B7280").notNull(), // Background color
  isActive: boolean("is_active").default(true).notNull(), // Whether badge can be assigned
  isSystemBadge: boolean("is_system_badge").default(false).notNull(), // System badges vs custom badges
  createdBy: integer("created_by").references(() => users.id), // Admin who created the badge
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User badges table - links users to their badges
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  assignedBy: text("assigned_by").notNull(), // "system" or "admin"
  assignedById: integer("assigned_by_id").references(() => users.id), // ID of admin who assigned (if manually assigned)
  expiresAt: timestamp("expires_at"), // For automatic expiration (e.g., newcomer badge)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting badges
export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting user badges
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  createdAt: true,
});

// Rarity tiers for asset rewards
export const rarityTiers = ["common", "rare", "epic", "legendary"] as const;
export type RarityTier = typeof rarityTiers[number];

// Asset types for categorizing where rewards are used
export const assetTypes = ["avatar_border", "profile_banner", "profile_background", "badge", "emoji", "sound_effect", "xp_reward", "gf_tokens", "other"] as const;
export type AssetType = typeof assetTypes[number];

// Asset rewards table for loot box rewards
export const assetRewards = pgTable("asset_rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  assetType: text("asset_type").notNull().default("other"), // avatar_border, profile_banner, profile_background, badge, emoji, sound_effect, xp_reward, gf_tokens, other
  rarity: text("rarity").notNull().default("common"), // common, rare, epic, legendary
  unlockChance: real("unlock_chance").notNull().default(10), // Percentage chance (0-100)
  rewardValue: integer("reward_value"), // For consumable rewards like XP or GF tokens - the amount to grant
  timesRewarded: integer("times_rewarded").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Asset reward claims - tracks who received which rewards
export const assetRewardClaims = pgTable("asset_reward_claims", {
  id: serial("id").primaryKey(),
  rewardId: integer("reward_id").notNull().references(() => assetRewards.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
});

// Hero text settings table for customizable homepage text
export const heroTextSettings = pgTable("hero_text_settings", {
  id: serial("id").primaryKey(),
  textType: text("text_type").notNull(), // "experienced_users" - for users who have uploaded content
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  buttonText: text("button_text"), // Optional button text
  buttonUrl: text("button_url"), // Optional button URL/path
  targetAudience: text("target_audience").notNull().default("experienced_users"), // "new_users", "existing_users", "users_with_content", "all_users"
  isActive: boolean("is_active").default(true).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema for inserting hero text settings
export const insertHeroTextSettingsSchema = createInsertSchema(heroTextSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting asset rewards
export const insertAssetRewardSchema = createInsertSchema(assetRewards).omit({
  id: true,
  timesRewarded: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting asset reward claims
export const insertAssetRewardClaimSchema = createInsertSchema(assetRewardClaims).omit({
  id: true,
  claimedAt: true,
});

// Daily lootbox tracking table
export const userDailyLootbox = pgTable("user_daily_lootbox", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastOpenedAt: timestamp("last_opened_at").defaultNow().notNull(),
  rewardId: integer("reward_id").references(() => assetRewards.id),
  openCount: integer("open_count").default(1).notNull(),
});

// Schema for inserting daily lootbox record
export const insertUserDailyLootboxSchema = createInsertSchema(userDailyLootbox).omit({
  id: true,
});



// Extended types for frontend use
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MonthlyLeaderboard = typeof monthlyLeaderboard.$inferSelect;
export type InsertMonthlyLeaderboard = z.infer<typeof insertMonthlyLeaderboardSchema>;
export type WeeklyLeaderboard = typeof weeklyLeaderboard.$inferSelect;
export type InsertWeeklyLeaderboard = z.infer<typeof insertWeeklyLeaderboardSchema>;
export type TopContributor = typeof topContributors.$inferSelect;
export type InsertTopContributor = z.infer<typeof insertTopContributorSchema>;
export type UserPointsHistory = typeof userPointsHistory.$inferSelect;
export type InsertUserPointsHistory = z.infer<typeof insertUserPointsHistorySchema>;
export type UserXPHistory = typeof userXPHistory.$inferSelect;
export type InsertUserXPHistory = z.infer<typeof insertUserXPHistorySchema>;
export type ClipReaction = typeof clipReactions.$inferSelect;
export type InsertClipReaction = z.infer<typeof insertClipReactionSchema>;

export type ScreenshotComment = typeof screenshotComments.$inferSelect;
export type InsertScreenshotComment = z.infer<typeof insertScreenshotCommentSchema>;

export type ScreenshotReaction = typeof screenshotReactions.$inferSelect;
export type InsertScreenshotReaction = z.infer<typeof insertScreenshotReactionSchema>;

export type CommentReport = typeof commentReports.$inferSelect;
export type InsertCommentReport = z.infer<typeof insertCommentReportSchema>;

export type ClipReport = typeof clipReports.$inferSelect;
export type InsertClipReport = z.infer<typeof insertClipReportSchema>;

export type ScreenshotReport = typeof screenshotReports.$inferSelect;
export type InsertScreenshotReport = z.infer<typeof insertScreenshotReportSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type Clip = typeof clips.$inferSelect;
export type InsertClip = z.infer<typeof insertClipSchema>;

export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type UserGameFavorite = typeof userGameFavorites.$inferSelect;
export type InsertUserGameFavorite = z.infer<typeof insertUserGameFavoriteSchema>;

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export type FollowRequest = typeof followRequests.$inferSelect;
export type InsertFollowRequest = z.infer<typeof insertFollowRequestSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type UserBlock = typeof userBlocks.$inferSelect;
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;

export type ProfileBanner = typeof profileBanners.$inferSelect;
export type InsertProfileBanner = z.infer<typeof insertProfileBannerSchema>;

export type Screenshot = typeof screenshots.$inferSelect;
export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

export type HeroTextSettings = typeof heroTextSettings.$inferSelect;
export type InsertHeroTextSettings = z.infer<typeof insertHeroTextSettingsSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Schema for inserting clip mentions
export const insertClipMentionSchema = createInsertSchema(clipMentions).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting comment mentions
export const insertCommentMentionSchema = createInsertSchema(commentMentions).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting screenshot comment mentions
export const insertScreenshotCommentMentionSchema = createInsertSchema(screenshotCommentMentions).omit({
  id: true,
  createdAt: true,
});

// Types for mentions
export type ClipMention = typeof clipMentions.$inferSelect;
export type InsertClipMention = z.infer<typeof insertClipMentionSchema>;

export type CommentMention = typeof commentMentions.$inferSelect;
export type InsertCommentMention = z.infer<typeof insertCommentMentionSchema>;

export type ScreenshotCommentMention = typeof screenshotCommentMentions.$inferSelect;
export type InsertScreenshotCommentMention = z.infer<typeof insertScreenshotCommentMentionSchema>;

// Schema for inserting NFT watchlist items
export const insertNftWatchlistSchema = createInsertSchema(nftWatchlist).omit({
  id: true,
  createdAt: true,
});

// Types for NFT watchlist
export type NftWatchlist = typeof nftWatchlist.$inferSelect;
export type InsertNftWatchlist = z.infer<typeof insertNftWatchlistSchema>;

// Extended types with relational data
export type ClipWithUser = Clip & {
  user: User;
  game?: Game;
  _count?: {
    likes: number;
    comments: number;
    reactions: number;
  };
};

export type ScreenshotLike = typeof screenshotLikes.$inferSelect;

export type CommentWithUser = Comment & {
  user: User;
};

export type ScreenshotCommentWithUser = ScreenshotComment & {
  user: User;
};

export type UserWithStats = User & {
  _count?: {
    followers: number;
    following: number;
    clips: number;
    clipViews: number;
    likesReceived: number;
    firesReceived: number;
  };
  favoriteGames?: Game[];
};

export type UserWithBadges = User & {
  badges: (UserBadge & { badge: Badge })[];
};

export type BadgeWithStats = Badge & {
  _count: {
    users: number;
  };
};

// Types for asset rewards
export type AssetReward = typeof assetRewards.$inferSelect;
export type InsertAssetReward = z.infer<typeof insertAssetRewardSchema>;
export type AssetRewardClaim = typeof assetRewardClaims.$inferSelect;
export type InsertAssetRewardClaim = z.infer<typeof insertAssetRewardClaimSchema>;
export type UserDailyLootbox = typeof userDailyLootbox.$inferSelect;
export type InsertUserDailyLootbox = z.infer<typeof insertUserDailyLootboxSchema>;

// Extended type for asset reward with claim info
export type AssetRewardWithClaims = AssetReward & {
  claims: (AssetRewardClaim & { user: User })[];
};