---
name: Campaign video upload style
description: Creator campaign video uploads should reuse the main clip uploader's visual language and dynamic limits.
---

Creator campaign video submission should use the same interaction language as the primary clip uploader: a labelled dashed drag-and-drop field, dynamic size and duration limits, video preview, required title, and optional description. Keep existing Gamefolio content selection as a secondary path. Sign stored media URLs before rendering campaign previews or gallery thumbnails. Keep clip thumbnails at 16:9 and reel thumbnails at 9:16.

**Why:** Creators already understand the primary upload module, and matching it reduces confusion between publishing a normal clip and attaching one to a campaign objective. Campaign APIs expose canonical Supabase URLs, which may not be directly readable from the browser; a generated thumbnail can exist yet still appear broken unless the UI requests a signed URL.

**How to apply:** Reuse the existing upload-limit endpoint for the copy, keep native upload and campaign association as separate server steps, and preserve replacement-submission metadata when the upload is reviewed again. Sign URLs in confirmation, picker, gallery, and review views; use 16:9 for clips and 9:16 for reels. Because publication can succeed before association fails, retain the published media identity for retry and reconcile against server submissions before retrying a stage request; never count publication alone as campaign progress.