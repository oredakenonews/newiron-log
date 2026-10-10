import { useLocation } from 'react-router-dom'

const TAB_INFO = {
  '/': 'LOG',
  '/history': 'HISTORY',
  '/ai': 'COACH',
  '/settings': 'SETTINGS',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const en = TAB_INFO[pathname] || 'LOG'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
      paddingBottom: 12, paddingLeft: 18, paddingRight: 18,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border2)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, background: '#FF6A1A', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: 'var(--on-accent)',
          letterSpacing: -0.5,
        }}>IL</div>
        <div>
          <div style={{
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)',
            letterSpacing: 1, lineHeight: 1,
          }}>IRON LOG</div>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 2,
            color: 'var(--muted)', marginTop: 2,
          }}>{en}</div>
        </div>
      </div>
      {/* プラン表記はフリーミアム実装時に再設計する（散在FBにより撤去） */}
    </div>
  )
}
