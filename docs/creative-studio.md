# Admin Creative Studio

Open **Admin → Creative Studio**. Select a real profile, season, or approved game.
The preview is the rendered PNG; Download saves those exact bytes. Use **Refresh
live data** to capture subsequent changes to a profile or leaderboard.

All four `/api/admin/creative-studio` endpoints use the existing admin guard.
Exports accept record IDs and presentation switches, never arbitrary HTML or URLs.
The renderer receives an explicitly projected snapshot, not a raw user record.

## Rendering and deployment

- Existing Playwright and Sharp dependencies render at 3840 × 2160, then downsample
  to a 1920 × 1080 PNG. No database migration or new storage service is required.
- Replit's Nix packages now include `chromium`. The renderer finds it on PATH.
  Other deployments can set `CREATIVE_STUDIO_CHROMIUM_PATH` or install the matching
  Playwright Chromium (`npx playwright install --with-deps chromium`).
- `npm run build` copies the shared profile stylesheet into `dist/creative-studio`.
  Deploy the entire `dist` directory, dependencies and normal public assets.
- Allow HTTPS to the existing Google font providers, configured Supabase storage,
  and image hosts listed in `server/creative-studio/assets.ts`. Unsupported/missing
  media produces a visible warning and static fallback. Font failure stops export.
- Only one export runs per server process, including data loading. Concurrent
  requests receive 429. The editor serializes its own requests and skips stale
  queued selections. Chromium starts on demand and closes after each export.
- Chromium adds transient CPU/memory demand. Verify resource headroom and perform
  an authenticated smoke test on the Replit development deployment before release.

Background uploads use the existing `gamefolio-media/creative-studio` storage
folder. Uploaded PNG/JPEG/WebP files are decoded, limited to 10 MB, checked for
exactly 1920 × 1080 still-image dimensions, and normalized to PNG. Removing a
background from a composition restores the default; it does not delete the shared
asset from storage.

Profiles reuse shared theme tokens, CSS artwork, typography and frame calibration.
Equipped theme colours are preserved; the surrounding default export background
uses dark surfaces and Gamefolio green. Motion is frozen, animated media is decoded
at frame zero, and images/fonts must finish loading before capture. Long text is
fitted inside bounded areas and safe-area violations fail explicitly.

Leaderboards reuse the existing season reward query, retaining public current-season
zero-XP eligibility and historical positive-XP eligibility. Payout callers keep their
existing positive-XP default. The initial Gamefolio Card type uses approved games;
there is no new card database model.

## Validation

- `npm run test:creative-studio`: input, authorization, uploads, asset boundaries,
  slow-image decoding and shared themes.
- `npm run test:creative-studio-render`: real Chromium, PNG dimensions, deterministic
  bytes, long names, large XP, missing artwork, themes and failure recovery.
- `npm run test:creative-studio-editor`: isolated editor at 1440/768/390px, queued
  previews, exact download bytes and retry behavior. API fixtures are test-only;
  the application always uses the database/storage adapters.
- Existing profile-theme, production-performance and startup tests; `npm run build`.

Browser tests require local Chromium and Google font access. Test artifacts are
written to `/tmp/gamefolio-studio-renders` (override with `STUDIO_TEST_ARTIFACTS` for
render tests). No test starts the production app or writes to its database/storage.
