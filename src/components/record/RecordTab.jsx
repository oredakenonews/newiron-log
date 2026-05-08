import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getCategory } from '../../lib/categories'

const ITEM_H = 36
const VISIBLE = 3

const WEIGHT_VALUES = (() => {
  const out = []
  for (let v = 0; v <= 60; v += 0.5) out.push(Number(v.toFixed(1)))
  for (let v = 62.5; v <= 300; v += 2.5) out.push(Number(v.toFixed(1)))
  return out
})()
const REP_VALUES = Array.from({ length: 50 }, (_, i) => i + 1)

function nearestWeight(w) {
  const n = parseFloat(w) || 0
  let best = WEIGHT_VALUES[0], bestD = Infinity
  for (const v of WEIGHT_VALUES) {
    const d = Math.abs(v - n)
    if (d < bestD) { best = v; bestD = d }
  }
  return best
}


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

function Wheel({ values, value, onChange, suffix }) {
  const ref = useRef(null)
  const [active, setActive] = useState(value)
  const padH = ((VISIBLE - 1) / 2) * ITEM_H

  useEffect(() => {
    const idx = values.findIndex(v => v === value)
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_H
    }
  }, [])

  function onScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollTop / ITEM_H)
    const v = values[Math.max(0, Math.min(values.length - 1, i))]
    if (v !== active) {
      setActive(v)
      onChange(v)
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', height: VISIBLE * ITEM_H }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: padH, height: ITEM_H,
        borderTop: '1px solid #FF6A1A', borderBottom: '1px solid #FF6A1A',
        background: 'rgba(255,106,26,0.05)', pointerEvents: 'none', zIndex: 2,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: padH,
        background: 'linear-gradient(180deg, #13171F 30%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: padH,
        background: 'linear-gradient(0deg, #13171F 30%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: '100%', overflowY: 'scroll',
          scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
        }}
      >
        <div style={{ height: padH }} />
        {values.map(v => {
          const sel = v === active
          return (
            <div key={v} style={{
              height: ITEM_H, scrollSnapAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              fontFamily: 'Oswald', fontWeight: sel ? 700 : 500,
              fontSize: sel ? 26 : 20,
              color: sel ? '#fff' : '#5A6477',
              transition: 'font-size 0.15s, color 0.15s',
              letterSpacing: -0.5,
            }}>
              {v}
              <span style={{
                fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1,
                color: sel ? '#FF6A1A' : '#3A4253', fontWeight: 400,
              }}>{suffix}</span>
            </div>
          )
        })}
        <div style={{ height: padH }} />
      </div>
    </div>
  )
}

function WheelPickerSheet({ open, exerciseName, setIdx, initial, onCancel, onConfirm }) {
  const [w, setW] = useState(() => initial ? nearestWeight(initial.weight) : 0)
  const [r, setR] = useState(() => initial ? (parseInt(initial.reps) || 10) : 10)

  if (!open) return null

  const volume = w * r

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 110,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: '#13171F', borderTop: '2px solid #FF6A1A', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div style={{
          padding: '14px 18px 12px', borderBottom: '1px solid #1F242E',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: '#FF6A1A' }}>
              SET {String(setIdx + 1).padStart(2, '0')}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginTop: 2 }}>{exerciseName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: '#5A6477' }}>VOLUME</div>
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 22, color: '#fff', lineHeight: 1, marginTop: 2 }}>
              {volume.toLocaleString()}
              <span style={{ fontSize: 11, color: '#8693AA', marginLeft: 3 }}>kg</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', padding: '12px 18px 4px' }}>
          {['WEIGHT', 'REPS'].map((l, i) => (
            <div key={l} style={{ flex: 1, ...(i === 0 ? {} : { marginLeft: 24 }), fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#8693AA', textAlign: 'center' }}>{l}</div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', background: '#13171F' }}>
          <Wheel key={`w-${open}`} values={WEIGHT_VALUES} value={w} onChange={setW} suffix="KG" />
          <div style={{ width: 24, textAlign: 'center', fontFamily: 'Oswald', fontWeight: 500, fontSize: 22, color: '#3A4253' }}>×</div>
          <Wheel key={`r-${open}`} values={REP_VALUES} value={r} onChange={setR} suffix="回" />
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '12px 18px 0' }}>
          {[-2.5, -0.5, 0.5, 2.5].map(d => (
            <button
              key={d}
              onClick={() => setW(nearestWeight(w + d))}
              style={{
                flex: 1, background: '#0E1118', border: '1px solid #1F242E',
                color: '#B5BECF', fontFamily: 'JetBrains Mono', fontSize: 12,
                padding: '8px 0', cursor: 'pointer',
              }}
            >
              {d > 0 ? `+${d}` : d}<span style={{ color: '#5A6477', marginLeft: 2 }}>kg</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 18px 0' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: 'transparent', border: '1px solid #2A3142',
              color: '#8693AA', fontFamily: 'Oswald', fontWeight: 600, fontSize: 15,
              letterSpacing: 1.5, padding: '12px 0', cursor: 'pointer',
            }}
          >キャンセル</button>
          <button
            onClick={() => onConfirm({ weight: w, reps: r })}
            style={{
              flex: 2, background: '#FF6A1A', border: 'none', color: '#0B0D10',
              fontFamily: 'Oswald', fontWeight: 700, fontSize: 15, letterSpacing: 1.5,
              padding: '12px 0', cursor: 'pointer',
            }}
          >決定</button>
        </div>
      </div>
    </div>
  )
}

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

function AddExerciseSheet({ open, userExercises, onClose, onAdd }) {
  const [search, setSearch] = useState('')
  if (!open) return null

  const filtered = userExercises.filter(ex => ex.name.includes(search))

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: '#13171F', borderTop: '2px solid #FF6A1A',
          maxHeight: '78%', display: 'flex', flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div style={{
          padding: '18px 20px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #1F242E',
        }}>
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>種目を追加</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#5A6477', fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#0E1118', border: '1px solid #1F242E', padding: '10px 12px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A6477" strokeWidth="2" strokeLinecap="square">
              <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="種目を検索"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: '#fff', outline: 'none',
                fontFamily: '"Noto Sans JP", system-ui',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#5A6477', fontSize: 13, padding: '20px 0' }}>種目が見つかりません</p>
          )}
          {filtered.map((ex) => (
            <div
              key={ex.id}
              onClick={() => { onAdd(ex.name); onClose() }}
              style={{
                padding: '14px 0', borderBottom: '1px solid #1A1F28',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5, color: '#FF6A1A', marginBottom: 2 }}>
                  {getCategory(ex.name)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>{ex.name}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6477" strokeWidth="2.4" strokeLinecap="square">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RecordTab() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [userExercises, setUserExercises] = useState([])
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
    }
  }, [user])

  async function loadUserExercises() {
    const { data } = await supabase
      .from('user_exercises').select('*').eq('user_id', user.id).order('order')
    setUserExercises(data || [])
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
    if (existing) {
      await supabase.from('workout_sessions').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('workout_sessions').insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%' }}>
      <VolumeHeader exercises={exercises} onSave={saveSession} saving={saving} saved={saved} />

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
