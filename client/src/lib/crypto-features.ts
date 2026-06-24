import { isNative } from "./platform";

/**
 * Master switch for all cryptocurrency / wallet / NFT / GFT-token / staking
 * surfaces in the app.
 *
 * These are DISABLED on native (Capacitor) builds — the iOS App Store and
 * Google Play "Financial features → Cryptocurrency" policies require
 * per-country financial licensing we don't currently hold, so the shipped
 * mobile binaries must not offer crypto features at all. The web client
 * (app.gamefolio.com) keeps everything.
 *
 * `VITE_CRYPTO_FEATURES` can force the flag either way for testing
 * (e.g. to preview the blocked native experience in a web dev server, or to
 * temporarily re-enable on a native debug build):
 *   VITE_CRYPTO_FEATURES=false  -> always off
 *   VITE_CRYPTO_FEATURES=true   -> always on
 * When unset, the flag follows the platform: off on native, on for web.
 */
const override = import.meta.env.VITE_CRYPTO_FEATURES as string | undefined;

export const CRYPTO_FEATURES_ENABLED: boolean =
  override === "true" ? true : override === "false" ? false : !isNative;
