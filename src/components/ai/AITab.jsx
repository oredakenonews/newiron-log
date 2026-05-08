import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const TRAINER_IMAGES = {
  RYOTA: '/gazou/ryota_bu.png',
  DAIKI: '/gazou/daiki_bu.png',
  YUKI: '/gazou/yuki_bu.png',
  KENJI: '/gazou/kenji_bu.png',
  NANA: '/gazou/nana_bu.png',
  HANA: '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png',
  TORU: '/gazou/toru_bu.png',
  BILLY: '/gazou/billybu.png',
}

const TRAINER_GREETINGS = {
  RYOTA: 'よう！今日も来たな💪 トレーニングのこと、何でも聞いてくれ！',
  YUKI: 'こんにちは😊 今日はどんなことを話そうか？何でも気軽に聞いてね。',
  DAIKI: 'やあ。トレーニングについて何か知りたいことがあれば、データに基づいてお答えします。',
  KENJI: '来たか。何が聞きたい。',
  NANA: 'きたきたー✨ 今日も一緒に頑張ろう！何でも聞いてね😄',
  HANA: 'いらっしゃいませ。どのようなことでもお気軽にご相談ください。',
  RACHELL: 'Hey! Ready to crush it today? Ask me anything!',
  TORU: 'よく来たな。何でも話してみろ。長年の経験から答えよう。',
  BILLY: 'Yoooo🔥 最高の気分で来たか？何でも聞いてくれ！',
}

const SUGGESTIONS = [
  '今日のトレーニングを評価して',
  '次回のメニューを提案して',
  '停滞期を打破したい',
  'モチベーションを上げて',
  'フォームのコツを教えて',
  '体重が落ちない理由は？',
  '追い込み方を教えて',
  '食事のアドバイスをして',
]

export default function AITab() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const trainer = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainer] || TRAINER_IMAGES.RYOTA

  useEffect(() => {
    if (user) loadRecentWorkouts()
  }, [user])

  useEffect(() => {
    if (profile && messages.length === 0) {
      const greeting = TRAINER_GREETINGS[trainer] || TRAINER_GREETINGS.RYOTA
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [profile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function loadRecentWorkouts() {
    const { data } = await supabase
      .from('workout_sessions')
      .select('date, exercises, cardio')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(3)
    setRecentWorkouts(data || [])
  }

  async function sendMessage(text) {
    const msg = (text || input).trim()
    if (!msg || isLoading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: msg, history, profile, recentWorkouts },
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度試してください。',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
      {/* ヘッダー */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3" style={{ flexShrink: 0, borderBottom: '1px solid #2a2a2a', position: 'sticky', top: 0, zIndex: 10, background: '#0f0f0f' }}>
        <img src={trainerImg} alt={trainer} className="w-10 h-10 object-contain rounded-full" style={{ background: '#1a1a1a' }} />
        <div>
          <p className="font-bebas text-lg" style={{ color: '#f97316' }}>{trainer}</p>
          <p className="text-xs" style={{ color: '#4ade80' }}>● オンライン</p>
        </div>
      </div>

      {/* メッセージ */}
      <div className="px-4 py-4 space-y-4" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.role === 'assistant' && (
              <img src={trainerImg} alt={trainer} className="w-8 h-8 object-contain rounded-full flex-shrink-0" style={{ background: '#1a1a1a' }} />
            )}
            <div
              className="max-w-[75%] px-4 py-3 text-sm whitespace-pre-line leading-relaxed"
              style={{
                background: msg.role === 'user' ? '#f97316' : '#1a1a1a',
                color: '#f5f5f5',
                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-end gap-2">
            <img src={trainerImg} alt={trainer} className="w-8 h-8 object-contain rounded-full flex-shrink-0" style={{ background: '#1a1a1a' }} />
            <div className="px-4 py-3" style={{ background: '#1a1a1a', borderRadius: '20px 20px 20px 4px' }}>
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

      {/* 入力エリア（fixed廃止・flex末尾に配置） */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #2a2a2a', background: '#0f0f0f', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
        {/* 選択肢チップ */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2" style={{ scrollbarWidth: 'none' }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs disabled:opacity-40"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa' }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* テキスト入力 */}
        <div className="flex gap-2 px-4 pb-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-3 rounded-xl outline-none"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5', fontSize: 16 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: '#f97316' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
