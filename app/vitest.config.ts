import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
// @ts-expect-error — JS module without declaration file
import { resolveProjectOverlayRoot } from './scripts/resolve-project-overlay.mjs'

/**
 * `@project-overlay/*` alias ターゲットは CURRENT_PROJECT.md + project.json
 * 経由で解決する（C1: project 固定パス一元化）。
 */
const projectOverlayRoot: string = resolveProjectOverlayRoot(__dirname)

// vitest（jsdom 環境）では常に型付きモックを使用する。
// jsdom は WebAssembly.instantiate を完全サポートしないため、
// 実 WASM のテストは Rust 側の wasm-pack test で行う。
const wasmAliases: Record<string, string> = {
  'factor-decomposition-wasm': resolve(
    __dirname,
    'src/test/__mocks__/factorDecompositionWasmMock.ts',
  ),
  'gross-profit-wasm': resolve(__dirname, 'src/test/__mocks__/grossProfitWasmMock.ts'),
  'budget-analysis-wasm': resolve(__dirname, 'src/test/__mocks__/budgetAnalysisWasmMock.ts'),
  'forecast-wasm': resolve(__dirname, 'src/test/__mocks__/forecastWasmMock.ts'),
  'time-slot-wasm': resolve(__dirname, 'src/test/__mocks__/timeSlotWasmMock.ts'),
  'pi-value-wasm': resolve(__dirname, 'src/test/__mocks__/piValueWasmMock.ts'),
  'customer-gap-wasm': resolve(__dirname, 'src/test/__mocks__/customerGapWasmMock.ts'),
  'remaining-budget-rate-wasm': resolve(
    __dirname,
    'src/test/__mocks__/remainingBudgetRateWasmMock.ts',
  ),
  'observation-period-wasm': resolve(__dirname, 'src/test/__mocks__/observationPeriodWasmMock.ts'),
  'pin-intervals-wasm': resolve(__dirname, 'src/test/__mocks__/pinIntervalsWasmMock.ts'),
  'inventory-calc-wasm': resolve(__dirname, 'src/test/__mocks__/inventoryCalcWasmMock.ts'),
  'sensitivity-wasm': resolve(__dirname, 'src/test/__mocks__/sensitivityWasmMock.ts'),
  'correlation-wasm': resolve(__dirname, 'src/test/__mocks__/correlationWasmMock.ts'),
  'moving-average-wasm': resolve(__dirname, 'src/test/__mocks__/movingAverageWasmMock.ts'),
  'trend-analysis-wasm': resolve(__dirname, 'src/test/__mocks__/trendAnalysisWasmMock.ts'),
  'dow-gap-wasm': resolve(__dirname, 'src/test/__mocks__/dowGapWasmMock.ts'),
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@project-overlay': projectOverlayRoot,
      '@app-domain': resolve(__dirname, '../app-domain'),
      '@tools/architecture-health': resolve(__dirname, '../tools/architecture-health/src'),
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
      include: [
        'src/domain/**',
        'src/infrastructure/**',
        'src/application/**',
        'src/presentation/**',
      ],
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
        // Phase 3 観測期間中の暫定 baseline (2026-04-13 設定)
        // - presentation/** を coverage include に追加した直後の現実値 (35.01%)
        //   を ratchet-down baseline として設定
        // - presentation 層の component test 追加と並行して段階的に引き上げる
        //   (35 → 45 → 55 → 65 → 70)
        // - 詳細: projects/presentation-quality-hardening/HANDOFF.md §2 Step 4
        // - 不可侵原則 #1 (機械的引き上げ禁止) は逆方向 (引き下げ) には適用されない
        lines: 35,
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
