import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCoach } from '../../lib/coachContext'
import { localDateStr, shortDayLabel } from '../../lib/dates'
import { listSessions, getPendingPlan, listRoutines } from '../../lib/localdb'
import { getCategory } from '../../lib/categories'
import { pickDaily, daysBetween } from '../../lib/trainerLines'

// アプリ起動時に1回だけ表示するコーチの挨拶ウインドウ（TestFlight FB反映）。
// キャラを大きく見せ、前回の記録を踏まえた今日の提案＋季節の一言を出す。
// 閉じた後の記録タブは記録に集中させる（常時コメント帯は廃止済み）。

const SEASONAL_LINES = [
  '新年は体を作り直すのにいい区切り。',          // 1月
  '寒い時期こそ、ウォームアップは入念に。',      // 2月
  '春が近い。薄着の季節に向けて仕込みどき。',    // 3月
  '新年度。新しい習慣を始めるのに最適なタイミング。', // 4月
  '気候が良い5月は、記録が伸びやすい季節。',     // 5月
  '梅雨入り前に、ジム習慣を固めておきたい。',    // 6月
  '夏本番。水分補給だけは絶対に忘れずに。',      // 7月
  '暑い日が続く。無理せず、でも止まらずに。',    // 8月
  '夏の疲れが出る頃。睡眠と栄養を大切に。',      // 9月
  '秋はトレーニングに最高の季節。',              // 10月
  '年末まであと少し。ここからの積み重ねが効く。', // 11月
  '今年の総仕上げ。1年の成長を確かめる月。',     // 12月
]

const CAT_LABELS = { CHEST: '胸', BACK: '背中', LEGS: '脚', SHOULDERS: '肩・腕', ARMS: '肩・腕' }

function buildNote(plan, sessions) {
  const seasonal = SEASONAL_LINES[new Date().getMonth()]
  if (plan?.exercises?.length) {
    return `${seasonal}\n今日はAIコーチの計画（${plan.exercises.length}種目）が入っています。記録タブから始められます。`
  }
  if (sessions.length === 0) {
    return `${seasonal}\n今日が最初の記録です。まずは1種目からで十分。`
  }
  const last = sessions[0]
  const lastCats = [...new Set((last.exercises || []).map(ex => CAT_LABELS[getCategory(ex.name)]).filter(Boolean))]
  // 直近セッションで触っていない部位を提案（最後に鍛えた日が最も古い部位）
  const lastTrained = {}
  for (const s of sessions) {
    for (const ex of (s.exercises || [])) {
      const label = CAT_LABELS[getCategory(ex.name)]
      if (label && !(label in lastTrained)) lastTrained[label] = s.date
    }
  }
  const candidates = ['胸', '背中', '脚', '肩・腕']
  const suggest = candidates.sort((a, b) => (lastTrained[a] || '0').localeCompare(lastTrained[b] || '0'))[0]
  const [, m, d] = last.date.split('-')
  const lastDesc = lastCats.length ? `${Number(m)}/${Number(d)}に${lastCats.join('・')}` : `${Number(m)}/${Number(d)}`
  return `${seasonal}\n前回は${lastDesc}を記録。今日は${suggest}を狙うのはどうでしょう。`
}

export default function WelcomeModal() {
  const { profile } = useAuth()
  const { coach, trainerImg, trainerName, lines } = useCoach()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [routines, setRoutines] = useState([])
  const [lineCtx, setLineCtx] = useState({ daysSince: null, lastExercise: null })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('iron-welcome-shown')) return
    } catch { /* sessionStorage不可なら毎回表示を避けるため出さない */ return }
    Promise.all([getPendingPlan(localDateStr()), listSessions(10), listRoutines()]).then(([plan, sessions, list]) => {
      // AI計画がある日は計画を優先。今日すでに記録済みの日はルーチン選択を出さない
      const trainedToday = sessions[0]?.date === localDateStr()
      setRoutines(plan?.exercises?.length || trainedToday ? [] : list)
      setLineCtx({
        daysSince: sessions[0] ? daysBetween(sessions[0].date) : null,
        lastExercise: sessions[0]?.exercises?.[0]?.name ?? null,
      })
      setNote(buildNote(plan, sessions))
      setOpen(true)
      try { sessionStorage.setItem('iron-welcome-shown', '1') } catch { /* noop */ }
    })
  }, [])

  if (!open || !note) return null

  function startRoutine(r) {
    navigate('/')
    window.dispatchEvent(new CustomEvent('iron-start-routine', { detail: { id: r.id } }))
    setOpen(false)
  }

  const rawName = profile?.display_name?.trim()
  const greetName = rawName
    ? (/(さん|くん|君|ちゃん|様)$/.test(rawName) ? rawName : `${rawName}さん`)
    : null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(10, 13, 18, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360, maxHeight: '90dvh', overflowY: 'auto',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderTop: `3px solid ${coach.tone}`,
          overflow: 'hidden',
        }}
      >
        {/* キャラを大きく */}
        <div style={{
          background: 'var(--bg-deep)', borderBottom: '1px solid var(--border2)',
          display: 'flex', justifyContent: 'center', paddingTop: 10,
        }}>
          <img src={trainerImg} alt={trainerName} style={{ height: routines.length > 0 ? 170 : 210, objectFit: 'contain', display: 'block' }} />
        </div>

        <div style={{ padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 22, color: 'var(--text-strong)', letterSpacing: 1 }}>{trainerName}</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: coach.tone }}>{coach.tag}</div>
          </div>

          {/* キャラのセリフ（人格はTRAINER_LINES由来） */}
          <div style={{
            borderLeft: `2px solid ${coach.tone}`, paddingLeft: 10,
            fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 12,
          }}>
            {greetName ? `${greetName}、` : ''}{pickDaily(lines.welcome(lineCtx), `welcome-${trainerName}`)}
          </div>

          {/* データに基づく今日のメモ（UIコピー。キャラのセリフとは分離） */}
          <div style={{
            background: 'var(--bg-deep)', border: '1px solid var(--border2)',
            padding: '10px 12px', marginBottom: 14,
          }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', marginBottom: 6 }}>TODAY'S NOTE</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-sub)', whiteSpace: 'pre-line' }}>{note}</div>
          </div>

          {routines.length > 0 ? (
            <>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 8 }}>今日のメニューを選ぶ</div>
              {routines.map(r => {
                const last = shortDayLabel(r.last_used_at)
                return (
                  <button
                    key={r.id}
                    onClick={() => startRoutine(r)}
                    style={{
                      width: '100%', marginBottom: 6, padding: '11px 14px',
                      background: 'var(--card)', border: '1px solid #FF6A1A',
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                      {r.exercises.length}種目{last ? ` · 前回 ${last}` : ''}
                    </span>
                    <span style={{ color: '#FF6A1A', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>›</span>
                  </button>
                )
              })}
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: '100%', marginTop: 4, padding: '10px 0',
                  background: 'transparent', border: 'none',
                  color: 'var(--text-2nd)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >ルーチンを使わずに始める</button>
            </>
          ) : (
            <button
              onClick={() => setOpen(false)}
              style={{
                width: '100%', padding: '13px 0',
                background: '#FF6A1A', border: 'none', color: 'var(--on-accent)',
                fontFamily: 'Oswald', fontWeight: 700, fontSize: 15, letterSpacing: 1.5,
                cursor: 'pointer',
              }}
            >今日を始める</button>
          )}
        </div>
      </div>
    </div>
  )
}
