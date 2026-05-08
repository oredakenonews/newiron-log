# IRON LOG - CLAUDE.md

## プロジェクト概要
筋トレ記録アプリ。React + Vite + Vercel + Supabase構成。

## URL
- 本番: https://newiron-log.vercel.app
- GitHub: https://github.com/oredakenonews/newiron-log
- Supabase: https://supabase.com/dashboard/project/pkgxgvkbzxenwmiyewmx

## 技術スタック
- React + Vite
- Tailwind CSS
- Supabase（認証・DB）
- Vercel（デプロイ）
- React Router v6

## 画面構成
- /login, /signup, /reset-password（認証）
- /onboarding（初回カウンセリング・チャット形式）
- /（記録タブ）
- /history（履歴タブ・体重グラフ）
- /ai（AIトレーナー・現在はプレースホルダー）
- /settings（プロフィール・トレーナー・種目設定）

## Supabaseテーブル
- profiles（ユーザー情報・トレーナーキャラ・onboarding_done・current_weight_kg・goal_weight_kg）
- body_weights（体重記録）
- workout_sessions（トレーニング記録・exercises/cardio/memoをJSONで保存）
- user_exercises（種目設定・weight_min/reps_step/reps_maxカラムあり）
- ai_memories（AI記憶・将来用）

## デザイン
- ダークテーマ（背景#0f0f0f、カード#1a1a1a）
- アクセントカラー：オレンジ（#f97316）
- フォント：Bebas Neue（数字・見出し）、Noto Sans JP（本文）
- モバイルファースト・max-width 430px

## 現在の状態
- 認証・オンボーディング・4タブ実装済み
- オンボーディング完了時にデフォルト種目21件をuser_exercisesに自動登録
- 記録タブの重量・回数入力はダイヤル式ホイールピッカー（scroll-snap）
  - セット行タップ→ボトムシートで重量×回数を同時選択
  - user_exercisesのweight_min/reps_step/reps_maxに応じた値域を適用
- AIタブはプレースホルダー（有料機能・未実装）
- Supabase無料プランのため7日間アクセスなしで自動停止する点に注意

## 注意事項
- iOS Safariのauto-zoom防止のためinput/select/textareaにfont-size:16px強制（index.css）
- useAuth.jsのfetchProfileはtry/finallyでloading=falseを保証
- overflow-x:hiddenをbodyと#root両方に設定済み

## 今後やること
- AIトレーナー機能の実装（Anthropic API連携）
- フリーミアム・Stripe連携
- トレーナーキャラのイラスト
