# Creator discovery and Bounty Boost

The Bounties tab separates an included, always-on creator opportunity listing
from paid Bounty Boost campaigns. Neither product guarantees participation,
submissions, views, streams or exposure.

## Included discovery

The introduction is remembered per account and can be reopened. Setup is only:
registered game (when needed), access, confirmation. An optional activity
preference defaults to content and streams. No developer-defined quantity,
capacity, deadline, XP, pricing or campaign brief is required.

`included_bounty_programmes` references a developer-owned game and records access,
activity preference, pause/opt-out state and model version. The game-scoped unique
index permits a developer to open more than one registered game. New programmes
use `discovery-v2`. They do not consume `campaign_starter_allowances` or promise a
monthly quantity. `included_bounty_opportunities` references standard, immutable
campaign instances for clips, reels, screenshots, structured feedback, reviews
and a verified livestream. Gamefolio defines format, quality, deadline and XP in
`shared/bounty-discovery.ts`; each creator sees the requirements before joining
and before accepting access. New opportunities have no enrollment end date.
The existing participant clock starts at access acceptance, not listing creation.

Activation checks Pro, game ownership, supported platforms and compatible access.
It does not reserve or reveal keys. The existing join transaction locks campaign
and creator rows, checks entitlement/availability, then attaches one compatible,
unassigned game-owned access key using `FOR UPDATE SKIP LOCKED`. The original
reservation/reveal code creates tracked participation and key events. A creator
can hold one active discovery opportunity for the game at a time. Existing
per-opportunity participation deduplication remains in force. Discovery uses only
the access pool, not reward or future Key Drop pools. Keys with revealed access
are never recycled. Unrevealed reservations can be released after cancellation
or expiry using the shared helper.

Pause and opt-out stop new joins. Opt-out additionally returns the developer to
the landing screen, with an opt-back-in action and access to previous activity.
They do not delete work, agreements, rewards or history. Reopening and preference
changes serialize on an account advisory lock; the saved activity preference is
applied before the availability transaction commits. In-flight work is preserved.
Expiry of Pro blocks new claims, but leaves existing submissions reviewable.

## Historical data

Legacy included programmes and campaigns are mapped by reference. Nothing
rewrites saved objectives, participants, keys, prices, reward snapshots or status
history. A developer explicitly confirms access before adding the new standard
opportunities. Existing work from every included instance for the game appears
in the unified dashboard and remains reachable in My Campaigns. The old monthly
helper/model is retained for historical contracts and regression coverage, but
neither the worker nor new activation creates monthly renewals.

## Dashboard and funnel

The dashboard aggregates original records across opportunity and legacy instance
IDs. The unified media library routes each review, stream check, problem report
and download to that submission's original instance. Clips/reels, screenshots,
streams, feedback/reviews remain filterable. Existing approval and XP logic is
reused. Metrics and activity come from real participation, key events, submissions,
reviews, rewards and verified stream evidence. There is no monthly progress bar.

First-party `bounty_funnel_events` records deduplicated visible listing impressions,
listing opens, game-page clicks, prompt impressions/clicks, paid draft creation,
checkout start and verified payment. Claims, access acceptance and submission
counts are derived from authoritative database records. Key material and contact
information are never sent as analytics. Event retries use unique keys.

`contextualBoost` returns at most one prompt based on approved work, a real upcoming
release, sustained interest, or a key claim whose actual completion deadline has
expired without a submission. It never fabricates performance or prompts for a
stalled claim during an active completion window. A quiet dashboard has no large
upgrade banner. A secondary Create a Bounty Boost action remains available.

## Paid Bounty Boost

Four steps: goal, campaign size, creator reward, review/pay. Suggestions inherit
the registered game, access method, platforms, activity preference and strongest
approved content type. Three creators and a 14-day promotional period are editable
recommendations, not estimates of participation. Starter/Boost/Launch, exact
objectives and capacity reuse the existing shared workload quote. No client
price is accepted. The server validates game ownership, inherited targeting and
promotional duration, then canonicalizes the request into the existing custom
campaign draft and Stripe checkout. Integer minor units, the 80/20 allocation,
key inventory checks, payment verification and XP remain authoritative.

New Boosts receive featured marketplace placement. After verified payment,
creators who previously participated with that game receive an in-app notification.
Payments, legacy drafts and existing paid agreements retain their normal routes.

Only new Boosts marked `refund-uncompleted-v1` use the disclosed unused-reward
policy: each approved completion earns its displayed per-place share; uncompleted
shares and rounding remainder are refunded after campaign closure and resolution
of all active/pending work. The Gamefolio fee is retained. Historical two-stage
completion-bonus allocation is unchanged. Settlement creates a durable refund
receipt; per-charge plans persist before Stripe calls and use stable idempotency
keys. The worker retries pending refunds, records provider IDs, checks currency,
and supports original and additional-capacity charges. It never refunds exposed
keys or modifies creator payouts. Failed/refused refunds stay recorded for support
review rather than being treated as completed. No real charges or refunds are
performed by the tests.

Key Drops are not a dependency. No Key Drop inventory or redemption feature is
introduced by this change; a later integration must require explicit inventory
allocation and attribution before it can consume bounty keys.

## Verification

    node --import tsx --test tests/bounty-discovery.test.ts tests/included-bounty.test.ts tests/campaign-funding.test.ts tests/campaign-timeline.test.ts tests/bounty-package-workflow.test.ts tests/bounty-rejection-routes.test.ts tests/bounty-campaign-expiry.test.ts
    NODE_ENV=test node --env-file=.env --import tsx --test tests/included-bounty-postgres.test.ts

The PostgreSQL contract test shadows every account/campaign/key table with TEMP
tables inside a rolled-back transaction. It checks legacy preservation, no new
monthly quota, generated standard opportunities, repeat activation, preference
and opt-out gates, Pro and owner restrictions, key scoping and exposed-key safety.
The build is checked separately; repository-wide TypeScript errors predating this
change are tracked separately from changed-file diagnostics.


## Developer hub presentation

The Bounties dashboard uses the saved programme, entitlement, usable game-key inventory and current submissions to select its hero. Priority is awaiting review, keys required, paused, active, then never enabled. Staged and superseded submissions do not count as review actions. Resume uses the existing availability endpoint and never repeats onboarding.

`BountyCampaignHub` presents the game artwork, metrics, activity timeline, media carousel and separate Bounty Boost banner. It reuses `CampaignContentLibrary` for detailed previews and review actions. Game artwork falls back through the game's screenshots, portrait and catalog artwork; unavailable media never causes unrelated imagery to be substituted. The full explanation stays in a modal. The existing 15-second context refresh keeps the hub current.

Access changes are game-owned and Pro-gated. New access is applied to new opportunity snapshots; prior snapshots remain closed to new claims, with immutable creator agreements, participants, submissions and issued keys retained. `included_bounty_opportunity_history` stores references to replaced snapshots, not a second bounty status. Resume cannot reopen them. Active participation in a replaced opportunity still prevents a second concurrent claim for the same programme.


The opened confirmation includes the registered game's portrait/banner on the left and a direct public opportunity link. Opening, resuming or changing availability invalidates the public Bounty Hub list cache. The active dashboard also exposes the public link.

For local testing, `restartBountySetup=1` on the developer Bounties URL restarts the presentation and form choices without deleting or changing saved records. The flag is development-only, visibly labelled, and has no effect on public visibility. Changes apply only after the developer explicitly confirms setup, using the same entitlement/ownership/access checks and preserved opportunity snapshots. The saved introduction preference remains authoritative for normal sessions.


Game-access uploads share a client/server activation-code format check. Random unformatted text is rejected before storage; recognised formats are described as ready, never as verified/redeemable. Store redemption cannot be established by a format check. Missing server encryption returns a specific temporary-storage response before a batch is written; other failures no longer incorrectly blame encryption. Local development requires a stable, ignored environment secret and a distinct version; never replace secrets for existing ciphertext or fall back to plaintext.

### Bounties Overview presentation

The developer Overview keeps the selected game's status and public listing first. A single empty activity message is shown until a creator participates; content is mounted only when a non-staged, current submission exists, including feedback and reviews. Participation cards use each instance's saved objectives and final participation status; one upload alone never marks a creator approved. Existing review, access, history and paid setup actions remain in place. Sharing copies the accepting opportunity's existing public URL.

The Overview promotion is contextual: an approved completed participation, or seven days after the programme was created with no participants, submissions, prior joins or recorded listing opens. The discovery-v2 model has no monthly creator cap, so the UI does not invent an allowance trigger. Operational details and previous campaign activity remain in the collapsed settings section. This presentation does not change entitlement, opportunity generation or reward logic.

### One public page per discovery game

The Bounty Hub groups discovery-v2 opportunities by developer ID and game ID into one game listing. Opening any existing opportunity link shows the shared game header and all content sections together. Each section reuses its opportunity's existing preview or joined submission workspace, including its saved objective IDs, verified-stream requirements, deadlines and XP. Group reward labels show a range per approved bounty, never the sum of all optional types. Existing paid campaigns remain distinct contracts. The two creator-progress responses include the campaign's developer ID so a joined or historical opportunity remains associated with the correct game page.

The existing one-active-opportunity-per-game rule is unchanged. If another format is already active, the page offers a direct return to that saved workspace and explains why a second claim is unavailable. Preparing different content types does not reassign submissions, keys or rewards.

The single-page form has separate clip, reel and screenshot drop zones, written review/feedback fields, and a stream/VOD field with the existing connected-account verification. Before joining, selected files and text stay in page memory under the instance ID and do not trigger uploads. After joining, media flows through the existing upload preview, confirmation and stage endpoints; access and account eligibility remain enforced. File fields accept one matching media file at a time, retain native file-picker support, and apply live upload limits before transfer. Joined written responses and verified-stream forms appear inline rather than opening format tabs.
