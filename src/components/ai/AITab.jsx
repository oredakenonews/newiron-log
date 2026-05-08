import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getCategory } from '../../lib/categories'

// ── Icons ────────────────────────────────────────────────────────────────────
const IcoTrend = ({ s = 16, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M3 17l6-6 4 4 8-9" /><path d="M14 6h7v7" />
  </svg>
)
const IcoFlame = ({ s = 16, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4-1 3 1 5 3 4 1 0 0-3 0-5 0-2 0-3 0-5z" />
  </svg>
)
const IcoTarget = ({ s = 16, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={c} />
  </svg>
)
const IcoBalance = ({ s = 16, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square">
    <path d="M12 3v18" /><path d="M3 7h18" /><path d="M7 7l-3 6h6z" /><path d="M17 7l-3 6h6z" />
  </svg>
)
const IcoCrown = ({ s = 14, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
  </svg>
)

const TRAINER_IMAGES = {
  RYOTA: '/gazou/ryota_bu.png', DAIKI: '/gazou/daiki_bu.png',
  YUKI: '/gazou/yuki_bu.png', KENJI: '/gazou/kenji_bu.png',
  NANA: '/gazou/nana_bu.png', HANA: '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png', TORU: '/gazou/toru_bu.png',
  BILLY: '/gazou/billybu.png',
}

// ── Static coach content ──────────────────────────────────────────────────────
const COACH_CONTENT = {
  spartan: {
    tag: 'スパルタモード',
    tone: '#FF6A1A',
    greeting: '今日の追い込みが甘い。胸の最終セット、まだ2レップ余ってただろ。',
    cards: {
      growth: { title: '成長', fallbackMetric: '—', fallbackUnit: 'KG / 前週比', fallbackMsg: '記録を続けると成長グラフが表示されます。' },
      issue:  { title: '課題', fallbackMetric: '—', fallbackUnit: '% PULL',    fallbackMsg: '直近のセッションからプッシュ/プル比率を分析します。' },
      goal:   { title: '次の目標', fallbackMetric: '—', fallbackUnit: '',           fallbackMsg: 'プロフィールで目標を設定しましょう。' },
      balance:{ title: 'バランス', fallbackMetric: '—', fallbackUnit: '% 左右差',  fallbackMsg: 'セッションを重ねるとバランス分析が解放されます。' },
    },
    cardMsg: {
      growth: (v) => `${v >= 0 ? '+' : ''}${v}%の変化。だが満足するな、これは通過点だ。`,
      issue:  (v) => `プッシュ系${v}%。プル系のボリュームを増やせ。背中を組め。`,
      goal:   (v) => `${v}を目標に設定。全力で取りにいけ。`,
      balance:(v) => `直近${v}セッション。もっと継続して精度を上げろ。`,
    },
  },
  gentle: {
    tag: 'やさしいモード',
    tone: '#5BC25B',
    greeting: 'お疲れさまでした。今日も継続できているの、本当に立派ですよ。',
    cards: {
      growth: { title: '成長', fallbackMetric: '—', fallbackUnit: 'KG / 前週比', fallbackMsg: '記録を続けると成長グラフが表示されますよ。' },
      issue:  { title: '課題', fallbackMetric: '—', fallbackUnit: '% PULL',    fallbackMsg: '直近のセッションからトレーニングバランスを確認します。' },
      goal:   { title: '次の目標', fallbackMetric: '—', fallbackUnit: '',           fallbackMsg: 'プロフィールで目標を設定してみましょう。' },
      balance:{ title: 'バランス', fallbackMetric: '—', fallbackUnit: '% 左右差',  fallbackMsg: 'セッションを重ねると詳細分析ができますよ。' },
    },
    cardMsg: {
      growth: (v) => `${v >= 0 ? '+' : ''}${v}%の変化。素晴らしい伸びです、自信を持って。`,
      issue:  (v) => `プッシュ系${v}%。背中の日を1日入れてみましょうか。`,
      goal:   (v) => `${v}を目標に。一緒に目指しましょう。`,
      balance:(v) => `直近${v}セッションを分析中。継続していきましょう。`,
    },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcVolume(session) {
  return (session?.exercises || []).reduce((t, ex) =>
    t + (ex.sets || []).reduce((s, set) =>
      s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0)
}

function calcPushRatio(sessions) {
  let push = 0, pull = 0
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      const cat = getCategory(ex.name)
      if (['CHEST', 'SHOULDERS', 'ARMS'].includes(cat)) push++
      if (cat === 'BACK') pull++
    })
  })
  const total = push + pull
  if (total === 0) return null
  return Math.round((push / total) * 100)
}

// ── Components ────────────────────────────────────────────────────────────────
function CoachToggle({ mode, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#0E1118', border: '1px solid #1F242E', padding: 3 }}>
      {[
        { id: 'spartan', label: 'スパルタ', sub: 'HARD' },
        { id: 'gentle',  label: 'やさしい', sub: 'SOFT' },
      ].map(opt => {
        const active = mode === opt.id
        const color = opt.id === 'spartan' ? '#FF6A1A' : '#5BC25B'
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1,
              background: active ? color : 'transparent',
              border: 'none',
              color: active ? '#0B0D10' : '#8693AA',
              fontFamily: '"Noto Sans JP", system-ui',
              fontWeight: 700, fontSize: 13,
              padding: '10px 0', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {opt.label}
            <span style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1, opacity: 0.7 }}>{opt.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

function CharacterPanel({ coach, trainerName, trainerImg }) {
  const tone = coach.tone
  return (
    <div style={{
      background: '#13171F', border: '1px solid #1F242E',
      borderLeft: `3px solid ${tone}`,
      padding: 16, display: 'flex', gap: 14, marginBottom: 14,
    }}>
      <div style={{
        width: 60, height: 60, flexShrink: 0,
        background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden',
      }}>
        <img src={trainerImg} alt={trainerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: tone }}>AI COACH</div>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1,
            background: `${tone}22`, color: tone, padding: '1px 4px',
          }}>{coach.tag}</div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>{trainerName}</div>
        <div style={{ fontSize: 12, color: '#B5BECF', lineHeight: 1.6 }}>{coach.greeting}</div>
      </div>
    </div>
  )
}

function InsightCard({ data, icon, accent }) {
  return (
    <div style={{
      background: '#13171F', border: '1px solid #1F242E',
      padding: 14, position: 'relative', overflow: 'hidden',
      minHeight: 150, display: 'flex', flexDirection: 'column',
    }}>
      {/* accent corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 0, height: 0,
        borderTop: `20px solid ${accent}`,
        borderLeft: '20px solid transparent',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ color: accent }}>{icon}</div>
        <div style={{ fontFamily: '"Noto Sans JP", system-ui', fontWeight: 700, fontSize: 13, color: '#fff' }}>{data.title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
        <div style={{
          fontFamily: 'Oswald', fontWeight: 700,
          fontSize: 36, lineHeight: 1, color: accent, letterSpacing: -0.5,
        }}>{data.metric}</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1, color: '#5A6477' }}>{data.unit}</div>
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.6, color: '#B5BECF', flex: 1 }}>{data.msg}</div>
    </div>
  )
}

function ChatComposer({ accent, onAsk }) {
  return (
    <div style={{ marginTop: 14, background: '#13171F', border: '1px solid #1F242E', padding: 12 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: '#8693AA', marginBottom: 8 }}>
        AI に質問する
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          '今日のフォーム、どうだった？',
          '来週のメニューを組んで',
          '伸び悩み、どう打開する？',
        ].map((q, i) => (
          <div
            key={i}
            onClick={() => onAsk(q)}
            style={{
              padding: '10px 12px', border: '1px solid #1F242E',
              background: '#0E1118', fontSize: 12, color: '#B5BECF',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span>{q}</span>
            <span style={{ color: accent, fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1 }}>ASK →</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProUpsell() {
  return (
    <div style={{
      marginTop: 14,
      background: 'linear-gradient(135deg, #1A1410 0%, #0E1118 60%)',
      border: '1px solid #2D1F12', borderLeft: '3px solid #FF6A1A',
      padding: 14, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -10,
        fontFamily: 'Oswald', fontWeight: 700, fontSize: 90,
        color: 'rgba(255,106,26,0.06)', lineHeight: 1, pointerEvents: 'none',
      }}>PRO</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <IcoCrown s={14} c="#FF6A1A" />
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 2, color: '#FF6A1A' }}>UPGRADE TO PRO</div>
      </div>
      <div style={{ fontFamily: '"Noto Sans JP", system-ui', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6, position: 'relative' }}>
        無制限の AI 質問・週次プラン自動生成
      </div>
      <div style={{ fontSize: 11, color: '#8693AA', lineHeight: 1.6, marginBottom: 12, position: 'relative' }}>
        無料版は週3回まで。Pro はフォーム動画解析・PR予測・パーソナルメニューが使い放題。
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 22, color: '#fff' }}>
          ¥980<span style={{ fontSize: 11, color: '#8693AA', fontFamily: 'JetBrains Mono', marginLeft: 4 }}>/月</span>
        </div>
        <button style={{
          background: '#FF6A1A', color: '#0B0D10', border: 'none',
          padding: '8px 18px', fontFamily: 'Oswald', fontWeight: 700, fontSize: 14, letterSpacing: 1.5,
          cursor: 'pointer',
        }}>始める →</button>
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  '今日のフォーム、どうだった？',
  '来週のメニューを組んで',
  '停滞期を打破したい',
  '追い込み方を教えて',
]

function ChatSheet({ open, initialPrompt, profile, recentWorkouts, onClose, trainerName, trainerImg, coach }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)
  const didSendInitial = useRef(false)
  const accent = coach?.tone || '#FF6A1A'

  useEffect(() => {
    if (open && initialPrompt && !didSendInitial.current) {
      didSendInitial.current = true
      doSend(initialPrompt, [])
    }
    if (!open) {
      setMessages([])
      setInput('')
      didSendInitial.current = false
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function doSend(text, history) {
    const msg = (text ?? input).trim()
    if (!msg || isLoading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setIsLoading(true)
    const hist = (history ?? messages).slice(-10)
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: msg, history: hist, profile, recentWorkouts },
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: '#0B0D10',
      display: 'flex', flexDirection: 'column',
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
    }}>
      {/* ── header ── */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        paddingBottom: 12, paddingLeft: 18, paddingRight: 18,
        borderBottom: '1px solid #1F242E', background: '#0B0D10',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#5A6477', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* trainer avatar */}
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden',
        }}>
          <img src={trainerImg} alt={trainerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: 0.5 }}>
              {trainerName}
            </div>
            <div style={{
              fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1,
              background: `${accent}22`, color: accent, padding: '1px 5px',
            }}>{coach?.tag}</div>
          </div>
          <div style={{ fontSize: 10, color: '#5BC25B', marginTop: 1 }}>● オンライン</div>
        </div>
      </div>

      {/* ── messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

        {/* empty state — quick prompts */}
        {messages.length === 0 && !isLoading && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2,
              color: '#5A6477', marginBottom: 10,
            }}>QUICK START</div>
            {QUICK_PROMPTS.map((q, i) => (
              <div
                key={i}
                onClick={() => doSend(q)}
                style={{
                  padding: '10px 12px', marginBottom: 6,
                  border: '1px solid #1F242E', background: '#13171F',
                  fontSize: 12, color: '#B5BECF',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <span>{q}</span>
                <span style={{ color: accent, fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1, flexShrink: 0 }}>
                  ASK →
                </span>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: 8,
            marginBottom: 10,
          }}>
            {/* trainer avatar for AI messages */}
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden',
              }}>
                <img src={trainerImg} alt={trainerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}

            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              fontSize: 13, lineHeight: 1.7,
              ...(msg.role === 'user'
                ? {
                    background: '#FF6A1A',
                    color: '#0B0D10',
                    fontWeight: 500,
                  }
                : {
                    background: '#13171F',
                    border: '1px solid #1F242E',
                    borderLeft: `2px solid ${accent}`,
                    color: '#E5E9F0',
                  }
              ),
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* typing indicator */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, flexShrink: 0,
              background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden',
            }}>
              <img src={trainerImg} alt={trainerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{
              padding: '12px 16px',
              background: '#13171F', border: '1px solid #1F242E',
              borderLeft: `2px solid ${accent}`,
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6,
                    background: accent,
                    animation: 'bounce 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── input ── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid #1F242E',
        padding: '12px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        background: '#0B0D10',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && doSend()}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, padding: '12px 14px',
              background: '#13171F', border: '1px solid #1F242E',
              color: '#E5E9F0', outline: 'none',
              fontFamily: '"Noto Sans JP", system-ui',
            }}
          />
          <button
            onClick={() => doSend()}
            disabled={!input.trim() || isLoading}
            style={{
              width: 48, height: 48, background: '#FF6A1A', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              opacity: (!input.trim() || isLoading) ? 0.4 : 1,
            }}
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AITab() {
  const { user, profile } = useAuth()
  const [mode, setMode] = useState('spartan')
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')

  const trainer = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainer] || TRAINER_IMAGES.RYOTA
  const coach = COACH_CONTENT[mode]
  const accent = coach.tone

  useEffect(() => {
    if (user) {
      supabase
        .from('workout_sessions')
        .select('date, exercises')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(12)
        .then(({ data }) => setRecentWorkouts(data || []))
    }
  }, [user])

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const recent3 = recentWorkouts.slice(0, 3)
  const prev3   = recentWorkouts.slice(3, 6)
  const thisVol = recent3.reduce((t, s) => t + calcVolume(s), 0)
  const prevVol = prev3.reduce((t, s)  => t + calcVolume(s), 0)
  const volChangePct = prevVol > 0 ? Math.round(((thisVol - prevVol) / prevVol) * 100) : null

  const pushRatio = calcPushRatio(recent3)

  const goalLabel = profile?.training_purpose
    ? ({ muscle: '筋肥大', diet: '減量', strength: '筋力向上', health: '健康維持', sport: 'スポーツ強化' }[profile.training_purpose] ?? '—')
    : '—'

  const days30 = recentWorkouts.filter(s => {
    const d = new Date(s.date + 'T00:00:00')
    return Date.now() - d.valueOf() < 30 * 24 * 60 * 60 * 1000
  }).length

  // Build card data (real data if available, else fallback)
  const cardData = {
    growth: {
      title: coach.cards.growth.title,
      metric: volChangePct !== null ? `${volChangePct >= 0 ? '+' : ''}${volChangePct}` : coach.cards.growth.fallbackMetric,
      unit:   volChangePct !== null ? '% 前週比' : coach.cards.growth.fallbackUnit,
      msg:    volChangePct !== null ? coach.cardMsg.growth(volChangePct) : coach.cards.growth.fallbackMsg,
    },
    issue: {
      title: coach.cards.issue.title,
      metric: pushRatio !== null ? String(pushRatio) : coach.cards.issue.fallbackMetric,
      unit:   pushRatio !== null ? '% PUSH' : coach.cards.issue.fallbackUnit,
      msg:    pushRatio !== null ? coach.cardMsg.issue(pushRatio) : coach.cards.issue.fallbackMsg,
    },
    goal: {
      title:  coach.cards.goal.title,
      metric: goalLabel,
      unit:   profile?.goal_weight_kg ? `目標 ${profile.goal_weight_kg}kg` : '',
      msg:    goalLabel !== '—'
        ? coach.cardMsg.goal(goalLabel)
        : coach.cards.goal.fallbackMsg,
    },
    balance: {
      title:  coach.cards.balance.title,
      metric: days30 > 0 ? String(days30) : coach.cards.balance.fallbackMetric,
      unit:   days30 > 0 ? '日 / 30日' : coach.cards.balance.fallbackUnit,
      msg:    days30 > 0 ? coach.cardMsg.balance(days30) : coach.cards.balance.fallbackMsg,
    },
  }

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%', paddingBottom: 20 }}>
      {/* toggle */}
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid #1A1F28' }}>
        <CoachToggle mode={mode} onChange={setMode} />
      </div>

      <div style={{ padding: '14px' }}>
        <CharacterPanel coach={coach} trainerName={trainer} trainerImg={trainerImg} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InsightCard data={cardData.growth}  icon={<IcoTrend   s={16} c="#5BC25B" />} accent="#5BC25B" />
          <InsightCard data={cardData.issue}   icon={<IcoFlame   s={16} c="#FF6A1A" />} accent="#FF6A1A" />
          <InsightCard data={cardData.goal}    icon={<IcoTarget  s={16} c="#FFB800" />} accent="#FFB800" />
          <InsightCard data={cardData.balance} icon={<IcoBalance s={16} c="#5AA9FF" />} accent="#5AA9FF" />
        </div>

        <ChatComposer accent={accent} onAsk={(q) => { setChatPrompt(q); setChatOpen(true) }} />
        <ProUpsell />
      </div>

      <ChatSheet
        open={chatOpen}
        initialPrompt={chatPrompt}
        profile={profile}
        recentWorkouts={recentWorkouts}
        onClose={() => setChatOpen(false)}
        trainerName={trainer}
        trainerImg={trainerImg}
        coach={coach}
      />
    </div>
  )
}
