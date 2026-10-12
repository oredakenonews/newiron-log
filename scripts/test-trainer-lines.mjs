// 固定セリフ（src/lib/trainerLines.js）の網羅チェック
// 実行: node scripts/test-trainer-lines.mjs
import { TRAINER_LINES, pickDaily, daysBetween } from '../src/lib/trainerLines.js'

let pass = 0, fail = 0
function check(name, ok, detail = '') {
  if (ok) { pass++ } else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

const TRAINERS = ['RYOTA', 'YUKI', 'LEON', 'JADE', 'NANA', 'HANA', 'RACHELL', 'TORU', 'BILLY']
// 性格を説明する言葉。キャラは自分の設定を口にしない（FB「設定をそのまま言っている」）
const SELF_DESCRIBING = ['クール', '淡々', 'ストイック', '熱血', '理論派', 'ポジティブ', 'データは裏切', 'エンタメ', 'ベテランの']

const welcomeCtxs = [null, 0, 1, 2, 3, 4, 10].flatMap(d => [
  { daysSince: d, lastExercise: 'ベンチプレス' },
  { daysSince: d, lastExercise: null },
])
const all = []
check('トレーナーが9人そろっている', TRAINERS.every(t => TRAINER_LINES[t]) && Object.keys(TRAINER_LINES).length === 9)
for (const t of TRAINERS) {
  const L = TRAINER_LINES[t]
  for (const ctx of welcomeCtxs) {
    const list = L.welcome(ctx).filter(Boolean)
    check(`${t} welcome ${JSON.stringify(ctx)} に候補がある`, list.length > 0)
    all.push(...list.map(x => [t, x]))
  }
  check(`${t} chat_greeting が2つ以上`, L.chat_greeting.length >= 2)
  all.push(...L.chat_greeting.map(x => [t, x]))
  for (const n of [0, 1, 2, 3, 6]) {
    const list = L.history_summary({ weekSessions: n })
    check(`${t} history_summary(${n})`, list.length > 0)
    all.push(...list.map(x => [t, x]))
  }
  for (const isLeg of [true, false]) {
    const list = L.workout({ topExercise: 'スクワット', sets: 12, isLeg })
    check(`${t} workout(leg=${isLeg})`, list.length >= 2)
    all.push(...list.map(x => [t, x]))
  }
}
for (const [t, line] of all) {
  check(`${t}「${line}」に値の埋め込み漏れがない`, !/undefined|null|NaN|\$\{/.test(line))
  const hit = SELF_DESCRIBING.find(w => line.includes(w))
  check(`${t}「${line}」が性格を説明していない`, !hit, hit ? `（「${hit}」を含む）` : '')
}

check('pickDailyは同じ日・同じ場面で同じ結果', pickDaily(['a', 'b', 'c'], 'x') === pickDaily(['a', 'b', 'c'], 'x'))
check('pickDailyは空要素を除く', pickDaily([null, false, 'only'], 'y') === 'only')
check('daysBetweenは月またぎも正しい', daysBetween('2026-09-30', '2026-10-02') === 2)

console.log(`固定セリフ ${all.length} 本を確認`)
console.log(`結果: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
