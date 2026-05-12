import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCoach, CoachAvatarShared, COACHES_SHARED } from '../../lib/coachContext'

const TRAINER_IMAGES = {
  RYOTA: '/gazou/ryota_bu.png', DAIKI: '/gazou/daiki_bu.png',
  YUKI: '/gazou/yuki_bu.png',   KENJI: '/gazou/kenji_bu.png',
  NANA: '/gazou/nana_bu.png',   HANA: '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png', TORU: '/gazou/toru_bu.png',
  BILLY: '/gazou/billybu.png',
}

const TRAINER_GREETINGS = {
  RYOTA:   { spartan: '限界まで追い込んだか！？まだ余力があるなら全然足りてないぞ！', gentle: 'お疲れ！今日もよく来たな。この調子で一緒に頑張っていこう！' },
  YUKI:    { spartan: '今日のトレーニング、手を抜いてないか？自分に正直になれ。', gentle: 'お疲れさまでした。今日も来られただけで、本当に素晴らしいですよ。' },
  DAIKI:   { spartan: '前回のデータと比較すると改善点がある。数値を見て効率を上げろ。', gentle: '記録を分析しました。数値的に良い傾向が出ています。一緒に最適化しましょう。' },
  KENJI:   { spartan: '言い訳は要らない。今日も限界を超えるだけだ。それだけでいい。', gentle: '無理せず、でも妥協もするな。ちょうどいい負荷を一緒に見つけよう。' },
  NANA:    { spartan: '今日も全力で行くよ！手を抜いたら絶対後悔するからね！', gentle: 'おつかれー！今日も来てくれてありがとう！一緒に楽しもうね' },
  HANA:    { spartan: '本日も丁寧に、しかし妥協なく取り組んでいただきます。', gentle: '本日もお疲れさまです。一歩一歩、着実に進んでいきましょう。' },
  RACHELL: { spartan: 'No excuses。世界レベルの選手は不快感を乗り越える。さあやるぞ。', gentle: 'よく来たね。継続こそが世界基準の成果につながる。一緒にやろう。' },
  TORU:    { spartan: '長年見てきたが、甘い選手はここで止まる。さあ、どうする。', gentle: '焦らんでいい。長い目で見れば、続けることが一番大切だ。' },
  BILLY:   { spartan: 'YO！今日も燃やしていくぞ！中途半端は俺が許さん！', gentle: 'YO！来てくれてサンキュー！一緒に楽しくやっていこうぜ！' },
}

const QUICK_PROMPTS = [
  '直近のセッションを振り返って',
  '今日のメニューを相談したい',
  '来週の計画を立てて',
]

function hasPlan(text) {
  return (text.match(/\d+\s*(セット|回|kg)/gi) || []).length >= 3
}

function ModePill() {
  const { mode, setMode } = useCoach()
  return (
    <div style={{ display: 'flex', background: '#0E1118', border: '1px solid #1F242E', padding: 3 }}>
      {[
        { id: 'spartan', label: 'スパルタ', tone: COACHES_SHARED.spartan.tone },
        { id: 'gentle',  label: 'やさしい', tone: COACHES_SHARED.gentle.tone },
      ].map(opt => {
        const active = mode === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            style={{
              background: active ? opt.tone : 'transparent',
              border: 'none',
              color: active ? '#0B0D10' : '#8693AA',
              fontFamily: '"Noto Sans JP", system-ui',
              fontWeight: 700, fontSize: 11,
              padding: '5px 9px', cursor: 'pointer',
            }}
          >{opt.label}</button>
        )
      })}
    </div>
  )
}

export default function AITab() {
  const { user, profile } = useAuth()
  const { coach, mode } = useCoach()
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savingPlanIdx, setSavingPlanIdx] = useState(null)
  const [savedPlanIdxes, setSavedPlanIdxes] = useState(new Set())
  const [toast, setToast] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const trainer = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainer] || TRAINER_IMAGES.RYOTA
  const accent = coach.tone

  useEffect(() => {
    if (user) {
      supabase.from('workout_sessions').select('date, exercises')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(12)
        .then(({ data }) => setRecentWorkouts(data || []))
    }
  }, [user])

  useEffect(() => {
    const h = () => inputRef.current?.focus()
    window.addEventListener('iron-open-chat', h)
    return () => window.removeEventListener('iron-open-chat', h)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function doSend(text) {
    const msg = (text ?? input).trim()
    if (!msg || isLoading) return
    setInput('')
    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: msg, history: messages.slice(-10), profile, recentWorkouts, coachMode: mode },
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }])
    } finally {
      setIsLoading(false)
    }
  }

  async function savePlan(content, idx) {
    setSavingPlanIdx(idx)
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: content, history: [], profile, recentWorkouts, coachMode: mode, format: 'structure' },
      })
      if (error) throw error
      const plan = JSON.parse(data.content)
      if (!plan.exercises?.length) throw new Error('exercises empty')
      await supabase.from('planned_sessions').insert({
        user_id: profile.id,
        planned_date: plan.planned_date,
        exercises: plan.exercises,
        cardio: [], memo: '', status: 'pending',
      })
      setSavedPlanIdxes(prev => new Set([...prev, idx]))
      window.dispatchEvent(new CustomEvent('iron-plan-saved'))
      setToast('計画を保存しました')
      setTimeout(() => setToast(''), 2500)
    } catch {
      setToast('保存に失敗しました')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setSavingPlanIdx(null)
    }
  }

  const greetingText = TRAINER_GREETINGS[trainer]?.[mode]
    ?? (mode === 'spartan' ? '今日の追い込みが甘い。まだいける。' : 'お疲れさまでした。継続できています。')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0B0D10' }}>

      {toast && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 56px)',
          left: '50%', transform: 'translateX(-50%)',
          background: '#1F242E', border: '1px solid #5BC25B',
          color: '#5BC25B', padding: '8px 18px',
          fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 1,
          zIndex: 10, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #1A1F28', background: '#0B0D10' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CoachAvatarShared size={52} tone={accent} letter={coach.letter} img={trainerImg} pulse />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1.5, color: accent }}>YOUR COACH · ONLINE</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginTop: 1 }}>{coach.name}</div>
          </div>
          <ModePill />
        </div>
        <div style={{
          margin: '0 16px 12px',
          borderLeft: `2px solid ${accent}`, paddingLeft: 10,
          fontSize: 12, lineHeight: 1.65, color: '#B5BECF',
        }}>
          {greetingText}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 8px' }}>

        {messages.length === 0 && !isLoading && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 2, color: '#5A6477', marginBottom: 8 }}>
              QUICK START
            </div>
            {QUICK_PROMPTS.map((q, i) => (
              <div
                key={i}
                onClick={() => doSend(q)}
                style={{
                  padding: '11px 14px', marginBottom: 6,
                  border: '1px solid #1F242E', background: '#13171F',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 13, color: '#B5BECF' }}>{q}</span>
                <span style={{ color: accent, fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1, flexShrink: 0, marginLeft: 8 }}>ASK →</span>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: 8,
            }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 28, height: 28, flexShrink: 0, background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden' }}>
                  <img src={trainerImg} alt={trainer} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                fontSize: 13, lineHeight: 1.7,
                ...(msg.role === 'user'
                  ? { background: '#FF6A1A', color: '#0B0D10', fontWeight: 500 }
                  : { background: '#13171F', border: '1px solid #1F242E', borderLeft: `2px solid ${accent}`, color: '#E5E9F0' }
                ),
              }}>
                {msg.content}
              </div>
            </div>
            {msg.role === 'assistant' && hasPlan(msg.content) && (
              <div style={{ paddingLeft: 36, marginTop: 6 }}>
                {savedPlanIdxes.has(i) ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', background: '#5BC25B22',
                    border: '1px solid #5BC25B', fontSize: 11, color: '#5BC25B',
                    fontFamily: 'Bebas Neue', letterSpacing: 1,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5 11-11"/></svg>
                    保存済み
                  </div>
                ) : (
                  <button
                    onClick={() => savePlan(msg.content, i)}
                    disabled={savingPlanIdx === i}
                    style={{
                      padding: '5px 12px', background: 'transparent',
                      border: `1px solid ${accent}`, color: accent,
                      fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1,
                      cursor: savingPlanIdx === i ? 'default' : 'pointer',
                      opacity: savingPlanIdx === i ? 0.5 : 1,
                    }}
                  >
                    {savingPlanIdx === i ? '保存中...' : 'この計画を保存する →'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden' }}>
              <img src={trainerImg} alt={trainer} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ padding: '12px 16px', background: '#13171F', border: '1px solid #1F242E', borderLeft: `2px solid ${accent}` }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: 6, height: 6, background: accent,
                    animation: 'bounce 1.2s ease-in-out infinite',
                    animationDelay: `${j * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid #1F242E',
        padding: '12px 16px',
        background: '#0B0D10',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && doSend()}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, minWidth: 0, padding: '12px 14px',
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
