# Game Profile QA — 7 October 2026

## Results

Browser-tested core details, store links, platforms and regions, social links, studio details, discovery metadata, and trailer/screenshot URL validation. Valid edits saved. Invalid social/store URLs were rejected.

Fixed blank game-name acceptance, malformed studio numeric fields being silently saved, and team ranges being truncated (3–5 becoming 3). Added shared client/server validation and eight passing regression tests. Corrected capsule previews to the advertised 3:4 ratio.

Production build passes. Media file uploads, crop interactions, import/sync flows, and a complete reload round-trip remain unverified. The screenshot file chooser stalled and the browser later opened a connection-error page; browser policy blocked further access to that page.

## Test data disposition

The user confirmed this game contains disposable test data. QA values will remain in place; restoration is no longer needed.

Further code inspection found and fixed two persistence issues: manual saves omitted the selected game ID, and screenshot uploads did not clear the imported-value preference. These fixes still require an authenticated browser round-trip, including editing a non-primary game.

## Original recovery record

The initial database backup was accidentally overwritten with the partially tested profile. The following restoration is reconstructed from the original forms, not an exact database backup. Blank fields may originally have been empty strings rather than null, and original override metadata is unavailable. Automatic approval review blocked restoration. No restoration has been executed.

Proposed restoration for qwdawasf:

| Field | Recorded original value |
| --- | --- |
| Release status | Released |
| Release date / price | Clear |
| Short description | A cyberpunk roguelite where you pilot a mech through procedurally generated neon cities. |
| Genres / tags / features | Remove only QA Genre, qa-test and QA Feature |
| Platforms | PC, Steam Deck, Nintendo Switch |
| Regions | Europe, Latin America, Middle East |
| Steam App ID / Epic slug | Clear |
| Website | https://neonhorizon.game |
| Studio | BetaOne Studios |
| Studio country / founded year / website | Clear |
| Team size | 3–5 |
| Age rating / languages / descriptors | Clear |
| X | https://twitter.com/neonhorizongame |
| Discord | https://discord.gg/neonhorizon |
| YouTube / Twitch / Instagram / Facebook / TikTok | Clear |
| Trailer | Restore the original uploaded MP4 recorded in the restoration script |

Any approved restoration should compare each current field against its QA value before changing it, to avoid overwriting subsequent edits. Game name, full description, banner, capsule and screenshots do not need restoration.
