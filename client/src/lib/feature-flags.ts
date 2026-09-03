// Temporary release-scoping flags. Bounty campaigns are being split into a
// separate build — flip these back to true to restore every "New Campaign" /
// "Bounties" entry point at once (Header dropdown, indie dashboard tabs,
// studio profile tabs, home page CTAs, etc).
export const CAMPAIGNS_ENABLED = false;
export const BOUNTIES_ENABLED = false;
export const GAME_KEYS_ENABLED = false;
export { GAME_DEVELOPER_PRO_PURCHASES_ENABLED } from "@shared/feature-flags";

// Game Developer onboarding and dashboard features are approved for release.
export const GAME_DEVELOPER_FEATURES_ENABLED = true;

// Hosted game builds. Off until Cloudflare R2 is provisioned — the server
// refuses uploads without it (see server/r2-storage.ts), so this only controls
// whether developers are shown a tab they cannot yet use.
export const GAME_BUILDS_ENABLED = false;
