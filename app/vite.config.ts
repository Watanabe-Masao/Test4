import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Test4/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
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
        },
      },
    },
  },
  worker: {
    format: 'es' as const,
  },
})
