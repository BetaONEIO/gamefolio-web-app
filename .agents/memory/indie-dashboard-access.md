---
name: Indie dashboard access
description: Defines who can access Indie game management and how free and paid limits differ.
---

Indie game management is available to admins, paid Indie partners, and authenticated users whose onboarding persona includes `indie_developer`. Persona access is intentional: it grants the free-developer game quota, while a paid Indie subscription grants the higher subscriber quota.

**Why:** The dashboard navigation and quota rules already distinguish free Indie developers from paid partners. Requiring only the paid-partner flag in the API made an eligible developer reach the dashboard but receive a 403 while saving.

**How to apply:** Use the shared Indie access rule for Indie dashboard routes and UI gates. Keep game ownership checks on every selected-game operation, and do not treat a streamer persona or a non-Indie paid partner as Indie access.

Indie developers may create and manage their own campaigns and browse the public campaign marketplace, but creator participation is normally restricted. A temporary, narrowly scoped preview-account exception is enabled for campaign-screen design.

**Why:** Indie accounts represent campaign owners in this product, not creator participants. The preview exception exists only to let a designated Indie account exercise the creator screens during design.

**How to apply:** Keep the preview exception account-specific and consistent between client and server; all other Indie accounts remain blocked from joining, access reveal, progress, submissions, extensions, and completion-key claims. Remove the exception when design work is complete.