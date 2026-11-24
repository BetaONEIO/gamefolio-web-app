# Bounty Hub and game page QA — 7–8 October 2026

## Browser checks passed

- Developer overview and public game page navigation.
- Public game switching between qwdawasf and Skybound Drift.
- Public Clips, Reels and Screenshots tabs and their empty states.
- Saved game details, artwork and social/store links displayed on the public page.
- Bounty Hub menu and discovery empty state (no live campaigns returned).
- My Campaigns lifecycle sample cards, completed filter and results entry point.
- Submission gallery content-type filtering, creator review panel and full feedback preview.
- Completed campaign results and approved-content gallery.
- Stream Spotlight live pricing: 2 streamer places × 2 hours × £10 = £40.
- Stream Spotlight skips personalisation and opens Add Access directly.
- No-key access carries through to final review without key availability messaging.
- Final review displays £40, 7,500 XP per creator, £32 creator pool and £8 Gamefolio share.
- Development simulated payment opens Congratulations, then View campaign opens the sample dashboard. No actual payment or public campaign launch occurred.
- Developer content library and analytics empty states.

## Issues and limitations

- YouTube trailer showed Error 153 inside the in-app browser. Added an explicit referrer policy and a Watch trailer link; verified that the link points to the saved URL. Embedded playback remains unverified.
- Screenshot file selection stalled despite explicit timeouts, then failed with a missing browser node. No successful upload was verified. Do not infer an application upload defect solely from this tooling failure.
- The Keys page showed its header, but its upload controls did not appear during observation. Key entry and distribution are unverified.
- Discovery had no live campaigns. The developer samples are read-only, and the paid development flow produces a local preview rather than publishing a live campaign. Creator joining, real submissions, developer approval/rejection, stream verification and reward settlement could not be exercised end-to-end.
- Wallet, Discord, Xbox and web subscription configuration warnings were present. These integrations were not tested.
- Downloads, invitations, thanks, profile crop tools and store import credentials were not exercised during this pass.

## Automated checks

Initial campaign/bounty/profile/content test run: 134 passed, four failed. Three failures needed environment configuration. Reran those three files with the configured test environment: 30 passed, one failed.

Two assertion mismatches remain across the combined checks:

1. campaign-layout-continuity expects VisualMissionCard in both available and active views; the available preview currently uses a different requirements layout.
2. campaign-stream-configuration expects the older Quick Creator 3–5 creator / 15–20 submission estimate; current configuration returns 5 creators / 20 submissions.

These need reconciliation with intended design and estimate semantics; they were not changed merely to make the suite pass.

Earlier profile QA added eight passing validation tests and fixed empty names, studio number validation, team ranges, selected-game save scoping and imported screenshot precedence. See game-profile-qa-report.md.

Evidence: /tmp/bounty-hub-payment-qa.jpg.
