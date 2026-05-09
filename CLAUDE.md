# IRON LOG - CLAUDE.md

## プロジェクト概要
筋トレ記録アプリ。React + Vite + Vercel + Supabase構成。

## URL
- 本番: https://newiron-log.vercel.app
- GitHub: https://github.com/oredakenonews/newiron-log
- Supabase: https://supabase.com/dashboard/project/pkgxgvkbzxenwmiyewmx

## 技術スタック
- React + Vite
- Supabase（認証・DB・Edge Functions）
- Vercel（デプロイ）
- React Router v6
- Anthropic API（claude-haiku-4-5-20251001）→ Supabase Edge Function経由

## 画面構成
- /login, /signup, /reset-password（認証）
- /onboarding（初回カウンセリング・チャット形式）
- /（記録タブ）
- /history（履歴タブ）
- /ai（AIトレーナータブ）
- /settings（プロフィール・AIコーチ・種目設定）

## Supabaseテーブル
- profiles（ユーザー情報・trainer_character・coach_mode・onboarding_done・current_weight_kg・goal_weight_kg）
- body_weights（体重記録）
- workout_sessions（トレーニング記録・exercises/cardio/memoをJSONで保存）
- user_exercises（種目設定・weight_min/reps_step/reps_maxカラムあり）
- ai_memories（AI記憶・将来用）

## Supabase Edge Functions
- `ai-chat`（v5）: Anthropic API呼び出し
  - リクエスト: `{ message, history, profile, recentWorkouts, coachMode }`
  - `coachMode`: 'spartan' or 'gentle'（profiles.coach_modeから送信）
  - システムプロンプト構成: トレーナーペルソナ（経歴・口癖・一人称含む詳細） + コーチングモード指示 + ユーザー情報 + 直近記録
  - キャラクターの口調・一人称を最優先、その上でモード強度を調整する設計

## デザインシステム
- ダークテーマ: 背景`#0B0D10`、カード`#13171F`、深背景`#0E1118`、ボーダー`#1F242E`
- アクセント: オレンジ`#FF6A1A`、グリーン`#5BC25B`、ミュート`#5A6477`
- フォント: Oswald（数字・見出し）、Bebas Neue（ラベル・タグ）、JetBrains Mono（数値）、Noto Sans JP（本文）
- 角丸なし・シャープ統一（border-radius: 0）
- モバイルファースト・max-width 430px

## 現在の状態
- 認証・オンボーディング・4タブ実装済み
- オンボーディング完了時にデフォルト種目21件をuser_exercisesに自動登録
- 記録タブの重量・回数入力はダイヤル式ホイールピッカー（scroll-snap）
  - セット行タップ→ボトムシートで重量×回数を同時選択
  - user_exercisesのweight_min/reps_step/reps_maxに応じた値域を適用
- 履歴タブ: 今週サマリー（MiniBar）＋フィルター（すべて/胸/背中/脚/肩・腕）＋セッション詳細
- AIタブ: トレーナーキャラ表示・インサイトカード4枚・チャット機能（Anthropic API接続済み）
  - チャット画面: トレーナーアバター＋名前＋モードバッジ＋オンライン表示
  - AIメッセージ: アバター横＋左アクセントボーダー付きシャープカード
- 設定タブ > AIコーチ: トレーナー選択 ＋ スパルタ/やさしいモード切替（profiles.coach_modeに保存）

## トレーナーキャラクター（9人）
| ID | 名前 | タイプ | 一人称 | 特徴 |
|---|---|---|---|---|
| RYOTA | RYOTA | 熱血系 | 俺 | 元ラグビー・陸上選手、！多用 |
| YUKI | YUKI | 穏やか系 | わたし | 元看護師、産後リハビリ専門 |
| DAIKI | DAIKI | 理論派 | 私 | 東大大学院スポーツ科学修士 |
| KENJI | KENJI | ストイック系 | 俺 | 元自衛隊、極端に言葉が少ない |
| NANA | NANA | ポジティブ系 | 私 | YouTubeフィットネス5万人 |
| HANA | HANA | 丁寧系 | わたくし/私 | 理学療法士資格、必ず敬語 |
| RACHELL | RACHELL | 国際派 | 私 | NSCA-CSCS、英日混在 |
| TORU | TORU | ベテラン系 | 俺 | トレーニング歴25年超、50代現役 |
| BILLY | BILLY | エンタメ系 | 俺 | HIPHOPダンサー、YO！FIRE！ |

## カテゴリ分類（src/lib/categories.js）
共有モジュール。RecordTab・HistoryTab・SettingsTabすべてここからimport。
- CHEST / BACK / LEGS / SHOULDERS / ARMS / CORE
- フィルター: 胸→CHEST、背中→BACK、脚→LEGS、肩・腕→SHOULDERS+ARMS

## 注意事項
- iOS Safariのauto-zoom防止のためinput/select/textareaにfont-size:16px強制（index.css）
- useAuth.jsのfetchProfileはtry/finallyでloading=falseを保証
- overflow-x:hiddenをbodyと#root両方に設定済み
- Supabase無料プランのため7日間アクセスなしで自動停止する点に注意

## 今後やること
- フリーミアム・Stripe連携
- トレーナーキャラのイラスト（現在はbu画像を使用）
- AIメモリ機能（ai_memoriesテーブル活用）
- 体重グラフ（body_weights活用）
