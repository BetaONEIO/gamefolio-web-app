# Sentry QA Build — handoff / runbook

Status as of 2026-06-27. Sentry crash/error reporting is wired into the app and
on `main`. This doc lets the work resume on the release machine — say to Claude
*"carry on with the Sentry work"* and start from the TODO list at the bottom.

## What's already done (committed to `main`)

- `@sentry/capacitor` + `@sentry/react` + `@sentry/vite-plugin` installed.
- `client/src/lib/sentry.ts` — `initSentry()` (no-op unless `VITE_SENTRY_DSN`
  is set) and `setSentryUser()`. Filters MetaMask/extension/web3/video-autoplay
  noise the app already swallows in `main.tsx`.
- `client/src/main.tsx` — calls `initSentry()` first thing.
- `client/src/components/ErrorBoundary.tsx` — forwards React render crashes via
  `Sentry.captureException`.
- `vite.config.ts` — tags the Sentry release `gamefolio@<versionName>+<versionCode>`
  read from `android/app/build.gradle`; sourcemap upload runs only when
  `SENTRY_AUTH_TOKEN` is set.
- Verified: `vite build`, `cap sync android`, and Android `assembleDebug` all
  succeed with the Sentry native module linked. iOS pod is wired in the Podfile
  but unbuilt (no Xcode/CocoaPods on the original machine).

## Per-machine setup (do once on the build machine)

1. `git pull` — gets the Sentry commit.
2. `bun install` — pulls the Sentry packages.
3. Append to the root `.env` (gitignored) — **don't overwrite other `VITE_*` keys**:
   ```
   VITE_SENTRY_DSN=https://d2a24e20dc9d4867d6a17eb68f24967d@o4511636764098560.ingest.de.sentry.io/4511636774060112
   ```
   This is the client DSN (EU region) — designed to live in the shipped bundle,
   so it's safe. Without it the build still works; Sentry just stays disabled.
4. iOS only: full **Xcode** + **CocoaPods** + `.env.ios.local` (4 keys) + Apple ID
   signed into Xcode. Sentry's pod installs automatically during `cap sync ios`.

## Build commands

- **Android AAB / iOS TestFlight:** follow the "Put a new build in for
  production" steps in `CLAUDE.md`.
- **JAVA_HOME gotcha:** the Android Studio JBR path baked into `CLAUDE.md` may
  not exist on a given machine. A system Temurin JDK works — e.g.
  `JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"`
  for `./gradlew bundleRelease`.

## Signing secrets needed (gitignored — restore on the build machine)

- **Android:** `android/keystore.properties` + `@adminbetaone__gamefolio.jks` (repo root).
- **iOS:** `.env.ios.local` (`IOS_TEAM_ID`, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`,
  `ASC_API_KEY_PATH`) + the `.p8` at `ASC_API_KEY_PATH`.

## Remaining TODO

- [ ] Set `VITE_SENTRY_DSN` in the build machine's `.env`.
- [ ] Run the Android production build (needs keystore restored).
- [ ] Run the iOS TestFlight build (needs Xcode / CocoaPods / `.env.ios.local`).
- [ ] Verify capture: trigger a test error on a device and confirm it lands in
      the **EU** Sentry dashboard (Issues), tagged with the right release.
- [ ] (Optional) Readable JS stack traces: set `SENTRY_AUTH_TOKEN` + `SENTRY_ORG`
      + `SENTRY_PROJECT` so `vite build` uploads sourcemaps.
- [ ] (Optional) iOS native crash symbolication: upload dSYMs to Sentry.
- [ ] (Optional) Make the release tag iOS-aware (it currently uses the Android
      `versionName`/`versionCode` for both platforms).
- [ ] (Optional) Wire `setSentryUser()` on sign-in / sign-out for attribution.
