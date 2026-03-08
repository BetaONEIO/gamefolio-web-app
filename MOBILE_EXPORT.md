# Gamefolio Mobile App — New Project Briefing

Paste this entire document into your new Replit project's agent as the first message. It contains everything needed to build the mobile version.

---

## What You're Building

A React Native (Expo) mobile app called **Gamefolio** — a social media platform for gamers to share clips, screenshots, earn XP, open loot boxes, and interact with each other. This is a mobile version of an existing web app. The backend is fully built and already has JWT auth support for mobile clients.

---

## Tech Stack for This Project

- **React Native** with **Expo** (expo-router for navigation)
- **TypeScript** throughout
- **TanStack Query** for data fetching
- **Zustand** for auth state
- **NativeWind** (Tailwind for React Native) for styling
- **expo-secure-store** for persisting JWT tokens
- **axios** for HTTP (with auto auth header injection)
- **socket.io-client** for real-time notifications/messages
- **expo-av** for video playback
- **expo-image-picker** for media uploads
- **@expo/vector-icons** for icons

---

## Backend API

The backend is already deployed. Set `EXPO_PUBLIC_API_URL` in your environment to point to it.

### Authentication (JWT-based — already fully built)

All auth routes are prefixed with `/api`:

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/token/login` | Login with username/password, returns `accessToken` + `refreshToken` + `user` |
| POST | `/api/auth/token/refresh` | Refresh tokens using `{ refreshToken }` body |
| POST | `/api/auth/mobile/google` | Google Sign-In — send `{ email, displayName, photoURL, uid }` from Firebase, returns tokens |
| GET | `/api/auth/mobile/discord/init` | Get Discord OAuth URL for in-app browser |
| POST | `/api/auth/mobile/exchange` | Exchange one-time auth code for tokens after Discord OAuth |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/forgot-password` | Send password reset code |
| POST | `/api/auth/reset-password` | Reset password with code |
| GET | `/api/health` | Health check |

**Token format:** All protected requests need `Authorization: Bearer <accessToken>` header.  
**Token expiry:** Access tokens last 7 days, refresh tokens 30 days.

### Core API Endpoints

All prefixed with `/api`:

**User / Auth**
- `GET /user` — current authenticated user
- `GET /users/:username` — user profile with stats
- `PATCH /user` — update current user profile
- `POST /register` — create account
- `POST /login` — session login (use token login instead for mobile)
- `POST /logout`

**Clips**
- `GET /clips` — paginated clip feed (query: `?period=day|week|month&gameId=&videoType=clip|reel&page=`)
- `GET /clips/:id` — single clip
- `GET /clips/share/:shareCode` — clip by share code
- `GET /reels` — paginated reels feed
- `GET /reels/:id` — single reel
- `POST /clips` — upload clip (multipart form)
- `DELETE /clips/:id` — delete clip
- `POST /clips/:id/like` — like a clip
- `DELETE /clips/:id/like` — unlike a clip
- `GET /clips/:id/likes` — like count and status
- `POST /clips/:id/view` — record a view
- `POST /clips/:id/reactions` — add emoji reaction

**Screenshots**
- `GET /screenshots` — paginated screenshots
- `GET /screenshots/:id` — single screenshot
- `POST /screenshots` — upload screenshot
- `DELETE /screenshots/:id`
- `POST /screenshots/:id/like`
- `DELETE /screenshots/:id/like`

**Comments**
- `GET /clips/:id/comments` — get comments
- `POST /clips/:id/comments` — post comment
- `DELETE /comments/:id`
- `POST /comments/:id/like` — like a comment

**Follows**
- `POST /follows` — follow a user `{ followingId }`
- `DELETE /follows/:userId` — unfollow
- `GET /users/:username/followers`
- `GET /users/:username/following`
- `GET /users/:userId/follow-status` — check if you follow them
- `POST /follow-requests` — send follow request (private accounts)
- `POST /follow-requests/:id/approve`
- `POST /follow-requests/:id/reject`
- `GET /follow-requests/pending` — incoming requests

**Messages**
- `GET /messages` — list conversations
- `GET /messages/:userId` — message thread with a user
- `POST /messages/:userId` — send message
- `POST /messages/:userId/read` — mark as read

**Notifications**
- `GET /notifications` — all notifications
- `POST /notifications/:id/read` — mark read
- `POST /notifications/read-all`
- `GET /notifications/unread-count`

**Games**
- `GET /games` — all games
- `GET /games/search?q=` — search games
- `GET /games/:id` — game with clips
- `GET /user-game-favorites` — current user's favourite games
- `POST /user-game-favorites` — add favourite
- `DELETE /user-game-favorites/:gameId` — remove favourite

**Gamification**
- `GET /user/streak` — current streak info
- `GET /leaderboard` — weekly leaderboard
- `GET /leaderboard/monthly`
- `POST /user/daily-lootbox` — open daily loot box
- `GET /user/daily-lootbox/status` — check if can open today

**Store / Wallet**
- `GET /store/items` — store items
- `GET /user/wallet` — wallet balance
- `GET /user/gf-tokens` — GF token balance

**Profile Customisation**
- `GET /profile-borders` — available borders
- `GET /name-tags` — available name tags
- `GET /verification-badges`
- `PATCH /user/selected-border`
- `PATCH /user/selected-name-tag`

**Trending / Explore**
- `GET /trending` — trending clips
- `GET /explore` — explore feed
- `GET /hero-slides` — homepage banner slides

---

## Data Types (from shared schema)

These are the key TypeScript types used throughout the app:

```typescript
type User = {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  role: 'user' | 'admin' | 'moderator';
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  gfTokenBalance: number;
  isPro: boolean;
  isPrivate: boolean;
  accentColor: string;
  // ... platform usernames
  steamUsername?: string;
  xboxUsername?: string;
  playstationUsername?: string;
  discordUsername?: string;
  twitterUsername?: string;
  youtubeUsername?: string;
};

type Clip = {
  id: number;
  userId: number;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  gameName?: string;
  gameImageUrl?: string;
  views: number;
  tags?: string[];
  duration: number;
  videoType: 'clip' | 'reel';
  ageRestricted: boolean;
  shareCode?: string;
  createdAt: Date;
};

type ClipWithUser = Clip & {
  user: User;
  game?: Game;
  _count?: { likes: number; comments: number; reactions: number };
};

type Screenshot = {
  id: number;
  userId: number;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  gameName?: string;
  views: number;
  tags?: string[];
  shareCode?: string;
  createdAt: Date;
};

type Game = {
  id: number;
  name: string;
  imageUrl?: string;
};

type Comment = {
  id: number;
  userId: number;
  clipId: number;
  content: string;
  createdAt: Date;
};

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: Date;
};

type Notification = {
  id: number;
  userId: number;
  type: 'like' | 'comment' | 'follow' | 'upload' | 'reply' | 'clip_mention' | 'comment_mention';
  title: string;
  message: string;
  isRead: boolean;
  fromUserId?: number;
  clipId?: number;
  actionUrl?: string;
  createdAt: Date;
};

type UserWithStats = User & {
  _count?: {
    followers: number;
    following: number;
    clips: number;
    screenshots: number;
    clipViews: number;
    likesReceived: number;
    firesReceived: number;
  };
  favoriteGames?: Game[];
};
```

---

## Screens to Build

### Tab Navigation (bottom tabs)
1. **Home** — Feed of clips/reels/screenshots with hero banner carousel, game filter chips, period selector (Today/Week/Month), tab switcher (Clips / Reels / Screenshots)
2. **Explore** — Trending content, featured users, game categories
3. **Upload** — Upload clip, reel, or screenshot with game tagging, title, tags, filters
4. **Notifications** — Notification list with unread badge
5. **Profile** — Current user profile with clips/screenshots grid, stats (XP/level/streak/followers)

### Stack Screens
- `/(auth)/login` — Username/password form, Google Sign-In button, Discord button, link to register
- `/(auth)/register` — Registration form
- `/(auth)/onboarding` — User type selection + age range (shown after first Google/Discord login)
- `/profile/[username]` — Other user profiles with follow/message actions
- `/clip/[id]` — Full-screen video player, likes, comments, share
- `/screenshot/[id]` — Full-screen image, likes, comments
- `/game/[id]` — Game page with clips/screenshots for that game
- `/messages/index` — Conversations list
- `/messages/[userId]` — Message thread with real-time updates
- `/settings` — Account settings, privacy, linked platforms
- `/store` — GF token store and items
- `/leaderboard` — Weekly/monthly leaderboard
- `/lootbox` — Daily loot box opening with animation

---

## Auth Flow

```typescript
// Auth store (Zustand)
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (googleData: GoogleAuthData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

// On app start: load tokens from expo-secure-store, validate, restore session
// On login: POST /api/auth/token/login, store tokens in expo-secure-store
// On every request: attach Authorization: Bearer <accessToken> header
// On 401: try POST /api/auth/token/refresh, retry, else logout
```

---

## Real-time (Socket.io)

Connect after login:
```typescript
const socket = io(process.env.EXPO_PUBLIC_API_URL, {
  auth: { token: accessToken },
  transports: ['websocket'],
});

socket.on('notification', (notification) => { /* update notifications store */ });
socket.on('message', (message) => { /* update messages store */ });
socket.on('connect_error', (err) => { /* handle auth failure */ });
```

---

## Environment Variables

```
EXPO_PUBLIC_API_URL=https://YOUR-BACKEND-URL.replit.app
```

---

## Design System

- **Primary colour:** `#02172C` (dark navy)
- **Background:** `#0B2232`
- **Accent/green:** `#4ADE80`
- **Card background:** `#1E3A8A`
- **Text:** white on dark backgrounds
- Dark theme throughout — this is a gaming app, dark UI is the standard
- Use `accentColor` from the user object to personalise UI elements on profile screens

---

## Key Features Priority Order

1. Auth (login, register, Google Sign-In)
2. Home feed (clips + screenshots)
3. Video playback (clip detail screen)
4. User profiles
5. Upload flow
6. Likes, comments, follows
7. Messages
8. Notifications (push + in-app)
9. Gamification (XP, streak, loot box)
10. Store, wallet, leaderboard

---

## Notes

- The backend uses **cookie sessions for the web app** but **JWT tokens for mobile** — always use the `/api/auth/token/login` endpoint, never the regular `/api/login`
- Video URLs come from Supabase Storage — they are direct HTTPS URLs, use them directly in the Expo AV video player
- Image URLs may be relative (e.g. `/api/static/...`) — prepend `EXPO_PUBLIC_API_URL` if the URL starts with `/`
- The `shareCode` field on clips/screenshots is an 8-character alphanumeric code used for sharing links
- Users can have private profiles — check `isPrivate` and show a "follow to see content" state when viewing private profiles you don't follow
