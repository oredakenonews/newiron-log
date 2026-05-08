import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const ITEM_H = 48

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatDateJP(dateStr) {
  const d = new Date(dateStr)
  const week = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week[d.getDay()]}）`
}

function makeWeightValues(weightMin = 0) {
  return Array.from({ length: 201 - weightMin }, (_, i) => weightMin + i)
}

function makeRepsValues(repsStep = 1, repsMax = 30) {
  const values = []
  for (let v = repsStep; v <= repsMax; v += repsStep) values.push(v)
  return values
}

function WheelPicker({ values, selected, onChange }) {
  const containerRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const idx = values.indexOf(selected)
    if (containerRef.current) {
      containerRef.current.scrollTop = Math.max(0, idx) * ITEM_H
    }
  }, [])

  function onScroll() {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!containerRef.current) return
      const idx = Math.round(containerRef.current.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(idx, values.length - 1))
      containerRef.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
      onChange(values[clamped])
    }, 80)
  }

  return (
    <div className="relative flex-1" style={{ height: ITEM_H * 5, overflow: 'hidden' }}>
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none" style={{ height: ITEM_H * 2, background: 'linear-gradient(to bottom, #1a1a1a 20%, transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: ITEM_H * 2, background: 'linear-gradient(to top, #1a1a1a 20%, transparent)' }} />
      <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: ITEM_H * 2, height: ITEM_H, borderTop: '1px solid #f97316', borderBottom: '1px solid #f97316' }} />
      <div
        ref={containerRef}
        onScroll={onScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingTop: ITEM_H * 2,
          paddingBottom: ITEM_H * 2,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {values.map((v, i) => (
          <div
            key={i}
            style={{
              height: ITEM_H,
              scrollSnapAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              fontFamily: "'Bebas Neue', sans-serif",
              color: '#f5f5f5',
            }}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  )
}

function SetPickerModal({ weightValues, repsValues, weight, reps, onConfirm, onClose }) {
  const initW = weight !== '' && !isNaN(Number(weight)) ? Number(weight) : weightValues[0]
  const initR = reps !== '' && !isNaN(Number(reps)) ? Number(reps) : repsValues[0]
  const [w, setW] = useState(weightValues.includes(initW) ? initW : weightValues[0])
  const [r, setR] = useState(repsValues.includes(initR) ? initR : repsValues[0])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-[430px] rounded-t-3xl px-6 pt-5 pb-7" style={{ background: '#1a1a1a' }}>
        <div className="flex items-center gap-3">
          <WheelPicker values={weightValues} selected={w} onChange={setW} />
          <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1" style={{ color: '#666' }}>
            <span className="text-xs">kg</span>
            <span>×</span>
          </div>
          <WheelPicker values={repsValues} selected={r} onChange={setR} />
          <span className="flex-shrink-0 text-xs self-center" style={{ color: '#666' }}>回</span>
        </div>
        <button
          onClick={() => onConfirm(w, r)}
          className="w-full mt-5 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: '#f97316' }}
        >
          確定
        </button>
        <button onClick={onClose} className="w-full mt-2 py-2 text-sm" style={{ color: '#666' }}>
          キャンセル
        </button>
      </div>
    </div>
  )
}

export default function RecordTab() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [userExercises, setUserExercises] = useState([])
  const [cardio, setCardio] = useState([])
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [showCardioForm, setShowCardioForm] = useState(false)
  const [pickerTarget, setPickerTarget] = useState(null)

  useEffect(() => {
    if (user) {
      loadTodaySession()
      loadUserExercises()
    }
  }, [user])

  async function loadUserExercises() {
    const { data } = await supabase
      .from('user_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('order')
    setUserExercises(data || [])
  }

  async function loadTodaySession() {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today())
      .single()
    if (data) {
      setExercises(data.exercises || [])
      setCardio(data.cardio || [])
      setMemo(data.memo || '')
    }
  }

  function addExercise(exName) {
    setExercises(prev => [...prev, { name: exName, sets: [{ weight: '', reps: '' }] }])
    setShowExercisePicker(false)
  }

  function addSet(exIdx) {
    setExercises(prev => {
      const updated = [...prev]
      updated[exIdx] = {
        ...updated[exIdx],
        sets: [...updated[exIdx].sets, { weight: '', reps: '' }],
      }
      return updated
    })
  }

  function updateSet(exIdx, setIdx, weight, reps) {
    setExercises(prev =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, j) =>
            j === setIdx ? { weight: String(weight), reps: String(reps) } : s
          ),
        }
      )
    )
  }

  function removeExercise(exIdx) {
    setExercises(prev => prev.filter((_, i) => i !== exIdx))
  }

  function addCardio(type, minutes) {
    setCardio(prev => [...prev, { type, minutes }])
    setShowCardioForm(false)
  }

  function getExerciseConfig(name) {
    const ex = userExercises.find(e => e.name === name)
    return {
      weightValues: makeWeightValues(ex?.weight_min ?? 0),
      repsValues: makeRepsValues(ex?.reps_step ?? 1, ex?.reps_max ?? 30),
    }
  }

  async function saveSession() {
    setSaving(true)
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today())
      .single()

    const payload = { user_id: user.id, date: today(), exercises, cardio, memo }

    if (existing) {
      await supabase.from('workout_sessions').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('workout_sessions').insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeTarget = pickerTarget
    ? {
        set: exercises[pickerTarget.exIdx]?.sets[pickerTarget.setIdx],
        config: getExerciseConfig(exercises[pickerTarget.exIdx]?.name),
      }
    : null

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bebas text-3xl" style={{ color: '#f97316' }}>TODAY</h1>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>{formatDateJP(today())}</p>
        </div>
        <button
          onClick={saveSession}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: '#f97316' }}
        >
          {saving ? '保存中...' : saved ? '保存済み ✓' : '保存'}
        </button>
      </div>

      <div className="space-y-4 mb-4">
        {exercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">{ex.name}</span>
              <button onClick={() => removeExercise(exIdx)} style={{ color: '#888' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="flex items-center gap-2">
                  <span className="text-xs w-5 flex-shrink-0 text-right" style={{ color: '#555' }}>{setIdx + 1}</span>
                  <button
                    onClick={() => setPickerTarget({ exIdx, setIdx })}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                    style={{ background: '#0f0f0f', border: '1px solid #2a2a2a' }}
                  >
                    <span className="font-bebas text-xl" style={{ color: set.weight !== '' ? '#f5f5f5' : '#444', minWidth: '2.5ch', textAlign: 'right' }}>
                      {set.weight !== '' ? set.weight : '—'}
                    </span>
                    <span className="text-xs" style={{ color: '#666' }}>kg</span>
                    <span style={{ color: '#444' }}>×</span>
                    <span className="font-bebas text-xl" style={{ color: set.reps !== '' ? '#f5f5f5' : '#444', minWidth: '2ch', textAlign: 'right' }}>
                      {set.reps !== '' ? set.reps : '—'}
                    </span>
                    <span className="text-xs" style={{ color: '#666' }}>回</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(exIdx)}
              className="mt-3 w-full py-1.5 rounded-lg text-xs"
              style={{ border: '1px dashed #2a2a2a', color: '#888' }}
            >
              + セット追加
            </button>
          </div>
        ))}
      </div>

      {cardio.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <h3 className="text-sm font-bold mb-2">有酸素</h3>
          {cardio.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span>{c.type}</span>
              <span style={{ color: '#888' }}>{c.minutes} 分</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 mb-4">
        <button
          onClick={() => setShowExercisePicker(true)}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: '#1a1a1a', border: '1px solid #f97316', color: '#f97316' }}
        >
          + 種目を追加
        </button>
        <button
          onClick={() => setShowCardioForm(true)}
          className="w-full py-3 rounded-xl text-sm"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888' }}
        >
          + 有酸素を追加
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <label className="block text-sm font-bold mb-2">今日の意図</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="今日のトレーニングで意識することを書いておこう"
          rows={3}
          className="w-full text-sm outline-none resize-none"
          style={{ background: 'transparent', color: '#f5f5f5' }}
        />
      </div>

      {showExercisePicker && (
        <ExercisePicker
          userExercises={userExercises}
          onSelect={addExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      )}

      {showCardioForm && (
        <CardioForm
          onAdd={addCardio}
          onClose={() => setShowCardioForm(false)}
        />
      )}

      {pickerTarget && activeTarget?.set && (
        <SetPickerModal
          weightValues={activeTarget.config.weightValues}
          repsValues={activeTarget.config.repsValues}
          weight={activeTarget.set.weight}
          reps={activeTarget.set.reps}
          onConfirm={(w, r) => {
            updateSet(pickerTarget.exIdx, pickerTarget.setIdx, w, r)
            setPickerTarget(null)
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  )
}

function ExercisePicker({ userExercises, onSelect, onClose }) {
  const [custom, setCustom] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[430px] rounded-t-3xl p-6" style={{ background: '#1a1a1a' }}>
        <h3 className="font-bold mb-4">種目を選択</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {userExercises.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: '#888' }}>
              設定タブから種目を追加してください
            </p>
          )}
          {userExercises.map(ex => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex.name)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm"
              style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
            >
              {ex.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && custom.trim() && onSelect(custom.trim())}
            placeholder="種目名を直接入力"
            className="flex-1 px-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
          />
          <button
            onClick={() => custom.trim() && onSelect(custom.trim())}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#f97316' }}
          >
            追加
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 text-sm" style={{ color: '#888' }}>
          キャンセル
        </button>
      </div>
    </div>
  )
}

function CardioForm({ onAdd, onClose }) {
  const [type, setType] = useState('ランニング')
  const [minutes, setMinutes] = useState('')
  const types = ['ランニング', 'ウォーキング', '自転車', '水泳', 'ロウイング', 'その他']

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[430px] rounded-t-3xl p-6" style={{ background: '#1a1a1a' }}>
        <h3 className="font-bold mb-4">有酸素を追加</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="px-3 py-1.5 rounded-full text-sm"
              style={{
                background: type === t ? '#f97316' : '#0f0f0f',
                color: type === t ? '#fff' : '#888',
                border: '1px solid #2a2a2a',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="number"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            placeholder="分数"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none text-center"
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
          />
          <span className="text-sm" style={{ color: '#888' }}>分</span>
        </div>
        <button
          onClick={() => minutes && onAdd(type, parseInt(minutes))}
          className="w-full py-3 rounded-xl text-sm font-bold text-white mb-2"
          style={{ background: '#f97316' }}
        >
          追加
        </button>
        <button onClick={onClose} className="w-full py-2 text-sm" style={{ color: '#888' }}>
          キャンセル
        </button>
      </div>
    </div>
  )
}
