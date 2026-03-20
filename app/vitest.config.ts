import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync } from 'fs'

// WASM pkg/ ディレクトリが存在すれば実 WASM を使用（CI 環境）。
// 存在しなければ型付きモックに解決する（ローカル開発環境）。
const wasmPkgExists = existsSync(resolve(__dirname, '../wasm/factor-decomposition/pkg'))

const wasmAliases: Record<string, string> = wasmPkgExists
  ? {}
  : {
      'factor-decomposition-wasm': resolve(
        __dirname,
        'src/test/__mocks__/factorDecompositionWasmMock.ts',
      ),
      'gross-profit-wasm': resolve(__dirname, 'src/test/__mocks__/grossProfitWasmMock.ts'),
      'budget-analysis-wasm': resolve(__dirname, 'src/test/__mocks__/budgetAnalysisWasmMock.ts'),
      'forecast-wasm': resolve(__dirname, 'src/test/__mocks__/forecastWasmMock.ts'),
    }

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      ...wasmAliases,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/infrastructure/**', 'src/application/**'],
      exclude: [
        '**/*.d.ts',
        '**/index.ts',
        // バレル re-export ファイル（テスト対象外）
        'src/application/hooks/analytics.ts',
        'src/application/hooks/calculation.ts',
        'src/application/hooks/data.ts',
        'src/application/hooks/ui.ts',
        // Worker ファイル（ブラウザ/Worker コンテキスト専用、vitest でテスト不能）
        'src/application/workers/calculationWorker.ts',
        'src/application/workers/reportExportWorker.ts',
        'src/infrastructure/duckdb/worker/duckdbWorker.ts',
        'src/infrastructure/pwa/registerSW.ts',
      ],
      thresholds: {
        lines: 55,
        'src/domain/calculations/**': {
          lines: 80,
        },
        'src/application/usecases/explanation/**': {
          lines: 70,
        },
      },
    },
  },
})
