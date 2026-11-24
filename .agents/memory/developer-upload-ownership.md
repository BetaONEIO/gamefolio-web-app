---
name: Developer upload ownership
description: Product rule limiting Game Developer uploads to their catalogue-linked games.
---

For normal profile publishing, Game Developers may upload clips, reels, and screenshots only for catalogue games explicitly linked through their Indie profiles. Campaign submissions are creator content, not official developer publishing: allow them only after the server verifies the authenticated participant, objective, campaign status/deadline, and derives the game's ID (which may be null for an intentionally unlinked campaign). Never trust a client-supplied campaign game ID.

**Why:** The profile ownership guard incorrectly rejected a campaign participant's upload with “Select one of your own games before uploading,” even though the campaign context had already authorized and scoped it. The distinction is between regular profile publishing and a verified campaign submission.

**How to apply:** Keep the server-side profile ownership guard on normal uploads and OAuth clip publishing. Skip only that guard when the server route itself has completed campaign-context validation; campaign game linkage, participant, objective, status, and deadline checks remain mandatory.