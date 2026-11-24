---
name: Campaign timeline duration semantics
description: How campaign durations relate to UTC instants and viewer-local dates across timezone changes.
---

Campaign open and per-creator completion windows are elapsed 24-hour days, not calendar-day jumps in a viewer's timezone. Show each exact instant in the viewer's timezone, including an offset or abbreviation, even when daylight-saving changes cause the local clock time to shift.

**Why:** The operational deadlines are stored as UTC instants and the existing enrollment/expiration logic uses fixed-day intervals. Adding days with a browser-local calendar method would preview a different deadline during daylight-saving transitions.

**How to apply:** Compute a timeline close or due date from the canonical launch/join instant plus the configured number of 24-hour days; never derive canonical timestamps from formatted local display text.