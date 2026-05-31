import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getCategory } from '../../lib/categories'

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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ padding: '8px 18px', fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477' }}>{title}</div>
      <div style={{ background: '#13171F', borderTop: '1px solid #1F242E', borderBottom: '1px solid #1F242E' }}>
        {children}
      </div>
    </div>
  )
}

export default function SettingsTab() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    height_cm: '', age: '', gender: '', current_weight_kg: '',
    goal_weight_kg: '', training_purpose: '', trainer_character: 'RYOTA',
    coach_mode: 'spartan', coach_notes: '',
  })
  const [exercises, setExercises] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [activeSection, setActiveSection] = useState('profile')
  const [memories, setMemories] = useState([])
  const [deletingMemoryId, setDeletingMemoryId] = useState(null)

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
        coach_mode: profile.coach_mode || 'spartan',
        coach_notes: profile.coach_notes || '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (user) loadExercises()
  }, [user])

  useEffect(() => {
    if (user && activeSection === 'trainer') loadMemories()
  }, [user, activeSection])

  async function loadMemories() {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('ai_memories')
      .select('id, memory_type, content')
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
    setMemories(data || [])
  }

  async function deleteMemory(id) {
    setDeletingMemoryId(id)
    await supabase.from('ai_memories').delete().eq('id', id)
    setMemories(prev => prev.filter(m => m.id !== id))
    setDeletingMemoryId(null)
  }

  async function deleteAllMemories() {
    await supabase.from('ai_memories').delete().eq('user_id', user.id)
    setMemories([])
  }

  async function loadExercises() {
    const { data } = await supabase.from('user_exercises').select('*').eq('user_id', user.id).order('order')
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
      coach_mode: form.coach_mode,
      coach_notes: form.coach_notes || null,
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
      user_id: user.id, name: newExName.trim(), order: exercises.length,
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

  const username = profile?.display_name || user?.email?.split('@')[0]?.toUpperCase() || 'USER'
  const initial = username[0] || 'U'

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: '#0E1118', border: '1px solid #1F242E',
    color: '#E5E9F0', outline: 'none',
    fontFamily: '"Noto Sans JP", system-ui',
  }

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%', paddingBottom: 20 }}>
      {/* profile header */}
      <div style={{
        padding: '20px 18px 22px', background: '#13171F',
        borderBottom: '1px solid #1F242E',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 60, height: 60, flexShrink: 0,
          background: '#0E1118', border: '1px solid #1F242E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Oswald', fontWeight: 700, fontSize: 28, color: '#FF6A1A',
        }}>{initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>{username}</div>
          <div style={{ fontSize: 11, color: '#8693AA', fontFamily: 'JetBrains Mono', marginTop: 2 }}>FREE PLAN</div>
        </div>
        <button style={{
          background: '#FF6A1A', color: '#0B0D10', border: 'none',
          padding: '8px 12px', fontFamily: 'Oswald', fontWeight: 700, fontSize: 12, letterSpacing: 1,
          cursor: 'pointer',
        }}>PRO →</button>
      </div>

      {/* section tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1F242E' }}>
        {[
          { id: 'profile', label: 'プロフィール' },
          { id: 'trainer', label: 'AIコーチ' },
          { id: 'exercises', label: '種目' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              flex: 1, padding: '12px 0',
              background: 'transparent', border: 'none',
              borderBottom: activeSection === s.id ? '2px solid #FF6A1A' : '2px solid transparent',
              color: activeSection === s.id ? '#FF6A1A' : '#5A6477',
              fontFamily: 'Bebas Neue', fontSize: 13, letterSpacing: 1,
              cursor: 'pointer',
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* profile section */}
      {activeSection === 'profile' && (
        <div style={{ padding: '14px' }}>
          <Section title="身体データ">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                { key: 'height_cm', label: '身長 (cm)', placeholder: '170' },
                { key: 'age', label: '年齢', placeholder: '25' },
                { key: 'current_weight_kg', label: '現在の体重 (kg)', placeholder: '70' },
                { key: 'goal_weight_kg', label: '目標体重 (kg)', placeholder: '65' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ padding: '12px 18px', borderBottom: '1px solid #1A1F28', borderRight: '1px solid #1A1F28' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: '#5A6477', marginBottom: 6 }}>{label}</div>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ ...inputStyle, padding: '6px 0', background: 'transparent', border: 'none', fontSize: 18, fontFamily: 'Oswald', fontWeight: 700 }}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1A1F28' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: '#5A6477', marginBottom: 8 }}>性別</div>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                style={{ ...inputStyle, background: '#0E1118' }}
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </Section>

          <Section title="トレーニング目的">
            <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PURPOSES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm(f => ({ ...f, training_purpose: p.value }))}
                  style={{
                    padding: '8px 16px',
                    background: form.training_purpose === p.value ? '#FF6A1A' : '#0E1118',
                    color: form.training_purpose === p.value ? '#0B0D10' : '#8693AA',
                    border: form.training_purpose === p.value ? 'none' : '1px solid #1F242E',
                    fontFamily: '"Noto Sans JP", system-ui', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </Section>

          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              width: '100%', padding: '14px 0',
              background: saved ? '#5BC25B' : '#FF6A1A', border: 'none',
              color: '#0B0D10', fontFamily: 'Oswald', fontWeight: 700,
              fontSize: 16, letterSpacing: 1.5, cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >{saving ? 'SAVING...' : saved ? 'SAVED ✓' : '保存する'}</button>
        </div>
      )}

      {/* trainer section */}
      {activeSection === 'trainer' && (
        <div style={{ padding: '14px' }}>

          {/* coach mode toggle */}
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477', marginBottom: 8 }}>コーチングモード</div>
          <div style={{ display: 'flex', background: '#0E1118', border: '1px solid #1F242E', padding: 3, marginBottom: 20 }}>
            {[
              { id: 'spartan', label: 'スパルタ', sub: 'HARD', color: '#FF6A1A' },
              { id: 'gentle',  label: 'やさしい', sub: 'SOFT', color: '#5BC25B' },
            ].map(opt => {
              const active = form.coach_mode === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setForm(f => ({ ...f, coach_mode: opt.id }))}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: active ? opt.color : 'transparent',
                    border: 'none',
                    color: active ? '#0B0D10' : '#8693AA',
                    fontFamily: '"Noto Sans JP", system-ui',
                    fontWeight: 700, fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1, opacity: 0.7 }}>{opt.sub}</span>
                </button>
              )
            })}
          </div>

          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477', marginBottom: 8 }}>コーチへのメモ</div>
          <textarea
            value={form.coach_notes}
            onChange={e => setForm(f => ({ ...f, coach_notes: e.target.value }))}
            placeholder={'ケガ・持病・苦手な種目など、毎回覚えておいてほしいことを書いてください'}
            rows={4}
            style={{
              ...inputStyle, width: '100%', resize: 'vertical',
              lineHeight: 1.6, marginBottom: 20, boxSizing: 'border-box',
            }}
          />

          {/* AI記憶 */}
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477', marginBottom: 8, marginTop: 4 }}>AI記憶</div>
          <div style={{ background: '#13171F', border: '1px solid #1F242E', marginBottom: 20 }}>
            {memories.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: '#5A6477', textAlign: 'center' }}>
                チャットで話した内容が自動的に記録されます
              </div>
            ) : (
              <>
                {memories.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderBottom: '1px solid #1A1F28',
                  }}>
                    <div style={{
                      fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1,
                      color: '#FF6A1A', background: 'rgba(255,106,26,0.1)',
                      padding: '2px 6px', flexShrink: 0,
                    }}>
                      {{ injury: '怪我', goal: '目標', preference: '好み', habit: '習慣', note: 'メモ' }[m.memory_type] || m.memory_type}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: '#B5BECF', lineHeight: 1.5 }}>{m.content}</div>
                    <button
                      onClick={() => deleteMemory(m.id)}
                      disabled={deletingMemoryId === m.id}
                      style={{ background: 'none', border: 'none', color: '#5A6477', cursor: 'pointer', padding: 4, flexShrink: 0, opacity: deletingMemoryId === m.id ? 0.4 : 1 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={deleteAllMemories}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: 'transparent', border: 'none',
                    color: '#5A6477', fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
                    cursor: 'pointer',
                  }}
                >全て削除</button>
              </>
            )}
          </div>

          <div style={{ fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: '#5A6477', marginBottom: 8 }}>トレーナー選択</div>
          <div style={{ marginBottom: 14 }}>
            {TRAINERS.map(t => (
              <div
                key={t.id}
                onClick={() => setForm(f => ({ ...f, trainer_character: t.id }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', marginBottom: 8,
                  background: form.trainer_character === t.id ? 'rgba(255,106,26,0.08)' : '#13171F',
                  border: `1px solid ${form.trainer_character === t.id ? '#FF6A1A' : '#1F242E'}`,
                  cursor: 'pointer',
                }}
              >
                <img src={t.img} alt={t.name} style={{ width: 48, height: 48, objectFit: 'contain', background: '#0E1118' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 16, color: form.trainer_character === t.id ? '#FF6A1A' : '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#8693AA', marginTop: 2 }}>{t.desc}</div>
                </div>
                {form.trainer_character === t.id && (
                  <div style={{
                    width: 20, height: 20, background: '#FF6A1A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B0D10" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              width: '100%', padding: '14px 0',
              background: saved ? '#5BC25B' : '#FF6A1A', border: 'none',
              color: '#0B0D10', fontFamily: 'Oswald', fontWeight: 700,
              fontSize: 16, letterSpacing: 1.5, cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >{saving ? 'SAVING...' : saved ? 'SAVED ✓' : '保存する'}</button>
        </div>
      )}

      {/* exercises section */}
      {activeSection === 'exercises' && (
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              value={newExName}
              onChange={e => setNewExName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExercise()}
              placeholder="種目名を入力"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={addExercise}
              style={{
                padding: '12px 16px', background: '#FF6A1A', border: 'none',
                color: '#0B0D10', fontFamily: 'Oswald', fontWeight: 700,
                fontSize: 14, letterSpacing: 1, cursor: 'pointer',
              }}
            >追加</button>
          </div>

          <div style={{ background: '#13171F', border: '1px solid #1F242E' }}>
            {exercises.length === 0 && (
              <p style={{ textAlign: 'center', color: '#5A6477', fontSize: 13, padding: '30px 0' }}>種目を追加しましょう</p>
            )}
            {exercises.map((ex, i) => (
              <div
                key={ex.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: i < exercises.length - 1 ? '1px solid #1A1F28' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5, color: '#FF6A1A', marginBottom: 2 }}>
                    {getCategory(ex.name)}
                  </div>
                  <div style={{ fontSize: 15, color: '#fff' }}>{ex.name}</div>
                </div>
                <button
                  onClick={() => deleteExercise(ex.id)}
                  style={{ background: 'none', border: 'none', color: '#5A6477', cursor: 'pointer', padding: 4 }}
                >
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

      {/* logout */}
      <div style={{ padding: '0 14px', marginTop: 24 }}>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '14px 0',
            background: 'transparent', border: '1px solid #1F242E',
            color: '#5A6477', fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5,
            cursor: 'pointer',
          }}
        >ログアウト</button>
      </div>
    </div>
  )
}
