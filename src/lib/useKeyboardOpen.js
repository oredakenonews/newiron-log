import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

// ソフトキーボードの表示状態。iOSではKeyboardプラグインのイベント、
// Webでは入力欄のフォーカスで近似する（入力中にタブバー等を畳んで表示領域を確保するため）。
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handles = []
      let cancelled = false
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        if (cancelled) return
        handles.push(Keyboard.addListener('keyboardWillShow', () => setOpen(true)))
        handles.push(Keyboard.addListener('keyboardWillHide', () => setOpen(false)))
      }).catch(() => {})
      return () => {
        cancelled = true
        handles.forEach(h => Promise.resolve(h).then(x => x?.remove?.()))
      }
    }

    const isField = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'file', 'button'].includes(el.type)))
    const onIn = e => { if (isField(e.target)) setOpen(true) }
    // 送信ボタン等への移動でも一瞬blurするため、次のフレームで実際のフォーカス先を見る
    const onOut = () => requestAnimationFrame(() => setOpen(isField(document.activeElement)))
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
    }
  }, [])

  return open
}
