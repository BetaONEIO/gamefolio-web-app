---
name: Campaign video upload style
description: Creator campaign video uploads should reuse the main clip uploader's visual language and dynamic limits.
---

Creator campaign video submission should use the same interaction language as the primary clip uploader: a labelled dashed drag-and-drop field, dynamic size and duration limits, video preview, required title, and optional description. Keep existing Gamefolio content selection as a secondary path.

**Why:** Creators already understand the primary upload module, and matching it reduces confusion between publishing a normal clip and attaching one to a campaign objective.

**How to apply:** Reuse the existing upload-limit endpoint for the copy, keep native upload and campaign association as separate server steps, and preserve replacement-submission metadata when the upload is reviewed again. Because publication can succeed before association fails, retain the published media identity for retry and reconcile against server submissions before retrying a stage request; never count publication alone as campaign progress.