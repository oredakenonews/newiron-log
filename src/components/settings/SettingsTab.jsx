import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const PURPOSES = [
  { value: 'muscle', label: '筋肥大' },
  { value: 'diet', label: 'ダイエット' },
  { value: 'strength', label: '筋力向上' },
  { value: 'health', label: '健康維持' },
  { value: 'sport', label: 'スポーツ強化' },
]

const TRAINERS = [
  { id: 'RYOTA', name: 'RYOTA', desc: '熱血系。厳しくも愛のある指導スタイル', img: '/gazou/ryota_bu.png' },
  { id: 'DAIKI', name: 'DAIKI', desc: '理論派。データと科学で最適解を示す', img: '/gazou/daiki_bu.png' },
  { id: 'YUKI', name: 'YUKI', desc: '穏やか系。寄り添いながら継続をサポート', img: '/gazou/yuki_bu.png' },
  { id: 'KENJI', name: 'KENJI', desc: 'ストイック系。限界突破を共に目指す', img: '/gazou/kenji_bu.png' },
  { id: 'NANA', name: 'NANA', desc: 'ポジティブ系。楽しさを大切にするスタイル', img: '/gazou/nana_bu.png' },
  { id: 'HANA', name: 'HANA', desc: '丁寧系。基礎を大切にした指導', img: '/gazou/hana_bu.png' },
  { id: 'RACHELL', name: 'RACHELL', desc: '国際派。世界基準のトレーニング理論', img: '/gazou/rachell_bu.png' },
  { id: 'TORU', name: 'TORU', desc: 'ベテラン系。長年の経験から的確なアドバイス', img: '/gazou/toru_bu.png' },
  { id: 'BILLY', name: 'BILLY', desc: 'エンタメ系。楽しく盛り上げながらトレーニング', img: '/gazou/billybu.png' },
]

export default function SettingsTab() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    height_cm: '',
    age: '',
    gender: '',
    current_weight_kg: '',
    goal_weight_kg: '',
    training_purpose: '',
    trainer_character: 'RYOTA',
  })
  const [exercises, setExercises] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [activeSection, setActiveSection] = useState('profile')

  useEffect(() => {
    if (profile) {
      setForm({
        height_cm: profile.height_cm || '',
        age: profile.age || '',
        gender: profile.gender || '',
        current_weight_kg: profile.current_weight_kg || '',
        goal_weight_kg: profile.goal_weight_kg || '',
        training_purpose: profile.training_purpose || '',
        trainer_character: profile.trainer_character || 'RYOTA',
      })
    }
  }, [profile])

  useEffect(() => {
    if (user) loadExercises()
  }, [user])

  async function loadExercises() {
    const { data } = await supabase
      .from('user_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('order')
    setExercises(data || [])
  }

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender || null,
      current_weight_kg: form.current_weight_kg ? parseFloat(form.current_weight_kg) : null,
      goal_weight_kg: form.goal_weight_kg ? parseFloat(form.goal_weight_kg) : null,
      training_purpose: form.training_purpose || null,
      trainer_character: form.trainer_character,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addExercise() {
    if (!newExName.trim()) return
    const { data } = await supabase.from('user_exercises').insert({
      user_id: user.id,
      name: newExName.trim(),
      order: exercises.length,
    }).select().single()
    if (data) setExercises(prev => [...prev, data])
    setNewExName('')
  }

  async function deleteExercise(id) {
    await supabase.from('user_exercises').delete().eq('id', id)
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="font-bebas text-3xl mb-6" style={{ color: '#f97316' }}>SETTINGS</h1>

      {/* セクション切替 */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'profile', label: 'プロフィール' },
          { id: 'trainer', label: 'トレーナー' },
          { id: 'exercises', label: '種目' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{
              background: activeSection === s.id ? '#f97316' : '#1a1a1a',
              color: activeSection === s.id ? '#fff' : '#888',
              border: '1px solid #2a2a2a',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* プロフィール */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>身長 (cm)</label>
              <input
                type="number"
                value={form.height_cm}
                onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
                placeholder="170"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>年齢</label>
              <input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
                placeholder="25"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>性別</label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
              >
                <option value="">選択</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>現在の体重 (kg)</label>
              <input
                type="number"
                value={form.current_weight_kg}
                onChange={e => setForm(f => ({ ...f, current_weight_kg: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
                placeholder="70"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>目標体重 (kg)</label>
              <input
                type="number"
                value={form.goal_weight_kg}
                onChange={e => setForm(f => ({ ...f, goal_weight_kg: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
                placeholder="65"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: '#888' }}>トレーニング目的</label>
            <div className="grid grid-cols-3 gap-2">
              {PURPOSES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm(f => ({ ...f, training_purpose: p.value }))}
                  className="py-2 rounded-xl text-xs"
                  style={{
                    background: form.training_purpose === p.value ? '#f97316' : '#1a1a1a',
                    color: form.training_purpose === p.value ? '#fff' : '#888',
                    border: '1px solid #2a2a2a',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: '#f97316' }}
          >
            {saving ? '保存中...' : saved ? '保存済み ✓' : '保存する'}
          </button>
        </div>
      )}

      {/* トレーナー選択 */}
      {activeSection === 'trainer' && (
        <div className="space-y-3">
          {TRAINERS.map(t => (
            <button
              key={t.id}
              onClick={() => setForm(f => ({ ...f, trainer_character: t.id }))}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
              style={{
                background: form.trainer_character === t.id ? 'rgba(249,115,22,0.1)' : '#1a1a1a',
                border: `1px solid ${form.trainer_character === t.id ? '#f97316' : '#2a2a2a'}`,
              }}
            >
              <img src={t.img} alt={t.name} className="w-12 h-12 object-contain rounded-full" style={{ background: '#0f0f0f' }} />
              <div>
                <p className="font-bebas text-lg" style={{ color: form.trainer_character === t.id ? '#f97316' : '#f5f5f5' }}>{t.name}</p>
                <p className="text-xs" style={{ color: '#888' }}>{t.desc}</p>
              </div>
              {form.trainer_character === t.id && (
                <div className="ml-auto">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#f97316' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 mt-4"
            style={{ background: '#f97316' }}
          >
            {saving ? '保存中...' : saved ? '保存済み ✓' : '保存する'}
          </button>
        </div>
      )}

      {/* 種目設定 */}
      {activeSection === 'exercises' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newExName}
              onChange={e => setNewExName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExercise()}
              placeholder="種目名を入力"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border"
              style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f5f5f5' }}
            />
            <button
              onClick={addExercise}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#f97316' }}
            >
              追加
            </button>
          </div>

          <div className="space-y-2">
            {exercises.length === 0 && (
              <p className="text-center py-6 text-sm" style={{ color: '#888' }}>種目を追加しましょう</p>
            )}
            {exercises.map(ex => (
              <div
                key={ex.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
              >
                <span className="text-sm">{ex.name}</span>
                <button onClick={() => deleteExercise(ex.id)} style={{ color: '#888' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ログアウト */}
      <div className="mt-10 pt-6" style={{ borderTop: '1px solid #2a2a2a' }}>
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl text-sm"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888' }}
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
