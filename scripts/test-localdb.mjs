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

console.log('— routines —')
check('未作成ならNEXTなし', (await db.getNextRoutine()) === null)
const rUpper = await db.saveRoutine({ name: '  上半身  ', exercises: [{ name: 'ベンチプレス', sets: 3, reps: 10 }] })
const rLower = await db.saveRoutine({ name: '下半身', exercises: [{ name: 'スクワット', sets: 99, reps: 0 }] })
const rFull = await db.saveRoutine({ name: '全身', exercises: [{ name: 'デッドリフト', sets: 3, reps: 5 }] })
check('名前トリム・登録順', rUpper.name === '上半身' && (await db.listRoutines()).map(r => r.name).join() === '上半身,下半身,全身')
check('セット・回数の範囲補正', rLower.exercises[0].sets === 10 && rLower.exercises[0].reps === 10)
let threw = false
try { await db.saveRoutine({ name: '   ', exercises: [] }) } catch { threw = true }
check('空の名前は拒否', threw)
check('未使用なら先頭がNEXT', (await db.getNextRoutine()).id === rUpper.id)
await db.markRoutineUsed(rUpper.id)
check('使ったら次へ進む', (await db.getNextRoutine()).id === rLower.id)
await new Promise(r => setTimeout(r, 5))
await db.markRoutineUsed(rFull.id)
check('最後の次は先頭に戻る', (await db.getNextRoutine()).id === rUpper.id)
const renamed = await db.saveRoutine({ id: rLower.id, name: '脚の日', exercises: rLower.exercises })
check('名前の変更', renamed.name === '脚の日' && (await db.listRoutines()).length === 3)
await db.saveRoutine({ name: '4', exercises: [] })
await db.saveRoutine({ name: '5', exercises: [] })
threw = false
try { await db.saveRoutine({ name: '6', exercises: [] }) } catch { threw = true }
check(`上限${db.MAX_ROUTINES}件`, threw && (await db.listRoutines()).length === db.MAX_ROUTINES)
for (const r of (await db.listRoutines()).filter(r => r.name === '4' || r.name === '5')) await db.deleteRoutine(r.id)
check('削除', (await db.listRoutines()).length === 3)

console.log('— export/import —')
const dump = await db.exportAll()
check('エクスポート形式', dump.version === 2 && dump.workout_sessions.length === 2 && dump.routines.length === 3)
store.clear()
// キャッシュを飛ばすため再import不可 → importAllで上書き検証
await db.importAll(dump)
check('インポート復元', (await db.listSessions()).length === 2 && (await getProfile()).trainer_character === 'DAIKI' && (await db.listRoutines()).length === 3)
const { routines: _omit, ...oldFormat } = dump
await db.importAll(oldFormat)
check('routinesなしの旧エクスポートでもルーチンは消えない', (await db.listRoutines()).length === 3)

console.log(`\n結果: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
