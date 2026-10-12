// ローカルファーストのデータ層。
// ネイティブ(iOS)ではCapacitor Preferences（UserDefaults、iCloudバックアップ対象）、
// Webでは localStorage に保存する。アカウント・サーバ不要。
//
// コレクション:
//   profile          … プロフィール（trainer_character / coach_mode / onboarding_done など）
//   user_exercises   … 種目リスト [{ id, name, order }]
//   workout_sessions … 記録 [{ id, date, exercises, cardio, memo }]（date降順で保持）
//   planned_sessions … AI計画 [{ id, planned_date, exercises, status, linked_session_id, created_at }]
//   ai_memories      … AI長期記憶 [{ id, memory_type, content, created_at, expires_at }]
//   routines         … ルーチン [{ id, name, exercises: [{ name, sets, reps }], order, last_used_at, created_at }]
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const isNative = Capacitor.isNativePlatform()
const PREFIX = 'ironlog.'

// ---- 低レベルKVS（native: Preferences / web: localStorage） ----
async function kvGet(key) {
  if (isNative) {
    const { value } = await Preferences.get({ key: PREFIX + key })
    return value
  }
  try { return localStorage.getItem(PREFIX + key) } catch { return null }
}

async function kvSet(key, value) {
  if (isNative) {
    await Preferences.set({ key: PREFIX + key, value })
    return
  }
  try { localStorage.setItem(PREFIX + key, value) } catch { /* 容量超過等は呼び出し側で致命でない */ }
}

// ---- インメモリキャッシュ付きコレクションアクセス ----
const cache = new Map()

async function load(name, fallback) {
  if (cache.has(name)) return cache.get(name)
  const raw = await kvGet(name)
  let data = fallback
  if (raw) {
    try { data = JSON.parse(raw) } catch { /* 壊れていたらfallback */ }
  }
  cache.set(name, data)
  return data
}

async function save(name, data) {
  cache.set(name, data)
  await kvSet(name, JSON.stringify(data))
}

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---- profile ----
const DEFAULT_PROFILE = {
  onboarding_done: false,
  trainer_character: 'RYOTA',
  coach_mode: 'spartan',
  training_purpose: null,
  user_level: null,
  height_cm: null,
  age: null,
  gender: null,
  current_weight_kg: null,
  goal_weight_kg: null,
  coach_notes: null,
  display_name: null,
}

export async function getProfile() {
  return load('profile', { ...DEFAULT_PROFILE })
}

export async function updateProfile(patch) {
  const cur = await getProfile()
  const next = { ...cur, ...patch, updated_at: new Date().toISOString() }
  await save('profile', next)
  return next
}

// ---- user_exercises ----
export async function listExercises() {
  const list = await load('user_exercises', [])
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function addExerciseDef(name) {
  const list = await load('user_exercises', [])
  const ex = { id: genId(), name, order: list.length }
  await save('user_exercises', [...list, ex])
  return ex
}

export async function addExerciseDefs(defs) {
  const list = await load('user_exercises', [])
  const added = defs.map((d, i) => ({ id: genId() + i, name: d.name, order: list.length + i }))
  await save('user_exercises', [...list, ...added])
  return added
}

export async function removeExerciseDef(id) {
  const list = await load('user_exercises', [])
  await save('user_exercises', list.filter(e => e.id !== id))
}

// ---- workout_sessions ----
export async function listSessions(limit = 50) {
  const list = await load('workout_sessions', [])
  return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

export async function getSessionByDate(date) {
  const list = await load('workout_sessions', [])
  return list.find(s => s.date === date) ?? null
}

// 同一日付は上書き（旧Supabaseの UNIQUE(user_id, date) 相当）
export async function upsertSession({ date, exercises, cardio = [], memo = '' }) {
  const list = await load('workout_sessions', [])
  const existing = list.find(s => s.date === date)
  let session
  if (existing) {
    session = { ...existing, exercises, cardio, memo, updated_at: new Date().toISOString() }
    await save('workout_sessions', list.map(s => (s.date === date ? session : s)))
  } else {
    session = { id: genId(), date, exercises, cardio, memo, created_at: new Date().toISOString() }
    await save('workout_sessions', [...list, session])
  }
  return session
}

export async function updateSessionExercises(id, exercises) {
  const list = await load('workout_sessions', [])
  const next = list.map(s => (s.id === id ? { ...s, exercises, updated_at: new Date().toISOString() } : s))
  await save('workout_sessions', next)
  return next.find(s => s.id === id) ?? null
}

// ---- planned_sessions ----
export async function getPendingPlan(date) {
  const list = await load('planned_sessions', [])
  return [...list]
    .filter(p => p.planned_date === date && p.status === 'pending')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0] ?? null
}

export async function addPlan({ planned_date, exercises }) {
  const list = await load('planned_sessions', [])
  const plan = {
    id: genId(), planned_date, exercises,
    cardio: [], memo: '', status: 'pending',
    linked_session_id: null, created_at: new Date().toISOString(),
  }
  await save('planned_sessions', [...list, plan])
  return plan
}

export async function markPlanDone(planId, sessionId) {
  const list = await load('planned_sessions', [])
  await save('planned_sessions', list.map(p =>
    p.id === planId ? { ...p, status: 'done', linked_session_id: sessionId } : p
  ))
}

// ---- routines（定型メニュー） ----
// 重量は持たない（毎回書き換えが要って放置されるため）。重量は記録タブで前回の同種目から補完する。
export const MAX_ROUTINES = 5

export async function listRoutines() {
  const list = await load('routines', [])
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function normalizeRoutineExercises(exercises) {
  return (exercises || [])
    .filter(ex => ex?.name)
    .map(ex => ({
      name: ex.name,
      sets: Math.min(10, Math.max(1, parseInt(ex.sets) || 3)),
      reps: Math.min(50, Math.max(1, parseInt(ex.reps) || 10)),
    }))
}

// idありは更新、なしは新規（上限MAX_ROUTINES）
export async function saveRoutine({ id, name, exercises }) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('routine name required')
  const list = await load('routines', [])
  const normalized = normalizeRoutineExercises(exercises)
  if (id) {
    const next = list.map(r => (r.id === id ? { ...r, name: trimmed, exercises: normalized, updated_at: new Date().toISOString() } : r))
    await save('routines', next)
    return next.find(r => r.id === id) ?? null
  }
  if (list.length >= MAX_ROUTINES) throw new Error('routine limit')
  const routine = {
    id: genId(), name: trimmed, exercises: normalized,
    order: list.reduce((m, r) => Math.max(m, r.order ?? 0), -1) + 1,
    last_used_at: null, created_at: new Date().toISOString(),
  }
  await save('routines', [...list, routine])
  return routine
}

export async function deleteRoutine(id) {
  const list = await load('routines', [])
  await save('routines', list.filter(r => r.id !== id))
}

// 「前回◯/◯」表示用。どのルーチンをやるかは毎回ユーザーが選ぶ（30分の日/60分の日など、順番では決まらないため）
export async function markRoutineUsed(id) {
  const list = await load('routines', [])
  await save('routines', list.map(r => (r.id === id ? { ...r, last_used_at: new Date().toISOString() } : r)))
}

// ---- ai_memories（TTLは旧Edge Function v11と同じ） ----
const MEMORY_TTL_DAYS = { injury: 60, goal: 90, preference: 180, habit: 180, note: 30 }

function memoryExpiresAt(type) {
  const d = new Date()
  d.setDate(d.getDate() + (MEMORY_TTL_DAYS[type] ?? 60))
  return d.toISOString()
}

export async function listMemories() {
  const list = await load('ai_memories', [])
  const now = new Date().toISOString()
  return list
    .filter(m => !m.expires_at || m.expires_at > now)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

// type別・最終状態置き換え方式（旧v11と同じ統合ルール）
export async function applyMemoryUpdates(updates) {
  if (!Array.isArray(updates) || updates.length === 0) return
  let list = await load('ai_memories', [])
  for (const u of updates) {
    if (!u?.memory_type || !Array.isArray(u.memories)) continue
    list = list.filter(m => m.memory_type !== u.memory_type)
    for (const content of u.memories) {
      list.push({
        id: genId(), memory_type: u.memory_type, content,
        created_at: new Date().toISOString(),
        expires_at: memoryExpiresAt(u.memory_type),
      })
    }
  }
  await save('ai_memories', list)
}

export async function deleteMemory(id) {
  const list = await load('ai_memories', [])
  await save('ai_memories', list.filter(m => m.id !== id))
}

export async function deleteAllMemories() {
  await save('ai_memories', [])
}

// ---- chat履歴 ----
// トレーナーを刻印して保存し、トレーナー変更後は旧履歴を返さない
// （前キャラの人格が会話履歴経由でAIの返答に混ざるのを防ぐ）。
// 刻印のない旧形式はどのトレーナー・モードで生成されたか不明（人格汚染の可能性）のため破棄する
export async function loadChat(trainer) {
  const data = await load('chat', [])
  if (data && Array.isArray(data.messages)) {
    if (trainer && data.trainer && data.trainer !== trainer) return []
    return data.messages
  }
  return []
}

export async function saveChat(messages, trainer) {
  await save('chat', { trainer: trainer || null, messages: messages.slice(-30) })
}

// ---- 全データエクスポート/インポート（機種変更・バックアップ用） ----
export async function exportAll() {
  const [profile, exercises, sessions, plans, memories, routines] = await Promise.all([
    getProfile(), load('user_exercises', []), load('workout_sessions', []),
    load('planned_sessions', []), load('ai_memories', []), load('routines', []),
  ])
  return {
    version: 2, exported_at: new Date().toISOString(),
    profile, user_exercises: exercises, workout_sessions: sessions,
    planned_sessions: plans, ai_memories: memories, routines,
  }
}

export async function importAll(data) {
  if (!data || data.version !== 2) throw new Error('unsupported export version')
  await save('profile', { ...DEFAULT_PROFILE, ...data.profile })
  await save('user_exercises', data.user_exercises || [])
  await save('workout_sessions', data.workout_sessions || [])
  await save('planned_sessions', data.planned_sessions || [])
  await save('ai_memories', data.ai_memories || [])
  // ルーチン導入前のエクスポート（routinesキーなし）を読み込んでも、端末のルーチンは消さない
  if (Array.isArray(data.routines)) await save('routines', data.routines)
}
