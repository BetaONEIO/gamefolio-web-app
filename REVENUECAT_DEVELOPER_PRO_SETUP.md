# RevenueCat setup for Gamefolio Developer Pro

Developer Pro purchases remain disabled until this checklist has passed. Do not
enable `GAME_DEVELOPER_PRO_PURCHASES_ENABLED` merely because the RevenueCat
objects exist; both stores and the webhook must also be verified.

## Canonical identifiers

| Item | Identifier |
| --- | --- |
| Bundle/application ID | `com.gamefolio.app` |
| RevenueCat entitlement | `indie_dev` |
| RevenueCat offering | `Gamefolio Indie Developer` |
| Monthly package | `$rc_monthly` |
| Annual package | `$rc_annual` |
| iOS monthly product | `gamefolio_indie_dev` |
| iOS annual product | `gamefolio_indie_dev_annual` |
| Android subscription | `gamefolio_indie_dev` |
| Android monthly base plan | `p1m` |
| Android annual base plan | `p1y` |

Target UK prices should match web billing: £3.99 monthly and £42.00 annually.

## Store work

1. In App Store Connect, create the monthly and annual auto-renewable
   subscriptions in one Developer Pro subscription group. Complete pricing,
   localization, review metadata, and availability.
2. In Google Play Console, create `gamefolio_indie_dev` with the `p1m` and
   `p1y` auto-renewing base plans. Complete pricing and availability.
3. Ensure RevenueCat's Apple and Google service credentials are valid and the
   two Gamefolio apps point at `com.gamefolio.app`.

### Live dashboard audit (8 October 2026)

- Both iOS credential sets validate successfully.
- The Android service-account JSON validates, but its account does not have
  access to Google Cloud Pub/Sub. Grant the permissions from RevenueCat's
  Play service-credentials guide, then connect a Google developer-notification
  topic so renewals and cancellations arrive in real time.
- RevenueCat has not received an Apple server-to-server notification yet.
  Use **Apply in App Store Connect** on the Gamefolio iOS app settings (or copy
  the displayed URL into App Store Connect), then verify a sandbox event.
- The `GF` webhook is active for production and sandbox events and recent
  deliveries to `https://app.gamefolio.com/api/revenuecat/webhook` are marked
  sent.

## RevenueCat catalog audit and reconciliation

Set `REVENUECAT_API_KEY` to a RevenueCat secret key with project configuration
write access. The command defaults to read-only:

```bash
bun run revenuecat:indie-dev:audit
```

After the store products exist and the audit output has been reviewed:

```bash
bun run revenuecat:indie-dev:setup
```

The setup command is idempotent. It creates missing RevenueCat product
references, the `indie_dev` entitlement, the named offering and its two
packages, then attaches the iOS and Android products.

## Runtime configuration

Configure these in the production build/deployment environment:

- `VITE_REVENUECAT_API_KEY_IOS`
- `VITE_REVENUECAT_API_KEY_ANDROID`
- `VITE_REVENUECAT_API_KEY_WEB`
- `REVENUECAT_API_KEY`
- `REVENUECAT_WEBHOOK_SECRET`

The webhook URL is `https://app.gamefolio.com/api/revenuecat/webhook`. Its
Authorization header must exactly match `REVENUECAT_WEBHOOK_SECRET`. Run
`bun scripts/sync-revenuecat-webhook.ts` after both secrets are configured.

## Release gate

Before enabling purchases, verify sandbox monthly and annual purchases on both
native platforms, restore purchases on a second install, and confirm webhook
handling for purchase, renewal and expiration. Only then change
`GAME_DEVELOPER_PRO_PURCHASES_ENABLED` in `shared/feature-flags.ts` to `true`.
