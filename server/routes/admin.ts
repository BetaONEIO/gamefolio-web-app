import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { adminMiddleware } from "../middleware/admin";
import { randomBytes } from "crypto";
import { VideoProcessor } from '../video-processor';
import path from 'path';
import fs from 'fs';
import { ContentFilterService } from '../services/content-filter';

// Create admin router
const adminRouter = Router();

// ENTERPRISE-GRADE BOOTSTRAP ENDPOINT with security controls
adminRouter.post("/initialize", async (req: Request, res: Response) => {
  try {
    // MANDATORY SECURITY: Require bootstrap secret from environment
    const providedSecret = req.headers['x-bootstrap-secret'] || req.body.bootstrapSecret;
    const requiredSecret = process.env.BOOTSTRAP_SECRET;
    
    if (!requiredSecret) {
      console.error('🚨 SECURITY: BOOTSTRAP_SECRET not configured in environment');
      return res.status(500).json({ 
        message: "Bootstrap secret not configured. Contact system administrator." 
      });
    }
    
    if (!providedSecret || providedSecret !== requiredSecret) {
      console.error('🚨 SECURITY: Invalid bootstrap secret attempt');
      return res.status(401).json({ 
        message: "Invalid bootstrap credentials" 
      });
    }
    
    // SECURITY: Only allow initialization if no admin users exist
    const adminCount = await storage.getAdminCount();
    
    if (adminCount > 0) {
      console.log('🔒 SECURITY: Bootstrap blocked - admin users already exist');
      return res.status(400).json({ 
        message: "Admin users already exist. Bootstrap disabled for security." 
      });
    }
    
    // Check if mod_tom already exists
    const superAdmin = await storage.getUserByUsername("mod_tom");
    
    if (superAdmin) {
      // Update existing user to admin role
      await storage.updateUser(superAdmin.id, { role: "admin" });
      res.json({ 
        message: "Super admin mod_tom role updated successfully",
        user: { username: superAdmin.username, role: "admin" }
      });
    } else {
      // Create super admin account
      const tempPassword = randomBytes(16).toString('hex');
      const newSuperAdmin = await storage.createUser({
        username: "mod_tom",
        email: "mod_tom@gamefolio.admin",
        displayName: "Administrator",
        role: "admin",
        password: tempPassword, // This should be changed on first login
        bio: "Platform Administrator"
      });
      
      // ENTERPRISE SECURITY: Never return credentials in any environment
      console.log('🔐 AUDIT: Super admin created successfully - credentials secured');
      res.json({ 
        message: "Super admin created successfully. Credentials have been logged securely.",
        user: { username: newSuperAdmin.username, role: "admin" },
        nextSteps: "Check server logs for initial credentials. Change password immediately after first login."
      });
      
      // AUDIT LOG: Securely log the temporary password for admin access
      console.log('🔑 BOOTSTRAP CREDENTIALS (SECURE LOG):');
      console.log(`   Username: ${newSuperAdmin.username}`);
      console.log(`   Temporary Password: ${tempPassword}`);
      console.log('   ⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
    }
  } catch (err) {
    console.error("Error initializing super admin:", err);
    res.status(500).json({ message: "Error initializing super admin" });
  }
});

// Apply admin middleware to all other routes
adminRouter.use(adminMiddleware);

// GET /api/admin/users - Get all users with pagination
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || "";
    const offset = (page - 1) * limit;

    const users = await storage.getAllUsers(limit, offset, search);
    const total = await storage.getUserCount(search);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// GET /api/admin/users/:id - Get user by ID
adminRouter.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Error fetching user" });
  }
});

// PATCH /api/admin/users/:id - Update user
adminRouter.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user
    const updatedUser = await storage.updateUser(userId, req.body);
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Error updating user" });
  }
});

// POST /api/admin/users/:id/ban - Ban user
adminRouter.post("/users/:id/ban", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is an admin
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot ban an admin user" });
    }

    // Ban user
    const updatedUser = await storage.updateUser(userId, {
      status: "banned",
      bannedReason: req.body.reason || "Violation of community guidelines"
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error banning user:", err);
    res.status(500).json({ message: "Error banning user" });
  }
});

// POST /api/admin/users/:id/unban - Unban user
adminRouter.post("/users/:id/unban", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Unban user
    const updatedUser = await storage.updateUser(userId, {
      status: "active",
      bannedReason: null
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error unbanning user:", err);
    res.status(500).json({ message: "Error unbanning user" });
  }
});

// POST /api/admin/users/:id/make-admin - Make user an admin
adminRouter.post("/users/:id/make-admin", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requesting admin is trying to modify their own role
    const adminUser = req.user;
    if (adminUser.id === userId) {
      return res.status(403).json({ message: "Cannot modify your own admin role" });
    }

    // Make user an admin
    const updatedUser = await storage.updateUser(userId, {
      role: "admin"
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error making user admin:", err);
    res.status(500).json({ message: "Error making user admin" });
  }
});


// POST /api/admin/users/by-username/:username/make-admin - Give admin role to user by username
adminRouter.post("/users/by-username/:username/make-admin", async (req: Request, res: Response) => {
  try {
    const username = req.params.username;
    const user = await storage.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Make user admin
    const updatedUser = await storage.updateUser(user.id, {
      role: "admin"
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error making user admin:", err);
    res.status(500).json({ message: "Error making user admin" });
  }
});

// POST /api/admin/users/:id/remove-admin - Remove admin role from user
adminRouter.post("/users/:id/remove-admin", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requesting admin is trying to modify their own role
    const adminUser = req.user;
    if (adminUser?.id === userId) {
      return res.status(403).json({ message: "Cannot remove your own admin role" });
    }

    // Remove admin role
    const updatedUser = await storage.updateUser(userId, {
      role: "user"
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error removing admin role:", err);
    res.status(500).json({ message: "Error removing admin role" });
  }
});

// POST /api/admin/users/:id/reset-password - Reset user password
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a temporary password
    const tempPassword = randomBytes(8).toString("hex");

    // Hash the temporary password (this would be done in storage method)
    // and update the user's password
    const updatedUser = await storage.updateUser(userId, {
      password: tempPassword // The storage method should hash this
    });

    // In a production environment, send an email with the temporary password
    // For development, return the temporary password
    const isDev = process.env.NODE_ENV === "development";
    
    res.json({
      message: "Password reset successfully",
      // Only include the temporary password in development mode
      ...(isDev && { tempPassword })
    });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

// DELETE /api/admin/users/:id - Delete user with all related data
adminRouter.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is an admin
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete an admin user" });
    }

    // Delete user and all related data using storage method
    const result = await storage.deleteUser(userId);
    
    if (result) {
      res.json({ 
        message: "User and all related data deleted successfully",
        deletedUserId: userId,
        deletedUsername: user.username
      });
    } else {
      res.status(500).json({ message: "Failed to delete user" });
    }
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

// GET /api/admin/stats - Get admin dashboard stats
adminRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    // Fetch all required stats
    const totalUsers = await storage.getUserCount();
    const totalClips = await storage.getClipCount();
    const totalGames = await storage.getGameCount();

    // Fetch analytics data
    const userTypeDistribution = await storage.getUserTypeDistribution();
    
    const ageRangeDistribution = await storage.getAgeRangeDistribution();
    
    const topGames = await storage.getTopGames(5);
    
    const recentClips = await storage.getRecentClips(5);

    res.json({
      overview: {
        totalUsers,
        totalClips,
        totalGames
      },
      analytics: {
        userTypeDistribution,
        ageRangeDistribution,
        topGames,
        recentClips
      }
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Error fetching admin stats" });
  }
});

// GET /api/admin/clips - Get all clips with pagination
adminRouter.get("/clips", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const clips = await storage.getAllClips(limit, offset);
    const total = await storage.getClipCount();

    res.json({
      clips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching clips:", err);
    res.status(500).json({ message: "Error fetching clips" });
  }
});

// DELETE /api/admin/clips/:id - Delete clip
adminRouter.delete("/clips/:id", async (req: Request, res: Response) => {
  try {
    const clipId = parseInt(req.params.id);
    const success = await storage.deleteClip(clipId);

    if (!success) {
      return res.status(404).json({ message: "Clip not found" });
    }

    res.json({ message: "Clip deleted successfully" });
  } catch (err) {
    console.error("Error deleting clip:", err);
    res.status(500).json({ message: "Error deleting clip" });
  }
});

// GET /api/admin/screenshots - Get all screenshots with pagination  
adminRouter.get("/screenshots", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const screenshots = await storage.getAllScreenshots(limit, offset);
    const total = await storage.getScreenshotCount();

    res.json({
      screenshots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching screenshots:", err);
    res.status(500).json({ message: "Error fetching screenshots" });
  }
});

// DELETE /api/admin/screenshots/:id - Delete screenshot
adminRouter.delete("/screenshots/:id", async (req: Request, res: Response) => {
  try {
    const screenshotId = parseInt(req.params.id);
    const success = await storage.deleteScreenshot(screenshotId);

    if (!success) {
      return res.status(404).json({ message: "Screenshot not found" });
    }

    res.json({ message: "Screenshot deleted successfully" });
  } catch (err) {
    console.error("Error deleting screenshot:", err);
    res.status(500).json({ message: "Error deleting screenshot" });
  }
});

// GET /api/admin/recent-content - Get recent content (clips, reels, screenshots) in chronological order
adminRouter.get("/recent-content", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const contentType = req.query.contentType as string;
    
    const recentContent = await storage.getRecentContent(limit, (page - 1) * limit, contentType);
    const total = await storage.getRecentContentCount(contentType);

    res.json({
      content: recentContent,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching recent content:", err);
    res.status(500).json({ message: "Error fetching recent content" });
  }
});

// Badge management routes

// GET /api/admin/users/:id/badges - Get user badges
adminRouter.get("/users/:id/badges", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const badges = await storage.getUserBadges(userId);
    res.json(badges);
  } catch (err) {
    console.error("Error fetching user badges:", err);
    res.status(500).json({ message: "Error fetching user badges" });
  }
});

// POST /api/admin/users/:id/badges - Assign badge to user
adminRouter.post("/users/:id/badges", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { badgeType } = req.body;
    const adminUser = req.user;

    if (!userId || !badgeType) {
      return res.status(400).json({ message: "User ID and badge type are required" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate badge type
    const validBadgeTypes = ['newcomer', 'founder', 'admin'];
    if (!validBadgeTypes.includes(badgeType)) {
      return res.status(400).json({ message: "Invalid badge type" });
    }

    // Check if badge already exists for this user
    const existingBadges = await storage.getUserBadges(userId);
    const hasBadge = existingBadges.some(badge => badge.badgeType === badgeType);
    
    if (hasBadge) {
      return res.status(400).json({ message: "User already has this badge" });
    }

    // Create the badge
    const badge = await storage.createUserBadge({
      userId,
      badgeType,
      assignedBy: 'admin',
      assignedById: adminUser?.id
    });

    // If assigning admin badge, also update user role
    if (badgeType === 'admin') {
      await storage.updateUser(userId, { role: 'admin' });
    }

    res.json(badge);
  } catch (err) {
    console.error("Error assigning badge:", err);
    res.status(500).json({ message: "Error assigning badge" });
  }
});

// DELETE /api/admin/users/:id/badges/:badgeType - Remove badge from user
adminRouter.delete("/users/:id/badges/:badgeType", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const badgeType = req.params.badgeType;

    if (!userId || !badgeType) {
      return res.status(400).json({ message: "User ID and badge type are required" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const success = await storage.deleteBadgesByType(userId, badgeType);
    
    if (!success) {
      return res.status(404).json({ message: "Badge not found" });
    }

    // If removing admin badge, also update user role
    if (badgeType === 'admin') {
      await storage.updateUser(userId, { role: 'user' });
    }

    res.json({ message: "Badge removed successfully" });
  } catch (err) {
    console.error("Error removing badge:", err);
    res.status(500).json({ message: "Error removing badge" });
  }
});

// POST /api/admin/badges/cleanup - Clean up expired badges
adminRouter.post("/badges/cleanup", async (req: Request, res: Response) => {
  try {
    await storage.cleanupExpiredBadges();
    res.json({ message: "Expired badges cleaned up successfully" });
  } catch (err) {
    console.error("Error cleaning up badges:", err);
    res.status(500).json({ message: "Error cleaning up badges" });
  }
});

// Regenerate thumbnail for a clip or reel
adminRouter.post("/regenerate-thumbnail/:clipId", async (req: Request, res: Response) => {
  try {
    const clipId = parseInt(req.params.clipId);
    
    if (isNaN(clipId)) {
      return res.status(400).json({ message: "Invalid clip ID" });
    }

    // Get clip details
    const clip = await storage.getClip(clipId);
    if (!clip) {
      return res.status(404).json({ message: "Clip not found" });
    }

    // Download video temporarily for processing
    const tempDir = path.join(process.cwd(), "temp");
    const tempVideoPath = path.join(tempDir, `admin_video_${clipId}_${Date.now()}.mp4`);
    
    try {
      // Download video from Supabase
      const videoResponse = await fetch(clip.videoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download video');
      }
      
      const videoBuffer = await videoResponse.arrayBuffer();
      await fs.promises.writeFile(tempVideoPath, Buffer.from(videoBuffer));
      
      // Generate new thumbnail
      const newThumbnailUrl = await VideoProcessor.generateAutoThumbnail(
        tempVideoPath, 
        clip.userId, 
        `admin_regen_thumb_${clipId}`
      );
      
      // Update clip with new thumbnail URL
      await storage.updateClip(clipId, { thumbnailUrl: newThumbnailUrl });
      
      // Clean up temp video file
      fs.unlink(tempVideoPath, (err) => {
        if (err) console.warn('Could not delete temp video file:', err);
      });
      
      res.json({
        success: true,
        message: 'Thumbnail regenerated successfully',
        thumbnailUrl: newThumbnailUrl
      });
      
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempVideoPath)) {
        fs.unlink(tempVideoPath, (err) => {
          if (err) console.warn('Could not delete temp video file:', err);
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error regenerating thumbnail:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Thumbnail regeneration failed' 
    });
  }
});

// ==========================================
// Content Filtering Management Routes
// ==========================================

// POST /api/admin/content-filter/check - Check if content contains profanity
adminRouter.post("/content-filter/check", async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: "Content is required" });
    }
    
    const containsProfanity = ContentFilterService.containsProfanity(content);
    const profaneWords = ContentFilterService.getProfaneWords(content);
    const cleanedContent = ContentFilterService.cleanContent(content);
    
    res.json({
      originalContent: content,
      containsProfanity,
      profaneWords,
      cleanedContent
    });
  } catch (err) {
    console.error("Error checking content:", err);
    res.status(500).json({ message: "Error checking content" });
  }
});

// POST /api/admin/content-filter/add-words - Add custom words to filter
adminRouter.post("/content-filter/add-words", async (req: Request, res: Response) => {
  try {
    const { words } = req.body;
    
    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ message: "Words array is required" });
    }
    
    // Validate that all words are strings
    const invalidWords = words.filter(word => typeof word !== 'string');
    if (invalidWords.length > 0) {
      return res.status(400).json({ message: "All words must be strings" });
    }
    
    ContentFilterService.addCustomWords(words);
    
    res.json({ 
      message: `Successfully added ${words.length} words to content filter`,
      addedWords: words 
    });
  } catch (err) {
    console.error("Error adding words to filter:", err);
    res.status(500).json({ message: "Error adding words to filter" });
  }
});

// POST /api/admin/content-filter/remove-words - Remove words from filter
adminRouter.post("/content-filter/remove-words", async (req: Request, res: Response) => {
  try {
    const { words } = req.body;
    
    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ message: "Words array is required" });
    }
    
    // Validate that all words are strings
    const invalidWords = words.filter(word => typeof word !== 'string');
    if (invalidWords.length > 0) {
      return res.status(400).json({ message: "All words must be strings" });
    }
    
    ContentFilterService.removeWords(words);
    
    res.json({ 
      message: `Successfully removed ${words.length} words from content filter`,
      removedWords: words 
    });
  } catch (err) {
    console.error("Error removing words from filter:", err);
    res.status(500).json({ message: "Error removing words from filter" });
  }
});

// POST /api/admin/content-filter/validate - Validate content with detailed response
adminRouter.post("/content-filter/validate", async (req: Request, res: Response) => {
  try {
    const { content, options } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: "Content is required" });
    }
    
    const validationOptions = {
      allowProfanity: options?.allowProfanity || false,
      cleanAutomatically: options?.cleanAutomatically || false,
      maxLength: options?.maxLength || 1000
    };
    
    const validation = ContentFilterService.validateContent(content, validationOptions);
    
    res.json({
      originalContent: content,
      ...validation
    });
  } catch (err) {
    console.error("Error validating content:", err);
    res.status(500).json({ message: "Error validating content" });
  }
});

export default adminRouter;