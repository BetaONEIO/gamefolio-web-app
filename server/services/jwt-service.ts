import jwt from 'jsonwebtoken';

// Use a secure secret from environment variables, or a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

export interface TokenPayload {
  userId: number;
  type: 'access' | 'refresh';
}

/**
 * Generate an access token for a user
 */
export function generateAccessToken(userId: number): string {
  const payload: TokenPayload = {
    userId,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: number): string {
  const payload: TokenPayload = {
    userId,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
}

/**
 * Verify an access token and return the user ID
 */
export function verifyAccessToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (payload.type !== 'access') {
      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

/**
 * Verify a refresh token and return the user ID
 */
export function verifyRefreshToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (payload.type !== 'refresh') {
      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}