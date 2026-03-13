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

// WASM: factorDecomposition エンジン初期化（DEV のみ、非同期 fire-and-forget）
if (import.meta.env.DEV) {
  import('@/application/services/wasmEngine').then(({ initFactorDecompositionWasm }) => {
    initFactorDecompositionWasm()
  })
}
