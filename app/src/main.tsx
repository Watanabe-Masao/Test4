import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerServiceWorker } from '@/infrastructure/pwa'
import { notifySwUpdate } from '@/application/lifecycle/swUpdateSignal'
// 副作用: ページ削除時の widget レイアウト クリーンアップ
import '@/application/adapters/pageStoreCleanupEffect'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: Service Worker 登録（本番ビルドのみ）
if (import.meta.env.PROD) {
  registerServiceWorker({ onUpdateApplying: notifySwUpdate })
}

// WASM: 全モジュール初期化 + 観測ヘルパー登録（DEV のみ）
if (import.meta.env.DEV) {
  import('@/application/services/wasmEngine').then(({ initAllWasmModules }) => {
    initAllWasmModules()
  })
  import('@/application/services/observationEntry').then(({ runObservationHandler }) => {
    // E2E observation: __runObservation({ engine: '...', data: {...} })
    ;(window as unknown as Record<string, unknown>).__runObservation = runObservationHandler
  })
}
