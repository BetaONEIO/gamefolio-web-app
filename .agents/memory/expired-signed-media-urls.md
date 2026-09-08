---
name: Expired signed media URLs
description: How to keep legacy Supabase signed asset URLs rendering after their embedded token expires.
---

Signed Supabase URLs must be treated as reusable only while their JWT expiry is still safely in the future. When a record contains an expired signed URL, pass it back through the normal server signing endpoint; it can extract the bucket and object path without trusting the old token.

**Why:** Older name-tag records persisted signed URLs. A client shortcut that skipped every signed URL caused those assets to render as broken images after expiry, even though the original objects still existed and could be signed again.

**How to apply:** For shared media rendering, preserve fresh signed URLs to avoid redundant downloads, but inspect their token expiry and re-sign stale or malformed ones. Do not store newly generated signed URLs as the durable database value.