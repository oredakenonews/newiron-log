import { NavLink } from 'react-router-dom'

const TABS = [
  {
    path: '/',
    label: '記録',
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square">
        <rect x="1.5" y="8" width="3" height="8" />
        <rect x="4.5" y="6" width="2.5" height="12" />
        <path d="M7 12h10" />
        <rect x="17" y="6" width="2.5" height="12" />
        <rect x="19.5" y="8" width="3" height="8" />
      </svg>
    ),
  },
  {
    path: '/history',
    label: '履歴',
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 6-7" />
      </svg>
    ),
  },
  {
    path: '/ai',
    label: 'AI',
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square">
        <rect x="4" y="7" width="16" height="13" />
        <path d="M12 4v3M9 12v2M15 12v2M8 17h8" />
        <path d="M2 11v4M22 11v4" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: '設定',
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="square">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: '#0B0D10', borderTop: '1px solid #1A1F28',
      paddingBottom: 'env(safe-area-inset-bottom)',
      display: 'flex', height: 'calc(64px + env(safe-area-inset-bottom))',
      zIndex: 50,
    }}>
      {TABS.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          style={{ flex: 1, textDecoration: 'none', position: 'relative' }}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%',
                  height: 2, background: '#FF6A1A',
                }} />
              )}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%',
                gap: 4, paddingTop: 8,
                color: isActive ? '#FF6A1A' : '#5A6477',
              }}>
                {tab.icon(isActive ? '#FF6A1A' : '#5A6477')}
                <span style={{
                  fontSize: 10,
                  fontFamily: '"Noto Sans JP", system-ui',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#FF6A1A' : '#5A6477',
                }}>{tab.label}</span>
              </div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
