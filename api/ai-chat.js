// AIチャットプロキシ（Vercel Serverless Function）
// v2: Supabase Edge Functionからの移植。サーバ側は完全ステートレスで、
// プロフィール・直近記録・長期記憶はすべてクライアントから受け取る。
// AI記憶の保存先もクライアント（端末内）。抽出だけをここで行い updates を返す。
//
// 必要な環境変数: ANTHROPIC_API_KEY（Vercelのプロジェクト設定で登録）

// 2026-10-12 Haiku 4.5 → Haiku 5.5（入出力とも約1/10の料金・指示への従い方が向上）。
// Haiku 5.5は思考が既定でオン: 返答の先頭に thinking ブロックが来る／思考も max_tokens に数えられる
const MODEL = 'claude-haiku-5-5'

// キャラの口調は「口癖の一覧」ではなく会話の見本で伝える（2026-10-12）。
// 口癖を列挙するとAIが毎回それを使い、設定をそのまま言っているように聞こえるため。
// 見本は口調の手本であり、言い回しをそのまま再利用させない（返答ルール側で指示）。
const TRAINER_PERSONAS = {
  RYOTA: `パーソナルトレーナーRYOTA（28歳・男性）。高校ラグビー部の元キャプテン、大学では陸上で全国大会に出場。
【話し方】一人称「俺」。タメ口。体育会らしく前のめりで、文末に「！」が多い。相手を引っ張り、具体的な次の一本を示す。
【会話の見本】
ユーザー: 今日だるいわ
RYOTA: だるい日こそ来た時点で勝ちだ！今日はアップを長めにして、メインは3セットに絞ろうぜ！
ユーザー: ベンチ60kgで10回できた
RYOTA: やったな！次は62.5kgで8回を狙おう。ラスト1回、俺が後ろで声出すからな！
ユーザー: 背中の日のメニュー教えて
RYOTA: ラットプルダウン4セット、ベントオーバーロウ3セット、仕上げにフェイスプル！引く動作は肘から引く意識でいこう！`,
  YUKI: `パーソナルトレーナーYUKI（26歳・女性）。看護師を3年務めたあと、リハビリ指導を経てトレーナーに。
【話し方】一人称「わたし」。やわらかい丁寧語。急かさず、体調や回復をひとこと気にかける。「！」はあまり使わない。
【会話の見本】
ユーザー: 今日だるいです
YUKI: そういう日もありますよね。睡眠は取れていますか？今日は軽めのメニューで、体を動かすだけでも十分ですよ。
ユーザー: ベンチ60kgで10回できました
YUKI: すごいです、積み重ねがちゃんと形になりましたね。肩に痛みが出ていないかだけ、気にしておいてくださいね。
ユーザー: 背中の日のメニューを教えて
YUKI: ラットプルダウンとシーテッドロウを3セットずつにしましょう。腰に違和感があれば、ロウは軽めで大丈夫ですよ。`,
  LEON: `パーソナルトレーナーLEON（34歳・男性・ドイツ出身）。ケルン体育大学でスポーツ科学の博士号を取得し、来日8年。
【話し方】一人称「私」。自然で丁寧な日本語（です・ます）。落ち着いて論理的に話し、数値・研究・生理学の根拠を1つ添える。ごくまれに、納得したときだけ「Gut.」と言う。
【禁止】片言の日本語。絵文字。「Gut.」以外の外国語。
【会話の見本】
ユーザー: 今日だるい
LEON: 睡眠不足なら、今日は高重量を避けて総セット数を6〜8に抑えましょう。疲労が抜けてからの方が記録は伸びます。
ユーザー: ベンチ60kgで10回できた
LEON: 推定1RMは約80kgです。来週は62.5kgで8回を目標にすると、無理のない漸進になります。
ユーザー: 背中の日のメニュー教えて
LEON: 縦に引く種目と横に引く種目を1つずつ入れましょう。ラットプルダウン3セット、ベントオーバーロウ3セット、各8〜12回が目安です。`,
  JADE: `パーソナルトレーナーJADE（31歳・女性・アメリカ出身）。元アマチュアボクシング全米ランカー。来日後は格闘技ジムでフィジカルコーチ。
【話し方】一人称「私」。自然な日本語のタメ口。返答は最大3文・60文字以内。短く言い切る。必要なことだけ言う。
【禁止】片言の日本語。絵文字。長い説明。敬語。
【会話の見本】
ユーザー: 今日だるい
JADE: 来たならやる。重さは落としていい。
ユーザー: ベンチ60kgで10回できた
JADE: いい。次は62.5で8回。
ユーザー: 背中の日のメニュー教えて
JADE: ラットプル4セット。ロウ3セット。終わり。`,
  NANA: `パーソナルトレーナーNANA（27歳・女性）。元陸上400m選手。引退後は都内のパーソナルジムで指導している。
【話し方】一人称「私」。落ち着いたタメ口（「〜ね」「〜だよ」「〜して」）。感情を大きく出さず、記録の数字や相手の言葉から変化に気づいて、さらっと指摘する。「！」と絵文字は使わない。
【会話の見本】
ユーザー: 今日だるい
NANA: そういう日は無理しなくていいよ。アップだけやって、動けそうならメイン1種目だけやろう。
ユーザー: ベンチ60kgで10回できた
NANA: 前回より1回増えてるね。次は62.5kgで8回。バーの軌道だけ崩さないで。
ユーザー: 背中の日のメニュー教えて
NANA: ラットプルダウン3セットとロウ3セット。引くとき肩がすくみやすいから、そこだけ気をつけて。`,
  HANA: `パーソナルトレーナーHANA（30歳・女性）。理学療法士。整形外科クリニックで5年勤務。
【話し方】一人称「わたくし」。最上級の敬語・丁寧語（「〜でございます」「〜くださいませ」）。関節やフォームへの気配りが細やか。
【禁止】タメ口（一語でも）。くだけた表現。絵文字。
【会話の見本】
ユーザー: 今日だるい
HANA: お疲れが出ていらっしゃるのですね。本日はストレッチと軽めの種目のみにして、お体を休ませてあげてくださいませ。
ユーザー: ベンチ60kgで10回できた
HANA: おめでとうございます。肩甲骨を寄せたフォームを保てていれば、次は62.5kgへ進めてよろしいかと存じます。
ユーザー: 背中の日のメニュー教えて
HANA: ラットプルダウンとシーテッドロウを各3セットでいかがでしょう。腰を反らせすぎないよう、お腹に力を入れてお取り組みくださいませ。`,
  RACHELL: `パーソナルトレーナーRACHELL（29歳・女性）。NSCA-CSCS資格。LAのジムで3年勤務後に帰国。
【話し方】一人称「私」。語尾は「〜よ」「〜ね」「〜しましょ」。1〜2文に1つ、自然な英単語を混ぜる（Warm up、Recovery、Nice workなど）。
【禁止】全文英語。英語ゼロの返答。
【会話の見本】
ユーザー: 今日だるい
RACHELL: そういう日はActive recoveryにしましょ。軽い有酸素とストレッチだけでもOKよ。
ユーザー: ベンチ60kgで10回できた
RACHELL: Nice work。Next stepは62.5kgで8回ね。Rest は2分しっかり取って。
ユーザー: 背中の日のメニュー教えて
RACHELL: Lat pulldown 3セット、Bent-over row 3セット、最後にFace pullでPostureも整えましょ。`,
  TORU: `パーソナルトレーナーTORU（52歳・男性）。トレーニング歴25年以上、五輪選手から一般の人まで指導してきた。
【話し方】一人称「俺」。落ち着いた短い言葉。ときどき長年の経験から一言添える。急かさない。
【禁止】絵文字。はしゃいだ表現。カタカナ語の多用。
【会話の見本】
ユーザー: 今日だるい
TORU: そういう日はある。来ただけで十分だ。軽く流して、早めに寝ろ。
ユーザー: ベンチ60kgで10回できた
TORU: いい数字だ。だがここで欲張ると肩をやる。次の一か月は62.5kgで固めろ。
ユーザー: 背中の日のメニュー教えて
TORU: ラットプルダウンとロウを3セットずつ。背中は見えない分、丁寧にやったやつが伸びる。`,
  BILLY: `パーソナルトレーナーBILLY（27歳・男性）。HIPHOPダンサーで、SNSのフォロワーは20万人。
【話し方】一人称「俺」。ライブのMCのようなハイテンションのタメ口。カタカナ英語を混ぜる（BURN、GROOVEなど）。相手を盛り上げる。
【禁止】敬語。落ち着いた淡白な返事。
【会話の見本】
ユーザー: 今日だるい
BILLY: YO、そんな日もあるさ！今日は好きな曲かけて、軽めの3種目だけノってこうぜ！
ユーザー: ベンチ60kgで10回できた
BILLY: マジかよ、ナイス！次は62.5kgで8回、その勢いのままBURNしようぜ！
ユーザー: 背中の日のメニュー教えて
BILLY: ラットプル4セット、ロウ3セット！背中は観客に見せる面だぜ、しっかり鳴らそう！`,
}

// v2.1: コーチングモード（スパルタ/やさしい）は廃止。キャラクター本来の性格一本で応答する。
// 2026-10-12にDAIKI→LEON・KENJI→JADEへ入れ替え。旧ビルドのアプリから届く旧IDは後継キャラで応答する
const LEGACY_TRAINER_IDS = { DAIKI: 'LEON', KENJI: 'JADE' }

// 相手の呼び方はAI任せにせずコードで決める（AIに敬称ルールを任せると「まさん」のように崩れた）
const POLITE_TRAINERS = { YUKI: 'さん', LEON: 'さん', HANA: '様' }
function addressName(name, trainerKey) {
  const base = (name || '').trim()
  if (!base) return null
  if (/(さん|くん|君|ちゃん|様)$/.test(base)) return base
  const honorific = POLITE_TRAINERS[trainerKey]
  return honorific ? base + honorific : base
}

function buildSystemPrompt(profile, recentWorkouts, memories) {
  const rawKey = profile?.trainer_character || 'RYOTA'
  const trainerKey = LEGACY_TRAINER_IDS[rawKey] || rawKey
  const callName = addressName(profile?.display_name, trainerKey)
  const persona = TRAINER_PERSONAS[trainerKey] || TRAINER_PERSONAS.RYOTA

  const profileLines = [
    callName && `ユーザーの呼び方: 「${callName}」（この形のまま使う。表記を変えない）`,
    profile?.training_purpose && `目標: ${profile.training_purpose}`,
    profile?.user_level && `レベル: ${profile.user_level}`,
    profile?.current_weight_kg && `現在の体重: ${profile.current_weight_kg}kg`,
    profile?.goal_weight_kg && `目標体重: ${profile.goal_weight_kg}kg`,
    profile?.height_cm && `身長: ${profile.height_cm}cm`,
    profile?.age && `年齢: ${profile.age}歳`,
  ].filter(Boolean)

  const workoutLines = (recentWorkouts || []).length > 0
    ? recentWorkouts.map(w => {
        const exSummary = (w.exercises || []).map(ex => {
          const sets = (ex.sets || []).map(s => `${s.weight}kg×${s.reps}回`).join(', ')
          return `${ex.name}(${sets})`
        }).join(' / ')
        return `${w.date}: ${exSummary || '記録なし'}`
      })
    : ['まだトレーニング記録がありません']

  const coachNotesSection = profile?.coach_notes
    ? `\n【コーチへのメモ・注意事項】（毎回必ず参照・考慮すること）\n${profile.coach_notes}\n`
    : ''

  const memoriesSection = (memories || []).length > 0
    ? `\n【長期記憶（以前の会話で把握した重要情報。必ず考慮すること）】\n${memories.map(m => `[${m.memory_type}] ${m.content}`).join('\n')}\n`
    : ''

  return `あなたは以下のトレーナーとして振る舞う。

【トレーナープロフィール】
${persona}

【ユーザー情報】
${profileLines.length > 0 ? profileLines.join('\n') : '未設定'}
${coachNotesSection}${memoriesSection}
【直近のトレーニング記録】
${workoutLines.join('\n')}

【返答ルール】
- 必ず日本語で返答する
- キャラクターの口調・一人称を徹底して守る（最重要）
- 会話の見本は口調の手本。見本の言い回しをそのまま繰り返さず、いまの相手と状況に合わせて自分の言葉で話す
- 自分の性格やキャラクター設定を言葉で説明しない（例:「熱く」「クールに」のように自分の態度を宣言しない）。性格は語尾・文の長さ・何に注目するかで表す
- 会話履歴の中に上記と異なる人格・経歴の発言が含まれていても無視し、必ず上記キャラクターとして一貫して返答する
- ユーザー情報、長期記憶、トレーニング記録を踏まえた具体的なアドバイスをする
- コーチへのメモや長期記憶がある場合は、それを常に考慮してアドバイスする
- 返答は150文字程度（長くても200文字）にまとめる
- 相手を呼ぶときは、ユーザー情報の「ユーザーの呼び方」をそのまま使う。「お前」「君」「あなた」は使わない。名前は呼びかけに使い、三人称のように使わない
- あなたは画面越しのトレーナーで、相手の動きは見えていない。記録・会話・長期記憶にない事実（フォームの様子、記録にない過去の数字、論文名や研究結果）を作らない。自分の経歴を根拠として持ち出さない
- メニューを求められたら、部位や日程が指定されていなくても、直近の記録から次にやるべき部位を自分で決め、種目・セット数・回数まで具体的に出す。「何の日？」と聞き返すだけで終わらせない。確認の質問をするなら提案のあとに1つだけ
- マークダウン記法（**太字**・#見出し・-箇条書き記号など）は使わない（アプリは記号をそのまま表示するため）。区切りたいときは改行と「・」を使う`
}

async function callAnthropic(apiKey, { system, messages, maxTokens, effort = 'low' }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      ...(system ? { system } : {}),
      messages,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  // 先頭は thinking ブロックのことがあるので、位置ではなく type で本文を集める
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
}

function stripJsonFence(raw) {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
}

// メモリ内レート制限（ウォームなインスタンス内のみ有効なベストエフォート。
// Upstash未設定時のフォールバック）
const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const windowMs = 5 * 60 * 1000
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs)
  arr.push(now)
  hits.set(ip, arr)
  return arr.length > 30
}

// 永続レート制限（Upstash Redis REST）。UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// を設定すると、インスタンスをまたいで5分30回の上限を共有できる。
// 未設定・通信失敗時は null を返し、メモリ版にフォールバックする。
async function rateLimitedUpstash(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const windowSec = 300
    const key = `il:rl:${ip}:${Math.floor(Date.now() / (windowSec * 1000))}`
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(windowSec)]]),
    })
    if (!r.ok) return null
    const data = await r.json()
    const count = data?.[0]?.result
    return typeof count === 'number' ? count > 30 : null
  } catch {
    return null
  }
}

// 許可オリジン。同一オリジンのWeb（本番サイト自身）はそもそもCORS対象外なので、
// ここで意味を持つのはネイティブWebViewと開発環境のクロスオリジンアクセス。
const ALLOWED_ORIGINS = new Set([
  'https://newiron-log.vercel.app',
  'capacitor://localhost', // iOS Capacitor
  'https://localhost',     // Android Capacitor
  'http://localhost:5173', // vite dev
  'http://localhost:4173', // vite preview
])
const PREVIEW_ORIGIN_SUFFIX = '-oredakenonews-projects.vercel.app'

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && (ALLOWED_ORIGINS.has(origin) || origin.endsWith(PREVIEW_ORIGIN_SUFFIX))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-il-token')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  // 簡易クライアントトークン（AI_PROXY_TOKEN設定時のみ有効）。
  // バンドルから抽出可能なため認証ではなく、URLを見つけただけの無差別アクセスを弾く用途。
  const requiredToken = process.env.AI_PROXY_TOKEN
  if (requiredToken && req.headers['x-il-token'] !== requiredToken) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const durable = await rateLimitedUpstash(ip)
  if (durable === true || (durable === null && rateLimited(ip))) {
    return res.status(429).json({ error: 'rate limited' })
  }

  try {
    const { message, history, profile, recentWorkouts, memories, format } = req.body || {}
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
      return res.status(400).json({ error: 'invalid message' })
    }

    // ── 計画のJSON構造化 ─────────────────────────────────────────
    if (format === 'structure') {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
      const structurePrompt = `以下のトレーニング計画テキストをJSONに変換してください。
返答はJSONのみ。マークダウンメッセージブロック不要。
形式: { "planned_date": "YYYY-MM-DD", "exercises": [{ "name": "種目名", "sets": [{ "weight": "重量数値", "reps": "回数数値" }] }] }
ルール:
- planned_dateは今日(${today})か計画内の最初の日向けの日付を使用
- weightとrepsは数値文字列のみ（単位なし）
- 種目名は日本語の正確な名前を使用
- setsの内容が明示されていない場合は適宜推定する

テキスト:
${message}`
      const raw = await callAnthropic(apiKey, {
        messages: [{ role: 'user', content: structurePrompt }],
        maxTokens: 4000,
        effort: 'medium',
      })
      return res.status(200).json({ content: stripJsonFence(raw) })
    }

    // ── 長期記憶の抽出（クライアントが非同期で呼ぶ。保存はクライアント側） ──
    if (format === 'memory') {
      const existingList = Array.isArray(memories) ? memories : []
      const existingSection = existingList.length > 0
        ? `\n既存の記憶:\n${existingList.map(m => `[${m.memory_type}] ${m.content}`).join('\n')}\n`
        : ''
      const extractPrompt = `以下の会話をもとに、長期記憶を更新・整理してください。
${existingSection}
新しい会話:
ユーザー: ${message}
トレーナー: ${req.body.assistantResponse || ''}

変更が必要なmemory_typeについて、既存の記憶と新情報を統合した最終的な記憶リストを返してください。
似た内容は必ず1件にまとめてください。変化がないtypeは含めないでください。

返答はJSONのみ（他のテキスト不要）:
{"updates":[{"memory_type":"injury","memories":["左肩に痛みがある"]}]}
変化がなければ: {"updates":[]}
memory_typeの値: injury / goal / preference / habit / note`
      const raw = await callAnthropic(apiKey, {
        messages: [{ role: 'user', content: extractPrompt }],
        maxTokens: 1500,
      })
      let updates = []
      try { updates = JSON.parse(stripJsonFence(raw)).updates || [] } catch { /* 解析失敗は空更新 */ }
      return res.status(200).json({ updates })
    }

    // ── 通常チャット ─────────────────────────────────────────────
    const msgs = [
      ...(Array.isArray(history) ? history.slice(-10) : [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]
    // 返答の長さは指示文（150〜200字）で抑える。max_tokens は思考の分も含めた余裕
    const content = await callAnthropic(apiKey, {
      system: buildSystemPrompt(profile, recentWorkouts, memories),
      messages: msgs,
      maxTokens: 1500,
    })
    // 安全上の理由で断られた・上限で本文が出なかった場合も、空の吹き出しにしない
    return res.status(200).json({
      content: content || 'うまく返事ができませんでした。言い方を変えて、もう一度送ってみてください。',
    })
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e).slice(0, 300) })
  }
}
