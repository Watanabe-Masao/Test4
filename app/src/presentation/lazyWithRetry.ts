/**
 * チャンク読込リトライ付き lazy()
 *
 * デプロイ後にブラウザが古いチャンクハッシュを参照して 404 になる問題に対処する。
 * 失敗時に1回だけページをリロードして新しい index.html を取得する。
 * sessionStorage フラグで無限リロードループを防止する。
 */
import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'shiire-arari-chunk-reload'

export function lazyWithRetry<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error: unknown) => {
      // 既にリロード済みなら無限ループ防止でエラーを投げる
      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG)
      if (alreadyReloaded) {
        sessionStorage.removeItem(RELOAD_FLAG)
        return Promise.reject(error)
      }

      // チャンク読込エラーの場合のみリロード
      const isError = error instanceof Error
      const message = isError ? error.message : String(error)
      const isChunkError =
        (isError && error.name === 'ChunkLoadError') ||
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Loading chunk') ||
        message.includes('Loading CSS chunk')

      if (isChunkError) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // リロード中は解決しない Promise を返す（画面遷移するため）
        return new Promise(() => {})
      }

      return Promise.reject(error)
    }),
  )
}
