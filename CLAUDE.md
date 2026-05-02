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
1. Bump Android `versionCode` in `android/app/build.gradle` (must be greater
   than the last Play Console upload — check the most recent
   `Bump Android versionCode` commit). Commit it.
2. `bun run mobile:build:android`
3. `cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew bundleRelease`
4. `./scripts/ios-testflight.sh` (confirm first — visible-to-others action).

AAB lands at `android/app/build/outputs/bundle/release/app-release.aab` (inside
the repo, gitignored — leave it there; user grabs it from Finder for Play
Console upload). iOS goes straight to App Store Connect / TestFlight.

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

## Stack quick-ref

- Web client: Vite + React DOM + TypeScript in `client/`, output to `dist/public`.
- Server: tsx/Node + Express in `server/`, output to `dist/index.js`.
- Mobile: Capacitor wraps `dist/public` into native iOS/Android shells.
- Package manager: **bun** (`bun.lock` / `bun.lockb`). If `node_modules` looks
  out of sync with `package.json`, run `bun install`.
