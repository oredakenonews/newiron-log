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
      background: '#0B0D10',
      borderBottom: '1px solid #1A1F28',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, background: '#FF6A1A', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: '#0B0D10',
          letterSpacing: -0.5,
        }}>IL</div>
        <div>
          <div style={{
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: '#fff',
            letterSpacing: 1, lineHeight: 1,
          }}>IRON LOG</div>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 2,
            color: '#5A6477', marginTop: 2,
          }}>{en}</div>
        </div>
      </div>
      <div style={{
        fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
        color: '#FF6A1A', padding: '4px 8px',
        border: '1px solid #2D1F12',
        background: 'rgba(255,106,26,0.08)',
      }}>FREE</div>
    </div>
  )
}
