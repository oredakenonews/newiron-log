import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getCategory } from '../../lib/categories'
import WheelPickerSheet, { WEIGHT_VALUES, REP_VALUES, nearestWeight } from '../shared/WheelPickerSheet'
import AddExerciseSheet from '../shared/AddExerciseSheet'
import { useCoach, CoachStrip, COACH_LINES } from '../../lib/coachContext'


function today() {
  return new Date().toISOString().split('T')[0]
}

function todayLabel() {
  const d = new Date()
  const week = ['日', '月', '火', '水', '木', '金', '土']
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day} / ${week[d.getDay()]}`
}

let nextId = 1
function genId() { return nextId++ }

function VolumeHeader({ exercises, onSave, saving, saved }) {
  const doneVol = exercises.reduce((t, ex) =>
    t + (ex.sets || []).reduce((s, set) =>
      s + (set.done ? (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0) : 0), 0), 0)
  const doneSets = exercises.reduce((t, ex) => t + (ex.sets || []).filter(s => s.done).length, 0)

  return (
    <div style={{
      padding: '20px 20px 20px', background: 'linear-gradient(180deg, #13171F 0%, #0E1118 100%)',
      borderBottom: '1px solid #1F242E', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: -40, width: 180, height: '100%',
        background: 'linear-gradient(135deg, transparent 50%, rgba(255,106,26,0.08) 50%, rgba(255,106,26,0.08) 55%, transparent 55%)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 2, color: '#FF6A1A' }}>TODAY'S VOLUME</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#5A6477', letterSpacing: 0.5 }}>{todayLabel()}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14, position: 'relative', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 52, lineHeight: 1, color: '#fff', letterSpacing: -1 }}>
            {doneVol.toLocaleString()}
          </div>
          <div style={{ fontFamily: 'Oswald', fontWeight: 500, fontSize: 20, color: '#8693AA', letterSpacing: 1 }}>KG</div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            background: saved ? '#5BC25B' : '#FF6A1A', border: 'none', color: '#0B0D10',
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 13, letterSpacing: 1.5,
            padding: '6px 14px', cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #1F242E', paddingTop: 12 }}>
        {[['種目', exercises.length], ['完了セット', doneSets]].map(([label, val], i) => (
          <div key={i} style={{
            flex: 1, paddingLeft: i === 0 ? 0 : 14,
            borderLeft: i === 0 ? 'none' : '1px solid #1F242E',
          }}>
            <div style={{ fontSize: 10, color: '#5A6477', letterSpacing: 1.5, fontFamily: 'Bebas Neue', marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: 'Oswald', fontWeight: 600, fontSize: 22, color: '#E5E9F0' }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SetRow({ set, idx, exId, onOpenPicker, onToggleDone }) {
  const done = !!set.done
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 0', borderBottom: '1px solid #1A1F28',
      opacity: done ? 0.55 : 1,
    }}>
      <div style={{
        width: 26, height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#1F2D1F' : '#181C24',
        border: done ? '1px solid #2C5A2C' : '1px solid #252B36',
        fontFamily: 'Oswald', fontWeight: 700, fontSize: 13,
        color: done ? '#5BC25B' : '#8693AA',
      }}>{idx + 1}</div>

      <div
        onClick={() => onOpenPicker(idx)}
        style={{
          flex: 1, padding: '10px 8px',
          background: '#0E1118', border: '1px solid #1F242E',
          color: '#fff', fontFamily: 'Oswald', fontWeight: 700, fontSize: 18,
          textAlign: 'right', cursor: 'pointer',
          display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4,
          minWidth: 0,
        }}
      >
        {set.weight !== '' && set.weight !== undefined ? set.weight : '—'}
        <span style={{ fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 11, color: '#5A6477', letterSpacing: 1 }}>KG</span>
      </div>

      <span style={{ fontFamily: 'Oswald', fontWeight: 500, fontSize: 18, color: '#3A4253' }}>×</span>

      <div
        onClick={() => onOpenPicker(idx)}
        style={{
          flex: 1, padding: '10px 8px',
          background: '#0E1118', border: '1px solid #1F242E',
          color: '#fff', fontFamily: 'Oswald', fontWeight: 700, fontSize: 18,
          textAlign: 'right', cursor: 'pointer',
          display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4,
          minWidth: 0,
        }}
      >
        {set.reps !== '' && set.reps !== undefined ? set.reps : '—'}
        <span style={{ fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 11, color: '#5A6477', letterSpacing: 1 }}>回</span>
      </div>

      <button
        onClick={() => onToggleDone(idx)}
        style={{
          width: 36, height: 36, flexShrink: 0,
          background: done ? '#FF6A1A' : 'transparent',
          border: done ? '1px solid #FF6A1A' : '1px solid #2A3142',
          color: done ? '#0B0D10' : '#5A6477',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M4 12l5 5 11-11" />
        </svg>
      </button>
    </div>
  )
}

function ExerciseCard({ ex, expanded, onToggleExpand, onOpenPicker, onAddSet, onToggleDone, onRemove }) {
  const totalVol = (ex.sets || []).reduce((s, x) => s + (parseFloat(x.weight) || 0) * (parseInt(x.reps) || 0), 0)
  const doneCount = (ex.sets || []).filter(s => s.done).length

  return (
    <div style={{ background: '#13171F', border: '1px solid #1F242E', marginBottom: 10 }}>
      <div
        onClick={onToggleExpand}
        style={{
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid #1F242E' : 'none',
        }}
      >
        <div style={{ width: 4, alignSelf: 'stretch', background: '#FF6A1A', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5, color: '#FF6A1A', marginBottom: 2 }}>
            {getCategory(ex.name)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', fontFamily: '"Noto Sans JP", system-ui', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ex.name}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 20, color: '#fff', lineHeight: 1 }}>
            {totalVol.toLocaleString()}
            <span style={{ fontSize: 11, color: '#5A6477', marginLeft: 3 }}>kg</span>
          </div>
          <div style={{ fontSize: 10, color: '#5A6477', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
            {doneCount}/{(ex.sets || []).length} SETS
          </div>
        </div>
        <div style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: '#5A6477', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '8px 16px 14px' }}>
          {(ex.sets || []).map((s, i) => (
            <SetRow
              key={i}
              set={s}
              idx={i}
              exId={ex.id}
              onOpenPicker={(setIdx) => onOpenPicker(ex.id, setIdx)}
              onToggleDone={(setIdx) => onToggleDone(ex.id, setIdx)}
            />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => onAddSet(ex.id)}
              style={{
                flex: 1, background: 'transparent', border: '1px dashed #2A3142',
                color: '#8693AA', fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5,
                padding: '10px 0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              + SET 追加
            </button>
            <button
              onClick={() => onRemove(ex.id)}
              style={{
                background: 'transparent', border: '1px solid #2A3142',
                color: '#5A6477', fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5,
                padding: '10px 14px', cursor: 'pointer',
              }}
            >削除</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PlanBanner({ plan, onLoad }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      background: '#0E1118', border: '1px solid #1F242E',
      borderLeft: '3px solid #5BC25B', margin: '0 14px 14px',
    }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 2, color: '#5BC25B' }}>TODAY'S PLAN</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#5A6477' }}>
            {(plan.exercises || []).length} exercises
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6477" strokeWidth="2.4" strokeLinecap="square"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1F242E' }}>
          <div style={{ paddingTop: 10, marginBottom: 10 }}>
            {(plan.exercises || []).map((ex, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '4px 0', borderBottom: '1px solid #1A1F28',
                fontSize: 12,
              }}>
                <div style={{ color: '#E5E9F0', fontWeight: 500, flex: 1 }}>{ex.name}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#5A6477' }}>
                  {(ex.sets || []).length}セット
                  {ex.sets?.[0]?.weight ? ` / ${ex.sets[0].weight}kg` : ''}
                  {ex.sets?.[0]?.reps ? ` × ${ex.sets[0].reps}回` : ''}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onLoad}
            style={{
              width: '100%', padding: '10px 0',
              background: '#5BC25B', border: 'none',
              color: '#0B0D10', fontFamily: 'Oswald', fontWeight: 700,
              fontSize: 13, letterSpacing: 1.5, cursor: 'pointer',
            }}
          >この計画を読み込む</button>
        </div>
      )}
    </div>
  )
}

export default function RecordTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { mode } = useCoach()
  const [exercises, setExercises] = useState([])
  const [userExercises, setUserExercises] = useState([])
  const [plannedSession, setPlannedSession] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [picker, setPicker] = useState(null)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (user) {
      loadTodaySession()
      loadUserExercises()
      loadTodayPlan()
    }
  }, [user])

  useEffect(() => {
    const h = () => loadTodayPlan()
    window.addEventListener('iron-plan-saved', h)
    return () => window.removeEventListener('iron-plan-saved', h)
  }, [user])

  async function loadUserExercises() {
    const { data } = await supabase
      .from('user_exercises').select('*').eq('user_id', user.id).order('order')
    setUserExercises(data || [])
  }

  async function loadTodayPlan() {
    const { data } = await supabase
      .from('planned_sessions').select('*')
      .eq('user_id', user.id).eq('planned_date', today()).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1).single()
    if (data) setPlannedSession(data)
  }

  async function loadTodaySession() {
    const { data } = await supabase
      .from('workout_sessions').select('*')
      .eq('user_id', user.id).eq('date', today()).single()
    if (data) {
      const loaded = (data.exercises || []).map((ex, i) => ({
        ...ex,
        id: i + 1,
        sets: (ex.sets || []).map(s => ({ ...s, done: s.done ?? false })),
      }))
      nextId = loaded.length + 1
      setExercises(loaded)
      if (loaded.length > 0) setExpandedId(loaded[0].id)
    }
  }

  function addExercise(name) {
    const id = genId()
    const newEx = { id, name, sets: [{ weight: '', reps: '', done: false }] }
    setExercises(prev => [...prev, newEx])
    setExpandedId(id)
  }

  function addSet(exId) {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      const last = ex.sets[ex.sets.length - 1] || { weight: '', reps: '' }
      return { ...ex, sets: [...ex.sets, { weight: last.weight, reps: last.reps, done: false }] }
    }))
  }

  function updateSet(exId, setIdx, weight, reps) {
    setExercises(prev => prev.map(ex =>
      ex.id !== exId ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, weight: String(weight), reps: String(reps) } : s),
      }
    ))
  }

  function toggleDone(exId, setIdx) {
    setExercises(prev => prev.map(ex =>
      ex.id !== exId ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, done: !s.done } : s),
      }
    ))
  }

  function removeExercise(exId) {
    setExercises(prev => prev.filter(ex => ex.id !== exId))
  }

  function loadPlan() {
    const loaded = (plannedSession.exercises || []).map(ex => ({
      ...ex,
      id: genId(),
      sets: (ex.sets || []).map(s => ({ ...s, done: false })),
    }))
    setExercises(loaded)
    if (loaded.length > 0) setExpandedId(loaded[0].id)
  }

  async function saveSession() {
    setSaving(true)
    const payload = {
      user_id: user.id, date: today(),
      exercises: exercises.map(({ id, ...ex }) => ex),
      cardio: [], memo: '',
    }
    const { data: existing } = await supabase
      .from('workout_sessions').select('id')
      .eq('user_id', user.id).eq('date', today()).single()

    let sessionId = null
    if (existing) {
      await supabase.from('workout_sessions').update(payload).eq('id', existing.id)
      sessionId = existing.id
    } else {
      const { data: inserted } = await supabase
        .from('workout_sessions').insert(payload).select('id').single()
      sessionId = inserted?.id
    }

    if (plannedSession && sessionId) {
      await supabase.from('planned_sessions')
        .update({ status: 'done', linked_session_id: sessionId })
        .eq('id', plannedSession.id)
      setPlannedSession(null)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const doneSets = exercises.reduce((t, ex) => t + (ex.sets || []).filter(s => s.done).length, 0)
  const allSets = exercises.reduce((t, ex) => t + (ex.sets || []).length, 0)
  const progress = allSets > 0 ? doneSets / allSets : 0
  const coachLine = progress === 0
    ? COACH_LINES[mode].record_idle
    : progress >= 1
      ? COACH_LINES[mode].record_done
      : COACH_LINES[mode].record_active({ doneSets, totalSets: allSets })

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%' }}>
      <VolumeHeader exercises={exercises} onSave={saveSession} saving={saving} saved={saved} />

      <div style={{ padding: '12px 14px 0' }}>
        <CoachStrip
          message={coachLine}
          sub={allSets > 0 ? `${doneSets}/${allSets} SETS` : undefined}
          action="チャットを開く"
          onOpenChat={() => navigate('/ai')}
        />
      </div>

      {plannedSession && (
        <PlanBanner plan={plannedSession} onLoad={loadPlan} />
      )}

      <div style={{ padding: '14px 14px 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '0 4px 10px',
        }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 2, color: '#8693AA' }}>
            TODAY'S WORKOUT
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#5A6477' }}>
            {exercises.length} exercises
          </div>
        </div>

        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            expanded={expandedId === ex.id}
            onToggleExpand={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
            onOpenPicker={(exId, setIdx) => setPicker({ exId, setIdx })}
            onAddSet={addSet}
            onToggleDone={toggleDone}
            onRemove={removeExercise}
          />
        ))}

        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            width: '100%', marginTop: 4,
            background: '#FF6A1A', border: 'none', color: '#0B0D10',
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, letterSpacing: 1.5,
            padding: '16px 0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          + 種目を追加
        </button>
      </div>

      <AddExerciseSheet
        open={showAddSheet}
        userExercises={userExercises}
        onClose={() => setShowAddSheet(false)}
        onAdd={addExercise}
      />

      {picker && (
        <WheelPickerSheet
          key={`${picker.exId}-${picker.setIdx}`}
          open={!!picker}
          exerciseName={exercises.find(e => e.id === picker.exId)?.name || ''}
          setIdx={picker.setIdx}
          initial={exercises.find(e => e.id === picker.exId)?.sets[picker.setIdx]}
          onCancel={() => setPicker(null)}
          onConfirm={({ weight, reps }) => {
            updateSet(picker.exId, picker.setIdx, weight, reps)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
