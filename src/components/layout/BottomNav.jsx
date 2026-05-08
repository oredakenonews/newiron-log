import { NavLink } from 'react-router-dom'

const tabs = [
  {
    path: '/',
    label: '記録',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#f97316' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16M6 12h12M3 6h3M18 6h3M3 18h3M18 18h3" />
      </svg>
    ),
  },
  {
    path: '/history',
    label: '履歴',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#f97316' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    path: '/ai',
    label: 'AI',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#f97316' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M9 8V6a3 3 0 016 0v2" />
        <circle cx="9" cy="14" r="1" fill={active ? '#f97316' : '#888'} />
        <circle cx="15" cy="14" r="1" fill={active ? '#f97316' : '#888'} />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: '設定',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#f97316' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex border-t"
      style={{ background: '#0f0f0f', borderColor: '#2a2a2a', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
        >
          {({ isActive }) => (
            <>
              {tab.icon(isActive)}
              <span className="text-[10px]" style={{ color: isActive ? '#f97316' : '#888' }}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
