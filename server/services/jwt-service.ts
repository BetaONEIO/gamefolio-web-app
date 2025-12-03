import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days for desktop apps
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // 30 days for refresh tokens

export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
  role?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Omit<User, 'password'>;
}

export class JWTService {
  /**
   * Generate access token for a user
   */
  static generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email || '',
      role: user.role || undefined,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'gamefolio',
      subject: user.id.toString(),
    });
  }

  /**
   * Generate refresh token for a user
   */
  static generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email || '',
      role: user.role || undefined,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'gamefolio',
      subject: user.id.toString(),
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(user: User): { accessToken: string; refreshToken: string; expiresIn: number } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'gamefolio',
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode token without verifying (useful for checking expiration)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      jwt.verify(token, JWT_SECRET);
      return false;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return true;
      }
      return true; // Treat invalid tokens as expired
    }
  }
}
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
