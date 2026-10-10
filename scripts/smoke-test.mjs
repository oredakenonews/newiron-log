// データ層スモークテスト — アプリと同じsupabase-js経由で主要フローを検証する
// 実行: node scripts/smoke-test.mjs
// 必要: .env.local の VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//       環境変数 IRON_TEST_EMAIL / IRON_TEST_PASSWORD（テスト専用ユーザー）
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=', 2).map(s => s.trim()))
)
const EMAIL = process.env.IRON_TEST_EMAIL
const PASSWORD = process.env.IRON_TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error('IRON_TEST_EMAIL / IRON_TEST_PASSWORD を設定してください')
  process.exit(1)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

let pass = 0, fail = 0
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

console.log('— 認証 —')
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
check('ログイン', !authErr, authErr?.message)
if (authErr) process.exit(1)
const uid = auth.user.id

console.log('— プロフィール —')
const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
check('profiles取得（トリガー自動作成）', !profErr && !!profile, profErr?.message)
check('coach_modeデフォルト', ['spartan', 'gentle'].includes(profile?.coach_mode), String(profile?.coach_mode))

console.log('— workout_sessions（記録タブの保存フロー） —')
const today = localDateStr()
const payload = {
  user_id: uid, date: today,
  exercises: [{ name: 'ベンチプレス', sets: [{ weight: '60', reps: '10', done: true }] }],
  cardio: [], memo: '',
}
const { data: up1, error: upErr1 } = await supabase
  .from('workout_sessions').upsert(payload, { onConflict: 'user_id,date' }).select('id').single()
check('upsert（新規）', !upErr1 && up1?.id, upErr1?.message)

const payload2 = { ...payload, exercises: [...payload.exercises, { name: 'スクワット', sets: [{ weight: '80', reps: '8', done: false }] }] }
const { data: up2, error: upErr2 } = await supabase
  .from('workout_sessions').upsert(payload2, { onConflict: 'user_id,date' }).select('id').single()
check('upsert（同日更新・重複なし）', !upErr2 && up2?.id === up1?.id, upErr2?.message || `id不一致 ${up1?.id} vs ${up2?.id}`)

const { data: sessions } = await supabase.from('workout_sessions').select('*').eq('user_id', uid).eq('date', today)
check('同日1レコードのみ', sessions?.length === 1, `count=${sessions?.length}`)
check('exercises JSON往復', sessions?.[0]?.exercises?.length === 2)

console.log('— RLS（他人のデータが見えない/書けない） —')
const { data: others } = await supabase.from('workout_sessions').select('user_id').neq('user_id', uid).limit(5)
check('SELECT分離', (others || []).length === 0, `他ユーザー行が${others?.length}件見えた`)
const { error: rlsInsErr } = await supabase.from('workout_sessions').insert({
  user_id: '00000000-0000-0000-0000-000000000001', date: today, exercises: [], cardio: [], memo: '',
})
check('INSERT偽装拒否', !!rlsInsErr)

console.log('— user_exercises —')
const { data: ins, error: insErr } = await supabase.from('user_exercises')
  .insert({ user_id: uid, name: 'テスト種目', order: 999 }).select().single()
check('種目追加', !insErr && ins?.id, insErr?.message)
if (ins?.id) {
  const { error: delErr } = await supabase.from('user_exercises').delete().eq('id', ins.id)
  check('種目削除', !delErr, delErr?.message)
}

console.log('— planned_sessions —')
const { data: plan, error: planErr } = await supabase.from('planned_sessions').insert({
  user_id: uid, planned_date: today,
  exercises: [{ name: 'ベンチプレス', sets: [{ weight: '60', reps: '10' }] }],
  cardio: [], memo: '', status: 'pending',
}).select().single()
check('計画保存', !planErr && plan?.id, planErr?.message)
if (plan?.id) {
  const { data: found } = await supabase.from('planned_sessions').select('*')
    .eq('user_id', uid).eq('planned_date', today).eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  check('今日の計画取得（maybeSingle）', found?.id === plan.id)
  await supabase.from('planned_sessions').delete().eq('id', plan.id)
}

// 後片付け（テストユーザーの今日のセッション削除）
await supabase.from('workout_sessions').delete().eq('user_id', uid).eq('date', today)

console.log(`\n結果: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
