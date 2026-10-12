// 9人の口調を並べて読み比べるためのレビューシートを作る。
// 本番のAIプロキシに共通の質問を投げ、固定セリフのサンプルと一緒に voice-review/review.md に書き出す。
// 実行: node scripts/voice-review.mjs   （1回27リクエスト。プロキシのレート制限は5分30回）
import { mkdirSync, writeFileSync } from 'node:fs'
import { TRAINER_LINES } from '../src/lib/trainerLines.js'

const ENDPOINT = process.env.VOICE_REVIEW_ENDPOINT || 'https://newiron-log.vercel.app/api/ai-chat'
const TRAINERS = ['RYOTA', 'YUKI', 'LEON', 'JADE', 'NANA', 'HANA', 'RACHELL', 'TORU', 'BILLY']
const QUESTIONS = [
  '今日なんかだるい',
  'ベンチ60kgで8回しかできなかった',
  '明日のメニュー考えて',
]
const recentWorkouts = [
  { date: '2026-10-10', exercises: [{ name: 'スクワット', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 6 }] }] },
  { date: '2026-10-08', exercises: [{ name: 'ベンチプレス', sets: [{ weight: 60, reps: 9 }, { weight: 60, reps: 9 }, { weight: 60, reps: 8 }] }] },
]

async function ask(trainer, message) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message, history: [], recentWorkouts, memories: [],
      profile: { trainer_character: trainer, display_name: 'まさ', training_purpose: '筋肥大', user_level: 'intermediate' },
    }),
  })
  if (!res.ok) return `（エラー ${res.status}）`
  return (await res.json()).content?.trim() || '（空の返答）'
}

const out = ['# 口調レビュー', '', `生成: ${new Date().toLocaleString('ja-JP')}　/　${ENDPOINT}`, '']

out.push('## 固定セリフ（起動時ウインドウ・AIタブ上部）', '')
for (const t of TRAINER_LINES ? TRAINERS : []) {
  const L = TRAINER_LINES[t]
  const w = ctx => L.welcome(ctx).filter(Boolean)[0]
  out.push(`**${t}**`)
  out.push(`- 初回: ${w({ daysSince: null, lastExercise: null })}`)
  out.push(`- 翌日: ${w({ daysSince: 1, lastExercise: 'ベンチプレス' })}`)
  out.push(`- 3日ぶり: ${w({ daysSince: 3, lastExercise: 'ベンチプレス' })}`)
  out.push(`- 7日ぶり: ${w({ daysSince: 7, lastExercise: 'ベンチプレス' })}`)
  out.push(`- AIタブ: ${L.chat_greeting[0]}`, '')
}

for (const q of QUESTIONS) {
  out.push(`## AIチャット「${q}」`, '')
  for (const t of TRAINERS) {
    const a = await ask(t, q)
    out.push(`**${t}**`, '', a.replace(/\n+/g, '\n\n'), '')
    process.stdout.write('.')
  }
}

mkdirSync('voice-review', { recursive: true })
writeFileSync('voice-review/review.md', out.join('\n'))
console.log('\n✔ voice-review/review.md')
