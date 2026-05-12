import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getCategory } from '../../lib/categories'
import { useCoach, CoachAvatarShared, COACHES_SHARED } from '../../lib/coachContext'

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

const TRAINER_GREETINGS = {
  RYOTA: {
    spartan: '限界まで追い込んだか！？まだ余力があるなら全然足りてないぞ！',
    gentle:  'お疲れ！今日もよく来たな。この調子で一緒に頑張っていこう！',
  },
  YUKI: {
    spartan: '今日のトレーニング、手を抜いてないか？自分に正直になれ。',
    gentle:  'お疲れさまでした。今日も来られただけで、本当に素晴らしいですよ。',
  },
  DAIKI: {
    spartan: '前回のデータと比較すると改善点がある。数値を見て効率を上げろ。',
    gentle:  '記録を分析しました。数値的に良い傾向が出ています。一緒に最適化しましょう。',
  },
  KENJI: {
    spartan: '言い訳は要らない。今日も限界を超えるだけだ。それだけでいい。',
    gentle:  '無理せず、でも妥協もするな。ちょうどいい負荷を一緒に見つけよう。',
  },
  NANA: {
    spartan: '今日も全力で行くよ！手を抜いたら絶対後悔するからね！',
    gentle:  'おつかれー！今日も来てくれてありがとう！一緒に楽しもうね',
  },
  HANA: {
    spartan: '本日も丁寧に、しかし妥協なく取り組んでいただきます。',
    gentle:  '本日もお疲れさまです。一歩一歩、着実に進んでいきましょう。',
  },
  RACHELL: {
    spartan: 'No excuses。世界レベルの選手は不快感を乗り越える。さあやるぞ。',
    gentle:  'よく来たね。継続こそが世界基準の成果につながる。一緒にやろう。',
  },
  TORU: {
    spartan: '長年見てきたが、甘い選手はここで止まる。さあ、どうする。',
    gentle:  '焦らんでいい。長い目で見れば、続けることが一番大切だ。',
  },
  BILLY: {
    spartan: 'YO！今日も燃やしていくぞ！中途半端は俺が許さん！',
    gentle:  'YO！来てくれてサンキュー！一緒に楽しくやっていこうぜ！',
  },
}

const FEED_MSGS = {
  spartan: {
    growth:  (v) => v !== null ? `${v >= 0 ? '+' : ''}${v}%の変化。満足するな、これは通過点だ。` : '記録を続けると成長グラフが表示される。',
    issue:   (v) => v !== null ? `プッシュ系${v}%。プル系を増やせ、背中の日を組め。` : 'プッシュ/プル比率を分析する。記録を続けろ。',
    goal:    (v) => v !== '—'  ? `${v}を目標に設定。全力で取りにいけ。` : 'プロフィールで目標を設定しろ。',
    balance: (v) => v > 0     ? `直近${v}セッション。継続してデータを積め。` : 'セッションを重ねるとバランス分析が解放される。',
  },
  gentle: {
    growth:  (v) => v !== null ? `${v >= 0 ? '+' : ''}${v}%の変化。素晴らしい伸びです、自信を持って。` : '記録を続けると成長グラフが表示されますよ。',
    issue:   (v) => v !== null ? `プッシュ系${v}%。背中の日を1日入れてみましょう。` : 'トレーニングバランスを確認しています。',
    goal:    (v) => v !== '—'  ? `${v}を目標に。一緒に目指しましょう。` : 'プロフィールで目標を設定してみましょう。',
    balance: (v) => v > 0     ? `直近${v}セッションを分析中。継続していきましょう。` : 'セッションを重ねると詳細分析ができますよ。',
  },
}

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

function hasPlan(text) {
  return (text.match(/\d+\s*(セット|回|kg)/gi) || []).length >= 3
}

const QUICK_PROMPTS = [
  '直近のセッションを振り返る',
  '今日のメニューを相談する',
  '来週の計画を立てる',
  '停滞期を打破したい',
]

// ── ModePill ────────────────────────────────────────────────────────────────
function ModePill() {
  const { mode, setMode } = useCoach()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#0E1118', border: '1px solid #1F242E', padding: 3,
    }}>
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

// ── FeedTurn ────────────────────────────────────────────────────────────────
function FeedTurn({ icon, label, message, metric, unit, accent, big = false, onAsk }) {
  const { coach, trainerImg } = useCoach()
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{ paddingTop: 2 }}>
        <CoachAvatarShared size={48} tone={coach.tone} letter={coach.letter} img={trainerImg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {icon && <div style={{ color: accent }}>{icon}</div>}
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: accent }}>{label}</div>
        </div>
        <div style={{
          background: '#13171F', border: '1px solid #1F242E',
          borderLeft: `2px solid ${accent}`, padding: '12px 14px',
        }}>
          {metric !== undefined && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <div style={{
                fontFamily: 'Oswald', fontWeight: 700,
                fontSize: big ? 36 : 26, lineHeight: 1, color: accent, letterSpacing: -0.5,
              }}>{metric}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1, color: '#5A6477' }}>{unit}</div>
            </div>
          )}
          <div style={{ fontSize: 13, lineHeight: 1.65, color: '#E5E9F0', fontWeight: 500 }}>{message}</div>
          {onAsk && (
            <div onClick={onAsk} style={{
              marginTop: 8, fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
              color: accent, cursor: 'pointer',
            }}>もっと聞く →</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ChatSheet ────────────────────────────────────────────────────────────────
function ChatSheet({ open, initialPrompt, profile, recentWorkouts, onClose, trainerName, trainerImg, coach, coachMode }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savingPlanIdx, setSavingPlanIdx] = useState(null)
  const [savedPlanIdxes, setSavedPlanIdxes] = useState(new Set())
  const [toast, setToast] = useState('')
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
      setSavedPlanIdxes(new Set())
      didSendInitial.current = false
    }
  }, [open])

  async function savePlan(content, idx) {
    setSavingPlanIdx(idx)
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: content, history: [], profile, recentWorkouts, coachMode, format: 'structure' },
      })
      if (error) throw error
      const plan = JSON.parse(data.content)
      if (!plan.exercises?.length) throw new Error('exercises empty')
      await supabase.from('planned_sessions').insert({
        user_id: profile.id,
        planned_date: plan.planned_date,
        exercises: plan.exercises,
        cardio: [],
        memo: '',
        status: 'pending',
      })
      setSavedPlanIdxes(prev => new Set([...prev, idx]))
      setToast('計画を保存しました')
      setTimeout(() => setToast(''), 2500)
    } catch {
      setToast('保存に失敗しました')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setSavingPlanIdx(null)
    }
  }

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
        body: { message: msg, history: hist, profile, recentWorkouts, coachMode },
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
      {toast && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 60px)',
          left: '50%', transform: 'translateX(-50%)',
          background: '#1F242E', border: '1px solid #5BC25B',
          color: '#5BC25B', padding: '8px 18px',
          fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 1,
          zIndex: 10, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477', marginBottom: 10 }}>
              QUICK START
            </div>
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
                <span style={{ color: accent, fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1, flexShrink: 0 }}>ASK →</span>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, flexShrink: 0,
                  background: '#0E1118', border: '1px solid #1F242E', overflow: 'hidden',
                }}>
                  <img src={trainerImg} alt={trainerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                    width: 6, height: 6, background: accent,
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

      <div style={{
        flexShrink: 0,
        borderTop: '1px solid #1F242E',
        padding: '12px max(16px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 12px) 16px',
        background: '#0B0D10',
      }}>
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          <input
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AITab() {
  const { user, profile } = useAuth()
  const { coach, mode } = useCoach()
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState(null)

  const trainer = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainer] || TRAINER_IMAGES.RYOTA

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

  useEffect(() => {
    const h = () => { setChatPrompt(null); setChatOpen(true) }
    window.addEventListener('iron-open-chat', h)
    return () => window.removeEventListener('iron-open-chat', h)
  }, [])

  // ── Derived metrics ────────────────────────────────────────────────────────
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

  const msgs = FEED_MSGS[mode]
  const greetingText = TRAINER_GREETINGS[trainer]?.[mode]
    ?? (mode === 'spartan' ? '今日の追い込みが甘い。まだいける。' : 'お疲れさまでした。継続できています。')

  const openChat = (q = null) => { setChatPrompt(q); setChatOpen(true) }

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%', paddingBottom: 20 }}>
      {/* ── Coach header ── */}
      <div style={{
        padding: '14px 16px',
        background: '#0B0D10',
        borderBottom: '1px solid #1A1F28',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <CoachAvatarShared size={72} tone={coach.tone} letter={coach.letter} img={trainerImg} pulse />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: coach.tone }}>
            YOUR COACH · ONLINE
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginTop: 2 }}>{coach.name}</div>
        </div>
        <ModePill />
      </div>

      {/* ── Feed ── */}
      <div style={{ padding: '14px 14px 0' }}>
        <FeedTurn
          label="今日のひとこと"
          accent={coach.tone}
          message={greetingText}
        />
        <FeedTurn
          icon={<IcoTrend s={14} c="#5BC25B" />}
          label="伸び"
          accent="#5BC25B"
          metric={volChangePct !== null ? `${volChangePct >= 0 ? '+' : ''}${volChangePct}` : '—'}
          unit={volChangePct !== null ? '% 前週比' : ''}
          message={msgs.growth(volChangePct)}
          onAsk={() => openChat('この伸びをどう活かす？')}
        />
        <FeedTurn
          icon={<IcoFlame s={14} c="#FF6A1A" />}
          label="気になる点"
          accent="#FF6A1A"
          metric={pushRatio !== null ? String(pushRatio) : '—'}
          unit={pushRatio !== null ? '% PUSH' : ''}
          message={msgs.issue(pushRatio)}
          onAsk={() => openChat('プル系、何から組む？')}
        />
        <FeedTurn
          icon={<IcoTarget s={14} c="#FFB800" />}
          label="次の目標"
          accent="#FFB800"
          metric={goalLabel}
          unit={profile?.goal_weight_kg ? `目標 ${profile.goal_weight_kg}kg` : ''}
          message={msgs.goal(goalLabel)}
          onAsk={() => openChat('目標達成のプランを組んで')}
        />
        <FeedTurn
          icon={<IcoBalance s={14} c="#5AA9FF" />}
          label="バランス"
          accent="#5AA9FF"
          metric={days30 > 0 ? String(days30) : '—'}
          unit={days30 > 0 ? '日 / 30日' : ''}
          message={msgs.balance(days30)}
          onAsk={() => openChat('トレーニングバランスを改善したい')}
        />

        {/* ── Inline chat trigger ── */}
        <div
          onClick={() => openChat(null)}
          style={{
            display: 'flex', gap: 8, alignItems: 'center',
            padding: '10px 12px',
            background: '#13171F', border: '1px solid #1F242E',
            marginTop: 4, marginBottom: 10,
            cursor: 'pointer',
          }}
        >
          <CoachAvatarShared size={36} tone={coach.tone} letter={coach.letter} img={trainerImg} />
          <div style={{ flex: 1, fontSize: 12, color: '#8693AA' }}>{coach.name} に質問する...</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: coach.tone }}>OPEN →</div>
        </div>

        {/* ── Subtle Pro mention ── */}
        <div style={{
          marginTop: 4, padding: '10px 12px',
          background: 'transparent', border: '1px dashed #2A3142',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ color: '#FF6A1A', flexShrink: 0 }}><IcoCrown s={13} c="#FF6A1A" /></div>
            <div style={{ fontSize: 11, color: '#8693AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              無料は週3回まで · Pro で質問・プラン無制限
            </div>
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: '#FF6A1A', flexShrink: 0, cursor: 'pointer' }}>
            ¥980 →
          </div>
        </div>
      </div>

      <ChatSheet
        key={chatOpen ? `${mode}-${chatPrompt || 'open'}` : 'closed'}
        open={chatOpen}
        initialPrompt={chatPrompt}
        profile={profile}
        recentWorkouts={recentWorkouts}
        onClose={() => setChatOpen(false)}
        trainerName={trainer}
        trainerImg={trainerImg}
        coach={coach}
        coachMode={mode}
      />
    </div>
  )
}
