---
name: Upload attempt idempotency
description: Recovery rule for direct-to-storage video uploads when the browser loses the processing response.
---

Direct-to-storage video uploads use a creator-scoped, durable client attempt
identifier. The processing path must reconcile by that identifier before
applying quotas or creating content, and a retry must return the existing clip
or scheduled post rather than creating a duplicate.

**Why:** A browser can lose the server response after content has already been
created, which otherwise appears as a failed upload and causes unsafe retries.

**How to apply:** Preserve the original attempt identifier and successfully
uploaded storage location for an in-page retry. Store the attempt identifier
on both live clips and scheduled posts, enforce one attempt per creator, and
keep reconciliation lookups authenticated and owner-scoped.