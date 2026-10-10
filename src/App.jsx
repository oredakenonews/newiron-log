import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import OnboardingChat from './components/onboarding/OnboardingChat'

// v2: ローカルファースト化により認証（ログイン/サインアップ）を廃止。
// 初回起動はオンボーディングへ、完了済みなら即メイン画面へ。
function Loading() {
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

function OnboardingGate({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!profile?.onboarding_done) return <Navigate to="/onboarding" replace />
  return children
}

function OnboardingGuard({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loading />
  if (profile?.onboarding_done) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* オンボーディング（初回のみ） */}
        <Route path="/onboarding" element={
          <OnboardingGuard><OnboardingChat /></OnboardingGuard>
        } />

        {/* メイン画面（全タブ常時マウント） */}
        <Route path="/*" element={<OnboardingGate><Layout /></OnboardingGate>} />
      </Routes>
    </BrowserRouter>
  )
}
