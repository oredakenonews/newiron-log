#!/bin/zsh
# 過去のTestFlightビルドのコードを、新しいビルド番号で再アップロードする（切り戻し）。
# TestFlightは古いビルド番号を再配信できないため、「旧コード＋新ビルド番号」が正攻法。
#
# 使い方:
#   npm run ios:builds                      # ビルド履歴（タグ一覧）を確認
#   npm run ios:rollback -- 202610101948    # そのビルドのコードで再アップロード
#   npm run ios:rollback -- <git ref>       # build/タグ以外のコミットSHA等も可
#
# 処理: 対象refをチェックアウト → その時点のtestflight.shでビルド・アップロード →
#       元のブランチへ自動復帰（失敗時も復帰する）。依存が違えばnpm installも自動。
#
# 注意: チェックアウトでこのスクリプト自身が消える/変わる可能性があるため、
#       全体をmain()に包んで実行前にファイル全体をパースさせている（削らないこと）。
set -euo pipefail

main() {
  cd "$(dirname "$0")/.."

  local REF="${1:?使い方: npm run ios:rollback -- <ビルド番号 or git ref>}"
  # ビルド番号だけ渡されたら build/ タグに解決
  if git rev-parse -q --verify "refs/tags/build/$REF" >/dev/null; then
    REF="build/$REF"
  fi
  git rev-parse -q --verify "$REF^{commit}" >/dev/null || {
    echo "✖ ref が見つかりません: $REF（npm run ios:builds で一覧を確認）"; return 1
  }

  # 作業ツリーが汚れたまま切り戻すと変更が混入・消失しうるので拒否
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "✖ 未コミットの変更があります。コミットまたは stash してから実行してください"; return 1
  fi

  ORIG_REF=$(git symbolic-ref --short -q HEAD || git rev-parse HEAD)
  ORIG_LOCK=$(git hash-object package-lock.json)
  ROLLBACK_LOCK="$ORIG_LOCK"
  trap restore EXIT

  echo "▶ $REF（$(git rev-parse --short "$REF")）をチェックアウト"
  git checkout -q "$REF"

  ROLLBACK_LOCK=$(git hash-object package-lock.json)
  if [[ "$ROLLBACK_LOCK" != "$ORIG_LOCK" ]]; then
    echo "▶ 依存が異なるため npm install"
    npm install --no-audit --no-fund >/dev/null
  fi

  echo "▶ このコードでTestFlightへアップロード（新しいビルド番号が採番されます）"
  zsh scripts/testflight.sh

  echo "✔ 切り戻しビルドのアップロード完了"
}

restore() {
  local CUR
  CUR=$(git symbolic-ref --short -q HEAD || git rev-parse HEAD)
  if [[ "$CUR" != "$ORIG_REF" ]]; then
    echo "▶ 元のブランチ（$ORIG_REF）へ復帰"
    git checkout -q "$ORIG_REF"
    if [[ "$(git hash-object package-lock.json)" != "$ROLLBACK_LOCK" ]]; then
      echo "▶ 依存を現行に戻す（npm install）"
      npm install --no-audit --no-fund >/dev/null
    fi
  fi
}

main "$@"
