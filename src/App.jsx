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
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <p className="font-bebas text-4xl mb-2" style={{ color: '#f97316' }}>IRON LOG</p>
          <p className="text-xs" style={{ color: '#888' }}>Loading...</p>
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
