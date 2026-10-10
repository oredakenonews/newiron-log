#!/usr/bin/env node
// TestFlight のフィードバック（コメント・スクリーンショット・クラッシュ）を App Store Connect API で読み出す。
// 結果は testflight-feedback/（git 管理外）に置く：feedback.md（新しい順）と、画像・クラッシュログ。
// 前回読んだものは seen.json に覚えておき、新しいものに「🆕」を付ける。
//
// 認証: .env.asc の ASC_KEY_ID / ASC_ISSUER_ID を優先（なければ
// ~/.appstoreconnect/private_keys/ の最初のキーと ~/.appstoreconnect/issuer_id）。
//
// 使い方: npm run ios:feedback
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'testflight-feedback')
const ASC_DIR = path.join(os.homedir(), '.appstoreconnect')
const KEYS_DIR = path.join(ASC_DIR, 'private_keys')
const API = 'https://api.appstoreconnect.apple.com'
const BUNDLE_ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8')).appId

function fail(msg) {
  console.error('✖ ' + msg)
  process.exit(1)
}

// .env.asc（KEY=VALUE 形式）を環境変数に補完
const envFile = path.join(ROOT, '.env.asc')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^(\w+)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// --- 認証（ES256 の JWT。20分まで有効） ---
function makeToken() {
  let kid = process.env.ASC_KEY_ID
  if (!kid) {
    const keyFile = fs.existsSync(KEYS_DIR) && fs.readdirSync(KEYS_DIR).find((f) => /^AuthKey_\w+\.p8$/.test(f))
    if (!keyFile) fail(`キーがありません：${KEYS_DIR}/AuthKey_<キーID>.p8 を置いてください`)
    kid = keyFile.match(/^AuthKey_(\w+)\.p8$/)[1]
  }
  const issuerFile = path.join(ASC_DIR, 'issuer_id')
  const iss = process.env.ASC_ISSUER_ID || (fs.existsSync(issuerFile) && fs.readFileSync(issuerFile, 'utf8').trim())
  if (!iss) fail(`Issuer ID がありません：.env.asc か ${issuerFile} に書いてください`)

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64({ alg: 'ES256', kid, typ: 'JWT' })}.${b64({ iss, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' })}`
  const key = fs.readFileSync(path.join(KEYS_DIR, `AuthKey_${kid}.p8`), 'utf8')
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' })
  return `${unsigned}.${sig.toString('base64url')}`
}

const TOKEN = makeToken()

async function get(urlOrPath) {
  const url = urlOrPath.startsWith('http') ? urlOrPath : API + urlOrPath
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })
  if (!res.ok) fail(`${res.status} ${url}\n${await res.text()}`)
  return res.json()
}

// links.next をたどって全部集める。included も合わせて返す
async function getAll(p) {
  const data = []
  const included = []
  let next = p
  while (next) {
    const page = await get(next)
    data.push(...page.data)
    included.push(...(page.included || []))
    next = page.links?.next
  }
  return { data, included }
}

async function download(url, file) {
  const res = await fetch(url)
  if (!res.ok) return false
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  return true
}

// --- 読み出し ---
const apps = await get(`/v1/apps?filter[bundleId]=${BUNDLE_ID}`)
const app = apps.data[0]
if (!app) fail(`アプリが見つかりません（${BUNDLE_ID}）`)

const shots = await getAll(`/v1/apps/${app.id}/betaFeedbackScreenshotSubmissions?include=build&sort=-createdDate&limit=50`)
const crashes = await getAll(`/v1/apps/${app.id}/betaFeedbackCrashSubmissions?include=build&sort=-createdDate&limit=50`)

// ビルド → 「1.0 (202610101857)」
const builds = new Map()
for (const b of [...shots.included, ...crashes.included].filter((x) => x.type === 'builds')) builds.set(b.id, b)
const versionOf = new Map()
async function buildLabel(item) {
  const id = item.relationships?.build?.data?.id
  if (!id) return '?'
  if (!versionOf.has(id)) {
    const pre = await get(`/v1/builds/${id}/preReleaseVersion`).catch(() => null)
    versionOf.set(id, `${pre?.data?.attributes?.version ?? '?'} (${builds.get(id)?.attributes?.version ?? id})`)
  }
  return versionOf.get(id)
}

fs.mkdirSync(OUT, { recursive: true })
const seenFile = path.join(OUT, 'seen.json')
const seen = new Set(fs.existsSync(seenFile) ? JSON.parse(fs.readFileSync(seenFile, 'utf8')) : [])

const items = [
  ...shots.data.map((d) => ({ kind: 'shot', d })),
  ...crashes.data.map((d) => ({ kind: 'crash', d })),
].sort((a, b) => (a.d.attributes.createdDate < b.d.attributes.createdDate ? 1 : -1))

const jst = (iso) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const lines = [`# TestFlight のフィードバック`, '', `読み出し：${jst(new Date().toISOString())}（新しい順。🆕＝前回から増えたもの）`, '']
let newCount = 0
for (const { kind, d } of items) {
  const a = d.attributes
  const isNew = !seen.has(d.id)
  if (isNew) newCount++
  lines.push(`## ${isNew ? '🆕 ' : ''}${jst(a.createdDate)}　${kind === 'crash' ? '💥 クラッシュ' : '📝'}　${await buildLabel(d)}`)
  lines.push('')
  lines.push(`- 端末：${a.deviceModel ?? '?'}（${a.devicePlatform ?? ''} ${a.osVersion ?? ''}）`)
  if (a.comment) lines.push('', ...a.comment.split('\n').map((l) => `> ${l}`))

  if (kind === 'shot') {
    for (const [i, s] of (a.screenshots || []).entries()) {
      const file = `${d.id}-${i + 1}.jpg`
      const full = path.join(OUT, file)
      if (!fs.existsSync(full)) {
        const url = s.url.replace('{w}', s.width).replace('{h}', s.height).replace('{f}', 'jpg')
        if (!(await download(url, full))) { lines.push('', `（画像 ${i + 1} を取れませんでした）`); continue }
      }
      lines.push('', `![画像 ${i + 1}](${file})`)
    }
  } else {
    const file = `${d.id}-crash.txt`
    const full = path.join(OUT, file)
    if (!fs.existsSync(full)) {
      const log = await get(`/v1/betaFeedbackCrashSubmissions/${d.id}/crashLog`).catch(() => null)
      if (log?.data?.attributes?.logText) fs.writeFileSync(full, log.data.attributes.logText)
    }
    if (fs.existsSync(full)) lines.push('', `クラッシュログ：[${file}](${file})`)
  }
  lines.push('')
}

fs.writeFileSync(path.join(OUT, 'feedback.md'), lines.join('\n'))
fs.writeFileSync(seenFile, JSON.stringify(items.map((x) => x.d.id), null, 2))
console.log(`✔ ${items.length} 件（新しいもの ${newCount} 件）→ ${path.relative(ROOT, path.join(OUT, 'feedback.md'))}`)
