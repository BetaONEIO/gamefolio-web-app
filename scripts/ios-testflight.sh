#!/usr/bin/env bash
# Build the iOS app from the current source and upload it to TestFlight.
#
# Required environment variables:
#   IOS_TEAM_ID         Apple Developer Team ID (10-char alphanumeric).
#   ASC_API_KEY_ID      App Store Connect API Key ID (10-char).
#   ASC_API_ISSUER_ID   App Store Connect Issuer ID (UUID).
#   ASC_API_KEY_PATH    Path to the .p8 private-key file from App Store Connect.
#
# Optional:
#   BUILD_NUMBER        Override CFBundleVersion. Defaults to a UTC timestamp
#                       (YYYYMMDDHHMM) which is monotonically increasing and
#                       satisfies App Store Connect's "must be unique per
#                       marketing version" rule.
#
# Prerequisites (one-time, on this machine):
#   - Xcode + command-line tools installed.
#   - A valid iOS Distribution certificate and provisioning profile in the
#     login keychain (use Xcode automatic signing with the team set above).
#   - An App Store Connect API key created at
#     https://appstoreconnect.apple.com/access/api with App Manager role.
#   - The app record (com.gamefolio.app) must already exist in App Store Connect.
#
# Usage:
#   IOS_TEAM_ID=ABCDE12345 \
#   ASC_API_KEY_ID=XXXXXXXXXX \
#   ASC_API_ISSUER_ID=00000000-0000-0000-0000-000000000000 \
#   ASC_API_KEY_PATH=~/keys/AuthKey_XXXXXXXXXX.p8 \
#   ./scripts/ios-testflight.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Auto-source .env.ios.local (gitignored) if present so callers don't have to
# pass the credentials inline every time.
if [[ -f "$REPO_ROOT/.env.ios.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.ios.local"
  set +a
fi

: "${IOS_TEAM_ID:?IOS_TEAM_ID is required}"
: "${ASC_API_KEY_ID:?ASC_API_KEY_ID is required}"
: "${ASC_API_ISSUER_ID:?ASC_API_ISSUER_ID is required}"
: "${ASC_API_KEY_PATH:?ASC_API_KEY_PATH is required}"

ASC_API_KEY_PATH="${ASC_API_KEY_PATH/#~/$HOME}"
[[ -f "$ASC_API_KEY_PATH" ]] || { echo "ASC API key not found: $ASC_API_KEY_PATH" >&2; exit 1; }

WORKSPACE="$REPO_ROOT/ios/App/App.xcworkspace"
SCHEME="App"
BUILD_DIR="$REPO_ROOT/ios/build"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
EXPORT_OPTIONS="$BUILD_DIR/ExportOptions.plist"

BUILD_NUMBER="${BUILD_NUMBER:-$(date -u +%Y%m%d%H%M)}"

# altool finds the API key by looking for AuthKey_<KEYID>.p8 in the directory
# given by API_PRIVATE_KEYS_DIR. Stage a copy so any source path/name works.
KEY_STAGING="$(mktemp -d)"
trap 'rm -rf "$KEY_STAGING"' EXIT
cp "$ASC_API_KEY_PATH" "$KEY_STAGING/AuthKey_${ASC_API_KEY_ID}.p8"

echo "==> Building web bundle and syncing Capacitor iOS project"
cd "$REPO_ROOT"
bun run mobile:build:ios

echo "==> Cleaning previous archive output"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cat > "$EXPORT_OPTIONS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>app-store</string>
    <key>teamID</key><string>$IOS_TEAM_ID</string>
    <key>signingStyle</key><string>automatic</string>
    <key>uploadSymbols</key><true/>
    <key>destination</key><string>export</string>
</dict>
</plist>
PLIST

echo "==> Archiving (Team: $IOS_TEAM_ID, Build: $BUILD_NUMBER) — this can take several minutes"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  DEVELOPMENT_TEAM="$IOS_TEAM_ID" \
  archive

echo "==> Exporting signed .ipa"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

IPA_PATH=$(find "$EXPORT_PATH" -name "*.ipa" -type f | head -n 1)
[[ -n "$IPA_PATH" ]] || { echo "No .ipa was produced under $EXPORT_PATH" >&2; exit 1; }

echo "==> Uploading $IPA_PATH to App Store Connect"
API_PRIVATE_KEYS_DIR="$KEY_STAGING" xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$ASC_API_KEY_ID" \
  --apiIssuer "$ASC_API_ISSUER_ID"

echo "==> Upload accepted. Build $BUILD_NUMBER will appear in TestFlight in 5–15 min once Apple finishes processing."
