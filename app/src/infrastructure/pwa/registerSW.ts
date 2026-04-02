/**
 * Service Worker 登録ユーティリティ
 *
 * - updateViaCache: 'none' で SW ファイル自体のブラウザキャッシュをバイパス
 * - 定期的な更新チェック（60分間隔）
 * - 新バージョン検出時の通知 → 遅延リロード
 */

/** 更新チェック間隔 (ms) */
const UPDATE_INTERVAL = 60 * 60 * 1000

/** リロード前の猶予時間 (ms) — ユーザーに更新適用中であることを知らせる */
const RELOAD_DELAY = 1200

/** Service Worker 登録時のコールバック */
export interface ServiceWorkerCallbacks {
  /** SW 更新適用直前に呼ばれる（リロード前通知用） */
  readonly onUpdateApplying?: () => void
}

export function registerServiceWorker(callbacks?: ServiceWorkerCallbacks): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return

  // 新 SW がコントロールを取得したら通知 → 遅延リロード（初回インストールは除外）
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      callbacks?.onUpdateApplying?.()
      setTimeout(() => window.location.reload(), RELOAD_DELAY)
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then((registration) => {
        // 定期的に SW の更新をチェック
        setInterval(() => {
          registration.update().catch((err) => console.warn('[SW] 更新チェック失敗:', err))
        }, UPDATE_INTERVAL)
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  })
}
