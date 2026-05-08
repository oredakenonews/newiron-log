import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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

export default function OnboardingChat() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState([])
  const [answers, setAnswers] = useState({})
  const [isTyping, setIsTyping] = useState(false)
  const [finished, setFinished] = useState(false)
  const [assignedTrainer, setAssignedTrainer] = useState('RYOTA')
  const bottomRef = useRef(null)

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
      setTimeout(() => showQuestion(nextStep), 600)
    } else {
      // 完了処理
      const trainer = TRAINER_ASSIGN[newAnswers.style] || 'RYOTA'
      setAssignedTrainer(trainer)

      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, {
          type: 'trainer',
          text: `分かりました！\n\nあなたのトレーナーは...\n\n🔥 ${trainer} に決定！\n\n一緒に頑張っていきましょう！`,
        }])
        setFinished(true)
      }, 1200)

      // Supabaseに保存
      const purposeMap = {
        muscle: '筋肥大',
        diet: 'ダイエット',
        strength: '筋力向上',
        health: '健康維持',
        sport: 'スポーツ強化',
      }
      const levelMap = {
        beginner: 'beginner',
        intermediate: 'intermediate',
        advanced: 'advanced',
      }

      await supabase.from('profiles').update({
        training_purpose: purposeMap[newAnswers.goal] || newAnswers.goal,
        user_level: levelMap[newAnswers.level] || 'beginner',
        trainer_character: trainer,
        onboarding_done: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      await refreshProfile()
    }
  }

  async function goToMain() {
    navigate('/')
  }

  const currentOptions = step < QUESTIONS.length ? QUESTIONS[step].options : []

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0f0f0f' }}>
      {/* ヘッダー */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #2a2a2a' }}>
        <img src={RYOTA_IMG} alt="RYOTA" className="w-10 h-10 object-contain rounded-full" style={{ background: '#1a1a1a' }} />
        <div>
          <p className="font-bebas text-lg" style={{ color: '#f97316' }}>RYOTA</p>
          <p className="text-xs" style={{ color: '#888' }}>カウンセリング中</p>
        </div>
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-48">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.type === 'trainer' && (
              <img src={RYOTA_IMG} alt="trainer" className="w-8 h-8 object-contain rounded-full flex-shrink-0" style={{ background: '#1a1a1a' }} />
            )}
            <div
              className="max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed"
              style={{
                background: msg.type === 'user' ? '#f97316' : '#1a1a1a',
                color: '#f5f5f5',
                borderRadius: msg.type === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <img src={RYOTA_IMG} alt="trainer" className="w-8 h-8 object-contain rounded-full" style={{ background: '#1a1a1a' }} />
            <div className="px-4 py-3 rounded-2xl" style={{ background: '#1a1a1a', borderRadius: '20px 20px 20px 4px' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#888', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 選択肢 or スタートボタン */}
      {!isTyping && !finished && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3" style={{ background: '#0f0f0f', borderTop: '1px solid #2a2a2a' }}>
          <div className="space-y-2">
            {currentOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="w-full py-3 px-4 rounded-xl text-sm text-left"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && !isTyping && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3" style={{ background: '#0f0f0f', borderTop: '1px solid #2a2a2a' }}>
          <button
            onClick={goToMain}
            className="w-full py-4 rounded-xl font-bold text-white text-sm"
            style={{ background: '#f97316' }}
          >
            トレーニングを始める 🔥
          </button>
        </div>
      )}
    </div>
  )
}
