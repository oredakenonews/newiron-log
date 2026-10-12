import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import { CoachProvider } from '../../lib/coachContext'
import RecordTab from '../record/RecordTab'
import HistoryTab from '../history/HistoryTab'
import AITab from '../ai/AITab'
import SettingsTab from '../settings/SettingsTab'
import WelcomeModal from '../shared/WelcomeModal'
import { useKeyboardOpen } from '../../lib/useKeyboardOpen'

const TAB_STYLE = {
  position: 'absolute', inset: 0,
  overflowY: 'auto',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
}

const AI_TAB_STYLE = {
  position: 'absolute',
  top: 0, left: 0, right: 0,
  bottom: 'calc(env(safe-area-inset-bottom) + 64px)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}

export default function Layout() {
  const { pathname } = useLocation()
  // 入力中はタブバーを隠し、その分を本文に回す（キーボードでの圧迫を緩和）
  const keyboardOpen = useKeyboardOpen()
  const tabStyle = keyboardOpen ? { ...TAB_STYLE, paddingBottom: 12 } : TAB_STYLE
  const aiTabStyle = keyboardOpen ? { ...AI_TAB_STYLE, bottom: 0 } : AI_TAB_STYLE

  return (
    <CoachProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
        <TopBar />
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ ...tabStyle, display: pathname === '/'         ? 'block' : 'none' }}><RecordTab /></div>
          <div style={{ ...tabStyle, display: pathname === '/history'  ? 'block' : 'none' }}><HistoryTab /></div>
          <div style={{ ...aiTabStyle, display: pathname === '/ai'     ? 'flex'  : 'none' }}><AITab keyboardOpen={keyboardOpen} /></div>
          <div style={{ ...tabStyle, display: pathname === '/settings' ? 'block' : 'none' }}><SettingsTab /></div>
        </main>
        {!keyboardOpen && <BottomNav />}
        <WelcomeModal />
      </div>
    </CoachProvider>
  )
}
