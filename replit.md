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
- **Authentication**: Hybrid authentication system supporting both session-based (web) and JWT token-based (desktop/mobile) authentication.
  - **Web**: `passport-local` for session-based user authentication.
  - **Desktop/Mobile**: JWT tokens (7-day access, 30-day refresh) via `jsonwebtoken`.
  - **Hybrid Middleware**: Accepts both session cookies and Bearer tokens for maximum flexibility.
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
- **Points System**: Single unified points system for both leveling and leaderboards. Points earned: Uploads (5pts), Likes (1pt), Comments (1pt), Fire reactions (3pts), Views (1pt). Total points determine user level.
- **Leveling System**: Progressive thresholds based on total points (Level 1: 0pts, Level 2: 100pts, Level 3: 500pts, etc.) with level display on user profiles marked with Trophy icon.
- **Leaderboard System**: Weekly and monthly leaderboards tracking uploads, likes, comments, fires, and views with comprehensive ranking system.
- **Streak System**: Continuous streak tracking where users earn +1 streak each time they use the application, regardless of gaps between logins. Milestone bonuses awarded at 3, 7, 14, 30, 60, 90, 180, and 365 days.
- **Admin Panel**: Comprehensive user management, content moderation, user deletion, points/level synchronization, and streak management tools with dedicated tabs for each feature.
- **Multi-game Support**: Integration with Twitch API for game data retrieval and automatic game creation.
- **Adaptive URL Support**: Email verification URLs dynamically adapt to development, Replit, and custom production environments.
- **Post-Upload Workflow**: Seamless redirection to user profile with automatic share dialog display after content uploads.
- **GF Token Economy**: In-app currency system (Gamefolio Tokens) for NFT purchases and marketplace transactions. Users start with 1,000 GF tokens (≈$50 USD value at $0.05/token).

### Verification & Access Control
- **Registration Flow**: User registers, is automatically logged in, and a verification email is sent.
- **Email Verification**: Token-based verification is mandatory for core social features.
- **Onboarding Requirement**: Users must complete `userType` and `ageRange` to upload content.
- **Graduated Access**: Different protection levels are applied to various feature types (e.g., full access middleware vs. email verification middleware).
- **Error Guidance**: Clear error messages and verification codes guide users through access issues.

## External Dependencies
- **Supabase**: Primary database (PostgreSQL), authentication services, and storage for user-uploaded content.
- **Twitch API**: Used for fetching game data and populating game information within the platform.
- **Crossmint** (In Development): Blockchain wallet infrastructure for Web3 gaming features, NFT minting, and digital asset ownership.
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

## Crossmint Wallet Integration (SKALE Network)
- **Blockchain Network**: SKALE Nebula Hub Testnet - zero gas fee blockchain optimized for gaming and Web3 applications
- **Native Currency**: sFUEL (free gas token for SKALE network)
- **Wallet Setup Approach**: Simplified two-option system during onboarding:
  1. **Create Crossmint wallet**: Uses `getOrCreateWallet()` API pattern - automatically retrieves existing wallet or creates new one on SKALE
  2. **Skip for now**: Configure wallet later from profile
- **SDK Integration**: Uses official `@crossmint/wallets-sdk` with SKALE support via Crossmint-SKALE partnership (December 2024)
- **Chain Configuration**: Wallets created on `skale-nebula-testnet` chain with EVM smart wallet type
- **Idempotent Wallet Creation**: Backend implements `getOrCreateWallet()` pattern that intelligently handles both new wallet creation and existing wallet retrieval without errors
- **Smart Response Handling**: API returns `isExisting` flag to differentiate between new wallet creation and existing wallet retrieval
- **Context-Aware UX**: Toast messages adapt based on whether user connected to existing wallet ("Wallet connected!") or created new one ("Wallet created!")
- **Security Focus**: Manual wallet address entry removed to prevent spoofing attacks; all wallets created through verified Crossmint API
- **Onboarding Integration**: Wallet creation step appears after age selection in the onboarding flow with streamlined interface
- **Database Schema**: User table includes `walletAddress`, `walletChain` (defaults to `skale-nebula-testnet`), `walletCreatedAt`, and `gfTokenBalance` fields
- **Frontend Provider**: `CrossmintProvider` manages wallet state globally across the application
- **Wallet Page**: Complete UI at `/wallet` for viewing wallet information, accessing SKALE block explorer, and Crossmint dashboard
- **Block Explorer Support**: Integrated SKALE block explorers for all major hubs (Nebula, Calypso, Europa, Titan) for both mainnet and testnet
- **API Endpoints**: 
  - `POST /api/wallet/create` - Idempotent wallet creation/retrieval via Crossmint SDK on SKALE network (returns `address`, `chain`, `isExisting`)
  - `GET /api/wallet/info` - Retrieves wallet information for authenticated user
- **Current Implementation**: Users can create SKALE wallets via Crossmint or skip setup entirely
- **Optional Feature**: Users can skip wallet setup during onboarding and set it up later from profile
- **SKALE Benefits**: Zero gas fees for transactions, instant finality, full Ethereum compatibility

## NFT Store & GF Token Economy
- **GF Token System**: Hybrid on-chain and off-chain currency system for purchasing NFTs and marketplace features
  - **Starting Balance**: New users receive 1,000 GF tokens by default (off-chain database)
  - **Token Value**: Each GF token has an approximate value of $0.05 USD
  - **Display**: GF token logo appears next to all prices and balances throughout the store
  - **Smart Contract**: Deployed ERC-20 token on SKALE Nebula Hub Testnet at `0x2Db1fFAbbc41b8667B408a5F5e0E42bB6c6BA7f7`
  - **Blockchain Integration**: Uses viem library to read on-chain token balances from SKALE network
  - **Dual Balance System**: 
    - **On-Chain Balance**: Real GF tokens stored on SKALE blockchain (displayed in wallet page)
    - **Off-Chain Balance**: Database-tracked tokens for in-app transactions
  - **API Endpoints**:
    - `GET /api/token/info` - Fetch token metadata from smart contract (name, symbol, decimals, total supply)
    - `GET /api/token/balance` - Get user's on-chain GF token balance from SKALE
- **NFT Marketplace**: 
  - **Store Page**: Browse and purchase NFT avatars using GF tokens at `/store`
  - **Purchase Dialog**: Modal interface for NFT bidding with wallet connection status, balance verification, and transaction summary
  - **NFT Pricing**: All NFTs priced in GF tokens (e.g., 250 GF, 500 GF) with USD equivalent displayed
  - **Balance Checks**: Real-time validation of user's GF token balance before purchase
  - **Wallet Requirement**: Users must have a Crossmint wallet connected to purchase NFTs
- **Purchase Flow**:
  1. User clicks "Buy" on any NFT in the store
  2. Purchase dialog opens showing NFT preview, current bid, and price in GF tokens
  3. System checks wallet connection and GF token balance
  4. User confirms purchase, GF tokens are deducted, NFT is transferred to wallet
- **UI Components**:
  - **NFTPurchaseDialog**: Complete purchase modal with wallet status, balance display, and bid placement
  - **GF Token Logo**: Displayed alongside all currency amounts in store and dialogs
  - **Balance Display**: Sidebar shows user's current GF token balance with USD equivalent
- **Future Features**: NFT minting for gaming clips, user-to-user trading, earning GF tokens through engagement, token purchases with real currency, multi-chain NFT support
```