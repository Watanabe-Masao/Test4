/**
 * Service Worker 更新シグナル
 *
 * React ツリー外（main.tsx）から React 内（useAppLifecycle）へ
 * SW 更新通知を伝達する軽量シグナル。
 *
 * useSyncExternalStore パターンで購読する。
 *
 * @responsibility R:unclassified
 */

let swUpdateApplying = false
const listeners = new Set<() => void>()

function emitChange(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** main.tsx の registerServiceWorker コールバックから呼ぶ */
export function notifySwUpdate(): void {
  swUpdateApplying = true
  emitChange()
}

/** useSyncExternalStore 用: subscribe */
export function subscribeSwUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** useSyncExternalStore 用: getSnapshot */
export function getSwUpdateSnapshot(): boolean {
  return swUpdateApplying
}

/** テスト用: リセット */
export function resetSwUpdateSignal(): void {
  swUpdateApplying = false
  listeners.clear()
}
