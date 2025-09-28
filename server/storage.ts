import {
  users, games, clips, likes, comments, userGameFavorites, follows, messages, profileBanners,
  monthlyLeaderboard, weeklyLeaderboard, topContributors, userPointsHistory, notifications, userBadges, contentFilterSettings, bannedWords,
  heroTextSettings, bannerSettings, clipMentions, commentMentions, screenshotCommentMentions,
  type User, type InsertUser,
  type Game, type InsertGame,
  type Clip, type InsertClip,
  type Like, type InsertLike,
  type Comment, type InsertComment,
  type UserGameFavorite, type InsertUserGameFavorite,
  type Follow, type InsertFollow,
  type Message, type InsertMessage,
  type UserBlock, type InsertUserBlock,
  type ProfileBanner,
  type MonthlyLeaderboard, type InsertMonthlyLeaderboard,
  type WeeklyLeaderboard, type InsertWeeklyLeaderboard,
  type TopContributor, type InsertTopContributor,
  type UserPointsHistory, type InsertUserPointsHistory,
  type Notification, type InsertNotification,
  type UserBadge, type InsertUserBadge,
  type ContentFilterSettings, type InsertContentFilterSettings,
  type BannedWord, type InsertBannedWord,
  type HeroTextSettings, type InsertHeroTextSettings,
  type BannerSettings, type InsertBannerSettings,
  type ClipMention, type InsertClipMention,
  type CommentMention, type InsertCommentMention,
  type ScreenshotCommentMention, type InsertScreenshotCommentMention,
  type ClipWithUser,
  type CommentWithUser,
  type UserWithStats,
  type UserWithBadges,
  type Badge, type InsertBadge,
  type BadgeWithStats,
  type Screenshot, type InsertScreenshot,
  type InsertScreenshot as InsertScreenshotData
} from "@shared/schema";

export interface IStorage {
  // Session store
  sessionStore: any;

  // User operations
  getUser(id: number): Promise<User | null>;
  getUserById(id: number): Promise<User | null>; // Alias for getUser for mention service compatibility
  getUserByUsername(username: string): Promise<User | null>;
  getUsersByUsernames(usernames: string[]): Promise<User[]>; // For bulk username validation
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
  getUserWithStats(id: number): Promise<UserWithStats | null>;
  getFeaturedUsers(limit?: number): Promise<User[]>;

  // Admin operations
  getAllUsers(limit?: number, offset?: number, search?: string): Promise<UserWithBadges[]>;
  getUserCount(search?: string): Promise<number>;
  getAdminCount(): Promise<number>;
  getClipCount(): Promise<number>;
  getGameCount(): Promise<number>;
  getAllClips(limit?: number, offset?: number, currentUserId?: number): Promise<ClipWithUser[]>;
  getUserTypeDistribution(): Promise<{type: string, count: number}[]>;
  getAgeRangeDistribution(): Promise<{range: string, count: number}[]>;
  getTopGames(limit?: number): Promise<Game[]>;
  getRecentClips(limit?: number): Promise<ClipWithUser[]>;

  // Game operations
  getGame(id: number): Promise<Game | null>;
  getGameByName(name: string): Promise<Game | null>;
  getGameByTwitchId(twitchId: string): Promise<Game | null>;
  createGame(game: InsertGame): Promise<Game>;
  getAllGames(): Promise<Game[]>;
  getTrendingGames(limit?: number): Promise<Game[]>;

  // Clip operations
  getClip(id: number): Promise<Clip | null>;
  getClipWithUser(id: number): Promise<ClipWithUser | null>;
  createClip(clipData: InsertClip): Promise<Clip>;
  createClipWithId(clipData: InsertClip & { id: number }): Promise<Clip>;
  updateClip(id: number, clip: Partial<Clip>): Promise<Clip | null>;
  updateClipDuration(id: number, duration: number): Promise<boolean>;
  deleteClip(id: number): Promise<boolean>;
  incrementClipViews(id: number): Promise<void>;
  incrementScreenshotViews(id: number): Promise<void>;
  getClipsByUserId(userId: number): Promise<ClipWithUser[]>;
  getClipsByGameId(gameId: number, limit?: number): Promise<ClipWithUser[]>;
  getClipsWithDuration(duration: number): Promise<Clip[]>;
  getFeedClips(period?: string, limit?: number): Promise<ClipWithUser[]>;
  getTrendingClips(period: string, limit: number, gameId?: number, currentUserId?: number): Promise<ClipWithUser[]>;
  getTrendingReels(period: string, limit: number, gameId?: number, currentUserId?: number): Promise<ClipWithUser[]>;
  getLatestReels(limit: number, currentUserId?: number): Promise<ClipWithUser[]>;
  getClipById(id: number): Promise<ClipWithUser | null>;

  // Like operations
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: number, clipId: number): Promise<boolean>;
  getLikesByClipId(clipId: number): Promise<Like[]>;
  getLikesByUserId(userId: number): Promise<Like[]>;
  hasUserLikedClip(userId: number, clipId: number): Promise<boolean>;

  // Comment operations
  getComment(id: number): Promise<Comment | null>;
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByClipId(clipId: number): Promise<CommentWithUser[]>;
  deleteComment(id: number): Promise<boolean>;

  // Mention operations
  createClipMention(mention: InsertClipMention): Promise<ClipMention>;
  createCommentMention(mention: InsertCommentMention): Promise<CommentMention>;
  createScreenshotCommentMention(mention: InsertScreenshotCommentMention): Promise<ScreenshotCommentMention>;

  // User game favorites operations
  addUserGameFavorite(favorite: InsertUserGameFavorite): Promise<UserGameFavorite>;
  removeUserGameFavorite(userId: number, gameId: number): Promise<boolean>;
  getUserGameFavorites(userId: number): Promise<Game[]>;

  // Follow operations
  createFollow(follow: InsertFollow): Promise<Follow>;
  deleteFollow(followerId: number, followingId: number): Promise<boolean>;
  getFollowersByUserId(userId: number): Promise<User[]>;
  getFollowingByUserId(userId: number): Promise<User[]>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowerCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;

  // Follow request operations
  createFollowRequest(requesterId: number, requestedId: number): Promise<void>;
  getPendingFollowRequests(userId: number): Promise<any[]>;
  getFollowRequest(requestId: number): Promise<any>;
  hasFollowRequest(requesterId: number, requestedId: number): Promise<string | null>;
  acceptFollowRequest(requestId: number): Promise<boolean>;
  declineFollowRequest(requestId: number): Promise<boolean>;
  removeFollowRequest(requesterId: number, requestedId: number): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(messageId: number, senderId: number): Promise<boolean>;
  deleteConversationHistory(userId1: number, userId2: number): Promise<boolean>;
  getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]>;
  getConversations(userId: number): Promise<any[]>;
  markMessagesAsRead(currentUserId: number, otherUserId: number): Promise<void>;

  // User blocking operations
  blockUser(blockerId: number, blockedId: number): Promise<UserBlock>;
  unblockUser(blockerId: number, blockedId: number): Promise<boolean>;
  getBlockedUsers(userId: number): Promise<User[]>;
  isUserBlocked(userId1: number, userId2: number): Promise<boolean>;

  // Search operations
  searchUsers(query: string): Promise<User[]>;
  searchGames(query: string): Promise<Game[]>;
  searchClips(query: string): Promise<ClipWithUser[]>;

  // Profile customization operations
  getAllProfileBanners(): Promise<ProfileBanner[]>;
  getProfileBannersByCategory(category: string): Promise<ProfileBanner[]>;

  // Leaderboard operations
  addUserPointsHistory(pointsHistory: InsertUserPointsHistory): Promise<UserPointsHistory>;
  getMonthlyLeaderboardEntry(userId: number, month: string, year: number): Promise<MonthlyLeaderboard | null>;
  createMonthlyLeaderboardEntry(entry: InsertMonthlyLeaderboard): Promise<MonthlyLeaderboard>;
  updateMonthlyLeaderboardEntry(id: number, updates: Partial<MonthlyLeaderboard>): Promise<MonthlyLeaderboard | null>;
  getMonthlyLeaderboard(month: string, year: number, limit?: number): Promise<(MonthlyLeaderboard & { user: User })[]>;
  recalculateMonthlyRankings(month: string, year: number): Promise<void>;
  
  // Weekly leaderboard operations
  getWeeklyLeaderboardEntry(userId: number, week: string, year: number): Promise<WeeklyLeaderboard | null>;
  createWeeklyLeaderboardEntry(entry: InsertWeeklyLeaderboard): Promise<WeeklyLeaderboard>;
  updateWeeklyLeaderboardEntry(id: number, updates: Partial<WeeklyLeaderboard>): Promise<WeeklyLeaderboard | null>;
  getWeeklyLeaderboard(week: string, year: number, limit?: number): Promise<(WeeklyLeaderboard & { user: User })[]>;
  recalculateWeeklyRankings(week: string, year: number): Promise<void>;
  
  // Top contributors operations
  createTopContributor(contributor: InsertTopContributor): Promise<TopContributor>;
  getTopContributors(periodType: string, limit?: number): Promise<(TopContributor & { user: User })[]>;
  getTopContributorsByPeriod(periodType: string, period: string, year: number): Promise<(TopContributor & { user: User })[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  getNotification(id: number): Promise<any>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  markNotificationAsRead(id: number): Promise<boolean>;
  getFollowRequestByUsers(requesterId: number, addresseeId: number): Promise<any>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  deleteAllNotifications(userId: number): Promise<boolean>;

  // Badge definition operations
  createBadge(badge: InsertBadge): Promise<Badge>;
  getAllBadges(): Promise<Badge[]>;
  getActiveBadges(): Promise<Badge[]>;
  getBadge(id: number): Promise<Badge | null>;
  getBadgeByName(name: string): Promise<Badge | null>;
  updateBadge(id: number, badge: Partial<Badge>): Promise<Badge | null>;
  deleteBadge(id: number): Promise<boolean>;
  getBadgesWithStats(): Promise<BadgeWithStats[]>;

  // User badge operations
  createUserBadge(badge: InsertUserBadge): Promise<UserBadge>;
  getUserBadges(userId: number): Promise<UserBadge[]>;
  deleteBadgesByType(userId: number, badgeType: string): Promise<boolean>;
  deleteUserBadge(badgeId: number): Promise<boolean>;
  cleanupExpiredBadges(): Promise<void>;
  updateUserLoginTime(userId: number, additionalMinutes: number): Promise<void>;
  processNewcomerBadge(userId: number): Promise<void>;

  // Content filtering operations
  getContentFilterSettings(fieldName?: string): Promise<ContentFilterSettings[]>;
  updateContentFilterSettings(fieldName: string, settings: Partial<ContentFilterSettings>): Promise<ContentFilterSettings | null>;
  createContentFilterSettings(settings: InsertContentFilterSettings): Promise<ContentFilterSettings>;

  // Banned words operations
  getAllBannedWords(): Promise<BannedWord[]>;
  getActiveBannedWords(): Promise<BannedWord[]>;
  addBannedWord(word: InsertBannedWord): Promise<BannedWord>;
  removeBannedWord(word: string): Promise<boolean>;
  deactivateBannedWord(word: string): Promise<boolean>;
  reactivateBannedWord(word: string): Promise<boolean>;
  getBannedWord(word: string): Promise<BannedWord | null>;

  // Banner settings operations
  getBannerSettings(): Promise<BannerSettings | null>;
  updateBannerSettings(settings: Partial<BannerSettings>): Promise<BannerSettings | null>;
  createBannerSettings(settings: InsertBannerSettings): Promise<BannerSettings>;

  // Screenshot operations
  getScreenshot(id: number): Promise<Screenshot | null>;
  getScreenshotByShareCode(shareCode: string): Promise<Screenshot | null>;
  getAllScreenshots(limit?: number, offset?: number): Promise<Array<{
    id: number;
    title: string;
    description?: string | null;
    imageUrl: string;
    thumbnailUrl?: string | null;
    views: number;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
    gameId?: number | null;
    user: { id: number; username: string; displayName: string; avatarUrl?: string | null } | null;
    game?: { id: number; name: string; boxArtUrl?: string | null } | null;
  }>>;
  getScreenshotCount(): Promise<number>;
  createScreenshot(screenshotData: InsertScreenshotData): Promise<Screenshot>;
  createScreenshotWithId(screenshotData: InsertScreenshotData & { id: number }): Promise<Screenshot>;
  updateScreenshot(id: number, screenshot: Partial<Screenshot>): Promise<Screenshot | null>;
  deleteScreenshot(id: number): Promise<boolean>;
  getScreenshotsByClipId(clipId: number): Promise<Screenshot[]>;


  // Content reporting operations
  createClipReport(report: any): Promise<any>;
  createScreenshotReport(report: any): Promise<any>;
  getClipReportsByClipId(clipId: number): Promise<any[]>;
  getScreenshotReportsByScreenshotId(screenshotId: number): Promise<any[]>;
  getAllReports(status?: string): Promise<any[]>;
  updateClipReportStatus(id: number, status: string, reviewedBy?: number): Promise<any>;
  updateScreenshotReportStatus(id: number, status: string, reviewedBy?: number): Promise<any>;
  updateCommentReportStatus(id: number, status: string, reviewedBy?: number): Promise<any>;

  // Hero text settings operations
  getHeroTextSettings(textType: string): Promise<HeroTextSettings | null>;
  updateHeroTextSettings(textType: string, settings: { title: string; subtitle: string; updatedBy: number }): Promise<HeroTextSettings>;

  // Leaderboard operations
  getEngagementLeaderboard(limit?: number): Promise<Array<{
    user: User;
    likesReceived: number;
    commentsReceived: number;
    clipsUploaded: number;
    totalScore: number;
    rank: number;
  }>>;

  // Recommendation operations
  getRecommendedClips(userId: number, limit?: number): Promise<ClipWithUser[]>;

  // Unified content moderation operations  
  getRecentContent(limit?: number, offset?: number, contentType?: string): Promise<Array<{
    id: number;
    type: 'clip' | 'reel' | 'screenshot';
    title: string;
    description?: string | null;
    user: { id: number; username: string; displayName: string };
    game?: { id: number; name: string };
    createdAt: Date;
    url: string;
    thumbnailUrl?: string | null;
    views: number;
  }>>;
  getRecentContentCount(contentType?: string): Promise<number>;
}

// Use DatabaseStorage with Supabase - no fallback to in-memory storage
import { DatabaseStorage } from "./database-storage";

// Ensure DATABASE_URL is set for Supabase connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please configure your Supabase database connection.");
}

// Ensure Supabase storage is configured
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Supabase storage environment variables must be set. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.");
}

// Always use DatabaseStorage with Supabase - no local database files or media storage
export const storage = new DatabaseStorage();

console.log('🔒 Storage initialized in Supabase-only mode - no local storage fallbacks enabled');