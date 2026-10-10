import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { listExercises, addExerciseDefs } from '../../lib/localdb'

const RYOTA_IMG = '/gazou/ryota_bu.png'

const QUESTIONS = [
  {
    key: 'goal',
    question: 'はじめまして！俺、RYOTAです。一緒に最高の身体を作っていきましょう💪\n\nまず聞かせてください。今一番の目標は何ですか？',
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
    question: 'いい目標だ！\n\nトレーニング歴はどのくらいですか？',
    options: [
      { value: 'beginner', label: 'これから始める / 始めたばかり' },
      { value: 'intermediate', label: '半年〜2年くらい' },
      { value: 'advanced', label: '2年以上のベテラン' },
    ],
  },
  {
    key: 'frequency',
    question: '週に何回トレーニングできそうですか？',
    options: [
      { value: '1-2', label: '週1〜2回' },
      { value: '3-4', label: '週3〜4回' },
      { value: '5+', label: '週5回以上' },
    ],
  },
  {
    key: 'style',
    question: '最後に、どんなサポートスタイルが好きですか？',
    options: [
      { value: 'strict', label: '厳しくガンガン追い込んでほしい' },
      { value: 'gentle', label: '優しく寄り添ってほしい' },
      { value: 'data', label: 'データと理論で教えてほしい' },
      { value: 'fun', label: '楽しく続けられるようにしてほしい' },
    ],
  },
]

const TRAINER_ASSIGN = {
  strict: 'RYOTA',
  gentle: 'YUKI',
  data: 'DAIKI',
  fun: 'BILLY',
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
      // 完了処理
      const trainer = TRAINER_ASSIGN[newAnswers.style] || 'RYOTA'

      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, {
          type: 'trainer',
          text: `分かりました！\n\nあなたのトレーナーは...\n\n🔥 ${trainer} に決定！\n\n一緒に頑張っていきましょう！`,
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
    const trainer = TRAINER_ASSIGN[answers.style] || 'RYOTA'
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
    <div className="flex flex-col min-h-dvh" style={{ background: '#0B0D10' }}>
      {/* ヘッダー */}
      <div className="px-4 pb-3 flex items-center gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', borderBottom: '1px solid #1F242E' }}>
        <img src={RYOTA_IMG} alt="RYOTA" className="w-10 h-10 object-contain" style={{ background: '#13171F' }} />
        <div>
          <p className="font-bebas text-lg" style={{ color: '#FF6A1A' }}>RYOTA</p>
          <p className="text-xs" style={{ color: '#8693AA' }}>カウンセリング中</p>
        </div>
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-48">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.type === 'trainer' && (
              <img src={RYOTA_IMG} alt="trainer" className="w-8 h-8 object-contain flex-shrink-0" style={{ background: '#13171F' }} />
            )}
            <div
              className="max-w-[75%] px-4 py-3 text-sm whitespace-pre-line leading-relaxed"
              style={{
                background: msg.type === 'user' ? '#FF6A1A' : '#13171F',
                color: '#E5E9F0',
                              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <img src={RYOTA_IMG} alt="trainer" className="w-8 h-8 object-contain" style={{ background: '#13171F' }} />
            <div className="px-4 py-3" style={{ background: '#13171F', borderRadius: 0 }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 animate-bounce" style={{ background: '#8693AA', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 選択肢 or スタートボタン */}
      {!isTyping && !finished && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', background: '#0B0D10', borderTop: '1px solid #1F242E' }}>
          <div className="space-y-2">
            {currentOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="w-full py-3 px-4 text-sm text-left"
                style={{ background: '#13171F', border: '1px solid #1F242E', color: '#E5E9F0' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && !isTyping && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', background: '#0B0D10', borderTop: '1px solid #1F242E' }}>
          <button
            onClick={goToMain}
            className="w-full py-4 font-bold text-white text-sm"
            style={{ background: '#FF6A1A' }}
          >
            トレーニングを始める 🔥
          </button>
        </div>
      )}
    </div>
  )
}
