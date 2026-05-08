import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) {
      setError('送信に失敗しました。メールアドレスをご確認ください。')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm">
        <h1 className="font-bebas text-5xl text-center mb-2" style={{ color: '#f97316' }}>IRON LOG</h1>
        <p className="text-center text-sm mb-10" style={{ color: '#888' }}>パスワードのリセット</p>

        {sent ? (
          <div className="text-center">
            <p className="text-sm mb-6" style={{ color: '#f5f5f5' }}>
              パスワードリセット用のメールを送信しました。<br />
              メールをご確認ください。
            </p>
            <Link to="/login" className="text-sm" style={{ color: '#f97316' }}>
              ログインに戻る
            </Link>
          </div>
        ) : (
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

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: '#f97316' }}
            >
              {loading ? '送信中...' : 'リセットメールを送信'}
            </button>

            <div className="text-center mt-4">
              <Link to="/login" className="text-sm" style={{ color: '#888' }}>
                ログインに戻る
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
