---
name: Gamefolio profile layoutStyle branch pattern
description: How alternate/custom profile page designs (e.g. graduated Canvas mockups) get wired into the real ProfilePage.
---

## The Rule

`users.layoutStyle` (default `"grid"`) selects which profile layout renders. To add a new design, build it as a standalone component that receives `profile: UserWithStats` and `isOwnProfile: boolean`, then early-return it from `client/src/pages/ProfilePage.tsx` right before the main `return (` — after all hooks/queries in the component but before any JSX.

**Why:** `ProfilePage.tsx` is a single very large component with many hooks called unconditionally at the top. Branching earlier (before all hooks run) would violate rules of hooks; branching right before the final `return` is safe because all data (`profile`, `isOwnProfile`, loading/error guards) is already resolved by that point.

## How to apply

- New layout components live in `client/src/pages/profile-layouts/`.
- Reuse existing pieces instead of reimplementing: `PlatformConnections` component for the connected-platform icon row, `MessageDialog` (lazy-loaded) for messaging, and real stat fields (`totalXP`, `level`, `currentStreak`, `_count.followers/clipViews/firesReceived`) instead of inventing fake stats.
- There's no schema field for game-specific metadata like genre tags; the pragmatic workaround used so far is storing comma-separated tags in the free-text `userType` column and splitting on render.
- Test accounts for a given layout are created via a one-off script setting `layoutStyle` directly (raw `sql` UPDATE/INSERT, not Drizzle's `.insert().returning()`, to avoid tripping over any DB/schema column drift — see the schema-drift memory entry).
- `GameBounty` rows are keyed by `gameId`, not by a "developer owns this game" relation — there's no ownership field on `games`. Per-profile bounty listings must filter by `createdByUserId` on `game_bounties` instead.
