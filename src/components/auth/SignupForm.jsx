import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で設定してください')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('登録に失敗しました。もう一度お試しください。')
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm">
        <h1 className="font-bebas text-5xl text-center mb-2" style={{ color: '#f97316' }}>IRON LOG</h1>
        <p className="text-center text-sm mb-10" style={{ color: '#888' }}>アカウントを作成する</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#888' }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border"
              style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
              placeholder="example@mail.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#888' }}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border"
              style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#888' }}>パスワード（確認）</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border"
              style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: '#f97316' }}
          >
            {loading ? '登録中...' : '新規登録'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm" style={{ color: '#888' }}>
            すでにアカウントをお持ちの方
          </Link>
        </div>
      </div>
    </div>
  )
}
