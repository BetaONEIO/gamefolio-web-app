import {
  User, InsertUser,
  Game, InsertGame,
  Clip, InsertClip,
  Like, InsertLike,
  Comment, InsertComment,
  UserGameFavorite, InsertUserGameFavorite,
  Follow, InsertFollow,
  FollowRequest, InsertFollowRequest,
  ProfileBanner,
  Screenshot, InsertScreenshot, ScreenshotLike,
  ClipReaction, InsertClipReaction,
  ScreenshotComment, InsertScreenshotComment,
  ScreenshotReaction, InsertScreenshotReaction,
  CommentReport, InsertCommentReport,
  ClipReport, InsertClipReport,
  ScreenshotReport, InsertScreenshotReport,
  Notification, InsertNotification,
  Message, InsertMessage,
  UserBlock, InsertUserBlock,
  UserBadge, InsertUserBadge,
  MonthlyLeaderboard, InsertMonthlyLeaderboard,
  WeeklyLeaderboard, InsertWeeklyLeaderboard,
  TopContributor, InsertTopContributor,
  UserPointsHistory, InsertUserPointsHistory,
  ContentFilterSettings, InsertContentFilterSettings,
  BannedWord, InsertBannedWord,
  BannerSettings, InsertBannerSettings,
  HeroTextSettings, InsertHeroTextSettings,
  ClipWithUser,
  CommentWithUser,
  ScreenshotCommentWithUser,
  UserWithStats,
  UserWithBadges,
  Badge, InsertBadge,
  BadgeWithStats,
  users,
  games,
  clips,
  likes,
  comments,
  userGameFavorites,
  follows,
  followRequests,
  profileBanners,
  screenshots,
  screenshotLikes,
  screenshotComments,
  screenshotReactions,
  clipReactions,
  commentReports,
  clipReports,
  screenshotReports,
  notifications,
  messages,
  userBlocks,
  userBadges,
  badges,
  monthlyLeaderboard,
  weeklyLeaderboard,
  topContributors,
  userPointsHistory,
  emailVerificationTokens,
  contentFilterSettings,
  bannedWords,
  heroTextSettings,
  bannerSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, ilike, asc, or, lt, gt, sql, arrayContains, ne, inArray, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { IStorage } from "./storage";
import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const PgSession = connectPgSimple(session);

// Password hashing utilities - CRITICAL SECURITY
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(password: string, hashedPassword: string | null | undefined): Promise<boolean> {
  if (!hashedPassword) {
    return false;
  }
  
  const [hash, salt] = hashedPassword.split('.');
  if (!hash || !salt) {
    return false;
  }
  
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hash, 'hex'), buf);
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // PRODUCTION-GRADE SESSION STORE using PostgreSQL connection string
    // This ensures session persistence across server restarts and supports clustering
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('🚨 CRITICAL: DATABASE_URL not configured for session store');
    }
    
    this.sessionStore = new PgSession({
      conString: connectionString, // Use DATABASE_URL connection string
      tableName: 'session', // Session table name
      createTableIfMissing: true, // Auto-create session table
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      errorLog: (error: Error) => {
        console.error('🚨 SESSION STORE ERROR:', error);
      }
    });
    console.log('✅ PRODUCTION SESSION STORE: PostgreSQL connect-pg-simple initialized with DATABASE_URL');
  }

  // User operations
  async getUser(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(ilike(users.username, username));
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || null;
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      // CRITICAL SECURITY: Hash password before storing
      const safeUserData = { ...userData };
      if (safeUserData.password) {
        console.log(`🔐 SECURITY: Hashing password for new user`);
        safeUserData.password = await hashPassword(safeUserData.password);
      }
      
      const userWithDefaults = {
        ...safeUserData,
        avatarUrl: safeUserData.avatarUrl || "/attached_assets/gamefolio social logo 3d circle web.png",
        bannerUrl: safeUserData.bannerUrl || "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg"
      };
      const [user] = await db.insert(users).values(userWithDefaults).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | null> {
    try {
      // CRITICAL SECURITY: Hash password if it's being updated
      const safeUserData = { ...userData };
      if (safeUserData.password) {
        console.log(`🔐 SECURITY: Hashing password for user ${id}`);
        safeUserData.password = await hashPassword(safeUserData.password);
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({ ...safeUserData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return null;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete all related data first to maintain referential integrity
      console.log(`Starting user deletion process for user ID: ${id}`);

      // Delete email verification tokens
      await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, id));
      console.log(`✅ Deleted email verification tokens for user ${id}`);

      // Delete user points history
      await db.delete(userPointsHistory).where(eq(userPointsHistory.userId, id));
      console.log(`✅ Deleted points history for user ${id}`);

      // Delete user badges
      await db.delete(userBadges).where(eq(userBadges.userId, id));
      console.log(`✅ Deleted badges for user ${id}`);

      // Delete user blocks (both as blocker and blocked)
      await db.delete(userBlocks).where(or(
        eq(userBlocks.blockerId, id),
        eq(userBlocks.blockedId, id)
      ));
      console.log(`✅ Deleted user blocks for user ${id}`);

      // Delete messages (both sent and received)
      await db.delete(messages).where(or(
        eq(messages.senderId, id),
        eq(messages.receiverId, id)
      ));
      console.log(`✅ Deleted messages for user ${id}`);

      // Delete notifications
      await db.delete(notifications).where(eq(notifications.userId, id));
      console.log(`✅ Deleted notifications for user ${id}`);

      // Delete follows (both as follower and following)
      await db.delete(follows).where(or(
        eq(follows.followerId, id),
        eq(follows.followingId, id)
      ));
      console.log(`✅ Deleted follows for user ${id}`);

      // Delete user game favorites
      await db.delete(userGameFavorites).where(eq(userGameFavorites.userId, id));
      console.log(`✅ Deleted game favorites for user ${id}`);

      // Delete likes made by the user
      await db.delete(likes).where(eq(likes.userId, id));
      console.log(`✅ Deleted likes for user ${id}`);

      // Delete comments made by the user
      await db.delete(comments).where(eq(comments.userId, id));
      console.log(`✅ Deleted comments for user ${id}`);

      // Delete clip reactions made by the user
      await db.delete(clipReactions).where(eq(clipReactions.userId, id));
      console.log(`✅ Deleted clip reactions for user ${id}`);

      // Delete screenshots uploaded by the user
      await db.delete(screenshots).where(eq(screenshots.userId, id));
      console.log(`✅ Deleted screenshots for user ${id}`);

      // Delete clips uploaded by the user (this will cascade delete related likes, comments, etc.)
      await db.delete(clips).where(eq(clips.userId, id));
      console.log(`✅ Deleted clips for user ${id}`);

      // Finally, delete the user
      const result = await db.delete(users).where(eq(users.id, id)).returning();

      if (result.length > 0) {
        console.log(`✅ Successfully deleted user ${id} and all related data`);
        return true;
      } else {
        console.log(`❌ User ${id} not found for deletion`);
        return false;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async getUserWithStats(id: number): Promise<UserWithStats | null> {
    const user = await this.getUser(id);
    if (!user) return null;

    // Get followers count
    const followersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, id));

    // Get following count
    const followingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, id));

    // Get clips count
    const clipsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(clips)
      .where(eq(clips.userId, id));

    // Get total views count
    const viewsResult = await db
      .select({ total: sql<number>`sum(${clips.views})` })
      .from(clips)
      .where(eq(clips.userId, id));

    // Get favorite games
    const favoriteGames = await this.getUserGameFavorites(id);

    const userWithStats: UserWithStats = {
      ...user,
      _count: {
        followers: followersCount[0].count || 0,
        following: followingCount[0].count || 0,
        clips: clipsCount[0].count || 0,
        clipViews: viewsResult[0].total || 0
      },
      favoriteGames
    };

    return userWithStats;
  }

  async getFeaturedUsers(limit: number = 6): Promise<User[]> {
    try {
      // Get the first few users to showcase the feature
      const featuredUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(limit);

      return featuredUsers;
    } catch (error) {
      console.error("Error getting featured users:", error);
      return [];
    }
  }

  // Game operations
  async getGame(id: number): Promise<Game | null> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || null;
  }

  async getGameByName(name: string): Promise<Game | null> {
    const [game] = await db.select().from(games).where(eq(games.name, name));
    return game || null;
  }

  async getGameByTwitchId(twitchId: string): Promise<Game | null> {
    const [game] = await db.select().from(games).where(eq(games.twitchId, twitchId));
    return game || null;
  }

  async createGame(gameData: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(gameData).returning();
    return game;
  }

  async getAllGames(): Promise<Game[]> {
    return db.select().from(games).orderBy(asc(games.name));
  }

  async getTrendingGames(limit: number = 10): Promise<Game[]> {
    try {
      // Just get all games and then sort them by highest ID (newest)
      const allGames = await db.select().from(games).orderBy(desc(games.id)).limit(limit);
      return allGames;
    } catch (error) {
      console.error("Error in getTrendingGames:", error);
      return [];
    }
  }

  // Clip operations
  async getClip(id: number): Promise<Clip | null> {
    const [clip] = await db.select().from(clips).where(eq(clips.id, id));
    return clip || null;
  }

  async getClipWithUser(id: number): Promise<ClipWithUser | null> {
    try {
      const result = await db
        .select({
          clip: clips,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            emailVerified: users.emailVerified,
          },
          game: {
            id: games.id,
            name: games.name,
            imageUrl: games.imageUrl,
            twitchId: games.twitchId,
            createdAt: games.createdAt,
          }
        })
        .from(clips)
        .leftJoin(users, eq(clips.userId, users.id))
        .leftJoin(games, eq(clips.gameId, games.id))
        .where(eq(clips.id, id))
        .limit(1);

      if (result.length === 0) return null;

      const { clip, user, game } = result[0];

      // Get engagement counts
      const [likesResult, commentsResult, reactionsResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.clipId, id)),
        db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.clipId, id)),
        db.select({ count: sql<number>`count(*)` }).from(clipReactions).where(eq(clipReactions.clipId, id))
      ]);

      return {
        ...clip,
        user: user?.id ? { ...user } : null,
        game: game?.id ? { ...game } : null,
        _count: {
          likes: parseInt(likesResult[0]?.count.toString() || '0'),
          comments: parseInt(commentsResult[0]?.count.toString() || '0')
        }
      };
    } catch (error) {
      console.error('Error getting clip with user:', error);
      return null;
    }
  }

  async getClipById(id: number): Promise<ClipWithUser | null> {
    const result = await this.getClipWithUser(id);
    return result || null;
  }

  async createClip(clipData: InsertClip): Promise<Clip> {
    const [clip] = await db.insert(clips).values(clipData).returning();
    return clip;
  }

  async updateClip(id: number, clipData: Partial<Clip>): Promise<Clip | null> {
    const [updatedClip] = await db
      .update(clips)
      .set(clipData)
      .where(eq(clips.id, id))
      .returning();
    return updatedClip || null;
  }

  async updateClipDuration(id: number, duration: number): Promise<boolean> {
    try {
      await db
        .update(clips)
        .set({ duration })
        .where(eq(clips.id, id));
      return true;
    } catch (error) {
      console.error('Error updating clip duration:', error);
      return false;
    }
  }

  async getClipsWithDuration(duration: number): Promise<Clip[]> {
    return await db.select().from(clips).where(eq(clips.duration, duration));
  }

  async deleteClip(id: number): Promise<boolean> {
    try {
      // First delete associated likes and comments
      await db.delete(likes).where(eq(likes.clipId, id));
      await db.delete(comments).where(eq(comments.clipId, id));

      // Then delete the clip
      const result = await db.delete(clips).where(eq(clips.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting clip:", error);
      return false;
    }
  }

  async incrementClipViews(id: number): Promise<void> {
    await db
      .update(clips)
      .set({ views: sql`${clips.views} + 1` })
      .where(eq(clips.id, id));
  }

  async incrementScreenshotViews(id: number): Promise<void> {
    await db
      .update(screenshots)
      .set({ views: sql`${screenshots.views} + 1` })
      .where(eq(screenshots.id, id));
  }

  async getClipsByUserId(userId: number): Promise<ClipWithUser[]> {
    const userClips = await db
      .select()
      .from(clips)
      .where(eq(clips.userId, userId))
      .orderBy(desc(clips.createdAt), desc(clips.id));

    const clipsWithDetails: ClipWithUser[] = [];
    for (const clip of userClips) {
      const clipWithUser = await this.getClipWithUser(clip.id);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getClipByShareCode(shareCode: string): Promise<Clip | null> {
    const [clip] = await db.select().from(clips).where(eq(clips.shareCode, shareCode));
    return clip || null;
  }

  async getScreenshotByShareCode(shareCode: string): Promise<Screenshot | null> {
    const [screenshot] = await db.select().from(screenshots).where(eq(screenshots.shareCode, shareCode));
    return screenshot || null;
  }

  async getClipsByGameId(gameId: number, limit: number = 4): Promise<ClipWithUser[]> {
    // Get clips for a specific game
    const gameClips = await db
      .select()
      .from(clips)
      .where(eq(clips.gameId, gameId))
      .orderBy(desc(clips.views), desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    // Get full clip details with user info
    const clipsWithDetails: ClipWithUser[] = [];
    for (const clip of gameClips) {
      const clipWithUser = await this.getClipWithUser(clip.id);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getClipsByHashtag(hashtag: string): Promise<ClipWithUser[]> {
    // Search for clips that have the hashtag in their tags array using ANY operator
    const hashtagClips = await db
      .select()
      .from(clips)
      .where(sql`${hashtag} = ANY(${clips.tags})`)
      .orderBy(desc(clips.createdAt), desc(clips.id));

    // Get full clip details with user info
    const clipsWithDetails: ClipWithUser[] = [];
    for (const clip of hashtagClips) {
      const clipWithUser = await this.getClipWithUser(clip.id);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getFeedClips(period: string = 'day', limit: number = 10): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'day':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        break;
      case 'month':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        break;
      default:
        dateFilter = new Date(0); // Beginning of time
    }

    const clipIds = await db
      .select()
      .from(clips)
      .where(gt(clips.createdAt, dateFilter))
      .orderBy(desc(clips.views), desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const clipsWithDetails: ClipWithUser[] = [];
    for (const clip of clipIds) {
      const clipWithUser = await this.getClipWithUser(clip.id);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getTrendingClips(period: string = 'day', limit: number = 10, gameId?: number, currentUserId?: number): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'day':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(0);
    }

    // Get clips based on engagement (likes + comments) with privacy filtering
    console.log('getTrendingClips: currentUserId =', currentUserId);
    
    const clipEngagementQuery = db
      .select({
        clipId: clips.id,
        engagement: sql<number>`cast(count(distinct ${likes.id}) + count(distinct ${comments.id}) as integer)`.as('engagement')
      })
      .from(clips)
      .leftJoin(users, eq(clips.userId, users.id))
      .leftJoin(likes, eq(clips.id, likes.clipId))
      .leftJoin(comments, eq(clips.id, comments.clipId))
      .where(
        and(
          gt(clips.createdAt, dateFilter),
          eq(clips.videoType, 'clip'),
          gameId ? eq(clips.gameId, gameId) : undefined,
          // Only show clips from public accounts OR private accounts that current user follows OR user's own content
          or(
            eq(users.isPrivate, false), // Public accounts
            currentUserId ? eq(users.id, currentUserId) : sql`false`, // User's own content
            currentUserId ? sql`exists (select 1 from follows f where f.following_id = ${users.id} and f.follower_id = ${currentUserId})` : sql`false` // Current user follows this private account
          )
        )
      )
      .groupBy(clips.id)
      .orderBy(sql`engagement desc`, desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const engagementResults = await clipEngagementQuery;

    const clipsWithDetails: ClipWithUser[] = [];
    for (const result of engagementResults) {
      const clipWithUser = await this.getClipWithUser(result.clipId);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getTrendingReels(period: string = 'day', limit: number = 10, gameId?: number, currentUserId?: number): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'day':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(0);
    }

    // Get reels based on engagement (likes + comments) with proper joins
    const reelEngagementQuery = db
      .select({
        clip: clips,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          emailVerified: users.emailVerified,
        },
        game: {
          id: games.id,
          name: games.name,
          imageUrl: games.imageUrl,
          twitchId: games.twitchId,
          createdAt: games.createdAt,
        },
        engagement: sql<number>`cast(count(distinct ${likes.id}) + count(distinct ${comments.id}) as integer)`.as('engagement'),
        likesCount: sql<number>`count(distinct ${likes.id})`.as('likesCount'),
        commentsCount: sql<number>`count(distinct ${comments.id})`.as('commentsCount')
      })
      .from(clips)
      .leftJoin(users, eq(clips.userId, users.id))
      .leftJoin(games, eq(clips.gameId, games.id))
      .leftJoin(likes, eq(clips.id, likes.clipId))
      .leftJoin(comments, eq(clips.id, comments.clipId))
      .leftJoin(follows, and(
        eq(follows.followingId, users.id),
        currentUserId ? eq(follows.followerId, currentUserId) : sql`false`
      ))
      .where(
        and(
          gt(clips.createdAt, dateFilter),
          eq(clips.videoType, 'reel'),
          gameId ? eq(clips.gameId, gameId) : undefined,
          // Only show reels from public accounts OR private accounts that current user follows OR user's own content
          or(
            eq(users.isPrivate, false), // Public accounts
            currentUserId ? eq(users.id, currentUserId) : sql`false`, // User's own content
            currentUserId ? and(
              eq(users.isPrivate, true),
              eq(follows.followerId, currentUserId) // Current user follows this private account
            ) : sql`false` // If no current user, don't show any private content
          )
        )
      )
      .groupBy(clips.id, users.id, games.id)
      .orderBy(sql`engagement desc`, desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const results = await reelEngagementQuery;

    return results.map(row => ({
      ...row.clip,
      user: row.user?.id ? { ...row.user } : null,
      game: row.game?.id ? { ...row.game } : null,
      _count: {
        likes: parseInt(row.likesCount?.toString() || '0'),
        comments: parseInt(row.commentsCount?.toString() || '0')
      }
    }));
  }

  async getLatestReels(limit: number, currentUserId?: number): Promise<ClipWithUser[]> {
    // Get latest reels by creation date (newest first) with engagement counts
    const latestReelsQuery = db
      .select({
        clip: clips,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          emailVerified: users.emailVerified,
        },
        game: {
          id: games.id,
          name: games.name,
          imageUrl: games.imageUrl,
          twitchId: games.twitchId,
          createdAt: games.createdAt,
        },
        likesCount: sql<number>`count(distinct ${likes.id})`.as('likesCount'),
        commentsCount: sql<number>`count(distinct ${comments.id})`.as('commentsCount')
      })
      .from(clips)
      .leftJoin(users, eq(clips.userId, users.id))
      .leftJoin(games, eq(clips.gameId, games.id))
      .leftJoin(likes, eq(clips.id, likes.clipId))
      .leftJoin(comments, eq(clips.id, comments.clipId))
      .leftJoin(follows, and(
        eq(follows.followingId, users.id),
        currentUserId ? eq(follows.followerId, currentUserId) : sql`false`
      ))
      .where(
        and(
          eq(clips.videoType, 'reel'),
          // Only show reels from public accounts OR private accounts that current user follows OR user's own content
          or(
            eq(users.isPrivate, false), // Public accounts
            currentUserId ? eq(users.id, currentUserId) : sql`false`, // User's own content
            currentUserId ? and(
              eq(users.isPrivate, true),
              eq(follows.followerId, currentUserId) // Current user follows this private account
            ) : sql`false` // If no current user, don't show any private content
          )
        )
      )
      .groupBy(clips.id, users.id, games.id)
      .orderBy(desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const results = await latestReelsQuery;

    return results.map(row => ({
      ...row.clip,
      user: row.user?.id ? { ...row.user } : null,
      game: row.game?.id ? { ...row.game } : null,
      _count: {
        likes: parseInt(row.likesCount?.toString() || '0'),
        comments: parseInt(row.commentsCount?.toString() || '0')
      }
    }));
  }

  async getGameCategories(): Promise<{ category: string; count: number }[]> {
    const result = await db
      .select({
        category: games.name,
        count: sql<number>`count(distinct ${clips.id})`.as('count')
      })
      .from(games)
      .leftJoin(clips, eq(games.id, clips.gameId))
      .groupBy(games.name)
      .having(sql`count(distinct ${clips.id}) > 0`)
      .orderBy(sql`count(distinct ${clips.id}) desc`)
      .limit(20);

    return result.map(row => ({
      category: row.category,
      count: Number(row.count) || 0,
    }));
  }

  // Like operations
  async createLike(likeData: InsertLike): Promise<Like> {
    const [like] = await db.insert(likes).values(likeData).returning();
    return like;
  }

  async deleteLike(userId: number, clipId: number): Promise<boolean> {
    const result = await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.clipId, clipId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getLikesByClipId(clipId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.clipId, clipId));
  }

  async getLikesByUserId(userId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.userId, userId));
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | null> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment || null;
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(commentData).returning();
    return comment;
  }

  async getCommentsByClipId(clipId: number): Promise<CommentWithUser[]> {
    const commentsWithUsers = await db
      .select({
        comment: comments,
        user: users
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.clipId, clipId))
      .orderBy(desc(comments.createdAt), desc(comments.id));

    return commentsWithUsers.map(row => ({
      ...row.comment,
      user: row.user?.id ? row.user : null  // null for orphaned comments
    }));
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }

  // User game favorites operations
  async addUserGameFavorite(favoriteData: InsertUserGameFavorite): Promise<UserGameFavorite> {
    const [favorite] = await db.insert(userGameFavorites).values(favoriteData).returning();
    return favorite;
  }

  async removeUserGameFavorite(userId: number, gameId: number): Promise<boolean> {
    const result = await db
      .delete(userGameFavorites)
      .where(
        and(
          eq(userGameFavorites.userId, userId),
          eq(userGameFavorites.gameId, gameId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getUserGameFavorites(userId: number): Promise<Game[]> {
    const results = await db
      .select({
        game: games
      })
      .from(userGameFavorites)
      .innerJoin(games, eq(userGameFavorites.gameId, games.id))
      .where(eq(userGameFavorites.userId, userId));

    return results.map(r => r.game);
  }

  // Follow operations
  async createFollow(followData: InsertFollow): Promise<Follow> {
    try {
      const [follow] = await db.insert(follows).values(followData).returning();
      return follow;
    } catch (error) {
      // Log the error for debugging
      console.error("Database error in createFollow:", error);
      
      // Re-throw the error with more context if needed
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value') || error.message.includes('unique constraint')) {
          throw new Error("Follow relationship already exists");
        }
        if (error.message.includes('foreign key constraint')) {
          throw new Error("Invalid user ID for follow relationship");
        }
      }
      
      // Re-throw the original error for other cases
      throw error;
    }
  }

  async deleteFollow(followerId: number, followingId: number): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getFollowersByUserId(userId: number): Promise<User[]> {
    const results = await db
      .select({
        user: users
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    return results.map(r => r.user);
  }

  async getFollowingByUserId(userId: number): Promise<User[]> {
    const results = await db
      .select({
        user: users
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    return results.map(r => r.user);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    return !!follow;
  }

  async getFollowerCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));
    return result[0].count || 0;
  }

  async getFollowingCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId));
    return result[0].count || 0;
  }

  // Follow request operations
  async createFollowRequest(requesterId: number, requestedId: number): Promise<void> {
    await db.insert(followRequests).values({
      requesterId,
      addresseeId: requestedId,
      status: 'pending'
    });
  }

  async getPendingFollowRequests(userId: number) {
    const requests = await db
      .select()
      .from(followRequests)
      .where(
        and(
          eq(followRequests.addresseeId, userId),
          eq(followRequests.status, 'pending')
        )
      );
    return requests;
  }

  async getFollowRequest(requestId: number): Promise<any> {
    const [request] = await db
      .select()
      .from(followRequests)
      .where(eq(followRequests.id, requestId));
    return request;
  }

  async hasFollowRequest(requesterId: number, requestedId: number): Promise<string | null> {
    const [request] = await db
      .select()
      .from(followRequests)
      .where(
        and(
          eq(followRequests.requesterId, requesterId),
          eq(followRequests.addresseeId, requestedId)
        )
      );
    return request ? request.status : null;
  }

  async acceptFollowRequest(requestId: number): Promise<boolean> {
    // Get the follow request details first
    const [request] = await db
      .select()
      .from(followRequests)
      .where(eq(followRequests.id, requestId));
    
    if (!request) {
      return false;
    }

    // Create the follow relationship
    await db.insert(follows).values({
      followerId: request.requesterId,
      followingId: request.addresseeId
    });

    // Update the request status to approved
    const result = await db
      .update(followRequests)
      .set({ status: 'approved' })
      .where(eq(followRequests.id, requestId))
      .returning();
      
    return result.length > 0;
  }

  async declineFollowRequest(requestId: number): Promise<boolean> {
    const result = await db
      .update(followRequests)
      .set({ status: 'rejected' })
      .where(eq(followRequests.id, requestId))
      .returning();
    return result.length > 0;
  }

  async removeFollowRequest(requesterId: number, requestedId: number): Promise<void> {
    await db
      .delete(followRequests)
      .where(
        and(
          eq(followRequests.requesterId, requesterId),
          eq(followRequests.addresseeId, requestedId)
        )
      );
  }

  // Search operations
  async searchUsers(query: string): Promise<User[]> {
    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.displayName, `%${query}%`)
        )
      )
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(10);

    return searchResults;
  }

  async searchGames(query: string): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .where(ilike(games.name, `%${query}%`))
      .orderBy(desc(games.createdAt), desc(games.id))
      .limit(10);
  }

  async searchClips(query: string): Promise<ClipWithUser[]> {
    // Check if query is a hashtag
    const isHashtag = query.startsWith('#');
    const searchTerm = isHashtag ? query.slice(1).toLowerCase() : query.toLowerCase();

    let matchingClips;

    if (isHashtag) {
      // Search by hashtags in tags array
      matchingClips = await db
        .select()
        .from(clips)
        .where(
          sql`EXISTS (SELECT 1 FROM unnest(${clips.tags}) AS tag WHERE LOWER(tag) = ${searchTerm})`
        );
    } else {
      // Search by title and description
      matchingClips = await db
        .select()
        .from(clips)
        .where(
          or(
            ilike(clips.title, `%${query}%`),
            ilike(clips.description, `%${query}%`)
          )
        );
    }

    const clipsWithDetails: ClipWithUser[] = [];
    for (const clip of matchingClips) {
      const clipWithUser = await this.getClipWithUser(clip.id);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  // Profile customization operations
  async getAllProfileBanners(): Promise<ProfileBanner[]> {
    const banners = await db.select().from(profileBanners).orderBy(profileBanners.id);
    return banners;
  }

  async getProfileBannersByCategory(category: string): Promise<ProfileBanner[]> {
    const banners = await db
      .select()
      .from(profileBanners)
      .where(eq(profileBanners.category, category))
      .orderBy(profileBanners.id);
    return banners;
  }

  // Admin operations
  async getAllUsers(limit: number = 10, offset: number = 0, search?: string): Promise<UserWithBadges[]> {
    let userQuery = db.select().from(users);

    if (search) {
      userQuery = userQuery.where(
        or(
          ilike(users.username, `%${search}%`),
          ilike(users.displayName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      ) as any;
    }

    const usersResults = await userQuery
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit)
      .offset(offset);

    // Bulk fetch badges for all users to avoid N+1 queries
    const userIds = usersResults.map(user => user.id);
    const allBadges = userIds.length > 0 
      ? await db.select().from(userBadges).where(inArray(userBadges.userId, userIds))
      : [];

    // Group badges by user ID
    const badgesByUserId = allBadges.reduce((acc, badge) => {
      if (!acc[badge.userId]) {
        acc[badge.userId] = [];
      }
      acc[badge.userId].push(badge);
      return acc;
    }, {} as Record<number, UserBadge[]>);

    // Combine users with their badges
    const usersWithBadges: UserWithBadges[] = usersResults.map(user => ({
      ...user,
      badges: badgesByUserId[user.id] || []
    }));

    return usersWithBadges;
  }

  async getUserCount(search?: string): Promise<number> {
    let query = db.select({ count: sql`count(*)` }).from(users);

    if (search) {
      query = query.where(
        or(
          ilike(users.username, `%${search}%`),
          ilike(users.displayName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      ) as any;
    }

    const [result] = await query;
    return Number(result.count || 0);
  }

  async getAdminCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.role, 'admin'));
    return Number(result.count);
  }

  async getClipCount(): Promise<number> {
    const [result] = await db.select({ count: sql`count(*)` }).from(clips);
    return Number(result.count);
  }

  async getGameCount(): Promise<number> {
    const [result] = await db.select({ count: sql`count(*)` }).from(games);
    return Number(result.count);
  }

  async getAllClips(limit: number = 10, offset: number = 0, currentUserId?: number): Promise<ClipWithUser[]> {
    console.log('getAllClips: currentUserId =', currentUserId);
    
    // CRITICAL FIX: Show ALL clips including orphaned ones for admin moderation
    const allClipsData = await db
      .select({
        clip: clips,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          emailVerified: users.emailVerified,
        },
        game: {
          id: games.id,
          name: games.name,
          imageUrl: games.imageUrl,
          twitchId: games.twitchId,
          createdAt: games.createdAt,
        }
      })
      .from(clips)
      .leftJoin(users, eq(clips.userId, users.id))
      .leftJoin(games, eq(clips.gameId, games.id))
      .orderBy(desc(clips.createdAt), desc(clips.id))
      .limit(limit)
      .offset(offset);

    // Map to ClipWithUser format, preserving ALL records including orphaned ones
    return allClipsData.map(row => ({
      ...row.clip,
      user: row.user?.id ? { ...row.user } : null,  // null for orphaned clips
      game: row.game?.id ? { ...row.game } : null,  // null for missing games
      _count: {
        likes: 0,  // Will be calculated separately if needed
        comments: 0
      }
    }));
  }

  async getUserTypeDistribution(): Promise<{type: string, count: number}[]> {
    const results = await db
      .select({
        type: users.role,
        count: sql`count(*)`
      })
      .from(users)
      .groupBy(users.role);

    return results.map(r => ({
      type: r.type || 'user',
      count: Number(r.count)
    }));
  }

  async getAgeRangeDistribution(): Promise<{range: string, count: number}[]> {
    // Since we don't have age field, return empty for now
    return [];
  }

  async getTopGames(limit: number = 5): Promise<Game[]> {
    const gameClipCounts = await db
      .select({
        gameId: clips.gameId,
        count: sql`count(*)`
      })
      .from(clips)
      .groupBy(clips.gameId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const topGames: Game[] = [];
    for (const gameCount of gameClipCounts) {
      if (gameCount.gameId) {
        const game = await this.getGame(gameCount.gameId);
        if (game) {
          topGames.push(game);
        }
      }
    }

    return topGames;
  }

  async getRecentClips(limit: number = 5): Promise<ClipWithUser[]> {
    return this.getAllClips(limit, 0);
  }

  // Screenshot operations
  async getScreenshot(id: number): Promise<Screenshot | null> {
    const [screenshot] = await db.select().from(screenshots).where(eq(screenshots.id, id));
    return screenshot || null;
  }

  async createScreenshot(screenshotData: InsertScreenshot): Promise<Screenshot> {
    const [screenshot] = await db
      .insert(screenshots)
      .values(screenshotData)
      .returning();
    return screenshot;
  }

  async getScreenshotsByUserId(userId: number): Promise<Screenshot[]> {
    return await db
      .select()
      .from(screenshots)
      .where(eq(screenshots.userId, userId))
      .orderBy(desc(screenshots.createdAt), desc(screenshots.id));
  }

  async getScreenshotsByGameId(gameId: number, limit: number = 20): Promise<Screenshot[]> {
    return await db
      .select()
      .from(screenshots)
      .where(eq(screenshots.gameId, gameId))
      .orderBy(desc(screenshots.createdAt), desc(screenshots.id))
      .limit(limit);
  }

  async deleteScreenshot(id: number): Promise<boolean> {
    const result = await db.delete(screenshots).where(eq(screenshots.id, id));
    return Array.isArray(result) ? result.length > 0 : (result as any).count > 0;
  }

  // Clip reactions operations
  async createClipReaction(reactionData: InsertClipReaction): Promise<ClipReaction> {
    const [reaction] = await db
      .insert(clipReactions)
      .values(reactionData)
      .returning();
    return reaction;
  }

  async getClipReactions(clipId: number): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(clipReactions)
        .where(eq(clipReactions.clipId, clipId));
      return result;
    } catch (error) {
      console.error('Error getting clip reactions:', error);
      return [];
    }
  }

  async getUserClipReaction(userId: number, clipId: number, emoji: string): Promise<any> {
    try {
      const result = await db
        .select()
        .from(clipReactions)
        .where(and(
          eq(clipReactions.userId, userId),
          eq(clipReactions.clipId, clipId),
          eq(clipReactions.emoji, emoji)
        ))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user clip reaction:', error);
      return null;
    }
  }

  async deleteClipReaction(id: number): Promise<boolean> {
    try {
      await db.delete(clipReactions).where(eq(clipReactions.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting clip reaction:", error);
      return false;
    }
  }

  // Screenshot Comments operations
  async createScreenshotComment(commentData: InsertScreenshotComment): Promise<ScreenshotComment> {
    const [comment] = await db.insert(screenshotComments).values(commentData).returning();
    return comment;
  }

  async getScreenshotComments(screenshotId: number): Promise<ScreenshotCommentWithUser[]> {
    const results = await db
      .select({
        id: screenshotComments.id,
        userId: screenshotComments.userId,
        screenshotId: screenshotComments.screenshotId,
        content: screenshotComments.content,
        createdAt: screenshotComments.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl
        }
      })
      .from(screenshotComments)
      .leftJoin(users, eq(screenshotComments.userId, users.id))
      .where(eq(screenshotComments.screenshotId, screenshotId))
      .orderBy(desc(screenshotComments.createdAt), desc(screenshotComments.id));

    return results as any;
  }

  async deleteScreenshotComment(id: number): Promise<boolean> {
    try {
      await db.delete(screenshotComments).where(eq(screenshotComments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting screenshot comment:", error);
      return false;
    }
  }

  // Screenshot Reactions operations
  async createScreenshotReaction(reactionData: any): Promise<any> {
    try {
      const result = await db
        .insert(screenshotReactions)
        .values(reactionData)
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error creating screenshot reaction:', error);
      throw error;
    }
  }

  async getScreenshotReactions(screenshotId: number): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(screenshotReactions)
        .where(eq(screenshotReactions.screenshotId, screenshotId));
      return result;
    } catch (error) {
      console.error('Error getting screenshot reactions:', error);
      return [];
    }
  }

  async getUserScreenshotReaction(userId: number, screenshotId: number, emoji: string): Promise<any> {
    try {
      const result = await db
        .select()
        .from(screenshotReactions)
        .where(and(
          eq(screenshotReactions.userId, userId),
          eq(screenshotReactions.screenshotId, screenshotId),
          eq(screenshotReactions.emoji, emoji)
        ))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user screenshot reaction:', error);
      return null;
    }
  }

  async deleteScreenshotReaction(reactionId: number): Promise<boolean> {
    try {
      await db
        .delete(screenshotReactions)
        .where(eq(screenshotReactions.id, reactionId));
      return true;
    } catch (error) {
      console.error('Error deleting screenshot reaction:', error);
      return false;
    }
  }

  // Screenshot Likes operations
  async getScreenshotLikes(screenshotId: number): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(screenshotLikes)
        .where(eq(screenshotLikes.screenshotId, screenshotId));
      return result;
    } catch (error) {
      console.error('Error getting screenshot likes:', error);
      return [];
    }
  }

  async hasUserLikedScreenshot(userId: number, screenshotId: number): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(screenshotLikes)
        .where(and(
          eq(screenshotLikes.userId, userId),
          eq(screenshotLikes.screenshotId, screenshotId)
        ))
        .limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking screenshot like status:', error);
      return false;
    }
  }

  async createScreenshotLike(userId: number, screenshotId: number): Promise<any> {
    try {
      const result = await db
        .insert(screenshotLikes)
        .values({ userId, screenshotId })
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error creating screenshot like:', error);
      throw error;
    }
  }

  async deleteScreenshotLike(userId: number, screenshotId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(screenshotLikes)
        .where(and(
          eq(screenshotLikes.userId, userId),
          eq(screenshotLikes.screenshotId, screenshotId)
        ));
      return true;
    } catch (error) {
      console.error('Error deleting screenshot like:', error);
      return false;
    }
  }

  // Comment Reports operations
  async createCommentReport(reportData: InsertCommentReport): Promise<CommentReport> {
    const [report] = await db.insert(commentReports).values(reportData).returning();
    return report;
  }

  async getCommentReports(status?: string): Promise<CommentReport[]> {
    let query = db.select().from(commentReports);

    if (status) {
      query = query.where(eq(commentReports.status, status)) as any;
    }

    return await query.orderBy(desc(commentReports.createdAt));
  }


  // Check if user has already liked a clip
  async hasUserLikedClip(userId: number, clipId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.clipId, clipId)
      ));
    return !!like;
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getNotificationsByUserId(userId: number): Promise<any[]> {
    const results = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        fromUserId: notifications.fromUserId,
        clipId: notifications.clipId,
        commentId: notifications.commentId,
        actionUrl: notifications.actionUrl,
        createdAt: notifications.createdAt,
        fromUser: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl
        }
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50);

    return results.map(result => ({
      ...result,
      fromUser: result.fromUser?.id ? result.fromUser : null
    }));
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result.count;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  async deleteAllNotifications(userId: number): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.userId, userId));
      return true;
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      return false;
    }
  }

  async getNotification(id: number): Promise<any> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification;
  }

  async getFollowRequestByUsers(requesterId: number, addresseeId: number): Promise<any> {
    const [request] = await db
      .select()
      .from(followRequests)
      .where(
        and(
          eq(followRequests.requesterId, requesterId),
          eq(followRequests.addresseeId, addresseeId),
          eq(followRequests.status, 'pending')
        )
      );
    return request;
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async deleteMessage(messageId: number, senderId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.senderId, senderId)
        ))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting message:", error);
      return false;
    }
  }

  async deleteConversationHistory(userId1: number, userId2: number): Promise<boolean> {
    try {
      const result = await db
        .delete(messages)
        .where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        )
        .returning();

      return true; // Returns true even if no messages were deleted (empty conversation)
    } catch (error) {
      console.error("Error deleting conversation history:", error);
      return false;
    }
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    try {
      const messageList = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        )
        .orderBy(asc(messages.createdAt), asc(messages.id));

      return messageList;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  }

  async getConversations(userId: number): Promise<any[]> {
    try {
      // Get all unique conversation partners and their latest message time using a subquery approach
      const conversationPartners = await db
        .selectDistinct({
          otherUserId: sql<number>`CASE 
            WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId}
            ELSE ${messages.senderId}
          END`.as('other_user_id')
        })
        .from(messages)
        .where(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        );

      const conversations = [];

      for (const partner of conversationPartners) {
        // Get the latest message for this conversation
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, partner.otherUserId)),
              and(eq(messages.senderId, partner.otherUserId), eq(messages.receiverId, userId))
            )
          )
          .orderBy(desc(messages.createdAt), desc(messages.id))
          .limit(1);

        // Get the other user's details
        const [otherUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, partner.otherUserId));

        // Count unread messages from this user
        const [unreadCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, partner.otherUserId),
              eq(messages.receiverId, userId),
              eq(messages.isRead, false)
            )
          );

        if (otherUser && lastMessage) {
          conversations.push({
            userId: partner.otherUserId,
            user: {
              id: otherUser.id,
              username: otherUser.username,
              displayName: otherUser.displayName,
              avatarUrl: otherUser.avatarUrl
            },
            lastMessage: {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              receiverId: lastMessage.receiverId
            },
            unreadCount: unreadCount.count || 0
          });
        }
      }

      // Sort by latest message time (most recent first)
      conversations.sort((a, b) => 
        new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
      );

      return conversations;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  }

  async markMessagesAsRead(currentUserId: number, otherUserId: number): Promise<void> {
    try {
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.receiverId, currentUserId),
            eq(messages.senderId, otherUserId),
            eq(messages.isRead, false)
          )
        );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }

  // User blocking operations
  async blockUser(userId: number, blockedUserId: number): Promise<UserBlock> {
    try {
      const [block] = await db
        .insert(userBlocks)
        .values({ blockerId: userId, blockedId: blockedUserId, createdAt: new Date() })
        .returning();
      return block;
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  }

  async unblockUser(userId: number, blockedUserId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, userId),
            eq(userBlocks.blockedId, blockedUserId)
          )
        )
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error unblocking user:", error);
      return false;
    }
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    try {
      console.log(`Fetching blocked users for user ID: ${userId}`);

      const blockedUsersData = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          email: users.email,
          password: users.password,
          emailVerified: users.emailVerified,
          bannerUrl: users.bannerUrl,
          bio: users.bio,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(userBlocks)
        .innerJoin(users, eq(userBlocks.blockedId, users.id))
        .where(eq(userBlocks.blockerId, userId));

      console.log(`Found ${blockedUsersData.length} blocked users for user ${userId}:`, blockedUsersData);
      return blockedUsersData as any;
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  }

  async isUserBlocked(userId1: number, userId2: number): Promise<boolean> {
    try {
      const block = await db
        .select()
        .from(userBlocks)
        .where(
          or(
            and(eq(userBlocks.blockerId, userId1), eq(userBlocks.blockedId, userId2)),
            and(eq(userBlocks.blockerId, userId2), eq(userBlocks.blockedId, userId1))
          )
        )
        .limit(1);

      return block.length > 0;
    } catch (error) {
      console.error("Error checking if user is blocked:", error);
      return false;
    }
  }

  // Extended trending methods for comprehensive trending page
  async getTrendingClipsByLikes(period: string = 'day', limit: number = 10, gameId?: number): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'ever':
        dateFilter = new Date(0);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get clips ordered by likes count
    const clipLikesQuery = db
      .select({
        clipId: clips.id,
        likesCount: sql<number>`cast(count(distinct ${likes.id}) as integer)`.as('likesCount')
      })
      .from(clips)
      .leftJoin(likes, eq(clips.id, likes.clipId))
      .where(
        and(
          gt(clips.createdAt, dateFilter),
          eq(clips.videoType, 'clip'),
          gameId ? eq(clips.gameId, gameId) : undefined
        )
      )
      .groupBy(clips.id)
      .orderBy(sql`likesCount desc`, desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const likesResults = await clipLikesQuery;

    const clipsWithDetails: ClipWithUser[] = [];
    for (const result of likesResults) {
      const clipWithUser = await this.getClipWithUser(result.clipId);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getTrendingClipsByComments(period: string = 'day', limit: number = 10, gameId?: number): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'ever':
        dateFilter = new Date(0);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get clips ordered by comments count
    const clipCommentsQuery = db
      .select({
        clipId: clips.id,
        commentsCount: sql<number>`cast(count(distinct ${comments.id}) as integer)`.as('commentsCount')
      })
      .from(clips)
      .leftJoin(comments, eq(clips.id, comments.clipId))
      .where(
        and(
          gt(clips.createdAt, dateFilter),
          eq(clips.videoType, 'clip'),
          gameId ? eq(clips.gameId, gameId) : undefined
        )
      )
      .groupBy(clips.id)
      .orderBy(sql`commentsCount desc`, desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const commentsResults = await clipCommentsQuery;

    const clipsWithDetails: ClipWithUser[] = [];
    for (const result of commentsResults) {
      const clipWithUser = await this.getClipWithUser(result.clipId);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getTrendingReelsByLikes(period: string = 'day', limit: number = 10, gameId?: number): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'ever':
        dateFilter = new Date(0);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get reels ordered by likes count
    const reelLikesQuery = db
      .select({
        clipId: clips.id,
        likesCount: sql<number>`cast(count(distinct ${likes.id}) as integer)`.as('likesCount')
      })
      .from(clips)
      .leftJoin(likes, eq(clips.id, likes.clipId))
      .where(
        and(
          gt(clips.createdAt, dateFilter),
          eq(clips.videoType, 'reel'),
          gameId ? eq(clips.gameId, gameId) : undefined
        )
      )
      .groupBy(clips.id)
      .orderBy(sql`likesCount desc`, desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const likesResults = await reelLikesQuery;

    const clipsWithDetails: ClipWithUser[] = [];
    for (const result of likesResults) {
      const clipWithUser = await this.getClipWithUser(result.clipId);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  async getTrendingReelsByComments(period: string = 'day', limit: number = 10, gameId?: number): Promise<ClipWithUser[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'ever':
        dateFilter = new Date(0);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get reels ordered by comments count
    const reelCommentsQuery = db
      .select({
        clipId: clips.id,
        commentsCount: sql<number>`cast(count(distinct ${comments.id}) as integer)`.as('commentsCount')
      })
      .from(clips)
      .leftJoin(comments, eq(clips.id, comments.clipId))
      .where(
        and(
          gt(clips.createdAt, dateFilter),
          eq(clips.videoType, 'reel'),
          gameId ? eq(clips.gameId, gameId) : undefined
        )
      )
      .groupBy(clips.id)
      .orderBy(sql`commentsCount desc`, desc(clips.createdAt), desc(clips.id))
      .limit(limit);

    const commentsResults = await reelCommentsQuery;

    const clipsWithDetails: ClipWithUser[] = [];
    for (const result of commentsResults) {
      const clipWithUser = await this.getClipWithUser(result.clipId);
      if (clipWithUser) {
        clipsWithDetails.push(clipWithUser);
      }
    }

    return clipsWithDetails;
  }

  // Extended screenshot type with user and game information
  async getScreenshotWithUser(screenshotId: number): Promise<(Screenshot & { user: User; game?: Game }) | undefined> {
    const result = await db
      .select()
      .from(screenshots)
      .leftJoin(users, eq(screenshots.userId, users.id))
      .leftJoin(games, eq(screenshots.gameId, games.id))
      .where(eq(screenshots.id, screenshotId))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      ...row.screenshots,
      user: row.users?.id ? { ...row.users } : null,
      game: row.games?.id ? { ...row.games } : null
    };
  }

  async getTrendingScreenshots(period: string = 'day', limit: number = 10, gameId?: number): Promise<(Screenshot & { user: User; game?: Game })[]> {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'ever':
        dateFilter = new Date(0);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // For now, get screenshots ordered by views and creation date since likes/comments aren't supported yet
    const screenshotsQuery = db
      .select()
      .from(screenshots)
      .leftJoin(users, eq(screenshots.userId, users.id))
      .leftJoin(games, eq(screenshots.gameId, games.id))
      .where(
        and(
          gt(screenshots.createdAt, dateFilter),
          gameId ? eq(screenshots.gameId, gameId) : undefined
        )
      )
      .orderBy(desc(screenshots.views), desc(screenshots.createdAt), desc(screenshots.id))
      .limit(limit);

    const results = await screenshotsQuery;

    return results.map(row => ({
      ...row.screenshots,
      user: row.users?.id ? { ...row.users } : null,
      game: row.games?.id ? { ...row.games } : null
    })) as (Screenshot & { user: User | null; game?: Game | null })[];
  }

  // Badge definition operations
  async createBadge(badgeData: InsertBadge): Promise<Badge> {
    const [badge] = await db.insert(badges).values(badgeData).returning();
    return badge;
  }

  async getAllBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(desc(badges.createdAt));
  }

  async getActiveBadges(): Promise<Badge[]> {
    return db.select().from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(asc(badges.name));
  }

  async getBadge(id: number): Promise<Badge | null> {
    const [badge] = await db.select().from(badges).where(eq(badges.id, id));
    return badge || null;
  }

  async getBadgeByName(name: string): Promise<Badge | null> {
    const [badge] = await db.select().from(badges).where(eq(badges.name, name));
    return badge || null;
  }

  async updateBadge(id: number, badgeData: Partial<Badge>): Promise<Badge | null> {
    try {
      const [updatedBadge] = await db
        .update(badges)
        .set({ ...badgeData, updatedAt: new Date() })
        .where(eq(badges.id, id))
        .returning();
      return updatedBadge;
    } catch (error) {
      console.error("Error updating badge:", error);
      return null;
    }
  }

  async deleteBadge(id: number): Promise<boolean> {
    try {
      // Check if badge is in use
      const badgeInUse = await db.select().from(userBadges).where(eq(userBadges.badgeId, id)).limit(1);
      if (badgeInUse.length > 0) {
        console.log(`Cannot delete badge ${id}: still in use by users`);
        return false;
      }

      const result = await db.delete(badges).where(eq(badges.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting badge:", error);
      return false;
    }
  }

  async getBadgesWithStats(): Promise<BadgeWithStats[]> {
    try {
      const allBadges = await this.getAllBadges();
      const badgesWithStats: BadgeWithStats[] = [];

      for (const badge of allBadges) {
        const userCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userBadges)
          .where(eq(userBadges.badgeId, badge.id));

        badgesWithStats.push({
          ...badge,
          _count: {
            users: Number(userCount[0]?.count || 0)
          }
        });
      }

      return badgesWithStats;
    } catch (error) {
      console.error("Error getting badges with stats:", error);
      return [];
    }
  }

  // User badge operations
  async createUserBadge(badge: InsertUserBadge): Promise<UserBadge> {
    const [userBadge] = await db.insert(userBadges).values(badge).returning();
    return userBadge;
  }

  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.createdAt));
  }

  async deleteBadgesByType(userId: number, badgeType: string): Promise<boolean> {
    const result = await db
      .delete(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeType, badgeType)));
    return Array.isArray(result) ? result.length > 0 : (result as any).count > 0;
  }

  async deleteUserBadge(badgeId: number): Promise<boolean> {
    const result = await db.delete(userBadges).where(eq(userBadges.id, badgeId));
    return Array.isArray(result) ? result.length > 0 : (result as any).count > 0;
  }

  async cleanupExpiredBadges(): Promise<void> {
    await db
      .delete(userBadges)
      .where(and(
        sql`expires_at IS NOT NULL`,
        lt(userBadges.expiresAt, new Date())
      ));
  }

  async updateUserLoginTime(userId: number, additionalMinutes: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        totalLoginTime: sql`${users.totalLoginTime} + ${additionalMinutes}`,
        lastLoginAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async processNewcomerBadge(userId: number): Promise<void> {
    // Get user's current login time
    const [user] = await db.select({ totalLoginTime: users.totalLoginTime })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return;

    const totalHours = user.totalLoginTime / 60;

    // Check if user has newcomer badge
    const [existingBadge] = await db
      .select()
      .from(userBadges)
      .where(and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeType, 'newcomer')
      ));

    if (totalHours < 24) {
      // User should have newcomer badge
      if (!existingBadge) {
        await this.createUserBadge({
          userId,
          badgeType: 'newcomer',
          assignedBy: 'system',
          expiresAt: new Date(Date.now() + (24 - totalHours) * 60 * 60 * 1000) // Expires when user reaches 24 hours
        });
      }
    } else {
      // User should not have newcomer badge anymore
      if (existingBadge) {
        await this.deleteUserBadge(existingBadge.id);
      }
    }
  }

  // Leaderboard operations
  async addUserPointsHistory(pointsHistory: InsertUserPointsHistory): Promise<UserPointsHistory> {
    const [points] = await db.insert(userPointsHistory).values(pointsHistory).returning();
    return points;
  }

  async getMonthlyLeaderboardEntry(userId: number, month: string, year: number): Promise<MonthlyLeaderboard | undefined> {
    const [entry] = await db
      .select()
      .from(monthlyLeaderboard)
      .where(and(
        eq(monthlyLeaderboard.userId, userId),
        eq(monthlyLeaderboard.month, month),
        eq(monthlyLeaderboard.year, year)
      ));
    return entry || null;
  }

  async createMonthlyLeaderboardEntry(entry: InsertMonthlyLeaderboard): Promise<MonthlyLeaderboard> {
    const [leaderboardEntry] = await db.insert(monthlyLeaderboard).values(entry).returning();
    return leaderboardEntry;
  }

  async updateMonthlyLeaderboardEntry(id: number, updates: Partial<MonthlyLeaderboard>): Promise<MonthlyLeaderboard | undefined> {
    const [updatedEntry] = await db
      .update(monthlyLeaderboard)
      .set(updates)
      .where(eq(monthlyLeaderboard.id, id))
      .returning();
    return updatedEntry;
  }

  async getMonthlyLeaderboard(month: string, year: number, limit?: number): Promise<(MonthlyLeaderboard & { user: User })[]> {
    const query = db
      .select()
      .from(monthlyLeaderboard)
      .leftJoin(users, eq(monthlyLeaderboard.userId, users.id))
      .where(and(
        eq(monthlyLeaderboard.month, month),
        eq(monthlyLeaderboard.year, year)
      ))
      .orderBy(desc(monthlyLeaderboard.totalPoints));

    if (limit) {
      query.limit(limit);
    }

    const results = await query;
    return results.map(row => ({
      ...row.monthly_leaderboard,
      user: row.users!
    }));
  }

  async recalculateMonthlyRankings(month: string, year: number): Promise<void> {
    // Get all entries for the month sorted by total points
    const entries = await db
      .select()
      .from(monthlyLeaderboard)
      .where(and(
        eq(monthlyLeaderboard.month, month),
        eq(monthlyLeaderboard.year, year)
      ))
      .orderBy(desc(monthlyLeaderboard.totalPoints));

    // Update rankings
    for (let i = 0; i < entries.length; i++) {
      await db
        .update(monthlyLeaderboard)
        .set({ rank: i + 1 })
        .where(eq(monthlyLeaderboard.id, entries[i].id));
    }
  }

  // Weekly leaderboard operations
  async getWeeklyLeaderboardEntry(userId: number, week: string, year: number): Promise<WeeklyLeaderboard | null> {
    const [entry] = await db
      .select()
      .from(weeklyLeaderboard)
      .where(and(
        eq(weeklyLeaderboard.userId, userId),
        eq(weeklyLeaderboard.week, week),
        eq(weeklyLeaderboard.year, year)
      ));
    return entry || null;
  }

  async createWeeklyLeaderboardEntry(entry: InsertWeeklyLeaderboard): Promise<WeeklyLeaderboard> {
    const [leaderboardEntry] = await db.insert(weeklyLeaderboard).values(entry).returning();
    return leaderboardEntry;
  }

  async updateWeeklyLeaderboardEntry(id: number, updates: Partial<WeeklyLeaderboard>): Promise<WeeklyLeaderboard | null> {
    const [updatedEntry] = await db
      .update(weeklyLeaderboard)
      .set(updates)
      .where(eq(weeklyLeaderboard.id, id))
      .returning();
    return updatedEntry || null;
  }

  async getWeeklyLeaderboard(week: string, year: number, limit?: number): Promise<(WeeklyLeaderboard & { user: User })[]> {
    const query = db
      .select()
      .from(weeklyLeaderboard)
      .leftJoin(users, eq(weeklyLeaderboard.userId, users.id))
      .where(and(
        eq(weeklyLeaderboard.week, week),
        eq(weeklyLeaderboard.year, year)
      ))
      .orderBy(desc(weeklyLeaderboard.totalPoints));

    if (limit) {
      query.limit(limit);
    }

    const results = await query;
    return results.map(row => ({
      ...row.weekly_leaderboard,
      user: row.users!
    }));
  }

  async recalculateWeeklyRankings(week: string, year: number): Promise<void> {
    // Get all entries for the week sorted by total points
    const entries = await db
      .select()
      .from(weeklyLeaderboard)
      .where(and(
        eq(weeklyLeaderboard.week, week),
        eq(weeklyLeaderboard.year, year)
      ))
      .orderBy(desc(weeklyLeaderboard.totalPoints));

    // Update rankings
    for (let i = 0; i < entries.length; i++) {
      await db
        .update(weeklyLeaderboard)
        .set({ rank: i + 1 })
        .where(eq(weeklyLeaderboard.id, entries[i].id));
    }
  }

  // Top contributors operations
  async createTopContributor(contributor: InsertTopContributor): Promise<TopContributor> {
    const [topContributor] = await db.insert(topContributors).values(contributor).returning();
    return topContributor;
  }

  async getTopContributors(periodType: string, limit?: number): Promise<(TopContributor & { user: User })[]> {
    const query = db
      .select()
      .from(topContributors)
      .leftJoin(users, eq(topContributors.userId, users.id))
      .where(eq(topContributors.periodType, periodType))
      .orderBy(desc(topContributors.totalPoints));

    if (limit) {
      query.limit(limit);
    }

    const results = await query;
    return results.map(row => ({
      ...row.top_contributors,
      user: row.users!
    }));
  }

  async getTopContributorsByPeriod(periodType: string, period: string, year: number): Promise<(TopContributor & { user: User })[]> {
    const results = await db
      .select()
      .from(topContributors)
      .leftJoin(users, eq(topContributors.userId, users.id))
      .where(and(
        eq(topContributors.periodType, periodType),
        eq(topContributors.period, period),
        eq(topContributors.year, year)
      ))
      .orderBy(desc(topContributors.totalPoints));

    return results.map(row => ({
      ...row.top_contributors,
      user: row.users!
    }));
  }

  async getEngagementLeaderboard(limit: number = 10): Promise<Array<{
    user: User;
    likesReceived: number;
    commentsReceived: number;
    clipsUploaded: number;
    totalScore: number;
    rank: number;
  }>> {
    try {
      // Calculate leaderboard scores using SQL aggregation
      const leaderboardQuery = await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          role: users.role,
          clipsUploaded: sql<number>`cast(count(distinct ${clips.id}) as integer)`.as('clipsUploaded'),
          likesReceived: sql<number>`cast(count(distinct ${likes.id}) as integer)`.as('likesReceived'),
          commentsReceived: sql<number>`cast(count(distinct ${comments.id}) as integer)`.as('commentsReceived'),
          totalScore: sql<number>`cast(count(distinct ${clips.id}) + count(distinct ${likes.id}) + count(distinct ${comments.id}) as integer)`.as('totalScore')
        })
        .from(users)
        .leftJoin(clips, eq(users.id, clips.userId))
        .leftJoin(likes, eq(clips.id, likes.clipId))
        .leftJoin(comments, eq(clips.id, comments.clipId))
        .groupBy(users.id, users.username, users.displayName, users.avatarUrl, users.bio, users.role)
        .orderBy(sql`cast(count(distinct ${clips.id}) + count(distinct ${likes.id}) + count(distinct ${comments.id}) as integer) DESC`)
        .limit(limit);

      // Add ranking to results
      const results = leaderboardQuery.map((row, index) => ({
        user: {
          id: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
          bio: row.bio,
          role: row.role,
        } as User,
        likesReceived: row.likesReceived,
        commentsReceived: row.commentsReceived,
        clipsUploaded: row.clipsUploaded,
        totalScore: row.totalScore,
        rank: index + 1,
      }));

      return results;
    } catch (error) {
      console.error("Error fetching engagement leaderboard:", error);
      return [];
    }
  }

  // Content filtering operations
  async getContentFilterSettings(fieldName?: string): Promise<ContentFilterSettings[]> {
    const query = db.select().from(contentFilterSettings);

    if (fieldName) {
      return await query.where(eq(contentFilterSettings.fieldName, fieldName));
    }

    return await query;
  }

  async updateContentFilterSettings(fieldName: string, updates: Partial<ContentFilterSettings>): Promise<ContentFilterSettings | undefined> {
    const [updated] = await db
      .update(contentFilterSettings)
      .set(updates)
      .where(eq(contentFilterSettings.fieldName, fieldName))
      .returning();

    return updated;
  }

  async createContentFilterSettings(settings: InsertContentFilterSettings): Promise<ContentFilterSettings> {
    const [created] = await db.insert(contentFilterSettings).values(settings).returning();
    return created;
  }

  // Banned words operations
  async getAllBannedWords(): Promise<BannedWord[]> {
    return await db.select().from(bannedWords).orderBy(asc(bannedWords.word));
  }

  async getActiveBannedWords(): Promise<BannedWord[]> {
    return await db
      .select()
      .from(bannedWords)
      .where(eq(bannedWords.isActive, true))
      .orderBy(asc(bannedWords.word));
  }

  async addBannedWord(word: InsertBannedWord): Promise<BannedWord> {
    const [created] = await db.insert(bannedWords).values({
      ...word,
      word: word.word.toLowerCase() // Store words in lowercase for consistent filtering
    }).returning();
    return created;
  }

  async removeBannedWord(word: string): Promise<boolean> {
    const result = await db
      .delete(bannedWords)
      .where(eq(bannedWords.word, word.toLowerCase()));
    return Array.isArray(result) ? result.length > 0 : (result as any).count > 0;
  }

  async deactivateBannedWord(word: string): Promise<boolean> {
    const [updated] = await db
      .update(bannedWords)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(bannedWords.word, word.toLowerCase()))
      .returning();
    return !!updated;
  }

  async reactivateBannedWord(word: string): Promise<boolean> {
    const [updated] = await db
      .update(bannedWords)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(bannedWords.word, word.toLowerCase()))
      .returning();
    return !!updated;
  }

  async getBannedWord(word: string): Promise<BannedWord | null> {
    const [found] = await db
      .select()
      .from(bannedWords)
      .where(eq(bannedWords.word, word.toLowerCase()));
    return found || null;
  }

  // Content reporting operations
  async createClipReport(report: InsertClipReport): Promise<ClipReport> {
    const [created] = await db.insert(clipReports).values(report).returning();
    return created;
  }

  async createScreenshotReport(report: InsertScreenshotReport): Promise<ScreenshotReport> {
    const [created] = await db.insert(screenshotReports).values(report).returning();
    return created;
  }

  async getClipReportsByClipId(clipId: number): Promise<ClipReport[]> {
    return await db
      .select()
      .from(clipReports)
      .where(eq(clipReports.clipId, clipId))
      .orderBy(desc(clipReports.createdAt), desc(clipReports.id));
  }

  async getScreenshotReportsByScreenshotId(screenshotId: number): Promise<ScreenshotReport[]> {
    return await db
      .select()
      .from(screenshotReports)
      .where(eq(screenshotReports.screenshotId, screenshotId))
      .orderBy(desc(screenshotReports.createdAt), desc(screenshotReports.id));
  }

  async getAllReports(status?: string): Promise<(ClipReport | ScreenshotReport | CommentReport)[]> {
    const clipReportsQuery = db.select().from(clipReports);
    const screenshotReportsQuery = db.select().from(screenshotReports);
    const commentReportsQuery = db.select().from(commentReports);

    if (status) {
      clipReportsQuery.where(eq(clipReports.status, status));
      screenshotReportsQuery.where(eq(screenshotReports.status, status));
      commentReportsQuery.where(eq(commentReports.status, status));
    }

    const [clipResults, screenshotResults, commentResults] = await Promise.all([
      clipReportsQuery.orderBy(desc(clipReports.createdAt), desc(clipReports.id)),
      screenshotReportsQuery.orderBy(desc(screenshotReports.createdAt), desc(screenshotReports.id)),
      commentReportsQuery.orderBy(desc(commentReports.createdAt), desc(commentReports.id))
    ]);

    return [...clipResults, ...screenshotResults, ...commentResults]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateClipReportStatus(id: number, status: string, reviewedBy?: number): Promise<ClipReport | undefined> {
    const [updated] = await db
      .update(clipReports)
      .set({ 
        status, 
        reviewedBy,
        reviewedAt: new Date() 
      })
      .where(eq(clipReports.id, id))
      .returning();
    return updated;
  }

  async updateScreenshotReportStatus(id: number, status: string, reviewedBy?: number): Promise<ScreenshotReport | undefined> {
    const [updated] = await db
      .update(screenshotReports)
      .set({ 
        status, 
        reviewedBy,
        reviewedAt: new Date() 
      })
      .where(eq(screenshotReports.id, id))
      .returning();
    return updated;
  }

  async updateCommentReportStatus(id: number, status: string, reviewedBy?: number): Promise<CommentReport | undefined> {
    const [updated] = await db
      .update(commentReports)
      .set({ 
        status, 
        reviewedBy,
        reviewedAt: new Date() 
      })
      .where(eq(commentReports.id, id))
      .returning();
    return updated;
  }

  // Hero text settings operations
  async getHeroTextSettings(textType: string): Promise<HeroTextSettings | null> {
    const [result] = await db
      .select()
      .from(heroTextSettings)
      .where(and(eq(heroTextSettings.textType, textType), eq(heroTextSettings.isActive, true)))
      .limit(1);
    return result || null;
  }

  async updateHeroTextSettings(textType: string, settings: { title: string; subtitle: string; updatedBy: number }): Promise<HeroTextSettings> {
    // First check if settings exist
    const existing = await this.getHeroTextSettings(textType);
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(heroTextSettings)
        .set({
          title: settings.title,
          subtitle: settings.subtitle,
          updatedBy: settings.updatedBy,
          updatedAt: new Date()
        })
        .where(eq(heroTextSettings.textType, textType))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(heroTextSettings)
        .values({
          textType,
          title: settings.title,
          subtitle: settings.subtitle,
          updatedBy: settings.updatedBy,
          isActive: true
        })
        .returning();
      return created;
    }
  }

  // Recommendation operations
  async getRecommendedClips(userId: number, limit: number = 8): Promise<ClipWithUser[]> {
    try {
      // Get user's favorite games
      const favoriteGames = await this.getUserGameFavorites(userId);
      
      if (!favoriteGames || favoriteGames.length === 0) {
        // If user has no favorite games, return trending clips
        return this.getTrendingClips('day', limit, undefined, userId);
      }
      
      // Get game IDs from favorite games, filtering out any null/undefined values
      const gameIds = favoriteGames
        .map(game => game.id)
        .filter(id => id != null && id !== undefined);
      
      // If no valid game IDs, fallback to trending clips
      if (gameIds.length === 0) {
        return this.getTrendingClips('day', limit, undefined, userId);
      }
      
      // Find clips from those games, excluding the user's own clips
      const recommendedClips = await db
        .select({
          id: clips.id,
          title: clips.title,
          description: clips.description,
          videoUrl: clips.videoUrl,
          thumbnailUrl: clips.thumbnailUrl,
          userId: clips.userId,
          gameId: clips.gameId,
          views: clips.views,
          duration: clips.duration,
          videoType: clips.videoType,
          createdAt: clips.createdAt,
          updatedAt: clips.updatedAt,
          // User fields with aliases
          userUsername: users.username,
          userDisplayName: users.displayName,
          userAvatarUrl: users.avatarUrl,
          userAvatarBorderColor: users.avatarBorderColor,
          userAccentColor: users.accentColor,
          userPrimaryColor: users.primaryColor,
          userBackgroundColor: users.backgroundColor,
          userCardColor: users.cardColor,
          // Game fields with aliases
          gameName: games.name,
          gameImageUrl: games.imageUrl,
        })
        .from(clips)
        .innerJoin(users, eq(clips.userId, users.id))
        .leftJoin(games, eq(clips.gameId, games.id))
        .where(
          and(
            inArray(clips.gameId, gameIds),
            ne(clips.userId, userId) // Exclude user's own clips
          )
        )
        .orderBy(desc(clips.views), desc(clips.createdAt), desc(clips.id))
        .limit(limit);
      
      // Transform the flat result into the expected nested structure
      const transformedClips = recommendedClips.map(clip => ({
        id: clip.id,
        title: clip.title,
        description: clip.description,
        videoUrl: clip.videoUrl,
        thumbnailUrl: clip.thumbnailUrl,
        userId: clip.userId,
        gameId: clip.gameId,
        views: clip.views,
        duration: clip.duration,
        videoType: clip.videoType,
        createdAt: clip.createdAt,
        updatedAt: clip.updatedAt,
        user: {
          id: clip.userId,
          username: clip.userUsername,
          displayName: clip.userDisplayName,
          avatarUrl: clip.userAvatarUrl,
          avatarBorderColor: clip.userAvatarBorderColor,
          accentColor: clip.userAccentColor,
          primaryColor: clip.userPrimaryColor,
          backgroundColor: clip.userBackgroundColor,
          cardColor: clip.userCardColor,
        },
        game: clip.gameId ? {
          id: clip.gameId,
          name: clip.gameName,
          imageUrl: clip.gameImageUrl,
        } : null
      }));
      
      // If not enough clips from favorite games, supplement with trending clips
      if (transformedClips.length < limit) {
        const remainingLimit = limit - transformedClips.length;
        const trendingClips = await this.getTrendingClips('day', remainingLimit, undefined, userId);
        
        // Filter out clips already in recommendations and user's own clips
        const existingClipIds = new Set(transformedClips.map(clip => clip.id));
        const additionalClips = trendingClips.filter(
          clip => !existingClipIds.has(clip.id) && clip.userId !== userId
        );
        
        transformedClips.push(...additionalClips.slice(0, remainingLimit));
      }
      
      return transformedClips;
    } catch (error) {
      console.error('Error getting recommended clips:', error);
      // Fallback to trending clips if recommendations fail
      return this.getTrendingClips('day', limit, undefined, userId);
    }
  }

  // Screenshot admin operations
  async getAllScreenshots(limit: number = 10, offset: number = 0): Promise<Array<{
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
    game?: { id: number; name: string; imageUrl?: string | null } | null;
  }>> {
    try {
      const screenshots = await db
        .select({
          id: screenshots.id,
          title: screenshots.title,
          description: screenshots.description,
          imageUrl: screenshots.imageUrl,
          thumbnailUrl: screenshots.thumbnailUrl,
          views: screenshots.views,
          createdAt: screenshots.createdAt,
          updatedAt: screenshots.updatedAt,
          userId: screenshots.userId,
          gameId: screenshots.gameId,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl
          },
          game: {
            id: games.id,
            name: games.name,
            imageUrl: games.imageUrl
          }
        })
        .from(screenshots)
        .leftJoin(users, eq(screenshots.userId, users.id))
        .leftJoin(games, eq(screenshots.gameId, games.id))
        .orderBy(desc(screenshots.createdAt), desc(screenshots.id)) // Stable pagination with tie-breaker
        .limit(limit)
        .offset(offset);
      
      return screenshots.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.imageUrl,
        thumbnailUrl: row.thumbnailUrl,
        views: row.views,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
        gameId: row.gameId,
        user: row.user?.id ? { ...row.user } : null,
        game: row.game?.id ? { ...row.game } : null
      }));
    } catch (error) {
      console.error('Error getting all screenshots:', error);
      return [];
    }
  }

  async getScreenshotCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(screenshots);
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting screenshot count:', error);
      return 0;
    }
  }

  // Unified content moderation operations
  async getRecentContent(limit: number = 20, offset: number = 0, contentType?: string): Promise<Array<{
    id: number;
    type: 'clip' | 'reel' | 'screenshot';
    title: string;
    description?: string | null;
    user: { id: number; username: string; displayName: string } | null;
    game?: { id: number; name: string };
    createdAt: Date;
    url: string;
    thumbnailUrl?: string | null;
    views: number;
  }>> {
    try {
      // Optimize: when contentType is specified, run only the matching SELECT
      if (contentType === 'clip') {
        const clipsData = await db
          .select({
            id: clips.id,
            title: clips.title,
            description: clips.description,
            videoType: clips.videoType,
            videoUrl: clips.videoUrl,
            thumbnailUrl: clips.thumbnailUrl,
            views: clips.views,
            createdAt: clips.createdAt,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName
            },
            game: {
              id: games.id,
              name: games.name
            }
          })
          .from(clips)
          .leftJoin(users, eq(clips.userId, users.id))
          .leftJoin(games, eq(clips.gameId, games.id))
          .where(eq(clips.videoType, 'clip'))
          .orderBy(desc(clips.createdAt), desc(clips.id))
          .limit(limit)
          .offset(offset);

        return clipsData.map(clip => ({
          id: clip.id,
          type: 'clip' as const,
          title: clip.title,
          description: clip.description,
          user: clip.user?.id ? { ...clip.user } : null,
          game: clip.game?.id ? { ...clip.game } : null,
          createdAt: clip.createdAt,
          url: clip.videoUrl,
          thumbnailUrl: clip.thumbnailUrl,
          views: clip.views
        }));
      }

      if (contentType === 'reel') {
        const reelsData = await db
          .select({
            id: clips.id,
            title: clips.title,
            description: clips.description,
            videoType: clips.videoType,
            videoUrl: clips.videoUrl,
            thumbnailUrl: clips.thumbnailUrl,
            views: clips.views,
            createdAt: clips.createdAt,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName
            },
            game: {
              id: games.id,
              name: games.name
            }
          })
          .from(clips)
          .leftJoin(users, eq(clips.userId, users.id))
          .leftJoin(games, eq(clips.gameId, games.id))
          .where(eq(clips.videoType, 'reel'))
          .orderBy(desc(clips.createdAt), desc(clips.id))
          .limit(limit)
          .offset(offset);

        return reelsData.map(reel => ({
          id: reel.id,
          type: 'reel' as const,
          title: reel.title,
          description: reel.description,
          user: reel.user?.id ? { ...reel.user } : null,
          game: reel.game?.id ? { ...reel.game } : null,
          createdAt: reel.createdAt,
          url: reel.videoUrl,
          thumbnailUrl: reel.thumbnailUrl,
          views: reel.views
        }));
      }

      if (contentType === 'screenshot') {
        const screenshotsData = await db
          .select({
            id: screenshots.id,
            title: screenshots.title,
            description: screenshots.description,
            imageUrl: screenshots.imageUrl,
            thumbnailUrl: screenshots.thumbnailUrl,
            views: screenshots.views,
            createdAt: screenshots.createdAt,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName
            },
            game: {
              id: games.id,
              name: games.name
            }
          })
          .from(screenshots)
          .leftJoin(users, eq(screenshots.userId, users.id))
          .leftJoin(games, eq(screenshots.gameId, games.id))
          .orderBy(desc(screenshots.createdAt), desc(screenshots.id))
          .limit(limit)
          .offset(offset);

        return screenshotsData.map(screenshot => ({
          id: screenshot.id,
          type: 'screenshot' as const,
          title: screenshot.title,
          description: screenshot.description,
          user: screenshot.user?.id ? { ...screenshot.user } : null,
          game: screenshot.game?.id ? { ...screenshot.game } : null,
          createdAt: screenshot.createdAt,
          url: screenshot.imageUrl,
          thumbnailUrl: screenshot.thumbnailUrl,
          views: screenshot.views
        }));
      }

      // For unified view (no contentType filter), get all content types and merge
      const [clipsData, screenshotsData] = await Promise.all([
        // Get clips and reels
        db
          .select({
            id: clips.id,
            title: clips.title,
            description: clips.description,
            videoType: clips.videoType,
            videoUrl: clips.videoUrl,
            thumbnailUrl: clips.thumbnailUrl,
            views: clips.views,
            createdAt: clips.createdAt,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName
            },
            game: {
              id: games.id,
              name: games.name
            }
          })
          .from(clips)
          .leftJoin(users, eq(clips.userId, users.id))
          .leftJoin(games, eq(clips.gameId, games.id))
          .orderBy(desc(clips.createdAt), desc(clips.id))
          .limit(Math.ceil(limit * 1.5)), // Get more to ensure we have enough after merging

        // Get screenshots
        db
          .select({
            id: screenshots.id,
            title: screenshots.title,
            description: screenshots.description,
            imageUrl: screenshots.imageUrl,
            thumbnailUrl: screenshots.thumbnailUrl,
            views: screenshots.views,
            createdAt: screenshots.createdAt,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName
            },
            game: {
              id: games.id,
              name: games.name
            }
          })
          .from(screenshots)
          .leftJoin(users, eq(screenshots.userId, users.id))
          .leftJoin(games, eq(screenshots.gameId, games.id))
          .orderBy(desc(screenshots.createdAt), desc(screenshots.id))
          .limit(Math.ceil(limit * 1.5)) // Get more to ensure we have enough after merging
      ]);

      // Transform and merge all content
      const allContent: Array<{
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
      }> = [];

      // Add clips and reels
      allContent.push(...clipsData.map(clip => ({
        id: clip.id,
        type: (clip.videoType || 'clip') as 'clip' | 'reel',
        title: clip.title,
        description: clip.description,
        user: clip.user?.id ? { ...clip.user } : null,
        game: clip.game?.id ? { ...clip.game } : null,
        createdAt: clip.createdAt,
        url: clip.videoUrl,
        thumbnailUrl: clip.thumbnailUrl,
        views: clip.views
      })));

      // Add screenshots
      allContent.push(...screenshotsData.map(screenshot => ({
        id: screenshot.id,
        type: 'screenshot' as const,
        title: screenshot.title,
        description: screenshot.description,
        user: screenshot.user?.id ? { ...screenshot.user } : null,
        game: screenshot.game?.id ? { ...screenshot.game } : null,
        createdAt: screenshot.createdAt,
        url: screenshot.imageUrl,
        thumbnailUrl: screenshot.thumbnailUrl,
        views: screenshot.views
      })));

      // Sort by creation date and apply pagination
      const sortedContent = allContent
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit);

      return sortedContent;
    } catch (error) {
      console.error('Error getting recent content:', error);
      return [];
    }
  }

  async getRecentContentCount(contentType?: string): Promise<number> {
    try {
      // Optimize: when contentType is specified, run only the matching COUNT
      if (contentType === 'clip') {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(clips)
          .where(eq(clips.videoType, 'clip'));
        return result?.count || 0;
      }

      if (contentType === 'reel') {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(clips)
          .where(eq(clips.videoType, 'reel'));
        return result?.count || 0;
      }

      if (contentType === 'screenshot') {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(screenshots);
        return result?.count || 0;
      }

      // For unified count (no contentType filter), sum all content types
      const [clipResult, screenshotResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(clips),
        db.select({ count: sql<number>`count(*)` }).from(screenshots)
      ]);

      return (clipResult[0]?.count || 0) + (screenshotResult[0]?.count || 0);
    } catch (error) {
      console.error('Error getting recent content count:', error);
      return 0;
    }
  }

  // Banner settings operations
  async getBannerSettings(): Promise<BannerSettings | null> {
    try {
      const [settings] = await db
        .select()
        .from(bannerSettings)
        .limit(1);
      return settings || null;
    } catch (error) {
      console.error('Error getting banner settings:', error);
      return null;
    }
  }

  async createBannerSettings(settings: InsertBannerSettings): Promise<BannerSettings> {
    try {
      const [created] = await db
        .insert(bannerSettings)
        .values(settings)
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating banner settings:', error);
      throw error;
    }
  }

  async updateBannerSettings(settings: Partial<BannerSettings>): Promise<BannerSettings | null> {
    try {
      // Get the existing settings first to get the ID
      const existing = await this.getBannerSettings();
      if (!existing) {
        return null;
      }

      const [updated] = await db
        .update(bannerSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(bannerSettings.id, existing.id))
        .returning();
      
      return updated || null;
    } catch (error) {
      console.error('Error updating banner settings:', error);
      return null;
    }
  }
}