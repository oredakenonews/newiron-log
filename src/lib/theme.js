// テーマ切替（ライト基本＋簡易ダーク）。端末ローカルの好み設定なのでlocalStorageに保存
// （プロフィールのエクスポート/インポート対象にはしない）。
import { Capacitor } from '@capacitor/core'

const KEY = 'iron-theme'

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* private mode等は無視 */ }
  if (Capacitor.isNativePlatform()) {
    // ステータスバーの文字色をテーマに合わせる（失敗しても無害）
    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: t === 'dark' ? Style.Dark : Style.Light }))
      .catch(() => {})
  }
}

export function initTheme() {
  applyTheme(getTheme())
}
