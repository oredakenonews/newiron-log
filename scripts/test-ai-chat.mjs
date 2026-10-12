// api/ai-chat.js の煙テスト（Anthropic API / Upstash はモック）
// 実行: node scripts/test-ai-chat.mjs
import handler from '../api/ai-chat.js'

let passed = 0, failed = 0
const ok = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name} ${extra}`) }
}

function mockRes() {
  const r = { statusCode: null, body: null, headers: {} }
  r.setHeader = (k, v) => { r.headers[k] = v }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.end = () => r
  return r
}
const req = (over = {}) => ({
  method: 'POST',
  headers: { 'x-forwarded-for': '1.2.3.4', ...(over.headers || {}) },
  body: {},
  ...over,
})

// fetchモック: Anthropic宛はpayloadを記録して固定返答。Upstash宛はカウンタ返却
let lastPayload = null
let mockText = 'モック返答'
let upstashCount = 0
let upstashCalls = 0
function installFetchMock() {
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('upstash.test')) {
      upstashCalls++
      upstashCount++
      return { ok: true, json: async () => ([{ result: upstashCount }, { result: 1 }]) }
    }
    lastPayload = JSON.parse(opts.body)
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: mockText }] }) }
  }
}
installFetchMock()

console.log('— 基本 —')
delete process.env.ANTHROPIC_API_KEY
delete process.env.AI_PROXY_TOKEN
delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN
{
  const res = mockRes()
  await handler(req({ body: { message: 'hi' } }), res)
  ok('キー未設定→500', res.statusCode === 500 && /API key/.test(res.body.error))
}
process.env.ANTHROPIC_API_KEY = 'sk-test-dummy'
{
  const res = mockRes()
  await handler(req({ method: 'OPTIONS' }), res)
  ok('OPTIONS→204', res.statusCode === 204)
}
{
  const res = mockRes()
  await handler(req({ method: 'GET' }), res)
  ok('GET→405', res.statusCode === 405)
}
{
  const res = mockRes()
  await handler(req({ body: {} }), res)
  ok('message無し→400', res.statusCode === 400)
}
{
  const res = mockRes()
  await handler(req({ body: { message: 'x'.repeat(4001) } }), res)
  ok('4000字超→400', res.statusCode === 400)
}

console.log('— CORS —')
{
  const res = mockRes()
  await handler(req({ headers: { origin: 'capacitor://localhost' }, body: { message: 'hi' } }), res)
  ok('許可オリジン→ACAO付与', res.headers['Access-Control-Allow-Origin'] === 'capacitor://localhost')
}
{
  const res = mockRes()
  await handler(req({ headers: { origin: 'https://newiron-abc123-oredakenonews-projects.vercel.app' }, body: { message: 'hi' } }), res)
  ok('previewオリジン→ACAO付与', res.headers['Access-Control-Allow-Origin'] !== undefined)
}
{
  const res = mockRes()
  await handler(req({ headers: { origin: 'https://evil.example.com' }, body: { message: 'hi' } }), res)
  ok('不明オリジン→ACAOなし', res.headers['Access-Control-Allow-Origin'] === undefined)
}

console.log('— クライアントトークン —')
process.env.AI_PROXY_TOKEN = 'secret-token'
{
  const res = mockRes()
  await handler(req({ body: { message: 'hi' } }), res)
  ok('トークン無し→401', res.statusCode === 401)
}
{
  const res = mockRes()
  await handler(req({ headers: { 'x-il-token': 'wrong' }, body: { message: 'hi' } }), res)
  ok('トークン不一致→401', res.statusCode === 401)
}
{
  const res = mockRes()
  await handler(req({ headers: { 'x-il-token': 'secret-token' }, body: { message: 'hi' } }), res)
  ok('トークン一致→200', res.statusCode === 200)
}
{
  const res = mockRes()
  await handler(req({ method: 'OPTIONS' }), res)
  ok('OPTIONSはトークン不要→204', res.statusCode === 204)
}
delete process.env.AI_PROXY_TOKEN

console.log('— 通常チャット —')
{
  const res = mockRes()
  mockText = '俺はRYOTAだ！'
  await handler(req({
    body: {
      message: '今日の調子どう？',
      history: [
        { role: 'user', content: 'a' }, { role: 'assistant', content: 'b' },
        { role: 'bogus', content: 'c' }, { role: 'user' },
      ],
      profile: { trainer_character: 'RYOTA', training_purpose: '筋肥大', current_weight_kg: 70 },
      recentWorkouts: [{ date: '2026-10-09', exercises: [{ name: 'ベンチプレス', sets: [{ weight: 60, reps: 10 }] }] }],
      memories: [{ memory_type: 'injury', content: '左肩に違和感' }],
    },
  }), res)
  ok('チャット→200+content', res.statusCode === 200 && res.body.content === '俺はRYOTAだ！')
  ok('不正roleを除外', lastPayload.messages.length === 3, `len=${lastPayload.messages.length}`)
  ok('最後がuser message', lastPayload.messages.at(-1).content === '今日の調子どう？')
  ok('systemにペルソナ', /RYOTA/.test(lastPayload.system))
  ok('systemにモード指示なし', !/コーチング強度/.test(lastPayload.system))
  ok('systemに人格一貫ルール', /一貫して返答/.test(lastPayload.system))
  ok('systemに長期記憶', /\[injury\] 左肩に違和感/.test(lastPayload.system))
  ok('systemに直近記録', /ベンチプレス\(60kg×10回\)/.test(lastPayload.system))
}
{
  // 旧ビルドのアプリは廃止キャラのIDを送ってくる → 後継キャラで応答し、RYOTAに落ちない
  const res = mockRes()
  await handler(req({ body: { message: 'こんにちは', profile: { trainer_character: 'DAIKI' } } }), res)
  ok('旧ID DAIKI→LEONのペルソナ', res.statusCode === 200 && /LEON/.test(lastPayload.system) && !/RYOTA/.test(lastPayload.system))
}
{
  // 呼び方はコードで決める: 敬語キャラは敬称付き、タメ口キャラは名前のみ、既に敬称があれば重ねない
  const sys = async (trainer, name) => {
    await handler(req({ body: { message: 'やあ', profile: { trainer_character: trainer, display_name: name } } }), mockRes())
    return lastPayload.system
  }
  ok('YUKIは「まささん」', /「まささん」/.test(await sys('YUKI', 'まさ')))
  ok('HANAは「まさ様」', /「まさ様」/.test(await sys('HANA', 'まさ')))
  ok('RYOTAは「まさ」', /ユーザーの呼び方: 「まさ」/.test(await sys('RYOTA', 'まさ')))
  ok('敬称付きの名前には重ねない', /「まささん」/.test(await sys('HANA', 'まささん')))
}

console.log('— structure / memory —')
{
  const res = mockRes()
  mockText = '```json\n{"planned_date":"2026-10-10","exercises":[]}\n```'
  await handler(req({ body: { message: 'ベンチプレス 60kg 10回 3セット', format: 'structure' } }), res)
  const parsed = JSON.parse(res.body.content)
  ok('structure→200+フェンス除去+JSON', res.statusCode === 200 && parsed.planned_date === '2026-10-10')
  ok('structureはsystemなし', lastPayload.system === undefined)
}
{
  const res = mockRes()
  mockText = '{"updates":[{"memory_type":"injury","memories":["左肩に痛み"]}]}'
  await handler(req({ body: { message: '左肩が痛い', assistantResponse: '無理するな', format: 'memory', memories: [] } }), res)
  ok('memory→200+updates配列', res.statusCode === 200 && res.body.updates[0].memory_type === 'injury')
}
{
  const res = mockRes()
  mockText = 'これはJSONではない'
  await handler(req({ body: { message: '左肩が痛い', format: 'memory' } }), res)
  ok('memory解析失敗→空updates', res.statusCode === 200 && Array.isArray(res.body.updates) && res.body.updates.length === 0)
}

console.log('— エラー伝播 —')
{
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => '{"error":"auth"}' })
  const res = mockRes()
  await handler(req({ body: { message: 'hi' } }), res)
  ok('上流401→500+メッセージ', res.statusCode === 500 && /anthropic 401/.test(res.body.error))
  installFetchMock()
}

console.log('— レート制限 —')
{
  let last = null
  for (let i = 0; i < 31; i++) {
    last = mockRes()
    await handler(req({ headers: { 'x-forwarded-for': '9.9.9.9' }, body: { message: 'hi' } }), last)
  }
  ok('メモリ版: 31回目→429', last.statusCode === 429)
}
{
  process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.test'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
  upstashCount = 0
  upstashCalls = 0
  mockText = 'ok'
  let last = null
  for (let i = 0; i < 31; i++) {
    last = mockRes()
    await handler(req({ headers: { 'x-forwarded-for': '8.8.8.8' }, body: { message: 'hi' } }), last)
  }
  ok('Upstash版: 31回目→429', last.statusCode === 429)
  ok('Upstashが毎回呼ばれる', upstashCalls === 31, `calls=${upstashCalls}`)
  // Upstash通信失敗時はメモリ版にフォールバック（= 新規IPなら通る）
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('upstash.test')) throw new Error('down')
    lastPayload = JSON.parse(opts.body)
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'ok' }] }) }
  }
  const res = mockRes()
  await handler(req({ headers: { 'x-forwarded-for': '7.7.7.7' }, body: { message: 'hi' } }), res)
  ok('Upstash障害→フォールバックで200', res.statusCode === 200)
  installFetchMock()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

console.log(`\n結果: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
