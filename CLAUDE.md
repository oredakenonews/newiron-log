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
- planned_sessions（AIが生成したトレーニング計画・planned_date/exercises/status/linked_session_id）
- ai_memories（AI記憶・将来用）

## Supabase Edge Functions
- `ai-chat`（v6）: Anthropic API呼び出し
  - リクエスト: `{ message, history, profile, recentWorkouts, coachMode, format? }`
  - `coachMode`: 'spartan' or 'gentle'（profiles.coach_modeから送信）
  - `format: 'structure'`: AIテキストからトレーニング計画JSONを抽出して返す
  - システムプロンプト構成: トレーナーペルソナ（経歴・口癖・一人称含む詳細） + コーチングモード指示 + ユーザー情報 + 直近記録
  - キャラクターの口調・一人称を最優先、その上でモード強度を調整する設計

## デザインシステム
- ダークテーマ: 背景`#0B0D10`、カード`#13171F`、深背景`#0E1118`、ボーダー`#1F242E`
- アクセント: オレンジ`#FF6A1A`、グリーン`#5BC25B`、ミュート`#5A6477`
- フォント: Oswald（数字・見出し）、Bebas Neue（ラベル・タグ）、JetBrains Mono（数値）、Noto Sans JP（本文）
- 角丸なし・シャープ統一（border-radius: 0）
- モバイルファースト・max-width 430px
- ダッシュボーダーCTA: `border: 1px dashed #2A3142`（控えめなアップセル等に使用）
- オンラインドット: 6×6 `#5BC25B`、`box-shadow: 0 0 0 1px #0B0D10`リング

## 現在の状態
- 認証・オンボーディング・4タブ実装済み
- オンボーディング完了時にデフォルト種目21件をuser_exercisesに自動登録
- 記録タブ: ホイールピッカーでセット入力、VolumeHeader下にCoachStrip表示（進捗に応じて文言変化）、AIが生成した今日の計画バナー表示
- 履歴タブ: 今週サマリー（MiniBar）＋CoachStrip＋フィルター＋セッション詳細（編集モードあり）
  - セッション行に今日・脚の日はCoachQuoteを表示
  - 編集モード: セット重量/回数タップ→ホイールピッカー、セット追加/削除、種目追加/削除、DB保存
- AIタブ（コーチフィード）:
  - ヘッダー: 72pxアバター（K/H）＋コーチ名（コーチ・カイザー/コーチ・ハル）＋ModePill
  - ModePill: スパルタ/やさしい切替、即時全タブに反映しDBにも保存
  - FeedTurn × 5: 今日のひとこと / 伸び / 気になる点 / 次の目標 / バランス
  - インラインチャットトリガー、控えめなProライン（dashed border）
  - チャット: トレーナー画像アバター＋名前＋モードバッジ＋オンライン表示
  - プラン検出（3回以上のセット/回/kg表記）→「この計画を保存する」ボタン→planned_sessionsに保存
- 設定タブ: プロフィール・AIコーチ（トレーナー選択＋モード切替）・種目管理

## コーチ共存プレゼンス（src/lib/coachContext.jsx）
全タブに共通のコーチ状態を提供するReact Context。

```ts
COACHES_SHARED = {
  spartan: { name: 'コーチ・カイザー', tag: 'スパルタ', tone: '#FF6A1A', letter: 'K' },
  gentle:  { name: 'コーチ・ハル',     tag: 'やさしい', tone: '#5BC25B', letter: 'H' },
}
```

- `CoachProvider`: Layout.jsxでラップ。`profiles.coach_mode`と自動同期。`setMode()`でDB即時保存。
- `useCoach()`: `{ mode, setMode, coach }` を返す
- `CoachAvatarShared`: ハッチパターン+レター正方形アバター（pulse propでグリーンドット付加）
- `CoachStrip`: 64pxアバター+コーチ名+メッセージ+CTA。RecordTab・HistoryTabで使用
- `CoachQuote`: 32pxアバター+左ボーダー付き引用。HistoryTabのセッション行で使用
- `COACH_LINES`: spartan/gentleそれぞれの画面別セリフ（record_idle/record_active/record_done/history_summary/workout_*）

クロスタブチャット起動: `window.dispatchEvent(new CustomEvent('iron-open-chat'))` → AITabのuseEffectが購読。ナビゲーション遷移は`navigate('/ai')`。

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

チャット時はトレーナー固有の口調・経歴・一人称で応答（edge functionのシステムプロンプトで規定）。コーチ共存プレゼンス（K/H）はモード表示のみ担当。

## ファイル構成
```
newiron-log/
├── index.html              # Googleフォント読み込み（Oswald/JetBrains Mono/Bebas Neue/Noto Sans JP）
├── vite.config.js
├── vercel.json
├── public/
├── gazou/                  # トレーナー画像（ryota_bu.png など）
└── src/
    ├── main.jsx
    ├── App.jsx             # ルーティング・認証ガード・ローディング画面
    ├── index.css           # CSS変数・font-size:16px強制・overflow-x:hidden
    ├── lib/
    │   ├── supabase.js     # Supabaseクライアント初期化
    │   ├── categories.js   # CATEGORY_MAP / getCategory() / FILTER_CATS（共有）
    │   └── coachContext.jsx # CoachProvider / useCoach / CoachAvatarShared / CoachStrip / CoachQuote / COACH_LINES
    ├── hooks/
    │   └── useAuth.js      # 認証状態・profile取得・refreshProfile
    └── components/
        ├── layout/
        │   ├── Layout.jsx  # CoachProviderラップ + TopBar + 子コンテンツ + BottomNav
        │   ├── TopBar.jsx  # ILロゴ・タブ名サブタイトル・FREEバッジ
        │   └── BottomNav.jsx # 4タブ・アクティブ時オレンジ上線
        ├── auth/
        │   ├── LoginForm.jsx
        │   ├── SignupForm.jsx
        │   └── ResetPasswordForm.jsx
        ├── onboarding/
        │   └── OnboardingChat.jsx  # 初回チャット形式カウンセリング・デフォルト種目登録
        ├── record/
        │   └── RecordTab.jsx       # CoachStrip・種目追加・セット記録・ホイールピッカー・保存・計画バナー
        ├── history/
        │   └── HistoryTab.jsx      # CoachStrip・CoachQuote・週サマリー・フィルター・セッション詳細（編集モード）
        ├── ai/
        │   └── AITab.jsx           # コーチフィード（FeedTurn）・ModePill・チャットシート
        ├── settings/
        │   └── SettingsTab.jsx     # プロフィール・AIコーチ（トレーナー選択＋モード）・種目管理
        └── shared/
            ├── WheelPickerSheet.jsx # ホイールピッカー共有コンポーネント（WEIGHT_VALUES/REP_VALUES/nearestWeightもエクスポート）
            └── AddExerciseSheet.jsx # 種目追加ボトムシート共有コンポーネント
```

## カテゴリ分類（src/lib/categories.js）
共有モジュール。RecordTab・HistoryTab・SettingsTabすべてここからimport。
- CHEST / BACK / LEGS / SHOULDERS / ARMS / CORE
- フィルター: 胸→CHEST、背中→BACK、脚→LEGS、肩・腕→SHOULDERS+ARMS

## 注意事項
- iOS Safariのauto-zoom防止のためinput/select/textareaにfont-size:16px強制（index.css）
- useAuth.jsのfetchProfileはtry/finallyでloading=falseを保証
- overflow-x:hiddenをbodyと#root両方に設定済み
- Supabase無料プランのため7日間アクセスなしで自動停止する点に注意
- CoachProviderはLayout.jsx内（認証済みルートのみ）に配置。useCoach()はAuth確定後のみ呼ぶこと

## デザイン・コード同期ルール

**本番コード（`src/`）が canonical（正）。デザインファイルはミラー。**

- 変更の流れ: コード修正 → 同じセッション内でデザインファイルにも同じ差分を反映
- 対象ファイル: `design_handoff_coach_copresence/` 内の該当 `.jsx`
  - `coachContext.jsx` 変更 → `coach-shared.jsx` に反映
  - `RecordTab.jsx` 変更 → `record.jsx` に反映
  - `HistoryTab.jsx` 変更 → `history.jsx` に反映
  - `AITab.jsx` 変更 → `ai.jsx` に反映
- デザインファイル単独での変更は禁止。必ずコードを先に変更してからミラーする
- Claude Code は各コード変更後、対応するデザインファイルを必ず更新すること

## 今後やること
- フリーミアム・Stripe連携（¥980/月 Pro）
- トレーナーキャラのイラスト（現在はbu画像を使用）
- AIメモリ機能（ai_memoriesテーブル活用）
- 体重グラフ（body_weights活用）
- CoachStripタップ→AIタブ遷移後にチャット自動オープン（現在は遷移のみ）
