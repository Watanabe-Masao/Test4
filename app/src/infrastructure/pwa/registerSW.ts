/**
 * Service Worker 登録ユーティリティ
 *
 * - updateViaCache: 'none' で SW ファイル自体のブラウザキャッシュをバイパス
 * - 定期的な更新チェック（60分間隔）
 * - 新バージョン検出時の自動リロード
 */

/** 更新チェック間隔 (ms) */
const UPDATE_INTERVAL = 60 * 60 * 1000

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return

  // 新 SW がコントロールを取得したら自動リロード（初回インストールは除外）
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      window.location.reload()
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/Test4/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // 定期的に SW の更新をチェック
        setInterval(() => {
          registration.update().catch(() => {})
        }, UPDATE_INTERVAL)
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  })
}
