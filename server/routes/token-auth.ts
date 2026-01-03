import { Router, Request, Response } from 'express';
import passport from 'passport';
import { JWTService } from '../services/jwt-service';
import { storage } from '../storage';
import { StreakService } from '../streak-service';
import { getDemoUser } from '../demo-user';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const router = Router();

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split('.');
  const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedBuf);
}

/**
 * Token-based login endpoint for desktop applications
 * Returns JWT tokens instead of creating a session
 */
router.post('/auth/token/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Handle demo user
    if (username === 'demo' || username === 'Demo') {
      const demoUser = getDemoUser();
      const tokens = JWTService.generateTokenPair(demoUser);
      const { password: _, ...userWithoutPassword } = demoUser;

      return res.json({
        ...tokens,
        user: userWithoutPassword,
      });
    }

    // Find user by username or email
    let user = await storage.getUserByUsername(username.toLowerCase());

    if (!user && username.includes('@')) {
      if (typeof storage.getUserByEmail === 'function') {
        user = await storage.getUserByEmail(username.toLowerCase());
      } else {
        const allUsers = await storage.getAllUsers();
        user = allUsers.find(u => u.email?.toLowerCase() === username.toLowerCase()) || null;
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Incorrect username or password' });
    }

    // Check auth provider
    if (user.authProvider === 'google') {
      return res.status(401).json({ 
        message: "This account is associated with Google - please login using the 'Continue with Google' button" 
      });
    }

    if (user.authProvider === 'discord') {
      return res.status(401).json({ 
        message: "This account is associated with Discord - please login using the 'Continue with Discord' button" 
      });
    }

    // Verify password
    const isMatch = await comparePasswords(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect username or password' });
    }

    // Update login time
    try {
      await storage.updateUserLoginTime(user.id, 0);
    } catch (error) {
      console.error('Error updating user login time:', error);
    }

    // Update login streak
    let streakInfo;
    try {
      streakInfo = await StreakService.updateLoginStreak(user.id);
      if (streakInfo.bonusAwarded > 0) {
        console.log(`🎉 Streak bonus for ${user.username}: ${streakInfo.message}`);
      }
    } catch (error) {
      console.error('Error updating login streak:', error);
    }

    // Fetch updated user data
    const updatedUser = await storage.getUserById(user.id);
    const userToReturn = updatedUser || user;

    // Generate tokens
    const tokens = JWTService.generateTokenPair(userToReturn);
    const { password: _, ...userWithoutPassword } = userToReturn;

    // Return tokens and user data
    const response = {
      ...tokens,
      user: streakInfo ? {
        ...userWithoutPassword,
        streakInfo: {
          currentStreak: streakInfo.currentStreak,
          bonusAwarded: streakInfo.bonusAwarded,
          message: streakInfo.message,
          isNewMilestone: streakInfo.isNewMilestone,
        },
      } : userWithoutPassword,
    };

    return res.json(response);
  } catch (error) {
    console.error('Token login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

/**
 * Token refresh endpoint
 * Allows desktop apps to refresh their access token using a refresh token
 */
router.post('/auth/token/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    const payload = JWTService.verifyToken(refreshToken);

    // Special handling for demo user (ID 999) - not in database
    let user;
    if (Number(payload.userId) === 999) {
      user = getDemoUser();
    } else {
      // Fetch current user data from database
      user = await storage.getUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
    }

    // Generate new tokens
    const tokens = JWTService.generateTokenPair(user);
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      ...tokens,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({ message: 'Refresh token has expired' });
      }
      if (error.message.includes('Invalid')) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
    }
    return res.status(500).json({ message: 'Token refresh failed' });
  }
});

/**
 * Google OAuth token-based authentication
 * Returns JWT tokens for desktop apps instead of creating a session
 */
router.post('/auth/token/google', async (req: Request, res: Response) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ message: 'Missing required Google auth data' });
    }

    // Check if user already exists by email
    let user = await storage.getUserByEmail?.(email);

    if (!user) {
      // Create new user with Google data
      const tempUsername = `temp_${uid.substring(0, 8)}_${Date.now()}`;
      user = await storage.createUser({
        username: tempUsername,
        email: email.toLowerCase(),
        displayName: displayName || email.split('@')[0],
        password: '',
        avatarUrl: photoURL || undefined,
        emailVerified: true,
        authProvider: 'google',
        externalId: uid,
        bio: '',
      });

      // Update login time and streak
      try {
        await storage.updateUserLoginTime(user.id, 0);
        const streakInfo = await StreakService.updateLoginStreak(user.id);

        const tokens = JWTService.generateTokenPair(user);
        const { password: _, ...userWithoutPassword } = user;

        return res.status(200).json({
          ...tokens,
          user: {
            ...userWithoutPassword,
            needsOnboarding: true,
            isNewGoogleUser: true,
            streakInfo: streakInfo ? {
              currentStreak: streakInfo.currentStreak,
              bonusAwarded: streakInfo.bonusAwarded,
              message: streakInfo.message,
              isNewMilestone: streakInfo.isNewMilestone,
            } : undefined,
          },
        });
      } catch (error) {
        console.error('Error updating user login time or streak:', error);
      }
    }

    // Existing user - check if they need onboarding
    const needsOnboarding = !user.userType || !user.ageRange || user.username.startsWith('temp_');

    // Update existing user's Google data if needed
    if (!user.avatarUrl && photoURL) {
      user = await storage.updateUser(user.id, {
        avatarUrl: photoURL,
        authProvider: 'google',
        externalId: uid,
      }) || user;
    }

    // Update login time and streak
    try {
      await storage.updateUserLoginTime(user.id, 0);
      const streakInfo = await StreakService.updateLoginStreak(user.id);

      const tokens = JWTService.generateTokenPair(user);
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({
        ...tokens,
        user: {
          ...userWithoutPassword,
          needsOnboarding,
          streakInfo: streakInfo ? {
            currentStreak: streakInfo.currentStreak,
            bonusAwarded: streakInfo.bonusAwarded,
            message: streakInfo.message,
            isNewMilestone: streakInfo.isNewMilestone,
          } : undefined,
        },
      });
    } catch (error) {
      console.error('Error updating user login time or streak:', error);
    }

    // Fallback response
    const tokens = JWTService.generateTokenPair(user);
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      ...tokens,
      user: {
        ...userWithoutPassword,
        needsOnboarding,
      },
    });
  } catch (error) {
    console.error('Google token auth error:', error);
    return res.status(500).json({ message: 'Google authentication failed' });
  }
});

/**
 * Discord OAuth token-based authentication
 * Returns JWT tokens for desktop apps instead of creating a session
 */
router.post('/auth/token/discord', async (req: Request, res: Response) => {
  try {
    const { id, username, discriminator, email, avatar } = req.body;

    if (!id || !username || !email) {
      return res.status(400).json({ message: 'Missing required Discord auth data' });
    }

    // Check if user already exists by email
    let user = await storage.getUserByEmail?.(email);

    if (!user) {
      // Create new user with Discord data
      const displayName = `${username}#${discriminator}`;
      const tempUsername = `temp_${id.substring(0, 8)}_${Date.now()}`;
      const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : undefined;

      user = await storage.createUser({
        username: tempUsername,
        email: email.toLowerCase(),
        displayName,
        password: '',
        avatarUrl,
        emailVerified: true,
        authProvider: 'discord',
        externalId: id,
        bio: '',
      });

      // Update login time and streak
      try {
        await storage.updateUserLoginTime(user.id, 0);
        const streakInfo = await StreakService.updateLoginStreak(user.id);

        const tokens = JWTService.generateTokenPair(user);
        const { password: _, ...userWithoutPassword } = user;

        return res.status(200).json({
          ...tokens,
          user: {
            ...userWithoutPassword,
            needsOnboarding: true,
            isNewDiscordUser: true,
            streakInfo: streakInfo ? {
              currentStreak: streakInfo.currentStreak,
              bonusAwarded: streakInfo.bonusAwarded,
              message: streakInfo.message,
              isNewMilestone: streakInfo.isNewMilestone,
            } : undefined,
          },
        });
      } catch (error) {
        console.error('Error updating user login time or streak:', error);
      }
    }

    // Existing user - check if they need onboarding
    const needsOnboarding = !user.userType || !user.ageRange || user.username.startsWith('temp_');

    // Update login time and streak
    try {
      await storage.updateUserLoginTime(user.id, 0);
      const streakInfo = await StreakService.updateLoginStreak(user.id);

      const tokens = JWTService.generateTokenPair(user);
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({
        ...tokens,
        user: {
          ...userWithoutPassword,
          needsOnboarding,
          streakInfo: streakInfo ? {
            currentStreak: streakInfo.currentStreak,
            bonusAwarded: streakInfo.bonusAwarded,
            message: streakInfo.message,
            isNewMilestone: streakInfo.isNewMilestone,
          } : undefined,
        },
      });
    } catch (error) {
      console.error('Error updating user login time or streak:', error);
    }

    // Fallback response
    const tokens = JWTService.generateTokenPair(user);
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      ...tokens,
      user: {
        ...userWithoutPassword,
        needsOnboarding,
      },
    });
  } catch (error) {
    console.error('Discord token auth error:', error);
    return res.status(500).json({ message: 'Discord authentication failed' });
  }
});

/**
 * Health check endpoint for mobile apps
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Gamefolio API'
  });
});

export default router;