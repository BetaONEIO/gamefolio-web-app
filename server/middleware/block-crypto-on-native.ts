import type { Request, Response, NextFunction } from 'express';

/**
 * Blocks cryptocurrency / wallet / NFT / GFT-token / staking API endpoints for
 * requests coming from the native (Capacitor) mobile apps.
 *
 * The mobile binaries ship with all crypto UI removed (see the client-side
 * `CRYPTO_FEATURES_ENABLED` flag), but the same backend also serves the web
 * client at app.gamefolio.com — which keeps full crypto functionality. To make
 * the shipped iOS/Android apps genuinely incapable of facilitating crypto
 * transactions (App Store / Play "Financial features → Cryptocurrency"
 * compliance), the native client tags every request with an `X-GF-Platform`
 * header (`ios` / `android`, set in client/src/lib/platform.ts). When that
 * header is present we refuse the transactional crypto routes outright.
 *
 * Web requests never carry the header, so the web app is unaffected.
 *
 * Read-only media that merely *renders* pre-existing content (NFT images,
 * thumbnails, metadata) is intentionally NOT blocked, so a user who set an NFT
 * avatar on the web still shows correctly on mobile — that is display, not a
 * financial feature.
 */

// Path prefixes that move tokens / NFTs / fiat or manage wallets. Matched
// against req.path. Keep in sync with the client crypto surfaces.
const BLOCKED_PREFIXES = [
  '/api/gf/',          // GFT fiat checkout + orders
  '/api/me/wallet',    // wallet summary
  '/api/wallet/',      // create / link / activity / info
  '/api/token/',       // token info / balance / orders
  '/api/treasury/',    // treasury address + balance
  '/api/staking/',     // stake / unstake / claim
  '/api/mint/',        // NFT minting + approvals
  '/api/marketplace/', // NFT marketplace buy/sell
  '/api/nfts/',        // owned-NFT listings (NFT collection surfaces)
];

// Store purchase flows are paid in GFT on-chain, so they are crypto too. The
// non-purchase store paths (catalog GETs) are matched specifically to avoid
// over-blocking anything reused for displaying already-owned cosmetics.
const BLOCKED_STORE_FRAGMENTS = ['purchase', 'intent', 'verify-'];

function isBlockedPath(path: string): boolean {
  if (BLOCKED_PREFIXES.some((p) => path.startsWith(p))) return true;
  if (path.startsWith('/api/store/')) {
    return BLOCKED_STORE_FRAGMENTS.some((frag) => path.includes(frag));
  }
  return false;
}

export function blockCryptoOnNative(req: Request, res: Response, next: NextFunction) {
  const platform = String(req.headers['x-gf-platform'] || '').toLowerCase();
  const isNativeClient = platform === 'ios' || platform === 'android';

  if (isNativeClient && isBlockedPath(req.path)) {
    return res.status(403).json({
      error: 'crypto_features_unavailable',
      message: 'Cryptocurrency features are not available in the mobile app.',
    });
  }

  next();
}
