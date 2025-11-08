# Desktop Application Authentication Guide

This guide explains how to use Gamefolio's token-based authentication system for desktop applications.

## Overview

Gamefolio supports two authentication methods:
1. **Session-based authentication** - For web browsers (default)
2. **JWT token-based authentication** - For desktop applications and mobile apps

The token-based authentication allows desktop applications to authenticate users and maintain long-lived sessions without relying on cookies.

## Authentication Endpoints

### 1. Login with Username/Password

**Endpoint:** `POST /api/auth/token/login`

**Request Body:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800,
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "displayName": "User 123",
    "avatarUrl": "https://...",
    "emailVerified": true,
    "userType": "gamer",
    "ageRange": "18-24",
    "currentStreak": 5,
    "level": 3,
    "totalPoints": 250
  }
}
```

**Notes:**
- Access token expires in 7 days
- Refresh token expires in 30 days
- Users can log in with either username or email address

### 2. Login with Google OAuth

**Endpoint:** `POST /api/auth/token/google`

**Request Body:**
```json
{
  "email": "user@gmail.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "uid": "google-user-id"
}
```

**Response:** Same format as username/password login

**Notes:**
- New users are automatically created
- Users may need to complete onboarding (set username, userType, ageRange)
- Check `user.needsOnboarding` field in response

### 3. Login with Discord OAuth

**Endpoint:** `POST /api/auth/token/discord`

**Request Body:**
```json
{
  "id": "discord-user-id",
  "username": "username",
  "discriminator": "1234",
  "email": "user@example.com",
  "avatar": "avatar-hash"
}
```

**Response:** Same format as username/password login

**Notes:**
- Similar to Google OAuth flow
- Avatar URL is automatically constructed from Discord CDN

### 4. Refresh Access Token

**Endpoint:** `POST /api/auth/token/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 604800,
  "user": {
    // Updated user data
  }
}
```

**Notes:**
- Use this endpoint before access token expires
- Both tokens are regenerated for security
- Returns fresh user data from database

## Making Authenticated Requests

Include the access token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Example API request:
```javascript
fetch('https://your-domain.com/api/clips', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
```

## Hybrid Authentication

All existing API endpoints support both session-based (web) and token-based (desktop) authentication automatically. The server checks for:
1. Passport session first (web browsers)
2. JWT token in Authorization header (desktop apps)

This means you can use the same API endpoints whether you're building a web app or desktop app.

## Token Storage Recommendations

### Desktop Applications
- Store tokens securely using platform-specific secure storage:
  - **Windows:** Windows Credential Manager
  - **macOS:** Keychain
  - **Linux:** Secret Service API (libsecret)

### DO NOT:
- Store tokens in plain text files
- Store tokens in application code
- Log tokens to console in production

## Error Handling

Common error responses:

### 401 Unauthorized
```json
{
  "message": "Token has expired",
  "code": "TOKEN_EXPIRED"
}
```
**Action:** Use refresh token to get new access token

### 401 Invalid Token
```json
{
  "message": "Invalid token",
  "code": "INVALID_TOKEN"
}
```
**Action:** Re-authenticate user (login again)

### 403 Email Not Verified
```json
{
  "message": "Email verification required",
  "code": "EMAIL_NOT_VERIFIED",
  "email": "user@example.com"
}
```
**Action:** Prompt user to verify email

### 403 Onboarding Required
```json
{
  "message": "Onboarding required",
  "code": "ONBOARDING_REQUIRED",
  "userId": 123,
  "username": "temp_12345678_1234567890"
}
```
**Action:** Complete onboarding flow (set username, userType, ageRange)

## Example Implementation (JavaScript/Node.js)

```javascript
class GamefolioAuth {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(username, password) {
    const response = await fetch(`${this.apiUrl}/api/auth/token/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    
    // Store tokens securely
    await this.secureStorage.set('accessToken', data.accessToken);
    await this.secureStorage.set('refreshToken', data.refreshToken);
    
    return data.user;
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.apiUrl}/api/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    
    await this.secureStorage.set('accessToken', data.accessToken);
    await this.secureStorage.set('refreshToken', data.refreshToken);
    
    return data.user;
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };

    let response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers
    });

    // If token expired, try refreshing
    if (response.status === 401) {
      const error = await response.json();
      if (error.code === 'TOKEN_EXPIRED') {
        await this.refreshAccessToken();
        
        // Retry request with new token
        headers.Authorization = `Bearer ${this.accessToken}`;
        response = await fetch(`${this.apiUrl}${endpoint}`, {
          ...options,
          headers
        });
      }
    }

    return response;
  }

  async getClips() {
    const response = await this.makeAuthenticatedRequest('/api/clips');
    return response.json();
  }

  async uploadClip(formData) {
    // Note: Don't set Content-Type for FormData, browser sets it automatically
    const response = await this.makeAuthenticatedRequest('/api/clips', {
      method: 'POST',
      body: formData,
      headers: {} // Will be merged with Authorization header
    });
    return response.json();
  }
}
```

## Testing

You can test the token endpoints using curl:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/token/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"password"}'

# Use the token
curl http://localhost:5000/api/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:5000/api/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** using platform-specific secure storage
3. **Implement token refresh** before expiration
4. **Clear tokens on logout** and remove from secure storage
5. **Validate responses** and handle errors gracefully
6. **Don't share tokens** between users or devices
7. **Implement timeout** for inactive sessions
8. **Log security events** (login, logout, token refresh)

## Migration from Session-Based Auth

If you're migrating an existing web application:

1. Keep existing session-based authentication for web
2. Add token-based authentication for desktop/mobile
3. Both methods work simultaneously (hybrid authentication)
4. No changes needed to existing API endpoints
5. Desktop apps simply include `Authorization` header instead of cookies

## Support

For questions or issues with authentication:
- Check error responses for specific error codes
- Review this documentation
- Test with demo user (username: "demo", password: "password")
- Contact support for production issues
