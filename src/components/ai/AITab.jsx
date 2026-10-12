import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { localDateStr } from '../../lib/dates'
import { hapticImpact, hapticError } from '../../lib/haptics'
import { listSessions, addPlan, loadChat, saveChat } from '../../lib/localdb'
import { sendChat, structurePlan, extractAndSaveMemories } from '../../lib/aiClient'
import { useCoach } from '../../lib/coachContext'

const TRAINER_GREETINGS = {
  RYOTA:   'お疲れ！今日もよく来たな。この調子で一緒に頑張っていこう！',
  YUKI:    'お疲れさまでした。今日も来られただけで、本当に素晴らしいですよ。',
  DAIKI:   '記録を分析しました。数値的に良い傾向が出ています。一緒に最適化しましょう。',
  KENJI:   '言い訳は要らない。やるか、やらないかだ。',
  NANA:    '来たね。焦らず、今日の一本をきれいに決めよう。',
  HANA:    '本日もお疲れさまです。一歩一歩、着実に進んでいきましょう。',
  RACHELL: 'よく来たね。継続こそがWorld-classの成果につながる。一緒にやろう。',
  TORU:    '焦らんでいい。長い目で見れば、続けることが一番大切だ。',
  BILLY:   'YO！来てくれてサンキュー！一緒に楽しくやっていこうぜ！',
}

// 定型アクション（入力欄の上に常設。自由文を打たずに主要2操作が完結する）
const QUICK_ACTIONS = [
  { label: '結果をフィードバック', prompt: '直近のトレーニング結果を振り返って、良かった点と改善点を簡潔に教えて' },
  { label: 'メニューを提案して', prompt: '直近の記録を踏まえて、次回のトレーニングメニューを具体的に提案して' },
]

function hasPlan(text) {
  return (text.match(/\d+\s*(セット|回|kg)/gi) || []).length >= 3
}

export default function AITab({ keyboardOpen = false }) {
  const { user, profile } = useAuth()
  const { coach, trainerImg } = useCoach()
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [messages, setMessages] = useState([])
  const chatLoadedRef = useRef(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savingPlanIdx, setSavingPlanIdx] = useState(null)
  const [savedPlanIdxes, setSavedPlanIdxes] = useState(new Set())
  const [toast, setToast] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const trainer = profile?.trainer_character || 'RYOTA'
  const accent = coach.tone

  // チャット履歴の復元・永続化（端末内）。
  // トレーナーを変更した場合は履歴を引き継がない（前キャラの人格が会話に混ざるのを防ぐ）
  useEffect(() => {
    loadChat(trainer).then(saved => {
      if (saved.length) setMessages(saved)
      chatLoadedRef.current = true
    })
  }, [])

  // タブは常時マウントのため、設定でトレーナーが変わっても再マウントされない。
  // trainer変化を検知してstateの履歴も即クリアする（旧キャラの発言が新キャラ名で再保存されるのを防ぐ）
  const prevTrainerRef = useRef(trainer)
  useEffect(() => {
    if (prevTrainerRef.current !== trainer) {
      prevTrainerRef.current = trainer
      setMessages([])
      setSavedPlanIdxes(new Set())
      saveChat([], trainer)
    }
  }, [trainer])

  useEffect(() => {
    if (chatLoadedRef.current) saveChat(messages, trainer)
  }, [messages])

  useEffect(() => {
    if (user) {
      listSessions(12).then(list =>
        setRecentWorkouts(list.map(s => ({ date: s.date, exercises: s.exercises })))
      )
    }
  }, [user])

  // 記録保存時に直近記録を更新（AIの文脈を最新に保つ）
  useEffect(() => {
    const h = () => listSessions(12).then(list =>
      setRecentWorkouts(list.map(s => ({ date: s.date, exercises: s.exercises })))
    )
    window.addEventListener('iron-session-saved', h)
    return () => window.removeEventListener('iron-session-saved', h)
  }, [])

  useEffect(() => {
    const h = () => inputRef.current?.focus()
    window.addEventListener('iron-open-chat', h)
    return () => window.removeEventListener('iron-open-chat', h)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // display: 吹き出しに出す短い表記（定型ボタンは長い指示文ではなくボタン名を見せる）
  async function doSend(text, display) {
    const msg = (text ?? input).trim()
    if (!msg || isLoading) return
    setInput('')
    const next = [...messages, { role: 'user', content: msg, ...(display ? { display } : {}) }]
    setMessages(next)
    setIsLoading(true)
    try {
      const content = await sendChat({
        message: msg, history: messages.slice(-10), profile, recentWorkouts,
      })
      setMessages(prev => [...prev, { role: 'assistant', content }])
      // 長期記憶の抽出・保存はバックグラウンド（UIを待たせない）。
      // 旧キーワードゲートは発火率が低く「記憶が機能していない」FBが出たため毎回実行する
      extractAndSaveMemories({ message: msg, assistantResponse: content })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }])
    } finally {
      setIsLoading(false)
    }
  }

  async function savePlan(content, idx) {
    setSavingPlanIdx(idx)
    try {
      const plan = await structurePlan({ message: content, profile })
      if (!plan.exercises?.length) throw new Error('exercises empty')
      // AIが返す日付が欠落・過去日の場合は今日に補正
      const today = localDateStr()
      const plannedDate = (plan.planned_date && plan.planned_date >= today) ? plan.planned_date : today
      await addPlan({ planned_date: plannedDate, exercises: plan.exercises })
      hapticImpact()
      setSavedPlanIdxes(prev => new Set([...prev, idx]))
      window.dispatchEvent(new CustomEvent('iron-plan-saved'))
      setToast('計画を保存しました')
      setTimeout(() => setToast(''), 2500)
    } catch {
      hapticError()
      setToast('保存に失敗しました')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setSavingPlanIdx(null)
    }
  }

  const greetingText = TRAINER_GREETINGS[trainer] ?? '今日も一緒に頑張ろう。'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

      {toast && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 56px)',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--border)', border: '1px solid #5BC25B',
          color: '#5BC25B', padding: '8px 18px',
          fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 1,
          zIndex: 10, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      {/* ── Header（入力中）: キーボードで画面が狭くなるため1行に畳む ── */}
      {keyboardOpen && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 16px', borderBottom: '1px solid var(--border2)', background: 'var(--bg-deep)',
        }}>
          <img src={trainerImg} alt={trainer} style={{ width: 30, height: 30, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)', letterSpacing: 1 }}>{trainer}</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: accent }}>{coach.tag}</div>
        </div>
      )}

      {/* ── Header: 大型キャラ切り抜き＋吹き出し（あすけん風） ── */}
      {!keyboardOpen && <div style={{
        flexShrink: 0, position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid var(--border2)',
        background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg) 100%)',
        minHeight: 148,
      }}>
        {/* 背景のアクセント斜線 */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 170,
          background: `repeating-linear-gradient(45deg, transparent 0 10px, ${accent}0D 10px 11px)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '14px 158px 14px 16px',
          minHeight: 148, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1.5, color: accent }}>YOUR COACH · ONLINE</div>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: '#5BC25B', boxShadow: '0 0 0 1px var(--bg)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 24, color: 'var(--text-strong)', letterSpacing: 1 }}>{trainer}</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: accent }}>{coach.tag}</div>
          </div>
          {/* 吹き出し */}
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderLeft: `2px solid ${accent}`,
              padding: '9px 12px',
              fontSize: 13, lineHeight: 1.6, color: 'var(--text)',
            }}>
              {greetingText}
            </div>
            {/* 吹き出しの矢（キャラ側に向ける） */}
            <div style={{
              position: 'absolute', right: -6, top: '50%', marginTop: -6,
              width: 0, height: 0,
              borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
              borderLeft: '6px solid var(--border)',
            }} />
          </div>
        </div>
        {/* キャラ切り抜き（右下に大きく） */}
        <img
          src={trainerImg}
          alt={trainer}
          style={{
            position: 'absolute', right: -6, bottom: 0, zIndex: 2,
            height: 148, maxWidth: 150, objectFit: 'contain', objectPosition: 'bottom',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.6))',
          }}
        />
      </div>}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 8px' }}>

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: 8,
            }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 28, height: 28, flexShrink: 0, background: 'var(--bg-deep)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <img src={trainerImg} alt={trainer} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                fontSize: 15, lineHeight: 1.75,
                ...(msg.role === 'user'
                  // 自分の発言は薄いオレンジ＋同色のぼかしで背景に溶かす（ベタ塗りはきつすぎるFB）
                  ? {
                      background: 'rgba(255,106,26,0.12)', color: 'var(--text)', fontWeight: 500,
                      boxShadow: '0 0 14px 3px rgba(255,106,26,0.14)',
                    }
                  : { background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `2px solid ${accent}`, color: 'var(--text)' }
                ),
              }}>
                {msg.display ?? msg.content}
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
            <div style={{ width: 28, height: 28, flexShrink: 0, background: 'var(--bg-deep)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <img src={trainerImg} alt={trainer} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `2px solid ${accent}` }}>
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
        borderTop: '1px solid var(--border)',
        padding: '10px 16px 12px',
        background: 'var(--bg)',
      }}>
        {/* 定型アクション（自由文を打たずに主要操作が完結する） */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {QUICK_ACTIONS.map((a, i) => (
            <button
              key={i}
              onClick={() => doSend(a.prompt, a.label)}
              disabled={isLoading}
              style={{
                flex: 1, padding: '9px 8px',
                background: 'var(--card)', border: `1px solid ${accent}`,
                color: accent, fontSize: 12, fontWeight: 700,
                fontFamily: '"Noto Sans JP", system-ui',
                cursor: isLoading ? 'default' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >{a.label}</button>
          ))}
        </div>
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
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--text)', outline: 'none',
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
