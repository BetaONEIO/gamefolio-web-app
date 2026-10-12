# Campaign pricing policy

Prices use integer GBP pence, excluding VAT. The shared commercial model is authoritative for new campaigns. Paid campaigns retain 20% for Gamefolio; the remainder enters the creator pool when the campaign completes. Season rewards use approved completion and eligible Bounty XP, not engagement metrics. The displayed pool/capacity–pool range is illustrative, not a guaranteed cash payout.

Quick Creator includes three places and one clip, screenshot and feedback response per creator. Content Boost includes three places for £25, with £8 per extra place. Showcase includes five places for £50, with £10 per extra place. Selecting fewer places retains the base package price. Paid presets support at most 25 places.

Stream rates per creator are £10 for 30 minutes, £15 for 60 minutes and £25 for 120 minutes. Stream completion requires the correct game and verified duration.

Custom campaign minimum creator-pool allocations per required item per creator are £3 per clip, £5 per reel, £1 per screenshot, £2.60 per feedback response, £6 per review and £3 per bug report. Streams require 80% of the corresponding stream rate; custom durations outside the three package durations use the existing proportional hourly basis. These are product-policy floors, not promises of individual payouts. They are enforced both before review and on the server.

Custom objective XP uses the existing central Gamefolio reward rules. Developers may choose a completion bonus from 0 to 1,000 XP, in addition to objective XP. The server bounds the bonus and stores it with the campaign snapshot.

Unchanged legacy drafts keep their stored price and objectives. The recorded `2026-10-fair-work` version retains its original £60/£125 package rates and £10/£20/£35 stream rates when editing capacity or duration. New campaigns are stamped `2026-10-indie-launch`. Existing paid campaign snapshots and payment handling remain intact.

## Two-stage cash rewards (new funded campaigns)

Funding receipts marked `campaign-equal-two-stage-v1` reserve 80% of the pre-VAT price for creators. Existing receipts remain under their recorded legacy rules; they are not converted retroactively. Versioned receipts are excluded from seasonal cash contributions to prevent duplicate funding.

Only final completed participation with all required work approved and required stream time verified qualifies. Guaranteed cash is the integer-pence floor of pool/capacity. At closure, the pool is divided equally among qualifying participation IDs, with remainder pennies allocated by ascending participation ID. The bonus is that final share minus the guaranteed reservation, including guarantees still pending payment. The full pool is allocated when any qualifying creator exists. Pending work prevents settlement. No-qualifier campaigns continue through the existing cancellation/refund policy; this change does not create automatic refunds or refundable platform fees.

Approval payouts use the existing Stripe Connect transfer flow. Closure bonuses have separate durable transactions and stable Stripe idempotency keys. Cash is labelled paid only after Stripe returns a successful transfer; account onboarding and failure states remain visible. A transfer to a connected account is distinct from a subsequent bank payout. XP has its own currency and audit record. The ledger supports refund records, but no new refund executor is introduced.

### Local currency display and checkout
Campaign selection and review use the existing cached GBP exchange-rate service. Location detection takes priority, with browser region as a fallback and GBP when a rate is unavailable. Display values are estimates; custom budget inputs explicitly remain GBP. Never persist converted display values as campaign budgets.

Campaign Checkout enables Stripe Adaptive Pricing. Stripe determines supported local currency and final conversion (including its conversion fee), with VAT at checkout. Integration amounts remain GBP, so receipt verification, creator reward allocation and accounting continue using the original server-priced GBP amount. Existing open checkout sessions retain their original configuration. Actual local-currency checkout must be verified in Stripe sandbox before release; no live payment was performed during implementation.

### Stream Spotlight capacity controls
New self-service Stream Spotlight campaigns have a server-enforced maximum of 10 places. The selection UI offers 1, 3 (Recommended), 5 and 10. Unchanged existing capacities above 10 are grandfathered; duplication does not create a new above-limit self-service campaign. Custom streaming capacity above 10 requires a request approved through the admin-only streamer-enquiry endpoint; an enquiry alone does not authorise a campaign.

Live capacity increases use a separate Stripe Checkout receipt with the original capacity, requested total and server-calculated integer GBP amount. The capacity and 80/20 funding allocation change atomically only after a verified paid receipt. No reductions are supported. Compatible access and completion keys are checked before checkout and again at fulfilment. Payments interrupted by missing keys retain a `keys_required` receipt and can be retried from the return URL. Payments received after closure retain a `refund_required` receipt for support; they do not reopen the campaign. Existing open sessions are reused or expired before changing the requested capacity.

When a campaign has multiple funding receipts, creator transfers use the platform's available Stripe balance rather than assigning all transfers to the original charge. Insufficient available balance keeps transfers in the existing pending/failed retry flow. This requires a Stripe sandbox test of checkout, webhook retries, reward transfers and refunds before production. No live payments were made while implementing this flow.
