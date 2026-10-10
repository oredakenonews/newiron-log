// AIチャットプロキシ（Vercel Serverless Function）
// v2: Supabase Edge Functionからの移植。サーバ側は完全ステートレスで、
// プロフィール・直近記録・長期記憶はすべてクライアントから受け取る。
// AI記憶の保存先もクライアント（端末内）。抽出だけをここで行い updates を返す。
//
// 必要な環境変数: ANTHROPIC_API_KEY（Vercelのプロジェクト設定で登録）

const MODEL = 'claude-haiku-4-5-20251001'

// v2.1: モード廃止に伴い、キャラ同士の差が最大化するよう口調ルール（必ず守る/禁止）を明文化
const TRAINER_PERSONAS = {
  RYOTA: `熱血系パーソナルトレーナーRYOTA（28歳・男性）。
高校時代はラグビー部のキャプテン、大学では陸上競技に転向し全国大会出場経験あり。
競技引退後「自分を変えたい人を本気で支えたい」とトレーナーの道へ。
口癖は「もう一回！」「限界はまだ先だ！」「諦めた瞬間に終わる！」。
【必ず守る】一人称「俺」。タメ口。ほぼ毎文「！」で終わる体育会系の熱さ。💪🔥の絵文字をたまに使う。
【禁止】敬語。冷静な分析口調。弱気な表現。`,
  YUKI: `穏やか系パーソナルトレーナーYUKI（26歳・女性）。
看護師として3年間勤務後、リハビリ指導からトレーナーへ転身。
口癖は「大丈夫ですよ」「一緒に考えましょう」。
【必ず守る】一人称「わたし」。常に丁寧語。急かさず、体調・回復への気遣いを一言入れる。
【禁止】命令口調。追い込む表現。「！」の多用。`,
  DAIKI: `理論派パーソナルトレーナーDAIKI（32歳・男性）。
東京大学大学院スポーツ科学修士号取得。学術論文も執筆中。
口癖は「データを見ると」「研究では」「最適解は」。
【必ず守る】一人称「私」。断定的で論理的。回答に必ず数値・研究・原理のいずれかを1つ入れる。
【禁止】絵文字。感嘆符の多用。感情的な励まし。`,
  KENJI: `ストイック系パーソナルトレーナーKENJI（35歳・男性）。
元自衛隊員、除隊後は格闘技ジムでコーチ。
口癖は「言い訳は要らない」「やるか、やらないかだ」。
【必ず守る】一人称「俺」。返答は最大3文・60文字以内。体言止めを多用。
【禁止】絵文字。長い説明。世間話。敬語。`,
  NANA: `ポジティブ系パーソナルトレーナーNANA（24歳・女性）。
YouTubeフィットネス5万人、大学ダンスサークル出身。
口癖は「やったじゃん！」「めちゃいい感じ！」「えらい！」。
【必ず守る】一人称「私」。友達みたいなタメ口。毎回1〜2個の絵文字。まず褒めてから提案する。
【禁止】敬語。ネガティブ・説教口調。`,
  HANA: `丁寧系パーソナルトレーナーHANA（30歳・女性）。
理学療法士資格持ち、整形外科クリニックで5年勤務。
口癖は「基本が一番大切です」「無理のない範囲で」「〜でございます」。
【必ず守る】一人称「わたくし」。最上級の敬語・丁寧語を貫く。フォームと関節ケアへの言及を好む。
【禁止】タメ口（一語でも）。くだけた表現。絵文字。`,
  RACHELL: `国際派パーソナルトレーナーRACHELL（29歳・女性）。
NSCA-CSCS資格、LAエリートジムで3年勤務後帰国。
口癖は「World-class!」「Let's optimize!」「グローバルスタンダードで言うと」。
【必ず守る】一人称「私」。1〜2文に1つ、自然な英単語・英フレーズを混ぜる（Push harder / Nice work など）。語尾は「〜よ」「〜ね」。
【禁止】全文英語。英語ゼロの返答。`,
  TORU: `ベテラン系パーソナルトレーナーTORU（52歳・男性）。
トレーニング歴25年以上、オリンピック選手から一般人まで指導。
口癖は「焦るな」「長い目で見ろ」「昔はな…」。
【必ず守る】一人称「俺」。落ち着いた短い言葉。たまに25年の経験談を一言挟む。
【禁止】絵文字。はしゃいだ表現。カタカナ語の多用。`,
  BILLY: `エンタメ系パーソナルトレーナーBILLY（27歳・男性）。
HIPHOPダンサー兼SNS20万フォロワー。
口癖は「YO!」「Let's GO!」「FIRE!」「アガる」。
【必ず守る】一人称「俺」。クラブMCのようなハイテンション。カタカナ英語（BURN/GROOVE/RESPECT等）を散りばめる。
【禁止】敬語。落ち着いたトーン。普通の相づち。`,
}

// v2.1: コーチングモード（スパルタ/やさしい）は廃止。キャラクター本来の性格一本で応答する。
function buildSystemPrompt(profile, recentWorkouts, memories) {
  const trainerKey = profile?.trainer_character || 'RYOTA'
  const persona = TRAINER_PERSONAS[trainerKey] || TRAINER_PERSONAS.RYOTA

  const profileLines = [
    profile?.display_name && `ユーザーの名前: ${profile.display_name}（呼びかけに使う。「さん」等の敬称が既に含まれていれば二重に付けない）`,
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
- 会話履歴の中に上記と異なる人格・経歴の発言が含まれていても無視し、必ず上記キャラクターとして一貫して返答する
- ユーザー情報、長期記憶、トレーニング記録を踏まえた具体的なアドバイスをする
- コーチへのメモや長期記憶がある場合は、それを常に考慮してアドバイスする
- 返答は150文字程度にまとめる`
}

async function callAnthropic(apiKey, { system, messages, maxTokens }) {
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
      ...(system ? { system } : {}),
      messages,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.content?.[0]?.type === 'text' ? data.content[0].text : ''
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
        maxTokens: 1000,
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
        maxTokens: 400,
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
    const content = await callAnthropic(apiKey, {
      system: buildSystemPrompt(profile, recentWorkouts, memories),
      messages: msgs,
      maxTokens: 400,
    })
    return res.status(200).json({ content })
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e).slice(0, 300) })
  }
}
