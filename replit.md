# Gamefolio - Gaming Portfolio & Social Platform

## Overview
Gamefolio is a comprehensive gaming portfolio and social platform designed for gamers to showcase gaming clips, build a personal portfolio, connect with other gamers, and participate in competitive leaderboards. The platform aims to provide a robust, secure, and engaging environment for the gaming community, integrating features like content sharing, real-time messaging, and content moderation.

## User Preferences
- Focus on using only authentic Supabase data sources
- Maintain scalable, cloud-first architecture
- Prioritize data integrity and security
- Prefer comprehensive solutions over quick fixes

## System Architecture

### Database
- **Primary Database**: Supabase PostgreSQL (managed via `DATABASE_URL` environment variable).
- **ORM**: Drizzle ORM for type-safe database operations.
- **Connection**: Direct PostgreSQL connection using the `postgres` library.
- **Schema**: Centralized in `shared/schema.ts` with Drizzle definitions.
- **Persistence**: All data persists in Supabase PostgreSQL; no local storage (in-memory, JSON, SQLite) is used.

### Backend (Node.js/Express)
- **Framework**: Express server with TypeScript.
- **Session Management**: `connect-pg-simple` for PostgreSQL-backed sessions.
- **Authentication**: `passport-local` for user authentication.
- **File Uploads**: Handled via `multer` and Supabase storage.
- **Email Verification**: Token-based system for user verification.
- **Content Filtering**: Integrated `bad-words` library with custom Supabase `banned_words` table for real-time content moderation across all user inputs.

### Frontend (React/Vite)
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side navigation.
- **Data Fetching**: TanStack Query for data fetching, caching, and synchronization.
- **UI Components**: Shadcn/ui components styled with Tailwind CSS.
- **Form Management**: React Hook Form for robust form handling.

### Key Features
- **Secure Authentication**: Registration, login, email verification, and onboarding enforcement.
- **Protected Content Uploads**: Requires email verification and onboarding completion for gaming clip and screenshot uploads.
- **Protected Social Features**: Email verification is required for reactions, likes, and messaging.
- **Content Filtering**: Automated profanity and inappropriate content detection system.
- **Unified XP & Points System**: Views award both XP (for leveling) and Points (for leaderboards) - 1 XP and 1 Point per view on clips/reels/screenshots. Additional points earned through: Uploads (10pts), Likes (2pts), Comments (5pts), Fire reactions (3pts).
- **Leveling System**: Progressive XP thresholds (Level 1=0, Level 2=100, Level 3=500, etc.) with level display on user profiles marked with Trophy icon.
- **Leaderboard System**: Weekly and monthly leaderboards tracking uploads, likes, comments, fires, and views with comprehensive ranking system.
- **Admin Panel**: Comprehensive user management, content moderation, and user deletion features.
- **Multi-game Support**: Integration with Twitch API for game data retrieval and automatic game creation.
- **Adaptive URL Support**: Email verification URLs dynamically adapt to development, Replit, and custom production environments.
- **Post-Upload Workflow**: Seamless redirection to user profile with automatic share dialog display after content uploads.

### Verification & Access Control
- **Registration Flow**: User registers, is automatically logged in, and a verification email is sent.
- **Email Verification**: Token-based verification is mandatory for core social features.
- **Onboarding Requirement**: Users must complete `userType` and `ageRange` to upload content.
- **Graduated Access**: Different protection levels are applied to various feature types (e.g., full access middleware vs. email verification middleware).
- **Error Guidance**: Clear error messages and verification codes guide users through access issues.

## External Dependencies
- **Supabase**: Primary database (PostgreSQL), authentication services, and storage for user-uploaded content.
- **Twitch API**: Used for fetching game data and populating game information within the platform.
- **bad-words (NPM package)**: Utilized for content filtering and profanity detection.
- **TUS (protocol/system)**: Used for robust video upload and processing, especially for reels with specific aspect ratios.
- **connect-pg-simple**: For managing user sessions persistently in the PostgreSQL database.
- **passport-local**: For local strategy authentication.
- **multer**: Middleware for handling `multipart/form-data`, primarily for file uploads.
- **Wouter**: Small routing library for React.
- **TanStack Query**: For server state management and data fetching.
- **Shadcn/ui**: Component library built on Tailwind CSS.
- **React Hook Form**: For form validation and submission.
- **Postgres (NPM package)**: Direct PostgreSQL client for database interaction.
```