/**
 * クロスバリデーションテスト
 *
 * ドメイン計算関数（JS）の数学的不変条件を検証する。
 *
 * 期間メトリクスの計算は periodMetricsCalculator.ts に一本化されており、
 * SQL 側には計算ロジックを持たない（二重実装の解消済み）。
 *
 * このテストは計算関数の正確性と不変条件を保証する:
 *   1. 同一テストベクトルに対する JS 関数の出力を検証
 *   2. 各計算式の数学的等価性をテスト
 *   3. getDailyTotalCost のソース構造を検証（構成要素の漏れ防止）
 *
 * @taxonomyKind T:unclassified
 */
import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { calculateEstMethod, calculateDiscountRate } from '@/domain/calculations/estMethod'
import { calculateInvMethod } from '@/domain/calculations/invMethod'
import { calculateDiscountImpact } from '@/domain/calculations/discountImpact'

// ── テストベクトル ──

interface TestVector {
  readonly label: string
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly totalDiscount: number
  readonly totalPurchaseCost: number
  readonly totalPurchasePrice: number
  readonly totalFlowersCost: number
  readonly totalFlowersPrice: number
  readonly totalDirectProduceCost: number
  readonly totalDirectProducePrice: number
  readonly totalTransferCost: number
  readonly totalTransferPrice: number
  readonly totalCostInclusion: number
  readonly totalCustomers: number
  readonly salesDays: number
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly defaultMarkupRate: number
}

const testVectors: readonly TestVector[] = [
  {
    label: '標準的な月次データ',
    totalSales: 10_000_000,
    totalCoreSales: 9_000_000,
    totalDiscount: 200_000,
    totalPurchaseCost: 6_000_000,
    totalPurchasePrice: 8_500_000,
    totalFlowersCost: 400_000,
    totalFlowersPrice: 600_000,
    totalDirectProduceCost: 300_000,
    totalDirectProducePrice: 400_000,
    totalTransferCost: 200_000,
    totalTransferPrice: 300_000,
    totalCostInclusion: 50_000,
    totalCustomers: 5000,
    salesDays: 25,
    openingInventory: 1_000_000,
    closingInventory: 800_000,
    defaultMarkupRate: 0.25,
  },
  {
    label: '売上ゼロ（休業月）',
    totalSales: 0,
    totalCoreSales: 0,
    totalDiscount: 0,
    totalPurchaseCost: 0,
    totalPurchasePrice: 0,
    totalFlowersCost: 0,
    totalFlowersPrice: 0,
    totalDirectProduceCost: 0,
    totalDirectProducePrice: 0,
    totalTransferCost: 0,
    totalTransferPrice: 0,
    totalCostInclusion: 0,
    totalCustomers: 0,
    salesDays: 0,
    openingInventory: 500_000,
    closingInventory: 500_000,
    defaultMarkupRate: 0.25,
  },
  {
    label: '在庫なし（新規店舗）',
    totalSales: 5_000_000,
    totalCoreSales: 5_000_000,
    totalDiscount: 100_000,
    totalPurchaseCost: 3_000_000,
    totalPurchasePrice: 4_200_000,
    totalFlowersCost: 0,
    totalFlowersPrice: 0,
    totalDirectProduceCost: 0,
    totalDirectProducePrice: 0,
    totalTransferCost: 0,
    totalTransferPrice: 0,
    totalCostInclusion: 10_000,
    totalCustomers: 2000,
    salesDays: 20,
    openingInventory: null,
    closingInventory: null,
    defaultMarkupRate: 0.25,
  },
  {
    label: '仕入なし（coreMarkupRate フォールバック）',
    totalSales: 1_000_000,
    totalCoreSales: 1_000_000,
    totalDiscount: 50_000,
    totalPurchaseCost: 0,
    totalPurchasePrice: 0,
    totalFlowersCost: 0,
    totalFlowersPrice: 0,
    totalDirectProduceCost: 0,
    totalDirectProducePrice: 0,
    totalTransferCost: 0,
    totalTransferPrice: 0,
    totalCostInclusion: 5_000,
    totalCustomers: 500,
    salesDays: 10,
    openingInventory: 200_000,
    closingInventory: null,
    defaultMarkupRate: 0.3,
  },
]

// ── JS 計算の再現（periodMetricsCalculator と同一の計算パス）──

function computeJsMetrics(v: TestVector) {
  // costs 相当（消耗品は totalCost/inventoryCost に含めない — JS getDailyTotalCost と一致）
  const deliverySalesPrice = v.totalFlowersPrice + v.totalDirectProducePrice
  const deliverySalesCost = v.totalFlowersCost + v.totalDirectProduceCost
  const totalCost =
    v.totalPurchaseCost + v.totalFlowersCost + v.totalDirectProduceCost + v.totalTransferCost
  const inventoryCost = v.totalPurchaseCost + v.totalTransferCost
  const allPurchasePrice =
    v.totalPurchasePrice + v.totalFlowersPrice + v.totalDirectProducePrice + v.totalTransferPrice
  const allPurchaseCost =
    v.totalPurchaseCost + v.totalFlowersCost + v.totalDirectProduceCost + v.totalTransferCost

  // 売変率
  const discountRate = calculateDiscountRate(v.totalSales, v.totalDiscount)

  // 値入率
  const averageMarkupRate =
    allPurchasePrice > 0 ? (allPurchasePrice - allPurchaseCost) / allPurchasePrice : 0

  const corePurchasePrice = v.totalPurchasePrice + v.totalTransferPrice
  const corePurchaseCost = v.totalPurchaseCost + v.totalTransferCost
  const coreMarkupRate =
    corePurchasePrice > 0
      ? (corePurchasePrice - corePurchaseCost) / corePurchasePrice
      : v.defaultMarkupRate

  // 原価算入率
  const costInclusionRate = v.totalSales > 0 ? v.totalCostInclusion / v.totalSales : 0

  // 客数
  const avgCustomersPerDay = v.salesDays > 0 ? v.totalCustomers / v.salesDays : 0

  // 推定法
  const estResult = calculateEstMethod({
    coreSales: v.totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    costInclusionCost: v.totalCostInclusion,
    openingInventory: v.openingInventory,
    inventoryPurchaseCost: inventoryCost,
  })

  // 在庫法
  const invResult = calculateInvMethod({
    openingInventory: v.openingInventory,
    closingInventory: v.closingInventory,
    totalPurchaseCost: totalCost,
    totalSales: v.totalSales,
  })

  // 売変ロス原価
  const discountResult = calculateDiscountImpact({
    coreSales: v.totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  })

  return {
    totalSales: v.totalSales,
    totalCoreSales: v.totalCoreSales,
    deliverySalesPrice,
    deliverySalesCost,
    totalCost,
    inventoryCost,
    discountRate,
    averageMarkupRate,
    coreMarkupRate,
    costInclusionRate,
    avgCustomersPerDay,
    estMethodCogs: estResult.cogs,
    estMethodMargin: estResult.margin,
    estMethodMarginRate: estResult.marginRate,
    estMethodClosingInventory: estResult.closingInventory,
    invMethodCogs: invResult.cogs,
    invMethodGrossProfit: invResult.grossProfit,
    invMethodGrossProfitRate: invResult.grossProfitRate,
    discountLossCost: discountResult.discountLossCost,
  }
}

// ── テスト ──

describe('ドメイン計算関数の等価性検証', () => {
  for (const vector of testVectors) {
    describe(vector.label, () => {
      const metrics = computeJsMetrics(vector)

      // ── 売上計算 ──

      it('売上納品 = 花売価 + 産直売価', () => {
        expect(metrics.deliverySalesPrice).toBe(
          vector.totalFlowersPrice + vector.totalDirectProducePrice,
        )
      })

      it('総仕入原価 = 仕入原価 + 花原価 + 産直原価 + 移動原価（消耗品除く）', () => {
        expect(metrics.totalCost).toBe(
          vector.totalPurchaseCost +
            vector.totalFlowersCost +
            vector.totalDirectProduceCost +
            vector.totalTransferCost,
        )
      })

      it('在庫仕入原価 = 仕入原価 + 移動原価（花・産直・消耗品除外）', () => {
        expect(metrics.inventoryCost).toBe(vector.totalPurchaseCost + vector.totalTransferCost)
      })

      // ── 売変率 ──

      it('売変率 = discount / (sales + discount)', () => {
        const expected =
          vector.totalSales + vector.totalDiscount > 0
            ? vector.totalDiscount / (vector.totalSales + vector.totalDiscount)
            : 0
        expect(metrics.discountRate).toBeCloseTo(expected, 10)
      })

      // ── 値入率 ──

      it('コア値入率の計算（仕入なし時はデフォルト値フォールバック）', () => {
        const corePurchasePrice = vector.totalPurchasePrice + vector.totalTransferPrice
        const corePurchaseCost = vector.totalPurchaseCost + vector.totalTransferCost
        const expected =
          corePurchasePrice > 0
            ? (corePurchasePrice - corePurchaseCost) / corePurchasePrice
            : vector.defaultMarkupRate
        expect(metrics.coreMarkupRate).toBeCloseTo(expected, 10)
      })

      // ── 推定法 ──

      it('推定原価 = 粗売上 × (1 - 値入率) + 消耗品', () => {
        const grossSales =
          metrics.discountRate < 1
            ? vector.totalCoreSales / (1 - metrics.discountRate)
            : vector.totalCoreSales
        const expectedCogs = grossSales * (1 - metrics.coreMarkupRate) + vector.totalCostInclusion
        expect(metrics.estMethodCogs).toBeCloseTo(expectedCogs, 2)
      })

      it('推定マージン = コア売上 - 推定原価', () => {
        expect(metrics.estMethodMargin).toBeCloseTo(
          vector.totalCoreSales - metrics.estMethodCogs,
          2,
        )
      })

      it('推定マージン率 = マージン / コア売上（ゼロ除算→0）', () => {
        const expected =
          vector.totalCoreSales > 0 ? metrics.estMethodMargin / vector.totalCoreSales : 0
        expect(metrics.estMethodMarginRate).toBeCloseTo(expected, 6)
      })

      it('推定期末在庫 = 期首在庫 + 在庫仕入原価 - 推定原価（期首なし→null）', () => {
        if (vector.openingInventory != null) {
          expect(metrics.estMethodClosingInventory).toBeCloseTo(
            vector.openingInventory + metrics.inventoryCost - metrics.estMethodCogs,
            2,
          )
        } else {
          expect(metrics.estMethodClosingInventory).toBeNull()
        }
      })

      // ── 在庫法 ──

      it('在庫法 COGS = 期首 + 総仕入 - 期末（在庫なし→null）', () => {
        if (vector.openingInventory != null && vector.closingInventory != null) {
          expect(metrics.invMethodCogs).toBe(
            vector.openingInventory + metrics.totalCost - vector.closingInventory,
          )
        } else {
          expect(metrics.invMethodCogs).toBeNull()
        }
      })

      it('在庫法 粗利 = 売上 - COGS', () => {
        if (metrics.invMethodCogs != null) {
          expect(metrics.invMethodGrossProfit).toBe(vector.totalSales - metrics.invMethodCogs)
        } else {
          expect(metrics.invMethodGrossProfit).toBeNull()
        }
      })

      it('在庫法 粗利率 = 粗利 / 売上（ゼロ除算→0）', () => {
        if (metrics.invMethodGrossProfit != null) {
          const expected =
            vector.totalSales > 0 ? metrics.invMethodGrossProfit / vector.totalSales : 0
          expect(metrics.invMethodGrossProfitRate).toBeCloseTo(expected, 6)
        } else {
          expect(metrics.invMethodGrossProfitRate).toBeNull()
        }
      })

      // ── 売変ロス原価 ──

      it('売変ロス原価 = (1 - 値入率) × コア売上 × (売変率 / (1 - 売変率))', () => {
        let expected: number
        if (metrics.discountRate < 1) {
          expected =
            (1 - metrics.coreMarkupRate) *
            vector.totalCoreSales *
            (metrics.discountRate / (1 - metrics.discountRate))
        } else {
          expected = (1 - metrics.coreMarkupRate) * vector.totalCoreSales * metrics.discountRate
        }
        expect(metrics.discountLossCost).toBeCloseTo(expected, 2)
      })

      // ── 原価算入率 ──

      it('原価算入率 = 消耗品 / 売上（ゼロ除算→0）', () => {
        const expected = vector.totalSales > 0 ? vector.totalCostInclusion / vector.totalSales : 0
        expect(metrics.costInclusionRate).toBeCloseTo(expected, 10)
      })

      // ── 客数 ──

      it('日平均客数 = 客数 / 営業日数（ゼロ除算→0）', () => {
        const expected = vector.salesDays > 0 ? vector.totalCustomers / vector.salesDays : 0
        expect(metrics.avgCustomersPerDay).toBeCloseTo(expected, 10)
      })
    })
  }
})

describe('getDailyTotalCost の構造的検証: consumable を含まないこと', () => {
  /**
   * getDailyTotalCost (JS) の構成要素を検証する。
   * total_cost に consumable が含まれると在庫法 COGS が乖離するバグが発生する。
   */

  it('JS getDailyTotalCost のソースに consumable が含まれていない', () => {
    const jsPath = path.resolve(__dirname, '../../../domain/models/DailyRecord.ts')
    const jsSource = fs.readFileSync(jsPath, 'utf-8')

    const funcMatch = jsSource.match(/function getDailyTotalCost[\s\S]*?^}/m)
    expect(funcMatch).not.toBeNull()
    const funcBody = funcMatch![0]

    expect(
      funcBody.includes('costInclusion'),
      'JS getDailyTotalCost に consumable が含まれている',
    ).toBe(false)
  })
})

describe('計算式の数学的不変条件', () => {
  for (const vector of testVectors) {
    describe(vector.label, () => {
      const metrics = computeJsMetrics(vector)

      it('在庫仕入原価 + 売上納品原価 = 総仕入原価', () => {
        expect(metrics.inventoryCost + metrics.deliverySalesCost).toBeCloseTo(metrics.totalCost, 2)
      })

      it('在庫法: COGS が非null の場合、粗利 + COGS = 売上', () => {
        if (metrics.invMethodCogs != null && metrics.invMethodGrossProfit != null) {
          expect(metrics.invMethodGrossProfit + metrics.invMethodCogs).toBeCloseTo(
            vector.totalSales,
            2,
          )
        }
      })

      it('推定マージン + 推定原価 = コア売上', () => {
        expect(metrics.estMethodMargin + metrics.estMethodCogs).toBeCloseTo(
          vector.totalCoreSales,
          2,
        )
      })
    })
  }
})
