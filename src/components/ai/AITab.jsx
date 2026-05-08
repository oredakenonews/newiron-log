import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const TRAINER_IMAGES = {
  RYOTA: '/gazou/ryota_bu.png', DAIKI: '/gazou/daiki_bu.png',
  YUKI: '/gazou/yuki_bu.png', KENJI: '/gazou/kenji_bu.png',
  NANA: '/gazou/nana_bu.png', HANA: '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png', TORU: '/gazou/toru_bu.png',
  BILLY: '/gazou/billybu.png',
}

const MODE_GREETING = {
  spartan: '今日の追い込みが甘いぞ。限界まで追い込め。それが成長への唯一の道だ。',
  gentle: 'お疲れさまでした。継続できていること、本当に素晴らしいですよ。',
}

const CHAT_PROMPTS = [
  '今日のフォーム、どうだった？',
  '来週のメニューを組んで',
  '伸び悩み、どう打開する？',
]

function calcVolume(session) {
  return (session.exercises || []).reduce((t, ex) =>
    t + (ex.sets || []).reduce((s, set) =>
      s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0)
}

function InsightCard({ title, metric, unit, msg, icon, accent, wide }) {
  return (
    <div style={{
      background: '#13171F', border: '1px solid #1F242E',
      padding: 14, gridColumn: wide ? 'span 2' : 'auto',
      position: 'relative', overflow: 'hidden', minHeight: 140,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 0, height: 0,
        borderTop: `20px solid ${accent}`,
        borderLeft: '20px solid transparent',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ color: accent }}>{icon}</div>
        <div style={{ fontFamily: '"Noto Sans JP", system-ui', fontWeight: 700, fontSize: 13, color: '#fff' }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 32, lineHeight: 1, color: accent, letterSpacing: -0.5 }}>
          {metric}
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1, color: '#5A6477' }}>{unit}</div>
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.6, color: '#B5BECF', flex: 1 }}>{msg}</div>
    </div>
  )
}

function ChatSheet({ open, prompt, profile, recentWorkouts, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    if (open && prompt && !sentInitial.current) {
      sentInitial.current = true
      sendMessage(prompt, [])
    }
    if (!open) {
      setMessages([])
      sentInitial.current = false
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(text, history) {
    const msg = (text || input).trim()
    if (!msg || isLoading) return
    setInput('')
    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    const hist = (history || messages).slice(-10).map(m => ({ role: m.role, content: m.content }))
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
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 10px) 18px 12px',
        borderBottom: '1px solid #1F242E', background: '#0B0D10',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A6477', cursor: 'pointer', padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: 1 }}>AI COACH</div>
          <div style={{ fontSize: 10, color: '#5BC25B' }}>● オンライン</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{
              maxWidth: '78%', padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
              background: msg.role === 'user' ? '#FF6A1A' : '#13171F',
              color: msg.role === 'user' ? '#0B0D10' : '#E5E9F0',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', background: '#13171F', borderRadius: '16px 16px 16px 4px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#5A6477', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid #1F242E', padding: '12px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', background: '#0B0D10' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, padding: '12px 14px', background: '#13171F',
              border: '1px solid #1F242E', color: '#E5E9F0', outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            style={{
              width: 48, height: 48, background: '#FF6A1A', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: (!input.trim() || isLoading) ? 0.4 : 1, flexShrink: 0,
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

export default function AITab() {
  const { user, profile } = useAuth()
  const [mode, setMode] = useState('spartan')
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')

  const trainer = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainer] || TRAINER_IMAGES.RYOTA
  const accent = mode === 'spartan' ? '#FF6A1A' : '#5BC25B'

  useEffect(() => {
    if (user) loadRecentWorkouts()
  }, [user])

  async function loadRecentWorkouts() {
    const { data } = await supabase
      .from('workout_sessions').select('date, exercises')
      .eq('user_id', user.id).order('date', { ascending: false }).limit(6)
    setRecentWorkouts(data || [])
  }

  function openChat(prompt) {
    setChatPrompt(prompt)
    setChatOpen(true)
  }

  const thisWeekVol = recentWorkouts.slice(0, 3).reduce((t, s) => t + calcVolume(s), 0)
  const prevWeekVol = recentWorkouts.slice(3, 6).reduce((t, s) => t + calcVolume(s), 0)
  const volChange = prevWeekVol > 0 ? Math.round(((thisWeekVol - prevWeekVol) / prevWeekVol) * 100) : 0

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%', paddingBottom: 20 }}>
      {/* mode toggle */}
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid #1A1F28' }}>
        <div style={{ display: 'flex', background: '#0E1118', border: '1px solid #1F242E', padding: 3 }}>
          {[{ id: 'spartan', label: 'スパルタ', sub: 'HARD', color: '#FF6A1A' }, { id: 'gentle', label: 'やさしい', sub: 'SOFT', color: '#5BC25B' }].map(opt => {
            const active = mode === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                style={{
                  flex: 1, background: active ? opt.color : 'transparent', border: 'none',
                  color: active ? '#0B0D10' : '#8693AA',
                  fontFamily: '"Noto Sans JP", system-ui', fontWeight: 700, fontSize: 13,
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
      </div>

      <div style={{ padding: '14px' }}>
        {/* character panel */}
        <div style={{
          background: '#13171F', border: '1px solid #1F242E',
          borderLeft: `3px solid ${accent}`,
          padding: 16, display: 'flex', gap: 14, marginBottom: 14,
        }}>
          <div style={{
            width: 60, height: 60, flexShrink: 0,
            background: '#0E1118', border: '1px solid #1F242E',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={trainerImg} alt={trainer} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: accent }}>AI COACH</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1, background: `${accent}22`, color: accent, padding: '1px 4px' }}>
                {mode === 'spartan' ? 'スパルタ' : 'やさしい'}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>{trainer}</div>
            <div style={{ fontSize: 12, color: '#B5BECF', lineHeight: 1.6 }}>{MODE_GREETING[mode]}</div>
          </div>
        </div>

        {/* insight cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InsightCard
            title="今週のボリューム"
            metric={thisWeekVol > 0 ? (thisWeekVol / 1000).toFixed(1) : '—'}
            unit="TON"
            msg={thisWeekVol > 0 ? `直近3セッションの合計。${volChange >= 0 ? '先週比 +' + volChange : '先週比 ' + volChange}%` : 'まだデータがありません。記録を始めましょう。'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="M3 17l6-6 4 4 8-9" /><path d="M14 6h7v7" /></svg>}
            accent="#5BC25B"
          />
          <InsightCard
            title="セッション数"
            metric={recentWorkouts.length}
            unit="回 / 最近"
            msg="継続は力なり。週3回以上を目標にしましょう。"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
            accent="#FF6A1A"
          />
          <InsightCard
            title="目標"
            metric={profile?.training_purpose ? ({ muscle: '筋肥大', diet: '減量', strength: '筋力', health: '健康', sport: 'スポーツ' }[profile.training_purpose] || '—') : '—'}
            unit=""
            msg={profile?.goal_weight_kg ? `目標体重: ${profile.goal_weight_kg}kg` : 'プロフィールで目標を設定しましょう。'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>}
            accent="#FFB800"
          />
          <InsightCard
            title="記録日数"
            metric={recentWorkouts.filter(s => {
              const d = new Date(s.date + 'T00:00:00')
              const now = new Date()
              return now - d < 30 * 24 * 60 * 60 * 1000
            }).length}
            unit="日 / 30日"
            msg="30日以内のトレーニング日数。週3以上を維持しよう。"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4-1 3 1 5 3 4 1 0 0-3 0-5 0-2 0-3 0-5z" /></svg>}
            accent="#5AA9FF"
          />
        </div>

        {/* chat composer */}
        <div style={{ marginTop: 14, background: '#13171F', border: '1px solid #1F242E', padding: 12 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: '#8693AA', marginBottom: 8 }}>AI に質問する</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CHAT_PROMPTS.map((q, i) => (
              <div
                key={i}
                onClick={() => openChat(q)}
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
          <button
            onClick={() => openChat('')}
            style={{
              width: '100%', marginTop: 10, padding: '10px 0',
              background: '#FF6A1A', border: 'none', color: '#0B0D10',
              fontFamily: 'Oswald', fontWeight: 700, fontSize: 14, letterSpacing: 1.5,
              cursor: 'pointer',
            }}
          >チャットを開く →</button>
        </div>

        {/* pro upsell */}
        <div style={{
          marginTop: 14, background: 'linear-gradient(135deg, #1A1410 0%, #0E1118 60%)',
          border: '1px solid #2D1F12', borderLeft: '3px solid #FF6A1A',
          padding: 14, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -10,
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 90,
            color: 'rgba(255,106,26,0.06)', lineHeight: 1, pointerEvents: 'none',
          }}>PRO</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6A1A" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
            </svg>
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
      </div>

      <ChatSheet
        open={chatOpen}
        prompt={chatPrompt}
        profile={profile}
        recentWorkouts={recentWorkouts}
        onClose={() => setChatOpen(false)}
      />
    </div>
  )
}
