import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
// @ts-expect-error — JS module without declaration file
import { resolveProjectOverlayRoot } from './scripts/resolve-project-overlay.mjs'

/**
 * `@project-overlay/*` の alias ターゲットは CURRENT_PROJECT.md + project.json
 * から解決する（C1: project 固定パス一元化）。
 * project 切替時の変更点は CURRENT_PROJECT.md の 1 行に閉じる。
 */
const projectOverlayRoot: string = resolveProjectOverlayRoot(__dirname)

/** ビルド時に public/sw.js の __BUILD_VERSION__ と __BASE_PATH__ を置換するプラグイン */
function swVersionPlugin(): Plugin {
  const basePath = process.env.VITE_BASE_PATH ?? '/'
  return {
    name: 'sw-version',
    apply: 'build',
    writeBundle() {
      // sw.js: バージョン + base path 置換
      const swPath = resolve(__dirname, 'dist/sw.js')
      const swContent = readFileSync(swPath, 'utf-8')
      const version =
        process.env.GITHUB_SHA?.slice(0, 8) ??
        process.env.COMMIT_SHA?.slice(0, 8) ??
        `dev-${Date.now()}`
      const swReplaced = swContent
        .replace("'__BUILD_VERSION__'", `'${version}'`)
        .replace(/'__BASE_PATH__'/g, `'${basePath}'`)
      if (swReplaced.includes("'__BUILD_VERSION__'") || swReplaced.includes("'__BASE_PATH__'")) {
        throw new Error('[swVersionPlugin] Unreplaced placeholders found in sw.js')
      }
      writeFileSync(swPath, swReplaced)

      // manifest.json: base path 置換
      const manifestPath = resolve(__dirname, 'dist/manifest.json')
      const manifestContent = readFileSync(manifestPath, 'utf-8')
      const manifestReplaced = manifestContent.replace(/__BASE_PATH__/g, basePath)
      if (manifestReplaced.includes('__BASE_PATH__')) {
        throw new Error('[swVersionPlugin] Unreplaced placeholders found in manifest.json')
      }
      writeFileSync(manifestPath, manifestReplaced)
    },
  }
}

/**
 * WASM パッケージの external 設定（1 箇所で定義）
 *
 * 新しい WASM crate を追加する場合はここに 1 行追加するだけ。
 * optimizeDeps.exclude / build.rollupOptions.external / worker.rollupOptions.external
 * の 3 箇所で共有される。
 */
const WASM_EXTERNAL_PACKAGES = [
  'factor-decomposition-wasm',
  'gross-profit-wasm',
  'budget-analysis-wasm',
  'forecast-wasm',
  'time-slot-wasm',
  'pi-value-wasm',
  'customer-gap-wasm',
  'remaining-budget-rate-wasm',
  'observation-period-wasm',
  'pin-intervals-wasm',
  'inventory-calc-wasm',
  'sensitivity-wasm',
  'correlation-wasm',
  'moving-average-wasm',
  'trend-analysis-wasm',
  'dow-gap-wasm',
] as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), swVersionPlugin()],
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@project-overlay': projectOverlayRoot,
      '@app-domain': resolve(__dirname, '../app-domain'),
      '@tools/architecture-health': resolve(__dirname, '../tools/architecture-health/src'),
    },
  },
  server: {
    proxy: {
      '/jma-api': {
        target: 'https://www.jma.go.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jma-api/, ''),
      },
      '/jma-data': {
        target: 'https://www.data.jma.go.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jma-data/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm', ...WASM_EXTERNAL_PACKAGES],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [...WASM_EXTERNAL_PACKAGES],
      output: {
        manualChunks: {
          'vendor-xlsx': ['xlsx'],
          'vendor-styled': ['styled-components'],
          'vendor-table': ['@tanstack/react-table'],
          'vendor-router': ['react-router-dom'],
          'vendor-state': ['zustand'],
          'vendor-echarts': [
            'echarts/core',
            'echarts/charts',
            'echarts/components',
            'echarts/renderers',
          ],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  worker: {
    format: 'es' as const,
    rollupOptions: {
      external: [...WASM_EXTERNAL_PACKAGES],
    },
  },
})
