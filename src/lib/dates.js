// ローカルタイムゾーン基準の日付ユーティリティ。
// toISOString()はUTCになるため、JSTの0:00〜8:59に記録すると前日扱いになるバグの元。
// 日付文字列(YYYY-MM-DD)は必ずここを経由すること。

export function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
