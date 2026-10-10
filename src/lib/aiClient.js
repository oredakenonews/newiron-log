// AIプロキシ（/api/ai-chat）クライアント。
// Webでは同一オリジン、ネイティブ(iOS)では本番Vercelを叩く。
import { Capacitor } from '@capacitor/core'
import { listMemories, applyMemoryUpdates } from './localdb'

const AI_URL = import.meta.env.VITE_AI_ENDPOINT
  || (Capacitor.isNativePlatform() ? 'https://newiron-log.vercel.app/api/ai-chat' : '/api/ai-chat')

// サーバ側AI_PROXY_TOKENとペアで設定する簡易トークン（未設定なら送らない）
const AI_TOKEN = import.meta.env.VITE_AI_PROXY_TOKEN

async function post(body) {
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(AI_TOKEN ? { 'x-il-token': AI_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`ai-chat ${res.status}`)
  return res.json()
}

export async function sendChat({ message, history, profile, recentWorkouts }) {
  const memories = await listMemories()
  const data = await post({
    message, history, profile, recentWorkouts,
    memories: memories.map(m => ({ memory_type: m.memory_type, content: m.content })),
  })
  return data.content
}

export async function structurePlan({ message, profile }) {
  const data = await post({ message, profile, format: 'structure' })
  return JSON.parse(data.content)
}

// 返答後にバックグラウンドで呼ぶ（UIをブロックしない）。保存は端末内。
// v2.1: キーワードゲートは「記憶が機能していない」FBにより廃止し、毎回抽出する。
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
