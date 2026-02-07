# Gamefolio - Gaming Portfolio & Social Platform

## Overview
Gamefolio is a comprehensive gaming portfolio and social platform for gamers to showcase clips, build portfolios, connect, and compete. It aims to provide a robust, secure, and engaging environment with content sharing, real-time messaging, and moderation, along with a unique GF Token economy for NFTs and a subscription model for premium features. The project envisions significant market potential by integrating Web3 gaming elements and fostering a vibrant gaming community.

## User Preferences
- Focus on using only authentic Supabase data sources
- Maintain scalable, cloud-first architecture
- Prioritize data integrity and security
- Prefer comprehensive solutions over quick fixes

## System Architecture

### UI/UX
- **Frontend Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side navigation.
- **UI Components**: Shadcn/ui components styled with Tailwind CSS.
- **Form Management**: React Hook Form for robust form handling.
- **Post-Upload Workflow**: Seamless redirection to user profile with automatic share dialog.

### Technical Implementations
- **Database**: Supabase PostgreSQL, managed with Drizzle ORM and `postgres` library.
- **Backend**: Node.js/Express with TypeScript.
- **Authentication**: Hybrid session-based (`passport-local`) and JWT token-based (`jsonwebtoken`) authentication.
- **Content Moderation**: `bad-words` library integrated with a Supabase `banned_words` table for real-time filtering.
- **File Uploads**: `multer` for general file uploads and Supabase storage. TUS protocol for robust video uploads.
- **Data Fetching**: TanStack Query for data fetching, caching, and synchronization.
- **Session Management**: `connect-pg-simple` for PostgreSQL-backed sessions.
- **Email Verification**: Token-based system for user verification and access control.
- **Adaptive URLs**: Dynamic adaptation for development, Replit, and production environments.

### Feature Specifications
- **Authentication & Access**: Secure registration, login, email verification, and onboarding. Graduated access based on verification and onboarding status.
- **Points System**: Unified system for leveling and leaderboards based on user engagement (uploads, likes, comments, reactions, views).
- **Leveling System**: Progressive levels based on total points with profile display.
- **Leaderboard System**: Weekly and monthly leaderboards tracking various engagement metrics.
- **Streak System**: Tracks continuous app usage with milestone bonuses.
- **Admin Panel**: Comprehensive tools for user management, content moderation, and system synchronization.
- **Multi-game Support**: Integration with Twitch API for game data and automatic game creation.
- **GF Token Economy**: In-app currency for NFT purchases, starting balance for new users, and on-chain/off-chain balance management.
- **NFT Marketplace**: Store for purchasing NFT avatars with GF tokens, with balance checks and wallet requirements.
- **Simplified Wallet Creation**: Server-side wallet generation using ethers.js (no OTP required). Wallets auto-created when verified users visit the wallet page or complete onboarding. Uses `useAutoWallet` hook for instant creation.
- **Stripe Elements Payment Integration**: Custom white-label card entry screen for GFT token purchases using Stripe Elements (`@stripe/react-stripe-js`). No Stripe branding visible. Flow: BuyGFTScreen → ReviewOrderScreen → CardEntryScreen → BuyGFTResultScreen. Components: `CardEntryScreen` with CardNumberElement, CardExpiryElement, CardCvcElement. Backend: `/api/stripe/config` for publishable key, `/api/gf/create-payment-intent` for PaymentIntent creation. Webhook handles `payment_intent.succeeded` for token delivery.
- **Wallet Homepage (Desktop)**: Desktop-optimized wallet dashboard with 3-column layout, animated balance card, Portfolio/Staking tabs, quick stats sidebar, and transaction history. Components in `client/src/components/wallet/`.
- **RevenueCat Integration**: Pro subscription management via `@revenuecat/purchases-js` SDK, syncing subscription status to the database. Used for entitlement checking; checkout UI is handled by custom Stripe Elements flow.
- **Pro Subscription Stripe Checkout**: Custom white-label checkout for Pro subscriptions using Stripe Elements. Flow: ProUpgradeDialog plan selection → custom checkout screen (CardNumberElement, CardExpiryElement, CardCvcElement, country dropdown, postal code) → success screen. Backend: `/api/stripe/create-pro-subscription` creates incomplete Stripe Subscription and returns clientSecret, `/api/stripe/confirm-pro-subscription` activates Pro status after payment. Stripe price IDs configured via `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID` env vars. Route file: `server/routes/pro-subscription.ts`. Plans: Monthly (£2.99/month), Yearly (£30.00/year).
- **Video Ads System**: Google IMA SDK integration for monetization with 25% chance on clips, every 5 reels for non-Pro users. Pro subscribers are exempt from all ads.
- **Animated GIF Avatars**: Pro users can upload animated GIF profile pictures that preserve animation. Non-Pro users' GIFs are automatically converted to static JPEG images with appropriate messaging.
- **Name Tags Store & Lootbox Integration**: Name tags stored in `gamefolio-name-tags` Supabase bucket. Purchasable in store with GF tokens (common: 50, rare: 150, epic: 350, legendary: 750 GF). 20% chance to win from daily lootbox. APIs: `/api/store/name-tags` (list), `/api/store/purchase-name-tag` (buy with off-chain GF balance), `/api/admin/name-tags/sync-bucket` (admin sync from bucket). Frontend: Name Tags section in StorePage.tsx Buy tab.
- **Profile Picture Borders Store & Lootbox Integration**: Pro-exclusive profile picture borders stored in `gamefolio-profile-borders` Supabase bucket. Purchasable in store with GF tokens (common: 50 GF, rare: 150 GF, epic: 350 GF, legendary: 750 GF) — Pro subscription required for purchase and use. 3% chance to win from daily lootbox (non-Pro users see upgrade prompt). Database tables: `profile_borders` (border definitions) and `user_unlocked_borders` (user ownership). Users table has `selectedBorderId` field for active border. APIs: `/api/store/borders` (list), `/api/store/purchase-border` (buy with Pro check + off-chain GF balance), `/api/admin/borders/sync-bucket` (admin sync from bucket). Frontend: Profile Borders section in StorePage.tsx Buy tab with greyed-out overlay for non-Pro users. Components: `ProUpgradeDialog` for border paywall. Lootbox uses `assetType: 'profile_border'` with negative ID offset `-10000 - borderId`.

### System Design Choices
- **Cloud-first Architecture**: Emphasizes scalability and leverages Supabase for core services.
- **Data Integrity**: Prioritizes secure and consistent data handling through Drizzle ORM and PostgreSQL.
- **Hybrid Authentication**: Provides flexibility for web and desktop/mobile clients.
- **Microservice-like Structure**: Logical separation of concerns within the backend for features like authentication, file uploads, and content filtering.

## External Dependencies
- **Supabase**: PostgreSQL database, authentication, and storage services.
- **Twitch API**: Game data retrieval.
- **Sequence WaaS**: Email-based blockchain wallet authentication on SKALE Nebula Testnet (chainId 37084624). Uses `@0xsequence/waas` SDK with OTP verification flow.
- **bad-words (NPM package)**: Content filtering and profanity detection.
- **TUS (protocol)**: Robust video upload and processing.
- **connect-pg-simple**: PostgreSQL-backed session management.
- **passport-local**: Local authentication strategy.
- **multer**: `multipart/form-data` handling for file uploads.
- **Wouter**: React routing library.
- **TanStack Query**: Server state management and data fetching.
- **Shadcn/ui**: UI component library.
- **React Hook Form**: Form validation and submission.
- **Postgres (NPM package)**: Direct PostgreSQL client.
- **@revenuecat/purchases-js**: RevenueCat Web Billing SDK for subscription management.