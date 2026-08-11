---
name: Auth modal portal z-index
description: Portals (Popover, Select, Tooltip, etc.) inside the auth modal need z-index above 200000 to appear.
---

The auth modal (`auth-modal.tsx`) uses `z-[200000]`. Any Radix UI component that opens a portal to `document.body` (Popover, DropdownMenu, Select, Tooltip, Dialog) will render **behind** the modal at the default `z-50` unless explicitly overridden.

**Why:** Radix portals escape the DOM tree but not the stacking context that the browser uses for compositing. The modal's z-index wins unless the portal's content element also carries a higher z-index.

**How to apply:** On the portal content element (e.g. `PopoverContent`, `SelectContent`, `DropdownMenuContent`), add `className="... z-[200002]"`. Use 200002 to also clear the Terms/Privacy dialogs inside the form which are at `z-[200001]`.
