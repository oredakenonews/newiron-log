import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, createElement } from 'react'
import { supabase } from '../lib/supabase'

// 認証状態＋プロフィールをアプリ全体で1つに共有するContext。
// 旧実装は各コンポーネントのuseAuth()が独立にgetSession+profile取得+購読を行っていたため、
// 重複フェッチとタブ間のプロフィール不整合（設定タブ保存でcoach_mode巻き戻り等）が発生していた。
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadedUserIdRef = useRef(null)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      setProfile(data ?? null)
      loadedUserIdRef.current = userId
    } catch {
      // ネットワークエラー時は既存のprofileを保持する
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // TOKEN_REFRESHED等のたびに再取得しない（ユーザーが変わった時のみ）
        if (loadedUserIdRef.current !== session.user.id) {
          fetchProfile(session.user.id)
        }
      } else {
        setProfile(null)
        loadedUserIdRef.current = null
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await fetchProfile(session.user.id)
    }
  }, [fetchProfile])

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile]
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
