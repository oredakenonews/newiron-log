// localdb（v2ローカルデータ層）のロジックテスト（Node上でlocalStorageをシムして実行）
// 実行: node scripts/test-localdb.mjs
const store = new Map()
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
}

// @capacitor/core は isNativePlatform=false になればよい（Node上ではwebパス）
const { getProfile, updateProfile } = await import('../src/lib/localdb.js')
const db = await import('../src/lib/localdb.js')

let pass = 0, fail = 0
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

console.log('— profile —')
const p0 = await getProfile()
check('初期プロフィール', p0.onboarding_done === false && p0.coach_mode === 'spartan')
const p1 = await updateProfile({ onboarding_done: true, trainer_character: 'DAIKI' })
check('更新がマージされる', p1.onboarding_done === true && p1.trainer_character === 'DAIKI' && p1.coach_mode === 'spartan')

console.log('— exercises —')
await db.addExerciseDefs([{ name: 'ベンチプレス' }, { name: 'スクワット' }])
const ex1 = await db.addExerciseDef('デッドリフト')
let exs = await db.listExercises()
check('追加と順序', exs.length === 3 && exs[2].name === 'デッドリフト')
await db.removeExerciseDef(ex1.id)
exs = await db.listExercises()
check('削除', exs.length === 2)

console.log('— sessions —')
const s1 = await db.upsertSession({ date: '2026-10-09', exercises: [{ name: 'ベンチプレス', sets: [{ weight: '60', reps: '10', done: true }] }] })
const s2 = await db.upsertSession({ date: '2026-10-09', exercises: [{ name: 'ベンチプレス', sets: [{ weight: '65', reps: '8', done: true }] }] })
check('同日upsertでID不変', s1.id === s2.id)
await db.upsertSession({ date: '2026-10-07', exercises: [{ name: 'スクワット', sets: [{ weight: '80', reps: '8', done: true }] }] })
const sessions = await db.listSessions()
check('日付降順・重複なし', sessions.length === 2 && sessions[0].date === '2026-10-09')
const byDate = await db.getSessionByDate('2026-10-07')
check('日付検索', byDate?.exercises[0].name === 'スクワット')
const updated = await db.updateSessionExercises(byDate.id, [{ name: 'レッグプレス', sets: [] }])
check('編集保存', updated.exercises[0].name === 'レッグプレス')

console.log('— plans —')
const plan = await db.addPlan({ planned_date: '2026-10-10', exercises: [{ name: 'ベンチプレス', sets: [{ weight: '60', reps: '10' }] }] })
const pending = await db.getPendingPlan('2026-10-10')
check('pending計画取得', pending?.id === plan.id)
await db.markPlanDone(plan.id, s1.id)
const after = await db.getPendingPlan('2026-10-10')
check('done後はpendingに出ない', after === null)

console.log('— memories —')
await db.applyMemoryUpdates([{ memory_type: 'injury', memories: ['左肩に違和感'] }])
await db.applyMemoryUpdates([{ memory_type: 'injury', memories: ['左肩は回復済み'] }, { memory_type: 'goal', memories: ['ベンチ100kg'] }])
const mems = await db.listMemories()
check('type置き換え統合', mems.length === 2 && mems.some(m => m.content === '左肩は回復済み') && !mems.some(m => m.content === '左肩に違和感'))
check('TTL付与', mems.every(m => m.expires_at > new Date().toISOString()))
await db.deleteAllMemories()
check('全削除', (await db.listMemories()).length === 0)

console.log('— export/import —')
const dump = await db.exportAll()
check('エクスポート形式', dump.version === 2 && dump.workout_sessions.length === 2)
store.clear()
// キャッシュを飛ばすため再import不可 → importAllで上書き検証
await db.importAll(dump)
check('インポート復元', (await db.listSessions()).length === 2 && (await getProfile()).trainer_character === 'DAIKI')

console.log(`\n結果: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
