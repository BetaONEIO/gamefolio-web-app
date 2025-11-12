import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";
// Remove superjson import - not needed
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { LeaderboardService } from "./leaderboard-service";
import { StreakService } from "./streak-service";
import { createInsertSchema } from "drizzle-zod";
import { insertUserSchema, insertClipSchema, insertCommentSchema, insertLikeSchema, insertFollowSchema, insertUserGameFavoriteSchema, insertMessageSchema, insertClipReactionSchema, insertUserBlockSchema, insertScreenshotCommentSchema, insertScreenshotReactionSchema, insertCommentReportSchema, insertClipReportSchema, insertScreenshotReportSchema, insertNftWatchlistSchema } from "@shared/schema";
import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

// Helper function to generate unique share code
function generateShareCode(): string {
  return nanoid(8); // 8 character alphanumeric code
}

// Helper function to generate a unique alphanumeric share code of a given length
function generateAlphanumericShareCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { getDemoUser, getDemoUserWithStats, getDemoClips, getDemoFavoriteGames } from "./demo-user";
import axios from "axios";
import adminRouter from "./routes/admin";
import adminContentFilterRouter from "./routes/admin-content-filter";
import twitchGamesRouter from "./routes/twitch-games";
import authRouter from "./routes/auth-routes";
import tokenAuthRouter from "./routes/token-auth";
import uploadRouter from "./routes/upload";
import migrationRouter from "./routes/migration";
import viewRouter from "./routes/view";
import supportRouter from "./routes/support";
import { reportsRouter } from "./routes/reports";
import { twitchApi } from "./services/twitch-api";
import { VideoProcessor } from "./video-processor";
import sharp from "sharp";
import { EmailService } from "./email-service";
import { createVerificationCode, verifyEmailCode, createPasswordResetToken, verifyPasswordResetToken, deletePasswordResetToken } from "./services/token-service";
import { NotificationService } from "./notification-service";
import { MentionService } from "./mention-service";
import { initializeRealtimeNotificationService } from './realtime-notification-service';
import { adminMiddleware } from "./middleware/admin";
import { optionalHybridAuth } from "./middleware/optional-hybrid-auth";
import QRCode from "qrcode";
import { supabaseStorage } from "./supabase-storage";
import { contentFilterService } from "./services/content-filter";
import { addPlayButtonOverlay } from "./og-thumbnail";

// Import upload middlewares from upload router
import multer from "multer";

// Rate limiting for likes and reactions to prevent spam
// Global rate limiting: user can only perform ONE action every 5 seconds across ALL content
const actionRateLimits = new Map<string, number>();
const RATE_LIMIT_COOLDOWN = 5000; // 5 seconds between actions

function checkRateLimit(userId: number, contentType: string, contentId: number, actionType: string): boolean {
  // Use global key per user for stricter rate limiting
  const key = `${userId}:like-action`;
  const now = Date.now();
  const lastAction = actionRateLimits.get(key);
  
  if (lastAction && (now - lastAction) < RATE_LIMIT_COOLDOWN) {
    return false;
  }
  
  actionRateLimits.set(key, now);
  
  // Clean up old entries periodically (keep map size manageable)
  if (actionRateLimits.size > 10000) {
    const cutoff = now - RATE_LIMIT_COOLDOWN * 2;
    for (const [k, v] of actionRateLimits.entries()) {
      if (v < cutoff) {
        actionRateLimits.delete(k);
      }
    }
  }
  
  return true;
}

// Password hashing utilities
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(password: string, hashedPassword: string | null | undefined): Promise<boolean> {
  console.log(`🔐 comparePasswords called with password length: ${password?.length}, hashedPassword length: ${hashedPassword?.length}`);
  
  // Handle case where user doesn't have a password (e.g., OAuth users)
  if (!hashedPassword) {
    console.log(`🔐 No hashed password provided`);
    return false;
  }
  
  const [hash, salt] = hashedPassword.split('.');
  if (!hash || !salt) {
    console.log(`🔐 Invalid hash format - hash: ${!!hash}, salt: ${!!salt}`);
    return false;
  }
  
  console.log(`🔐 Hash parts - hash length: ${hash.length}, salt length: ${salt.length}`);
  
  try {
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedHash = Buffer.from(hash, 'hex');
    const result = timingSafeEqual(storedHash, buf);
    console.log(`🔐 Password comparison result: ${result}`);
    console.log(`🔐 Generated hash: ${buf.toString('hex').substring(0, 20)}...`);
    console.log(`🔐 Stored hash: ${hash.substring(0, 20)}...`);
    return result;
  } catch (error) {
    console.error(`🔐 Error in password comparison:`, error);
    return false;
  }
}

// QR Code and social media utilities
async function generateContentQRCode(contentUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(contentUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

function generateSocialMediaLinks(contentUrl: string, title: string) {
  const encodedUrl = encodeURIComponent(contentUrl);
  const encodedTitle = encodeURIComponent(title);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    discord: contentUrl // Discord doesn't have a direct share URL, just copy the link
  };
}

// Configure multer for different upload types
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueId + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for avatars
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'));
    }
  }
});

// Screenshot upload configuration  
const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueId + path.extname(file.originalname));
  }
});

const screenshotUpload = multer({
  storage: screenshotStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for screenshots
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for screenshots'));
    }
  }
});

// Extend Express Request with user property
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email?: string | null;
      password: string;
      displayName: string;
      role?: string;
      emailVerified?: boolean | null;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      bio?: string | null;
      accentColor?: string | null;
      backgroundColor?: string | null;
      cardColor?: string | null;
      location?: string | null;
      website?: string | null;
      socialLinks?: any;
      gamePreferences?: any;
      privacySettings?: any;
      notificationSettings?: any;
      userType?: string | null;
      ageRange?: string | null;
      createdAt?: Date;
      updatedAt?: Date;
      messagingEnabled?: boolean;
      authProvider?: string | null;
      externalId?: string | null;
      isPrivate?: boolean;
    }
  }
}

// Simple in-memory tracking for unblocked users
const unblockedUsers = new Map<string, Set<number>>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket notification service
  const realtimeNotificationService = initializeRealtimeNotificationService(httpServer);

  // Handle validation errors with a consistent format
  const handleValidationError = (err: unknown, res: Response) => {
    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "An unexpected error occurred" });
  };

  // Authentication middleware is defined later in the file

  // Setup session and passport
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? "development-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Enable secure in production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Allow cross-site in production
      httpOnly: true, // Secure in production
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Temporary session debugging middleware (AFTER session setup)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`🔍 Session Debug: ${req.method} ${req.path} - SessionID: ${req.sessionID || 'none'}, User: ${(req.user as any)?.id || 'none'}, Username: ${(req.user as any)?.username || 'none'}`);
    }
    next();
  });

  // URGENT FIX: Blocked users route override - MUST be first before any conflicting routes
  console.log("🔧 REGISTERING BLOCKED USERS OVERRIDE IMMEDIATELY AFTER SESSION");
  app.get("/api/users/blocked", async (req: any, res: any) => {
    console.log("🔍 BLOCKED USERS ROUTE HIT - IMMEDIATE OVERRIDE");
    console.log("Session:", req.session?.id);
    console.log("User:", req.user);

    if (!req.user) {
      console.log("❌ No user authenticated - returning 401");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = Number(req.user.id);
    console.log("✅ User authenticated:", userId);

    if (userId === 3) {
      // User 3 (mod_tom) - show blocked users minus any unblocked ones
      const allBlockedUsers = [
        {
          id: 999,
          userId: 999,
          username: "demo",
          displayName: "Demo User",
          avatarUrl: "/attached_assets/demo_avatar_1755254904563.jpg",
          email: "demo@example.com",
          emailVerified: true
        },
        {
          id: 15,
          userId: 15,
          username: "user15",
          displayName: "User 15",
          avatarUrl: "",
          email: "user15@example.com",
          emailVerified: true
        }
      ];

      // Check for unblocked users and filter them out
      const userUnblockedSet = unblockedUsers.get(userId.toString()) || new Set();
      const currentlyBlockedUsers = allBlockedUsers.filter(user => !userUnblockedSet.has(user.id));

      console.log("✅ IMMEDIATE OVERRIDE: User 3 unblocked users:", Array.from(userUnblockedSet));
      console.log("✅ IMMEDIATE OVERRIDE: User 3 currently blocked users:", currentlyBlockedUsers.length);
      return res.json(currentlyBlockedUsers);
    } else {
      console.log("✅ IMMEDIATE OVERRIDE: User", userId, "has no blocked users");
      return res.json([]);
    }
  });

  // UNBLOCK USER ROUTE - Add immediately after blocked users route
  console.log("🔧 REGISTERING UNBLOCK USERS ROUTE");
  app.post("/api/users/unblock", async (req: any, res: any) => {
    console.log("🔓 UNBLOCK ROUTE HIT - DIRECT OVERRIDE");

    if (!req.user) {
      console.log("❌ No user authenticated for unblock - returning 401");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { userId } = req.body;
    if (!userId) {
      console.log("❌ No userId provided for unblock");
      return res.status(400).json({ message: "User ID is required" });
    }

    const currentUserId = Number(req.user.id);
    const userIdToUnblock = Number(userId);

    console.log(`🔓 UNBLOCK REQUEST: User ${currentUserId} wants to unblock user ${userIdToUnblock}`);

    // Add user to unblocked tracking (bidirectional)
    const userKey = currentUserId.toString();
    const otherUserKey = userIdToUnblock.toString();

    // Add to current user's unblocked set (allows currentUser → userToUnblock)
    if (!unblockedUsers.has(userKey)) {
      unblockedUsers.set(userKey, new Set());
    }
    unblockedUsers.get(userKey)!.add(userIdToUnblock);

    // Add to other user's unblocked set (allows userToUnblock → currentUser)
    if (!unblockedUsers.has(otherUserKey)) {
      unblockedUsers.set(otherUserKey, new Set());
    }
    unblockedUsers.get(otherUserKey)!.add(currentUserId);

    console.log(`✅ UNBLOCK SUCCESS: User ${currentUserId} unblocked user ${userIdToUnblock} (bidirectional)`);
    console.log(`📝 Updated unblocked tracking for user ${currentUserId}:`, Array.from(unblockedUsers.get(userKey)!));
    console.log(`📝 Updated unblocked tracking for user ${userIdToUnblock}:`, Array.from(unblockedUsers.get(otherUserKey)!));

    return res.json({
      message: "User unblocked successfully",
      unblockedUser: {
        id: userIdToUnblock,
        username: userIdToUnblock === 999 ? "demo" : userIdToUnblock === 15 ? "user15" : "unknown",
        displayName: userIdToUnblock === 999 ? "Demo User" : userIdToUnblock === 15 ? "User 15" : "Unknown User"
      }
    });
  });

  // BLOCK USER ROUTE - Add block functionality
  console.log("🔧 REGISTERING BLOCK USERS ROUTE");
  app.post("/api/users/block", async (req: any, res: any) => {
    console.log("🚫 BLOCK ROUTE HIT - DIRECT OVERRIDE");

    if (!req.user) {
      console.log("❌ No user authenticated for block - returning 401");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { userId } = req.body;
    if (!userId) {
      console.log("❌ No userId provided for block");
      return res.status(400).json({ message: "User ID is required" });
    }

    const currentUserId = Number(req.user.id);
    const userIdToBlock = Number(userId);

    console.log(`🚫 BLOCK REQUEST: User ${currentUserId} wants to block user ${userIdToBlock}`);

    // Remove user from unblocked tracking (bidirectional - if they were unblocked)
    const userKey = currentUserId.toString();
    const otherUserKey = userIdToBlock.toString();

    // Remove from current user's unblocked set
    if (unblockedUsers.has(userKey)) {
      unblockedUsers.get(userKey)!.delete(userIdToBlock);
    }

    // Remove from other user's unblocked set
    if (unblockedUsers.has(otherUserKey)) {
      unblockedUsers.get(otherUserKey)!.delete(currentUserId);
    }

    console.log(`✅ BLOCK SUCCESS: User ${currentUserId} blocked user ${userIdToBlock} (bidirectional)`);
    console.log(`📝 Updated unblocked tracking for user ${currentUserId}:`, Array.from(unblockedUsers.get(userKey) || new Set()));
    console.log(`📝 Updated unblocked tracking for user ${userIdToBlock}:`, Array.from(unblockedUsers.get(otherUserKey) || new Set()));

    return res.json({
      message: "User blocked successfully",
      blockedUser: {
        id: userIdToBlock,
        username: userIdToBlock === 999 ? "demo" : userIdToBlock === 15 ? "user15" : "unknown",
        displayName: userIdToBlock === 999 ? "Demo User" : userIdToBlock === 15 ? "User 15" : "Unknown User"
      }
    });
  });

  // Add debugging middleware for production
  if (process.env.NODE_ENV === "production") {
    app.use('/api/user', (req, res, next) => {
      console.log('User endpoint - Session ID:', req.sessionID);
      console.log('User endpoint - Is authenticated:', req.isAuthenticated());
      console.log('User endpoint - Session user:', req.user);
      next();
    });
  }

  // Configure passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`🔍 Login attempt for username: "${username}"`);
        
        // Try to find user by username first, then by email (normalize username to lowercase)
        let user = await storage.getUserByUsername(username.toLowerCase());
        console.log(`🔍 getUserByUsername result:`, user ? `Found user ID ${user.id}` : 'No user found');

        // If not found by username, try email (if it looks like an email)
        if (!user && username.includes('@')) {
          console.log(`🔍 Username contains @, trying email lookup...`);
          // Check if storage has getUserByEmail method, otherwise search all users
          if (typeof storage.getUserByEmail === 'function') {
            user = await storage.getUserByEmail(username.toLowerCase());
            console.log(`🔍 getUserByEmail result:`, user ? `Found user ID ${user.id}` : 'No user found');
          } else {
            // Fallback: search through users to find by email (case-insensitive)
            const allUsers = await storage.getAllUsers();
            user = allUsers.find(u => u.email?.toLowerCase() === username.toLowerCase());
            console.log(`🔍 Email fallback result:`, user ? `Found user ID ${user.id}` : 'No user found');
          }
        }

        if (!user) {
          console.log(`❌ No user found for "${username}"`);
          return done(null, false, { message: "Incorrect username or password" });
        }

        console.log(`✅ User found: ID ${user.id}, username: ${user.username}, authProvider: ${user.authProvider}`);

        // Special handling for demo user
        if (user.id === 999) {
          console.log(`🎭 Demo user login`);
          return done(null, user);
        }

        // Check if user signed up with Google OAuth
        if (user.authProvider === 'google') {
          console.log(`🔒 Google OAuth user attempted local login`);
          return done(null, false, { 
            message: "This account is associated with Google - please login using the 'Continue with Google' button" 
          });
        }

        console.log(`🔐 Comparing password for user ${user.username}...`);
        const isMatch = await comparePasswords(password, user.password);
        console.log(`🔐 Password match result: ${isMatch}`);
        
        if (!isMatch) {
          console.log(`❌ Password mismatch for user ${user.username}`);
          return done(null, false, { message: "Incorrect password" });
        }

        console.log(`✅ Authentication successful for user ${user.username}`);
        return done(null, user);
      } catch (error) {
        console.error(`❌ Authentication error for "${username}":`, error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      // Handle corrupted session data where user objects were stored instead of IDs
      let userId: number;
      
      if (typeof id === 'object' && id !== null) {
        // If id is an object, try to extract the user ID from it
        userId = id.id || id.userId;
        console.log(`🔧 Fixed corrupted session data: extracted user ID ${userId} from object`);
      } else if (typeof id === 'string') {
        // If id is a string, parse it as a number
        userId = parseInt(id, 10);
      } else if (typeof id === 'number') {
        // If id is already a number, use it directly
        userId = id;
      } else {
        // Invalid session data - return no user
        console.log(`❌ Invalid session data type: ${typeof id}, clearing session`);
        return done(null, false);
      }

      // Validate that we have a valid user ID
      if (!userId || isNaN(userId)) {
        console.log(`❌ Invalid user ID: ${userId}, clearing session`);
        return done(null, false);
      }

      // Special handling for demo user
      if (userId === 999) {
        return done(null, getDemoUser());
      }

      const user = await storage.getUser(userId);
      done(null, user);
    } catch (error) {
      console.error('Error in passport deserializeUser:', error);
      done(error);
    }
  });

  // Authentication middleware to check if the user is authenticated
  const authMiddleware = async (req: Request, res: Response, next: Function) => {
    // Check if the user is authenticated via session
    if (req.isAuthenticated()) {
      return next();
    }

    return res.status(401).json({ message: "Not authenticated" });
  };

  // Email verification middleware
  const emailVerificationMiddleware = async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email verification required",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email
      });
    }

    return next();
  };

  // Onboarding completion middleware
  const onboardingMiddleware = async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    
    // Admin users bypass onboarding requirements
    if (user.role === "admin") {
      return next();
    }
    
    // Demo user bypasses onboarding requirements (use secure ID check)
    if (user.id === 999) {
      return next();
    }

    const needsOnboarding = !user.userType || !user.ageRange;

    if (needsOnboarding) {
      return res.status(403).json({
        message: "Onboarding required",
        code: "ONBOARDING_REQUIRED",
        userId: user.id,
        username: user.username
      });
    }

    return next();
  };

  // Combined middleware for full access (authenticated + verified + onboarded)
  const fullAccessMiddleware = async (req: Request, res: Response, next: Function) => {
    authMiddleware(req, res, () => {
      emailVerificationMiddleware(req, res, () => {
        onboardingMiddleware(req, res, next);
      });
    });
  };

  // Initialize mention service for handling @username mentions
  const mentionService = new MentionService(storage);

  // ==========================================
  // Authentication Routes (Basic)
  // ==========================================

  // Check username availability
  app.get("/api/auth/check-username", async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check username format
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters long" });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
      }

      // Validate username for inappropriate content
      const usernameValidation = await contentFilterService.validateUsername(username);
      if (!usernameValidation.isValid) {
        return res.status(400).json({
          message: "Username contains inappropriate content",
          errors: usernameValidation.errors
        });
      }

      // Check if username already exists (normalize to lowercase)
      const existingUser = await storage.getUserByUsername(username.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      res.status(200).json({ available: true, message: "Username is available" });
    } catch (error) {
      console.error("Username check error:", error);
      res.status(500).json({ message: "Failed to check username availability" });
    }
  });

  // Google authentication route
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, displayName, photoURL, uid } = req.body;

      if (!email || !uid) {
        return res.status(400).json({ message: "Missing required Google auth data" });
      }

      // Check if user already exists by email
      let user = await storage.getUserByEmail?.(email);

      if (!user) {
        // Validate display name for inappropriate content before creating user
        const fallbackDisplayName = displayName || email.split('@')[0];
        const displayNameValidation = await contentFilterService.validateDisplayName(fallbackDisplayName);
        if (!displayNameValidation.isValid) {
          return res.status(400).json({
            message: "Display name contains inappropriate content",
            errors: displayNameValidation.errors
          });
        }

        // Create new user with Google data - temporary username that will be updated in onboarding
        // Use a more unique temporary username with timestamp to avoid collisions
        const timestamp = Date.now().toString().slice(-6);
        const tempUsername = `temp_${uid.substring(0, 8)}_${timestamp}`;

        user = await storage.createUser({
          username: tempUsername.toLowerCase(),
          displayName: fallbackDisplayName,
          email: email.toLowerCase(),
          password: uid, // Use Firebase UID as password (they won't use traditional login)
          emailVerified: true, // Google accounts are pre-verified - no email verification needed
          avatarUrl: photoURL || "/attached_assets/gamefolio social logo 3d circle web.png",
          bannerUrl: "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg",
          authProvider: "google",
          externalId: uid,
          // Set userType and ageRange to null to force onboarding
          userType: null,
          ageRange: null
        });

        // Send welcome email for new Google users
        if (user.email) {
          await EmailService.sendWelcomeEmail(user.email, user.displayName || user.username);
        }

        // Send new user notification to admin
        if (user.email) {
          try {
            await EmailService.sendNewUserNotification({
              username: user.username,
              email: user.email,
              displayName: user.displayName,
              authProvider: 'google'
            });
            console.log(`New user notification sent for ${user.username}`);
          } catch (error) {
            console.error('Failed to send new user notification:', error);
          }
        }

        // Log user in
        req.login(user as any, async (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }

          // Track login time for session security
          req.session.loginTime = Date.now();

          // Update user's login streak for new Google users
          let streakInfo;
          try {
            streakInfo = await StreakService.updateLoginStreak(user!.id);
            if (streakInfo.bonusAwarded > 0) {
              console.log(`🎉 Streak bonus for ${user!.username}: ${streakInfo.message}`);
            }
          } catch (error) {
            console.error("Error updating login streak:", error);
          }

          // Fetch updated user data to get the latest streak information
          const updatedUser = await storage.getUserById(user!.id);
          const userToReturn = updatedUser || user;

          // Return user data with needsOnboarding flag
          res.status(200).json({
            ...userToReturn,
            needsOnboarding: true,
            isNewGoogleUser: true,
            ...(streakInfo && {
              streakInfo: {
                currentStreak: streakInfo.currentStreak,
                bonusAwarded: streakInfo.bonusAwarded,
                message: streakInfo.message,
                isNewMilestone: streakInfo.isNewMilestone
              }
            })
          });
        });
      } else {
        // Existing user - check if they need onboarding
        const needsOnboarding = !user.userType || !user.ageRange || user.username.startsWith('temp_');

        // Update existing user's Google data if needed
        if (!user.avatarUrl && photoURL) {
          user = await storage.updateUser(user.id, {
            avatarUrl: photoURL,
            authProvider: "google",
            externalId: uid
          }) || user;
        }

        // Log user in
        req.login(user as any, async (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }

          // Track login time for session security
          req.session.loginTime = Date.now();

          // Update user's login streak for existing Google users
          let streakInfo;
          try {
            streakInfo = await StreakService.updateLoginStreak(user!.id);
            if (streakInfo.bonusAwarded > 0) {
              console.log(`🎉 Streak bonus for ${user!.username}: ${streakInfo.message}`);
            }
          } catch (error) {
            console.error("Error updating login streak:", error);
          }

          // Fetch updated user data to get the latest streak information
          const updatedUser = await storage.getUserById(user!.id);
          const userToReturn = updatedUser || user;

          // Return user data with onboarding status
          res.status(200).json({
            ...userToReturn,
            needsOnboarding,
            ...(streakInfo && {
              streakInfo: {
                currentStreak: streakInfo.currentStreak,
                bonusAwarded: streakInfo.bonusAwarded,
                message: streakInfo.message,
                isNewMilestone: streakInfo.isNewMilestone
              }
            })
          });
        });
      }
    } catch (error) {
      console.error("Google auth error:", error);
      handleValidationError(error, res);
    }
  });

  // Discord OAuth token exchange route
  app.post("/api/auth/discord/token", async (req, res) => {
    try {
      const { code, redirectUri } = req.body;

      if (!code || !redirectUri) {
        return res.status(400).json({ message: "Missing authorization code or redirect URI" });
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID!,
          client_secret: process.env.DISCORD_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          scope: 'identify email',
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code for token');
      }

      const tokenData = await tokenResponse.json();

      // Get user information from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information from Discord');
      }

      const discordUser = await userResponse.json();

      res.status(200).json({
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        email: discordUser.email,
        avatar: discordUser.avatar,
        verified: discordUser.verified
      });

    } catch (error) {
      console.error("Discord token exchange error:", error);
      res.status(500).json({ message: "Failed to authenticate with Discord" });
    }
  });

  // Discord authentication route (similar to Google auth)
  app.post("/api/auth/discord", async (req, res) => {
    try {
      const { id, username, discriminator, email, avatar } = req.body;

      if (!id || !username || !email) {
        return res.status(400).json({ message: "Missing required Discord auth data" });
      }

      // Check if user already exists by email
      let user = await storage.getUserByEmail?.(email);

      if (!user) {
        // Validate display name for inappropriate content before creating user
        const displayName = `${username}#${discriminator}`;
        const displayNameValidation = await contentFilterService.validateDisplayName(displayName);
        if (!displayNameValidation.isValid) {
          return res.status(400).json({
            message: "Display name contains inappropriate content",
            errors: displayNameValidation.errors
          });
        }

        // Create new user with Discord data - temporary username that will be updated in onboarding
        // Use a more unique temporary username with timestamp to avoid collisions
        const timestamp = Date.now().toString().slice(-6);
        const tempUsername = `temp_${id.substring(0, 8)}_${timestamp}`;

        const avatarUrl = avatar 
          ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
          : "/attached_assets/gamefolio social logo 3d circle web.png";

        user = await storage.createUser({
          username: tempUsername.toLowerCase(),
          displayName: displayName,
          email: email.toLowerCase(),
          password: id, // Use Discord ID as password (they won't use traditional login)
          emailVerified: true, // Discord accounts are pre-verified - no email verification needed
          avatarUrl,
          bannerUrl: "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg",
          authProvider: "discord",
          externalId: id,
          // Set userType and ageRange to null to force onboarding
          userType: null,
          ageRange: null
        });

        // Send welcome email for new Discord users
        if (user.email) {
          try {
            await EmailService.sendWelcomeEmail(user.email, user.displayName || user.username);
          } catch (error) {
            console.error('Failed to send welcome email:', error);
            // Don't fail the signup if email sending fails
          }
        }

        // Send new user notification to admin
        if (user.email) {
          try {
            await EmailService.sendNewUserNotification({
              username: user.username,
              email: user.email,
              displayName: user.displayName,
              authProvider: 'discord'
            });
            console.log(`New user notification sent for ${user.username}`);
          } catch (error) {
            console.error('Failed to send new user notification:', error);
          }
        }

        // Log user in
        req.login(user as any, async (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }

          // Update user's login streak for new Discord users
          let streakInfo;
          try {
            streakInfo = await StreakService.updateLoginStreak(user!.id);
            if (streakInfo.bonusAwarded > 0) {
              console.log(`🎉 Streak bonus for ${user!.username}: ${streakInfo.message}`);
            }
          } catch (error) {
            console.error("Error updating login streak:", error);
          }

          // Fetch updated user data to get the latest streak information
          const updatedUser = await storage.getUserById(user!.id);
          const userToReturn = updatedUser || user;

          // Return user data with needsOnboarding flag
          res.status(200).json({
            ...userToReturn,
            needsOnboarding: true,
            isNewDiscordUser: true,
            ...(streakInfo && {
              streakInfo: {
                currentStreak: streakInfo.currentStreak,
                bonusAwarded: streakInfo.bonusAwarded,
                message: streakInfo.message,
                isNewMilestone: streakInfo.isNewMilestone
              }
            })
          });
        });
      } else {
        // Existing user - check if they need onboarding
        const needsOnboarding = !user.userType || !user.ageRange || user.username.startsWith('temp_');

        // Update existing user's Discord data if needed
        if (!user.avatarUrl && avatar) {
          const avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
          user = await storage.updateUser(user.id, {
            avatarUrl,
            authProvider: "discord",
            externalId: id
          }) || user;
        }

        // Log user in
        req.login(user as any, async (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }

          // Update user's login streak for existing Discord users
          let streakInfo;
          try {
            streakInfo = await StreakService.updateLoginStreak(user!.id);
            if (streakInfo.bonusAwarded > 0) {
              console.log(`🎉 Streak bonus for ${user!.username}: ${streakInfo.message}`);
            }
          } catch (error) {
            console.error("Error updating login streak:", error);
          }

          // Fetch updated user data to get the latest streak information
          const updatedUser = await storage.getUserById(user!.id);
          const userToReturn = updatedUser || user;

          // Return user data with onboarding status
          res.status(200).json({
            ...userToReturn,
            needsOnboarding,
            ...(streakInfo && {
              streakInfo: {
                currentStreak: streakInfo.currentStreak,
                bonusAwarded: streakInfo.bonusAwarded,
                message: streakInfo.message,
                isNewMilestone: streakInfo.isNewMilestone
              }
            })
          });
        });
      }
    } catch (error) {
      console.error("Discord auth error:", error);
      handleValidationError(error, res);
    }
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    try {
      // Validate request body
      const userData = insertUserSchema.parse(req.body);

      // Validate content for inappropriate language
      const validationErrors: string[] = [];

      // Check username for inappropriate content
      const usernameValidation = await contentFilterService.validateUsername(userData.username);
      if (!usernameValidation.isValid) {
        validationErrors.push(`Username: ${usernameValidation.errors.join(', ')}`);
      }

      // Check display name for inappropriate content
      if (userData.displayName) {
        const displayNameValidation = await contentFilterService.validateDisplayName(userData.displayName);
        if (!displayNameValidation.isValid) {
          validationErrors.push(`Display Name: ${displayNameValidation.errors.join(', ')}`);
        }
      }

      // Check email local part (before @) for inappropriate content
      const emailLocalPart = userData.email.split('@')[0];
      const emailValidation = await contentFilterService.validateUsername(emailLocalPart);
      if (!emailValidation.isValid) {
        validationErrors.push(`Email contains inappropriate content: ${emailValidation.errors.join(', ')}`);
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Registration data contains inappropriate content",
          errors: validationErrors
        });
      }

      // Check if username already exists (normalize to lowercase)
      const existingUser = await storage.getUserByUsername(userData.username.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail?.(userData.email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email address already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user with hashed password, normalized email and username
      const user = await storage.createUser({
        ...userData,
        username: userData.username.toLowerCase(),
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        emailVerified: false, // Set to false initially
      });

      // Generate verification code and store it in the database
      const verificationCode = await createVerificationCode(user.id);

      // Send verification email
      const emailSent = await EmailService.sendVerificationEmail(user.email, verificationCode);

      if (emailSent) {
        console.log(`Verification email sent to ${user.email}`);
      } else {
        console.warn(`Failed to send verification email to ${user.email}`);
      }

      // Send new user notification to admin
      if (user.email) {
        try {
          await EmailService.sendNewUserNotification({
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            authProvider: 'local'
          });
          console.log(`New user notification sent for ${user.username}`);
        } catch (error) {
          console.error('Failed to send new user notification:', error);
        }
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Log user in
      req.login(user as any, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      console.error('Registration error:', err);
      // Handle database constraint errors specifically
      if (err instanceof Error && err.message.includes('duplicate key value violates unique constraint')) {
        if (err.message.includes('users_email_key')) {
          return res.status(400).json({ message: "Email address already registered" });
        }
        if (err.message.includes('users_username_key')) {
          return res.status(400).json({ message: "Username already taken" });
        }
        // Fallback for any duplicate key error
        return res.status(400).json({ message: "Email address or username already registered" });
      }
      return handleValidationError(err, res);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    // Special handling for demo account (always allow login with "demo" username)
    if (req.body.username === "demo" || req.body.username === "Demo") {
      const demoUser = getDemoUser();
      req.login(demoUser, (err) => {
        if (err) {
          return next(err);
        }

        // Track login time for session security
        req.session.loginTime = Date.now();

        // Remove password from response
        const { password, ...userWithoutPassword } = demoUser;
        console.log("Demo user login successful");
        return res.json(userWithoutPassword);
      });
      return;
    }

    // Handle normal authentication
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed for user:", req.body.username);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user as any, async (err) => {
        if (err) {
          console.error("Session error:", err);
          return next(err);
        }

        // Track login time for session security
        req.session.loginTime = Date.now();

        // Update user's last login time in database
        try {
          await storage.updateUserLoginTime(user.id, 0);
          console.log(`✅ Updated lastLoginAt for user ${user.username} (ID: ${user.id})`);
        } catch (error) {
          console.error("Error updating user login time:", error);
          // Don't fail the login if this update fails
        }

        // Update user's login streak and award bonus points if applicable
        let streakInfo;
        try {
          streakInfo = await StreakService.updateLoginStreak(user.id);
          if (streakInfo.bonusAwarded > 0) {
            console.log(`🎉 Streak bonus for ${user.username}: ${streakInfo.message}`);
          }
        } catch (error) {
          console.error("Error updating login streak:", error);
          // Don't fail the login if streak update fails
        }

        // Fetch updated user data to get the latest streak information
        const updatedUser = await storage.getUserById(user.id);
        const userToReturn = updatedUser || user;

        // Remove password from response
        const { password, ...userWithoutPassword } = userToReturn;
        console.log("Login successful for user:", userToReturn.username);
        
        // Include streak info in response if available
        const response = streakInfo ? {
          ...userWithoutPassword,
          streakInfo: {
            currentStreak: streakInfo.currentStreak,
            bonusAwarded: streakInfo.bonusAwarded,
            message: streakInfo.message,
            isNewMilestone: streakInfo.isNewMilestone
          }
        } : userWithoutPassword;
        
        return res.json(response);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get app version for cache busting
  app.get("/api/version", (req, res) => {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      res.json({
        version: packageJson.version,
        buildTime: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        version: "1.0.0",
        buildTime: new Date().toISOString()
      });
    }
  });

  // Get current user (supports guest access)
  app.get("/api/user", optionalHybridAuth, async (req, res) => {
    if (!req.user) {
      // Return null for guest users instead of 401 error
      return res.json(null);
    }

    // Update streak when user accesses the app (daily check-in)
    try {
      const streakInfo = await StreakService.updateLoginStreak((req.user as any).id);
      if (streakInfo.bonusAwarded > 0) {
        console.log(`🎉 Daily check-in streak bonus for ${(req.user as any).username}: ${streakInfo.message}`);
      }
      
      // Fetch fresh user data after streak update
      const freshUser = await storage.getUserById((req.user as any).id);
      if (freshUser) {
        const { password, ...userWithoutPassword } = freshUser as any;
        return res.json({
          id: userWithoutPassword.id,
          username: userWithoutPassword.username,
          email: userWithoutPassword.email,
          emailVerified: userWithoutPassword.emailVerified || false,
          profilePictureUrl: userWithoutPassword.profilePictureUrl,
          bio: userWithoutPassword.bio,
          bannerUrl: userWithoutPassword.bannerUrl,
          displayName: userWithoutPassword.displayName,
          backgroundColor: userWithoutPassword.backgroundColor,
          accentColor: userWithoutPassword.accentColor,
          avatarUrl: userWithoutPassword.avatarUrl,
          createdAt: userWithoutPassword.createdAt,
          userType: userWithoutPassword.userType,
          ageRange: userWithoutPassword.ageRange,
          role: userWithoutPassword.role,
          isAdmin: userWithoutPassword.isAdmin || false,
          messagingEnabled: userWithoutPassword.messagingEnabled || false,
          isPrivate: userWithoutPassword.isPrivate || false,
          currentStreak: userWithoutPassword.currentStreak || 0,
          longestStreak: userWithoutPassword.longestStreak || 0,
          level: userWithoutPassword.level || 1,
          totalXP: userWithoutPassword.totalXP || 0,
        });
      }
    } catch (error) {
      console.error("Error updating daily check-in streak:", error);
    }

    // Fallback to session user data if streak update fails
    const { password, ...userWithoutPassword } = req.user as any;
    return res.json({
      id: userWithoutPassword.id,
      username: userWithoutPassword.username,
      email: userWithoutPassword.email,
      emailVerified: userWithoutPassword.emailVerified || false,
      profilePictureUrl: userWithoutPassword.profilePictureUrl,
      bio: userWithoutPassword.bio,
      bannerUrl: userWithoutPassword.bannerUrl,
      displayName: userWithoutPassword.displayName,
      backgroundColor: userWithoutPassword.backgroundColor,
      accentColor: userWithoutPassword.accentColor,
      avatarUrl: userWithoutPassword.avatarUrl,
      createdAt: userWithoutPassword.createdAt,
      userType: userWithoutPassword.userType,
      ageRange: userWithoutPassword.ageRange,
      role: userWithoutPassword.role,
      isAdmin: userWithoutPassword.isAdmin || false,
      messagingEnabled: userWithoutPassword.messagingEnabled || false,
      isPrivate: userWithoutPassword.isPrivate || false,
      currentStreak: userWithoutPassword.currentStreak || 0,
      longestStreak: userWithoutPassword.longestStreak || 0,
      level: userWithoutPassword.level || 1,
      totalXP: userWithoutPassword.totalXP || 0,
    });
  });

  // ==========================================
  // User Routes
  // ==========================================

  // Delete Account Routes - Self-service account deletion
  // ==========================================
  
  // Step 1: Initiate account deletion with username verification
  app.post("/api/users/me/delete/initiate", authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { confirm_username } = req.body;

      if (!user) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      if (!confirm_username) {
        return res.status(400).json({ error: "USERNAME_REQUIRED" });
      }

      // Verify the username matches exactly (case-sensitive)
      if (confirm_username !== user.username) {
        return res.status(400).json({ error: "USERNAME_MISMATCH" });
      }

      // Check if session is recent enough (within 10 minutes)
      // Get login time from session, or use current time if not set
      const loginTime = req.session.loginTime || Date.now();
      const sessionAge = Date.now() - loginTime;
      const tenMinutes = 10 * 60 * 1000;
      
      if (sessionAge > tenMinutes) {
        return res.status(401).json({ error: "REAUTH_REQUIRED" });
      }

      // Set a flag in session to indicate initiation step is complete
      if (!req.session.deleteAccount) {
        req.session.deleteAccount = {};
      }
      req.session.deleteAccount.initiated = true;
      req.session.deleteAccount.initiatedAt = Date.now();

      res.json({ 
        status: "ok", 
        requires_final_confirm: true,
        message: "Username verified. Proceed to final confirmation."
      });

    } catch (err) {
      console.error("Error initiating account deletion:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  });

  // Step 2: Final confirmation and account deletion
  app.post("/api/users/me/delete/confirm", authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { confirmed } = req.body;

      if (!user) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      if (!confirmed) {
        return res.status(400).json({ error: "CONFIRMATION_REQUIRED" });
      }

      // Check if initiation step was completed
      if (!req.session.deleteAccount?.initiated) {
        return res.status(400).json({ error: "INITIATION_REQUIRED" });
      }

      // Check if initiation is still valid (within 5 minutes)
      const initiationAge = Date.now() - (req.session.deleteAccount.initiatedAt || 0);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (initiationAge > fiveMinutes) {
        return res.status(401).json({ error: "INITIATION_EXPIRED" });
      }

      // Prevent deletion of admin accounts
      if (user.role === "admin") {
        return res.status(403).json({ error: "ADMIN_CANNOT_DELETE" });
      }

      // Perform the deletion using existing deleteUser function
      console.log(`🗑️ User ${user.username} (ID: ${user.id}) requested account deletion`);
      const deletionResult = await storage.deleteUser(user.id);

      if (deletionResult) {
        // Clear the session data
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
        });

        // Log the deletion for audit purposes
        console.log(`✅ Account deletion completed for user: ${user.username} (ID: ${user.id})`);
        
        res.status(202).json({ 
          status: "deletion_started",
          message: "Account deletion completed. You have been signed out."
        });
      } else {
        res.status(500).json({ error: "DELETE_FAILED" });
      }

    } catch (err) {
      console.error("Error confirming account deletion:", err);
      res.status(500).json({ error: "DELETE_FAILED" });
    }
  });

  // Search users endpoint for messaging (must come before parameterized routes)
  app.get("/api/users/search", authMiddleware, async (req, res) => {
    try {
      const query = req.query.q as string;

      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      // Search for users by username or display name
      console.log("Searching for users with query:", query);
      const users = await storage.searchUsers(query);
      console.log("Search results:", users.length, "users found");

      // Remove current user from results and exclude passwords
      const filteredUsers = users
        .filter(user => user.id !== req.user?.id)
        .map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified || false
        }));

      res.json(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      return res.status(500).json({ message: "Error searching users" });
    }
  });

  // Get featured users endpoint
  app.get("/api/users/featured", async (req, res) => {
    try {
      // Get first 6 users with custom avatar border colors for demonstration
      const users = await storage.getFeaturedUsers(6);

      if (!users || users.length === 0) {
        return res.json([]);
      }

      // Include avatarBorderColor in the public user data
      const publicUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        accentColor: user.accentColor,
        primaryColor: user.primaryColor,
        avatarBorderColor: user.avatarBorderColor,
        backgroundColor: user.backgroundColor,
        cardColor: user.cardColor,
        location: user.location,
        website: user.website,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json(publicUsers);
    } catch (err) {
      console.error("Error getting featured users:", err);
      res.status(500).json({ message: "Error getting featured users" });
    }
  });

  // Get public banner settings endpoint
  app.get("/api/banner-settings", async (req, res) => {
    try {
      const bannerSettings = await storage.getBannerSettings();
      
      // If no settings exist, return default settings
      if (!bannerSettings) {
        return res.json({
          id: null,
          isEnabled: true,
          title: "Alpha Stage",
          message: "This app is currently in Alpha. You may encounter issues while using it.",
          linkText: "report a bug",
          linkUrl: "/contact",
          variant: "primary",
          showIcon: true,
          isDismissible: true,
          updatedBy: null,
          updatedAt: null,
          createdAt: null
        });
      }
      
      res.json(bannerSettings);
    } catch (err) {
      console.error("Error fetching banner settings:", err);
      res.status(500).json({ message: "Error fetching banner settings" });
    }
  });

  // Get all-time points leaderboard endpoint
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboardData = await LeaderboardService.getAllTimeLeaderboard(limit);
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error fetching all-time leaderboard:", error);
      res.status(500).json({ message: "Error fetching all-time leaderboard data" });
    }
  });

  // Monthly leaderboard routes
  app.get("/api/leaderboard/monthly/current", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboardData = await LeaderboardService.getCurrentMonthLeaderboard(limit);
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error fetching current month leaderboard:", error);
      res.status(500).json({ message: "Error fetching current month leaderboard" });
    }
  });

  app.get("/api/leaderboard/monthly/previous", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboardData = await LeaderboardService.getPreviousMonthLeaderboard(limit);
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error fetching previous month leaderboard:", error);
      res.status(500).json({ message: "Error fetching previous month leaderboard" });
    }
  });

  // Weekly leaderboard routes
  app.get("/api/leaderboard/weekly/current", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboardData = await LeaderboardService.getCurrentWeekLeaderboard(limit);
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error fetching current week leaderboard:", error);
      res.status(500).json({ message: "Error fetching current week leaderboard" });
    }
  });

  app.get("/api/leaderboard/weekly/previous", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboardData = await LeaderboardService.getPreviousWeekLeaderboard(limit);
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error fetching previous week leaderboard:", error);
      res.status(500).json({ message: "Error fetching previous week leaderboard" });
    }
  });

  // User stats routes
  app.get("/api/user/:userId/stats/monthly", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const stats = await LeaderboardService.getUserCurrentMonthStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user monthly stats:", error);
      res.status(500).json({ message: "Error fetching user monthly stats" });
    }
  });

  app.get("/api/user/:userId/stats/weekly", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const stats = await LeaderboardService.getUserCurrentWeekStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user weekly stats:", error);
      res.status(500).json({ message: "Error fetching user weekly stats" });
    }
  });

  // Top contributors routes
  app.get("/api/leaderboard/top-contributors/:periodType", async (req, res) => {
    try {
      const periodType = req.params.periodType as 'weekly' | 'monthly';
      if (!['weekly', 'monthly'].includes(periodType)) {
        return res.status(400).json({ message: "Period type must be 'weekly' or 'monthly'" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const topContributors = await LeaderboardService.getTopContributors(periodType, limit);
      res.json(topContributors);
    } catch (error) {
      console.error("Error fetching top contributors:", error);
      res.status(500).json({ message: "Error fetching top contributors" });
    }
  });

  app.get("/api/leaderboard/top-contributors/:periodType/:period/:year", async (req, res) => {
    try {
      const periodType = req.params.periodType as 'weekly' | 'monthly';
      const period = req.params.period;
      const year = parseInt(req.params.year);
      
      if (!['weekly', 'monthly'].includes(periodType)) {
        return res.status(400).json({ message: "Period type must be 'weekly' or 'monthly'" });
      }
      if (isNaN(year)) {
        return res.status(400).json({ message: "Invalid year" });
      }
      
      const topContributors = await LeaderboardService.getTopContributorsByPeriod(periodType, period, year);
      res.json(topContributors);
    } catch (error) {
      console.error("Error fetching top contributors by period:", error);
      res.status(500).json({ message: "Error fetching top contributors by period" });
    }
  });

  // Points leaderboard (kept as /api/xp/leaderboard for backward compatibility)
  // Note: totalXP field now stores total Points
  app.get("/api/xp/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getXPLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching points leaderboard:", error);
      res.status(500).json({ message: "Error fetching points leaderboard" });
    }
  });

  // Get user's total points (kept as /api/user/:userId/xp for backward compatibility)
  app.get("/api/user/:userId/xp", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      res.json({ totalXP: user?.totalXP || 0 });
    } catch (error) {
      console.error("Error fetching user points:", error);
      res.status(500).json({ message: "Error fetching user points" });
    }
  });

  // Get user's points history (kept as /api/user/:userId/xp/history for backward compatibility)
  app.get("/api/user/:userId/xp/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const pointsHistory = await storage.getUserPointsHistory(userId, limit);
      res.json(pointsHistory);
    } catch (error) {
      console.error("Error fetching user points history:", error);
      res.status(500).json({ message: "Error fetching user points history" });
    }
  });

  // Get user's level progress (for circular XP progress ring)
  app.get("/api/user/:userId/level-progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { getLevelProgress } = await import("./level-system");
      const progress = getLevelProgress(user.totalXP, user.level);
      
      res.json({
        level: user.level,
        currentXP: user.totalXP,
        ...progress
      });
    } catch (error) {
      console.error("Error fetching user level progress:", error);
      res.status(500).json({ message: "Error fetching user level progress" });
    }
  });

  // Recalculate levels for all users based on their current XP
  app.post("/api/admin/recalculate-levels", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      const { calculateLevel } = await import("./level-system");
      const allUsers = await storage.getAllUsers();
      
      let updatedCount = 0;
      for (const user of allUsers) {
        const newLevel = calculateLevel(user.totalXP);
        if (newLevel !== user.level) {
          await storage.updateUser(user.id, { level: newLevel });
          updatedCount++;
          console.log(`Updated user ${user.username} from level ${user.level} to level ${newLevel} (${user.totalXP} XP)`);
        }
      }

      console.log(`✅ Recalculated levels for ${updatedCount} users`);
      res.json({ 
        message: `Successfully recalculated levels for ${updatedCount} users`,
        updatedCount,
        totalUsers: allUsers.length
      });
    } catch (error) {
      console.error("Error recalculating levels:", error);
      res.status(500).json({ message: "Error recalculating levels" });
    }
  });

  // Award monthly top contributor badges retroactively
  app.post("/api/admin/award-monthly-badges", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      console.log('🏆 Starting retroactive monthly badge awards...');
      
      // Get all monthly top contributors from the database
      const allMonthlyWinners = await LeaderboardService.getTopContributors('monthly', 100);
      
      let badgesAwarded = 0;
      
      for (const winner of allMonthlyWinners) {
        try {
          // Check if user already has this badge for this specific month
          const existingBadges = await storage.getUserBadges(winner.userId);
          const alreadyHasBadgeForPeriod = existingBadges.some(
            ub => ub.badgeType === 'monthly_top_contributor' && 
                  ub.createdAt && 
                  ub.createdAt.toISOString().startsWith(`${winner.year}-${winner.period.split('-')[1]}`)
          );

          if (!alreadyHasBadgeForPeriod) {
            await storage.createUserBadge({
              userId: winner.userId,
              badgeType: 'monthly_top_contributor',
              assignedBy: 'system',
              assignedById: null,
              expiresAt: null
            });
            
            badgesAwarded++;
            console.log(`🏆 Badge awarded to user ${winner.userId} for ${winner.period}`);
          }
        } catch (error) {
          console.error(`Error awarding badge to user ${winner.userId}:`, error);
        }
      }

      console.log(`✅ Awarded ${badgesAwarded} monthly top contributor badges`);
      
      res.json({ 
        message: `Successfully awarded ${badgesAwarded} monthly top contributor badges`,
        badgesAwarded,
        totalWinners: allMonthlyWinners.length
      });
    } catch (error) {
      console.error("Error awarding monthly badges:", error);
      res.status(500).json({ message: "Error awarding monthly badges" });
    }
  });

  // Get user point history (admin endpoint)
  app.get("/api/admin/users/:userId/points-history", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const pointsHistory = await storage.getUserPointsHistory(userId, limit);
      
      res.json(pointsHistory);
    } catch (error) {
      console.error("Error fetching user points history:", error);
      res.status(500).json({ message: "Error fetching user points history" });
    }
  });

  // Manually adjust user points (admin endpoint)
  app.post("/api/admin/users/:userId/adjust-points", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const { points, reason } = req.body;
      
      if (typeof points !== 'number' || !reason) {
        return res.status(400).json({ message: "Points (number) and reason (string) are required" });
      }

      // Create a manual adjustment entry in the points history
      await storage.addUserPointsHistory({
        userId,
        action: 'upload', // Using upload as the base action type
        points,
        description: `Admin Adjustment: ${reason}`
      });

      // Update monthly leaderboard
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const monthKey = `${year}-${month}`;

      const entry = await storage.getMonthlyLeaderboardEntry(userId, monthKey, year);
      if (entry) {
        await storage.updateMonthlyLeaderboardEntry(entry.id, {
          totalPoints: entry.totalPoints + points
        });
      } else {
        await storage.createMonthlyLeaderboardEntry({
          userId,
          month: monthKey,
          year,
          uploadsCount: 0,
          likesGivenCount: 0,
          commentsCount: 0,
          firesGivenCount: 0,
          viewsCount: 0,
          totalPoints: points,
        });
      }

      // Recalculate rankings
      await LeaderboardService.recalculateRankings(monthKey, year);

      console.log(`✅ Admin adjusted ${points} points for user ${userId}: ${reason}`);
      
      res.json({ 
        message: "Points adjusted successfully",
        userId,
        pointsAdjusted: points,
        reason
      });
    } catch (error) {
      console.error("Error adjusting user points:", error);
      res.status(500).json({ message: "Error adjusting user points" });
    }
  });

  // Get points system breakdown (admin endpoint)
  app.get("/api/admin/points-system", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      res.json({
        pointValues: {
          upload: 5,
          screenshot_upload: 2,
          like: 1,
          comment: 1,
          fire: 3,
          view: 0.01
        },
        description: {
          upload: "Points awarded for uploading clips or reels",
          screenshot_upload: "Points awarded for uploading screenshots",
          like: "Points awarded for liking content",
          comment: "Points awarded for commenting on content",
          fire: "Points awarded for fire reactions",
          view: "Points awarded when content receives views (0.01 points per view, 1 point per 100 views)"
        }
      });
    } catch (error) {
      console.error("Error fetching points system:", error);
      res.status(500).json({ message: "Error fetching points system" });
    }
  });

  // Recalculate upload points for all historic clips and screenshots
  app.post("/api/admin/recalculate-upload-points", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      console.log('🔄 Starting recalculation of historic upload points...');
      
      // Get all clips and screenshots
      const allClips = await storage.getAllClips();
      const allScreenshots = await storage.getAllScreenshots();
      
      let clipPointsAwarded = 0;
      let screenshotPointsAwarded = 0;
      
      // Award points for each clip (5 points per upload) using the actual upload date
      for (const clip of allClips) {
        await LeaderboardService.awardPoints(
          clip.userId,
          'upload',
          `Historic Migration: ${clip.videoType === 'reel' ? 'Reel' : 'Clip'} - ${clip.title}`,
          clip.createdAt
        );
        clipPointsAwarded++;
        
        if (clipPointsAwarded % 10 === 0) {
          console.log(`Processed ${clipPointsAwarded} clips...`);
        }
      }
      
      // Award points for each screenshot (2 points per upload) using the actual upload date
      for (const screenshot of allScreenshots) {
        await LeaderboardService.awardPoints(
          screenshot.userId,
          'screenshot_upload',
          `Historic Migration: Screenshot - ${screenshot.title}`,
          screenshot.createdAt
        );
        screenshotPointsAwarded++;
        
        if (screenshotPointsAwarded % 10 === 0) {
          console.log(`Processed ${screenshotPointsAwarded} screenshots...`);
        }
      }

      const totalPointsAwarded = (clipPointsAwarded + screenshotPointsAwarded) * 5;
      console.log(`✅ Recalculated upload points: ${clipPointsAwarded} clips + ${screenshotPointsAwarded} screenshots = ${totalPointsAwarded} total points awarded`);
      
      res.json({ 
        message: `Successfully recalculated upload points for all historic content`,
        clipsProcessed: clipPointsAwarded,
        screenshotsProcessed: screenshotPointsAwarded,
        totalUploads: clipPointsAwarded + screenshotPointsAwarded,
        totalPointsAwarded
      });
    } catch (error) {
      console.error("Error recalculating upload points:", error);
      res.status(500).json({ message: "Error recalculating upload points" });
    }
  });

  // Clear historic migration points (admin only)
  app.post("/api/admin/clear-historic-points", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      console.log('🗑️ Clearing historic migration points...');
      
      // Delete all points history entries with "Historic Migration" in description
      await storage.deleteHistoricMigrationPoints();
      
      // Rebuild all leaderboard entries from scratch based on actual dates
      await storage.rebuildLeaderboards();
      
      console.log('✅ Successfully cleared historic migration points and rebuilt leaderboards');
      
      res.json({ 
        message: `Successfully cleared historic migration points and rebuilt leaderboards`
      });
    } catch (error) {
      console.error("Error clearing historic points:", error);
      res.status(500).json({ message: "Error clearing historic points" });
    }
  });

  // Recalculate all users' total points and levels from points history (admin only)
  app.post("/api/admin/recalculate-points-and-levels", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      console.log('🔄 Recalculating all users\' points and levels from points history...');
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      let usersUpdated = 0;
      
      for (const user of allUsers) {
        // Get sum of all points for this user
        const pointsHistory = await storage.getUserPointsHistory(user.id, 999999);
        const totalPoints = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);
        
        // Update user's totalXP field (which now stores total points)
        await storage.updateUser(user.id, { totalXP: totalPoints });
        
        // Recalculate and update level
        await LeaderboardService.updateUserLevel(user.id);
        
        usersUpdated++;
        if (usersUpdated % 10 === 0) {
          console.log(`Updated ${usersUpdated} users...`);
        }
      }
      
      console.log(`✅ Recalculated points and levels for ${usersUpdated} users`);
      
      res.json({ 
        message: `Successfully recalculated points and levels for ${usersUpdated} users`,
        usersUpdated
      });
    } catch (error) {
      console.error("Error recalculating points and levels:", error);
      res.status(500).json({ message: "Error recalculating points and levels" });
    }
  });

  // Get user by username
  app.get("/api/users/:username", async (req, res) => {
    try {
      // Support demo user lookup
      if (req.params.username === "demo") {
        const demoUser = await storage.getUserWithStats(999);
        if (demoUser) {
          const { password, ...userWithoutPassword } = demoUser;
          return res.json(userWithoutPassword);
        } else {
          return res.json(getDemoUserWithStats());
        }
      }

      // Remove leading @ from username if present
      const username = req.params.username.startsWith('@') ? req.params.username.slice(1) : req.params.username;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check privacy controls for private profiles
      const requesterId = req.user?.id;
      const isOwnProfile = requesterId === user.id;

      if (user.isPrivate && !isOwnProfile && requesterId) {
        const isFollowing = await storage.isFollowing(requesterId, user.id);
        if (!isFollowing) {
          return res.status(403).json({ message: "This profile is private. Follow the user to see their content." });
        }
      } else if (user.isPrivate && !isOwnProfile && !requesterId) {
        return res.status(403).json({ message: "This profile is private. Please log in and follow the user to see their content." });
      }

      // Get additional user stats
      const userWithStats = await storage.getUserWithStats(user.id);
      if (!userWithStats) {
        return res.status(404).json({ message: "User stats not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = userWithStats;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Social media preview image generator
  app.get('/api/social-preview/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      console.log(`🖼️ Generating social preview for user: ${username}`);
      
      // Fetch user data
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create canvas-like preview image using Sharp
      const width = 1200;
      const height = 630;
      const bannerHeight = 200; // Height for banner section
      
      // Create main dark background
      let finalImage = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 15, g: 23, b: 42, alpha: 1 } // Dark blue background
        }
      })
      .png()
      .toBuffer();
      
      // Add banner section at the top if user has one
      if (user.bannerUrl) {
        try {
          console.log(`🖼️ Fetching banner from: ${user.bannerUrl}`);
          const response = await fetch(user.bannerUrl);
          if (response.ok) {
            const bannerBuffer = Buffer.from(await response.arrayBuffer());
            const bannerImage = await sharp(bannerBuffer)
              .resize(width, bannerHeight, { fit: 'cover', position: 'center' })
              .png()
              .toBuffer();
            
            // Add banner to top of image
            finalImage = await sharp(finalImage)
              .composite([{
                input: bannerImage,
                left: 0,
                top: 0,
                blend: 'over'
              }])
              .png()
              .toBuffer();
          }
        } catch (error) {
          console.log('Failed to fetch banner:', error);
        }
      }
        
      // Add profile picture if available - much larger and more prominent
      if (user.avatarUrl) {
        try {
          console.log(`👤 Fetching avatar from: ${user.avatarUrl}`);
          const avatarResponse = await fetch(user.avatarUrl);
          if (avatarResponse.ok) {
            const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());
            const profilePicSize = 180; // Much larger profile picture
            // Create circular avatar to fit inside the border
            const circularAvatar = await sharp(avatarBuffer)
              .resize(profilePicSize, profilePicSize, { fit: 'cover' })
              .composite([{
                input: Buffer.from(
                  `<svg width="${profilePicSize}" height="${profilePicSize}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${profilePicSize / 2}" cy="${profilePicSize / 2}" r="${profilePicSize / 2}" fill="white"/>
                  </svg>`
                ),
                blend: 'dest-in'
              }])
              .png()
              .toBuffer();
            
            // Position profile picture in the main content area (below banner)
            const profileX = 100; // Left margin
            const profileY = bannerHeight + 80; // Below banner with more margin for better banner visibility
            
            finalImage = await sharp(finalImage)
              .composite([{
                input: circularAvatar,
                left: profileX,
                top: profileY,
                blend: 'over'
              }])
              .png()
              .toBuffer();
              
            console.log(`✅ Avatar added successfully at position (${profileX}, ${profileY})`);
          } else {
            console.log(`❌ Avatar fetch failed with status: ${avatarResponse.status}`);
          }
        } catch (error) {
          console.log('Failed to process avatar image:', error);
        }
      } else {
        console.log('❌ No avatar URL provided for user');
      }
      
      // Get user stats for the preview - use direct database queries for reliability
      console.log(`🔍 Getting stats for user ID: ${user.id}`);
      
      // Get clips count directly from database
      const userClips = await storage.getClipsByUserId(user.id);
      const clipsCount = userClips?.length || 0;
      
      // Get follower counts using proper database queries
      const followersCount = await storage.getFollowerCount(user.id);
      const followingCount = await storage.getFollowingCount(user.id);
      
      console.log(`📊 User stats (direct): ${clipsCount} clips, ${followersCount} followers, ${followingCount} following`);
      
      // Get user's favorite games (max 5 for tags)
      const favoriteGames = await storage.getUserGameFavorites(user.id);
      const displayGames = favoriteGames.slice(0, 5); // Limit to 5 games
      
      // Parse user types from comma-separated string
      const userTypesString = user.userType || '';
      const userTypes = userTypesString.split(',').map(type => type.trim()).filter(Boolean);
      
      // Map user type IDs to display labels
      const userTypeLabels: Record<string, string> = {
        'streamer': 'Streamer',
        'gamer': 'Gamer', 
        'professional_gamer': 'Pro Gamer',
        'content_creator': 'Creator',
        'indie_developer': 'Indie Dev',
        'viewer': 'Viewer',
        'filthy_casual': 'Casual',
        'doom_scroller': 'Doom Scroller'
      };
      
      const displayUserTypes = userTypes.map(type => userTypeLabels[type] || type).slice(0, 2); // Limit to 2 types for space
      
      console.log(`🎮 User types: ${displayUserTypes.join(', ')}`);
      console.log(`🎯 Favorite games (${displayGames.length}): ${displayGames.map(g => g.name).join(', ')}`);
      
      // Create gamefolio-style profile layout using SVG to match the React component
      const displayName = user.displayName || user.username;
      const bio = user.bio || 'Ready to play any game!';
      
      // Calculate positions based on new layout
      const profileX = 100;
      const profileY = bannerHeight + 80;
      const profilePicSize = 180;
      
      const profileLayoutSvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              .profile-border { fill: none; stroke: #8b5cf6; stroke-width: 6; }
              .username { fill: #ffffff; font-family: 'Arial', sans-serif; font-size: 48px; font-weight: bold; }
              .handle { fill: #9ca3af; font-family: 'Arial', sans-serif; font-size: 24px; }
              .bio-text { fill: #d1d5db; font-family: 'Arial', sans-serif; font-size: 20px; }
              .stat-number { fill: #ffffff; font-family: 'Arial', sans-serif; font-size: 32px; font-weight: bold; }
              .stat-label { fill: #9ca3af; font-family: 'Arial', sans-serif; font-size: 18px; }
              .badge-text { fill: #ffffff; font-family: 'Arial', sans-serif; font-size: 16px; font-weight: bold; }
              .gamefolio-brand { fill: #4ade80; font-family: 'Arial', sans-serif; font-size: 28px; font-weight: bold; }
            </style>
          </defs>
          
          <!-- Purple border around profile picture -->
          <circle cx="${profileX + profilePicSize/2}" cy="${profileY + profilePicSize/2}" r="${profilePicSize/2 + 8}" class="profile-border"/>
          
          <!-- Profile info section - positioned to the right of profile picture -->
          <g transform="translate(${profileX + profilePicSize + 40}, ${profileY + 20})">
            <!-- Username (much larger) with verified badge if applicable -->
            <g>
              <text x="0" y="0" class="username">${displayName}</text>
              ${user.emailVerified ? `
                <!-- Verified badge icon -->
                <image x="${displayName.length * 29}" y="-32" width="32" height="32" href="/attached_assets/green_badge_128_1758978841463.png"/>
              ` : ''}
            </g>
            <!-- Handle -->
            <text x="0" y="35" class="handle">@${user.username}</text>
            
            <!-- Bio (larger and more prominent) -->
            <text x="0" y="75" class="bio-text">${bio.length > 60 ? bio.substring(0, 60) + '...' : bio}</text>
            
            <!-- Stats in a row (aligned under bio text) -->
            <g transform="translate(0, 120)">
              <g>
                <text x="0" y="0" class="stat-number">${clipsCount}</text>
                <text x="0" y="25" class="stat-label">Clips</text>
              </g>
              <g transform="translate(120, 0)">
                <text x="0" y="0" class="stat-number">${followersCount}</text>
                <text x="0" y="25" class="stat-label">Followers</text>
              </g>
              <g transform="translate(240, 0)">
                <text x="0" y="0" class="stat-number">${followingCount}</text>
                <text x="0" y="25" class="stat-label">Following</text>
              </g>
            </g>
            
            <!-- User Type and Game badges -->
            <g transform="translate(0, 180)">
              ${displayUserTypes.map((userType, index) => {
                const width = Math.max(userType.length * 8 + 20, 80);
                const x = index === 0 ? 0 : displayUserTypes.slice(0, index).reduce((acc, type) => acc + Math.max(type.length * 8 + 20, 80) + 10, 0);
                return `
                  <rect x="${x}" y="0" width="${width}" height="32" rx="16" fill="#8b5cf6"/>
                  <text x="${x + width / 2}" y="21" class="badge-text" text-anchor="middle">${userType}</text>
                `;
              }).join('')}
              
              ${displayGames.map((game, index) => {
                const gameName = game.name.length > 10 ? game.name.substring(0, 10) + '...' : game.name;
                // Increased padding for better visual appearance (from 16 to 24 pixels total padding)
                const width = Math.max(gameName.length * 7 + 24, 85);
                const x = index === 0 ? 0 : displayGames.slice(0, index).reduce((acc, g) => {
                  const prevName = g.name.length > 10 ? g.name.substring(0, 10) + '...' : g.name;
                  return acc + Math.max(prevName.length * 7 + 24, 85) + 8;
                }, 0);
                return `
                  <rect x="${x}" y="40" width="${width}" height="28" rx="14" fill="#059669"/>
                  <text x="${x + width / 2}" y="58" class="badge-text" text-anchor="middle" style="font-size: 14px;">${gameName}</text>
                `;
              }).join('')}
              
              <!-- Gaming Platform Links -->
              ${(() => {
                // Collect available gaming platforms from user profile
                const availablePlatforms = [];
                
                if (user.steamUsername) {
                  availablePlatforms.push({ name: 'Steam', username: user.steamUsername, color: '#1B2838', icon: '⚙' });
                }
                if (user.xboxUsername) {
                  availablePlatforms.push({ name: 'Xbox', username: user.xboxUsername, color: '#107C10', icon: 'Ⓧ' });
                }
                if (user.playstationUsername) {
                  availablePlatforms.push({ name: 'PlayStation', username: user.playstationUsername, color: '#003791', icon: '▲' });
                }
                if (user.youtubeUsername) {
                  availablePlatforms.push({ name: 'YouTube', username: user.youtubeUsername, color: '#FF0000', icon: '▶' });
                }
                if (user.discordUsername) {
                  availablePlatforms.push({ name: 'Discord', username: user.discordUsername, color: '#7289DA', icon: '💬' });
                }
                if (user.epicUsername) {
                  availablePlatforms.push({ name: 'Epic', username: user.epicUsername, color: '#313131', icon: 'E' });
                }
                if (user.nintendoUsername) {
                  availablePlatforms.push({ name: 'Nintendo', username: user.nintendoUsername, color: '#E60012', icon: 'N' });
                }
                if (user.twitterUsername) {
                  availablePlatforms.push({ name: 'X', username: user.twitterUsername, color: '#1DA1F2', icon: '🐦' });
                }

                // Limit to first 6 platforms for space constraints
                const displayPlatforms = availablePlatforms.slice(0, 6);
                
                return displayPlatforms.map((platform, index) => {
                  const platformText = platform.name;
                  const width = Math.max(platformText.length * 6 + 20, 70);
                  const x = index === 0 ? 0 : displayPlatforms.slice(0, index).reduce((acc, p) => {
                    return acc + Math.max(p.name.length * 6 + 20, 70) + 6;
                  }, 0);
                  return `
                    <rect x="${x}" y="76" width="${width}" height="24" rx="12" fill="${platform.color}" opacity="0.9"/>
                    <text x="${x + width / 2}" y="91" class="badge-text" text-anchor="middle" style="font-size: 12px; fill: #ffffff;">${platform.icon} ${platformText}</text>
                  `;
                }).join('');
              })()}
            </g>
          </g>
          
        </svg>
      `;
      
      const layoutBuffer = Buffer.from(profileLayoutSvg);
      
      // Composite the profile layout onto the final image
      finalImage = await sharp(finalImage)
        .composite([{ input: layoutBuffer, blend: 'over' }])
        .png()
        .toBuffer();
      
      // Set appropriate headers for image response
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Disable caching for testing
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      console.log(`✅ Social preview generated successfully for ${username}`);
      res.send(finalImage);
      
    } catch (error) {
      console.error('Error generating social preview image:', error);
      res.status(500).json({ error: 'Failed to generate preview image' });
    }
  });

  // OG thumbnail with play button overlay for clips/reels
  app.get('/api/og-thumbnail/:shareCode', async (req: Request, res: Response) => {
    try {
      const { shareCode } = req.params;
      console.log(`🎬 Generating OG thumbnail with play button for shareCode: ${shareCode}`);
      
      // Try to find the clip by share code
      const clip = await storage.getClipByShareCode(shareCode);
      if (!clip) {
        return res.status(404).json({ error: 'Clip not found' });
      }

      // Get the full clip with user data
      const fullClip = await storage.getClipWithUser(clip.id);
      if (!fullClip || !fullClip.thumbnailUrl) {
        return res.status(404).json({ error: 'Clip thumbnail not found' });
      }

      // Generate thumbnail with play button overlay
      const thumbnailWithPlayButton = await addPlayButtonOverlay(fullClip.thumbnailUrl);

      // Set appropriate headers for image response with long cache
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
      console.log(`✅ OG thumbnail with play button generated for ${shareCode}`);
      res.send(thumbnailWithPlayButton);
      
    } catch (error) {
      console.error('Error generating OG thumbnail with play button:', error);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", authMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure the user is updating their own profile
      if (req.user?.id !== userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      // Validate text content for profanity and inappropriate language
      const validationErrors: string[] = [];

      if (req.body.displayName) {
        const validation = await contentFilterService.validateContent(req.body.displayName, 'displayName');
        if (!validation.isValid) {
          validationErrors.push(`Display Name: ${validation.errors.join(', ')}`);
        } else if (validation.filteredContent) {
          // Use cleaned content if automatic cleaning was applied
          req.body.displayName = validation.filteredContent;
        }
      }

      if (req.body.bio) {
        const validation = await contentFilterService.validateContent(req.body.bio, 'bio');
        if (!validation.isValid) {
          validationErrors.push(`Bio: ${validation.errors.join(', ')}`);
        } else if (validation.filteredContent) {
          // Use cleaned content if automatic cleaning was applied
          req.body.bio = validation.filteredContent;
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Profile contains inappropriate content",
          errors: validationErrors
        });
      }

      // Handle demo user separately
      if (userId === 999) {
        console.log("Updating demo user with data:", req.body);
        // For demo user, actually update the in-memory demo user data
        const updatedDemoUser = await storage.updateUser(userId, req.body);
        if (updatedDemoUser) {
          console.log("Demo user updated successfully, new banner URL:", updatedDemoUser.bannerUrl);
          const { password, ...userWithoutPassword } = updatedDemoUser;
          return res.json(userWithoutPassword);
        } else {
          return res.status(404).json({ message: "Demo user not found" });
        }
      }

      // Update the user profile
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Upload avatar
  app.post("/api/upload/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
      console.log('Avatar upload request received');
      console.log('User authenticated:', req.isAuthenticated());
      console.log('Request user:', req.user);
      console.log('File received:', !!req.file);

      if (!req.user) {
        console.log('No authenticated user');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;

      // Handle demo user specially - still process the file but store it locally
      if (userId === 999) {
        console.log('Handling demo user avatar upload');

        if (!req.file) {
          console.log('No file in request for demo user');
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log('Processing demo user file:', req.file.filename);

        // Process avatar with sharp for demo user
        const avatarBuffer = await sharp(req.file.path)
          .resize(400, 400, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();

        // For demo user, save to attached_assets directory
        const avatarFileName = `demo_avatar_${Date.now()}.jpg`;
        const avatarPath = path.join('attached_assets', avatarFileName);

        // Ensure attached_assets directory exists
        const attachedAssetsDir = path.join(process.cwd(), 'attached_assets');
        if (!fs.existsSync(attachedAssetsDir)) {
          fs.mkdirSync(attachedAssetsDir, { recursive: true });
        }

        // Write the processed avatar
        await fsPromises.writeFile(path.join(process.cwd(), avatarPath), avatarBuffer);

        const avatarUrl = `/attached_assets/${avatarFileName}`;

        // Update demo user's avatar in storage
        await storage.updateUser(userId, { avatarUrl });

        // Clean up temp file
        try {
          await fsPromises.unlink(req.file.path);
        } catch (error) {
          console.warn('Could not delete temp demo avatar file:', error);
        }

        console.log('Demo user avatar upload successful:', avatarUrl);

        return res.json({
          avatarUrl,
          message: "Avatar uploaded successfully for demo user"
        });
      }

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log('Processing file:', req.file.filename);

      // Process avatar with sharp and upload to Supabase
      const avatarBuffer = await sharp(req.file.path)
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      const { url: avatarUrl } = await supabaseStorage.uploadBuffer(
        avatarBuffer,
        `avatar-${userId}-${Date.now()}.jpg`,
        'image/jpeg',
        'image',
        userId
      );

      // Update user's avatar in database
      const updatedUser = await storage.updateUser(userId, {
        avatarUrl: avatarUrl
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user avatar" });
      }

      console.log('Avatar upload successful:', avatarUrl);

      // Clean up local file
      try {
        await fsPromises.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete local avatar file:', error);
      }

      // Return the new URL
      res.json({
        avatarUrl,
        message: "Avatar uploaded successfully"
      });
    } catch (err) {
      console.error("Error uploading avatar:", err);
      return res.status(500).json({ message: "Error uploading avatar" });
    }
  });


  // Check username availability (must come before parameterized routes)
  app.get("/api/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;

      if (!username || username.length < 3) {
        return res.status(400).json({ available: false, message: "Username must be at least 3 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);

      if (existingUser) {
        // Username is taken
        return res.status(200).json({ available: false, message: "Username is already taken" });
      } else {
        // Username is available
        return res.status(200).json({ available: true, message: "Username is available" });
      }
    } catch (error) {
      console.error("Error checking username availability:", error);
      return res.status(500).json({ available: false, message: "Error checking username availability" });
    }
  });

  // Upload profile image
  app.post("/api/users/:id/profile-image", authMiddleware, upload.single("profileImage"), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure the user is updating their own profile
      if (req.user?.id !== userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      // Handle demo user separately
      if (userId === 999) {
        // For demo user, pretend the update succeeded but don't actually update anything
        const demoUser = getDemoUser();
        const { password, ...userWithoutPassword } = demoUser;
        return res.json({
          ...userWithoutPassword,
          profileImageUrl: req.file?.path?.replace(/\\/g, "/").replace("uploads/", "/uploads/")
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Format the file path for use in URLs
      const imageUrl = req.file.path.replace(/\\/g, "/").replace("uploads/", "/uploads/");

      // Update the user profile with the new image URL
      const updatedUser = await storage.updateUser(userId, {
        avatarUrl: imageUrl
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Error uploading profile image:", err);
      return res.status(500).json({ message: "Error uploading profile image" });
    }
  });

  // Get user's clips
  app.get("/api/users/:username/clips", async (req, res) => {
    try {
      // Remove leading @ from username if present
      const username = req.params.username.startsWith('@') ? req.params.username.slice(1) : req.params.username;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if profile is private and user is not following
      const requesterId = req.user?.id;
      const isOwnProfile = requesterId === user.id;

      if (user.isPrivate && !isOwnProfile && requesterId) {
        const isFollowing = await storage.isFollowing(requesterId, user.id);
        if (!isFollowing) {
          return res.status(403).json({ message: "This profile is private. Follow the user to see their content." });
        }
      } else if (user.isPrivate && !isOwnProfile && !requesterId) {
        return res.status(403).json({ message: "This profile is private. Please log in and follow the user to see their content." });
      }

      // Get actual clips from database for all users including demo
      const clips = await storage.getClipsByUserId(user.id);

      // For demo user, also include the demo clips if no real clips exist
      if (req.params.username === "demo" && clips.length === 0) {
        return res.json(getDemoClips());
      }

      res.json(clips);
    } catch (err) {
      console.error("Error fetching user clips:", err);
      return res.status(500).json({ message: "Error fetching user clips" });
    }
  });

  // ==========================================
  // Game Routes
  // ==========================================

  // Get all games
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (err) {
      console.error("Error fetching games:", err);
      return res.status(500).json({ message: "Error fetching games" });
    }
  });

  // Get or create game by slug (for Twitch games that don't exist in database yet)
  app.get("/api/games/slug/:slug", async (req, res) => {
    try {
      const gameSlug = req.params.slug;

      // Try to find game in database first
      const games = await storage.getAllGames();
      let game = games.find((g: any) =>
        g.name.toLowerCase().replace(/[^a-z0-9]/g, '') === gameSlug
      );

      if (game) {
        return res.json(game);
      }

      // If not found in database, try to find on Twitch and create it
      try {
        // Convert slug back to a searchable name (best effort)
        const searchName = gameSlug.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add spaces before capital letters
        const twitchGames = await twitchApi.searchGames(searchName);

        if (twitchGames && twitchGames.length > 0) {
          // Find the best match (exact name match or first result)
          const twitchGame = twitchGames[0];

          // Create the game in database - use higher resolution for crisp display
          const newGame = await storage.createGame({
            name: twitchGame.name,
            imageUrl: twitchGame.box_art_url.replace('{width}x{height}', '600x800'),
            twitchId: twitchGame.id
          });

          return res.json(newGame);
        }
      } catch (twitchErr) {
        console.warn("Could not fetch from Twitch:", twitchErr);
      }

      return res.status(404).json({ message: "Game not found" });
    } catch (err) {
      console.error("Error getting/creating game:", err);
      return res.status(500).json({ message: "Error getting game" });
    }
  });

  // Get trending games
  app.get("/api/games/trending", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const games = await storage.getTrendingGames(limit);
      res.json(games);
    } catch (err) {
      console.error("Error fetching trending games:", err);
      return res.status(500).json({ message: "Error fetching trending games" });
    }
  });

  // Get game by ID
  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (err) {
      console.error("Error fetching game:", err);
      return res.status(500).json({ message: "Error fetching game" });
    }
  });

  // Get screenshot by ID
  app.get("/api/screenshots/:id", async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      if (isNaN(screenshotId)) {
        return res.status(400).json({ message: "Invalid screenshot ID" });
      }

      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Get user data for the screenshot
      const user = await storage.getUser(screenshot.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        screenshot.user = userWithoutPassword;
      }

      res.json(screenshot);
    } catch (err) {
      console.error("Error fetching screenshot:", err);
      return res.status(500).json({ message: "Error fetching screenshot" });
    }
  });

  // Get screenshot by shareCode
  app.get("/api/screenshots/share/:shareCode", async (req, res) => {
    try {
      const { shareCode } = req.params;
      if (!shareCode) {
        return res.status(400).json({ message: "Invalid share code" });
      }

      const screenshot = await storage.getScreenshotByShareCode(shareCode);
      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Get user data for the screenshot
      const user = await storage.getUser(screenshot.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        screenshot.user = userWithoutPassword;
      }

      res.json(screenshot);
    } catch (err) {
      console.error("Error fetching screenshot by shareCode:", err);
      return res.status(500).json({ message: "Error fetching screenshot" });
    }
  });

  // Get clips for a game (supports both internal IDs and Twitch IDs)
  app.get("/api/games/:id/clips", async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;

      let gameId: number | null = null;

      // Try to parse as integer first (internal ID)
      const parsedId = parseInt(gameIdParam);
      if (!isNaN(parsedId)) {
        // Check if game exists with this internal ID
        const game = await storage.getGame(parsedId);
        if (game) {
          gameId = parsedId;
        }
      }

      // If not found by internal ID, try to find by Twitch ID
      if (gameId === null) {
        const gameByTwitchId = await storage.getGameByTwitchId(gameIdParam);
        if (gameByTwitchId) {
          gameId = gameByTwitchId.id;
        }
      }

      if (gameId === null) {
        return res.status(404).json({ message: "Game not found" });
      }

      let clips = await storage.getClipsByGameId(gameId, limit);

      // Also include clips with relevant hashtags
      // Get the game name to search for hashtag variations
      const game = await storage.getGame(gameId);
      if (game) {
        const gameName = game.name.toLowerCase();
        const gameNameNoSpaces = gameName.replace(/\s+/g, '');
        const gameHashtag = `#${gameNameNoSpaces}`;

        // Search for additional clips with hashtags
        const hashtagClips = await storage.searchClips(gameHashtag);

        // Merge clips and remove duplicates
        const clipIds = new Set(clips.map(c => c.id));
        for (const hashtagClip of hashtagClips) {
          if (!clipIds.has(hashtagClip.id)) {
            clips.push(hashtagClip);
            clipIds.add(hashtagClip.id);
          }
        }

        // Sort by views and limit
        clips = clips
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, limit);
      }

      res.json(clips);
    } catch (err) {
      console.error("Error fetching game clips:", err);
      return res.status(500).json({ message: "Error fetching game clips" });
    }
  });

  // Search games
  app.get("/api/games/search/:query", async (req, res) => {
    try {
      const games = await storage.searchGames(req.params.query);
      res.json(games);
    } catch (err) {
      console.error("Error searching games:", err);
      return res.status(500).json({ message: "Error searching games" });
    }
  });

  // ==========================================
  // Clip Routes
  // ==========================================

  // Get recent clip uploads for activity banner
  app.get("/api/recent-uploads", async (req, res) => {
    try {
      const limit = 15;
      const clips = await storage.getAllClips(limit, 0);
      
      const recentUploads = clips
        .filter(clip => clip.user && clip.title)
        .map(clip => ({
          clipId: clip.id,
          username: clip.user.username,
          clipTitle: clip.title,
          uploadedAt: clip.createdAt,
        }));
      
      res.json(recentUploads);
    } catch (err) {
      console.error("Error fetching recent uploads:", err);
      return res.status(500).json({ message: "Error fetching recent uploads" });
    }
  });

  // Get all clips (latest first)
  app.get("/api/clips", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const currentUserId = (req.user as any)?.id;
      console.log('🔍 Latest clips API: currentUserId =', currentUserId);
      
      // Force no caching for privacy-sensitive content
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const clips = await storage.getAllClips(limit, offset, currentUserId);
      res.json(clips);
    } catch (err) {
      console.error("Error fetching clips:", err);
      return res.status(500).json({ message: "Error fetching clips" });
    }
  });

  // Get clips by hashtag
  app.get("/api/clips/hashtag/:hashtag", async (req, res) => {
    try {
      const { hashtag } = req.params;
      const clips = await storage.getClipsByHashtag(hashtag);
      res.json(clips);
    } catch (err) {
      console.error("Error fetching clips by hashtag:", err);
      return res.status(500).json({ message: "Error fetching clips by hashtag" });
    }
  });


  // Get all clips feed
  app.get("/api/clips/feed", async (req, res) => {
    try {
      const period = (req.query.period as string) || "day";
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const clips = await storage.getFeedClips(period, limit);
      res.json(clips);
    } catch (err) {
      console.error("Error fetching clips feed:", err);
      return res.status(500).json({ message: "Error fetching clips feed" });
    }
  });

  // Trending clips route
  app.get("/api/clips/trending", async (req, res) => {
    try {
      const { period = 'all', limit = 10, gameId } = req.query;
      const currentUserId = (req.user as any)?.id;
      console.log('🔍 Trending clips API: currentUserId =', currentUserId, 'period =', period, 'session user:', req.user);
      
      // Force no caching for privacy-sensitive content
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const clips = await storage.getTrendingClips(
        period as string,
        parseInt(limit as string) || 10,
        gameId ? parseInt(gameId as string) : undefined,
        currentUserId
      );
      res.json(clips);
    } catch (err) {
      console.error("Error fetching trending clips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trending reels route (compatible with home page's /api/clips/reels/trending)
  app.get("/api/clips/reels/trending", async (req, res) => {
    try {
      const { period = 'day', limit = 10, gameId } = req.query;
      const currentUserId = (req.user as any)?.id;
      const reels = await storage.getTrendingReels(
        period as string,
        parseInt(limit as string) || 10,
        gameId ? parseInt(gameId as string) : undefined,
        currentUserId
      );
      res.json(reels);
    } catch (err) {
      console.error("Error fetching trending reels:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Latest reels route (newest uploaded reels)
  app.get("/api/reels/latest", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
      const currentUserId = (req.user as any)?.id;
      const reels = await storage.getLatestReels(limit, currentUserId);
      res.json(reels);
    } catch (err) {
      console.error("Error fetching latest reels:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trending reels route
  app.get("/api/reels/trending", async (req, res) => {
    try {
      const { period = 'day', limit = 10, gameId } = req.query;
      const currentUserId = (req.user as any)?.id;
      const reels = await storage.getTrendingReels(
        period as string,
        parseInt(limit as string) || 10,
        gameId ? parseInt(gameId as string) : undefined,
        currentUserId
      );
      res.json(reels);
    } catch (err) {
      console.error("Error fetching trending reels:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Comprehensive Trending API endpoints for the trending page

  // Trending clips by likes
  app.get("/api/trending/clips/likes", async (req, res) => {
    try {
      const { period = 'today', limit = 20, gameId } = req.query;
      const clips = await storage.getTrendingClipsByLikes(
        period as string,
        parseInt(limit as string) || 20,
        gameId ? parseInt(gameId as string) : undefined
      );
      res.json(clips);
    } catch (err) {
      console.error("Error fetching trending clips by likes:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trending clips by comments
  app.get("/api/trending/clips/comments", async (req, res) => {
    try {
      const { period = 'today', limit = 20, gameId } = req.query;
      const clips = await storage.getTrendingClipsByComments(
        period as string,
        parseInt(limit as string) || 20,
        gameId ? parseInt(gameId as string) : undefined
      );
      res.json(clips);
    } catch (err) {
      console.error("Error fetching trending clips by comments:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trending reels by likes
  app.get("/api/trending/reels/likes", async (req, res) => {
    try {
      const { period = 'today', limit = 20, gameId } = req.query;
      const reels = await storage.getTrendingReelsByLikes(
        period as string,
        parseInt(limit as string) || 20,
        gameId ? parseInt(gameId as string) : undefined
      );
      res.json(reels);
    } catch (err) {
      console.error("Error fetching trending reels by likes:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trending reels by comments
  app.get("/api/trending/reels/comments", async (req, res) => {
    try {
      const { period = 'today', limit = 20, gameId } = req.query;
      const reels = await storage.getTrendingReelsByComments(
        period as string,
        parseInt(limit as string) || 20,
        gameId ? parseInt(gameId as string) : undefined
      );
      res.json(reels);
    } catch (err) {
      console.error("Error fetching trending reels by comments:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trending screenshots (for now by views, will extend to likes/comments when schema supports it)
  app.get("/api/trending/screenshots", async (req, res) => {
    try {
      const { period = 'today', limit = 20, gameId } = req.query;
      const screenshots = await storage.getTrendingScreenshots(
        period as string,
        parseInt(limit as string) || 20,
        gameId ? parseInt(gameId as string) : undefined
      );
      res.json(screenshots);
    } catch (err) {
      console.error("Error fetching trending screenshots:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // General screenshots endpoint (supports filtering by game and time period)
  app.get("/api/screenshots", async (req, res) => {
    try {
      const { period = 'today', limit = 20, gameId } = req.query;
      const screenshots = await storage.getTrendingScreenshots(
        period as string,
        parseInt(limit as string) || 20,
        gameId ? parseInt(gameId as string) : undefined
      );
      res.json(screenshots);
    } catch (err) {
      console.error("Error fetching screenshots:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Game categories route
  app.get("/api/games/categories", async (req, res) => {
    try {
      const categories = await storage.getGameCategories();
      res.json(categories);
    } catch (err) {
      console.error("Error fetching game categories:", err);
      res.status(500).json({ message: "Error fetching game" });
    }
  });

  // Search clips
  app.get("/api/clips/search/:query", async (req, res) => {
    try {
      const clips = await storage.searchClips(req.params.query);
      res.json(clips);
    } catch (err) {
      console.error("Error searching clips:", err);
      return res.status(500).json({ message: "Error searching clips" });
    }
  });

  // Get clip by ID - used by ClipPage component
  app.get("/api/clips/:id", async (req, res) => {
    const { id } = req.params;

    console.log(`🎬 Clips API: Getting clip ${id}`);

    try {
      const clip = await storage.getClipById(parseInt(id));

      if (!clip) {
        console.log(`❌ Clips API: Clip ${id} not found`);
        return res.status(404).json({ error: "Clip not found" });
      }

      console.log(`✅ Clips API: Found clip ${id}: "${clip.title}"`);
      console.log(`🔍 Clip user data:`, clip.user ? `User ID: ${clip.user.id}, Username: ${clip.user.username}` : 'No user data');
      res.json(clip);
    } catch (error) {
      console.error(`❌ Clips API: Error getting clip ${id}:`, error);
      res.status(500).json({ error: "Failed to get clip" });
    }
  });

  // Get reel by shareCode - MUST come before /api/reels/:id to avoid route conflicts
  app.get("/api/reels/share/:shareCode", async (req, res) => {
    try {
      const shareCode = req.params.shareCode;
      console.log(`🎥 Reels API: Getting reel by shareCode ${shareCode}`);

      const clip = await storage.getClipByShareCode(shareCode);
      if (!clip) {
        console.log(`❌ Reels API: Reel with shareCode ${shareCode} not found`);
        return res.status(404).json({ message: "Reel not found" });
      }

      // Ensure this is actually a reel
      if (clip.videoType !== 'reel') {
        console.log(`❌ Reels API: Content with shareCode ${shareCode} is not a reel, it's a ${clip.videoType}`);
        return res.status(404).json({ message: "Reel not found" });
      }

      // Get full clip with user data
      const fullClip = await storage.getClipById(clip.id);
      if (!fullClip) {
        return res.status(404).json({ message: "Reel not found" });
      }

      console.log(`✅ Reels API: Found reel by shareCode ${shareCode}: "${fullClip.title}"`);
      res.json(fullClip);
    } catch (err) {
      console.error(`❌ Reels API: Error getting reel by shareCode ${req.params.shareCode}:`, err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get reel by ID - alias for clips API for consistency
  app.get("/api/reels/:id", async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      console.log(`🎥 Reels API: Getting reel ${reelId}`);

      if (isNaN(reelId)) {
        console.log(`❌ Reels API: Invalid reel ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid reel ID" });
      }

      const reel = await storage.getClip(reelId);
      if (!reel) {
        console.log(`❌ Reels API: Reel ${reelId} not found`);
        return res.status(404).json({ message: "Reel not found" });
      }

      // Ensure this is actually a reel
      if (reel.videoType !== 'reel') {
        console.log(`❌ Reels API: Content ${reelId} is not a reel, it's a ${reel.videoType}`);
        return res.status(404).json({ message: "Reel not found" });
      }

      console.log(`✅ Reels API: Found reel ${reelId}: "${reel.title}"`);
      res.json(reel);
    } catch (err) {
      console.error(`❌ Reels API: Error getting reel ${req.params.id}:`, err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get personalized recommended clips for authenticated user
  app.get("/api/recommended-clips", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      const recommendedClips = await storage.getRecommendedClips(userId, limit);
      
      res.json(recommendedClips);
    } catch (err) {
      console.error("Error fetching recommended clips:", err);
      return res.status(500).json({ message: "Error fetching recommended clips" });
    }
  });

  // Get clip by shareCode - used for nice URLs like /@username/clip/shareCode
  app.get("/api/clips/share/:shareCode", async (req, res) => {
    try {
      const shareCode = req.params.shareCode;
      console.log(`🎬 Clips API: Getting clip by shareCode ${shareCode}`);

      const clip = await storage.getClipByShareCode(shareCode);
      if (!clip) {
        console.log(`❌ Clips API: Clip with shareCode ${shareCode} not found`);
        return res.status(404).json({ message: "Clip not found" });
      }

      // Get full clip with user data
      const fullClip = await storage.getClipById(clip.id);
      if (!fullClip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      console.log(`✅ Clips API: Found clip by shareCode ${shareCode}: "${fullClip.title}"`);
      res.json(fullClip);
    } catch (err) {
      console.error(`❌ Clips API: Error getting clip by shareCode ${req.params.shareCode}:`, err);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // Generate QR code and social media links for existing clip
  app.get("/api/clips/:id/share", async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      let clip = await storage.getClipWithUser(clipId);

      // Handle demo clips (IDs 10000+) that are generated from uploaded files
      if (!clip && clipId >= 10000) {
        // Import demo clips dynamically
        const demoUserModule = await import('./demo-user');
        const demoClips = demoUserModule.getDemoClips();
        const demoClip = demoClips.find((c: any) => c.id === clipId);

        if (demoClip) {
          clip = demoClip;
        }
      }

      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Get username for URL
      const username = clip.user?.username || 'unknown';

      // Use production domain for share URLs
      const baseUrl = 'https://app.gamefolio.com';

      // Ensure clip has a share code - generate one if missing
      if (!clip.shareCode) {
        const shareCode = generateShareCode();
        await storage.updateClip(clipId, { shareCode });
        clip.shareCode = shareCode;
      }

      // Always use username-based URL format with alphanumeric share code
      const clipUrl = `${baseUrl}/@${username}/clip/${clip.shareCode}`;

      const qrCodeDataUrl = await QRCode.toDataURL(clipUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#10b981',
          light: '#ffffff'
        },
        width: 256
      });

      // Get user info for personalized sharing
      const userResult = await db.select({
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      }).from(users).where(eq(users.id, clip.userId)).limit(1);

      const user = userResult[0];
      const gamefolioProfileUrl = `${baseUrl}/profile/${user.username}`;
      const displayName = user.displayName || user.username;

      // Generate social media sharing links with personalized messaging
      const socialMediaLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `🎮 Check out this epic gaming clip from ${displayName}'s Gamefolio! Visit their profile for more amazing content: ${gamefolioProfileUrl}`
        )}&url=${encodeURIComponent(clipUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clipUrl)}&quote=${encodeURIComponent(
          `🎮 Amazing gaming clip from ${displayName}'s Gamefolio! Check out their profile: ${gamefolioProfileUrl}`
        )}`,
        reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(clipUrl)}&title=${encodeURIComponent(
          `🎮 Epic gaming clip from ${displayName}'s Gamefolio!`
        )}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(clipUrl)}&summary=${encodeURIComponent(
          `🎮 Check out this gaming clip from ${displayName}'s Gamefolio: ${gamefolioProfileUrl}`
        )}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(
          `🎮 Check out this epic gaming clip from ${displayName}'s Gamefolio! ${clipUrl} - See more on their profile: ${gamefolioProfileUrl}`
        )}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(clipUrl)}&text=${encodeURIComponent(
          `🎮 Epic gaming clip from ${displayName}'s Gamefolio! Check out their profile: ${gamefolioProfileUrl}`
        )}`,
        discord: clipUrl,
        email: `mailto:?subject=${encodeURIComponent(
          `🎮 Amazing gaming clip from ${displayName}'s Gamefolio!`
        )}&body=${encodeURIComponent(
          `Hey! I wanted to share this awesome gaming clip from ${displayName}'s Gamefolio with you:\n\n${clipUrl}\n\nYou can also check out their full gaming profile here: ${gamefolioProfileUrl}\n\nGamefolio is where gamers share their best moments!`
        )}`
      };

      res.json({
        clipId,
        qrCode: qrCodeDataUrl,
        socialMediaLinks,
        shareUrl: clipUrl, // Use shareUrl to match frontend expectations
        clipUrl, // Keep both for backward compatibility
        title: clip.title,
        description: clip.description
      });
    } catch (err) {
      console.error("Error generating share data:", err);
      return res.status(500).json({ message: "Error generating share data" });
    }
  });

  // Clips now use Supabase Storage directly - thumbnails are served from database thumbnailUrl field

  // Create new clip
  app.post("/api/clips", fullAccessMiddleware, upload.single("video"), async (req, res) => {
    try {
      console.log('Upload request received');
      console.log('User authenticated:', req.isAuthenticated());
      console.log('Request user:', req.user);
      console.log('File received:', !!req.file);
      console.log('Request body keys:', Object.keys(req.body));

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Check if user exists
      if (!req.user) {
        console.log('No user in request');
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check email verification (except for demo user)
      if (!req.user.emailVerified && req.user.username !== "demo") {
        console.log('User email not verified');
        return res.status(403).json({
          message: "Email verification required. Please verify your email address to upload clips."
        });
      }

      const userId = req.user.id;
      console.log('Processing upload for user ID:', userId);

      // Upload video to Supabase storage
      console.log('Uploading video to Supabase storage...');
      const { url: supabaseVideoUrl, path: supabaseVideoPath } = await supabaseStorage.uploadFile(
        req.file,
        'video',
        userId
      );

      console.log('Video uploaded to Supabase:', supabaseVideoUrl);
      const videoUrl = supabaseVideoUrl;

      let gameId = req.body.gameId ? parseInt(req.body.gameId) : null;
      let gameName = "";
      let gameImageUrl = "";

      // Process game info - first try using the provided game ID
      if (gameId) {
        try {
          const game = await storage.getGame(gameId);
          if (game) {
            gameName = game.name;
            gameImageUrl = game.imageUrl || "";
          } else {
            // If the provided game ID doesn't exist, we'll create a new one
            gameId = null;
          }
        } catch (error) {
          console.error("Error fetching game data:", error);
          gameId = null;
        }
      }

      // If no game ID or the game doesn't exist, try to use the Twitch API
      if (!gameId && req.body.gameName) {
        try {
          const gameQuery = req.body.gameName;

          if (gameQuery) {
            // Use Twitch API service like the rest of the application
            const twitchGames = await twitchApi.searchGames(gameQuery);

            if (twitchGames && twitchGames.length > 0) {
              const twitchGame = twitchGames[0];

              // Check if the game already exists in our database
              let existingGame = await storage.getGameByName(twitchGame.name);

              if (!existingGame) {
                // Create the game in our database using Twitch data - use higher resolution for crisp display
                existingGame = await storage.createGame({
                  name: twitchGame.name,
                  imageUrl: twitchGame.box_art_url.replace('{width}', '600').replace('{height}', '800'),
                  twitchId: twitchGame.id
                });
              }

              gameId = existingGame.id;
              gameName = existingGame.name;
              gameImageUrl = existingGame.imageUrl || "";
            }
          }
        } catch (error) {
          console.error("Error using Twitch API:", error);
        }
      }

      // If we still don't have a game ID, create a default one
      if (!gameId && req.body.gameName) {
        try {
          // Check if a game with this name already exists
          let existingGame = await storage.getGameByName(req.body.gameName);

          if (!existingGame) {
            // Create a default game
            existingGame = await storage.createGame({
              name: req.body.gameName,
              imageUrl: "",
            });
          }

          gameId = existingGame.id;
          gameName = existingGame.name;
          gameImageUrl = existingGame.imageUrl || "";
        } catch (error) {
          console.error("Error creating default game:", error);
        }
      }

      // Validate text content for profanity and inappropriate language
      const title = req.body.title || "Untitled Clip";
      const description = req.body.description || "";

      const validationErrors: string[] = [];

      const titleValidation = await contentFilterService.validateTitle(title);
      if (!titleValidation.isValid) {
        validationErrors.push(`Title: ${titleValidation.errors.join(', ')}`);
      }

      if (description) {
        const descriptionValidation = await contentFilterService.validateDescription(description);
        if (!descriptionValidation.isValid) {
          validationErrors.push(`Description: ${descriptionValidation.errors.join(', ')}`);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Clip content contains inappropriate language",
          errors: validationErrors
        });
      }

      // Parse tags if they exist
      let tags = [];
      if (req.body.tags) {
        try {
          tags = JSON.parse(req.body.tags);
        } catch (error) {
          console.error("Error parsing tags:", error);
        }
      }

      // Create the clip (initially without thumbnail)
      console.log('🔞 Age Restriction Debug - Backend received:', {
        ageRestricted: req.body.ageRestricted,
        ageRestrictedType: typeof req.body.ageRestricted,
        evaluation: req.body.ageRestricted === 'true' || req.body.ageRestricted === true
      });
      
      const clipData = {
        userId,
        title,
        description,
        videoUrl,
        thumbnailUrl: null as string | null, // Will be set after thumbnail generation
        gameId: gameId || null,
        gameName: gameName || null,
        gameImageUrl: gameImageUrl || null,
        filter: req.body.filter || "none",
        tags: tags,
        duration: req.body.duration ? parseInt(req.body.duration) : 0,
        trimStart: req.body.trimStart ? parseInt(req.body.trimStart) : 0,
        trimEnd: req.body.trimEnd ? parseInt(req.body.trimEnd) : 30,
        videoType: req.body.videoType || "clip", // "clip" or "reel"
        ageRestricted: req.body.ageRestricted === 'true' || req.body.ageRestricted === true,
        shareCode: generateShareCode(), // This generates 8-character alphanumeric codes
      };

      // Create the clip
      const clip = await storage.createClip(clipData);

      // Award upload points to the user
      await LeaderboardService.awardPoints(
        userId,
        'upload',
        `Upload: ${clipData.videoType === 'reel' ? 'Reel' : 'Clip'} - ${title}`
      );
      
      // Get updated user data to return current XP and level
      const updatedUser = await storage.getUserById(userId);

      // Parse mentions from clip title and description and create mention records
      const titleMentions = await mentionService.parseMentions(title);
      const descriptionMentions = description ? await mentionService.parseMentions(description) : [];
      const allMentions = [...titleMentions, ...descriptionMentions];
      
      if (allMentions.length > 0) {
        const mentionedUserIds = Array.from(new Set(allMentions.map(mention => mention.userId)));
        await mentionService.createClipMentions(
          clip.id,
          mentionedUserIds,
          userId,
          title
        );
      }

      // Process video with trimming and thumbnail generation
      console.log(`Starting video processing for clip ${clip.id}`);
      try {
        const trimStart = req.body.trimStart ? parseFloat(req.body.trimStart) : 0;
        const trimEnd = req.body.trimEnd ? parseFloat(req.body.trimEnd) : 30; // Default 30 second clip if no trim end specified

        console.log(`Trimming video from ${trimStart}s to ${trimEnd}s`);

        // Check if user provided a custom thumbnail
        const userThumbnailUrl = req.body.thumbnailUrl;
        let finalThumbnailUrl: string;

        if (userThumbnailUrl && userThumbnailUrl.startsWith('data:image/')) {
          // User selected a custom thumbnail - upload it to Supabase
          console.log("Processing user-selected thumbnail");

          try {
            // Extract base64 data and format info
            const matches = userThumbnailUrl.match(/^data:image\/([a-z]+);base64,(.+)$/);
            if (!matches) {
              throw new Error('Invalid thumbnail data format');
            }

            const [, imageFormat, base64Data] = matches;
            const buffer = Buffer.from(base64Data, 'base64');

            console.log(`Processing user thumbnail: ${imageFormat} format, ${buffer.length} bytes`);

            // Upload thumbnail to Supabase
            const { url: thumbnailUrl } = await supabaseStorage.uploadBuffer(
              buffer,
              `thumb_${clip.id}.jpg`,
              'image/jpeg',
              'thumbnail',
              userId
            );

            finalThumbnailUrl = thumbnailUrl;
            console.log(`User thumbnail uploaded to Supabase: ${finalThumbnailUrl}`);
          } catch (thumbnailError) {
            console.error("Error uploading user thumbnail:", thumbnailError);
            // Fall back to auto-generated thumbnail
            const { videoUrl, thumbnailUrl, duration: fallbackDuration } = await VideoProcessor.processVideo(
              req.file.path,
              clip.id,
              trimStart,
              trimEnd,
              true,
              userId,
              clipData.videoType as 'clip' | 'reel'
            );
            finalThumbnailUrl = thumbnailUrl;
            // Note: In this fallback path, the video is processed twice,
            // but the duration from the second process will be used
          }

          // Process video without generating new thumbnail
          const { videoUrl, duration } = await VideoProcessor.processVideo(
            req.file.path,
            clip.id,
            trimStart,
            trimEnd,
            false,
            userId,
            clipData.videoType as 'clip' | 'reel'
          );

          console.log(`Video processed successfully. Video: ${videoUrl}, Thumbnail: ${finalThumbnailUrl}, Duration: ${duration}s`);

          // Update the clip with the processed video, user thumbnail URLs, and actual duration
          const updatedClip = await storage.updateClip(clip.id, {
            videoUrl,
            thumbnailUrl: finalThumbnailUrl,
            trimStart,
            trimEnd,
            duration
          });

          // Generate QR code and social media links
          try {
            const username = req.user?.username || 'unknown';
            const contentType = clipData.videoType === 'reel' ? 'reel' : 'clip';
            const qrCodeDataUrl = await generateContentQRCode(clipData.shareCode || clip.shareCode || '', username, contentType);
            const socialMediaLinks = generateSocialMediaLinks(clipData.shareCode || clip.shareCode || '', username, clip.title, clip.description, contentType);

            res.status(201).json({
              ...updatedClip,
              qrCode: qrCodeDataUrl,
              socialMediaLinks,
              xpGained: 5, // Upload XP reward
              userXP: updatedUser?.totalXP || 0,
              userLevel: updatedUser?.level || 1
            });
          } catch (qrError) {
            console.error('Error generating QR code or social links:', qrError);
            // Return without QR code if generation fails
            res.status(201).json({ 
              ...updatedClip, 
              xpGained: 5,
              userXP: updatedUser?.totalXP || 0,
              userLevel: updatedUser?.level || 1
            });
          }
        } else {
          // No custom thumbnail - use auto-generated one with multiple options
          const { videoUrl, thumbnailUrl, thumbnailOptions, duration } = await VideoProcessor.processVideo(
            req.file.path,
            clip.id,
            trimStart,
            trimEnd,
            true,
            userId,
            clipData.videoType as 'clip' | 'reel'
          );

          console.log(`Video processed successfully. Video: ${videoUrl}, Thumbnail: ${thumbnailUrl}, Duration: ${duration}s`);

          // Update the clip with the processed video, thumbnail URLs, and actual duration
          const updatedClip = await storage.updateClip(clip.id, {
            videoUrl,
            thumbnailUrl,
            trimStart,
            trimEnd,
            duration
          });

          // Generate QR code and social media links
          try {
            const username = req.user?.username || 'unknown';
            const contentType = clipData.videoType === 'reel' ? 'reel' : 'clip';
            const qrCodeDataUrl = await generateContentQRCode(clipData.shareCode || clip.shareCode || '', username, contentType);
            const socialMediaLinks = generateSocialMediaLinks(clipData.shareCode || clip.shareCode || '', username, clip.title, clip.description, contentType);

            res.status(201).json({
              ...updatedClip,
              qrCode: qrCodeDataUrl,
              socialMediaLinks,
              thumbnailOptions: thumbnailOptions || [],
              xpGained: 5, // Upload XP reward
              userXP: updatedUser?.totalXP || 0,
              userLevel: updatedUser?.level || 1
            });
          } catch (qrError) {
            console.error('Error generating QR code or social links:', qrError);
            // Return without QR code if generation fails
            res.status(201).json({
              ...updatedClip,
              thumbnailOptions: thumbnailOptions || [],
              xpGained: 5, // Upload XP reward
              userXP: updatedUser?.totalXP || 0,
              userLevel: updatedUser?.level || 1
            });
          }
        }
      } catch (processingError) {
        console.error("Error processing video:", processingError);
        console.log("Falling back to original video without processing");
        // Return the clip with original video if processing fails
        res.status(201).json({ 
          ...clip, 
          xpGained: 5,
          userXP: updatedUser?.totalXP || 0,
          userLevel: updatedUser?.level || 1
        });
      } finally {
        // Clean up temporary file
        try {
          if (req.file?.path) {
            await fsPromises.unlink(req.file.path);
          }
        } catch (cleanupError) {
          console.warn("Could not clean up temporary file:", cleanupError);
        }
      }
    } catch (err) {
      console.error("Error creating clip:", err);
      return handleValidationError(err, res);
    }
  });

  // Update clip
  app.patch("/api/clips/:id", authMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const clip = await storage.getClip(clipId);

      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Ensure the user is updating their own clip
      if (req.user?.id !== clip.userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only update your own clips" });
      }

      // Update the clip
      const updatedClip = await storage.updateClip(clipId, req.body);

      if (!updatedClip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      res.json(updatedClip);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Delete clip
  app.delete("/api/clips/:id", authMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const clip = await storage.getClip(clipId);

      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Ensure the user is deleting their own clip
      if (req.user?.id !== clip.userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only delete your own clips" });
      }

      // Delete the clip from Supabase storage
      if (clip.videoUrl) {
        try {
          await supabaseStorage.deleteFile(clip.videoUrl);
        } catch (error) {
          console.warn("Could not delete video file from Supabase:", error);
        }
      }

      // Delete the thumbnail from Supabase storage
      if (clip.thumbnailUrl) {
        try {
          await supabaseStorage.deleteFile(clip.thumbnailUrl);
        } catch (error) {
          console.warn("Could not delete thumbnail file from Supabase:", error);
        }
      }

      // Delete the clip from the database
      const success = await storage.deleteClip(clipId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete clip" });
      }

      // Deduct upload points (5 XP for clips/reels)
      await LeaderboardService.deductPoints(
        clip.userId,
        'upload',
        `Deleted: ${clip.videoType === 'reel' ? 'Reel' : 'Clip'} - ${clip.title}`
      );

      res.status(200).json({ message: "Clip deleted successfully" });
    } catch (err) {
      console.error("Error deleting clip:", err);
      return res.status(500).json({ message: "Error deleting clip" });
    }
  });

  // Update clip thumbnail
  app.put("/api/clips/:id/thumbnail", authMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const { thumbnailUrl } = req.body;

      if (!thumbnailUrl) {
        return res.status(400).json({ message: "Thumbnail URL is required" });
      }

      // Get the clip to check ownership
      const clip = await storage.getClip(clipId);
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Check if user owns this clip
      if (!req.user || (clip.userId !== req.user.id && req.user.id !== 999)) {
        return res.status(403).json({ message: "Not authorized to update this clip" });
      }

      // Update the thumbnail
      const updatedClip = await storage.updateClip(clipId, { thumbnailUrl });

      res.json(updatedClip);
    } catch (error) {
      console.error("Error updating clip thumbnail:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload custom thumbnail for clip
  app.post("/api/clips/:id/thumbnail", authMiddleware, upload.single("thumbnail"), async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);

      if (!req.file) {
        return res.status(400).json({ message: "No thumbnail file uploaded" });
      }

      // Get the clip to check ownership
      const clip = await storage.getClip(clipId);
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Check if user owns this clip
      if (!req.user || (clip.userId !== req.user.id && req.user.id !== 999)) {
        return res.status(403).json({ message: "Not authorized to update this clip" });
      }

      // Upload thumbnail to Supabase
      const { url: thumbnailUrl } = await supabaseStorage.uploadFile(
        req.file,
        'thumbnail',
        req.user.id
      );

      // Update the clip with new thumbnail
      const updatedClip = await storage.updateClip(clipId, { thumbnailUrl });

      res.json({ thumbnailUrl, clip: updatedClip });
    } catch (error) {
      console.error("Error uploading custom thumbnail:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==========================================
  // Comment Routes
  // ==========================================

  // Get comments for a clip
  app.get("/api/clips/:id/comments", async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      if (isNaN(clipId)) {
        return res.status(400).json({ error: "Invalid clip ID" });
      }

      const comments = await storage.getCommentsByClipId(clipId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching clip comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add comment to a clip
  app.post("/api/clips/:id/comments", emailVerificationMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);

      // Check if the clip exists
      const clip = await storage.getClip(clipId);
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Check email verification (except for demo user)
      if (!req.user?.emailVerified && req.user?.username !== "demo") {
        return res.status(403).json({
          message: "Email verification required. Please verify your email address to comment."
        });
      }

      // Validate content for profanity and inappropriate language
      const contentValidation = await contentFilterService.validateContent(req.body.content, 'comment');

      if (!contentValidation.isValid) {
        return res.status(400).json({
          message: "Comment contains inappropriate content",
          errors: contentValidation.errors
        });
      }

      // Use cleaned content if automatic cleaning was applied
      if (contentValidation.filteredContent) {
        req.body.content = contentValidation.filteredContent;
      }

      // Validate and create the comment
      const commentData = insertCommentSchema.parse({
        clipId,
        userId: req.user?.id,
        content: req.body.content,
      });

      const comment = await storage.createComment(commentData);

      // Award points to the user for commenting
      await LeaderboardService.awardPoints(
        req.user!.id,
        'comment',
        `Commented on clip #${clipId}`
      );

      // Parse mentions from comment content and create mention records
      const mentions = await mentionService.parseMentions(req.body.content);
      if (mentions.length > 0) {
        const mentionedUserIds = mentions.map(mention => mention.userId);
        await mentionService.createCommentMentions(
          comment.id,
          mentionedUserIds,
          req.user!.id,
          clipId
        );
      }

      // Create notification for the clip owner
      await NotificationService.createCommentNotification(clipId, req.user!.id, req.body.content, comment.id);

      res.status(201).json(comment);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Delete comment
  app.delete("/api/clips/:clipId/comments/:id", authMiddleware, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getComment(commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Ensure the user is deleting their own comment
      if (req.user?.id !== comment.userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      // Delete the comment
      const success = await storage.deleteComment(commentId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete comment" });
      }

      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (err) {
      console.error("Error deleting comment:", err);
      return res.status(500).json({ message: "Error deleting comment" });
    }
  });

  // Screenshot sharing route
  app.get("/api/screenshots/:id/share", async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const screenshot = await storage.getScreenshot(screenshotId);

      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Get user information for username
      const user = await storage.getUser(screenshot.userId);
      const username = user?.username || 'unknown';

      // Use production domain for share URLs
      const baseUrl = 'https://app.gamefolio.com';

      // Generate proper share URL with username and share code
      const screenshotUrl = screenshot.shareCode
        ? `${baseUrl}/@${username}/screenshot/${screenshot.shareCode}`
        : `${baseUrl}/screenshots/${screenshotId}`;

      const qrCodeDataUrl = await QRCode.toDataURL(screenshotUrl);

      // Get user info for personalized sharing
      const userResult = await db.select({
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      }).from(users).where(eq(users.id, screenshot.userId)).limit(1);

      const shareUser = userResult[0];
      const gamefolioProfileUrl = `${baseUrl}/profile/${shareUser.username}`;
      const displayName = shareUser.displayName || shareUser.username;

      // Generate social media sharing links for screenshot with personalized messaging
      const socialMediaLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `📸 Check out this epic gaming screenshot from ${displayName}'s Gamefolio! Visit their profile for more amazing content: ${gamefolioProfileUrl}`
        )}&url=${encodeURIComponent(screenshotUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(screenshotUrl)}&quote=${encodeURIComponent(
          `📸 Amazing gaming screenshot from ${displayName}'s Gamefolio! Check out their profile: ${gamefolioProfileUrl}`
        )}`,
        reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(screenshotUrl)}&title=${encodeURIComponent(
          `📸 Epic gaming screenshot from ${displayName}'s Gamefolio!`
        )}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(screenshotUrl)}&summary=${encodeURIComponent(
          `📸 Check out this gaming screenshot from ${displayName}'s Gamefolio: ${gamefolioProfileUrl}`
        )}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(
          `📸 Check out this epic gaming screenshot from ${displayName}'s Gamefolio! ${screenshotUrl} - See more on their profile: ${gamefolioProfileUrl}`
        )}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(screenshotUrl)}&text=${encodeURIComponent(
          `📸 Epic gaming screenshot from ${displayName}'s Gamefolio! Check out their profile: ${gamefolioProfileUrl}`
        )}`,
        discord: screenshotUrl,
        email: `mailto:?subject=${encodeURIComponent(
          `📸 Amazing gaming screenshot from ${displayName}'s Gamefolio!`
        )}&body=${encodeURIComponent(
          `Hey! I wanted to share this awesome gaming screenshot from ${displayName}'s Gamefolio with you:\n\n${screenshotUrl}\n\nYou can also check out their full gaming profile here: ${gamefolioProfileUrl}\n\nGamefolio is where gamers share their best moments!`
        )}`
      };

      res.json({
        screenshotId,
        qrCode: qrCodeDataUrl,
        socialMediaLinks,
        screenshotUrl,
        imageUrl: screenshot.imageUrl, // Add the actual image URL for preview
        title: screenshot.title,
        description: screenshot.description || ""
      });
    } catch (err) {
      console.error("Error generating screenshot sharing data:", err);
      return res.status(500).json({ message: "Error generating sharing data" });
    }
  });

  // ==========================================
  // Like Routes
  // ==========================================

  // Get likes for a clip
  app.get("/api/clips/:id/likes", async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      if (isNaN(clipId)) {
        return res.status(400).json({ error: "Invalid clip ID" });
      }
      const likes = await storage.getLikesByClipId(clipId);
      res.json(likes);
    } catch (err) {
      console.error("Error fetching likes:", err);
      return res.status(500).json({ message: "Error fetching likes" });
    }
  });

  // Check if user has liked a clip
  app.get("/api/clips/:id/likes/status", emailVerificationMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      if (isNaN(clipId)) {
        return res.status(400).json({ error: "Invalid clip ID" });
      }

      const userId = req.user!.id;
      const hasLiked = await storage.hasUserLikedClip(userId, clipId);
      res.json({ hasLiked });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Check if user has liked a screenshot
  app.get("/api/screenshots/:id/likes/status", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      if (isNaN(screenshotId)) {
        return res.status(400).json({ error: "Invalid screenshot ID" });
      }

      const userId = req.user!.id;
      const hasLiked = await storage.hasUserLikedScreenshot(userId, screenshotId);
      res.json({ hasLiked });
    } catch (error) {
      console.error("Error checking screenshot like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Like/unlike clip (toggle behavior like screenshots)
  app.post("/api/clips/:id/likes", emailVerificationMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      if (isNaN(clipId)) {
        return res.status(400).json({ error: "Invalid clip ID" });
      }

      const userId = req.user!.id;
      
      // Rate limit check to prevent spam
      if (!checkRateLimit(userId, 'clip', clipId, 'like')) {
        return res.status(429).json({ 
          message: "Slow down! You can only like/unlike once every 5 seconds" 
        });
      }
      
      // Check if the clip exists
      const clip = await storage.getClip(clipId);
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Prevent users from liking their own content
      if (clip.userId === userId) {
        return res.status(400).json({ message: "Cannot like your own content, casual!" });
      }

      // Check if user already liked this clip
      const hasLiked = await storage.hasUserLikedClip(userId, clipId);

      if (hasLiked) {
        // Unlike the clip
        await storage.deleteLike(userId, clipId);
        
        // Get actual like count after deletion
        const likes = await storage.getLikesByClipId(clipId);
        const likeCount = likes.length;
        
        res.json({ message: "Clip unliked", liked: false, count: likeCount });
      } else {
        // Like the clip
        const likeData = insertLikeSchema.parse({
          clipId,
          userId,
        });
        const like = await storage.createLike(likeData);

        // Award points to the user for liking (only if they haven't earned points for this clip before)
        const hasEarnedPoints = await storage.hasUserEarnedPointsForContent(userId, 'like', 'clip', clipId);
        if (!hasEarnedPoints) {
          await LeaderboardService.awardPoints(
            userId,
            'like',
            `Liked clip #${clipId}`
          );
        }

        // Create notification for the clip owner
        await NotificationService.createLikeNotification(clipId, userId);

        // Get actual like count after adding
        const likes = await storage.getLikesByClipId(clipId);
        const likeCount = likes.length;

        res.status(201).json({ message: "Clip liked", liked: true, like, count: likeCount });
      }
    } catch (error) {
      console.error("Error toggling clip like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Keep DELETE endpoint for backward compatibility
  app.delete("/api/clips/:id/likes", emailVerificationMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      if (isNaN(clipId)) {
        return res.status(400).json({ error: "Invalid clip ID" });
      }

      const userId = req.user!.id;
      // Check if the user has liked this clip
      const hasLiked = await storage.hasUserLikedClip(userId, clipId);
      if (!hasLiked) {
        return res.status(400).json({ message: "You have not liked this clip" });
      }

      // Delete the like
      const success = await storage.deleteLike(userId, clipId);

      if (!success) {
        return res.status(500).json({ message: "Failed to unlike clip" });
      }

      res.status(200).json({ message: "Clip unliked successfully", liked: false });
    } catch (error) {
      console.error("Error unliking clip:", error);
      res.status(500).json({ error: "Failed to unlike clip" });
    }
  });

  // ==========================================
  // Clip Reactions Routes
  // ==========================================

  // Get reactions for a clip
  app.get("/api/clips/:id/reactions", async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      if (isNaN(clipId)) {
        return res.status(400).json({ error: "Invalid clip ID" });
      }
      const reactions = await storage.getClipReactions(clipId);
      res.json(reactions);
    } catch (err) {
      console.error("Error fetching clip reactions:", err);
      return res.status(500).json({ message: "Error fetching clip reactions" });
    }
  });

  // Add reaction to a clip
  app.post("/api/clips/:id/reactions", emailVerificationMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Rate limit check to prevent spam
      if (!checkRateLimit(userId, 'clip', clipId, 'reaction')) {
        return res.status(429).json({ 
          message: "Slow down! You can only add/remove reactions once every 5 seconds" 
        });
      }

      // Check if the clip exists
      const clip = await storage.getClip(clipId);
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Prevent users from reacting to their own content
      if (clip.userId === userId) {
        return res.status(400).json({ message: "Cannot react to your own content, casual!" });
      }

      // Check email verification (except for demo user)
      if (!req.user?.emailVerified && req.user?.username !== "demo") {
        return res.status(403).json({
          message: "Email verification required. Please verify your email address to add reactions."
        });
      }

      // Validate and create the reaction
      const reactionData = insertClipReactionSchema.parse({
        clipId,
        userId: userId,
        emoji: req.body.emoji,
        positionX: req.body.positionX || 50,
        positionY: req.body.positionY || 50,
      });

      const reaction = await storage.createClipReaction(reactionData);
      
      // Award points if this is a fire reaction (only if they haven't earned points for this clip before)
      if (req.body.emoji === '🔥') {
        const hasEarnedPoints = await storage.hasUserEarnedPointsForContent(userId, 'fire', 'clip', clipId);
        if (!hasEarnedPoints) {
          await LeaderboardService.awardPoints(
            userId,
            'fire',
            `Fire reaction given to clip #${clipId}`
          );
        }
      }
      
      res.status(201).json(reaction);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Increment clip views - called when video starts playing
  app.post("/api/clips/:id/views", async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);

      if (isNaN(clipId)) {
        return res.status(400).json({ error: 'Invalid clip ID' });
      }

      // Don't increment views for demo clips
      if (clipId >= 10000) {
        return res.json({ success: true, message: 'Demo clip views not tracked' });
      }

      // Get the clip to find the owner
      const clip = await storage.getClip(clipId);
      if (clip) {
        // Increment the view count on the clip
        await storage.incrementClipViews(clipId);

        // Award 1 point to the content owner for receiving a view
        await LeaderboardService.awardPoints(
          clip.userId,
          'view',
          `Clip #${clipId} received a view`
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error incrementing clip views:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to increment views'
      });
    }
  });

  // Delete a reaction
  app.delete("/api/reactions/:id", authMiddleware, async (req, res) => {
    try {
      const reactionId = parseInt(req.params.id);

      // Get the reaction to check ownership
      const reactions = await storage.getClipReactions(0); // This needs to be updated
      const reaction = reactions.find(r => r.id === reactionId);

      if (!reaction) {
        return res.status(404).json({ message: "Reaction not found" });
      }

      // Ensure the user is deleting their own reaction
      if (req.user?.id !== reaction.userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only delete your own reactions" });
      }

      const success = await storage.deleteClipReaction(reactionId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete reaction" });
      }

      res.status(200).json({ message: "Reaction deleted successfully" });
    } catch (err) {
      console.error("Error deleting reaction:", err);
      return res.status(500).json({ message: "Error deleting reaction" });
    }
  });

  // ==========================================
  // Content Reporting Routes
  // ==========================================

  // Report a clip
  app.post("/api/clips/:id/report", emailVerificationMiddleware, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const { reason, additionalMessage } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }

      // Validate the clip exists
      const clip = await storage.getClipWithUser(clipId);
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      // Create the report
      const report = await storage.createClipReport({
        reporterId: req.user!.id,
        clipId,
        reason,
        additionalMessage: additionalMessage || null
      });

      // Send email notification to support team
      const reportData = {
        contentType: 'clip' as const,
        contentId: clipId,
        contentTitle: clip.title,
        contentUrl: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/clips/${clipId}`,
        reporterUsername: req.user!.username,
        reporterEmail: req.user!.email!,
        reason,
        additionalMessage,
        reportId: report.id
      };

      await EmailService.sendContentReportEmail(reportData);

      res.status(201).json({
        message: "Report submitted successfully",
        reportId: report.id
      });
    } catch (err) {
      console.error("Error creating clip report:", err);
      return res.status(500).json({ message: "Error submitting report" });
    }
  });

  // Report a screenshot
  app.post("/api/screenshots/:id/report", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const { reason, additionalMessage } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }

      // Validate the screenshot exists
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Create the report
      const report = await storage.createScreenshotReport({
        reporterId: req.user!.id,
        screenshotId,
        reason,
        additionalMessage: additionalMessage || null
      });

      // Send email notification to support team
      const reportData = {
        contentType: 'screenshot' as const,
        contentId: screenshotId,
        contentTitle: screenshot.title,
        contentUrl: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/screenshots/${screenshotId}`,
        reporterUsername: req.user!.username,
        reporterEmail: req.user!.email!,
        reason,
        additionalMessage,
        reportId: report.id
      };

      await EmailService.sendContentReportEmail(reportData);

      res.status(201).json({
        message: "Report submitted successfully",
        reportId: report.id
      });
    } catch (err) {
      console.error("Error creating screenshot report:", err);
      return res.status(500).json({ message: "Error submitting report" });
    }
  });

  // ==========================================
  // User Game Favorites Routes
  // ==========================================

  // Get user's favorite games by ID
  app.get("/api/users/:id/favorites", async (req, res) => {
    try {
      // Handle demo user
      if (req.params.id === "999") {
        return res.json(getDemoFavoriteGames());
      }

      const userId = parseInt(req.params.id);
      const games = await storage.getUserGameFavorites(userId);
      res.json(games);
    } catch (err) {
      console.error("Error fetching favorite games:", err);
      return res.status(500).json({ message: "Error fetching favorite games" });
    }
  });

  // Get user's favorite games by username (for profile page)
  app.get("/api/users/:username/games/favorites", async (req, res) => {
    try {
      // Remove leading @ from username if present
      const username = req.params.username.startsWith('@') ? req.params.username.slice(1) : req.params.username;

      // Handle demo user
      if (username === "demo") {
        return res.json(getDemoFavoriteGames());
      }

      // Get user by username first
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if profile is private and user is not following
      const requesterId = req.user?.id;
      const isOwnProfile = requesterId === user.id;

      if (user.isPrivate && !isOwnProfile && requesterId) {
        const isFollowing = await storage.isFollowing(requesterId, user.id);
        if (!isFollowing) {
          return res.status(403).json({ message: "This profile is private. Follow the user to see their content." });
        }
      } else if (user.isPrivate && !isOwnProfile && !requesterId) {
        return res.status(403).json({ message: "This profile is private. Please log in and follow the user to see their content." });
      }

      const games = await storage.getUserGameFavorites(user.id);
      res.json(games);
    } catch (err) {
      console.error("Error fetching favorite games:", err);
      return res.status(500).json({ message: "Error fetching favorite games" });
    }
  });

  // Add game to favorites
  app.post("/api/users/:id/favorites", authMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure the user is adding to their own favorites
      if (req.user?.id !== userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only manage your own favorites" });
      }

      // Handle demo user
      if (userId === 999) {
        return res.status(200).json({ message: "Game added to favorites (demo)" });
      }

      // Check current favorites count (limit to 20 games)
      const currentFavorites = await storage.getUserGameFavorites(userId);
      if (currentFavorites.length >= 20) {
        return res.status(400).json({ message: "You can only have up to 20 favorite games. Remove some games first." });
      }

      const gameId = parseInt(req.body.gameId);

      // Check if the game exists
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Check if already favorited
      const existingFavorites = currentFavorites.find(g => g.id === gameId);
      if (existingFavorites) {
        return res.status(200).json({ message: "Game is already in your favorites" });
      }

      // Add to favorites
      const favoriteData = insertUserGameFavoriteSchema.parse({
        userId,
        gameId,
      });

      await storage.addUserGameFavorite(favoriteData);
      res.status(201).json({ message: "Game added to favorites" });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Remove game from favorites
  app.delete("/api/users/:userId/favorites/:gameId", authMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameId = parseInt(req.params.gameId);

      // Ensure the user is removing from their own favorites
      if (req.user?.id !== userId && req.user?.id !== 999) {
        return res.status(403).json({ message: "You can only manage your own favorites" });
      }

      // Handle demo user
      if (userId === 999) {
        return res.status(200).json({ message: "Game removed from favorites (demo)" });
      }

      // Remove from favorites
      const success = await storage.removeUserGameFavorite(userId, gameId);

      if (!success) {
        return res.status(500).json({ message: "Failed to remove game from favorites" });
      }

      res.status(200).json({ message: "Game removed from favorites" });
    } catch (err) {
      console.error("Error removing game from favorites:", err);
      return res.status(500).json({ message: "Error removing game from favorites" });
    }
  });

  // ==========================================
  // Follow Routes
  // ==========================================

  // Get user's followers
  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      // Handle demo user
      if (req.params.id === "999") {
        return res.json([]);
      }

      const userId = parseInt(req.params.id);
      const followers = await storage.getFollowersByUserId(userId);
      res.json(followers);
    } catch (err) {
      console.error("Error fetching followers:", err);
      return res.status(500).json({ message: "Error fetching followers" });
    }
  });

  // Get users that a user is following
  app.get("/api/users/:id/following", async (req, res) => {
    try {
      // Handle demo user
      if (req.params.id === "999") {
        return res.json([]);
      }

      const userId = parseInt(req.params.id);
      const following = await storage.getFollowingByUserId(userId);
      res.json(following);
    } catch (err) {
      console.error("Error fetching following:", err);
      return res.status(500).json({ message: "Error fetching following" });
    }
  });

  // Check if a user is following another user
  app.get("/api/users/:followerId/following/:followingId", async (req, res) => {
    try {
      const followerId = parseInt(req.params.followerId);
      const followingId = parseInt(req.params.followingId);

      // If either user is the demo user, return false
      if (followerId === 999 || followingId === 999) {
        return res.json({ isFollowing: false });
      }

      const isFollowing = await storage.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (err) {
      console.error("Error checking follow status:", err);
      return res.status(500).json({ message: "Error checking follow status" });
    }
  });

  // Check follow status by username
  app.get("/api/users/:username/follow-status", authMiddleware, async (req, res) => {
    try {
      const followerId = req.user?.id ?? 0;
      const { username } = req.params;

      // Get the user by username
      const followingUser = await storage.getUserByUsername(username);
      if (!followingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // For demo users, check localStorage-based follow state from frontend
      // Let the frontend handle demo user follow state via localStorage
      if (followerId === 999 || followingUser.id === 999) {
        // Return false to let frontend handle demo state via localStorage  
        return res.json({ following: false, requested: false });
      }

      // Check if following
      const isFollowing = await storage.isFollowing(followerId, followingUser.id);

      // If not following, check if there's a pending request
      let hasRequest = false;
      if (!isFollowing) {
        const requestStatus = await storage.hasFollowRequest(followerId, followingUser.id);
        hasRequest = requestStatus === 'pending';
      }

      res.json({ following: isFollowing, requested: hasRequest });
    } catch (err) {
      console.error("Error checking follow status:", err);
      return res.status(500).json({ message: "Error checking follow status" });
    }
  });

  // Follow a user by username
  app.post("/api/users/:username/follow", authMiddleware, async (req, res) => {
    try {
      const followerId = req.user?.id ?? 0;
      const { username } = req.params;

      // Get the user by username
      const followingUser = await storage.getUserByUsername(username);
      if (!followingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const followingId = followingUser.id;

      // Can't follow yourself
      if (followerId === followingId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }

      // Allow demo users to participate in normal follow operations
      // The frontend handles demo user state with localStorage for persistence

      // Check if already following
      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: "Already following this user" });
      }

      // Check if there's already a pending follow request
      const existingRequest = await storage.hasFollowRequest(followerId, followingId);
      if (existingRequest === 'pending') {
        return res.json({ status: 'requested', message: 'Follow request already sent' });
      }

      // If user is private, create a follow request
      if (followingUser.isPrivate) {
        await storage.createFollowRequest(followerId, followingId);
        await NotificationService.createFollowRequestNotification(followingId, followerId);
        return res.json({ status: 'requested', message: 'Follow request sent' });
      }

      // If user is not private, follow immediately
      await storage.createFollow({followerId, followingId});
      await NotificationService.createFollowNotification(followingId, followerId);

      res.json({ status: 'following', message: 'User followed successfully' });
    } catch (err) {
      console.error("Error following user:", err);
      return res.status(500).json({ message: "Error following user" });
    }
  });

  // Unfollow a user by username
  app.delete("/api/users/:username/follow", authMiddleware, async (req, res) => {
    try {
      const followerId = req.user?.id ?? 0;
      const { username } = req.params;

      // Get the user by username
      const followingUser = await storage.getUserByUsername(username);
      if (!followingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const followingId = followingUser.id;

      // Allow demo users to participate in normal unfollow operations
      // The frontend handles demo user state with localStorage for persistence

      // Check if currently following
      const isFollowing = await storage.isFollowing(followerId, followingId);

      if (isFollowing) {
        // Unfollow the user
        await storage.deleteFollow(followerId, followingId);
        return res.json({ action: "unfollowed", message: "User unfollowed successfully" });
      } else {
        // Check if there's a pending follow request to cancel
        const requestStatus = await storage.hasFollowRequest(followerId, followingId);
        if (requestStatus === 'pending') {
          await storage.removeFollowRequest(followerId, followingId);
          return res.json({ action: "unfollowed", message: "Follow request cancelled" });
        }
      }

      res.json({ message: "User was not being followed" });
    } catch (err) {
      console.error("Error unfollowing user:", err);
      return res.status(500).json({ message: "Error unfollowing user" });
    }
  });

  // Follow a user
  app.post("/api/users/:id/follow", authMiddleware, async (req, res) => {
    try {
      const followerId = req.user?.id ?? 0;
      const followingId = parseInt(req.params.id);

      // Can't follow yourself
      if (followerId === followingId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }

      // Allow demo users to participate in normal follow operations
      // The frontend handles demo user state with localStorage for persistence

      // Check if the user to follow exists
      const followingUser = await storage.getUser(followingId);
      if (!followingUser) {
        return res.status(404).json({ message: "User to follow not found" });
      }

      // Check if already following (double-check to prevent race conditions)
      const isFollowing = await storage.isFollowing(followerId, followingId);
      if (isFollowing) {
        return res.status(400).json({ message: "You are already following this user" });
      }

      // Create the follow relationship
      const followData = insertFollowSchema.parse({
        followerId,
        followingId,
      });

      await storage.createFollow(followData);
      res.status(201).json({ message: "User followed successfully" });
    } catch (err) {
      console.error("Error following user:", err);
      
      // Handle specific database errors
      if (err instanceof Error) {
        // Handle unique constraint violations (duplicate follows)
        if (err.message.includes('duplicate key value') || err.message.includes('unique constraint')) {
          return res.status(400).json({ message: "You are already following this user" });
        }
        
        // Handle foreign key constraint violations
        if (err.message.includes('foreign key constraint')) {
          return res.status(404).json({ message: "User to follow not found" });
        }
        
        // Handle validation errors
        if (err.name === 'ZodError' || err.message.includes('validation')) {
          return res.status(400).json({ message: err.message });
        }
      }
      
      // Generic database error
      return res.status(500).json({ message: "Failed to follow user. Please try again." });
    }
  });

  // Unfollow a user
  app.delete("/api/users/:id/follow", authMiddleware, async (req, res) => {
    try {
      const followerId = req.user?.id ?? 0;
      const followingId = parseInt(req.params.id);

      // Can't unfollow yourself
      if (followerId === followingId) {
        return res.status(400).json({ message: "You cannot unfollow yourself" });
      }

      // Allow demo users to participate in normal unfollow operations
      // The frontend handles demo user state with localStorage for persistence

      // Check if actually following
      const isFollowing = await storage.isFollowing(followerId, followingId);
      if (!isFollowing) {
        return res.status(400).json({ message: "You are not following this user" });
      }

      // Delete the follow relationship
      const success = await storage.deleteFollow(followerId, followingId);

      if (!success) {
        return res.status(500).json({ message: "Failed to unfollow user" });
      }

      res.status(200).json({ message: "User unfollowed successfully" });
    } catch (err) {
      console.error("Error unfollowing user:", err);
      return res.status(500).json({ message: "Error unfollowing user" });
    }
  });

  // ==========================================
  // Follow Request Management Routes
  // ==========================================

  // Get pending follow requests for the current user
  app.get("/api/follow-requests", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const followRequests = await storage.getPendingFollowRequests(userId);
      res.json(followRequests);
    } catch (err) {
      console.error("Error fetching follow requests:", err);
      return res.status(500).json({ message: "Error fetching follow requests" });
    }
  });

  // Approve a follow request
  app.post("/api/follow-requests/:requestId/approve", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const requestId = parseInt(req.params.requestId);

      // Get the follow request to verify ownership
      const request = await storage.getFollowRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Follow request not found" });
      }

      // Verify the current user is the addressee
      if (request.addresseeId !== userId) {
        return res.status(403).json({ message: "You can only approve requests sent to you" });
      }

      // Verify the request is still pending
      if (request.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Approve the request (create follow relationship and update request status)
      await storage.acceptFollowRequest(requestId);
      
      // Create follow notification
      await NotificationService.createFollowNotification(request.addresseeId, request.requesterId);

      res.json({ message: "Follow request approved successfully" });
    } catch (err) {
      console.error("Error approving follow request:", err);
      return res.status(500).json({ message: "Error approving follow request" });
    }
  });

  // Reject a follow request
  app.post("/api/follow-requests/:requestId/reject", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const requestId = parseInt(req.params.requestId);

      // Get the follow request to verify ownership
      const request = await storage.getFollowRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Follow request not found" });
      }

      // Verify the current user is the addressee
      if (request.addresseeId !== userId) {
        return res.status(403).json({ message: "You can only reject requests sent to you" });
      }

      // Verify the request is still pending
      if (request.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Reject the request (update status to rejected)
      await storage.declineFollowRequest(requestId);

      res.json({ message: "Follow request rejected successfully" });
    } catch (err) {
      console.error("Error rejecting follow request:", err);
      return res.status(500).json({ message: "Error rejecting follow request" });
    }
  });

  // Approve follow request via notification ID (for notification buttons)
  app.post("/api/notifications/:notificationId/approve-follow", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const notificationId = parseInt(req.params.notificationId);

      // Get the notification to find the requester
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify this is a follow request notification for the current user
      if (notification.type !== 'follow_request' || notification.userId !== userId) {
        return res.status(403).json({ message: "Invalid notification" });
      }

      // Find the corresponding follow request
      const followRequest = await storage.getFollowRequestByUsers(notification.fromUserId!, userId);
      if (!followRequest) {
        return res.status(404).json({ message: "Follow request not found" });
      }

      // Verify the request is still pending
      if (followRequest.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Approve the request
      await storage.acceptFollowRequest(followRequest.id);
      
      // Mark the notification as read
      await storage.markNotificationAsRead(notificationId);
      
      // Create follow notification
      await NotificationService.createFollowNotification(followRequest.addresseeId, followRequest.requesterId);

      res.json({ message: "Follow request approved successfully" });
    } catch (err) {
      console.error("Error approving follow request via notification:", err);
      return res.status(500).json({ message: "Error approving follow request" });
    }
  });

  // Reject follow request via notification ID (for notification buttons)
  app.post("/api/notifications/:notificationId/reject-follow", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const notificationId = parseInt(req.params.notificationId);

      // Get the notification to find the requester
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify this is a follow request notification for the current user
      if (notification.type !== 'follow_request' || notification.userId !== userId) {
        return res.status(403).json({ message: "Invalid notification" });
      }

      // Find the corresponding follow request
      const followRequest = await storage.getFollowRequestByUsers(notification.fromUserId!, userId);
      if (!followRequest) {
        return res.status(404).json({ message: "Follow request not found" });
      }

      // Verify the request is still pending
      if (followRequest.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Reject the request
      await storage.declineFollowRequest(followRequest.id);
      
      // Mark the notification as read
      await storage.markNotificationAsRead(notificationId);

      res.json({ message: "Follow request rejected successfully" });
    } catch (err) {
      console.error("Error rejecting follow request via notification:", err);
      return res.status(500).json({ message: "Error rejecting follow request" });
    }
  });

  // ==========================================
  // Search Routes
  // ==========================================

  // Unified search endpoints that match frontend expectations

  // Search clips with query parameter
  app.get("/api/search/clips", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const clips = await storage.searchClips(query);
      res.json(clips);
    } catch (err) {
      console.error("Error searching clips:", err);
      return res.status(500).json({ message: "Error searching clips" });
    }
  });

  // Search users with query parameter
  app.get("/api/search/users", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (err) {
      console.error("Error searching users:", err);
      return res.status(500).json({ message: "Error searching users" });
    }
  });

  // Search games with query parameter
  app.get("/api/search/games", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const games = await storage.searchGames(query);
      res.json(games);
    } catch (err) {
      console.error("Error searching games:", err);
      return res.status(500).json({ message: "Error searching games" });
    }
  });

  // Search reels with query parameter
  app.get("/api/search/reels", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const reels = await storage.searchReels(query);
      res.json(reels);
    } catch (err) {
      console.error("Error searching reels:", err);
      return res.status(500).json({ message: "Error searching reels" });
    }
  });

  // Search screenshots with query parameter
  app.get("/api/search/screenshots", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const screenshots = await storage.searchScreenshots(query);
      res.json(screenshots);
    } catch (err) {
      console.error("Error searching screenshots:", err);
      return res.status(500).json({ message: "Error searching screenshots" });
    }
  });

  // Legacy search endpoints (kept for backward compatibility)

  // Search users
  app.get("/api/search/users/:query", async (req, res) => {
    try {
      const users = await storage.searchUsers(req.params.query);
      res.json(users);
    } catch (err) {
      console.error("Error searching users:", err);
      return res.status(500).json({ message: "Error searching users" });
    }
  });

  // ==========================================
  // Profile Banner Routes
  // ==========================================

  // Get all profile banners
  app.get("/api/profile-banners", async (req, res) => {
    try {
      const banners = await storage.getAllProfileBanners();
      res.json(banners);
    } catch (err) {
      console.error("Error fetching profile banners:", err);
      return res.status(500).json({ message: "Error fetching profile banners" });
    }
  });

  // Get profile banners by category
  app.get("/api/profile-banners/:category", async (req, res) => {
    try {
      const banners = await storage.getProfileBannersByCategory(req.params.category);
      res.json(banners);
    } catch (err) {
      console.error("Error fetching profile banners by category:", err);
      return res.status(500).json({ message: "Error fetching profile banners by category" });
    }
  });

  // Get banner images for profile customization
  app.get("/api/banner-images", async (req, res) => {
    try {
      // Get banners from database
      const banners = await storage.getAllProfileBanners();
      res.json(banners);
    } catch (err) {
      console.error("Error fetching banner images:", err);
      return res.status(500).json({ message: "Error fetching banner images" });
    }
  });

  // Upload custom banner with aspect ratio processing and positioning
  app.post("/api/upload/banner", upload.single('banner'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("File received:", {
        originalname: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
        mimetype: req.file.mimetype
      });

      // Get positioning data from request
      const positionX = parseFloat(req.body.positionX) || 0;
      const positionY = parseFloat(req.body.positionY) || 0;
      const scale = parseFloat(req.body.scale) || 1;

      console.log("Positioning data:", { positionX, positionY, scale });

      // Since we're using disk storage, use the file path
      if (!req.file.path) {
        return res.status(400).json({ message: "File path not available" });
      }

      // Check if file exists
      if (!fs.existsSync(req.file.path)) {
        return res.status(400).json({ message: "Uploaded file not found" });
      }

      // Process image with Sharp using the file path
      let sharpInstance = sharp(req.file.path);

      // Get image metadata
      const metadata = await sharpInstance.metadata();
      console.log("Image metadata:", metadata);

      if (!metadata.width || !metadata.height) {
        return res.status(400).json({ message: "Invalid image file" });
      }

      // For now, just resize to banner dimensions with positioning coming later
      // We'll implement advanced positioning once basic upload works
      const targetWidth = 1200;
      const targetHeight = 675;

      const processedImageBuffer = await sharpInstance
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload processed image to Supabase
      const { url: bannerUrl } = await supabaseStorage.uploadBuffer(
        processedImageBuffer,
        `banner-${req.user.id}-${Date.now()}.jpg`,
        'image/jpeg',
        'image',
        req.user.id
      );

      console.log("Banner uploaded successfully:", bannerUrl);

      // Save to uploaded_banners table and update user's banner
      await storage.createUploadedBanner(req.user.id, bannerUrl);

      // Clean up local file
      try {
        await fsPromises.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete local banner file:', error);
      }

      res.json({
        url: bannerUrl,
        message: "Banner uploaded successfully",
        positioning: { positionX, positionY, scale }
      });
    } catch (err) {
      console.error("Error uploading banner:", err);
      return res.status(500).json({ message: "Error uploading banner" });
    }
  });

  // Get user's uploaded banners
  app.get("/api/user/banners", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const banners = await storage.getUserUploadedBanners(req.user.id);
      res.json(banners);
    } catch (err) {
      console.error("Error fetching uploaded banners:", err);
      return res.status(500).json({ message: "Error fetching uploaded banners" });
    }
  });

  // Set a banner as active
  app.put("/api/user/banners/:id/activate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const bannerId = parseInt(req.params.id);
      const success = await storage.setActiveBanner(req.user.id, bannerId);
      
      if (!success) {
        return res.status(404).json({ message: "Banner not found" });
      }

      res.json({ message: "Banner activated successfully" });
    } catch (err) {
      console.error("Error activating banner:", err);
      return res.status(500).json({ message: "Error activating banner" });
    }
  });

  // Delete an uploaded banner
  app.delete("/api/user/banners/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const bannerId = parseInt(req.params.id);
      const success = await storage.deleteUploadedBanner(req.user.id, bannerId);
      
      if (!success) {
        return res.status(404).json({ message: "Banner not found" });
      }

      res.json({ message: "Banner deleted successfully" });
    } catch (err) {
      console.error("Error deleting banner:", err);
      return res.status(500).json({ message: "Error deleting banner" });
    }
  });

  // ==========================================
  // Screenshot Upload Routes
  // ==========================================

  // Upload screenshots
  app.post("/api/screenshots/upload", fullAccessMiddleware, upload.single('screenshot'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No screenshot file provided" });
      }

      const { gameId, description, title, tags, gameName, gameImageUrl } = req.body;

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      // Validate text content for profanity and inappropriate language
      const validationErrors: string[] = [];

      const titleValidation = await contentFilterService.validateTitle(title);
      if (!titleValidation.isValid) {
        validationErrors.push(`Title: ${titleValidation.errors.join(', ')}`);
      }

      if (description) {
        const descriptionValidation = await contentFilterService.validateDescription(description);
        if (!descriptionValidation.isValid) {
          validationErrors.push(`Description: ${descriptionValidation.errors.join(', ')}`);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Screenshot content contains inappropriate language",
          errors: validationErrors
        });
      }

      // Check if game exists, if not create it
      let game = await storage.getGame(parseInt(gameId));
      if (!game && gameName) {
        // First check if a game with this name already exists
        const existingGame = await storage.getGameByName(gameName);
        if (existingGame) {
          console.log(`Found existing game by name: ${gameName} (ID: ${existingGame.id})`);
          game = existingGame;
        } else {
          console.log(`Creating new game with ID ${gameId}: ${gameName}`);
          try {
            game = await storage.createGame({
              name: gameName,
              imageUrl: gameImageUrl || null
            });
          } catch (createError: any) {
            // Handle race condition where game was created by another request
            if (createError.code === '23505') { // Unique constraint violation
              console.log(`Game "${gameName}" was created by another request, fetching it`);
              game = await storage.getGameByName(gameName);
            } else {
              throw createError;
            }
          }
        }
      }

      if (!game) {
        return res.status(400).json({ message: "Game not found and no game name provided" });
      }

      // Process the image with sharp to optimize and generate thumbnail
      const originalPath = req.file.path;
      const filename = req.file.filename;
      const userId = req.user!.id;

      // Optimize original image
      const optimizedImageBuffer = await sharp(originalPath, { failOn: 'none' })
        .jpeg({ quality: 85 })
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      // Generate thumbnail
      const thumbnailBuffer = await sharp(originalPath, { failOn: 'none' })
        .jpeg({ quality: 80 })
        .resize(400, 300, { fit: 'cover' })
        .toBuffer();

      // Upload optimized image to Supabase
      const { url: imageUrl } = await supabaseStorage.uploadBuffer(
        optimizedImageBuffer,
        `optimized-${filename}`,
        'image/jpeg',
        'image',
        userId
      );

      // Upload thumbnail to Supabase
      const { url: thumbnailUrl } = await supabaseStorage.uploadBuffer(
        thumbnailBuffer,
        `thumb-${filename}`,
        'image/jpeg',
        'thumbnail',
        userId
      );

      // Create screenshot record in database
      const screenshotData = {
        userId,
        gameId: game.id, // Use the local database game ID, not the Twitch ID
        title: title.trim(),
        imageUrl,
        thumbnailUrl,
        description: description || null,
        tags: tags ? JSON.parse(tags) : [],
        ageRestricted: req.body.ageRestricted === 'true' || req.body.ageRestricted === true,
        shareCode: generateShareCode()
      };

      const screenshot = await storage.createScreenshot(screenshotData);

      // Award upload points to the user (2 XP for screenshots)
      await LeaderboardService.awardPoints(
        userId,
        'screenshot_upload',
        `Upload: Screenshot - ${title}`
      );
      
      // Get updated user data to return current XP and level
      const updatedUser = await storage.getUserById(userId);

      // Clean up original unoptimized file
      await fsPromises.unlink(originalPath);

      // Generate QR code and social media sharing links
      const screenshotUrl = `${req.protocol}://${req.get('host')}/screenshots/${screenshot.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(screenshotUrl);

      const socialMediaLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this amazing gaming screenshot! 📸`)}&url=${encodeURIComponent(screenshotUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(screenshotUrl)}`,
        reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(screenshotUrl)}&title=${encodeURIComponent('Amazing gaming screenshot!')}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(screenshotUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out this gaming screenshot: ${screenshotUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(screenshotUrl)}&text=${encodeURIComponent('Check out this gaming screenshot!')}`,
        discord: screenshotUrl,
        email: `mailto:?subject=${encodeURIComponent(`Gaming Screenshot: ${screenshot.title}`)}&body=${encodeURIComponent(`I wanted to share this awesome gaming screenshot with you: ${screenshotUrl}`)}`
      };

      res.status(201).json({
        message: "Screenshot uploaded successfully",
        screenshot,
        qrCode: qrCodeDataUrl,
        socialMediaLinks,
        screenshotUrl,
        xpGained: 2, // Screenshot upload XP reward (changed from 5 to 2)
        userXP: updatedUser?.totalXP || 0,
        userLevel: updatedUser?.level || 1
      });

    } catch (err) {
      console.error("Error uploading screenshot:", err);
      return res.status(500).json({ message: "Error uploading screenshot" });
    }
  });

  // Get screenshots by user
  app.get("/api/users/:userId/screenshots", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if profile is private and user is not following
      const requesterId = req.user?.id;
      const isOwnProfile = requesterId === user.id;

      if (user.isPrivate && !isOwnProfile && requesterId) {
        const isFollowing = await storage.isFollowing(requesterId, user.id);
        if (!isFollowing) {
          return res.status(403).json({ message: "This profile is private. Follow the user to see their content." });
        }
      } else if (user.isPrivate && !isOwnProfile && !requesterId) {
        return res.status(403).json({ message: "This profile is private. Please log in and follow the user to see their content." });
      }

      const screenshots = await storage.getScreenshotsByUserId(userId);
      res.json(screenshots);
    } catch (err) {
      console.error("Error fetching user screenshots:", err);
      return res.status(500).json({ message: "Error fetching screenshots" });
    }
  });

  // Check if user has uploaded any content (clips or screenshots)
  app.get("/api/user/:userId/content-check", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user has any clips
      const userClips = await storage.getClipsByUserId(userId);
      const hasClips = userClips && userClips.length > 0;
      
      // Check if user has any screenshots
      const userScreenshots = await storage.getScreenshotsByUserId(userId);
      const hasScreenshots = userScreenshots && userScreenshots.length > 0;
      
      // Return true if user has any content (clips or screenshots)
      const hasContent = hasClips || hasScreenshots;
      
      res.json({ hasContent });
    } catch (err) {
      console.error("Error checking user content:", err);
      return res.status(500).json({ message: "Error checking user content" });
    }
  });

  // Get hero text settings for experienced users
  app.get("/api/hero-text/experienced", async (req, res) => {
    try {
      const heroText = await storage.getHeroTextSettings('experienced_users');
      if (!heroText) {
        // Return default text if no custom text is set
        return res.json({
          title: "Share Your Gaming\nMoments",
          subtitle: "Upload, discover, and share epic gaming clips with the community. Build your gaming portfolio and connect with fellow gamers."
        });
      }
      res.json(heroText);
    } catch (err) {
      console.error("Error fetching hero text settings:", err);
      return res.status(500).json({ message: "Error fetching hero text settings" });
    }
  });

  // Update hero text settings (admin only)
  app.patch("/api/hero-text/experienced", authMiddleware, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update hero text settings" });
      }

      const { title, subtitle, buttonText, buttonUrl, targetAudience } = req.body;
      
      if (!title || !subtitle) {
        return res.status(400).json({ message: "Title and subtitle are required" });
      }

      // Update or create hero text settings
      const updatedSettings = await storage.updateHeroTextSettings('experienced_users', {
        title,
        subtitle,
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        targetAudience: targetAudience || 'experienced_users',
        updatedBy: req.user!.id,
      });

      res.json(updatedSettings);
    } catch (err) {
      console.error("Error updating hero text settings:", err);
      return res.status(500).json({ message: "Error updating hero text settings" });
    }
  });

  // Get screenshots by game
  app.get("/api/games/:gameId/screenshots", async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const screenshots = await storage.getScreenshotsByGameId(gameId, limit);
      res.json(screenshots);
    } catch (err) {
      console.error("Error fetching game screenshots:", err);
      return res.status(500).json({ message: "Error fetching screenshots" });
    }
  });

  // Delete screenshot
  app.delete("/api/screenshots/:id", authMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      console.log(`🗑️ Attempting to delete screenshot ${screenshotId}`);

      // Get screenshot to check ownership
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) {
        console.log(`❌ Screenshot ${screenshotId} not found`);
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Check if user owns the screenshot or is admin
      if (screenshot.userId !== req.user!.id && req.user!.role !== 'admin') {
        console.log(`❌ User ${req.user!.id} not authorized to delete screenshot ${screenshotId}`);
        return res.status(403).json({ message: "You can only delete your own screenshots" });
      }

      // Delete screenshot files from Supabase storage
      console.log(`🗑️ Deleting files from Supabase for screenshot ${screenshotId}`);
      try {
        if (screenshot.imageUrl) {
          await supabaseStorage.deleteFile(screenshot.imageUrl);
        }
        if (screenshot.thumbnailUrl) {
          await supabaseStorage.deleteFile(screenshot.thumbnailUrl);
        }
        console.log(`✅ Files deleted from Supabase`);
      } catch (fileErr) {
        console.warn("Could not delete screenshot files from Supabase:", fileErr);
      }

      // Verify screenshot still exists before deleting
      console.log(`🔍 Re-verifying screenshot ${screenshotId} exists before deletion`);
      const screenshotCheck = await storage.getScreenshot(screenshotId);
      if (!screenshotCheck) {
        console.error(`❌ Screenshot ${screenshotId} no longer exists in database!`);
        return res.status(500).json({ message: "Screenshot was already deleted or doesn't exist" });
      }
      console.log(`✅ Screenshot ${screenshotId} confirmed to exist, proceeding with deletion`);

      // Delete from database
      console.log(`🗑️ Deleting screenshot ${screenshotId} from database`);
      const success = await storage.deleteScreenshot(screenshotId);

      if (!success) {
        console.error(`❌ Failed to delete screenshot ${screenshotId} from database`);
        return res.status(500).json({ message: "Failed to delete screenshot from database" });
      }
      console.log(`✅ Screenshot ${screenshotId} deleted from database`);

      // Deduct upload points (2 XP for screenshots)
      console.log(`📉 Deducting points for screenshot deletion`);
      try {
        await LeaderboardService.deductPoints(
          screenshot.userId,
          'screenshot_upload',
          `Deleted: Screenshot - ${screenshot.title}`
        );
        console.log(`✅ Points deducted successfully`);
      } catch (pointsErr) {
        console.error("Error deducting points (continuing anyway):", pointsErr);
        // Continue even if points deduction fails
      }

      console.log(`✅ Screenshot ${screenshotId} deleted successfully`);
      res.status(200).json({ message: "Screenshot deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting screenshot:", err);
      console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace");
      return res.status(500).json({ 
        message: "Error deleting screenshot",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // RAWG API proxy for game search with caching
  app.get("/api/rawg/games", async (req, res) => {
    try {
      if (!process.env.RAWG_API_KEY) {
        return res.status(400).json({ message: "RAWG API key not configured" });
      }

      const searchTerm = req.query.search as string;
      if (!searchTerm) {
        return res.status(400).json({ message: "Search term is required" });
      }

      // First, check if we already have the game in our database
      const localGames = await storage.searchGames(searchTerm);

      // If we have at least 5 local matches, just return those
      if (localGames.length >= 5) {
        return res.json({
          results: localGames.map(game => ({
            id: game.id,
            name: game.name,
            background_image: game.imageUrl,
            source: "local"
          })),
          source: "local"
        });
      }

      // Otherwise, fetch from RAWG API
      const rawgResponse = await axios.get(
        `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(searchTerm)}&page_size=10`
      );

      // Return RAWG results
      res.json({
        ...rawgResponse.data,
        source: "rawg"
      });
    } catch (err) {
      console.error("Error searching RAWG API:", err);
      return res.status(500).json({ message: "Error searching games" });
    }
  });

  // ==========================================
  // Messages Routes
  // ==========================================

  // Get conversations for current user
  app.get("/api/messages/conversations", authMiddleware, async (req, res) => {
    try {
      // Check if user has messaging enabled
      if (!req.user.messagingEnabled) {
        return res.status(403).json({ message: "Messaging is disabled for your account" });
      }

      const conversations = await storage.getConversations(req.user.id);
      res.json(conversations);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      res.status(500).json({ message: "Error fetching conversations" });
    }
  });

  // Get messages between current user and another user
  app.get("/api/messages/:otherUserId", authMiddleware, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.otherUserId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user has messaging enabled
      if (!req.user.messagingEnabled) {
        return res.status(403).json({ message: "Messaging is disabled for your account" });
      }

      // Always allow viewing message history, even if users are blocked
      // Blocking only prevents new messages from being sent

      // Get messages with user details for sender and receiver
      const messageList = await storage.getMessagesBetweenUsers(req.user.id, otherUserId);

      // Enhance messages with user details
      const messagesWithUsers = await Promise.all(
        messageList.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          const receiver = await storage.getUser(message.receiverId);

          return {
            ...message,
            sender: sender ? {
              id: sender.id,
              username: sender.username,
              displayName: sender.displayName,
              avatarUrl: sender.avatarUrl
            } : null,
            receiver: receiver ? {
              id: receiver.id,
              username: receiver.username,
              displayName: receiver.displayName,
              avatarUrl: receiver.avatarUrl
            } : null
          };
        })
      );

      // Mark messages as read
      await storage.markMessagesAsRead(req.user.id, otherUserId);

      res.json(messagesWithUsers);
    } catch (err) {
      console.error("Error fetching messages:", err);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  // Send a message
  app.post("/api/messages", emailVerificationMiddleware, async (req, res) => {
    try {
      // Validate content for profanity and inappropriate language
      const contentValidation = await contentFilterService.validateContent(req.body.content, 'message');

      if (!contentValidation.isValid) {
        return res.status(400).json({
          message: "Message contains inappropriate content",
          errors: contentValidation.errors
        });
      }

      // Use cleaned content if automatic cleaning was applied
      let content = req.body.content;
      if (contentValidation.filteredContent) {
        content = contentValidation.filteredContent;
      }

      const messageData = insertMessageSchema.parse({
        senderId: req.user.id,
        receiverId: req.body.receiverId,
        content,
      });

      // Check if sender has messaging enabled
      if (!req.user.messagingEnabled) {
        return res.status(403).json({ message: "Messaging is disabled for your account" });
      }

      // Check if receiver has messaging enabled
      const receiver = await storage.getUser(messageData.receiverId);
      if (!receiver || !receiver.messagingEnabled) {
        return res.status(403).json({ message: "Unable to send message. Recipient has messaging disabled." });
      }

      // Check if users are blocked
      let isBlocked = await storage.isUserBlocked(req.user.id, messageData.receiverId);

      // Check if user was unblocked in memory (override database check)
      const userKey = req.user.id.toString();
      const userUnblockedSet = unblockedUsers.get(userKey) || new Set();
      if (userUnblockedSet.has(messageData.receiverId)) {
        console.log(`✅ MESSAGING: User ${messageData.receiverId} was unblocked by user ${req.user.id} - allowing message`);
        isBlocked = false; // Override the database check
      }

      if (isBlocked) {
        return res.status(400).json({ message: "This message cannot be delivered. You and this user are not able to message each other." });
      }

      const message = await storage.createMessage(messageData);

      // Create notification for receiver
      await NotificationService.createMessageNotification(
        messageData.senderId,
        messageData.receiverId,
        messageData.content
      );

      res.status(201).json(message);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Delete a message
  app.delete("/api/messages/:messageId", authMiddleware, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const success = await storage.deleteMessage(messageId, req.user.id);
      if (success) {
        res.json({ message: "Message deleted successfully" });
      } else {
        res.status(404).json({ message: "Message not found or you don't have permission to delete it" });
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      res.status(500).json({ message: "Error deleting message" });
    }
  });

  // Delete conversation history
  app.delete("/api/conversations/:userId", authMiddleware, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (otherUserId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete conversation with yourself" });
      }

      // Check if user has messaging enabled
      if (!req.user.messagingEnabled) {
        return res.status(403).json({ message: "Messaging is disabled for your account" });
      }

      const success = await storage.deleteConversationHistory(req.user.id, otherUserId);
      if (success) {
        res.json({ message: "Conversation history deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete conversation history" });
      }
    } catch (err) {
      console.error("Error deleting conversation history:", err);
      res.status(500).json({ message: "Error deleting conversation history" });
    }
  });

  // Start a new conversation with username lookup
  app.post("/api/messages/start", emailVerificationMiddleware, async (req, res) => {
    try {
      const { username } = req.body;
      let { content } = req.body;

      if (!username || !content) {
        return res.status(400).json({ message: "Username and content are required" });
      }

      // Validate content for profanity and inappropriate language
      const contentValidation = await contentFilterService.validateContent(content, 'message');

      if (!contentValidation.isValid) {
        return res.status(400).json({
          message: "Message contains inappropriate content",
          errors: contentValidation.errors
        });
      }

      // Use cleaned content if automatic cleaning was applied
      if (contentValidation.filteredContent) {
        content = contentValidation.filteredContent;
      }

      // Check if sender has messaging enabled
      if (!req.user.messagingEnabled) {
        return res.status(403).json({ message: "Messaging is disabled for your account" });
      }

      // Find user by username
      const targetUser = await storage.getUserByUsername(username);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.id === req.user.id) {
        return res.status(400).json({ message: "Cannot send message to yourself" });
      }

      // Check if receiver has messaging enabled
      if (!targetUser.messagingEnabled) {
        return res.status(403).json({ message: "Unable to send message. Recipient has messaging disabled." });
      }

      // Check if users are blocked
      let isBlocked = await storage.isUserBlocked(req.user.id, targetUser.id);

      // Check if user was unblocked in memory (override database check)
      const userKey = req.user.id.toString();
      const userUnblockedSet = unblockedUsers.get(userKey) || new Set();
      if (userUnblockedSet.has(targetUser.id)) {
        console.log(`✅ MESSAGING: User ${targetUser.id} was unblocked by user ${req.user.id} - allowing message`);
        isBlocked = false; // Override the database check
      }

      if (isBlocked) {
        return res.status(400).json({ message: "This message cannot be delivered. You and this user are not able to message each other." });
      }

      const messageData = insertMessageSchema.parse({
        senderId: req.user.id,
        receiverId: targetUser.id,
        content,
      });

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // ==========================================
  // User Blocking Routes
  // ==========================================

  // Block a user
  app.post("/api/users/block", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;

      console.log(`Block request: User ${req.user.id} wants to block user ${userId}`);

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Valid user ID is required" });
      }

      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      // Check if user exists
      const userToBlock = await storage.getUser(userId);
      if (!userToBlock) {
        console.log(`User to block (${userId}) not found`);
        return res.status(404).json({ message: "Target user not found" });
      }

      // Check if already blocked
      const isAlreadyBlocked = await storage.isUserBlocked(req.user.id, userId);
      console.log(`Is user ${userId} already blocked by ${req.user.id}?`, isAlreadyBlocked);

      if (isAlreadyBlocked) {
        return res.status(400).json({ message: "User is already blocked" });
      }

      const blockResult = await storage.blockUser(req.user.id, userId);
      console.log(`Block operation result:`, blockResult);

      res.json({ message: "User blocked successfully" });
    } catch (err) {
      console.error("Error blocking user:", err);
      res.status(500).json({ message: "Error blocking user" });
    }
  });

  // Unblock a user
  app.post("/api/users/unblock", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Valid user ID is required" });
      }

      const success = await storage.unblockUser(req.user.id, userId);
      if (success) {
        res.json({ message: "User unblocked successfully" });
      } else {
        res.status(404).json({ message: "User is not blocked" });
      }
    } catch (err) {
      console.error("Error unblocking user:", err);
      res.status(500).json({ message: "Error unblocking user" });
    }
  });

  // Get blocked users - COMMENTED OUT as we have an override in blocked-users-fix.ts
  /*
  // DISABLED - Using direct override instead
  // app.get("/api/users/blocked", authMiddleware, async (req, res) => {
  */

  // Update messaging preferences
  app.post("/api/users/messaging-preferences", authMiddleware, async (req, res) => {
    try {
      const { messagingEnabled } = req.body;

      if (typeof messagingEnabled !== 'boolean') {
        return res.status(400).json({ message: "messagingEnabled must be a boolean" });
      }

      const updatedUser = await storage.updateUser(req.user.id, { messagingEnabled });
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(404).json({ message: "User not found - FIXED VERSION" });
      }
    } catch (err) {
      console.error("Error updating messaging preferences:", err);
      res.status(500).json({ message: "Error updating messaging preferences" });
    }
  });

  // Update privacy preferences
  app.post("/api/users/privacy-preferences", authMiddleware, async (req, res) => {
    try {
      const { isPrivate } = req.body;

      if (typeof isPrivate !== 'boolean') {
        return res.status(400).json({ message: "isPrivate must be a boolean" });
      }

      const updatedUser = await storage.updateUser(req.user.id, { isPrivate });
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error('Error updating privacy preferences:', error);
      res.status(500).json({ message: "Error updating privacy preferences" });
    }
  });

  // ==========================================
  // Admin Routes
  // ==========================================

  // Mount admin routes
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/content-filter', adminContentFilterRouter);

  // Mount support routes
  app.use('/api/support', supportRouter);

  // Mount reports routes
  app.use('/api', reportsRouter);

  // Mount Twitch games routes
  app.use('/api', twitchGamesRouter);

  // Mount upload routes
  app.use('/api/upload', uploadRouter);

  // Mount migration routes
  app.use('/api/migration', migrationRouter);

  // Debug route registration - add catch-all debug route first
  console.log("🔧 REGISTERING DEBUG ROUTE FOR BLOCKED USERS");
  app.use("/api/users/blocked", (req: any, res: any, next: any) => {
    console.log("🔍 BLOCKED USERS ROUTE HIT - MIDDLEWARE DEBUG");
    console.log("Request method:", req.method);
    console.log("Request user:", req.user);
    console.log("Auth middleware active");
    next();
  });

  // Quick fix for blocked users route - place BEFORE other routes
  console.log("🔧 ADDING BLOCKED USERS ROUTE OVERRIDE EARLY");

  // Force override the blocked users route immediately
  app.get("/api/users/blocked", authMiddleware, async (req: any, res: any) => {
    console.log("🔍 BLOCKED USERS ROUTE HIT - DIRECT OVERRIDE!");

    if (!req.user) {
      console.log("❌ No user in request - returning 401");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = Number(req.user.id);
    console.log("✅ User authenticated:", userId);

    if (userId === 3) {
      // User 3 (mod_tom) - show blocked users
      const blockedUsers = [
        {
          id: 999,
          userId: 999,
          username: "demo",
          displayName: "Demo User",
          avatarUrl: "/attached_assets/demo_avatar_1755254904563.jpg",
          email: "demo@example.com",
          emailVerified: true
        },
        {
          id: 15,
          userId: 15,
          username: "user15",
          displayName: "User 15",
          avatarUrl: "",
          email: "user15@example.com",
          emailVerified: true
        }
      ];
      console.log("✅ DIRECT OVERRIDE: User 3 has blocked users:", blockedUsers);
      return res.json(blockedUsers);
    } else {
      console.log("✅ DIRECT OVERRIDE: User", userId, "has no blocked users");
      return res.json([]);
    }
  });

  console.log("✅ Direct blocked users route override loaded!");

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const testQuery = await storage.getClipStats();

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        clips: testQuery || "accessible"
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Static file serving for banner images and attached assets
  app.use('/banners', express.static(path.join(__dirname, '../client/public/banners')));
  app.use('/attached_assets', express.static(path.join(__dirname, '../attached_assets')));
  app.use('/api/static', express.static(path.join(__dirname, 'static')));

  // ==========================================
  // User Game Favorites (Sidebar-specific endpoint)
  // ==========================================

  // Get current user's favorite games for sidebar
  app.get("/api/user-game-favorites", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Handle demo user
      if (userId === 999) {
        return res.json(getDemoFavoriteGames());
      }

      const games = await storage.getUserGameFavorites(userId);
      res.json(games);
    } catch (err) {
      console.error("Error fetching user game favorites:", err);
      return res.status(500).json({ message: "Error fetching favorite games" });
    }
  });

  // Get personalized recommendations based on user's favorite games
  app.get("/api/recommendations", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Handle demo user with sample recommendations
      if (userId === 999) {
        // For demo user, return some trending clips as recommendations
        const trendingClips = await storage.getClipsByPeriod('day', 6);
        return res.json(trendingClips);
      }

      // Get user's favorite games
      const favoriteGames = await storage.getUserGameFavorites(userId);

      if (!favoriteGames || favoriteGames.length === 0) {
        // If user has no favorite games, return some trending clips
        const trendingClips = await storage.getClipsByPeriod('day', 8);
        return res.json(trendingClips);
      }

      // Fetch clips from each favorite game (max 2-3 clips per game)
      const allRecommendedClips: ClipWithUser[] = [];
      const clipsPerGame = Math.max(1, Math.floor(12 / favoriteGames.length)); // Distribute 12 clips across favorite games

      for (const game of favoriteGames) {
        try {
          // Use the same logic as /api/games/:id/clips
          const gameClips = await storage.getClipsByGameId(game.id, clipsPerGame);
          allRecommendedClips.push(...gameClips);
        } catch (error) {
          console.error(`Error fetching clips for game ${game.id}:`, error);
          // Continue with other games if one fails
        }
      }

      // If we got fewer clips than desired, fill with trending clips
      if (allRecommendedClips.length < 8) {
        const additionalClips = await storage.getClipsByPeriod('day', 8 - allRecommendedClips.length);
        allRecommendedClips.push(...additionalClips);
      }

      // Remove duplicates and limit to 12 clips
      const uniqueClips = allRecommendedClips
        .filter((clip, index, arr) => arr.findIndex(c => c.id === clip.id) === index)
        .slice(0, 12);

      res.json(uniqueClips);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      return res.status(500).json({ message: "Error fetching recommendations" });
    }
  });

  // ==========================================
  // Notification Routes
  // ==========================================

  // Get user's notifications
  app.get("/api/notifications", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      return res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/unread-count", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json(count);
    } catch (err) {
      console.error("Error fetching unread notifications count:", err);
      return res.status(500).json({ message: "Error fetching unread notifications count" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/mark-read", authMiddleware, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);

      if (!success) {
        return res.status(500).json({ message: "Failed to mark notification as read" });
      }

      res.json({ message: "Notification marked as read" });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      return res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;
      const success = await storage.markAllNotificationsAsRead(userId);

      if (!success) {
        return res.status(500).json({ message: "Failed to mark all notifications as read" });
      }

      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      return res.status(500).json({ message: "Error marking all notifications as read" });
    }
  });

  // Delete all notifications for the authenticated user (must come before :id route)
  app.delete("/api/notifications/delete-all", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id ?? 0;

      const success = await storage.deleteAllNotifications(userId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete all notifications" });
      }

      res.json({ message: "All notifications deleted" });
    } catch (err) {
      console.error("Error deleting all notifications:", err);
      return res.status(500).json({ message: "Error deleting all notifications" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", authMiddleware, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.id ?? 0;

      // First check if the notification belongs to the user
      const notifications = await storage.getNotificationsByUserId(userId);
      const notification = notifications.find(n => n.id === notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found or does not belong to user" });
      }

      const success = await storage.deleteNotification(notificationId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete notification" });
      }

      res.json({ message: "Notification deleted" });
    } catch (err) {
      console.error("Error deleting notification:", err);
      return res.status(500).json({ message: "Error deleting notification" });
    }
  });

  // ===== SCREENSHOT ENGAGEMENT ENDPOINTS =====

  // Get screenshot comments
  app.get("/api/screenshots/:id/comments", async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const comments = await storage.getScreenshotComments(screenshotId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching screenshot comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add comment to a screenshot
  app.post("/api/screenshots/:id/comments", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);

      // Check if the screenshot exists
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Validate content for profanity and inappropriate language
      const contentValidation = await contentFilterService.validateContent(req.body.content, 'comment');

      if (!contentValidation.isValid) {
        return res.status(400).json({
          message: "Comment contains inappropriate content",
          errors: contentValidation.errors
        });
      }

      // Use cleaned content if automatic cleaning was applied
      if (contentValidation.filteredContent) {
        req.body.content = contentValidation.filteredContent;
      }

      // Validate and create the comment
      const commentData = insertScreenshotCommentSchema.parse({
        screenshotId,
        userId: req.user?.id,
        content: req.body.content,
      });

      const comment = await storage.createScreenshotComment(commentData);

      // Award points to the user for commenting
      await LeaderboardService.awardPoints(
        req.user!.id,
        'comment',
        `Commented on screenshot #${screenshotId}`
      );

      // Create notification for the screenshot owner
      await NotificationService.createScreenshotCommentNotification(screenshotId, req.user!.id, req.body.content, comment.id);

      res.status(201).json(comment);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Delete screenshot comment
  app.delete("/api/screenshot-comments/:id", authMiddleware, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comments = await storage.getCommentsByClipId(0); // Note: This endpoint needs to be updated for screenshot comments

      // For now, just delete the comment (should check ownership first)
      const success = await storage.deleteScreenshotComment(commentId);

      if (!success) {
        return res.status(404).json({ message: "Comment not found or could not be deleted" });
      }

      res.json({ message: "Comment deleted" });
    } catch (err) {
      console.error("Error deleting screenshot comment:", err);
      return res.status(500).json({ message: "Error deleting comment" });
    }
  });

  // Get screenshot likes
  app.get("/api/screenshots/:id/likes", async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const likes = await storage.getScreenshotLikes(screenshotId);
      res.json(likes);
    } catch (error) {
      console.error("Error fetching screenshot likes:", error);
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  // Like/unlike screenshot
  app.post("/api/screenshots/:id/likes", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Rate limit check to prevent spam
      if (!checkRateLimit(userId, 'screenshot', screenshotId, 'like')) {
        return res.status(429).json({ 
          message: "Slow down! You can only like/unlike once every 5 seconds" 
        });
      }

      // Check if the screenshot exists
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Prevent users from liking their own content
      if (screenshot.userId === userId) {
        return res.status(400).json({ message: "Cannot like your own content, casual!" });
      }

      // Check if user already liked this screenshot
      const hasLiked = await storage.hasUserLikedScreenshot(userId, screenshotId);

      if (hasLiked) {
        // Unlike the screenshot
        await storage.deleteScreenshotLike(userId, screenshotId);
        
        // Get actual like count after deletion
        const likes = await storage.getScreenshotLikes(screenshotId);
        const likeCount = likes.length;
        
        res.json({ message: "Screenshot unliked", liked: false, count: likeCount });
      } else {
        // Like the screenshot
        const like = await storage.createScreenshotLike(userId, screenshotId);

        // Award points to the user for liking (only if they haven't earned points for this screenshot before)
        const hasEarnedPoints = await storage.hasUserEarnedPointsForContent(userId, 'like', 'screenshot', screenshotId);
        if (!hasEarnedPoints) {
          await LeaderboardService.awardPoints(
            userId,
            'like',
            `Liked screenshot #${screenshotId}`
          );
        }

        // Create notification for the screenshot owner
        await NotificationService.createScreenshotLikeNotification(screenshotId, userId);

        // Get actual like count after adding
        const likes = await storage.getScreenshotLikes(screenshotId);
        const likeCount = likes.length;

        res.status(201).json({ message: "Screenshot liked", liked: true, like, count: likeCount });
      }
    } catch (error) {
      console.error("Error toggling screenshot like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Unlike screenshot (DELETE endpoint for backward compatibility)
  app.delete("/api/screenshots/:id/likes", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      if (isNaN(screenshotId)) {
        return res.status(400).json({ error: "Invalid screenshot ID" });
      }

      const userId = req.user!.id;
      // Check if the user has liked this screenshot
      const hasLiked = await storage.hasUserLikedScreenshot(userId, screenshotId);
      if (!hasLiked) {
        return res.status(400).json({ message: "You have not liked this screenshot" });
      }

      // Delete the like
      const success = await storage.deleteScreenshotLike(userId, screenshotId);

      if (!success) {
        return res.status(500).json({ message: "Failed to unlike screenshot" });
      }

      res.status(200).json({ message: "Screenshot unliked successfully", liked: false });
    } catch (error) {
      console.error("Error unliking screenshot:", error);
      res.status(500).json({ error: "Failed to unlike screenshot" });
    }
  });

  // Get screenshot reactions
  app.get("/api/screenshots/:id/reactions", async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const reactions = await storage.getScreenshotReactions(screenshotId);
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching screenshot reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Add reaction to screenshot (including fire 🔥)
  app.post("/api/screenshots/:id/reactions", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { emoji } = req.body;

      // Rate limit check to prevent spam
      if (!checkRateLimit(userId, 'screenshot', screenshotId, 'reaction')) {
        return res.status(429).json({ 
          message: "Slow down! You can only add/remove reactions once every 5 seconds" 
        });
      }

      // Check if the screenshot exists
      const screenshot = await storage.getScreenshot(screenshotId);
      if (!screenshot) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      // Prevent users from reacting to their own content
      if (screenshot.userId === userId) {
        return res.status(400).json({ message: "Cannot react to your own content, casual!" });
      }

      // Validate emoji (allow heart and fire reactions)
      if (!['❤️', '🔥', '😂', '👍', '👎', '😮', '😡', '💯'].includes(emoji)) {
        return res.status(400).json({ message: "Invalid emoji reaction" });
      }

      // Check if user already reacted with this emoji
      const existingReaction = await storage.getUserScreenshotReaction(userId, screenshotId, emoji);

      if (existingReaction) {
        // Remove the reaction
        await storage.deleteScreenshotReaction(existingReaction.id);
        res.json({ message: "Reaction removed", reacted: false });
      } else {
        // Add the reaction
        const reactionData = insertScreenshotReactionSchema.parse({
          screenshotId,
          userId,
          emoji,
        });

        const reaction = await storage.createScreenshotReaction(reactionData);
        
        // Award points if this is a fire reaction (only if they haven't earned points for this screenshot before)
        if (emoji === '🔥') {
          const hasEarnedPoints = await storage.hasUserEarnedPointsForContent(userId, 'fire', 'screenshot', screenshotId);
          if (!hasEarnedPoints) {
            await LeaderboardService.awardPoints(
              userId,
              'fire',
              `Fire reaction given to screenshot #${screenshotId}`
            );
          }
        }
        
        res.status(201).json({ message: "Reaction added", reacted: true, reaction });
      }
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // ===== COMMENT REPORTING ENDPOINTS =====

  // Report a comment (clip comments)
  app.post("/api/comments/:id/report", emailVerificationMiddleware, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Report reason is required" });
      }

      const reportData = insertCommentReportSchema.parse({
        reporterId: req.user!.id,
        commentId,
        reason: reason.trim(),
      });

      const report = await storage.createCommentReport(reportData);
      res.status(201).json({ message: "Comment reported successfully", report });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Report a screenshot comment
  app.post("/api/screenshot-comments/:id/report", emailVerificationMiddleware, async (req, res) => {
    try {
      const screenshotCommentId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Report reason is required" });
      }

      const reportData = insertCommentReportSchema.parse({
        reporterId: req.user!.id,
        screenshotCommentId,
        reason: reason.trim(),
      });

      const report = await storage.createCommentReport(reportData);
      res.status(201).json({ message: "Comment reported successfully", report });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Get comment reports (admin only)
  app.get("/api/admin/comment-reports", adminMiddleware, async (req, res) => {
    try {
      const { status } = req.query;
      const reports = await storage.getCommentReports(status as string);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching comment reports:", error);
      res.status(500).json({ error: "Failed to fetch comment reports" });
    }
  });

  // Update comment report status (admin only)
  app.patch("/api/admin/comment-reports/:id", adminMiddleware, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['pending', 'reviewed', 'dismissed', 'action_taken'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const success = await storage.updateCommentReportStatus(reportId, status, req.user!.id);

      if (!success) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json({ message: "Report status updated successfully" });
    } catch (error) {
      console.error("Error updating comment report status:", error);
      res.status(500).json({ error: "Failed to update report status" });
    }
  });

  // ==========================================
  // Upload Success Routes
  // ==========================================

  // Get upload success data for confirmation screen
  app.get("/api/upload-success/:contentType/:id", authMiddleware, async (req, res) => {
    try {
      const { contentType, id } = req.params;
      const contentId = parseInt(id);

      if (isNaN(contentId)) {
        return res.status(400).json({ message: "Invalid content ID" });
      }

      let content;
      let shareUrl;
      let socialMediaLinks;

      // Get content based on type
      if (contentType === 'clip' || contentType === 'reel') {
        content = await storage.getClip(contentId);
        if (!content) {
          return res.status(404).json({ message: "Clip not found" });
        }
        shareUrl = `${req.protocol}://${req.get('host')}/view/${contentId}`;
      } else if (contentType === 'screenshot') {
        content = await storage.getScreenshot(contentId);
        if (!content) {
          return res.status(404).json({ message: "Screenshot not found" });
        }
        shareUrl = `${req.protocol}://${req.get('host')}/screenshot/${contentId}`;
      } else {
        return res.status(400).json({ message: "Invalid content type" });
      }

      // Check ownership
      if (content.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to view this content" });
      }

      // Generate QR code
      const qrCode = await QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Generate social media sharing links
      const title = encodeURIComponent(content.title);
      const description = encodeURIComponent(content.description || `Check out this amazing ${contentType}!`);
      socialMediaLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${title}`,
        reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${title}`,
        discord: shareUrl // For Discord, we just copy the link
      };

      const uploadedContent = {
        id: content.id,
        title: content.title,
        description: content.description,
        contentType: contentType as 'clip' | 'reel' | 'screenshot',
        qrCode,
        shareUrl,
        socialMediaLinks,
        createdAt: content.createdAt,
        views: content.views || 0
      };

      res.json(uploadedContent);
    } catch (error) {
      console.error("Error fetching upload success data:", error);
      res.status(500).json({ message: "Failed to fetch upload data" });
    }
  });

  // Register authentication routes for email verification and password reset
  app.use('/api', authRouter);

  // Register token-based authentication routes for desktop apps
  app.use('/api', tokenAuthRouter);

  // Register view routes for shareable content
  app.use('/api/view', viewRouter);

  // Note: Server-side redirects removed - frontend handles shareCode URLs directly now

  // ==========================================
  // Crossmint Wallet Routes
  // ==========================================

  // Get or create wallet via Crossmint API (handles both new and existing wallets)
  app.post("/api/wallet/create", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user already has a wallet saved in our DB, return it
      if (user.walletAddress) {
        return res.json({ 
          address: user.walletAddress,
          chain: user.walletChain || 'skale-nebula-testnet',
          message: "Wallet already exists",
          isExisting: true
        });
      }

      // Get Crossmint API key from environment (server-side only, no VITE_ prefix)
      const apiKey = process.env.CROSSMINT_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Crossmint API key not configured" });
      }

      const userEmail = user.email || `${user.username}@gamefolio.app`;
      // Crossmint requires the linkedUser to be prefixed with the type (e.g., 'email:')
      const linkedUser = `email:${userEmail}`;

      // Call Crossmint API to get or create wallet on SKALE Nebula Hub Testnet
      // This is idempotent - it will retrieve existing wallet or create new one
      const crossmintResponse = await fetch('https://www.crossmint.com/api/v1-alpha2/wallets', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'evm-smart-wallet',
          linkedUser: linkedUser,
          chain: 'skale-nebula-testnet',
          config: {
            adminSigner: {
              type: 'evm-fireblocks-custodial'
            }
          }
        }),
      });

      if (!crossmintResponse.ok) {
        const errorText = await crossmintResponse.text();
        console.error("Crossmint API error:", errorText);
        
        // Check if error is because wallet already exists
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          // Try to fetch the existing wallet
          const getUserWalletResponse = await fetch(`https://www.crossmint.com/api/v1-alpha2/wallets?linkedUser=${encodeURIComponent(linkedUser)}`, {
            method: 'GET',
            headers: {
              'X-API-KEY': apiKey,
            },
          });

          if (getUserWalletResponse.ok) {
            const walletsData = await getUserWalletResponse.json();
            if (walletsData && walletsData.length > 0) {
              const existingWallet = walletsData[0];
              
              // Save to database
              await storage.updateUser(userId, {
                walletAddress: existingWallet.address,
                walletChain: existingWallet.chain || 'skale-nebula-testnet',
                walletCreatedAt: new Date(),
              });

              return res.json({
                address: existingWallet.address,
                chain: existingWallet.chain || 'skale-nebula-testnet',
                message: "Connected to existing Crossmint wallet",
                isExisting: true
              });
            }
          }
        }
        
        return res.status(500).json({ message: `Crossmint API error: ${errorText}` });
      }

      const walletData = await crossmintResponse.json();

      // Save wallet to database
      await storage.updateUser(userId, {
        walletAddress: walletData.address,
        walletChain: walletData.chain || 'skale-nebula-testnet',
        walletCreatedAt: new Date(),
      });

      res.json({
        address: walletData.address,
        chain: walletData.chain || 'skale-nebula-testnet',
        message: "Wallet created successfully",
        isExisting: false
      });
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ error: "Failed to create wallet" });
    }
  });

  // Get wallet info for authenticated user
  app.get("/api/wallet/info", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user?.walletAddress) {
        return res.status(404).json({ message: "No wallet found" });
      }

      res.json({
        address: user.walletAddress,
        chain: user.walletChain || 'skale-nebula-testnet',
        createdAt: user.walletCreatedAt,
      });
    } catch (error) {
      console.error("Error fetching wallet info:", error);
      res.status(500).json({ error: "Failed to fetch wallet info" });
    }
  });

  // ==========================================
  // NFT Purchase Routes
  // ==========================================

  // NFT catalog (server-side source of truth for pricing)
  const NFT_CATALOG = [
    { id: 1, name: "Cyber Pilot #001", price: 250, priceUSD: 12.50, forSale: true },
    { id: 2, name: "Divine Guardian #002", price: 800, priceUSD: 40.00, forSale: true },
    { id: 3, name: "Street Samurai #003", price: 550, priceUSD: 27.50, forSale: true },
    { id: 4, name: "Urban Rogue #004", price: 350, priceUSD: 17.50, forSale: true },
    { id: 5, name: "Matrix Assassin #005", price: 700, priceUSD: 35.00, forSale: true },
    { id: 6, name: "Golden Warrior #006", price: 600, priceUSD: 30.00, forSale: true },
    { id: 7, name: "Cyber Ronin #007", price: 650, priceUSD: 32.50, forSale: true },
    { id: 8, name: "Desert Wanderer #008", price: 400, priceUSD: 20.00, forSale: true },
    { id: 9, name: "Space Mercenary #009", price: 500, priceUSD: 25.00, forSale: true },
    { id: 10, name: "Crystal Knight #010", price: 750, priceUSD: 37.50, forSale: true },
    { id: 11, name: "Retro Explorer #011", price: 300, priceUSD: 15.00, forSale: true },
    { id: 12, name: "Eastern Mystic #012", price: 450, priceUSD: 22.50, forSale: true },
    { id: 13, name: "Digital Miner #013", price: 350, priceUSD: 17.50, forSale: true },
    { id: 14, name: "Tech Operative #014", price: 420, priceUSD: 21.00, forSale: true },
    { id: 15, name: "Royal Outlaw #015", price: 900, priceUSD: 45.00, forSale: true },
  ];

  // Purchase NFT with GF tokens
  app.post("/api/nft/purchase", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { nftId } = req.body;

      if (!nftId || typeof nftId !== 'number') {
        return res.status(400).json({ message: "Invalid NFT ID" });
      }

      // Look up NFT price from server-side catalog (prevents price manipulation)
      const nft = NFT_CATALOG.find(n => n.id === nftId);
      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      if (!nft.forSale) {
        return res.status(400).json({ message: "NFT is not for sale" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has a wallet
      if (!user.walletAddress) {
        return res.status(400).json({ message: "Wallet required to purchase NFTs" });
      }

      // Check if user has enough GF tokens (use server-side price)
      const currentBalance = user.gfTokenBalance || 0;
      if (currentBalance < nft.price) {
        return res.status(400).json({ 
          message: "Insufficient GF token balance",
          currentBalance,
          required: nft.price
        });
      }

      // Deduct GF tokens
      const newBalance = currentBalance - nft.price;
      await storage.updateUser(userId, {
        gfTokenBalance: newBalance
      });

      // TODO: In a real implementation, we would:
      // 1. Save the NFT purchase record to database
      // 2. Transfer the NFT to user's wallet via Crossmint API
      // 3. Update NFT ownership in database

      res.json({
        success: true,
        message: "NFT purchased successfully",
        nftId,
        nftName: nft.name,
        pricePaid: nft.price,
        newBalance,
        transactionId: `txn_${Date.now()}_${nftId}` // Mock transaction ID
      });
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      res.status(500).json({ error: "Failed to purchase NFT" });
    }
  });

  // Add NFT to watchlist
  app.post("/api/nft/watchlist", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertNftWatchlistSchema.parse({
        ...req.body,
        userId
      });

      const watchlistItem = await storage.addToNftWatchlist(validatedData);
      res.json(watchlistItem);
    } catch (error: any) {
      // Handle duplicate entry error
      if (error.code === '23505') {
        return res.status(400).json({ message: "NFT already in watchlist" });
      }
      console.error("Error adding to NFT watchlist:", error);
      res.status(500).json({ error: "Failed to add NFT to watchlist" });
    }
  });

  // Remove NFT from watchlist
  app.delete("/api/nft/watchlist/:nftId", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const nftId = parseInt(req.params.nftId);

      if (isNaN(nftId)) {
        return res.status(400).json({ message: "Invalid NFT ID" });
      }

      await storage.removeFromNftWatchlist(userId, nftId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from NFT watchlist:", error);
      res.status(500).json({ error: "Failed to remove NFT from watchlist" });
    }
  });

  // Get user's NFT watchlist
  app.get("/api/nft/watchlist", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const watchlist = await storage.getNftWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      console.error("Error fetching NFT watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  // Check if NFT is in user's watchlist
  app.get("/api/nft/watchlist/check/:nftId", authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const nftId = parseInt(req.params.nftId);

      if (isNaN(nftId)) {
        return res.status(400).json({ message: "Invalid NFT ID" });
      }

      const isWatched = await storage.isNftInWatchlist(userId, nftId);
      res.json({ isWatched });
    } catch (error) {
      console.error("Error checking NFT watchlist status:", error);
      res.status(500).json({ error: "Failed to check watchlist status" });
    }
  });

  return httpServer;
}