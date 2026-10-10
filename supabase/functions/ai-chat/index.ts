import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const TRAINER_PERSONAS: Record<string, string> = {
  RYOTA: `熱血系パーソナルトレーナーRYOTA（28歳・男性）。
高校時代はラグビー部のキャプテン、大学では陸上競技に転向し全国大会出場経験あり。
競技引退後「自分を変えたい人を本気で支えたい」とトレーナーの道へ。
口癖は「もう一回！」「限界はまだ先だ！」「諦めた瞬間に終わる！」。
一人称は「俺」。語尾に「！」が多く、常にテンションが高い。`,
  YUKI: `穏やか系パーソナルトレーナーYUKI（26歳・女性）。
看護師として3年間勤務後、リハビリ指導からトレーナーへ転身。
口癖は「大丈夫ですよ」「一緒に考えましょう」。一人称「わたし」。常に丁寧語。`,
  DAIKI: `理論派パーソナルトレーナーDAIKI（32歳・男性）。
東京大学大学院スポーツ科学修士号取得。学術論文も執筆中。
口癖は「データを見ると」「研究では」「最適解は」。一人称「私」。冷静・論理的。`,
  KENJI: `ストイック系パーソナルトレーナーKENJI（35歳・男性）。
元自衛隊員、除隊後は格闘技ジムでコーチ。
口癖は「言い訳は要らない」「やるか、やらないかだ」。一人称「俺」。極端に言葉が少ない。`,
  NANA: `ポジティブ系パーソナルトレーナーNANA（24歳・女性）。
YouTubeフィットネス5万人、大学ダンスサークル出身。
口癖は「やったじゃん！」「めちゃいい感じ！」。一人称「私」。絵文字自然に使用。`,
  HANA: `丁寧系パーソナルトレーナーHANA（30歳・女性）。
理学療法士資格持ち、整形外科クリニックで5年勤務。
口癖は「基本が一番大切です」「無理のない範囲で」。一人称「わたくし」。必ず敬語・丁寧語。`,
  RACHELL: `国際派パーソナルトレーナーRACHELL（29歳・女性）。
NSCA-CSCS資格、LAエリートジムで3年勤務後帰国。
英日混在自然。口癖は「World-class!」「Let's optimize!」「グローバルスタンダードで言うと」。`,
  TORU: `ベテラン系パーソナルトレーナーTORU（52歳・男性）。
トレーニング歴25年以上、オリンピック選手から一般人まで指導。
口癖は「焦るな」「長い目で見ろ」「昔はな…」。一人称「俺」。落ち着いた短い言葉で話す。`,
  BILLY: `エンタメ系パーソナルトレーナーBILLY（27歳・男性）。
HIPHOPダンサー兼SNS20万フォロワー。
口癖は「YO!」「Let's GO!」「FIRE!」。一人称「俺」。常にテンション高く盛り上げる。`,
}

const COACH_MODE_INSTRUCTIONS: Record<string, string> = {
  spartan: `【コーチング強度: スパルタ】あなたのキャラクターの口調・一人称はそのまま維持する。その上で、妥協や言い訳は最小限にし、追い込む言葉を選ぶ。`,
  gentle: `【コーチング強度: やさしい】あなたのキャラクターの口調・一人称はそのまま維持する。その上で、ユーザーの努力を認め、寄り添いながら次の一歩を一緒に考える。`,
}

function buildSystemPrompt(
  profile: any,
  recentWorkouts: any[],
  coachMode: string,
  longTermMemories: Array<{ memory_type: string; content: string }>
): string {
  const trainerKey = profile?.trainer_character || "RYOTA"
  const persona = TRAINER_PERSONAS[trainerKey] || TRAINER_PERSONAS.RYOTA
  const modeInstruction = COACH_MODE_INSTRUCTIONS[coachMode] || COACH_MODE_INSTRUCTIONS.spartan

  const profileLines = [
    profile?.training_purpose && `目標: ${profile.training_purpose}`,
    profile?.user_level && `レベル: ${profile.user_level}`,
    profile?.current_weight_kg && `現在の体重: ${profile.current_weight_kg}kg`,
    profile?.goal_weight_kg && `目標体重: ${profile.goal_weight_kg}kg`,
    profile?.height_cm && `身長: ${profile.height_cm}cm`,
    profile?.age && `年齢: ${profile.age}歳`,
  ].filter(Boolean)

  const workoutLines = recentWorkouts.length > 0
    ? recentWorkouts.map((w: any) => {
        const exSummary = (w.exercises || []).map((ex: any) => {
          const sets = (ex.sets || []).map((s: any) => `${s.weight}kg×${s.reps}回`).join(", ")
          return `${ex.name}(${sets})`
        }).join(" / ")
        return `${w.date}: ${exSummary || "記録なし"}`
      })
    : ["まだトレーニング記録がありません"]

  const coachNotesSection = profile?.coach_notes
    ? `\n【コーチへのメモ・注意事項】（毎回必ず参照・考慮すること）\n${profile.coach_notes}\n`
    : ""

  const memoriesSection = longTermMemories.length > 0
    ? `\n【長期記憶（以前の会話で把握した重要情報。必ず考慮すること）】\n${longTermMemories.map(m => `[${m.memory_type}] ${m.content}`).join("\n")}\n`
    : ""

  return `あなたは以下のトレーナーとして振る舞う。

【トレーナープロフィール】
${persona}

${modeInstruction}

【ユーザー情報】
${profileLines.length > 0 ? profileLines.join("\n") : "未設定"}
${coachNotesSection}${memoriesSection}
【直近のトレーニング記録】
${workoutLines.join("\n")}

【返答ルール】
- 必ず日本語で返答する
- キャラクターの口調・一人称を徹底して守る（最重要）
- ユーザー情報、長期記憶、トレーニング記録を踏まえた具体的なアドバイスをする
- コーチへのメモや長期記憶がある場合は、それを常に考慮してアドバイスする
- 返答は150文字程度にまとめる`
}

const MEMORY_TTL_DAYS: Record<string, number> = {
  injury: 60,
  goal: 90,
  preference: 180,
  habit: 180,
  note: 30,
}

function expiresAt(memoryType: string): string {
  const days = MEMORY_TTL_DAYS[memoryType] ?? 60
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const MEMORY_TRIGGER_KEYWORDS = [
  "痛", "怪我", "負傷", "苦手", "好き", "嫌い", "目標", "休憩", "休む",
  "体重", "やりたい", "できない", "変えたい", "続けたい", "辞めたい", "リハビリ",
  "肩", "膝", "腰", "首", "腕", "足", "背中", "胸", "腹", "不安", "疲れ",
]

function hasMemoryTrigger(message: string): boolean {
  return MEMORY_TRIGGER_KEYWORDS.some(kw => message.includes(kw))
}

async function extractAndSaveMemories(
  client: Anthropic,
  supabase: any,
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  // 期限切れでない既存記憶を全件取得
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from("ai_memories")
    .select("memory_type, content")
    .eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
  const existingList: Array<{ memory_type: string; content: string }> = existing || []

  const existingSection = existingList.length > 0
    ? `\n既存の記憶:\n${existingList.map(m => `[${m.memory_type}] ${m.content}`).join("\n")}\n`
    : ""

  // 差分ではなく「影響を受けるtypeの最終状態」を返させることで重複を防ぐ
  const extractPrompt = `以下の会話をもとに、長期記憶を更新・整理してください。
${existingSection}
新しい会話:
ユーザー: ${userMessage}
トレーナー: ${assistantResponse}

変更が必要なmemory_typeについて、既存の記憶と新情報を統合した最終的な記憶リストを返してください。
似た内容は必ず1件にまとめてください。変化がないtypeは含めないでください。

返答はJSONのみ（他のテキスト不要）:
{"updates":[{"memory_type":"injury","memories":["左肩に痛みがある"]}]}
変化がなければ: {"updates":[]}
memory_typeの値: injury / goal / preference / habit / note`

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: extractPrompt }],
  })

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : '{"updates":[]}'
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()

  let result: { updates: Array<{ memory_type: string; memories: string[] }> } = { updates: [] }
  try {
    result = JSON.parse(jsonStr)
  } catch {
    return
  }

  for (const update of (result.updates || [])) {
    if (!update.memory_type || !Array.isArray(update.memories)) continue
    // そのtypeの既存レコードを全削除してから統合済みリストを挿入
    await supabase.from("ai_memories")
      .delete()
      .eq("user_id", userId)
      .eq("memory_type", update.memory_type)
    if (update.memories.length > 0) {
      await supabase.from("ai_memories").insert(
        update.memories.map((content: string) => ({
          user_id: userId,
          memory_type: update.memory_type,
          content,
          expires_at: expiresAt(update.memory_type),
        }))
      )
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { message, history, profile, recentWorkouts, coachMode, format } = await req.json()
    const client = new Anthropic({ apiKey })

    // ── Supabase client (user-scoped via JWT, RLS applies automatically) ──
    const authHeader = req.headers.get("Authorization") ?? ""
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null

    // ── JSON structuring mode (memory not needed) ─────────────────────────
    if (format === "structure") {
      const today = new Date().toISOString().split("T")[0]
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

      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: structurePrompt }],
      })
      const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}"
      const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
      return new Response(JSON.stringify({ content: jsonStr }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── Read long-term memories ───────────────────────────────────────────
    let longTermMemories: Array<{ memory_type: string; content: string }> = []
    if (userId) {
      const { data } = await supabase
        .from("ai_memories")
        .select("memory_type, content")
        .eq("user_id", userId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(8)
      if (data) longTermMemories = data
    }

    // ── Normal chat mode ─────────────────────────────────────────────────
    const messages = [
      ...(history || []).slice(-10),
      { role: "user", content: message },
    ]

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: buildSystemPrompt(profile, recentWorkouts || [], coachMode || "spartan", longTermMemories),
      messages,
    })

    const content = response.content[0].type === "text" ? response.content[0].text : ""

    // ── Background memory extraction & save (no latency impact) ──────────
    if (userId && hasMemoryTrigger(message)) {
      EdgeRuntime.waitUntil(
        extractAndSaveMemories(client, supabase, userId, message, content).catch(() => {})
      )
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
