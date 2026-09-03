# Engineering notes for Claude

For product / architecture / Stripe / blockchain context, see `replit.md`.
This file is the runbook for the parts of the project most prone to confusion
on a fresh session.

## This is a Capacitor app, NOT Expo

The mobile builds are **Capacitor 6** wrappers (`@capacitor/ios`,
`@capacitor/android`) around the Vite-built React DOM web client in `client/`.
Do **not** suggest Expo / EAS Build — they cannot build this project without
first rewriting `client/` in React Native.

`MOBILE_EXPORT.md` is in the repo but is a **spec for a hypothetical Expo
rewrite**, not the current app. Treat it as historical/aspirational only.

## Build & release

### Android — AAB for Play Console

```bash
# 1. Bump versionCode in android/app/build.gradle (must be > the last upload)
# 2. Build:
bun run mobile:build:android        # vite build && cap sync android
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

Signing is wired via `android/keystore.properties` + `@adminbetaone__gamefolio.jks`
at the repo root (gitignored secrets — do not move or commit).

### iOS — TestFlight

```bash
./scripts/ios-testflight.sh
```

Auto-sources `.env.ios.local` (gitignored) for credentials. Pipeline:
`vite build` → `cap sync ios` → `xcodebuild archive` → `xcodebuild -exportArchive`
→ `altool --upload-app`. The CFBundleVersion defaults to a UTC timestamp so it
will not collide with a previous TestFlight upload.

Required keys in `.env.ios.local`:
- `IOS_TEAM_ID` — Apple Developer Team ID
- `ASC_API_KEY_ID` — App Store Connect API key ID
- `ASC_API_ISSUER_ID` — App Store Connect issuer UUID
- `ASC_API_KEY_PATH` — absolute path to the `.p8` file

First-time-on-a-Mac prerequisite: open `ios/App/App.xcworkspace` in Xcode once
and add the Apple ID under Xcode → Settings → Accounts so Xcode can auto-create
the iOS Distribution cert + provisioning profile for `com.gamefolio.app`.

### "Put a new build in for production"

Triggered by phrasings like *"do a build for production for android & ios"*,
*"push a new version to production"*, *"ship a release"*. Run **both** pipelines:

0. **Pre-flight:** `git status`. If hand-edited tracked files are dirty (typically
   under `client/` or root configs), `git stash push -u -m "pre-prod-build"` so
   only committed code ships. Auto-generated cap-sync files
   (`android/app/capacitor.build.gradle`, `ios/App/Podfile.lock`, etc.) don't
   need stashing — the build regenerates them. Pop the stash after both builds.
1. Bump **both** `versionCode` (must be greater than the last Play Console
   upload — check the most recent `Bump Android version*` commit) and
   `versionName` (semver patch bump for hotfixes, minor bump for new
   features) in `android/app/build.gradle`. Commit them in one commit.
2. `bun run mobile:build:android`
3. `cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew bundleRelease && cd ..`
4. Copy the AAB to the repo root with a versioned filename so QA can tell
   builds apart, removing any previous `app-release-*.aab` first:
   `rm -f app-release-*.aab && cp android/app/build/outputs/bundle/release/app-release.aab app-release-<versionName>-<versionCode>.aab`
   (e.g. `app-release-1.0.1-10.aab`). Use `setopt nonomatch` or wrap the
   `rm` in `2>/dev/null || true` if running under zsh and no previous
   versioned file exists — the bare glob throws "no matches found".
5. `./scripts/ios-testflight.sh` (confirm first — visible-to-others action).

The versioned AAB lands in the repo root (`*.aab` is gitignored, so the
copy isn't committed). User grabs it from Finder for Play Console upload
or sideload to QA. iOS goes straight to App Store Connect / TestFlight;
its `CFBundleVersion` is auto-stamped by the script with a UTC timestamp,
but `CFBundleShortVersionString` (in `ios/App/App/Info.plist`) is the
marketing version and should be kept in sync with Android `versionName`
when you bump it.

#### Known gotchas

- **`bun run mobile:build:android` fails with `[vite]: Rollup failed to resolve
  import "@capacitor/share"`** (or any other `@capacitor/*` package): node_modules
  has drifted from `package.json`. Run `bun install`, then retry. This recurs
  often enough that it's worth checking proactively.
- **`./gradlew bundleRelease` fails with `Unable to locate a Java Runtime`**:
  no system JDK on PATH. Android Studio bundles a JBR — always invoke gradle
  with `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
  (already baked into step 3 above).
- **`./scripts/ios-testflight.sh` fails with `ASC_API_KEY_PATH` missing**:
  `.env.ios.local` doesn't exist or `.p8` was deleted. To regenerate the key:
  https://appstoreconnect.apple.com/access/integrations/api → Team Keys →
  Generate API Key (App Manager role) → download once → drop in `~/keys/` →
  set `ASC_API_KEY_PATH` to the absolute path. The `ASC_API_KEY_ID` in the env
  file must match the new key's 10-char ID (visible in the filename).
- **Pipe-to-tail hides exit codes**: `./gradlew … | tail -40` always returns 0
  because tail succeeds. When backgrounding gradle/xcodebuild, don't trust the
  exit-code-0 notification alone — read the tail of the output file and grep
  for `BUILD SUCCESSFUL` / `UPLOAD SUCCEEDED` / `** ARCHIVE SUCCEEDED **`.

## Push notifications (FCM)

Both platforms use **Firebase Cloud Messaging** via `@capacitor-firebase/messaging`.
The Firebase project is `gamefolio-e8bde` (already wired via `google-services.json`
on Android and `GoogleService-Info.plist` on iOS).

### Server-side requirement

Set `FIREBASE_SERVICE_ACCOUNT_JSON` in Replit Secrets (and local `.env` if
you want to test from a dev server). It's the entire JSON of a Firebase
service-account key — Project Settings → Service Accounts → Generate new
private key. Without this env var, the admin "Push" tab shows a banner and
all push sends are no-ops (in-app notifications still work fine).

### iOS-specific manual step (one-time)

In Firebase Console → Project Settings → Cloud Messaging → Apple app
configuration, upload an **APNs Auth Key** (`.p8`) generated from
https://developer.apple.com/account/resources/authkeys/list. Without that
key Firebase has nothing to talk to APNs with, so iOS pushes will never
deliver — Android will work fine without it. The same `.p8` already used
elsewhere in iOS automation cannot be reused; APNs auth keys are scoped
separately from App Store Connect API keys.

The app's `aps-environment` entitlement is set to `production`, so this
works for both TestFlight and App Store builds. Local `xcodebuild`-from-
laptop debug builds installed via Xcode would need it set to
`development` — only relevant if you sideload to a tethered device.

### How a push gets sent

1. On native sign-in, `client/src/lib/push-notifications.ts` requests
   permission, fetches the FCM token, and POSTs it to
   `/api/push/register` (table: `push_tokens`).
2. Server-side, every notification created via `notification-service.ts`
   (likes, comments, follows, mentions, streaks, etc.) fans out to
   `sendPushToUser` in `server/push-service.ts`.
3. Admins use AdminPage → "Push" tab to broadcast to all users / by role
   / Pro subscribers / specific users. History stored in `push_broadcasts`.
4. Tap routing: the push payload carries `actionUrl`. The native client
   surfaces it via a `gf-push-deeplink` window event, which `App.tsx`
   forwards to `wouter`'s `setLocation`.

## Hosted game builds (Cloudflare R2)

Developer-uploaded game builds — browser-playable WebGL/HTML5 exports and
downloadable archives — go to **Cloudflare R2**, never to the `gamefolio-media`
Supabase bucket that every other upload uses.

This is a billing constraint, not a preference. Supabase charges for egress and
a build exists to be downloaded repeatedly: one 2GB build pulled 500 times is
~1TB (~$90) from a developer paying £3.99/month. R2 charges ~$0.015/GB-month for
storage and nothing for egress, so a full 20GB quota costs ~£0.24/month however
often it is pulled. Moving builds to Supabase would silently invert the unit
economics of the whole feature. `server/r2-storage.ts` carries the full note.

**Not live yet.** `GAME_BUILDS_ENABLED` in `client/src/lib/feature-flags.ts` is
`false` and the server 503s every upload path while R2 is unconfigured. To turn
it on:

1. Cloudflare → R2 → create a bucket (e.g. `gamefolio-builds`).
2. R2 → Manage API Tokens → Object Read & Write, scoped to that bucket.
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUILDS_BUCKET` in Replit Secrets and local `.env`.
4. Browser-playable builds only: attach a public custom domain to the bucket and
   set `R2_PUBLIC_BASE_URL` to it. Builds are served from that separate origin
   deliberately — it is what stops an untrusted developer's JavaScript reaching
   Gamefolio's session. Do not proxy builds through the app's own domain.
5. `bun run db:migrate` (migration `0027_add_game_builds.sql`).
6. Flip `GAME_BUILDS_ENABLED` to `true`.

Tier limits live in `shared/game-builds.ts` and are enforced by the same
`validateBuildUpload` on both sides. Hosting is **Game Developer Pro only** —
there is no free tier of it. `FREE_QUOTA` is deliberately all zeros with no
allowed build types, so every quota check refuses a non-subscriber without
needing a separate code path to remember; `/upload-url` also 403s them up front
so the client can show the upgrade path instead of a form error. When a
subscription lapses, every hosted build is hidden (not just downloads) and the
bytes are kept for 90 days. Every build waits for a human in AdminPage before it
is public — the catalogue's existing auto-approve path is what produced the
"Untitled game" stubs, and the same mistake on a hosted executable is
distributing malware.

## Stack quick-ref

- Web client: Vite + React DOM + TypeScript in `client/`, output to `dist/public`.
- Server: tsx/Node + Express in `server/`, output to `dist/index.js`.
- Mobile: Capacitor wraps `dist/public` into native iOS/Android shells.
- Package manager: **bun** (`bun.lock` / `bun.lockb`). If `node_modules` looks
  out of sync with `package.json`, run `bun install`.
