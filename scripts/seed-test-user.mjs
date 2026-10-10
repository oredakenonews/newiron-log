// テストユーザーにオンボーディング完了状態＋サンプル記録をシードする（UI検証用）
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=', 2).map(s => s.trim()))
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data: auth, error } = await sb.auth.signInWithPassword({
  email: process.env.IRON_TEST_EMAIL,
  password: process.env.IRON_TEST_PASSWORD,
})
if (error) { console.error(error.message); process.exit(1) }
const uid = auth.user.id

function localDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d) }

await sb.from('profiles').update({
  onboarding_done: true, trainer_character: 'RYOTA', coach_mode: 'spartan',
  training_purpose: '筋肥大', user_level: 'intermediate',
  height_cm: 172, age: 30, current_weight_kg: 68, goal_weight_kg: 72,
}).eq('id', uid)

const { count } = await sb.from('user_exercises').select('id', { count: 'exact', head: true }).eq('user_id', uid)
if (!count) {
  const names = ['ベンチプレス', 'スクワット', 'デッドリフト', 'ショルダープレス', 'ラットプルダウン', 'ダンベルカール', 'レッグプレス', 'サイドレイズ']
  await sb.from('user_exercises').insert(names.map((name, i) => ({ user_id: uid, name, order: i })))
}

const sessions = [
  { d: 1, ex: [{ name: 'ベンチプレス', sets: [{ weight: '60', reps: '10', done: true }, { weight: '65', reps: '8', done: true }, { weight: '70', reps: '6', done: true }] }, { name: 'サイドレイズ', sets: [{ weight: '8', reps: '15', done: true }, { weight: '8', reps: '15', done: true }] }] },
  { d: 3, ex: [{ name: 'スクワット', sets: [{ weight: '80', reps: '8', done: true }, { weight: '85', reps: '6', done: true }, { weight: '90', reps: '5', done: true }] }, { name: 'レッグプレス', sets: [{ weight: '140', reps: '10', done: true }] }] },
  { d: 5, ex: [{ name: 'デッドリフト', sets: [{ weight: '100', reps: '5', done: true }, { weight: '110', reps: '3', done: true }] }, { name: 'ラットプルダウン', sets: [{ weight: '55', reps: '10', done: true }, { weight: '55', reps: '10', done: true }] }] },
]
for (const s of sessions) {
  await sb.from('workout_sessions').upsert({
    user_id: uid, date: daysAgo(s.d), exercises: s.ex, cardio: [], memo: '',
  }, { onConflict: 'user_id,date' })
}
console.log('seeded for', uid)
process.exit(0)
