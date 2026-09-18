---
name: Full-page profile theme shell
description: Architectural constraints for profile themes that intentionally cover the global app shell.
---

Full-page profile themes should mount their decorative layers outside the app's scrolling and overflow containers, while opting only the relevant shell surfaces into translucency.

**Why:** The shared profile template includes opaque header, banner, navigation, sidebar, and main-surface layers; keeping the theme inside the profile content wrapper makes it stop at the banner or disappear behind shell stacking contexts.

**How to apply:** Use a document-body portal for fixed, pointer-transparent layers; scope shell translucency to a body class that is removed on navigation/unmount; explicitly neutralize opaque template surfaces such as legacy or missing banner backgrounds.