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

# App Store Connect APIキー認証（あれば使う。Apple IDのセッション切れと無縁になる）
# .env.asc に ASC_KEY_ID / ASC_ISSUER_ID を書き、
# ~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8 を置く
AUTH_FLAGS=()
[[ -f .env.asc ]] && source .env.asc
if [[ -n "${ASC_KEY_ID:-}" && -n "${ASC_ISSUER_ID:-}" ]]; then
  AUTH_FLAGS=(
    -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
    -authenticationKeyID "$ASC_KEY_ID"
    -authenticationKeyIssuerID "$ASC_ISSUER_ID"
  )
  echo "▶ App Store Connect APIキー認証を使用（Key ID: $ASC_KEY_ID）"
fi

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
  -allowProvisioningUpdates "${AUTH_FLAGS[@]}" \
  CURRENT_PROJECT_VERSION=$BUILD_NUMBER \
  -quiet

echo "▶ App Store Connect へアップロード"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$EXPORT_DIR/ExportOptions.plist" \
  -exportPath "$EXPORT_DIR" \
  -allowProvisioningUpdates "${AUTH_FLAGS[@]}"

rm -rf "$EXPORT_DIR"
echo "✔ アップロード完了（ビルド $BUILD_NUMBER）。処理が終わると App Store Connect の TestFlight に出ます（10〜30分）"

# ── ビルド番号⇔コミットの対応をgitタグで永続化（切り戻し用） ──
# 一覧: npm run ios:builds / 切り戻し: npm run ios:rollback -- <ビルド番号>
COMMIT=$(git rev-parse --short HEAD)
if [[ -n "$(git status --porcelain)" ]]; then
  TAG_MSG="TestFlight build $BUILD_NUMBER from $COMMIT (⚠ dirty working tree)"
  echo "⚠ 未コミットの変更があるままビルドしました。タグはHEADを指しますが、配信物と完全一致しない可能性があります"
else
  TAG_MSG="TestFlight build $BUILD_NUMBER from $COMMIT"
fi
git tag -a "build/$BUILD_NUMBER" -m "$TAG_MSG"
git push -q origin "build/$BUILD_NUMBER" \
  && echo "✔ タグ build/$BUILD_NUMBER を作成・push（$COMMIT）" \
  || echo "⚠ タグのpushに失敗。後で: git push origin build/$BUILD_NUMBER"
