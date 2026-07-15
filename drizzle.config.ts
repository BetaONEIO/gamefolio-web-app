import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Tables that exist in the live database but aren't declared anywhere via
// Drizzle's pgTable (managed by other libraries/services, or legacy — e.g.
// connect-pg-simple's session store, an OAuth server package). Without this,
// `db:push` treats them as rename-candidates against any newly added table
// and refuses to proceed without an interactive TTY prompt to disambiguate.
// Excluding them here is purely additive: push simply ignores them, it never
// creates, alters, or drops anything in this list.
const nonDrizzleManagedTables = [
  "_migrations",
  "session",
  "oauth_access_tokens",
  "oauth_authorization_codes",
  "oauth_clients",
  "oauth_refresh_tokens",
  "api_keys",
  "bookmarks",
  "campaign_bounty_submissions",
  "campaign_instances",
  "campaign_participants",
  "campaign_template_bounties",
  "campaign_templates",
  "folio_updates",
  "game_key_batches",
  "game_keys",
  "live_streams",
  "nft_mint_payments",
  "nft_mint_refunds",
  "nft_watcher_state",
  "profile_themes",
  "store_nft_purchases",
  "user_nfts",
];

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: nonDrizzleManagedTables.map((t) => `!${t}`),
});
