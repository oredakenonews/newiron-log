import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { listExercises, addExerciseDefs } from '../../lib/localdb'

// パーソナリティ質問でトレーナーとの相性をスコアリングする（TestFlight FB反映）。
// 質問役は特定キャラではなくアプリ（IRON LOG）。タメ口が苦手な人に
// タメ口キャラが当たらないよう、話し方の好みを最初に聞く。
const QUESTIONS = [
  {
    key: 'goal',
    question: 'ようこそ、IRON LOGへ。\nあなた専属のAIコーチを決めるために、いくつか質問させてください。\n\nまず、今一番の目標は何ですか？',
    options: [
      { value: 'muscle', label: '筋肉をつけたい（筋肥大）' },
      { value: 'diet', label: '体重を落としたい（ダイエット）' },
      { value: 'strength', label: 'もっと強くなりたい（筋力向上）' },
      { value: 'health', label: '健康的な体を維持したい' },
      { value: 'sport', label: 'スポーツのパフォーマンスを上げたい' },
    ],
  },
  {
    key: 'level',
    question: 'トレーニング歴はどのくらいですか？',
    options: [
      { value: 'beginner', label: 'これから始める / 始めたばかり' },
      { value: 'intermediate', label: '半年〜2年くらい' },
      { value: 'advanced', label: '2年以上のベテラン' },
    ],
  },
  {
    key: 'tone',
    question: 'ここからはコーチとの相性チェックです。\n\nコーチの話し方、どれが心地いいですか？',
    options: [
      { value: 'hot', label: '熱く励ましてくれるタメ口', scores: { RYOTA: 2, BILLY: 1 } },
      { value: 'polite', label: 'きちんとした敬語', scores: { HANA: 2, YUKI: 1 } },
      { value: 'short', label: '短く、要点だけ', scores: { JADE: 2, NANA: 1, TORU: 1 } },
      { value: 'logic', label: '理屈から丁寧に説明', scores: { LEON: 2, RACHELL: 1 } },
      { value: 'global', label: '英語まじりのフランクな話し方', scores: { RACHELL: 2, NANA: 1 } },
    ],
  },
  {
    key: 'motivation',
    question: 'きつい場面では、どうされたいですか？',
    options: [
      { value: 'push', label: '「もう一回！」と背中を押してほしい', scores: { RYOTA: 2, JADE: 1 } },
      { value: 'care', label: '「無理しないで」と気遣ってほしい', scores: { YUKI: 2, HANA: 1 } },
      { value: 'data', label: '数字で成長を示して納得させてほしい', scores: { LEON: 2, RACHELL: 1 } },
      { value: 'fun', label: '盛り上げて笑わせてほしい', scores: { BILLY: 2, RYOTA: 1 } },
      { value: 'calm', label: '「焦るな」と落ち着かせてほしい', scores: { TORU: 2, YUKI: 1 } },
    ],
  },
  {
    key: 'mood',
    question: 'ジムでのあなたの気分に一番近いのは？',
    options: [
      { value: 'battle', label: '戦場。黙々とストイックに', scores: { JADE: 2, TORU: 1 } },
      { value: 'fes', label: 'フェス。音楽とノリで上げる', scores: { BILLY: 2, RYOTA: 1 } },
      { value: 'lab', label: '最新メソッドを試す実験の場', scores: { RACHELL: 2, LEON: 1 } },
      { value: 'rehab', label: '体と相談しながら丁寧に', scores: { HANA: 2, YUKI: 1 } },
      { value: 'focus', label: '自分の時間。静かに集中して整える', scores: { NANA: 2, JADE: 1 } },
    ],
  },
  {
    key: 'career',
    question: 'コーチの経歴、どれに惹かれますか？',
    options: [
      { value: 'veteran', label: '百戦錬磨のベテラン', scores: { TORU: 2, HANA: 1 } },
      { value: 'sns', label: 'SNSで人気の今どきトレーナー', scores: { BILLY: 2, NANA: 1 } },
      { value: 'academic', label: '研究で裏付けのある専門家', scores: { LEON: 2, RACHELL: 1 } },
      { value: 'heart', label: '経歴より人柄', scores: { YUKI: 2, TORU: 1 } },
      { value: 'stylish', label: 'スタイルも動きも洗練されている', scores: { NANA: 2, RACHELL: 1 } },
    ],
  },
  {
    key: 'praise',
    question: '最後の質問。褒められ方の好みは？',
    options: [
      { value: 'party', label: '全力で一緒に喜んでほしい', scores: { RYOTA: 2, BILLY: 1 } },
      { value: 'curt', label: '一言「悪くない」で十分', scores: { JADE: 2, NANA: 1, TORU: 1 } },
      { value: 'proof', label: '成長の根拠つきで認めてほしい', scores: { LEON: 2, RACHELL: 1 } },
      { value: 'warm', label: '丁寧にねぎらってほしい', scores: { HANA: 2, YUKI: 1 } },
      { value: 'worldclass', label: '「World-class！」と世界基準で認めてほしい', scores: { RACHELL: 2, BILLY: 1 } },
    ],
  },
]

const TRAINER_META = {
  RYOTA:   { img: '/gazou/ryota_bu.png',   type: '熱血',     desc: '元ラグビー・陸上選手。熱く背中を押すタイプ' },
  YUKI:    { img: '/gazou/yuki_bu.png',    type: '穏やか',   desc: '元看護師。体を気遣いながら寄り添うタイプ' },
  LEON:    { img: '/gazou/leon_bu.png',    type: '理論派',   desc: 'スポーツ科学博士（ドイツ出身）。データと理論で導くタイプ' },
  JADE:    { img: '/gazou/jade_bu.png',    type: 'ストイック', desc: '元ボクサー（アメリカ出身）。言葉少なく限界に挑ませるタイプ' },
  NANA:    { img: '/gazou/nana_bu.png',    type: 'クール',   desc: '元陸上選手。クールに的確、フォームの美しさにこだわるタイプ' },
  HANA:    { img: '/gazou/hana_bu.png',    type: '丁寧',     desc: '理学療法士。必ず敬語、基本を大切にするタイプ' },
  RACHELL: { img: '/gazou/rachell_bu.png', type: '国際派',   desc: 'NSCA-CSCS。世界基準のメソッドで鍛えるタイプ' },
  TORU:    { img: '/gazou/toru_bu.png',    type: 'ベテラン', desc: 'トレーニング歴25年超。長い目で導くタイプ' },
  BILLY:   { img: '/gazou/billybu.png',    type: 'エンタメ', desc: 'HIPHOPダンサー。ノリと勢いで楽しませるタイプ' },
}

// スコア合算→最高点のトレーナーを推薦。同点なら「1位候補として選ばれた回数（2点の数）」が多い方
function recommendTrainer(totals, primaries) {
  let best = 'RYOTA'
  let bestKey = [-1, -1]
  for (const id of Object.keys(TRAINER_META)) {
    const key = [totals[id] || 0, primaries[id] || 0]
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) { best = id; bestKey = key }
  }
  return best
}

const DEFAULT_EXERCISES = [
  { name: 'ベンチプレス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'スクワット', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'サイドレイズ', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ラットプルダウン', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'マシンベンチプレス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ラテラルレイズ', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: '自重スクワット', weight_min: 0, reps_step: 5, reps_max: 50 },
  { name: 'プッシュアップ', weight_min: 0, reps_step: 5, reps_max: 50 },
  { name: 'デッドリフト', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ショルダープレス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'レッグプレス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ダンベルカール', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ベントオーバーロウ', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'トライセプスプレス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ケーブルクロス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'レッグカール', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'チェストフライ', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'インクラインプレス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'ディップス', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'チンニング', weight_min: 1, reps_step: 1, reps_max: 20 },
  { name: 'レッグエクステンション', weight_min: 1, reps_step: 1, reps_max: 20 },
]

export default function OnboardingChat() {
  const { saveProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState([])
  const [answers, setAnswers] = useState({})
  const [isTyping, setIsTyping] = useState(false)
  const [finished, setFinished] = useState(false)
  const [recommended, setRecommended] = useState(null)
  const bottomRef = useRef(null)
  const answeringRef = useRef(false)   // 連打による二重回答・二重登録防止
  const savedRef = useRef(false)       // 完了処理の成否（失敗時はgoToMainでリトライ）

  useEffect(() => {
    showQuestion(0)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function showQuestion(stepIdx) {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, {
        type: 'trainer',
        text: QUESTIONS[stepIdx].question,
      }])
    }, 1000)
  }

  async function handleAnswer(option) {
    if (answeringRef.current || isTyping) return
    answeringRef.current = true

    const q = QUESTIONS[step]
    const newAnswers = { ...answers, [q.key]: option.value }
    setAnswers(newAnswers)

    setMessages(prev => [...prev, {
      type: 'user',
      text: option.label,
    }])

    const nextStep = step + 1

    if (nextStep < QUESTIONS.length) {
      setStep(nextStep)
      setTimeout(() => {
        answeringRef.current = false
        showQuestion(nextStep)
      }, 600)
    } else {
      // 完了処理: スコアを合算して相性の良いトレーナーを推薦
      const totals = {}
      const primaries = {}
      for (const question of QUESTIONS) {
        const picked = question.options.find(o => o.value === newAnswers[question.key])
        for (const [id, pt] of Object.entries(picked?.scores || {})) {
          totals[id] = (totals[id] || 0) + pt
          if (pt >= 2) primaries[id] = (primaries[id] || 0) + 1
        }
      }
      const trainer = recommendTrainer(totals, primaries)
      setRecommended(trainer)

      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, {
          type: 'trainer',
          text: `ありがとうございました。\nあなたと相性が良さそうなコーチが決まりました。`,
        }])
        setFinished(true)
      }, 1200)

      // ローカル保存（v2: サーバ不要・失敗しない）
      const existing = await listExercises()
      if (existing.length === 0) {
        await addExerciseDefs(DEFAULT_EXERCISES)
      }
      savedRef.current = true
    }
  }

  async function goToMain() {
    const trainer = recommended || 'RYOTA'
    const purposeMap = {
      muscle: '筋肥大', diet: 'ダイエット', strength: '筋力向上',
      health: '健康維持', sport: 'スポーツ強化',
    }
    // onboarding_doneはここで立てる（立てた瞬間にガードが/へ通すため、ボタン押下時に実行）
    await saveProfile({
      training_purpose: purposeMap[answers.goal] || answers.goal || null,
      user_level: answers.level || 'beginner',
      trainer_character: trainer,
      onboarding_done: true,
    })
    navigate('/')
  }

  const currentOptions = step < QUESTIONS.length ? QUESTIONS[step].options : []

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg)' }}>
      {/* ヘッダー */}
      <div className="px-4 pb-3 flex items-center gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', borderBottom: '1px solid var(--border)' }}>
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: '#FF6A1A', fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: 'var(--on-accent)' }}>IL</div>
        <div>
          <p className="font-bebas text-lg" style={{ color: '#FF6A1A' }}>IRON LOG</p>
          <p className="text-xs" style={{ color: 'var(--text-2nd)' }}>コーチ選びカウンセリング</p>
        </div>
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-48">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.type === 'trainer' && (
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: '#FF6A1A', fontFamily: 'Oswald', fontWeight: 700, fontSize: 14, color: 'var(--on-accent)' }}>IL</div>
            )}
            <div
              className="max-w-[75%] px-4 py-3 text-sm whitespace-pre-line leading-relaxed"
              style={{
                background: msg.type === 'user' ? '#FF6A1A' : 'var(--card)',
                color: 'var(--text)',
                              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: '#FF6A1A', fontFamily: 'Oswald', fontWeight: 700, fontSize: 14, color: 'var(--on-accent)' }}>IL</div>
            <div className="px-4 py-3" style={{ background: 'var(--card)', borderRadius: 0 }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 animate-bounce" style={{ background: 'var(--text-2nd)', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 選択肢 or スタートボタン */}
      {!isTyping && !finished && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <div className="space-y-2">
            {currentOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="w-full py-3 px-4 text-sm text-left"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && !isTyping && recommended && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          {/* 推薦コーチカード */}
          <div className="flex items-center gap-3 mb-3 p-3" style={{ background: 'var(--card)', border: '1px solid #FF6A1A' }}>
            <img
              src={TRAINER_META[recommended].img}
              alt={recommended}
              className="object-contain flex-shrink-0"
              style={{ width: 72, height: 72, background: 'var(--bg-deep)' }}
            />
            <div className="min-w-0">
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: '#FF6A1A' }}>YOUR COACH</div>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>{recommended}</span>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1, color: '#FF6A1A' }}>{TRAINER_META[recommended].type}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-2nd)', marginTop: 2 }}>{TRAINER_META[recommended].desc}</div>
            </div>
          </div>
          <button
            onClick={goToMain}
            className="w-full py-4 font-bold text-white text-sm"
            style={{ background: '#FF6A1A' }}
          >
            このコーチで始める 🔥
          </button>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--muted)' }}>コーチは設定からいつでも変更できます</p>
        </div>
      )}
    </div>
  )
}
