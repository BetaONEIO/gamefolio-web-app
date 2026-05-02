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

When the user asks for a production build, run **both** pipelines:
1. Bump Android `versionCode` (commit it).
2. Run the Android AAB build above.
3. Run `./scripts/ios-testflight.sh` (confirm first — visible-to-others action).

The Android AAB lands locally for the user to upload to Play Console; the iOS
build goes straight to App Store Connect / TestFlight.

## Stack quick-ref

- Web client: Vite + React DOM + TypeScript in `client/`, output to `dist/public`.
- Server: tsx/Node + Express in `server/`, output to `dist/index.js`.
- Mobile: Capacitor wraps `dist/public` into native iOS/Android shells.
- Package manager: **bun** (`bun.lock` / `bun.lockb`). If `node_modules` looks
  out of sync with `package.json`, run `bun install`.
