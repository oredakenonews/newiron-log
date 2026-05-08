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
- profiles（ユーザー情報・トレーナーキャラ・onboarding_done）
- body_weights（体重記録）
- workout_sessions（トレーニング記録）
- user_exercises（種目設定）
- ai_memories（AI記憶・将来用）

## デザイン
- ダークテーマ（背景#0f0f0f、カード#1a1a1a）
- アクセントカラー：オレンジ（#f97316）
- フォント：Bebas Neue（数字）、Noto Sans JP（本文）

## 現在の状態
- 認証・オンボーディング・4タブ実装済み
- オンボーディング完了時にデフォルト種目21件を自動登録する実装済み
- AIタブはプレースホルダー（有料機能・未実装）

## 今後やること
- AIトレーナー機能の実装（Anthropic API連携）
- フリーミアム・Stripe連携
- トレーナーキャラのイラスト
