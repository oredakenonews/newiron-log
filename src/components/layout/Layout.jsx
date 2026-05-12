import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import { CoachProvider } from '../../lib/coachContext'
import RecordTab from '../record/RecordTab'
import HistoryTab from '../history/HistoryTab'
import AITab from '../ai/AITab'
import SettingsTab from '../settings/SettingsTab'

const TAB_STYLE = {
  position: 'absolute', inset: 0,
  overflowY: 'auto',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
}

const AI_TAB_STYLE = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <CoachProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0B0D10' }}>
        <TopBar />
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ ...TAB_STYLE, display: pathname === '/'         ? 'block' : 'none' }}><RecordTab /></div>
          <div style={{ ...TAB_STYLE, display: pathname === '/history'  ? 'block' : 'none' }}><HistoryTab /></div>
          <div style={{ ...AI_TAB_STYLE, display: pathname === '/ai'    ? 'flex'  : 'none' }}><AITab /></div>
          <div style={{ ...TAB_STYLE, display: pathname === '/settings' ? 'block' : 'none' }}><SettingsTab /></div>
        </main>
        <BottomNav />
      </div>
    </CoachProvider>
  )
}
