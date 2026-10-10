# IRON LOG - CLAUDE.md

## プロジェクト概要
筋トレ記録アプリ（iOS: AIron.log）。React + Vite + Capacitor構成。

## ⚠️ v2アーキテクチャ（2026-10-10 mainへマージ・本番反映済み）
**Supabase依存を廃止し、ローカルファースト化した。** 本番Web・AIプロキシ・TestFlight初ビルドまで稼働確認済み。mainとv2-local-firstは同一コミットを維持する（v2ブランチで作業→mainへff-merge）。 以下のCLAUDE.md中のSupabase関連記述（テーブル・Edge Function・認証）はv1時代の説明（参照用）であり、現行コードには該当しない。

- **認証なし**: ログイン/サインアップ画面は削除。初回起動→オンボーディング→メイン
- **データは全て端末内**: `src/lib/localdb.js` が唯一のデータ層
  - ネイティブ: Capacitor Preferences（UserDefaults、iCloudバックアップ対象）
  - Web: localStorage
  - コレクション: profile / user_exercises / workout_sessions / planned_sessions / ai_memories / chat
  - workout_sessionsは同一日付upsert（旧UNIQUE(user_id,date)相当）
  - ai_memoriesのtype別置き換え統合・TTLはlocaldb内で実装（旧v11と同仕様）
  - エクスポート/インポート: `exportAll()` / `importAll()`（設定タブにJSONエクスポートあり）
- **AIプロキシ**: `api/ai-chat.js`（Vercel Serverless Function、ステートレス）
  - クライアント（`src/lib/aiClient.js`）がprofile・直近記録・記憶を毎回送る
  - `format:'structure'`=計画JSON化 / `format:'memory'`=記憶抽出（保存はクライアント。v2.1でキーワードゲート廃止→毎メッセージ後にバックグラウンド抽出）
  - **設定済み: Vercel環境変数 `ANTHROPIC_API_KEY`**（2026-10-10・All Environments・Secretタイプのため値は再表示不可。キーはClaude Consoleの`newironlog-vercel`）
  - 保護: CORS許可オリジン限定 / レート制限（Upstash env設定時は永続・5分30回、未設定はメモリ版フォールバック）/ 簡易トークン（`AI_PROXY_TOKEN`+`VITE_AI_PROXY_TOKEN`をペアで設定時のみ有効）。App Attestは未実装（TODO）
  - ネイティブからは `https://newiron-log.vercel.app/api/ai-chat` を叩く（VITE_AI_ENDPOINTで上書き可）
- **useAuth**: API互換のまま中身をローカル化（user={id:'local'}固定、saveProfile(patch)追加）
- `supabase/functions/` はv1の遺産として残置（デプロイ済みEdge Functionの参照用）
- テスト: `node scripts/test-localdb.mjs`（データ層15項目）/ `node scripts/test-ai-chat.mjs`（AIプロキシ28項目・外部APIはモック）

## URL
- 本番: https://newiron-log.vercel.app
- GitHub: https://github.com/oredakenonews/newiron-log
- Supabase: https://supabase.com/dashboard/project/pkgxgvkbzxenwmiyewmx

## 技術スタック
- React + Vite
- Supabase（v1の遺産。v2では未使用）
- Vercel（デプロイ + `api/ai-chat.js` Serverless Function）
- React Router v6
- Anthropic API（claude-haiku-4-5-20251001）→ `api/ai-chat.js` 経由
- Capacitor（iOSネイティブラップ。`ios/`ディレクトリ、`capacitor.config.json`）

## iOSアプリ（Capacitor）
- `npm run ios:sync` でWeb資産を同期（ビルド＋exFATの`._*`掃除＋cap sync）
- **TestFlight配信: `npm run ios:testflight`**（scripts/testflight.sh。ビルド→アーカイブ→App Store Connectアップロードまで全自動。ビルド番号は日時で自動採番）
  - 認証: App Store Connect APIキー（**Adminロール必須**。非Adminは「クラウド管理の配布証明書」権限がなくexportArchiveが失敗する）
  - 設定: `.env.asc`（gitignore済み）に `ASC_KEY_ID` / `ASC_ISSUER_ID`。`.p8` は `~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`、Issuer IDの控えは `~/.appstoreconnect/issuer_id`
  - XcodeのApple IDセッションは使わない（CLIから壊れやすく、2026-10-10に実際に壊れていた）
  - App Store Connect: App「AIron.log」登録済み。内部テストグループ「Internal」（全ビルド自動アクセス）にテスター登録済み。初ビルド 1.0(202610101857) 配信済み（2026-10-10）
  - 輸出コンプライアンス: Info.plistに `ITSAppUsesNonExemptEncryption=false` 宣言済み（アップロード毎の質問なし）
- **ビルドのバージョン管理・切り戻し**（2026-10-10導入。build/202610102028以前のビルドにはタグなし）
  - `ios:testflight` 成功時に `build/<ビルド番号>` タグをHEADに自動作成・push（ビルド⇔コミット対応の永続化）
  - `npm run ios:builds`: ビルド履歴（タグ一覧）を新しい順に表示
  - `npm run ios:rollback -- <ビルド番号>`: そのビルドのコードをチェックアウトして**新しいビルド番号**で再アップロード→元ブランチへ自動復帰（TestFlightは旧ビルド番号を再配信できないため）。作業ツリーが汚れていると拒否
  - Web版の切り戻し: Vercelダッシュボードの Instant Rollback（またはタグをmainへ戻してpush）
- **フィードバック取り込み: `npm run ios:feedback`**（scripts/testflight-feedback.mjs。TestFlightのコメント・スクショ・クラッシュを `testflight-feedback/`[git管理外] に feedback.md＋画像・ログとして保存。前回比の新着に🆕）
- シミュレータ実行: `npx cap run ios` または Xcodeで `ios/App/App.xcodeproj` を開く
- appId: `com.oredakenonews.ironlog` / 表示名: **AIron.log**（com.ironlog.appは他者が登録済みで使用不可だった。アプリ内UIのワードマークはIRON LOGのまま）
- プラグイン: Haptics（ホイールピッカー・ボタンの触覚FB）/ Keyboard（resize: native）/ StatusBar / SplashScreen
- ハプティクスは `src/lib/haptics.js` 経由（Webではno-op。直接@capacitor/hapticsをimportしない）
- アイコン・スプラッシュ: `ios/App/App/Assets.xcassets`（ダークブランド版を生成済み）
- 英字フォント（Oswald/Bebas Neue/JetBrains Mono）は `public/fonts/` にセルフホスト。Noto Sans JPのみGoogle Fonts CDN
- `.env.local` にVITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEYが必要（gitignore済み。Vercelは環境変数で設定済み）

## 日付の扱い（重要）
- 日付文字列（YYYY-MM-DD）は必ず `src/lib/dates.js` の `localDateStr()` / `getWeekDates()` を使う
- `new Date().toISOString().split('T')[0]` は**UTCになるため禁止**（JST 0:00〜8:59に前日扱いになるバグの元）

## クロスタブ同期イベント
- `iron-plan-saved`: AIタブで計画保存 → RecordTabが計画バナーを再読込
- `iron-session-saved`: RecordTabで保存成功 → HistoryTabがセッション一覧を再読込
- `iron-open-chat`: チャットシートを開く（AITabが購読）

## データ保護（記録タブ）
- 入力内容は400msデバウンスで `localStorage`（`iron-draft-{userId}-{date}`）に下書き保存
- 保存成功時に下書き削除。マウント時は下書きがあればDBより優先して復元
- 保存失敗時はエラー表示（下書きが残るため入力は失われない）
- AIチャット履歴も `iron-chat-{userId}` に直近30件を永続化

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
- ai_memories（AI長期記憶）
  - カラム: `id` uuid PK / `user_id` uuid / `memory_type` text NOT NULL / `content` text NOT NULL / `created_at` timestamptz / `expires_at` timestamptz
  - RLS: `auth.uid() = user_id`（全操作）
  - `memory_type`の値: `injury` / `goal` / `preference` / `habit` / `note`
  - 読み書きはEdge Function側で完結（クライアントから直接触らない）

## Supabase Edge Functions
- コードは `supabase/functions/ai-chat/index.ts` でリポジトリ管理
- `ai-chat`（v8）: Anthropic API呼び出し + ai_memories読み書き
  - リクエスト: `{ message, history, profile, recentWorkouts, coachMode, format? }`
  - `coachMode`: 'spartan' or 'gentle'（profiles.coach_modeから送信）
  - `format: 'structure'`: AIテキストからトレーニング計画JSONを抽出して返す
  - システムプロンプト構成: トレーナーペルソナ + コーチングモード指示 + ユーザー情報 + **長期記憶** + 直近記録
  - キャラクターの口調・一人称を最優先、その上でモード強度を調整する設計

### ai_memories読み書きの仕組み（v11〜）
1. **読み込み（毎リクエスト）**: AuthorizationヘッダーのJWTでSupabaseクライアント生成 → 期限切れでない`ai_memories`を直近8件取得 → system promptの【長期記憶】セクションに `[memory_type] content` 形式で注入
2. **書き込み（バックグラウンド）**: ユーザーメッセージにキーワード（痛/怪我/肩/膝/目標/苦手 など）が含まれる場合のみ、`EdgeRuntime.waitUntil()` で非同期実行
   - 既存記憶（期限切れ除外）をプロンプトに渡し、**type別・最終状態置き換え方式**で統合
   - AIが `{"updates":[{"memory_type":"injury","memories":["統合済み内容"]}]}` を返す
   - 対象typeの既存レコードを全削除 → 統合済みリストをINSERT（重複発生しない）
   - レスポンス返却を待たないためレイテンシへの影響なし
3. **TTL（自動期限切れ）**: 保存時に`expires_at`を付与。期限切れはAI参照・UI表示両方から除外
   - injury=60日 / goal=90日 / preference・habit=180日 / note=30日
4. **セキュリティ**: RLS（`auth.uid() = user_id`）がユーザースコープを自動保証
5. **UI管理**: 設定 → AIコーチタブの「AI記憶」セクションで一覧表示・個別削除・全削除が可能

## デザインシステム
- **テーマ: ライトが基本＋設定でダーク切替**（2026-10-10 FB反映。`src/lib/theme.js`、localStorage `iron-theme`、`:root[data-theme="dark"]`）
- 色は `src/index.css` のCSS変数のみ使う: `--bg` `--bg-deep` `--card` `--border` `--border2` `--border-dash` `--text` `--text-sub` `--text-2nd` `--muted` `--text-strong` `--on-accent` `--err-*`
- アクセント: オレンジ`#FF6A1A`、グリーン`#5BC25B`は両テーマ共通のhexリテラル（JSで`${tone}22`等の文字列合成があるためvar化しない）
- 新規UIにダーク時代のhex（#0B0D10/#13171F/#EEF1F6等）を直接書かない。デザインミラーのみ例外的にダークhexで代表
- 本文Noto Sans JPの基準ウェイトは500（index.cssのbody。ライト地で400は細く見える）
- トレーナー画像（public/gazou/*_bu.png）は市松焼き込みを除去し真の透過PNG化済み（scripts/remove-checkerboard.py。新画像追加時も同スクリプトで処理）
- フォント: Oswald（数字・見出し）、Bebas Neue（ラベル・タグ）、JetBrains Mono（数値）、Noto Sans JP（本文）
- 角丸なし・シャープ統一（border-radius: 0）
- モバイルファースト・max-width 430px
- ダッシュボーダーCTA: `border: 1px dashed #2A3142`（控えめなアップセル等に使用）
- オンラインドット: 6×6 `#5BC25B`、`box-shadow: 0 0 0 1px #0B0D10`リング

## 現在の状態
- 認証・オンボーディング・4タブ実装済み
- オンボーディング完了時にデフォルト種目21件をuser_exercisesに自動登録
- 起動時WelcomeModal（Layout配下・セッション毎1回）: 大型キャラ＋キャラのセリフ＋TODAY'S NOTE（今日の計画 or 前回記録から部位提案＋季節の一言。ローカル生成でAPI不使用）
- 記録タブ: ホイールピッカーでセット入力、AIが生成した今日の計画バナー表示（常時CoachStripはv2.1で廃止→WelcomeModalに集約）
- 履歴タブ: 今週サマリー（MiniBar）＋CoachStrip＋フィルター＋セッション詳細（編集モードあり）
  - セッション行に今日・脚の日はCoachQuoteを表示
  - 編集モード: セット重量/回数タップ→ホイールピッカー、セット追加/削除、種目追加/削除、DB保存
- AIタブ:
  - ヘッダー: 大型キャラ切り抜き（右下・高さ148px透過PNG）＋吹き出し挨拶（あすけん風ヒーロー）
  - チャット: トレーナー画像アバター＋名前＋オンライン表示
  - プラン検出（3回以上のセット/回/kg表記）→「この計画を保存する」ボタン→planned_sessionsに保存
  - チャット履歴はトレーナー刻印付きで保存。トレーナー変更後は旧履歴を引き継がない（人格ブリード防止）。タブは常時マウントのためAITab内でtrainer変化も監視して即クリア
  - 入力欄の上に定型アクション2ボタン常設（結果フィードバック／メニュー提案）
- 設定タブ: プロフィール（表示名含む）・AIコーチ（トレーナー選択・コーチへのメモ・AI記憶）・種目管理・テーマ切替・エクスポート/インポート
- オンボーディング: 質問役はアプリ（IL）。目標・歴＋パーソナリティ5問をスコアリングして相性の良いトレーナーを推薦（設定で変更可）

## コーチ共存プレゼンス（src/lib/coachContext.jsx）
全タブに共通のコーチ状態を提供するReact Context。

**⚠️ v2.1（2026-10-10）: スパルタ/やさしいのモード切替は廃止**（TestFlightフィードバック: 切替で別人格になる）。コーチ・カイザー/コーチ・ハル（K/H）の二重人格レイヤーも撤去し、トレーナーキャラクター本来の性格一本に統一。`profiles.coach_mode`は未使用（互換のためDEFAULT_PROFILEには残置）。

- `CoachProvider`: Layout.jsxでラップ。`profiles.trainer_character`から導出
- `useCoach()`: `{ coach: { name, tag, tone, letter }, trainerImg, trainerName, lines }` を返す（tagは熱血/理論派などのタイプ、toneは常に`#FF6A1A`）
- `CoachAvatarShared`: 画像 or ハッチパターン+レター正方形アバター（pulse propでグリーンドット付加）
- `CoachStrip`: 88pxアバター+トレーナー名+メッセージ+CTA。HistoryTabで使用（RecordTabからはv2.1で撤去）
- `CoachQuote`: 32pxアバター+左ボーダー付き引用。HistoryTabのセッション行で使用
- `TRAINER_LINES`: トレーナー9人それぞれの画面別セリフ（record_idle/record_active/record_done/history_summary/workout_*）。`useCoach().lines`が現在トレーナーの解決済みセットを返す

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
├── supabase/
│   └── functions/
│       └── ai-chat/
│           └── index.ts    # Edge Function本体（Supabaseにデプロイ済み）
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
        │   └── AITab.jsx           # 大型キャラヘッダー・チャット・計画保存
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
- **認証はAuthProvider（src/hooks/useAuth.js）で全体共有**。main.jsxでラップ済み。useAuth()は必ずProvider配下で呼ぶ（profile・coach_modeの単一ソース）
- コーチングモード（スパルタ/やさしい）はv2.1で廃止。mode/setMode/coachModeは存在しない（復活させない）
- Supabaseクエリで0行があり得る箇所は`.single()`ではなく`.maybeSingle()`を使う
- overflow-x:hiddenをbodyと#root両方に設定済み
- Supabase無料プランのため7日間アクセスなしで自動停止する点に注意
- CoachProviderはLayout.jsx内（認証済みルートのみ）に配置。useCoach()はAuth確定後のみ呼ぶこと
- lint: `npm run lint`（eslint.config.js。exFATの`._*`ファイルはignore済み）

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
- 体重グラフ（v2ではローカルに体重履歴コレクションを追加して実装）
- CoachStripタップ→AIタブ遷移後にチャット自動オープン（現在は遷移のみ）
- hasPlan検出ロジック強化（誤検知対策: format:'detect'パラメータ追加）
- クイックプロンプトのパーソナライズ（トレーナー×モード×直近記録から動的生成）
- AIプロキシ保護の有効化（任意）: Upstash（Vercel Storage→Upstash Redis無料枠でenv自動設定）/ `AI_PROXY_TOKEN`+`VITE_AI_PROXY_TOKEN`ペア設定。App Attestは未実装
- v1遺産の整理: Supabaseプロジェクト（データは`backups/`にエクスポート済み、放置で7日後自動停止）/ 旧Anthropicキー`newironlog`の失効（Claude Consoleで手動）
- Claude Consoleで支出上限の設定（コスト防御、未設定）
