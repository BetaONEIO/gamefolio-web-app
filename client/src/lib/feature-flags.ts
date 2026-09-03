// Temporary release-scoping flags. Bounty campaigns are being split into a
// separate build — flip these back to false to hide every "New Campaign" /
// "Bounties" entry point at once (Header dropdown, indie dashboard tabs,
// studio profile tabs, home page CTAs, etc).
export const CAMPAIGNS_ENABLED = true;
export const BOUNTIES_ENABLED = true;
export const GAME_KEYS_ENABLED = true;
export { GAME_DEVELOPER_PRO_PURCHASES_ENABLED } from "@shared/feature-flags";

// Game Developer onboarding and dashboard features are approved for release.
export const GAME_DEVELOPER_FEATURES_ENABLED = true;
