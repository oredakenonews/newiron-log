#!/bin/zsh
# iOS 版をビルドして App Store Connect（TestFlight）にアップロードする。
# 署名とアップロードは Xcode に登録してある Apple ID（Settings → Accounts）を使う。
# ビルド番号は日時（例 202610101900）にするので、毎回あげなおす手間はない。バージョン（1.0 など）は Xcode の MARKETING_VERSION。
#
# 使い方: npm run ios:testflight
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=ios/App/App.xcodeproj
BUILD_NUMBER=$(date +%Y%m%d%H%M)
TEAM_ID=$(grep -m1 -o 'DEVELOPMENT_TEAM = [A-Z0-9]*' $PROJECT/project.pbxproj | awk '{print $3}')
ARCHIVE=~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/airon-log-$BUILD_NUMBER.xcarchive
EXPORT_DIR=$(mktemp -d)

# ビルドを iOS プロジェクトへ同期
npm run ios:sync
# exFAT の SSD では ._ ファイルが生まれる。バンドルに入ると署名が壊れるので消す
find ios/App -name '._*' -delete

cat > "$EXPORT_DIR/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>upload</string>
	<key>teamID</key>
	<string>$TEAM_ID</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
EOF

echo "▶ archive（ビルド番号 $BUILD_NUMBER、チーム $TEAM_ID）"
xcodebuild archive \
  -project $PROJECT -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  CURRENT_PROJECT_VERSION=$BUILD_NUMBER \
  -quiet

echo "▶ App Store Connect へアップロード"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$EXPORT_DIR/ExportOptions.plist" \
  -exportPath "$EXPORT_DIR" \
  -allowProvisioningUpdates

rm -rf "$EXPORT_DIR"
echo "✔ アップロード完了（ビルド $BUILD_NUMBER）。処理が終わると App Store Connect の TestFlight に出ます（10〜30分）"
