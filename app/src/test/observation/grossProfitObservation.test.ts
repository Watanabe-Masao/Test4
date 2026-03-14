/**
 * grossProfit 自動観測ハーネス
 *
 * 8 関数 × 4 フィクスチャで dual-run compare pipeline を自動検証する。
 * WASM mock を TS と同一結果に設定し、clean verdict を確認する。
 * 全フィクスチャで pass / warning / fail を機械判定する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateInvMethod as calculateInvMethodDirect,
  calculateEstMethod as calculateEstMethodDirect,
  calculateCoreSales as calculateCoreSalesDirect,
  calculateDiscountRate as calculateDiscountRateDirect,
  calculateDiscountImpact as calculateDiscountImpactDirect,
  calculateMarkupRates as calculateMarkupRatesDirect,
  calculateTransferTotals as calculateTransferTotalsDirect,
  calculateInventoryCost as calculateInventoryCostDirect,
} from '@/domain/calculations/grossProfit'
import { setExecutionMode } from '@/application/services/wasmEngine'
import * as wasmEngine from '@/application/services/wasmEngine'
import { resetObserver, buildRunResult } from './observationRunner'
import { judgeObservation } from './observationAssertions'
import { buildJsonReport } from './observationReport'
import { ALL_FIXTURES, type GrossProfitFixture } from './fixtures/grossProfitFixtures'

/* ── WASM mock: TS passthrough ── */

vi.mock('@/application/services/grossProfitWasm', () => ({
  calculateInvMethodWasm: vi.fn(),
  calculateEstMethodWasm: vi.fn(),
  calculateCoreSalesWasm: vi.fn(),
  calculateDiscountRateWasm: vi.fn(),
  calculateDiscountImpactWasm: vi.fn(),
  calculateMarkupRatesWasm: vi.fn(),
  calculateTransferTotalsWasm: vi.fn(),
  calculateInventoryCostWasm: vi.fn(),
}))

import {
  calculateInvMethod,
  calculateEstMethod,
  calculateCoreSales,
  calculateDiscountRate,
  calculateDiscountImpact,
  calculateMarkupRates,
  calculateTransferTotals,
  calculateInventoryCost,
} from '@/application/services/grossProfitBridge'
import {
  calculateInvMethodWasm,
  calculateEstMethodWasm,
  calculateCoreSalesWasm,
  calculateDiscountRateWasm,
  calculateDiscountImpactWasm,
  calculateMarkupRatesWasm,
  calculateTransferTotalsWasm,
  calculateInventoryCostWasm,
} from '@/application/services/grossProfitWasm'

const EXPECTED_FUNCTIONS = [
  'calculateInvMethod',
  'calculateEstMethod',
  'calculateCoreSales',
  'calculateDiscountRate',
  'calculateDiscountImpact',
  'calculateMarkupRates',
  'calculateTransferTotals',
  'calculateInventoryCost',
] as const

function setupCleanMocks(): void {
  vi.mocked(calculateInvMethodWasm).mockImplementation((input) => calculateInvMethodDirect(input))
  vi.mocked(calculateEstMethodWasm).mockImplementation((input) => calculateEstMethodDirect(input))
  vi.mocked(calculateCoreSalesWasm).mockImplementation((a, b, c) =>
    calculateCoreSalesDirect(a, b, c),
  )
  vi.mocked(calculateDiscountRateWasm).mockImplementation((a, b) =>
    calculateDiscountRateDirect(a, b),
  )
  vi.mocked(calculateDiscountImpactWasm).mockImplementation((input) =>
    calculateDiscountImpactDirect(input),
  )
  vi.mocked(calculateMarkupRatesWasm).mockImplementation((input) =>
    calculateMarkupRatesDirect(input),
  )
  vi.mocked(calculateTransferTotalsWasm).mockImplementation((input) =>
    calculateTransferTotalsDirect(input),
  )
  vi.mocked(calculateInventoryCostWasm).mockImplementation((a, b) =>
    calculateInventoryCostDirect(a, b),
  )
}

function runAllFunctions(f: GrossProfitFixture): void {
  calculateInvMethod(f.invMethod)
  calculateEstMethod(f.estMethod)
  calculateCoreSales(
    f.coreSales.totalSales,
    f.coreSales.flowerSalesPrice,
    f.coreSales.directProduceSalesPrice,
  )
  calculateDiscountRate(f.discountRate.discountAmount, f.discountRate.salesAmount)
  calculateDiscountImpact(f.discountImpact)
  calculateMarkupRates(f.markupRates)
  calculateTransferTotals(f.transferTotals)
  calculateInventoryCost(f.inventoryCost.totalCost, f.inventoryCost.deliverySalesCost)
}

/* ── テスト ── */

describe('grossProfit 自動観測ハーネス', () => {
  beforeEach(() => {
    resetObserver()
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('全 8 関数が呼ばれ、verdict が clean', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('grossProfit', fixture.name)
        expect(result.summary.totalCalls).toBeGreaterThanOrEqual(8)
        expect(result.summary.verdict).toBe('clean')
      })

      it('expected call coverage を満たす', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('grossProfit', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        expect(judgment.status).not.toBe('fail')
      })

      it('JSON report が生成できる', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('grossProfit', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        const report = buildJsonReport(result, judgment, EXPECTED_FUNCTIONS)
        expect(report.engine).toBe('grossProfit')
        expect(report.fixture).toBe(fixture.name)
        expect(report.status).not.toBe('fail')
        expect(Object.keys(report.callCounts)).toHaveLength(8)
      })
    })
  }

  describe('全フィクスチャ横断: invariant 保持', () => {
    it('GP-INV-1: COGS = opening + purchases - closing (non-null)', () => {
      const f = ALL_FIXTURES[0] // normal
      const result = calculateInvMethod(f.invMethod)
      if (result.cogs !== null) {
        expect(result.cogs).toBe(
          f.invMethod.openingInventory! +
            f.invMethod.totalPurchaseCost -
            f.invMethod.closingInventory!,
        )
      }
    })

    it('GP-INV-4: null inventory → null outputs', () => {
      const f = ALL_FIXTURES[1] // null-zero-missing
      const result = calculateInvMethod(f.invMethod)
      expect(result.cogs).toBeNull()
      expect(result.grossProfit).toBeNull()
      expect(result.grossProfitRate).toBeNull()
    })

    it('GP-INV-11: transferTotals = sum of 4 directions', () => {
      for (const f of ALL_FIXTURES) {
        const result = calculateTransferTotals(f.transferTotals)
        expect(result.transferPrice).toBe(
          f.transferTotals.interStoreInPrice +
            f.transferTotals.interStoreOutPrice +
            f.transferTotals.interDepartmentInPrice +
            f.transferTotals.interDepartmentOutPrice,
        )
      }
    })
  })

  describe('mismatch 検出の動作確認', () => {
    it('WASM が異なる値を返す → warning or fail', () => {
      vi.mocked(calculateInvMethodWasm).mockReturnValue({
        cogs: 99999,
        grossProfit: 99999,
        grossProfitRate: 0.99999,
      })
      calculateInvMethod(ALL_FIXTURES[0].invMethod)
      const result = buildRunResult('grossProfit', 'mismatch-test')
      expect(result.summary.totalMismatches).toBeGreaterThan(0)
    })
  })
})
