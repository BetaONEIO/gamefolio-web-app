# Gamefolio - Gaming Portfolio & Social Platform

## Run & Operate
- To run: `npm start`
- To build: `npm run build`
- To typecheck: `npm run typecheck`
- To generate Drizzle ORM migrations: `drizzle-kit generate:pg`
- To push DB schema: `drizzle-kit push:pg`
- **Required Environment Variables**:
    - `DATABASE_URL`: PostgreSQL connection string (Supabase)
    - `JWT_SECRET`: Secret for JWT token signing
    - `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`: For Twitch API integration
    - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For Google OAuth (Firebase)
    - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`: For Discord OAuth
    - `VITE_MICROSOFT_CLIENT_ID`, `XBL_API_KEY`: For Xbox Live OAuth
    - `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`: For Kick OAuth
    - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`: For Stripe payments
    - `TREASURY_PRIVATE_KEY`: Private key for the GFT treasury wallet
    - `WALLET_ENCRYPTION_KEY`: Key for encrypting user private keys
    - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: For SMS alerts
    - `PAGERDUTY_ROUTING_KEY`: For PagerDuty alerts
    - `ADMIN_ALERT_EMAIL`, `ADMIN_ALERT_SLACK_WEBHOOK_URL`: Fallbacks for admin alerts
    - `SKALE_BASE_MAINNET` contract addresses for GFT, NFT, Staking, and Sale.

## Stack
- **Frontend**: React 18, TypeScript, Wouter, Shadcn/ui, Tailwind CSS, React Hook Form, TanStack Query
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase PostgreSQL with Drizzle ORM and `postgres` library
- **Authentication**: `passport-local`, `jsonwebtoken`, Firebase, Discord, Xbox Live, Kick, Twitch OAuth
- **File Uploads**: `multer`, TUS protocol, Supabase Storage
- **Blockchain**: SKALE Base Mainnet, Ethers.js, Wagmi, `@0xsequence/waas`
- **Payments**: Stripe Elements, RevenueCat
- **Mobile**: Capacitor (iOS/Android)

## Where things live
- `client/`: Frontend application
    - `client/src/components/`: Reusable UI components
    - `client/src/lib/`: Platform-specific utilities and helpers (e.g., `platform.ts`, `mobile-init.ts`, `native-auth-bridge.ts`)
    - `client/src/hooks/`: Custom React hooks
    - `client/src/index.css`: Global styles and safe-area utilities
- `server/`: Backend API and services
    - `server/db/schema.ts`: Database schema definition (source of truth)
    - `server/routes/`: API routes (e.g., `social-oauth.ts`, `pro-subscription.ts`, `token-auth.ts`)
    - `server/services/`: Backend services (e.g., `leaderboard-service.ts`, `streak-service.ts`, `admin-alert-service.ts`)
- `shared/`: Shared types and constants
    - `shared/contracts.ts`: Blockchain contract addresses and configurations (source of truth for chain IDs and contract addresses)
- `ios/App/App/Info.plist`: iOS app configuration (deep-link scheme, privacy usage descriptions)
- `android/app/src/main/AndroidManifest.xml`: Android app configuration (deep-link intent-filter, permissions)
- `capacitor.config.ts`: Capacitor configuration

## Architecture decisions
- **Hybrid Authentication**: Uses session-based for traditional web and JWT for API calls, with social OAuth integrations. Native mobile uses Capacitor for deep-link based OAuth flows.
- **Server-side Wallet Generation**: Ethers.js is used to auto-create wallets for verified users, encrypting private keys and storing them in the DB for simplified Web3 onboarding.
- **On-chain GF Token Economy**: All GFT transactions and balances are fully on-chain on SKALE Base Mainnet, using a treasury wallet for purchases, enhancing transparency and Web3 integration.
- **RevenueCat for Native Subscriptions**: Pro subscriptions on iOS/Android are exclusively managed via RevenueCat (IAP) to comply with app store policies, while web uses Stripe Elements. GFT purchases are web-only for now.
- **Dynamic URL Adaptation**: Backend and frontend dynamically adjust API endpoints and redirect URIs based on the deployment environment (development, Replit, production) for flexible deployment.

## Product
- Gamified user engagement with XP, leveling, streaks, and leaderboards.
- Comprehensive content sharing (clips, screenshots) with moderation and social features.
- Streamer profiles with embedded Twitch/Kick streams and live indicators.
- Web3 integration: GF Token economy, NFT marketplace, simplified wallet creation.
- Admin panel for user, content, and asset management.
- Multi-game support with Twitch API integration and custom game creation.
- Pro subscription with exclusive features (animated GIFs, ad-free experience, premium borders).
- Robust native mobile app support for iOS and Android with deep-linking and secure data handling.
- Admin alert system with multi-channel notifications (email, Slack, SMS, PagerDuty).
- Profile customization with custom fonts, background colors, and effects.

## User preferences
- Focus on using only authentic Supabase data sources
- Maintain scalable, cloud-first architecture
- Prioritize data integrity and security
- Prefer comprehensive solutions over quick fixes

## Gotchas
- **Native Builds**: After pulling changes involving new Capacitor plugins (e.g., `@capacitor/share`), run `npx cap sync` (or `npm run cap:sync`) before building for iOS/Android.
- **Stripe Webhooks**: Ensure `STRIPE_WEBHOOK_SECRET` is set directly; the Replit Stripe connector is not used. Required events are `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.
- **OAuth Callbacks**: For Xbox/Discord native auth, register `{app-url}/api/auth/mobile/{provider}/callback` as redirect URIs. For Kick, register `{app-url}/api/auth/kick/callback`.
- **Media Access on iOS**: Update `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` strings in `ios/App/App/Info.plist` if media access patterns change, to avoid Apple rejections.
- **Fixed Position Overlays**: Any new fixed-position UI elements near device edges must use `.safe-area-top`, `.safe-area-bottom`, `.safe-area-left`, or `.safe-area-right` utility classes to avoid being obscured by iOS notches or home indicators.

## Pointers
- **Drizzle ORM Docs**: [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
- **Shadcn/ui Docs**: [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **TanStack Query Docs**: [https://tanstack.com/query/latest/docs/react/overview](https://tanstack.drizzle.team/docs/overview)
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Capacitor Docs**: [https://capacitorjs.com/docs](https://capacitorjs.com/docs)
- **SKALE Network**: [https://skale.space/](https://skale.space/)
- **Sequence WaaS SDK**: [https://docs.sequence.build/waas](https://docs.sequence.build/waas)
- **Stripe Elements Docs**: [https://stripe.com/docs/elements](https://stripe.com/docs/elements)
- **RevenueCat Docs**: [https://www.revenuecat.com/docs/](https://www.revenuecat.com/docs/)
- **Twilio SMS API**: [https://www.twilio.com/docs/sms/api](https://www.twilio.com/docs/sms/api)
- **PagerDuty Events API v2**: [https://developer.pagerduty.com/docs/events-api-v2/](https://developer.pagerduty.com/docs/events-api-v2/)