---
name: Headless browser system libraries
description: Playwright's JavaScript package and browser binary may be present without the Linux shared libraries Chromium needs.
---

**Rule:** Smoke-test `chromium.launch()` before relying on local Playwright for visual or interaction checks. If it fails for missing shared libraries, either install the required Nix system dependencies when browser automation is essential or use the available preview screenshot for static review.

**Why:** In this workspace, Playwright was installed and its browser binary existed, but Chromium could not start because host libraries were missing.

**How to apply:** Check the error before spending time on test selectors or application code; this is an environment setup issue, not a UI failure.