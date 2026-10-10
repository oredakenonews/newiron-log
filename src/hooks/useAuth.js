import { createContext, useContext, useState, useEffect, useCallback, useMemo, createElement } from 'react'
import { getProfile, updateProfile as dbUpdateProfile } from '../lib/localdb'

// v2: ローカルファースト化によりSupabase認証を廃止。
// 旧useAuthとAPI互換（user / profile / loading / refreshProfile）を保ち、
// 追加で saveProfile(patch) を提供する。userは常にローカル固定ユーザー。
const AuthContext = createContext(null)

const LOCAL_USER = { id: 'local' }

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getProfile()
      .then(p => { if (alive) setProfile(p) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const refreshProfile = useCallback(async () => {
    setProfile(await getProfile())
  }, [])

  const saveProfile = useCallback(async (patch) => {
    const next = await dbUpdateProfile(patch)
    setProfile(next)
    return next
  }, [])

  const value = useMemo(
    () => ({ user: LOCAL_USER, profile, loading, refreshProfile, saveProfile }),
    [profile, loading, refreshProfile, saveProfile]
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
