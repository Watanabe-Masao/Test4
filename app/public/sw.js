/**
 * Service Worker
 *
 * オフラインでも静的アセットをキャッシュし、アプリを利用可能にする。
 * - Cache-first: Vite ハッシュ付きアセット (/assets/ 配下 — ファイル名にコンテンツハッシュ含む)
 * - Network-first: ナビゲーション・非ハッシュアセット・その他
 * - ビルド時にバージョンが注入され、デプロイごとに古いキャッシュを自動削除
 */

// __BUILD_VERSION__ はビルド時に Vite プラグインで置換される
const CACHE_VERSION = '__BUILD_VERSION__'
const STATIC_CACHE = `shiire-arari-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `shiire-arari-runtime-${CACHE_VERSION}`

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

  // Vite ハッシュ付きアセット (/assets/ 配下) → Cache-first
  // Vite はファイル名にコンテンツハッシュを含めるため、内容が変われば URL も変わる。
  // 同じ URL は常に同じ内容を返すので Cache-first で安全。
  if (url.pathname.includes('/assets/')) {
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

  // その他（非ハッシュ静的アセット含む） → Network-first with cache fallback
  // sw.js, manifest.json, favicon 等はデプロイで内容が変わる可能性があるため、
  // 常にネットワークから最新を取得し、オフライン時のみキャッシュを使う。
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
