import { useState } from 'react'
import { getCategory } from '../../lib/categories'

export default function AddExerciseSheet({ open, userExercises, onClose, onAdd }) {
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
