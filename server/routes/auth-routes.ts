import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, emailVerificationTokens } from '@shared/schema';
import { storage } from '../storage';
import { eq, sql } from 'drizzle-orm';
import { promisify } from 'util';
import { scrypt, randomBytes } from 'crypto';
import {
  createVerificationCode,
  verifyEmailCode,
  verifyEmailToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken
} from '../services/token-service';
import { EmailService } from '../services/email-service'; // Assuming EmailService is set up for Brevo

// Scrypt promisification for password hashing
const scryptAsync = promisify(scrypt);

const router = Router();

/**
 * Request email verification
 * This route is used to generate a new verification token and send the verification email
 */
router.post('/auth/request-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find the user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({
        message: 'If your email is registered, a verification email has been sent'
      });
    }

    // If the email is already verified, don't send another verification email
    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Your email is already verified'
      });
    }

    // Generate a new verification code
    const code = await createVerificationCode(user.id);

    // Send verification email with the code
    if (!user.email) {
      return res.status(400).json({ message: 'User email is required for verification' });
    }
    const emailSent = await EmailService.sendVerificationEmail(user.email, code);

    return res.status(200).json({
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Error requesting email verification:', error);
    return res.status(500).json({ message: 'Failed to send verification email' });
  }
});

/**
 * Verify email with token (GET request from email links)
 * This route is used to verify an email address using a token from email links
 */
router.get('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    console.log(`🔗 Email verification request received`);
    console.log(`🔍 Request method:`, req.method);
    console.log(`🔍 Request URL:`, req.url);
    console.log(`🔍 Full query params:`, req.query);
    console.log(`🔍 Query string:`, req.url.split('?')[1]);
    console.log(`🔍 Token value:`, token);
    console.log(`🔍 Token type:`, typeof token);

    if (!token || typeof token !== 'string') {
      console.log('❌ No token provided in verification request');
      // Redirect to frontend with error
      return res.redirect(302, `/verify-email?status=invalid`);
    }

    console.log(`🔍 Attempting to verify token: ${token.substring(0, 10)}...`);

    // Check if there's an existing token record to find the user
    const [existingToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));

    if (!existingToken) {
      console.log('❌ Token not found in database - checking for recently verified users');
      
      // Token might have been used already - check for recently verified users
      // Look for users verified in the last hour who might have used this token
      const recentlyVerifiedUsers = await db
        .select()
        .from(users)
        .where(
          sql`email_verified = true AND updated_at > NOW() - INTERVAL '1 hour'`
        );
      
      if (recentlyVerifiedUsers.length > 0) {
        console.log(`✅ Found ${recentlyVerifiedUsers.length} recently verified users - showing success instead of expired`);
        return res.redirect(302, `/verify-email?status=success`);
      }
      
      return res.redirect(302, `/verify-email?status=expired`);
    }

    console.log(`🔍 Found token for user ${existingToken.userId}`);

    // Check if user is already verified BEFORE verifying token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingToken.userId));

    if (!user) {
      console.log('❌ User not found during verification');
      return res.redirect(302, `/verify-email?status=error`);
    }

    if (user.emailVerified) {
      console.log(`✅ User ${existingToken.userId} is already verified - showing success instead of expired`);
      // Clean up the token since user is already verified
      await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, existingToken.id));
      return res.redirect(302, `/verify-email?status=success`);
    }

    // Now verify the token (this will also delete it)
    const userId = await verifyEmailToken(token);

    if (!userId) {
      console.log('❌ Token verification failed - token invalid or expired');
      // Redirect to frontend with error
      return res.redirect(302, `/verify-email?status=expired`);
    }

    console.log(`✅ Token verified successfully for user ID: ${userId}`);

    // Update the user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));

    console.log(`✅ User ${userId} email verification status updated to true`);

    // Send welcome email after successful verification
    try {
      if (!user.email) {
        console.log('⚠️ Cannot send welcome email - user email is null');
      } else {
        console.log(`📧 Attempting to send welcome email to ${user.email} with name: ${user.displayName || user.username}`);
        const emailResult = await EmailService.sendWelcomeEmail(user.email, user.displayName || user.username || '');

        if (emailResult) {
          console.log(`✅ Welcome email sent successfully to ${user.email} after verification`);
        } else {
          console.log(`⚠️ Welcome email sending returned false for ${user.email}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send welcome email after verification:', error);
      console.error('❌ Error details:', (error as Error).message || error);
      // Don't fail the verification if welcome email fails
    }

    // Redirect to frontend with success
    return res.redirect(302, `/verify-email?status=success`);

  } catch (error) {
    console.error('❌ Error verifying email:', error);
    // Redirect to frontend with error
    return res.redirect(302, `/verify-email?status=error`);
  }
});

/**
 * Verify email with token (POST request)
 * This route is used to verify an email address using a token
 */
router.post('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify the token
    const userId = await verifyEmailToken(token);

    if (!userId) {
      return res.status(400).json({ 
        message: 'This verification link is no longer valid. This may happen if the link has expired (30 days) or you requested a newer verification email. Please check your inbox for the most recent email or request a new verification link.' 
      });
    }

    // Get user details before updating
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Update the user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));

    // Send welcome email after successful verification
    try {
      if (!user.email) {
        console.log('⚠️ Cannot send welcome email - user email is null');
      } else {
        console.log(`📧 Attempting to send welcome email to ${user.email} with name: ${user.displayName || user.username}`);
        const emailResult = await EmailService.sendWelcomeEmail(user.email, user.displayName || user.username || '');

        if (emailResult) {
          console.log(`✅ Welcome email sent successfully to ${user.email} after verification`);
        } else {
          console.log(`⚠️ Welcome email sending returned false for ${user.email}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send welcome email after verification:', error);
      console.error('❌ Error details:', (error as Error).message || error);
      // Don't fail the verification if welcome email fails
    }

    return res.status(200).json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ message: 'Failed to verify email' });
  }
});

/**
 * Resend email verification
 * This route is used to resend the verification email
 */
router.post('/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find the user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({
        message: 'If your email is registered, a verification email has been sent'
      });
    }

    // If the email is already verified, don't send another verification email
    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Your email is already verified'
      });
    }

    // Generate a new verification code
    const code = await createVerificationCode(user.id);

    // Send verification email using Brevo
    try {
      await EmailService.sendVerificationEmail(user.email, code);
      console.log(`✅ Verification email resent to ${user.email}`);

      return res.status(200).json({
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again.'
      });
    }

  } catch (error) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({ message: 'Failed to send verification email' });
  }
});

/**
 * Request password reset
 * This route is used to generate a new password reset token and send the reset email
 */
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find the user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({
        message: 'If your email is registered, a password reset link has been sent'
      });
    }

    // Generate a new password reset token
    const token = await createPasswordResetToken(user.id);

    // Send password reset email using Brevo
    try {
      await EmailService.sendPasswordResetEmail(user.email, token);
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Continue with the response even if email fails
    }

    return res.status(200).json({
      message: 'Password reset email sent',
    });

  } catch (error) {
    console.error('Error requesting password reset:', error);
    return res.status(500).json({ message: 'Failed to send password reset email' });
  }
});

/**
 * Reset password with token
 * This route is used to reset a password using a token
 */
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Verify the token
    const userId = await verifyPasswordResetToken(token);

    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Use the same hashing function as in routes.ts
    const hashPassword = async (password: string) => {
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      return `${buf.toString("hex")}.${salt}`;
    };

    // Update the user's password
    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    // Delete the used token
    await deletePasswordResetToken(token);

    return res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

/**
 * TEST: Simple test endpoint
 */
router.get('/auth/test', async (req: Request, res: Response) => {
  return res.json({ 
    message: 'Auth routes are working',
    timestamp: new Date().toISOString(),
    query: req.query 
  });
});

/**
 * DEBUG: Check token creation and database structure
 */
router.get('/auth/debug-tokens/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get existing tokens for this user
    const tokens = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, user.id));

    console.log(`🔧 Debug tokens for user ${user.id} (${email}):`, tokens);

    return res.json({
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      tokens: tokens.map(t => ({
        id: t.id,
        token: t.token.substring(0, 10) + '...',
        expiresAt: t.expiresAt,
        createdAt: t.createdAt
      }))
    });

  } catch (error) {
    console.error('Debug tokens error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Verify email with 6-digit code (POST request from frontend)
 */
router.post('/auth/verify-code', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Invalid verification code format' });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = (req.user as any).id;

    // If user is already verified, no need to verify again
    if ((req.user as any).emailVerified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    // Verify the code
    const isValid = await verifyEmailCode(userId, code);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));

    console.log(`✅ Email verified successfully for user ${userId}`);

    return res.status(200).json({ 
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Code verification error:', error);
    return res.status(500).json({ message: 'Failed to verify code' });
  }
});

/**
 * Resend verification code
 */
router.post('/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find the user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({
        message: 'If your email is registered, a verification code has been sent'
      });
    }

    // If the email is already verified, don't send another verification code
    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Your email is already verified'
      });
    }

    // Generate a new verification code
    const code = await createVerificationCode(user.id);

    // Send verification email with the code
    const emailSent = await EmailService.sendVerificationEmail(user.email, code);

    if (emailSent) {
      console.log(`✅ Verification code resent to ${user.email}`);
    } else {
      console.warn(`⚠️ Failed to send verification code to ${user.email}`);
    }

    return res.status(200).json({
      message: 'Verification code sent'
    });

  } catch (error) {
    console.error('Error resending verification code:', error);
    return res.status(500).json({ message: 'Failed to send verification code' });
  }
});

export default router;