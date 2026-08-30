import { storage } from "./storage";
import { InsertUserPointsHistory, InsertWeeklyLeaderboard, InsertTopContributor } from "@shared/schema";

// Point values for different actions
// Points are used for BOTH leaderboards AND leveling
// Every point earned contributes to user's level progression
// NOTE: These are mutable — they are overwritten at startup from the xp_settings DB table
export let POINT_VALUES: Record<string, number> = {
  upload: 250,                    // Legacy compatibility value; real upload XP uses XPService
  screenshot_upload: 100,         // 100 XP for uploading screenshots
  like: 5,                        // 5 XP for liking content (like_given)
  like_received: 10,              // 10 XP when your content receives a like
  comment: 15,                    // 15 XP for commenting on a clip (comment_given)
  comment_received: 20,           // 20 XP when your content receives a comment
  fire: 50,                       // Legacy compatibility value; real fire XP uses XPService
  share_received: 40,             // 40 XP when your clip is shared
  follow_received: 50,            // 50 XP when someone follows you
  share_given: 20,                // 20 XP for sharing a clip
  view: 1,                        // Legacy compatibility value; real view XP uses XPService
  daily_login: 25,                // 25 XP for daily login
  streak_milestone: 0,            // Variable XP for streak milestones (set dynamically)
  watch_5_clips: 10,              // 10 XP for watching 5 clips in a day
  watch_20_clips: 30,             // 30 XP for watching 20 clips in a day
  first_upload_of_day: 100,       // 100 XP for first upload of the day
  weekly_uploads_5: 300,          // 300 XP for 5 uploads in a week
  weekly_uploads_10: 750,         // 750 XP for 10 uploads in a week
  first_100_views: 250,           // 250 XP first clip to reach 100 views
  first_1000_views: 1000,         // 1000 XP first clip to reach 1,000 views
  lootbox_bonus: 100,             // 100 XP for opening the daily lootbox
  consecutive_upload_bonus: 75,   // 75 XP for uploading within 24h of last upload
  weekend_upload_bonus: 0,        // Variable - 50% of upload XP on weekends
  mobile_app_daily: 10,           // 10 XP per day for having the mobile app installed
  // Ranked season league thresholds — configurable through the admin XP settings
  league_silver_threshold: 5000,
  league_gold_threshold: 12500,
  league_platinum_threshold: 22500,
  league_onyx_threshold: 35000,
  league_diamond_threshold: 50000,
  league_champion_threshold: 70000,
};

export type SeasonLeagueName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Onyx" | "Diamond" | "Champion";

export function getSeasonLeagueTiers() {
  return [
    { name: "Bronze" as const, icon: "🥉", color: "#CD7F32", min: 0, max: POINT_VALUES.league_silver_threshold - 1, philosophy: "The starting point of every ranked season.", reward: "Basic profile border" },
    { name: "Silver" as const, icon: "🥈", color: "#C0C0C0", min: POINT_VALUES.league_silver_threshold, max: POINT_VALUES.league_gold_threshold - 1, philosophy: "An active community member.", reward: "Exclusive profile theme" },
    { name: "Gold" as const, icon: "🥇", color: "#FFD700", min: POINT_VALUES.league_gold_threshold, max: POINT_VALUES.league_platinum_threshold - 1, philosophy: "A dedicated creator.", reward: "Animated badge" },
    { name: "Platinum" as const, icon: "💎", color: "#4FC3F7", min: POINT_VALUES.league_platinum_threshold, max: POINT_VALUES.league_onyx_threshold - 1, philosophy: "An elite contributor.", reward: "Exclusive avatar frame" },
    { name: "Onyx" as const, icon: "🖤", color: "#8B5CF6", min: POINT_VALUES.league_onyx_threshold, max: POINT_VALUES.league_diamond_threshold - 1, philosophy: "Among the platform's best creators.", reward: "Animated profile effect" },
    { name: "Diamond" as const, icon: "💠", color: "#E0E7FF", min: POINT_VALUES.league_diamond_threshold, max: POINT_VALUES.league_champion_threshold - 1, philosophy: "Reserved for the best creators.", reward: "Diamond badge + season cosmetic", rankGate: 100 },
    { name: "Champion" as const, icon: "🏆", color: "#B7FF1A", min: POINT_VALUES.league_champion_threshold, max: Infinity, philosophy: "Reserved for the very best players.", reward: "Champion badge, profile border + title", rankGate: 10 },
  ];
}

// The canonical XP settings definition used to seed the database and label each setting
export const XP_SETTINGS_DEFINITION: Array<{
  key: string;
  label: string;
  description: string;
  category: string;
}> = [
  { key: "upload", label: "Clip/Reel Upload", description: "XP awarded when a user uploads a clip or reel", category: "engagement" },
  { key: "screenshot_upload", label: "Screenshot Upload", description: "XP awarded when a user uploads a screenshot", category: "engagement" },
  { key: "like", label: "Like Given", description: "XP awarded when a user likes content", category: "engagement" },
  { key: "like_received", label: "Like Received", description: "XP awarded when your content receives a like", category: "engagement" },
  { key: "comment", label: "Comment Given", description: "XP awarded when a user comments on content", category: "engagement" },
  { key: "comment_received", label: "Comment Received", description: "XP awarded when your content receives a comment", category: "engagement" },
  { key: "fire", label: "Fire Reaction Received", description: "XP awarded when your content receives a fire reaction", category: "engagement" },
  { key: "share_received", label: "Share Received", description: "XP awarded when your clip is shared", category: "engagement" },
  { key: "follow_received", label: "Follow Received", description: "XP awarded when someone follows you", category: "engagement" },
  { key: "share_given", label: "Share Given", description: "XP awarded when a user shares a clip", category: "engagement" },
  { key: "view", label: "View (per view)", description: "XP awarded per view on uploaded content", category: "engagement" },
  { key: "daily_login", label: "Daily Login", description: "XP awarded for logging in each day", category: "daily_activity" },
  { key: "watch_5_clips", label: "Watch 5 Clips (Daily)", description: "XP awarded for watching 5 clips in a day", category: "daily_activity" },
  { key: "watch_20_clips", label: "Watch 20 Clips (Daily)", description: "XP awarded for watching 20 clips in a day", category: "daily_activity" },
  { key: "first_upload_of_day", label: "First Upload of Day", description: "XP awarded for the first clip uploaded each day", category: "creator_milestones" },
  { key: "weekly_uploads_5", label: "5 Uploads in a Week", description: "XP awarded when you reach 5 uploads in a week", category: "creator_milestones" },
  { key: "weekly_uploads_10", label: "10 Uploads in a Week", description: "XP awarded when you reach 10 uploads in a week", category: "creator_milestones" },
  { key: "first_100_views", label: "First Clip to 100 Views", description: "XP awarded when your first clip reaches 100 views", category: "creator_milestones" },
  { key: "first_1000_views", label: "First Clip to 1,000 Views", description: "XP awarded when your first clip reaches 1,000 views", category: "creator_milestones" },
  { key: "lootbox_bonus", label: "Daily Lootbox Opened", description: "XP awarded for opening the daily lootbox", category: "bonus_events" },
  { key: "consecutive_upload_bonus", label: "Upload Within 24h Bonus", description: "XP bonus for uploading within 24h of your last upload", category: "bonus_events" },
  { key: "mobile_app_daily", label: "Mobile App Daily Bonus", description: "10 XP per day awarded to users who have the mobile app installed", category: "daily_activity" },
  { key: "league_silver_threshold", label: "Silver League Threshold", description: "Season XP required to enter Silver League", category: "ranked_league" },
  { key: "league_gold_threshold", label: "Gold League Threshold", description: "Season XP required to enter Gold League", category: "ranked_league" },
  { key: "league_platinum_threshold", label: "Platinum League Threshold", description: "Season XP required to enter Platinum League", category: "ranked_league" },
  { key: "league_onyx_threshold", label: "Onyx League Threshold", description: "Season XP required to enter Onyx League", category: "ranked_league" },
  { key: "league_diamond_threshold", label: "Diamond League Threshold", description: "Season XP required for Diamond, alongside a top-100 rank", category: "ranked_league" },
  { key: "league_champion_threshold", label: "Champion League Threshold", description: "Season XP required for Champion, alongside a top-10 rank", category: "ranked_league" },
];

// Load XP settings from the DB and update POINT_VALUES in memory
export async function loadXpSettingsFromDB(): Promise<void> {
  try {
    const settings = await storage.getXpSettings();
    const existingKeys = new Set(settings.map((setting) => setting.key));
    for (const definition of XP_SETTINGS_DEFINITION) {
      if (!existingKeys.has(definition.key)) {
        await storage.upsertXpSetting({
          key: definition.key,
          value: POINT_VALUES[definition.key] ?? 0,
          label: definition.label,
          description: definition.description,
          category: definition.category,
          updatedBy: null,
        });
      }
    }
    for (const setting of settings) {
      POINT_VALUES[setting.key] = setting.value;
    }
    console.log(`✅ Loaded ${settings.length} XP settings from DB`);
  } catch (err) {
    console.warn('⚠️ Could not load XP settings from DB, using defaults:', err);
  }
}

// Update a single XP setting in memory and persist to DB
export function updatePointValue(key: string, value: number): void {
  POINT_VALUES[key] = value;
}

export class LeaderboardService {
  // Weekly XP windows are calendar weeks: Monday 00:00 through the next
  // Monday 00:00 in the server's configured timezone.
  static getWeekStart(date: Date = new Date()): Date {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  static getWeekEnd(date: Date = new Date()): Date {
    const end = this.getWeekStart(date);
    end.setDate(end.getDate() + 7);
    return end;
  }

  // Get current week in ISO format (e.g., "2024-W01")
  // Week starts on Monday per ISO 8601 standard
  static getCurrentWeek(date?: Date): { week: string; year: number } {
    const now = date || new Date();
    
    // Calculate start of week (Monday)
    const startOfWeek = this.getWeekStart(now);
    
    // Calculate week number using ISO 8601 (Monday start)
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((startOfWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const week = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    return { week, year: now.getFullYear() };
  }

  // Award points to a user for an action
  // Points are used for both leaderboards AND leveling
  static async awardPoints(
    userId: number,
    action: keyof typeof POINT_VALUES,
    description?: string,
    timestamp?: Date
  ): Promise<void> {
    const points = POINT_VALUES[action];
    
    // Record the points in history with the correct timestamp
    const pointsHistory: InsertUserPointsHistory = {
      userId,
      action,
      points,
      description: description || `Points awarded for ${action}`,
      createdAt: timestamp,
    };
    
    await storage.addUserPointsHistory(pointsHistory);
    
    // Update user's total points (stored in totalXP field) and recalculate level
    await storage.incrementUserPoints(userId, points);
    await this.updateUserLevel(userId);
    
    // Update both monthly and weekly leaderboards using the timestamp
    await Promise.all([
      this.updateMonthlyLeaderboard(userId, action, points, timestamp),
      this.updateWeeklyLeaderboard(userId, action, points, timestamp)
    ]);
  }

  static async awardCustomPoints(
    userId: number,
    action: string,
    points: number,
    description?: string,
    timestamp?: Date
  ): Promise<void> {
    const pointsHistory: InsertUserPointsHistory = {
      userId,
      action,
      points,
      description: description || `Points awarded for ${action}`,
      createdAt: timestamp,
    };
    
    await storage.addUserPointsHistory(pointsHistory);
    await storage.incrementUserPoints(userId, points);
    await this.updateUserLevel(userId);
    
    await Promise.all([
      this.updateMonthlyLeaderboard(userId, action as any, points, timestamp),
      this.updateWeeklyLeaderboard(userId, action as any, points, timestamp)
    ]);
  }

  // Deduct points from a user when they delete content
  static async deductPoints(
    userId: number,
    action: keyof typeof POINT_VALUES,
    description?: string,
    timestamp?: Date
  ): Promise<void> {
    const points = POINT_VALUES[action];
    
    // Record the point deduction in history (negative points)
    const pointsHistory: InsertUserPointsHistory = {
      userId,
      action,
      points: -points, // Negative to indicate deduction
      description: description || `Points deducted for deleting ${action}`,
      createdAt: timestamp,
    };
    
    await storage.addUserPointsHistory(pointsHistory);
    
    // Deduct from user's total points and recalculate level
    await storage.incrementUserPoints(userId, -points); // Negative to deduct
    await this.updateUserLevel(userId);
    
    // Update both monthly and weekly leaderboards using the timestamp
    await Promise.all([
      this.updateMonthlyLeaderboard(userId, action, -points, timestamp),
      this.updateWeeklyLeaderboard(userId, action, -points, timestamp)
    ]);
  }

  // Update user's level based on their total points
  static async updateUserLevel(userId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;
      
      const { calculateLevel } = await import("./level-system");
      // Note: totalXP field stores total points (field name kept for DB compatibility)
      const newLevel = calculateLevel(user.totalXP);
      
      // Only update if level has changed
      if (newLevel !== user.level) {
        await storage.updateUser(userId, { level: newLevel });
        console.log(`✨ User ${userId} leveled up to level ${newLevel}!`);
      }
    } catch (error) {
      console.error("Error updating user level:", error);
    }
  }

  // Update the monthly leaderboard for a user
  static async updateMonthlyLeaderboard(
    userId: number,
    action: keyof typeof POINT_VALUES,
    points: number,
    timestamp?: Date
  ): Promise<void> {
    const now = timestamp || new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    // Get or create monthly leaderboard entry
    let entry = await storage.getMonthlyLeaderboardEntry(userId, monthKey, year);
    
    const isDeduction = points < 0;
    const countDelta = isDeduction ? -1 : 1;

    if (!entry) {
      entry = await storage.createMonthlyLeaderboardEntry({
        userId,
        month: monthKey,
        year,
        uploadsCount: action === 'upload' ? Math.max(0, countDelta) : 0,
        likesGivenCount: action === 'like' ? Math.max(0, countDelta) : 0,
        commentsCount: action === 'comment' ? Math.max(0, countDelta) : 0,
        firesGivenCount: action === 'fire' ? Math.max(0, countDelta) : 0,
        viewsCount: action === 'view' ? Math.max(0, countDelta) : 0,
        totalPoints: points,
      });
    } else {
      const updates = {
        uploadsCount: Math.max(0, entry.uploadsCount + (action === 'upload' ? countDelta : 0)),
        likesGivenCount: Math.max(0, entry.likesGivenCount + (action === 'like' ? countDelta : 0)),
        commentsCount: Math.max(0, entry.commentsCount + (action === 'comment' ? countDelta : 0)),
        firesGivenCount: Math.max(0, entry.firesGivenCount + (action === 'fire' ? countDelta : 0)),
        viewsCount: Math.max(0, entry.viewsCount + (action === 'view' ? countDelta : 0)),
        totalPoints: entry.totalPoints + points,
      };
      
      await storage.updateMonthlyLeaderboardEntry(entry.id, updates);
    }

    await this.recalculateRankings(monthKey, year);
  }

  static async recalculateRankings(month: string, year: number): Promise<void> {
    await storage.recalculateMonthlyRankings(month, year);
  }

  static async updateWeeklyLeaderboard(
    userId: number,
    action: keyof typeof POINT_VALUES,
    points: number,
    timestamp?: Date
  ): Promise<void> {
    const { week, year } = this.getCurrentWeek(timestamp);

    const isDeduction = points < 0;
    const countDelta = isDeduction ? -1 : 1;

    let entry = await storage.getWeeklyLeaderboardEntry(userId, week, year);
    
    if (!entry) {
      entry = await storage.createWeeklyLeaderboardEntry({
        userId,
        week,
        year,
        uploadsCount: action === 'upload' ? Math.max(0, countDelta) : 0,
        likesGivenCount: action === 'like' ? Math.max(0, countDelta) : 0,
        commentsCount: action === 'comment' ? Math.max(0, countDelta) : 0,
        firesGivenCount: action === 'fire' ? Math.max(0, countDelta) : 0,
        viewsCount: action === 'view' ? Math.max(0, countDelta) : 0,
        totalPoints: points,
      });
    } else {
      const updates = {
        uploadsCount: Math.max(0, entry.uploadsCount + (action === 'upload' ? countDelta : 0)),
        likesGivenCount: Math.max(0, entry.likesGivenCount + (action === 'like' ? countDelta : 0)),
        commentsCount: Math.max(0, entry.commentsCount + (action === 'comment' ? countDelta : 0)),
        firesGivenCount: Math.max(0, entry.firesGivenCount + (action === 'fire' ? countDelta : 0)),
        viewsCount: Math.max(0, entry.viewsCount + (action === 'view' ? countDelta : 0)),
        totalPoints: entry.totalPoints + points,
      };
      
      await storage.updateWeeklyLeaderboardEntry(entry.id, updates);
    }

    // Recalculate rankings for the week
    await this.recalculateWeeklyRankings(week, year);
  }

  // Recalculate rankings for a specific week
  static async recalculateWeeklyRankings(week: string, year: number): Promise<void> {
    await storage.recalculateWeeklyRankings(week, year);
  }

  // Get current month leaderboard
  static async getCurrentMonthLeaderboard(limit: number = 10) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    return await storage.getMonthlyLeaderboard(monthKey, year, limit);
  }

  // Get previous month leaderboard
  static async getPreviousMonthLeaderboard(limit: number = 10) {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthKey = `${year}-${String(prevMonth).padStart(2, '0')}`;

    return await storage.getMonthlyLeaderboard(monthKey, year, limit);
  }

  // Get user's current month stats
  static async getUserCurrentMonthStats(userId: number) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    return await storage.getMonthlyLeaderboardEntry(userId, monthKey, year);
  }

  // Get current week leaderboard
  static async getCurrentWeekLeaderboard(limit: number = 10) {
    const { week, year } = this.getCurrentWeek();
    return await storage.getWeeklyLeaderboard(week, year, limit);
  }

  // Get previous week leaderboard
  static async getPreviousWeekLeaderboard(limit: number = 10) {
    const previousWeek = new Date(this.getWeekStart());
    previousWeek.setDate(previousWeek.getDate() - 7);
    const { week, year } = this.getCurrentWeek(previousWeek);

    return await storage.getWeeklyLeaderboard(week, year, limit);
  }

  // Get user's current week stats
  static async getUserCurrentWeekStats(userId: number) {
    const { week, year } = this.getCurrentWeek();
    return await storage.getWeeklyLeaderboardEntry(userId, week, year);
  }

  // Get all-time leaderboard (aggregated from all monthly leaderboards)
  static async getAllTimeLeaderboard(limit: number = 10) {
    return await storage.getAllTimeLeaderboard(limit);
  }

  // Store top contributors when a period ends (weekly/monthly)
  static async storeTopContributors(periodType: 'weekly' | 'monthly', period: string, year: number): Promise<void> {
    try {
      // Get the top contributor for the period
      let topContributor;
      
      if (periodType === 'weekly') {
        const weeklyLeaderboard = await storage.getWeeklyLeaderboard(period, year, 1);
        if (weeklyLeaderboard.length > 0) {
          topContributor = weeklyLeaderboard[0];
        }
      } else {
        const monthlyLeaderboard = await storage.getMonthlyLeaderboard(period, year, 1);
        if (monthlyLeaderboard.length > 0) {
          topContributor = monthlyLeaderboard[0];
        }
      }

      if (topContributor) {
        // Skip if a winner has already been recorded for this period (unfiltered — checks all statuses)
        const existing = await storage.getTopContributorByPeriod(periodType, period, year);
        if (existing) {
          console.log(`Top contributor for ${periodType} ${period} already recorded, skipping`);
          return;
        }

        // Store the top contributor in the topContributors table
        const contributorData: InsertTopContributor = {
          userId: topContributor.userId,
          periodType,
          period,
          year,
          totalPoints: topContributor.totalPoints,
          uploadsCount: topContributor.uploadsCount,
          likesGivenCount: topContributor.likesGivenCount,
          commentsCount: topContributor.commentsCount,
          firesGivenCount: topContributor.firesGivenCount || 0,
          viewsCount: topContributor.viewsCount || 0,
        };

        await storage.createTopContributor(contributorData);
        console.log(`Top contributor stored for ${periodType} ${period}: User ${topContributor.userId} with ${topContributor.totalPoints} points`);

        // Award "Monthly Top Contributor" badge for monthly winners
        if (periodType === 'monthly') {
          try {
            // Get the "Monthly Top Contributor" badge
            const monthlyBadge = await storage.getBadgeByName('Monthly Top Contributor');
            
            if (monthlyBadge) {
              // Check if user already has this badge for this specific month
              const existingBadges = await storage.getUserBadges(topContributor.userId);
              const alreadyHasBadgeForPeriod = existingBadges.some(
                ub => ub.badgeId === monthlyBadge.id && 
                      ub.createdAt && 
                      ub.createdAt.toISOString().startsWith(`${year}-${period.split('-')[1]}`)
              );

              if (!alreadyHasBadgeForPeriod) {
                await storage.createUserBadge({
                  userId: topContributor.userId,
                  badgeId: monthlyBadge.id,
                  assignedBy: 'system',
                  assignedById: null,
                  expiresAt: null // Badge doesn't expire
                });
                
                console.log(`🏆 Monthly Top Contributor badge awarded to user ${topContributor.userId} for ${period}`);
              }
            }
          } catch (badgeError) {
            console.error(`Error awarding monthly badge to user ${topContributor.userId}:`, badgeError);
          }
        }
      }
    } catch (error) {
      console.error(`Error storing top contributors for ${periodType} ${period}:`, error);
    }
  }

  // Check and process period endings (to be called periodically, e.g., daily cron job)
  static async processPeriodicLeaderboardClosures(): Promise<void> {
    try {
      const now = new Date();
      
      // Check if a week has ended (Sunday to Saturday)
      if (now.getDay() === 1) { // Monday - store last week's winner
        const prevWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfYear = new Date(prevWeek.getFullYear(), 0, 1);
        const days = Math.floor((prevWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        const week = `${prevWeek.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        
        await this.storeTopContributors('weekly', week, prevWeek.getFullYear());
      }

      // Check if a month has ended
      if (now.getDate() === 1) { // First day of month - store last month's winner
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const monthKey = `${year}-${String(prevMonth).padStart(2, '0')}`;
        
        await this.storeTopContributors('monthly', monthKey, year);
      }
    } catch (error) {
      console.error('Error processing periodic leaderboard closures:', error);
    }
  }

  // Get top contributors by period type
  static async getTopContributors(periodType: 'weekly' | 'monthly', limit: number = 10) {
    return await storage.getTopContributors(periodType, limit);
  }

  // Get top contributors for a specific period
  static async getTopContributorsByPeriod(periodType: 'weekly' | 'monthly', period: string, year: number) {
    return await storage.getTopContributorsByPeriod(periodType, period, year);
  }

  // Initialize leaderboard for all existing users (run once)
  static async initializeLeaderboard(): Promise<void> {
    console.log("Initializing leaderboard system...");
    
    // This would be called once to populate initial data
    // For now, we'll just ensure the current month entries exist for active users
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    console.log(`Leaderboard initialized for ${monthKey}`);
  }
}