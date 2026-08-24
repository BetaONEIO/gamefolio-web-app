---
name: Private indie media URLs
description: Rendering guidance for Indie Dashboard images stored in Supabase private storage.
---

Game Profile media should keep the canonical storage URL in profile data, but dashboard image elements must resolve it through the signed-URL client hook before rendering.

**Why:** The `gamefolio-media` bucket is private. An upload can complete and return a canonical `/object/public/` URL, but browsers receive “Bucket not found” when they load that URL directly.

**How to apply:** Use the existing signed URL hooks for each single image or image collection displayed in Indie Dashboard UI. Do not persist the expiring signed URL in the profile record.