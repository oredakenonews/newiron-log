// ローカルタイムゾーン基準の日付ユーティリティ。
// toISOString()はUTCになるため、JSTの0:00〜8:59に記録すると前日扱いになるバグの元。
// 日付文字列(YYYY-MM-DD)は必ずここを経由すること。

export function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ISO日時 → 「今日」「昨日」「10/12」（ルーチンの前回実施日表示用。ローカル日付で判定）
export function shortDayLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const today = localDateStr()
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const ds = localDateStr(d)
  if (ds === today) return '今日'
  if (ds === localDateStr(y)) return '昨日'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 月曜始まりの今週7日分のローカル日付
export function getWeekDates() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return localDateStr(d)
  })
}
