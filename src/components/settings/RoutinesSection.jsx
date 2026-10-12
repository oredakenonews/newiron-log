import { useState, useEffect } from 'react'
import { getCategory } from '../../lib/categories'
import { hapticSuccess, hapticError } from '../../lib/haptics'
import { listRoutines, saveRoutine, deleteRoutine, listExercises, MAX_ROUTINES } from '../../lib/localdb'
import { ROUTINE_TEMPLATES } from '../../lib/routineTemplates'
import AddExerciseSheet from '../shared/AddExerciseSheet'

function notifyChanged() {
  window.dispatchEvent(new CustomEvent('iron-routines-changed'))
}

const labelStyle = { fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 8 }

function Stepper({ value, min, max, unit, onChange }) {
  const btn = {
    width: 30, height: 30, flexShrink: 0,
    background: 'var(--bg-deep)', border: '1px solid var(--border)',
    color: 'var(--text-sub)', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={btn} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <div style={{ minWidth: 40, textAlign: 'center', fontFamily: 'Oswald', fontWeight: 700, fontSize: 17, color: 'var(--text-strong)' }}>
        {value}<span style={{ fontFamily: '"Noto Sans JP", system-ui', fontSize: 10, color: 'var(--muted)', marginLeft: 2 }}>{unit}</span>
      </div>
      <button style={btn} onClick={() => onChange(Math.min(max, value + 1))}>＋</button>
    </div>
  )
}

function RoutineEditor({ initial, userExercises, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(initial.name || '')
  const [exercises, setExercises] = useState(initial.exercises || [])
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')

  function updateEx(idx, patch) {
    setExercises(prev => prev.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)))
  }

  function moveEx(idx, dir) {
    setExercises(prev => {
      const to = idx + dir
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[to]] = [next[to], next[idx]]
      return next
    })
  }

  function handleSave() {
    if (!name.trim()) { setError('ルーチン名を入力してください'); return }
    if (exercises.length === 0) { setError('種目を1つ以上追加してください'); return }
    onSave({ id: initial.id, name, exercises })
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid #FF6A1A', padding: 14, marginBottom: 14 }}>
      <div style={labelStyle}>ルーチン名</div>
      <input
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        placeholder="例: 上半身"
        maxLength={20}
        style={{
          width: '100%', padding: '10px 14px', marginBottom: 16,
          background: 'var(--bg-deep)', border: '1px solid var(--border)',
          color: 'var(--text)', outline: 'none', fontFamily: '"Noto Sans JP", system-ui',
        }}
      />

      <div style={labelStyle}>種目（重量は記録時に前回の値が自動で入ります）</div>
      {exercises.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>まだ種目がありません</p>
      )}
      {exercises.map((ex, i) => (
        <div key={`${ex.name}-${i}`} style={{ borderBottom: '1px solid var(--border2)', padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5, color: '#FF6A1A' }}>{getCategory(ex.name)}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
            </div>
            <button onClick={() => moveEx(i, -1)} disabled={i === 0} aria-label="上へ"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4, cursor: 'pointer', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
            <button onClick={() => moveEx(i, 1)} disabled={i === exercises.length - 1} aria-label="下へ"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4, cursor: 'pointer', opacity: i === exercises.length - 1 ? 0.3 : 1 }}>▼</button>
            <button onClick={() => setExercises(prev => prev.filter((_, j) => j !== i))} aria-label="削除"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Stepper value={ex.sets} min={1} max={10} unit="セット" onChange={v => updateEx(i, { sets: v })} />
            <Stepper value={ex.reps} min={1} max={50} unit="回" onChange={v => updateEx(i, { reps: v })} />
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowAdd(true)}
        style={{
          width: '100%', marginTop: 12, padding: '11px 0',
          background: 'transparent', border: '1px dashed var(--border-dash)',
          color: 'var(--text-2nd)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >+ 種目を追加</button>

      {error && <p style={{ color: 'var(--err-text)', fontSize: 12, margin: '10px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text-2nd)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >キャンセル</button>
        <button
          onClick={handleSave}
          style={{
            flex: 2, padding: '12px 0', background: '#FF6A1A', border: 'none',
            color: 'var(--on-accent)', fontFamily: 'Oswald', fontWeight: 700,
            fontSize: 15, letterSpacing: 1.5, cursor: 'pointer',
          }}
        >保存する</button>
      </div>
      {initial.id && (
        <button
          onClick={onDelete}
          style={{
            width: '100%', marginTop: 10, padding: '8px 0', background: 'none', border: 'none',
            color: 'var(--err-text)', fontSize: 12, cursor: 'pointer',
          }}
        >このルーチンを削除</button>
      )}

      <AddExerciseSheet
        open={showAdd}
        userExercises={userExercises}
        onClose={() => setShowAdd(false)}
        onAdd={exName => setExercises(prev => [...prev, { name: exName, sets: 3, reps: 10 }])}
      />
    </div>
  )
}

export default function RoutinesSection() {
  const [routines, setRoutines] = useState([])
  const [userExercises, setUserExercises] = useState([])
  const [editing, setEditing] = useState(null)

  async function reload() {
    setRoutines(await listRoutines())
  }

  useEffect(() => {
    reload()
    listExercises().then(setUserExercises)
  }, [])

  async function handleSave(data) {
    try {
      await saveRoutine(data)
      hapticSuccess()
      setEditing(null)
      await reload()
      notifyChanged()
    } catch {
      hapticError()
      window.alert('保存できませんでした。')
    }
  }

  async function handleDelete() {
    if (!editing?.id) return
    if (!window.confirm(`ルーチン「${editing.name}」を削除しますか？`)) return
    await deleteRoutine(editing.id)
    setEditing(null)
    await reload()
    notifyChanged()
  }

  async function createFromTemplates() {
    for (const t of ROUTINE_TEMPLATES) await saveRoutine(t)
    hapticSuccess()
    await reload()
    notifyChanged()
  }

  const canAdd = routines.length < MAX_ROUTINES

  return (
    <div style={{ padding: 14 }}>
      <p style={{ fontSize: 12, color: 'var(--text-2nd)', lineHeight: 1.7, margin: '0 0 14px' }}>
        よくやるメニューを登録しておくと、記録タブから1タップで読み込めます。登録した順に「次はこのルーチン」と順番に提案します（最大{MAX_ROUTINES}つ）。
      </p>

      {editing && !editing.id && (
        <RoutineEditor
          key="new"
          initial={editing}
          userExercises={userExercises}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {routines.map((r, i) => (
        editing?.id === r.id ? (
          <RoutineEditor
            key={r.id}
            initial={editing}
            userExercises={userExercises}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            onDelete={handleDelete}
          />
        ) : (
          <div
            key={r.id}
            onClick={() => setEditing({ id: r.id, name: r.name, exercises: r.exercises })}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', marginBottom: 8,
              background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 20, color: '#FF6A1A', width: 22, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2nd)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.exercises.length}種目 · {r.exercises.map(ex => ex.name).join('、')}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>編集 ›</div>
          </div>
        )
      ))}

      {routines.length === 0 && !editing && (
        <button
          onClick={createFromTemplates}
          style={{
            width: '100%', padding: '14px 0', marginBottom: 8,
            background: '#FF6A1A', border: 'none', color: 'var(--on-accent)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >テンプレートで3つ作成（上半身・下半身・全身）</button>
      )}

      {!editing && (
        <button
          onClick={() => setEditing({ name: '', exercises: [] })}
          disabled={!canAdd}
          style={{
            width: '100%', padding: '13px 0',
            background: 'transparent', border: '1px dashed var(--border-dash)',
            color: canAdd ? 'var(--text-2nd)' : 'var(--muted)',
            fontSize: 13, fontWeight: 700, cursor: canAdd ? 'pointer' : 'default',
            opacity: canAdd ? 1 : 0.6,
          }}
        >{canAdd ? `+ ルーチンを追加（${routines.length}/${MAX_ROUTINES}）` : `ルーチンは${MAX_ROUTINES}つまでです`}</button>
      )}
    </div>
  )
}
