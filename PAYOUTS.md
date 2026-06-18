# Referral Payouts — spec / scratchpad

> Status: **scoped, not started.** Parked for later. This branch (`payouts`) is
> currently identical to `main` apart from this file.

## The idea

Let Pro users earn money by referring others:

- **Referrer** gets **5% cash back** when someone they referred pays for Gamefolio Pro.
- **Referee** gets **5% off** their own Pro subscription.

## Decisions locked in

- **Payout form:** real **cash** (not GF tokens / not account credit).
- **Frequency:** **one-time** — 5% on the referred user's *first* successful Pro
  payment only (not recurring renewals).

## What already exists (reuse, don't rebuild)

- Referral tracking: `users.referralCode` + `users.referredBy` (migration `0008`).
- `POST /api/user/apply-referral` already links referrer↔referee (pays XP today).
- Self-referral blocked; codes unique, profanity-filtered, one-time customizable.
- Pro purchase webhooks already fire and are the natural hook points:
  - Web (Stripe): `server/routes/gf-webhook.ts` → `checkout.session.completed` / `invoice.paid`
  - Mobile (RevenueCat): `server/routes/revenuecat.ts` → `INITIAL_PURCHASE`
- Pro state: `users.isPro`, `stripeCustomerId`, `stripeSubscriptionId`, `revenuecatUserId`.

## Economics reality check

5% of a *first* payment is small:

- Monthly Pro (£2.99) → **~£0.15** per referral
- Annual Pro (£30) → **~£1.50** per referral

→ Cash can't be paid per-15p (transfer fees exceed it). Design **must** accumulate
an earnings balance and only allow withdrawal above a **minimum threshold**
(suggest £10–£20). Compute 5% on the *actual amount charged*, not the £2.99 base —
Stripe Adaptive Pricing means the charged amount varies by currency.

## Build plan (two phases)

### Phase 1 — accrual only (low risk, ships fast)
- Referee discount:
  - Web: Stripe recurring **Coupon / Promotion Code** (5%) on the subscription.
  - Mobile: RevenueCat discount offering.
- Earning accrual on the Pro-purchase webhooks: look up `referredBy`, compute 5%
  of amount paid, write a `pending` earning.
- New tables:
  - `referral_earnings` — referrer, referred user, subscription ref, gross amount,
    payout amount, currency, status (`pending` → `available` → `paid` → `clawed_back`).
  - `payout_accounts` — per-user Stripe Connect account id + onboarding status.
- In-app: show accrued/available balance + referral stats endpoint.
- **No cash-out yet.** Validates the funnel before touching compliance.

### Phase 2 — cash-out (compliance-heavy)
- **Stripe Connect (Express)** onboarding — triggered only when a user has earned
  something (casual users never see KYC).
- **Clawback hold window** (suggest 30 days, aligned to refund policy): earnings
  stay `pending` until the window passes so a referee refund/chargeback voids the
  earning before it becomes `available`.
- Withdrawal: `available` balance ≥ threshold → Stripe **Transfer** to Connect
  account → bank payout.
- **Tax/compliance:** enable Stripe Connect 1099 / tax-form reporting.

## Blockers / things only the account owner can do

1. **Enable Stripe Connect** on the Stripe account (gating prereq for all cash-out).
2. Set **minimum payout threshold** (suggest £10–£20).
3. Set **clawback hold window** (suggest 30 days).

## Open risks

- **App Store / Play policy:** cash incentives tied to in-app subscriptions are a
  gray area. Somewhat insulated because mobile uses RevenueCat **Web Billing
  (Stripe)**, not StoreKit/Play Billing — but real cash draws the most scrutiny.
- **Fraud:** self-referral already blocked at signup; watch for refund-after-payout
  abuse (mitigated by the clawback hold).
- **Tiny monthly economics** may argue for credit-instead-of-cash on monthly plans
  later — revisit if withdrawal thresholds prove unreachable for monthly referrers.
