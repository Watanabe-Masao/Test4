import { describe, it, expect } from 'vitest'
import { calculateInvMethod } from './invMethod'
import { calculateEstMethod, calculateCoreSales, calculateDiscountRate } from './estMethod'
import { calculateDiscountImpact } from './discountImpact'
import { calculateMarkupRates } from './markupRate'
import { calculateTransferTotals, calculateInventoryCost } from './costAggregation'
import type { InvMethodInput } from './invMethod'
import type { EstMethodInput } from './estMethod'
import type { DiscountImpactInput } from './discountImpact'
import type { MarkupRateInput } from './markupRate'
import type { TransferTotalsInput } from './costAggregation'
import { safeDivide } from './utils'

/**
 * grossProfit 不変条件テスト (GP-INV-1〜12)
 *
 * WASM 移行後も TS テストで検証し続ける数学的・業務的性質。
 * cross-validation (dual-run compare) のベースラインとなる。
 */

// ── テストヘルパー ──────────────────────────────────

function makeInvInput(overrides: Partial<InvMethodInput> = {}): InvMethodInput {
  return {
    openingInventory: 1_000_000,
    closingInventory: 800_000,
    totalPurchaseCost: 500_000,
    totalSales: 900_000,
    ...overrides,
  }
}

function makeEstInput(overrides: Partial<EstMethodInput> = {}): EstMethodInput {
  return {
    coreSales: 800_000,
    discountRate: 0.05,
    markupRate: 0.3,
    costInclusionCost: 10_000,
    openingInventory: 1_000_000,
    inventoryPurchaseCost: 400_000,
    ...overrides,
  }
}

function makeDiscountInput(overrides: Partial<DiscountImpactInput> = {}): DiscountImpactInput {
  return {
    coreSales: 800_000,
    markupRate: 0.3,
    discountRate: 0.05,
    ...overrides,
  }
}

function makeMarkupInput(overrides: Partial<MarkupRateInput> = {}): MarkupRateInput {
  return {
    purchasePrice: 500_000,
    purchaseCost: 350_000,
    deliveryPrice: 100_000,
    deliveryCost: 70_000,
    transferPrice: 50_000,
    transferCost: 35_000,
    defaultMarkupRate: 0.3,
    ...overrides,
  }
}

function makeTransferInput(overrides: Partial<TransferTotalsInput> = {}): TransferTotalsInput {
  return {
    interStoreInPrice: 10_000,
    interStoreInCost: 7_000,
    interStoreOutPrice: 5_000,
    interStoreOutCost: 3_500,
    interDepartmentInPrice: 8_000,
    interDepartmentInCost: 5_600,
    interDepartmentOutPrice: 3_000,
    interDepartmentOutCost: 2_100,
    ...overrides,
  }
}

describe('grossProfit invariants', () => {
  // ── GP-INV-1: COGS 恒等式 ──────────────────────────
  describe('GP-INV-1: COGS = opening + purchases - closing', () => {
    it('通常ケース', () => {
      const input = makeInvInput()
      const result = calculateInvMethod(input)
      expect(result.cogs).toBe(
        input.openingInventory! + input.totalPurchaseCost - input.closingInventory!,
      )
    })

    it('大きな仕入', () => {
      const input = makeInvInput({ totalPurchaseCost: 10_000_000 })
      const result = calculateInvMethod(input)
      expect(result.cogs).toBe(
        input.openingInventory! + input.totalPurchaseCost - input.closingInventory!,
      )
    })

    it('期首 = 期末', () => {
      const input = makeInvInput({ openingInventory: 500_000, closingInventory: 500_000 })
      const result = calculateInvMethod(input)
      expect(result.cogs).toBe(input.totalPurchaseCost)
    })
  })

  // ── GP-INV-2: grossProfit = sales - COGS ──────────────
  describe('GP-INV-2: grossProfit = sales - COGS', () => {
    it('通常ケース', () => {
      const input = makeInvInput()
      const result = calculateInvMethod(input)
      expect(result.grossProfit).toBe(input.totalSales - result.cogs!)
    })

    it('負粗利（COGS > 売上）', () => {
      const input = makeInvInput({
        openingInventory: 2_000_000,
        closingInventory: 100_000,
        totalSales: 500_000,
      })
      const result = calculateInvMethod(input)
      expect(result.grossProfit).toBe(input.totalSales - result.cogs!)
      expect(result.grossProfit!).toBeLessThan(0)
    })
  })

  // ── GP-INV-3: grossProfitRate = grossProfit / sales ────
  describe('GP-INV-3: grossProfitRate = grossProfit / sales', () => {
    it('通常ケース', () => {
      const input = makeInvInput()
      const result = calculateInvMethod(input)
      const expected = safeDivide(result.grossProfit!, input.totalSales, 0)
      expect(result.grossProfitRate).toBeCloseTo(expected, 10)
    })

    it('ゼロ売上 → rate = 0', () => {
      const input = makeInvInput({ totalSales: 0 })
      const result = calculateInvMethod(input)
      expect(result.grossProfitRate).toBe(0)
    })
  })

  // ── GP-INV-4: null 在庫 → 全結果 null ─────────────────
  describe('GP-INV-4: null inventory → null outputs', () => {
    it('期首在庫 null', () => {
      const result = calculateInvMethod(makeInvInput({ openingInventory: null }))
      expect(result.cogs).toBeNull()
      expect(result.grossProfit).toBeNull()
      expect(result.grossProfitRate).toBeNull()
    })

    it('期末在庫 null', () => {
      const result = calculateInvMethod(makeInvInput({ closingInventory: null }))
      expect(result.cogs).toBeNull()
      expect(result.grossProfit).toBeNull()
      expect(result.grossProfitRate).toBeNull()
    })

    it('両方 null', () => {
      const result = calculateInvMethod(
        makeInvInput({ openingInventory: null, closingInventory: null }),
      )
      expect(result.cogs).toBeNull()
      expect(result.grossProfit).toBeNull()
      expect(result.grossProfitRate).toBeNull()
    })
  })

  // ── GP-INV-5: grossSales = coreSales / (1 - discountRate) ──
  describe('GP-INV-5: grossSales = coreSales / (1 - discountRate)', () => {
    it('通常ケース', () => {
      const input = makeEstInput()
      const result = calculateEstMethod(input)
      const expected = safeDivide(input.coreSales, 1 - input.discountRate, input.coreSales)
      expect(result.grossSales).toBeCloseTo(expected, 10)
    })

    it('ゼロ売変率', () => {
      const input = makeEstInput({ discountRate: 0 })
      const result = calculateEstMethod(input)
      expect(result.grossSales).toBeCloseTo(input.coreSales, 10)
    })

    it('高売変率（50%）', () => {
      const input = makeEstInput({ discountRate: 0.5 })
      const result = calculateEstMethod(input)
      expect(result.grossSales).toBeCloseTo(input.coreSales / 0.5, 10)
    })
  })

  // ── GP-INV-6: estMethod COGS = grossSales × (1 - markupRate) + costInclusion ──
  describe('GP-INV-6: estMethod COGS identity', () => {
    it('通常ケース', () => {
      const input = makeEstInput()
      const result = calculateEstMethod(input)
      const expected = result.grossSales * (1 - input.markupRate) + input.costInclusionCost
      expect(result.cogs).toBeCloseTo(expected, 10)
    })

    it('ゼロ値入率', () => {
      const input = makeEstInput({ markupRate: 0 })
      const result = calculateEstMethod(input)
      const expected = result.grossSales + input.costInclusionCost
      expect(result.cogs).toBeCloseTo(expected, 10)
    })

    it('ゼロ原価算入費', () => {
      const input = makeEstInput({ costInclusionCost: 0 })
      const result = calculateEstMethod(input)
      const expected = result.grossSales * (1 - input.markupRate)
      expect(result.cogs).toBeCloseTo(expected, 10)
    })
  })

  // ── GP-INV-7: closingInventory = opening + purchases - COGS ──
  describe('GP-INV-7: closingInventory = opening + inventoryPurchase - COGS', () => {
    it('通常ケース', () => {
      const input = makeEstInput()
      const result = calculateEstMethod(input)
      const expected = input.openingInventory! + input.inventoryPurchaseCost - result.cogs
      expect(result.closingInventory).toBeCloseTo(expected, 10)
    })

    it('期首在庫 null → closingInventory null', () => {
      const input = makeEstInput({ openingInventory: null })
      const result = calculateEstMethod(input)
      expect(result.closingInventory).toBeNull()
    })

    it('大量仕入', () => {
      const input = makeEstInput({ inventoryPurchaseCost: 5_000_000 })
      const result = calculateEstMethod(input)
      const expected = input.openingInventory! + input.inventoryPurchaseCost - result.cogs
      expect(result.closingInventory).toBeCloseTo(expected, 10)
    })
  })

  // ── GP-INV-8: discountLossCost 恒等式 ─────────────────
  describe('GP-INV-8: discountLossCost = (1-markupRate) × coreSales × discountRate/(1-discountRate)', () => {
    it('通常ケース', () => {
      const input = makeDiscountInput()
      const result = calculateDiscountImpact(input)
      const ratio = safeDivide(input.discountRate, 1 - input.discountRate, input.discountRate)
      const expected = (1 - input.markupRate) * input.coreSales * ratio
      expect(result.discountLossCost).toBeCloseTo(expected, 10)
    })

    it('ゼロ売変率 → ロスゼロ', () => {
      const result = calculateDiscountImpact(makeDiscountInput({ discountRate: 0 }))
      expect(result.discountLossCost).toBe(0)
    })

    it('ゼロコア売上 → ロスゼロ', () => {
      const result = calculateDiscountImpact(makeDiscountInput({ coreSales: 0 }))
      expect(result.discountLossCost).toBe(0)
    })

    it('値入率 100% → ロスゼロ', () => {
      const result = calculateDiscountImpact(makeDiscountInput({ markupRate: 1 }))
      expect(result.discountLossCost).toBe(0)
    })
  })

  // ── GP-INV-9: markupRate ∈ [0, 1] (正常入力) ──────────
  describe('GP-INV-9: markupRate bounds [0, 1] for normal inputs', () => {
    it('通常ケース', () => {
      const result = calculateMarkupRates(makeMarkupInput())
      expect(result.averageMarkupRate).toBeGreaterThanOrEqual(0)
      expect(result.averageMarkupRate).toBeLessThanOrEqual(1)
      expect(result.coreMarkupRate).toBeGreaterThanOrEqual(0)
      expect(result.coreMarkupRate).toBeLessThanOrEqual(1)
    })

    it('原価 = 売価 → 値入率 = 0', () => {
      const result = calculateMarkupRates(
        makeMarkupInput({
          purchasePrice: 100,
          purchaseCost: 100,
          deliveryPrice: 50,
          deliveryCost: 50,
          transferPrice: 30,
          transferCost: 30,
        }),
      )
      expect(result.averageMarkupRate).toBe(0)
      expect(result.coreMarkupRate).toBe(0)
    })

    it('ゼロ売価 → safeDivide fallback', () => {
      const result = calculateMarkupRates(
        makeMarkupInput({
          purchasePrice: 0,
          purchaseCost: 0,
          deliveryPrice: 0,
          deliveryCost: 0,
          transferPrice: 0,
          transferCost: 0,
        }),
      )
      expect(result.averageMarkupRate).toBe(0) // safeDivide(0, 0, 0) = 0
      expect(result.coreMarkupRate).toBe(0.3) // safeDivide(0, 0, defaultMarkupRate) = 0.3
    })
  })

  // ── GP-INV-10: averageMarkupRate includes delivery, coreMarkupRate excludes ──
  describe('GP-INV-10: average includes delivery, core excludes delivery', () => {
    it('delivery 追加で average は変化、core は不変', () => {
      const baseInput = makeMarkupInput({ deliveryPrice: 0, deliveryCost: 0 })
      const withDelivery = makeMarkupInput({ deliveryPrice: 200_000, deliveryCost: 160_000 })

      const baseResult = calculateMarkupRates(baseInput)
      const deliveryResult = calculateMarkupRates(withDelivery)

      // core は delivery に影響されない
      expect(deliveryResult.coreMarkupRate).toBeCloseTo(baseResult.coreMarkupRate, 10)
      // average は delivery で変化する
      expect(deliveryResult.averageMarkupRate).not.toBeCloseTo(baseResult.averageMarkupRate, 10)
    })

    it('core の計算式を直接検証', () => {
      const input = makeMarkupInput()
      const result = calculateMarkupRates(input)
      const corePrice = input.purchasePrice + input.transferPrice
      const coreCost = input.purchaseCost + input.transferCost
      const expected = safeDivide(corePrice - coreCost, corePrice, input.defaultMarkupRate)
      expect(result.coreMarkupRate).toBeCloseTo(expected, 10)
    })
  })

  // ── GP-INV-11: transferTotals = sum of 4 directions ────
  describe('GP-INV-11: transferTotals = sum of all 4 directions', () => {
    it('price は 4 方向の合計', () => {
      const input = makeTransferInput()
      const result = calculateTransferTotals(input)
      const expected =
        input.interStoreInPrice +
        input.interStoreOutPrice +
        input.interDepartmentInPrice +
        input.interDepartmentOutPrice
      expect(result.transferPrice).toBe(expected)
    })

    it('cost は 4 方向の合計', () => {
      const input = makeTransferInput()
      const result = calculateTransferTotals(input)
      const expected =
        input.interStoreInCost +
        input.interStoreOutCost +
        input.interDepartmentInCost +
        input.interDepartmentOutCost
      expect(result.transferCost).toBe(expected)
    })

    it('全ゼロ → ゼロ', () => {
      const input = makeTransferInput({
        interStoreInPrice: 0,
        interStoreInCost: 0,
        interStoreOutPrice: 0,
        interStoreOutCost: 0,
        interDepartmentInPrice: 0,
        interDepartmentInCost: 0,
        interDepartmentOutPrice: 0,
        interDepartmentOutCost: 0,
      })
      const result = calculateTransferTotals(input)
      expect(result.transferPrice).toBe(0)
      expect(result.transferCost).toBe(0)
    })

    it('inventoryCost = totalCost - deliverySalesCost', () => {
      const totalCost = 500_000
      const deliverySalesCost = 70_000
      expect(calculateInventoryCost(totalCost, deliverySalesCost)).toBe(
        totalCost - deliverySalesCost,
      )
    })
  })

  // ── GP-INV-12: 全出力 finite (NaN/Infinity なし) ──────
  describe('GP-INV-12: all outputs are finite', () => {
    function assertAllFinite(obj: object) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'number') {
          expect(value, `${key} should be finite`).toSatisfy(Number.isFinite)
        }
        // null は許容（InvMethod の null propagation）
      }
    }

    it('invMethod — 通常入力', () => {
      assertAllFinite(calculateInvMethod(makeInvInput()))
    })

    it('invMethod — ゼロ売上', () => {
      assertAllFinite(calculateInvMethod(makeInvInput({ totalSales: 0 })))
    })

    it('estMethod — 通常入力', () => {
      assertAllFinite(calculateEstMethod(makeEstInput()))
    })

    it('estMethod — ゼロコア売上', () => {
      assertAllFinite(calculateEstMethod(makeEstInput({ coreSales: 0 })))
    })

    it('estMethod — 売変率 100%', () => {
      assertAllFinite(calculateEstMethod(makeEstInput({ discountRate: 1 })))
    })

    it('discountImpact — 通常入力', () => {
      assertAllFinite(calculateDiscountImpact(makeDiscountInput()))
    })

    it('discountImpact — 売変率 100%', () => {
      assertAllFinite(calculateDiscountImpact(makeDiscountInput({ discountRate: 1 })))
    })

    it('markupRates — 通常入力', () => {
      assertAllFinite(calculateMarkupRates(makeMarkupInput()))
    })

    it('markupRates — 全ゼロ入力', () => {
      assertAllFinite(
        calculateMarkupRates(
          makeMarkupInput({
            purchasePrice: 0,
            purchaseCost: 0,
            deliveryPrice: 0,
            deliveryCost: 0,
            transferPrice: 0,
            transferCost: 0,
          }),
        ),
      )
    })

    it('transferTotals — 通常入力', () => {
      assertAllFinite(calculateTransferTotals(makeTransferInput()))
    })

    it('calculateInventoryCost — 通常入力', () => {
      const result = calculateInventoryCost(500_000, 70_000)
      expect(Number.isFinite(result)).toBe(true)
    })

    it('coreSales — 通常入力', () => {
      assertAllFinite(calculateCoreSales(900_000, 50_000, 30_000))
    })

    it('coreSales — 納品超過（負コア売上クランプ）', () => {
      const result = calculateCoreSales(100_000, 80_000, 50_000)
      assertAllFinite(result)
      expect(result.coreSales).toBe(0)
      expect(result.isOverDelivery).toBe(true)
      expect(result.overDeliveryAmount).toBe(30_000)
    })

    it('discountRate — 通常入力', () => {
      const rate = calculateDiscountRate(50_000, 900_000)
      expect(Number.isFinite(rate)).toBe(true)
    })

    it('discountRate — ゼロ売上 + ゼロ売変', () => {
      const rate = calculateDiscountRate(0, 0)
      expect(Number.isFinite(rate)).toBe(true)
      expect(rate).toBe(0)
    })

    it('極大値入力 — 全関数 (1e12)', () => {
      const big = 1e12
      assertAllFinite(
        calculateInvMethod(
          makeInvInput({
            openingInventory: big,
            closingInventory: big,
            totalPurchaseCost: big,
            totalSales: big,
          }),
        ),
      )
      assertAllFinite(
        calculateEstMethod(
          makeEstInput({
            coreSales: big,
            openingInventory: big,
            inventoryPurchaseCost: big,
            costInclusionCost: big,
          }),
        ),
      )
      assertAllFinite(calculateDiscountImpact(makeDiscountInput({ coreSales: big })))
      assertAllFinite(
        calculateMarkupRates(makeMarkupInput({ purchasePrice: big, purchaseCost: big * 0.7 })),
      )
      assertAllFinite(
        calculateTransferTotals(
          makeTransferInput({ interStoreInPrice: big, interStoreInCost: big }),
        ),
      )
      expect(Number.isFinite(calculateInventoryCost(big, big * 0.1))).toBe(true)
    })
  })

  // ── coreSales 追加不変条件 ──────────────────────────
  describe('coreSales additional invariants', () => {
    it('coreSales = totalSales - flower - directProduce (正常)', () => {
      const total = 900_000
      const flower = 50_000
      const direct = 30_000
      const result = calculateCoreSales(total, flower, direct)
      expect(result.coreSales).toBe(total - flower - direct)
      expect(result.isOverDelivery).toBe(false)
      expect(result.overDeliveryAmount).toBe(0)
    })

    it('納品超過時: overDeliveryAmount = -(totalSales - flower - direct)', () => {
      const total = 100_000
      const flower = 80_000
      const direct = 50_000
      const result = calculateCoreSales(total, flower, direct)
      expect(result.coreSales).toBe(0)
      expect(result.isOverDelivery).toBe(true)
      expect(result.overDeliveryAmount).toBe(flower + direct - total)
    })
  })

  // ── discountRate 追加不変条件 ──────────────────────────
  describe('discountRate additional invariants', () => {
    it('discountRate = discount / (sales + discount)', () => {
      const sales = 900_000
      const discount = 50_000
      const rate = calculateDiscountRate(sales, discount)
      const expected = safeDivide(discount, sales + discount, 0)
      expect(rate).toBeCloseTo(expected, 10)
    })

    it('ゼロ売変 → rate = 0', () => {
      expect(calculateDiscountRate(900_000, 0)).toBe(0)
    })
  })

  // ── markupRate ⇔ discountImpact 連動整合 ──────────────
  describe('markupRate ⇔ discountImpact cross-consistency', () => {
    it('markupRate 上昇 → discountLossCost 減少', () => {
      const low = calculateDiscountImpact(makeDiscountInput({ markupRate: 0.2 }))
      const high = calculateDiscountImpact(makeDiscountInput({ markupRate: 0.5 }))
      expect(high.discountLossCost).toBeLessThan(low.discountLossCost)
    })

    it('markupRate を markupRates で計算し discountImpact に渡す', () => {
      const markupResult = calculateMarkupRates(makeMarkupInput())
      const impact = calculateDiscountImpact({
        coreSales: 800_000,
        markupRate: markupResult.coreMarkupRate,
        discountRate: 0.05,
      })
      // discountLossCost は finite で非負
      expect(Number.isFinite(impact.discountLossCost)).toBe(true)
      expect(impact.discountLossCost).toBeGreaterThanOrEqual(0)
    })
  })
})
