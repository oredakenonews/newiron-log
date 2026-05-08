import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginForm from './components/auth/LoginForm'
import SignupForm from './components/auth/SignupForm'
import ResetPasswordForm from './components/auth/ResetPasswordForm'
import Layout from './components/layout/Layout'
import RecordTab from './components/record/RecordTab'
import HistoryTab from './components/history/HistoryTab'
import AITab from './components/ai/AITab'
import SettingsTab from './components/settings/SettingsTab'
import OnboardingChat from './components/onboarding/OnboardingChat'

function AuthGuard({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0D10' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, background: '#FF6A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: '#0B0D10' }}>IL</div>
            <p style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 28, color: '#fff', letterSpacing: 1, margin: 0 }}>IRON LOG</p>
          </div>
          <p style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477', margin: 0 }}>LOADING...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_done) return <Navigate to="/onboarding" replace />

  return children
}

function GuestGuard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 認証画面 */}
        <Route path="/login" element={<GuestGuard><LoginForm /></GuestGuard>} />
        <Route path="/signup" element={<GuestGuard><SignupForm /></GuestGuard>} />
        <Route path="/reset-password" element={<GuestGuard><ResetPasswordForm /></GuestGuard>} />

        {/* オンボーディング */}
        <Route path="/onboarding" element={
          <OnboardingGuard><OnboardingChat /></OnboardingGuard>
        } />

        {/* メイン画面 */}
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route path="/" element={<RecordTab />} />
          <Route path="/history" element={<HistoryTab />} />
          <Route path="/ai" element={<AITab />} />
          <Route path="/settings" element={<SettingsTab />} />
        </Route>

        {/* フォールバック */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function OnboardingGuard({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile?.onboarding_done) return <Navigate to="/" replace />
  return children
}
