import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getCategory, FILTER_CATS } from '../../lib/categories'

const FILTERS = ['すべて', '胸', '背中', '脚', '肩・腕']

function getCat(name) { return getCategory(name) }

function calcVolume(session) {
  return (session.exercises || []).reduce((t, ex) =>
    t + (ex.sets || []).reduce((s, set) =>
      s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0)
}

function getWeekDates() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function getDayLabel(date) {
  const d = new Date(date + 'T00:00:00')
  return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
}

function MiniBar({ values, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
      {values.map((v, i) => {
        const h = Math.max(4, max > 0 ? (v / max) * 56 : 4)
        const today = i === new Date().getDay() === 1 ? 6 : (new Date().getDay() + 6) % 7
        const isToday = i === today
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: h, background: isToday ? '#FF6A1A' : (v > 0 ? '#2A3142' : '#181C24') }} />
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: isToday ? '#FF6A1A' : '#5A6477' }}>
              {['月', '火', '水', '木', '金', '土', '日'][i]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HistoryRow({ session, isToday, onClick }) {
  const d = new Date(session.date + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  const monthStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const dayLabel = getDayLabel(session.date)
  const isSun = d.getDay() === 0

  const volume = calcVolume(session)
  const totalSets = (session.exercises || []).reduce((t, ex) => t + (ex.sets || []).length, 0)
  const exNames = (session.exercises || []).map(e => e.name)
  const highlights = exNames.slice(0, 2)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 14, padding: '16px 18px',
        borderBottom: '1px solid #1A1F28',
        background: isToday ? 'linear-gradient(90deg, rgba(255,106,26,0.08), transparent 60%)' : 'transparent',
        cursor: 'pointer', position: 'relative',
      }}
    >
      {isToday && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#FF6A1A' }} />
      )}
      <div style={{ width: 56, flexShrink: 0, borderRight: '1px solid #1F242E', paddingRight: 14 }}>
        <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 28, color: '#fff', lineHeight: 1 }}>{day}</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 12, color: '#5A6477', letterSpacing: 1, marginTop: 2 }}>{monthStr}</div>
        <div style={{ fontSize: 10, color: isSun ? '#FF6A1A' : '#8693AA', marginTop: 4, fontWeight: 700 }}>
          {dayLabel}曜日
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5, color: '#fff' }}>
            {exNames.slice(0, 2).join(' + ') || 'WORKOUT'}
          </div>
          {isToday && (
            <div style={{
              fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1,
              border: '1px solid #FF6A1A', color: '#FF6A1A', padding: '2px 5px',
            }}>TODAY</div>
          )}
        </div>
        <div style={{
          display: 'flex', gap: 14, marginBottom: 6, flexWrap: 'wrap',
          fontFamily: 'JetBrains Mono', fontSize: 11, color: '#8693AA',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'Oswald' }}>{volume.toLocaleString()}</span>kg
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'Oswald' }}>{totalSets}</span>sets
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'Oswald' }}>{(session.exercises || []).length}</span>種目
          </span>
        </div>
        {highlights.map((hl, i) => (
          <div key={i} style={{ fontSize: 11, color: '#8693AA', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div style={{ width: 4, height: 4, background: '#3A4253' }} />
            {hl}
          </div>
        ))}
      </div>
      <div style={{ alignSelf: 'center', color: '#3A4253' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  )
}

function SessionDetail({ session, onClose }) {
  const volume = calcVolume(session)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0B0D10', overflowY: 'auto', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
      <div style={{ paddingBottom: 40 }}>
        <div style={{
          padding: 'calc(env(safe-area-inset-top) + 16px) 18px 16px',
          borderBottom: '1px solid #1F242E',
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#13171F',
        }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A6477', cursor: 'pointer', padding: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 20, color: '#fff' }}>{session.date}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#5A6477', marginTop: 2 }}>
              {volume.toLocaleString()}kg · {(session.exercises || []).length} exercises
            </div>
          </div>
        </div>

        <div style={{ padding: '14px' }}>
          {(session.exercises || []).map((ex, i) => (
            <div key={i} style={{ background: '#13171F', border: '1px solid #1F242E', marginBottom: 10 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F242E', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, alignSelf: 'stretch', background: '#FF6A1A' }} />
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5, color: '#FF6A1A', marginBottom: 2 }}>{getCat(ex.name) || 'EXERCISE'}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{ex.name}</div>
                </div>
              </div>
              <div style={{ padding: '8px 16px 12px' }}>
                {(ex.sets || []).map((s, j) => (
                  <div key={j} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #1A1F28', alignItems: 'center' }}>
                    <div style={{ width: 22, fontFamily: 'Oswald', fontSize: 13, color: s.done ? '#5BC25B' : '#8693AA', fontWeight: 700 }}>{j + 1}</div>
                    <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: '#fff' }}>
                      {s.weight}<span style={{ fontSize: 10, color: '#5A6477', marginLeft: 2 }}>kg</span>
                    </div>
                    <div style={{ color: '#3A4253', fontFamily: 'Oswald', fontSize: 16 }}>×</div>
                    <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: '#fff' }}>
                      {s.reps}<span style={{ fontSize: 10, color: '#5A6477', marginLeft: 2 }}>回</span>
                    </div>
                    {s.done && (
                      <div style={{ marginLeft: 'auto', color: '#5BC25B' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                          <path d="M4 12l5 5 11-11" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {session.memo && (
            <div style={{ background: '#13171F', border: '1px solid #1F242E', padding: '14px 16px' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: '#FF6A1A', marginBottom: 8 }}>MEMO</div>
              <p style={{ fontSize: 14, color: '#B5BECF', lineHeight: 1.6, margin: 0 }}>{session.memo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HistoryTab() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('すべて')
  const [selectedSession, setSelectedSession] = useState(null)
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (user) loadSessions()
  }, [user])

  async function loadSessions() {
    const { data } = await supabase
      .from('workout_sessions').select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50)
    setSessions(data || [])
  }

  const weekDates = getWeekDates()
  const weekVolumes = weekDates.map(d => {
    const s = sessions.find(se => se.date === d)
    return s ? calcVolume(s) : 0
  })
  const maxVol = Math.max(...weekVolumes, 1)
  const thisWeekTotal = weekVolumes.reduce((a, b) => a + b, 0)

  const filteredSessions = selectedFilter === 'すべて' ? sessions : sessions.filter(session => {
    const cats = FILTER_CATS[selectedFilter] || []
    return (session.exercises || []).some(ex => cats.includes(getCat(ex.name)))
  })

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%' }}>
      {/* week summary */}
      <div style={{ padding: '16px 20px 18px', background: '#13171F', borderBottom: '1px solid #1F242E' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#FF6A1A' }}>THIS WEEK</div>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 32, color: '#fff', lineHeight: 1, marginTop: 2 }}>
              {thisWeekTotal.toLocaleString()}
              <span style={{ fontSize: 14, color: '#8693AA', marginLeft: 4 }}>KG</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: '#5A6477' }}>SESSIONS</div>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 22, color: '#E5E9F0' }}>
              {weekVolumes.filter(v => v > 0).length}
            </div>
          </div>
        </div>
        <MiniBar values={weekVolumes} max={maxVol} />
      </div>

      {/* filter */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderBottom: '1px solid #1A1F28', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => (
          <div
            key={f}
            onClick={() => setSelectedFilter(f)}
            style={{
              padding: '6px 12px', flexShrink: 0,
              background: selectedFilter === f ? '#fff' : '#13171F',
              color: selectedFilter === f ? '#0B0D10' : '#8693AA',
              fontFamily: 'Bebas Neue', fontSize: 13, letterSpacing: 1,
              border: selectedFilter === f ? 'none' : '1px solid #1F242E',
              cursor: 'pointer',
            }}
          >{f}</div>
        ))}
      </div>

      <div style={{ paddingBottom: 20 }}>
        {filteredSessions.length === 0 && (
          <p style={{ textAlign: 'center', color: '#5A6477', fontSize: 13, padding: '40px 0' }}>記録がありません</p>
        )}
        {filteredSessions.map((session) => (
          <HistoryRow
            key={session.id}
            session={session}
            isToday={session.date === todayStr}
            onClick={() => setSelectedSession(session)}
          />
        ))}
      </div>

      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  )
}
