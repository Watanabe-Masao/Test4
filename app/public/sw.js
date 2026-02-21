/**
 * Phase 7.1: Service Worker
 *
 * オフラインでも静的アセットをキャッシュし、アプリを利用可能にする。
 * - Cache-first: 静的アセット (JS, CSS, HTML, フォント, 画像)
 * - Network-first: API リクエスト (将来のクラウド対応)
 * - バージョン管理による古いキャッシュの自動削除
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `shiire-arari-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `shiire-arari-runtime-${CACHE_VERSION}`

/** キャッシュ対象の静的アセット拡張子 */
const STATIC_EXTENSIONS = ['.js', '.css', '.html', '.woff2', '.woff', '.ttf', '.png', '.svg', '.ico', '.json']

/** キャッシュ対象外のパス */
const CACHE_EXCLUDES = ['/api/', '/auth/']

// ─── Install: 基本アセットのプリキャッシュ ─────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/Test4/',
        '/Test4/index.html',
      ])
    }).then(() => {
      // 新しい SW を即座にアクティブ化
      return self.skipWaiting()
    })
  )
})

// ─── Activate: 古いキャッシュを削除 ──────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    }).then(() => {
      // 既存のクライアントを即座に制御
      return self.clients.claim()
    })
  )
})

// ─── Fetch: キャッシュ戦略 ──────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 同一オリジンのみキャッシュ
  if (url.origin !== location.origin) return

  // キャッシュ対象外
  if (CACHE_EXCLUDES.some((path) => url.pathname.includes(path))) return

  // ナビゲーションリクエスト → Network-first (SPA のため index.html を返す)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match('/Test4/index.html').then((r) => r || new Response('Offline', { status: 503 })))
    )
    return
  }

  // 静的アセット → Cache-first
  const isStaticAsset = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // その他 → Network-first with runtime cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then((r) => r || new Response('Offline', { status: 503 })))
  )
})
