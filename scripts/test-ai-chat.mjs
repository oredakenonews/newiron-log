// ai-chat Edge Functionのエンドツーエンド検証（AITabと同じ呼び出し形）
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
if (error) { console.error('login:', error.message); process.exit(1) }

const { data: profile } = await sb.from('profiles').select('*').eq('id', auth.user.id).maybeSingle()
const { data: recentWorkouts } = await sb.from('workout_sessions')
  .select('date, exercises').eq('user_id', auth.user.id)
  .order('date', { ascending: false }).limit(12)

console.log('— 通常チャット —')
const t0 = Date.now()
const { data, error: fnErr } = await sb.functions.invoke('ai-chat', {
  body: {
    message: '昨日のベンチプレスの調子はどうだった？左肩に少し違和感があるんだけど注意点ある？',
    history: [], profile, recentWorkouts, coachMode: 'spartan',
  },
})
if (fnErr) { console.error('✗ ai-chat失敗:', fnErr.message); process.exit(1) }
console.log(`  ✓ 応答 ${Date.now() - t0}ms:`)
console.log('  ' + (data.content || '').slice(0, 200).replace(/\n/g, '\n  '))

console.log('— format:structure（計画JSON化） —')
const t1 = Date.now()
const { data: s, error: sErr } = await sb.functions.invoke('ai-chat', {
  body: {
    message: '明日はベンチプレス60kg×10回を3セット、スクワット80kg×8回を3セットやろう',
    history: [], profile, recentWorkouts, coachMode: 'spartan', format: 'structure',
  },
})
if (sErr) { console.error('✗ structure失敗:', sErr.message); process.exit(1) }
try {
  const plan = JSON.parse(s.content)
  console.log(`  ✓ JSON解析OK ${Date.now() - t1}ms: planned_date=${plan.planned_date}, exercises=${plan.exercises?.length}`)
} catch {
  console.error('  ✗ JSON解析失敗:', s.content?.slice(0, 200))
}

// 長期記憶（バックグラウンド書き込みを待って確認）
console.log('— 長期記憶（10秒待機後に確認） —')
await new Promise(r => setTimeout(r, 10000))
const { data: mems } = await sb.from('ai_memories').select('memory_type, content').eq('user_id', auth.user.id)
console.log(mems?.length ? mems.map(m => `  ✓ [${m.memory_type}] ${m.content}`).join('\n') : '  （記憶なし — キーワード判定かwaitUntilの遅延の可能性）')
process.exit(0)
