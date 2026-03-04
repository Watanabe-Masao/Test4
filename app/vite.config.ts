import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react(), swVersionPlugin()],
  base: '/Test4/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-recharts': ['recharts'],
          'vendor-xlsx': ['xlsx'],
          'vendor-styled': ['styled-components'],
          'vendor-table': ['@tanstack/react-table'],
          'vendor-router': ['react-router-dom'],
          'vendor-state': ['zustand', 'immer'],
          'vendor-duckdb': ['@duckdb/duckdb-wasm'],
        },
      },
    },
  },
  worker: {
    format: 'es' as const,
  },
})
