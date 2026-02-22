# Gamefolio - Gaming Portfolio & Social Platform

## Overview
Gamefolio is a comprehensive gaming portfolio and social platform for gamers to showcase clips, build portfolios, connect, and compete. It aims to provide a robust, secure, and engaging environment with content sharing, real-time messaging, and moderation, along with a unique GF Token economy for NFTs and a subscription model for premium features. The project envisions significant market potential by integrating Web3 gaming elements and fostering a vibrant gaming community.

## User Preferences
- Focus on using only authentic Supabase data sources
- Maintain scalable, cloud-first architecture
- Prioritize data integrity and security
- Prefer comprehensive solutions over quick fixes

## Recent Changes (Feb 2026 - CodeRabbit Review Fixes)
- **Error Boundaries**: Added `ErrorBoundary` component (`client/src/components/ErrorBoundary.tsx`) wrapping App root and Router for crash resilience
- **Firebase Auth Race Condition**: Added mounted flag to `use-auth.tsx` to prevent state updates on unmounted components; added `setLocation` to deps
- **Theme Hook Fix**: Removed stale closure in `use-theme.tsx` by applying CSS vars directly in useEffect with `accentColor` dependency
- **Upload Cancellation**: Added `AbortController` to upload mutations in `UploadPage.tsx`; `beforeunload` warning during active uploads
- **localStorage Safety**: Wrapped all localStorage access in try/catch across `App.tsx` and `use-theme.tsx`
- **Cache Invalidation**: Removed broad `/api/clips` and `/api/screenshots` invalidation from like mutations in `use-clips.ts`
- **Wallet Sync Guard**: Added `isUpdatingWallet` ref to prevent concurrent wallet address updates in `use-wallet.tsx`
- **Signed URL AbortController**: Replaced cancelled flag with proper `AbortController` in `use-signed-url.ts`
- **ClipDialog Improvements**: Memoized navigation handlers with `useCallback`; added `clip?.videoType` to keyboard listener deps
- **ARIA Accessibility**: Added `role`, `tabIndex`, `aria-label`, and keyboard handlers to `VideoClipCard` and `VideoPlayer` controls
- **Scroll Memoization**: Wrapped `TrendingContentCarousel` scroll handler in `useCallback` in `HomePageSimple.tsx`

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
- **Streak System**: Tracks consecutive daily logins. Awards 10 XP per daily login. Streaks reset if a day is missed. Milestone bonuses every 5 days (day 5, 10, 15, etc.) with scaling XP (25→50→100→200→500→1000). Persistent in-app notifications created for each streak event (type: 'streak'). Admin panel has independent user search for streak management.
- **Admin Panel**: Comprehensive tools for user management, content moderation, and system synchronization. Includes an "Assets" tab for managing assets across 4 Supabase storage buckets (`gamefolio-backgrounds`, `gamefolio-profile-borders`, `gamefolio-name-tags`, `gamefolio-assets`). Assets can be assigned to Lootbox rewards or Store items with configurable rarity, win probability, and pricing. APIs: `/api/admin/assets/assignments` (view assignments), `/api/admin/assets/assign` (assign/update), `/api/admin/assets/unassign` (remove). Hero banner section: 16/7 aspect ratio previews matching homepage layout (gradient overlay, left-aligned text), image upload validation (10MB max, landscape orientation, min 1200×400px), backend Sharp processing (resize to 1920×820px max, optimized progressive JPEG), recommended specs guidance in upload areas.
- **Multi-game Support**: Integration with Twitch API for game data and automatic game creation.
- **GF Token Economy**: In-app currency for NFT purchases. GFT can only be obtained via Stripe purchases (no starting balance, no lootbox rewards). Off-chain balance management only (no on-chain transfers — treasury wallet key does not match the wallet holding tokens). **GF Token Contract**: `0x9c4aC24c7bb36AA3772ccd5aCBCB48a20A1704B7` on SKALE Nebula Testnet. **Owner/Treasury Wallet**: `0x3acd790Bc2338e7bEf21f4F053596f050ADf1Def`.
- **NFT Marketplace**: Store for purchasing NFT avatars with GF tokens, with balance checks and wallet requirements.
- **Simplified Wallet Creation**: Server-side wallet generation using ethers.js (no OTP required). Wallets auto-created when verified users visit the wallet page or complete onboarding. Uses `useAutoWallet` hook for instant creation. **Private keys are encrypted (AES-256-GCM) using `WALLET_ENCRYPTION_KEY` secret and stored in `encrypted_private_key` column.** Server-side signing enabled for approve/mint via `/api/mint/approve`, `/api/mint/mint`, `/api/mint/regenerate-wallet`. Legacy wallets (without stored keys) can be regenerated via the mint page.
- **Stripe Elements Payment Integration**: Custom white-label card entry screen for GFT token purchases using Stripe Elements (`@stripe/react-stripe-js`). No Stripe branding visible. Flow: BuyGFTScreen → ReviewOrderScreen → CardEntryScreen → BuyGFTResultScreen. Components: `CardEntryScreen` with CardNumberElement, CardExpiryElement, CardCvcElement. Backend: `/api/stripe/config` for publishable key, `/api/gf/create-payment-intent` for PaymentIntent creation. Webhook handles `payment_intent.succeeded` for token delivery. **Stripe keys are stored as secrets (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`) and read directly from environment variables** (not via Replit connector).
- **Wallet Homepage (Desktop)**: Desktop-optimized wallet dashboard with 3-column layout, animated balance card, Portfolio/Staking tabs, quick stats sidebar, and transaction history. Components in `client/src/components/wallet/`.
- **RevenueCat Integration**: Pro subscription management via `@revenuecat/purchases-js` SDK, syncing subscription status to the database. Used for entitlement checking; checkout UI is handled by custom Stripe Elements flow.
- **Pro Subscription Stripe Checkout**: Custom white-label checkout for Pro subscriptions using Stripe Elements. Flow: ProUpgradeDialog plan selection → custom checkout screen (CardNumberElement, CardExpiryElement, CardCvcElement, country dropdown, postal code) → success screen. Backend: `/api/stripe/create-pro-subscription` creates incomplete Stripe Subscription and returns clientSecret, `/api/stripe/confirm-pro-subscription` activates Pro status after payment. Stripe price IDs configured via `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID` env vars. Route file: `server/routes/pro-subscription.ts`. Plans: Monthly (£2.99/month), Yearly (£30.00/year).
- **Video Ads System**: Google IMA SDK integration for monetization with 25% chance on clips, every 5 reels for non-Pro users. Pro subscribers are exempt from all ads.
- **Animated GIF Avatars**: Pro users can upload animated GIF profile pictures that preserve animation. Non-Pro users' GIFs are automatically converted to static JPEG images with appropriate messaging.
- **Name Tags Store & Lootbox Integration**: Name tags stored in `gamefolio-name-tags` Supabase bucket. Purchasable in store with GF tokens (common: 50, rare: 150, epic: 350, legendary: 750 GF). 20% chance to win from daily lootbox. APIs: `/api/store/name-tags` (list), `/api/store/purchase-name-tag` (buy with off-chain GF balance), `/api/admin/name-tags/sync-bucket` (admin sync from bucket). Frontend: Name Tags section in StorePage.tsx Buy tab.
- **Profile Picture Borders Store & Lootbox Integration**: Pro-exclusive profile picture borders stored in `gamefolio-profile-borders` Supabase bucket. Purchasable in store with GF tokens (common: 50 GF, rare: 150 GF, epic: 350 GF, legendary: 750 GF) — Pro subscription required for purchase and use. 3% chance to win circle-shaped borders from daily lootbox (non-Pro users see upgrade prompt). Database tables: `profile_borders` (border definitions with `shape` column: 'circle' for regular profile pics, 'square' for NFT profile pics) and `user_unlocked_borders` (user ownership). Users table has `selectedBorderId` field for active border. APIs: `/api/store/borders?shape=circle|square` (list with shape filter), `/api/store/purchase-border` (buy with Pro check + off-chain GF balance), `/api/admin/borders/sync-bucket` (admin sync from bucket, auto-detects 'nft' or 'square' in filename for shape). Frontend: Store page auto-filters borders by shape based on user's NFT profile status (`nftProfileTokenId`). Admin panel shows shape badge (Circle/NFT Square) for each border. Lootbox only awards circle-shaped borders. Components: `ProUpgradeDialog` for border paywall. Lootbox uses `assetType: 'profile_border'` with negative ID offset `-10000 - borderId`.

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