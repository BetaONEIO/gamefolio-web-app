# Threat Model

## Project Overview

Gamefolio is a publicly deployed gaming portfolio and social platform with a React/TypeScript frontend and a Node.js/Express backend backed by PostgreSQL via Drizzle. It supports local credentials, session auth, JWT auth for native/desktop clients, several social login flows, user-generated media uploads, direct messaging, admin tooling, custodial wallet generation, on-chain GFT/NFT flows, and Stripe/RevenueCat purchase flows. Production scope for this scan is the public deployment at `app.gamefolio.com`; mockup sandbox and development-only artifacts are out of scope unless production reachability is demonstrated.

## Assets

- **User accounts and authentication state** — local passwords, session cookies, JWT access/refresh tokens, password reset and email verification flows, and linked social identities. Compromise enables account takeover and downstream fraud.
- **User profile and social data** — email addresses, usernames, DMs, social graph, moderation reports, private preferences, and uploaded media. Exposure affects privacy and user trust.
- **Administrative capabilities** — moderation, content export, game/store management, points adjustments, and alert settings. Abuse would let an attacker alter platform state at scale.
- **Payment and entitlement state** — Stripe/RevenueCat subscription status, store purchases, token balances, NFT minting records, and purchase reconciliation tables. Integrity failures can create fraudulent entitlements or financial loss.
- **Custodial wallet material and blockchain authority** — encrypted user private keys, treasury private key, wallet-link proofs, mint/refund flows, and token/NFT ownership mappings. Compromise can directly move on-chain assets.
- **Application and third-party secrets** — database credentials, JWT secret, OAuth client secrets, Supabase service-role credentials, Twilio/PagerDuty/Slack credentials, and Firebase admin credentials.
- **Operational telemetry** — API logs, error output, admin alerts, and any persisted workflow/browser logs. These may contain sensitive user or payment data if responses are logged too broadly.

## Trust Boundaries

- **Browser/mobile/desktop client to API** — all request bodies, query params, headers, uploaded files, OAuth callback data, and JWTs are attacker-controlled until validated.
- **Public to authenticated to verified-user to admin** — the application has many public read endpoints plus progressively more privileged write/admin operations. Every boundary must be enforced server-side, not inferred from client UI.
- **API to PostgreSQL** — backend code can read and modify all persisted user, entitlement, and wallet data. Injection or broken authorization here has high impact.
- **API to Supabase Storage** — the server can mint signed URLs and perform storage operations using elevated credentials. Incorrect access checks can expose private media.
- **API to external identity/payment/blockchain providers** — OAuth providers, Stripe, RevenueCat, Twitch/Kick/Xbox, Firebase, and SKALE are all external trust anchors whose callbacks/tokens/webhooks must be verified.
- **Server-managed wallet boundary** — the backend can act on behalf of users and the treasury using encrypted keys and environment secrets. Any spoofing or access-control bug near wallet flows has outsized impact.
- **Development/internal to production** — setup helpers, migration scripts, demo/test users, and dev-only tooling must not remain production reachable or auto-enabled in the public deployment.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, route modules under `server/routes/`, auth middleware under `server/middleware/`, storage/DB services under `server/storage.ts` and `server/database-storage.ts`.
- **Highest-risk areas:** `server/routes/token-auth.ts`, `server/routes/auth-routes.ts`, `server/routes/social-oauth.ts`, `server/routes/admin.ts`, `server/routes/store.ts`, `server/routes/pro-subscription.ts`, `server/routes/mint-nft.ts`, `server/routes/gamefolio-purchases.ts`, wallet crypto/services, and upload/Supabase storage paths.
- **Surface split:** public marketing/profile/content routes; authenticated user mutation routes; admin routes; payment/webhook/wallet flows; upload and signed-URL flows.
- **Legacy routes remain in scope when mounted:** deprecated helpers in `server/routes.ts` and `server/routes/quick-sell.ts` are production-relevant if they are still registered under the main Express app, even when newer hardened replacements exist elsewhere.
- **Direct object fetch endpoints need separate review from profile/list pages:** privacy checks on profile or listing routes do not automatically protect `/api/clips/:id`, `/api/reels/:id`, `/api/screenshots/:id`, share-code routes, thumbnail redirects, or download endpoints.
- **Usually dev-only unless proven otherwise:** local scripts under `server/scripts/`, migration helpers, test harnesses, mock/demo content, native build metadata, and sandbox-only assets.

## Threat Categories

### Spoofing

Gamefolio relies on local credentials, sessions, JWTs, and multiple third-party identity providers. The backend must cryptographically verify externally issued identity claims before creating or logging in accounts, and every protected endpoint must require valid server-side authentication tied to the acting user. Mobile/desktop token issuance routes are especially sensitive because they bypass browser cookie protections and can directly mint bearer tokens.

### Tampering

Attackers can submit arbitrary profile data, uploads, wallet addresses, purchase parameters, and on-chain transaction references. The server must treat all client-supplied business data as untrusted, derive security-sensitive values server-side where possible, and bind off-platform actions (OAuth callbacks, purchases, linked wallets, blockchain transfers) to the authenticated user before mutating entitlements or account state.

### Information Disclosure

The application stores personal data, direct messages, uploaded media, wallet addresses, and administrative/export data. API responses, signed URLs, logs, and error messages must not expose data across user boundaries or leak secrets, tokens, or sensitive response bodies. Public content/profile endpoints should only expose intentionally public fields, while private/account/admin data must remain scoped to the authorized principal.

### Denial of Service

The public deployment exposes many unauthenticated routes, large request parsers, file/media upload paths, blockchain/payment operations, and external API integrations. Public endpoints must not allow cheap resource exhaustion through oversized bodies, unbounded uploads, repeated auth attempts, or attacker-triggered expensive downstream work.

### Elevation of Privilege

This project contains clear privilege tiers from anonymous visitors through normal users, verified users, and admins, plus special financial authority in payment and wallet flows. Server-side authorization must ensure users can only modify their own profiles, content, wallets, purchases, and messages; admin-only capabilities must never be reachable through missing middleware or parameter tampering; and injection or auth bypass near DB/wallet routes must be treated as high impact.
