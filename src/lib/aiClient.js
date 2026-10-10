// AIプロキシ（/api/ai-chat）クライアント。
// Webでは同一オリジン、ネイティブ(iOS)では本番Vercelを叩く。
import { Capacitor } from '@capacitor/core'
import { listMemories, applyMemoryUpdates } from './localdb'

const AI_URL = import.meta.env.VITE_AI_ENDPOINT
  || (Capacitor.isNativePlatform() ? 'https://newiron-log.vercel.app/api/ai-chat' : '/api/ai-chat')

async function post(body) {
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`ai-chat ${res.status}`)
  return res.json()
}

export async function sendChat({ message, history, profile, recentWorkouts, coachMode }) {
  const memories = await listMemories()
  const data = await post({
    message, history, profile, recentWorkouts, coachMode,
    memories: memories.map(m => ({ memory_type: m.memory_type, content: m.content })),
  })
  return data.content
}

export async function structurePlan({ message, profile, coachMode }) {
  const data = await post({ message, profile, coachMode, format: 'structure' })
  return JSON.parse(data.content)
}

// 旧Edge Function v11と同じキーワード判定（該当時のみ抽出APIを呼んでコストを抑える）
const MEMORY_TRIGGER_KEYWORDS = [
  '痛', '怪我', '負傷', '苦手', '好き', '嫌い', '目標', '休憩', '休む',
  '体重', 'やりたい', 'できない', '変えたい', '続けたい', '辞めたい', 'リハビリ',
  '肩', '膝', '腰', '首', '腕', '足', '背中', '胸', '腹', '不安', '疲れ',
]

export function hasMemoryTrigger(message) {
  return MEMORY_TRIGGER_KEYWORDS.some(kw => message.includes(kw))
}

// 返答後にバックグラウンドで呼ぶ（UIをブロックしない）。保存は端末内。
export async function extractAndSaveMemories({ message, assistantResponse }) {
  try {
    const memories = await listMemories()
    const data = await post({
      message, assistantResponse, format: 'memory',
      memories: memories.map(m => ({ memory_type: m.memory_type, content: m.content })),
    })
    await applyMemoryUpdates(data.updates)
  } catch { /* 記憶抽出の失敗はチャット体験に影響させない */ }
}
