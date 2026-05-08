import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

export default function HistoryTab() {
  const { user, profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [weights, setWeights] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    if (user) {
      loadSessions()
      loadWeights()
    }
  }, [user, currentMonth])

  async function loadSessions() {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      .toISOString().split('T')[0]
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      .toISOString().split('T')[0]

    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
    setSessions(data || [])
  }

  async function loadWeights() {
    const { data } = await supabase
      .from('body_weights')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(30)
    setWeights(data || [])
  }

  function prevMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const chartData = weights.map(w => ({
    date: w.date.slice(5),
    weight: parseFloat(w.weight_kg),
  }))

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="font-bebas text-3xl mb-6" style={{ color: '#f97316' }}>HISTORY</h1>

      {/* 体重グラフ */}
      {weights.length > 0 && (
        <div className="rounded-2xl p-4 mb-6" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <h2 className="text-sm font-bold mb-3">体重推移</h2>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                labelStyle={{ color: '#888' }}
                itemStyle={{ color: '#f97316' }}
              />
              {profile?.goal_weight_kg && (
                <ReferenceLine y={profile.goal_weight_kg} stroke="#f97316" strokeDasharray="4 4" label={{ value: '目標', fill: '#f97316', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 月ナビ */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} style={{ color: '#888' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-bold">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </span>
        <button onClick={nextMonth} style={{ color: '#888' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* セッション一覧 */}
      <div className="space-y-3">
        {sessions.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: '#888' }}>この月の記録はありません</p>
        )}
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className="w-full text-left rounded-2xl p-4"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{session.date}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {(session.exercises || []).slice(0, 3).map((ex, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0f0f0f', color: '#888' }}>
                  {ex.name}
                </span>
              ))}
              {(session.exercises || []).length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0f0f0f', color: '#888' }}>
                  +{session.exercises.length - 3}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* セッション詳細 モーダル */}
      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  )
}

function SessionDetail({ session, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#0f0f0f' }}>
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onClose} style={{ color: '#888' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="font-bold">{session.date}</h2>
        </div>

        <div className="space-y-4">
          {(session.exercises || []).map((ex, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <h3 className="font-bold text-sm mb-2">{ex.name}</h3>
              {(ex.sets || []).map((set, j) => (
                <div key={j} className="flex gap-4 text-sm py-1" style={{ color: '#888' }}>
                  <span>Set {j + 1}</span>
                  <span>{set.weight}kg × {set.reps}回</span>
                </div>
              ))}
            </div>
          ))}

          {(session.cardio || []).length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <h3 className="font-bold text-sm mb-2">有酸素</h3>
              {session.cardio.map((c, i) => (
                <div key={i} className="text-sm py-1" style={{ color: '#888' }}>
                  {c.type}：{c.minutes}分
                </div>
              ))}
            </div>
          )}

          {session.memo && (
            <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <h3 className="font-bold text-sm mb-2">今日の意図</h3>
              <p className="text-sm" style={{ color: '#888' }}>{session.memo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
