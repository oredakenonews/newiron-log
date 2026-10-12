import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getCategory } from '../../lib/categories'
import {
  listExercises, listSessions, getSessionByDate, upsertSession,
  getPendingPlan, markPlanDone,
  listRoutines, markRoutineUsed,
} from '../../lib/localdb'
import { localDateStr, shortDayLabel } from '../../lib/dates'
import { hapticImpact, hapticSuccess, hapticError } from '../../lib/haptics'
import WheelPickerSheet from '../shared/WheelPickerSheet'
import AddExerciseSheet from '../shared/AddExerciseSheet'


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

// 未保存入力の下書き（アプリがバックグラウンドでkillされても消えないように）
function draftKey(userId) {
  return `iron-draft-${userId}-${localDateStr()}`
}

function VolumeHeader({ exercises, onSave, saving, saved }) {
  const doneVol = exercises.reduce((t, ex) =>
    t + (ex.sets || []).reduce((s, set) =>
      s + (set.done ? (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0) : 0), 0), 0)
  const doneSets = exercises.reduce((t, ex) => t + (ex.sets || []).filter(s => s.done).length, 0)

  return (
    <div style={{
      padding: '20px 20px 20px', background: 'linear-gradient(180deg, var(--card) 0%, var(--bg-deep) 100%)',
      borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: -40, width: 180, height: '100%',
        background: 'linear-gradient(135deg, transparent 50%, rgba(255,106,26,0.08) 50%, rgba(255,106,26,0.08) 55%, transparent 55%)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 2, color: '#FF6A1A' }}>TODAY'S VOLUME</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5 }}>{todayLabel()}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14, position: 'relative', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 52, lineHeight: 1, color: 'var(--text-strong)', letterSpacing: -1 }}>
            {doneVol.toLocaleString()}
          </div>
          <div style={{ fontFamily: 'Oswald', fontWeight: 500, fontSize: 20, color: 'var(--text-2nd)', letterSpacing: 1 }}>KG</div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            background: saved ? '#5BC25B' : '#FF6A1A', border: 'none', color: 'var(--on-accent)',
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 13, letterSpacing: 1.5,
            padding: '10px 16px', cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {[['種目', exercises.length], ['完了セット', doneSets]].map(([label, val], i) => (
          <div key={i} style={{
            flex: 1, paddingLeft: i === 0 ? 0 : 14,
            borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, fontFamily: 'Bebas Neue', marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: 'Oswald', fontWeight: 600, fontSize: 22, color: 'var(--text)' }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SetRow({ set, idx, onOpenPicker, onToggleDone, onRemoveSet }) {
  const done = !!set.done
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 0', borderBottom: '1px solid var(--border2)',
      opacity: done ? 0.55 : 1,
    }}>
      <div style={{
        width: 26, height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#1F2D1F' : '#181C24',
        border: done ? '1px solid #2C5A2C' : '1px solid #252B36',
        fontFamily: 'Oswald', fontWeight: 700, fontSize: 13,
        color: done ? '#5BC25B' : 'var(--text-2nd)',
      }}>{idx + 1}</div>

      <div
        onClick={() => onOpenPicker(idx)}
        style={{
          flex: 1, padding: '10px 8px',
          background: 'var(--bg-deep)', border: '1px solid var(--border)',
          color: 'var(--text-strong)', fontFamily: 'Oswald', fontWeight: 700, fontSize: 18,
          textAlign: 'right', cursor: 'pointer',
          display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4,
          minWidth: 0,
        }}
      >
        {set.weight !== '' && set.weight !== undefined ? set.weight : '—'}
        <span style={{ fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>KG</span>
      </div>

      <span style={{ fontFamily: 'Oswald', fontWeight: 500, fontSize: 18, color: '#3A4253' }}>×</span>

      <div
        onClick={() => onOpenPicker(idx)}
        style={{
          flex: 1, padding: '10px 8px',
          background: 'var(--bg-deep)', border: '1px solid var(--border)',
          color: 'var(--text-strong)', fontFamily: 'Oswald', fontWeight: 700, fontSize: 18,
          textAlign: 'right', cursor: 'pointer',
          display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4,
          minWidth: 0,
        }}
      >
        {set.reps !== '' && set.reps !== undefined ? set.reps : '—'}
        <span style={{ fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>回</span>
      </div>

      <button
        onClick={() => onToggleDone(idx)}
        style={{
          width: 40, height: 40, flexShrink: 0,
          background: done ? '#FF6A1A' : 'transparent',
          border: done ? '1px solid #FF6A1A' : '1px solid var(--border-dash)',
          color: done ? 'var(--on-accent)' : 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M4 12l5 5 11-11" />
        </svg>
      </button>

      <button
        onClick={() => onRemoveSet(idx)}
        style={{
          width: 36, height: 40, flexShrink: 0,
          background: 'transparent', border: 'none',
          color: '#3A4253',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function ExerciseCard({ ex, expanded, onToggleExpand, onOpenPicker, onAddSet, onToggleDone, onRemoveSet, onRemove }) {
  const totalVol = (ex.sets || []).reduce((s, x) => s + (parseFloat(x.weight) || 0) * (parseInt(x.reps) || 0), 0)
  const doneCount = (ex.sets || []).filter(s => s.done).length

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 10 }}>
      <div
        onClick={onToggleExpand}
        style={{
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <div style={{ width: 4, alignSelf: 'stretch', background: '#FF6A1A', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5, color: '#FF6A1A', marginBottom: 2 }}>
            {getCategory(ex.name)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-strong)', fontFamily: '"Noto Sans JP", system-ui', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ex.name}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)', lineHeight: 1 }}>
            {totalVol.toLocaleString()}
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>kg</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
            {doneCount}/{(ex.sets || []).length} SETS
          </div>
        </div>
        <div style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--muted)', flexShrink: 0 }}>
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
              onOpenPicker={(setIdx) => onOpenPicker(ex.id, setIdx)}
              onToggleDone={(setIdx) => onToggleDone(ex.id, setIdx)}
              onRemoveSet={(setIdx) => onRemoveSet(ex.id, setIdx)}
            />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => onAddSet(ex.id)}
              style={{
                flex: 1, background: 'transparent', border: '1px dashed var(--border-dash)',
                color: 'var(--text-2nd)', fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5,
                padding: '12px 0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              + SET 追加
            </button>
            <button
              onClick={() => onRemove(ex.id)}
              style={{
                background: 'transparent', border: '1px solid var(--border-dash)',
                color: 'var(--muted)', fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5,
                padding: '12px 14px', cursor: 'pointer',
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
      background: 'var(--bg-deep)', border: '1px solid var(--border)',
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
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)' }}>
            {(plan.exercises || []).length} exercises
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="square"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 10, marginBottom: 10 }}>
            {(plan.exercises || []).map((ex, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '4px 0', borderBottom: '1px solid var(--border2)',
                fontSize: 12,
              }}>
                <div style={{ color: 'var(--text)', fontWeight: 500, flex: 1 }}>{ex.name}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)' }}>
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
              color: 'var(--on-accent)', fontFamily: 'Oswald', fontWeight: 700,
              fontSize: 13, letterSpacing: 1.5, cursor: 'pointer',
            }}
          >この計画を読み込む</button>
        </div>
      )}
    </div>
  )
}

function RoutinePicker({ routines, onStart, onCreate }) {
  if (routines.length === 0) {
    return (
      <button
        onClick={onCreate}
        style={{
          width: '100%', marginBottom: 12, padding: '13px 14px',
          background: 'transparent', border: '1px dashed var(--border-dash)',
          color: 'var(--text-2nd)', fontSize: 13, textAlign: 'left', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}
      >
        <span>ルーチンを作っておくと、1タップで今日のメニューを読み込めます</span>
        <span style={{ color: '#FF6A1A', fontWeight: 700, flexShrink: 0 }}>作成 ›</span>
      </button>
    )
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 8px' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 2, color: 'var(--muted)' }}>ルーチンから始める</div>
        <button onClick={onCreate} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>編集 ›</button>
      </div>
      {routines.map(r => {
        const last = shortDayLabel(r.last_used_at)
        return (
          <button
            key={r.id}
            onClick={() => onStart(r)}
            style={{
              width: '100%', marginBottom: 6, padding: '12px 14px',
              background: 'var(--card)',
              border: '1px solid var(--border)', borderLeft: '4px solid #FF6A1A',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>{r.name}</span>
                {last && <span style={{ fontSize: 11, color: 'var(--muted)' }}>前回 {last}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2nd)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.exercises.length}種目 · {r.exercises.map(ex => ex.name).join('、')}
              </div>
            </div>
            <span style={{ color: '#FF6A1A', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>始める ›</span>
          </button>
        )
      })}
    </div>
  )
}

// 直近セッションから種目ごとの前回重量・回数を拾う（新規セット・ルーチン読込の初期値に使用）
async function computeLastWeights() {
  const sessions = (await listSessions(15)).filter(s => s.date < localDateStr())
  const map = {}
  for (const session of sessions) {
    for (const ex of session.exercises || []) {
      if (map[ex.name]) continue
      const lastSet = (ex.sets || []).filter(s => parseFloat(s.weight) > 0).pop()
      if (lastSet) map[ex.name] = { weight: lastSet.weight, reps: lastSet.reps }
    }
  }
  return map
}

export default function RecordTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState([])
  const [routines, setRoutines] = useState([])
  const [activeRoutine, setActiveRoutine] = useState(null) // { id, name }
  const pendingRoutineRef = useRef(null)
  const [userExercises, setUserExercises] = useState([])
  const [plannedSession, setPlannedSession] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [picker, setPicker] = useState(null)
  const [lastWeights, setLastWeights] = useState({})
  const draftTimerRef = useRef(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (user) {
      loadTodaySession()
      loadUserExercises()
      loadTodayPlan()
      loadLastWeights()
      loadRoutines()
    }
  }, [user])

  useEffect(() => {
    const h = () => loadTodayPlan()
    window.addEventListener('iron-plan-saved', h)
    return () => window.removeEventListener('iron-plan-saved', h)
  }, [user])

  useEffect(() => {
    const onChanged = () => loadRoutines()
    // 起動時ウインドウの「◯◯で始める」から呼ばれる
    const onStart = async (e) => {
      const r = (await listRoutines()).find(x => x.id === e.detail?.id)
      if (!r) return
      if (!loadedRef.current) { pendingRoutineRef.current = r; return }
      startRoutine(r)
    }
    window.addEventListener('iron-routines-changed', onChanged)
    window.addEventListener('iron-start-routine', onStart)
    return () => {
      window.removeEventListener('iron-routines-changed', onChanged)
      window.removeEventListener('iron-start-routine', onStart)
    }
  })

  // 入力内容を常に下書きとしてlocalStorageへ退避する。
  // iOSはバックグラウンドのアプリを頻繁にkillするため、手動SAVE頼みだと記録が消える。
  useEffect(() => {
    if (!user || !loadedRef.current) return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        if (exercises.length > 0) {
          localStorage.setItem(draftKey(user.id), JSON.stringify({ exercises, routine: activeRoutine, ts: Date.now() }))
        } else {
          localStorage.removeItem(draftKey(user.id))
        }
      } catch { /* ストレージ不可でも入力は継続できる */ }
    }, 400)
    return () => clearTimeout(draftTimerRef.current)
  }, [exercises, activeRoutine, user])

  async function loadRoutines() {
    setRoutines(await listRoutines())
  }

  async function startRoutine(routine) {
    const hasInput = exercises.some(ex => ex.sets.some(s => s.done || (s.weight !== '' && s.weight !== undefined)))
    if (hasInput && !window.confirm(`今日の入力を「${routine.name}」の内容で置き換えますか？`)) return
    // 重量は前回の同種目から、回数はルーチンの目標回数で埋める
    const weights = await computeLastWeights()
    const loaded = routine.exercises.map(ex => ({
      id: genId(),
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({
        weight: weights[ex.name]?.weight ?? '',
        reps: String(ex.reps),
        done: false,
      })),
    }))
    hapticImpact()
    setExercises(loaded)
    setActiveRoutine({ id: routine.id, name: routine.name })
    if (loaded.length > 0) setExpandedId(loaded[0].id)
  }

  async function loadUserExercises() {
    setUserExercises(await listExercises())
  }

  async function loadTodayPlan() {
    const plan = await getPendingPlan(localDateStr())
    if (plan) setPlannedSession(plan)
  }

  async function loadLastWeights() {
    setLastWeights(await computeLastWeights())
  }

  async function loadTodaySession() {
    const data = await getSessionByDate(localDateStr())

    // 未保存の下書きがあればそちらを優先（保存成功時に消しているので、存在＝未保存変更）
    let draft = null
    try {
      const raw = localStorage.getItem(draftKey(user.id))
      if (raw) draft = JSON.parse(raw)
    } catch { /* 壊れた下書きは無視 */ }

    if (draft?.exercises?.length) {
      const maxId = Math.max(0, ...draft.exercises.map(e => e.id || 0))
      nextId = maxId + 1
      setExercises(draft.exercises)
      setExpandedId(draft.exercises[0].id)
      if (draft.routine?.id) setActiveRoutine(draft.routine)
    } else if (data) {
      const loaded = (data.exercises || []).map((ex, i) => ({
        ...ex,
        id: i + 1,
        sets: (ex.sets || []).map(s => ({ ...s, done: s.done ?? false })),
      }))
      nextId = loaded.length + 1
      setExercises(loaded)
      if (loaded.length > 0) setExpandedId(loaded[0].id)
    }
    loadedRef.current = true
    if (pendingRoutineRef.current) {
      const r = pendingRoutineRef.current
      pendingRoutineRef.current = null
      startRoutine(r)
    }
  }

  function addExercise(name) {
    const id = genId()
    // 前回の重量・回数があれば初期値としてプリセット（ゼロからホイールを回さなくて済む）
    const last = lastWeights[name]
    const newEx = { id, name, sets: [{ weight: last?.weight ?? '', reps: last?.reps ?? '', done: false }] }
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
    hapticImpact()
    setExercises(prev => prev.map(ex =>
      ex.id !== exId ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, done: !s.done } : s),
      }
    ))
  }

  function removeSet(exId, setIdx) {
    setExercises(prev => prev.map(ex =>
      ex.id !== exId ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
    ))
  }

  function removeExercise(exId) {
    const ex = exercises.find(e => e.id === exId)
    const hasInput = ex && ex.sets.some(s => s.weight !== '' || s.done)
    if (hasInput && !window.confirm(`「${ex.name}」を今日の記録から削除しますか？`)) return
    setExercises(prev => prev.filter(e => e.id !== exId))
  }

  function loadPlan() {
    const loaded = (plannedSession.exercises || []).map(ex => ({
      ...ex,
      id: genId(),
      sets: (ex.sets || []).map(s => ({ ...s, done: false })),
    }))
    setExercises(loaded)
    setActiveRoutine(null)
    if (loaded.length > 0) setExpandedId(loaded[0].id)
  }

  // 全種目を消したらルーチン紐付けも外す（空のまま保存して順番が進むのを防ぐ）
  useEffect(() => {
    if (exercises.length === 0 && activeRoutine) setActiveRoutine(null)
  }, [exercises, activeRoutine])

  async function saveSession() {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      // v2: 端末内保存（同一日付は上書き）。ネットワーク不要なので即時・確実
      const session = await upsertSession({
        date: localDateStr(),
        exercises: exercises.map(({ id: _id, ...ex }) => ex),
      })

      if (plannedSession && session?.id) {
        await markPlanDone(plannedSession.id, session.id)
        setPlannedSession(null)
      }

      // ルーチンの前回実施日を更新（一覧の「前回◯/◯」表示用）
      if (activeRoutine?.id) {
        await markRoutineUsed(activeRoutine.id)
        loadRoutines()
      }

      // 保存成功 → 下書きを破棄し、履歴タブへ更新を通知
      try { localStorage.removeItem(draftKey(user.id)) } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent('iron-session-saved'))
      hapticSuccess()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ストレージ書き込み失敗（容量等）。下書きは残っている
      hapticError()
      setSaveError('保存に失敗しました（入力は下書きとして保持されています）')
      setTimeout(() => setSaveError(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  // ピッカー初期値: 未入力セットは前回トレーニングの同種目の重量をプリセット
  const pickerEx = picker ? exercises.find(e => e.id === picker.exId) : null
  const pickerSet = pickerEx?.sets[picker?.setIdx]
  const pickerInitial = pickerSet && (pickerSet.weight !== '' && pickerSet.weight !== undefined)
    ? pickerSet
    : (pickerEx && lastWeights[pickerEx.name]) || pickerSet

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <VolumeHeader exercises={exercises} onSave={saveSession} saving={saving} saved={saved} />

      {saveError && (
        <div style={{
          margin: '12px 14px 0', padding: '10px 14px',
          background: 'var(--err-bg)', border: '1px solid var(--err-border)',
          color: 'var(--err-text)', fontSize: 12, lineHeight: 1.5,
        }}>{saveError}</div>
      )}

      {/* 常時コメント帯は廃止（起動時のWelcomeModalに集約。閉じた後は記録に集中） */}
      {plannedSession && (
        <PlanBanner plan={plannedSession} onLoad={loadPlan} />
      )}

      <div style={{ padding: '14px 14px 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '0 4px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 2, color: 'var(--text-2nd)', flexShrink: 0 }}>
              TODAY'S WORKOUT
            </div>
            {activeRoutine && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FF6A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeRoutine.name}
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
            {exercises.length} exercises
          </div>
        </div>

        {exercises.length === 0 && (
          <RoutinePicker
            routines={routines}
            onStart={startRoutine}
            onCreate={() => {
              navigate('/settings')
              window.dispatchEvent(new CustomEvent('iron-open-routines'))
            }}
          />
        )}

        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            expanded={expandedId === ex.id}
            onToggleExpand={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
            onOpenPicker={(exId, setIdx) => setPicker({ exId, setIdx })}
            onAddSet={addSet}
            onToggleDone={toggleDone}
            onRemoveSet={removeSet}
            onRemove={removeExercise}
          />
        ))}

        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            width: '100%', marginTop: 4,
            background: '#FF6A1A', border: 'none', color: 'var(--on-accent)',
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
          exerciseName={pickerEx?.name || ''}
          setIdx={picker.setIdx}
          initial={pickerInitial}
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
