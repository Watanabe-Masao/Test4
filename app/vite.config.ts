import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'

/** ビルド時に public/sw.js の __BUILD_VERSION__ をタイムスタンプで置換するプラグイン */
function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    writeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      const content = readFileSync(swPath, 'utf-8')
      const version = `build-${Date.now()}`
      writeFileSync(swPath, content.replace("'__BUILD_VERSION__'", `'${version}'`))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), swVersionPlugin()],
  base: process.env.VITE_BASE_PATH ?? '/Test4/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
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
    exclude: [
      '@duckdb/duckdb-wasm',
      'factor-decomposition-wasm',
      'gross-profit-wasm',
      'budget-analysis-wasm',
      'forecast-wasm',
      'time-slot-wasm',
    ],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [
        'factor-decomposition-wasm',
        'gross-profit-wasm',
        'budget-analysis-wasm',
        'forecast-wasm',
        'time-slot-wasm',
      ],
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
      external: [
        'factor-decomposition-wasm',
        'gross-profit-wasm',
        'budget-analysis-wasm',
        'forecast-wasm',
        'time-slot-wasm',
      ],
    },
  },
})
