/**
 * grossProfit 不変条件テスト（authoritative）
 *
 * grossProfit は WASM authoritative に昇格済み。
 * 6 numeric 関数は WASM 経由、2 CalculationResult 関数は TS authoritative。
 * 4 フィクスチャで不変条件を検証する。
 *
 * @see references/02-status/engine-promotion-matrix.md — authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateInvMethod as calculateInvMethodDirect,
  calculateCoreSales as calculateCoreSalesDirect,
  calculateDiscountRate as calculateDiscountRateDirect,
  calculateMarkupRates as calculateMarkupRatesDirect,
  calculateTransferTotals as calculateTransferTotalsDirect,
  calculateInventoryCost as calculateInventoryCostDirect,
} from '@/domain/calculations/grossProfit'
import * as wasmEngine from '@/application/services/wasmEngine'
import { ALL_FIXTURES } from './fixtures/grossProfitFixtures'

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
  calculateEstMethodWithStatus,
  calculateCoreSales,
  calculateDiscountRate,
  calculateDiscountImpact,
  calculateMarkupRates,
  calculateTransferTotals,
  calculateInventoryCost,
} from '@/application/services/grossProfitBridge'
import {
  calculateInvMethodWasm,
  calculateCoreSalesWasm,
  calculateDiscountRateWasm,
  calculateMarkupRatesWasm,
  calculateTransferTotalsWasm,
  calculateInventoryCostWasm,
} from '@/application/services/grossProfitWasm'

function setupCleanMocks(): void {
  vi.mocked(calculateInvMethodWasm).mockImplementation((input) => calculateInvMethodDirect(input))
  vi.mocked(calculateCoreSalesWasm).mockImplementation((a, b, c) =>
    calculateCoreSalesDirect(a, b, c),
  )
  vi.mocked(calculateDiscountRateWasm).mockImplementation((a, b) =>
    calculateDiscountRateDirect(a, b),
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

/* ── テスト ── */

describe('grossProfit 不変条件テスト（authoritative）', () => {
  beforeEach(() => {
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('calculateInvMethod: WASM 経由で呼ばれる', () => {
        calculateInvMethod(fixture.invMethod)
        expect(calculateInvMethodWasm).toHaveBeenCalled()
      })

      it('calculateCoreSales: WASM 経由で呼ばれる', () => {
        calculateCoreSales(
          fixture.coreSales.totalSales,
          fixture.coreSales.flowerSalesPrice,
          fixture.coreSales.directProduceSalesPrice,
        )
        expect(calculateCoreSalesWasm).toHaveBeenCalled()
      })

      it('calculateDiscountRate: WASM 経由で呼ばれる', () => {
        calculateDiscountRate(fixture.discountRate.discountAmount, fixture.discountRate.salesAmount)
        expect(calculateDiscountRateWasm).toHaveBeenCalled()
      })

      it('calculateMarkupRates: WASM 経由で呼ばれる', () => {
        calculateMarkupRates(fixture.markupRates)
        expect(calculateMarkupRatesWasm).toHaveBeenCalled()
      })

      it('calculateTransferTotals: WASM 経由で呼ばれる', () => {
        calculateTransferTotals(fixture.transferTotals)
        expect(calculateTransferTotalsWasm).toHaveBeenCalled()
      })

      it('calculateInventoryCost: WASM 経由で呼ばれる', () => {
        calculateInventoryCost(
          fixture.inventoryCost.totalCost,
          fixture.inventoryCost.deliverySalesCost,
        )
        expect(calculateInventoryCostWasm).toHaveBeenCalled()
      })
    })
  }

  describe('不変条件', () => {
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

  describe('CalculationResult 版: TS authoritative', () => {
    it('calculateEstMethodWithStatus は TS authoritative（WASM 不使用）', () => {
      const f = ALL_FIXTURES[0]
      const result = calculateEstMethodWithStatus(f.estMethod)
      expect(result.status).toBe('ok')
      expect(result.value).not.toBeNull()
    })

    it('calculateDiscountImpact は TS authoritative（WASM 不使用）', () => {
      const f = ALL_FIXTURES[0]
      const result = calculateDiscountImpact(f.discountImpact)
      expect(result.status).toBe('ok')
      expect(result.value).not.toBeNull()
    })
  })

  describe('TS フォールバック', () => {
    it('WASM 未初期化時は TS にフォールバック', () => {
      vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(null)
      vi.mocked(calculateInvMethodWasm).mockClear()
      const f = ALL_FIXTURES[0]
      const result = calculateInvMethod(f.invMethod)
      expect(calculateInvMethodWasm).not.toHaveBeenCalled()
      expect(result.cogs).not.toBeNull()
    })
  })
})
