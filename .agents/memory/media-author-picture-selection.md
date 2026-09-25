---
name: Media author picture selection
description: Preserve the creator's selected profile picture across media detail and feed responses.
---

Media author projections that supply avatar and NFT image URLs must also supply the creator's selected profile-picture type. When a source has no explicit selection, prefer an uploaded avatar if one exists. If an NFT thumbnail cannot load, try the full signed NFT image and then the uploaded avatar before showing initials.

**Why:** A partial author response can make a selected uploaded photo look like a broken older NFT, producing an initials avatar even though a valid profile picture exists.

**How to apply:** When adding or changing reel, clip, or screenshot author responses and their UI, keep the picture selection and fallback order aligned with the full public profile.