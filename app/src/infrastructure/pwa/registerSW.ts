/**
 * Phase 7.1: Service Worker 登録ユーティリティ
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/Test4/sw.js')
      .then((registration) => {
        // 新しい SW が利用可能になったらページをリロード促す
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              console.info('[SW] New version available. Refresh to update.')
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  })
}
