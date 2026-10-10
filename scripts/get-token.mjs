// テストユーザーのセッショントークン取得（UI検証用の一時スクリプト）
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=', 2).map(s => s.trim()))
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.auth.signInWithPassword({
  email: process.env.IRON_TEST_EMAIL,
  password: process.env.IRON_TEST_PASSWORD,
})
if (error) { console.error(error.message); process.exit(1) }
writeFileSync(process.argv[2] || 'tokens.json', JSON.stringify({
  at: data.session.access_token,
  rt: data.session.refresh_token,
}))
console.log('tokens saved')
process.exit(0)
