import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import { CoachProvider } from '../../lib/coachContext'

export default function Layout() {
  return (
    <CoachProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#0B0D10' }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </CoachProvider>
  )
}
