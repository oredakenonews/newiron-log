import { useState, useEffect, useRef } from 'react'

export const ITEM_H = 36
const VISIBLE = 3

export const WEIGHT_VALUES = (() => {
  const out = []
  for (let v = 0; v <= 60; v += 0.5) out.push(Number(v.toFixed(1)))
  for (let v = 62.5; v <= 300; v += 2.5) out.push(Number(v.toFixed(1)))
  return out
})()
export const REP_VALUES = Array.from({ length: 50 }, (_, i) => i + 1)

export function nearestWeight(w) {
  const n = parseFloat(w) || 0
  let best = WEIGHT_VALUES[0], bestD = Infinity
  for (const v of WEIGHT_VALUES) {
    const d = Math.abs(v - n)
    if (d < bestD) { best = v; bestD = d }
  }
  return best
}

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

export default function WheelPickerSheet({ open, exerciseName, setIdx, initial, onCancel, onConfirm }) {
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
