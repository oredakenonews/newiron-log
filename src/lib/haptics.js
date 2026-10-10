import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

// ネイティブ（iOS）でのみ振動。Web（Vercel本番）ではno-op。
const isNative = Capacitor.isNativePlatform()

// ホイールピッカーの1目盛りごとのカチカチ感
export function hapticTick() {
  if (!isNative) return
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

// ボタン決定・セット完了などの確定操作
export function hapticImpact() {
  if (!isNative) return
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
}

// 保存成功
export function hapticSuccess() {
  if (!isNative) return
  Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

// エラー
export function hapticError() {
  if (!isNative) return
  Haptics.notification({ type: NotificationType.Error }).catch(() => {})
}
