import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerServiceWorker } from '@/infrastructure/pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: Service Worker 登録（本番ビルドのみ）
if (import.meta.env.PROD) {
  registerServiceWorker()
}

// WASM: factorDecomposition エンジン初期化 + 観測ヘルパー登録（DEV のみ）
if (import.meta.env.DEV) {
  import('@/application/services/wasmEngine').then(({ initFactorDecompositionWasm }) => {
    initFactorDecompositionWasm()
  })
  import('@/application/services/dualRunObserver').then(({ dualRunStatsHandler }) => {
    // DevTools: __dualRunStats() / __dualRunStats('reset') / __dualRunStats('log')
    ;(window as unknown as Record<string, unknown>).__dualRunStats = dualRunStatsHandler
  })
}
