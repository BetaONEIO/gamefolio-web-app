---
name: JSX conditional compatibility
description: A parser compatibility rule for large conditional sections in React page components.
---

Use separate explicit conditional render blocks for large sibling page states, such as `condition && (...)`, instead of wrapping a large JSX branch in a nested ternary.

**Why:** The production esbuild build accepted a large nested JSX ternary while the development Babel/Vite parser rejected the same source at the next sibling element. Explicit blocks made both parsers agree and also kept the pre-acceptance and active-workspace states visibly separate.

**How to apply:** When a page has two substantial mutually exclusive layouts, render them as adjacent guarded blocks and keep each branch's closing boundary local and obvious.