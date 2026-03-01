/**
 * クロスバリデーションテスト
 *
 * SQL CTE の計算ロジックが JS の計算関数と同一の計算式を使用していることを検証する。
 *
 * DuckDB-WASM は Node.js テスト環境では利用できないため、
 * 以下の方法で等価性を保証する:
 *
 * 1. 同一テストベクトルに対して JS 関数の出力を検証
 * 2. SQL CTE の計算式が JS 関数と同一であることをコードレビューで確認
 * 3. 各計算式の数学的等価性をここで文書化・テスト
 *
 * E2E テスト（Playwright）で実際のブラウザ上での一致を検証する。
 */
import { describe, it, expect } from 'vitest'
import { calculateEstMethod, calculateDiscountRate } from '@/domain/calculations/estMethod'
import { calculateInvMethod } from '@/domain/calculations/invMethod'
import { calculateDiscountImpact } from '@/domain/calculations/discountImpact'

/**
 * safeDivide の SQL 等価式:
 *   JS:  safeDivide(a, b, fallback) → b !== 0 ? a / b : fallback
 *   SQL: CASE WHEN b > 0 THEN a / b ELSE fallback END
 *        or CASE WHEN b != 0 THEN a / b ELSE fallback END
 *
 * SQL の CASE WHEN は JS の三項演算子と同じセマンティクス。
 */

// ── テストベクトル ──
// SQL CTE と JS 関数の両方に通すデータセット

interface TestVector {
  readonly label: string
  // 入力（store_day_summary の集約結果に相当）
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly totalDiscount: number // discount_absolute
  readonly totalPurchaseCost: number
  readonly totalPurchasePrice: number
  readonly totalFlowersCost: number
  readonly totalFlowersPrice: number
  readonly totalDirectProduceCost: number
  readonly totalDirectProducePrice: number
  readonly totalTransferCost: number
  readonly totalTransferPrice: number
  readonly totalConsumable: number
  readonly totalCustomers: number
  readonly salesDays: number
  // 在庫設定
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  // アプリ設定
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
    totalConsumable: 50_000,
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
    totalConsumable: 0,
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
    totalConsumable: 10_000,
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
    totalConsumable: 5_000,
    totalCustomers: 500,
    salesDays: 10,
    openingInventory: 200_000,
    closingInventory: null,
    defaultMarkupRate: 0.3,
  },
]

// ── JS 計算の再現（SQL CTE と同一の計算パス）──

function computeJsMetrics(v: TestVector) {
  // costs CTE 相当
  const deliverySalesPrice = v.totalFlowersPrice + v.totalDirectProducePrice
  const deliverySalesCost = v.totalFlowersCost + v.totalDirectProduceCost
  const totalCost =
    v.totalPurchaseCost +
    v.totalFlowersCost +
    v.totalDirectProduceCost +
    v.totalTransferCost +
    v.totalConsumable
  const inventoryCost = v.totalPurchaseCost + v.totalTransferCost + v.totalConsumable
  const allPurchasePrice =
    v.totalPurchasePrice + v.totalFlowersPrice + v.totalDirectProducePrice + v.totalTransferPrice
  const allPurchaseCost =
    v.totalPurchaseCost + v.totalFlowersCost + v.totalDirectProduceCost + v.totalTransferCost

  // rates CTE 相当: 売変率
  const discountRate = calculateDiscountRate(v.totalSales, v.totalDiscount)

  // rates CTE 相当: 値入率
  const averageMarkupRate =
    allPurchasePrice > 0 ? (allPurchasePrice - allPurchaseCost) / allPurchasePrice : 0

  const corePurchasePrice = v.totalPurchasePrice + v.totalTransferPrice
  const corePurchaseCost = v.totalPurchaseCost + v.totalTransferCost
  const coreMarkupRate =
    corePurchasePrice > 0
      ? (corePurchasePrice - corePurchaseCost) / corePurchasePrice
      : v.defaultMarkupRate

  // rates CTE 相当: 消耗品率
  const consumableRate = v.totalSales > 0 ? v.totalConsumable / v.totalSales : 0

  // rates CTE 相当: 客数
  const avgCustomersPerDay = v.salesDays > 0 ? v.totalCustomers / v.salesDays : 0

  // est CTE 相当: 推定法
  const estResult = calculateEstMethod({
    coreSales: v.totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    consumableCost: v.totalConsumable,
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
    // 売上
    totalSales: v.totalSales,
    totalCoreSales: v.totalCoreSales,
    deliverySalesPrice,
    deliverySalesCost,
    totalCost,
    inventoryCost,

    // レート
    discountRate,
    averageMarkupRate,
    coreMarkupRate,
    consumableRate,
    avgCustomersPerDay,

    // 推定法
    estMethodCogs: estResult.cogs,
    estMethodMargin: estResult.margin,
    estMethodMarginRate: estResult.marginRate,
    estMethodClosingInventory: estResult.closingInventory,

    // 在庫法
    invMethodCogs: invResult.cogs,
    invMethodGrossProfit: invResult.grossProfit,
    invMethodGrossProfitRate: invResult.grossProfitRate,

    // 売変ロス
    discountLossCost: discountResult.discountLossCost,
  }
}

// ── テスト ──

describe('クロスバリデーション: SQL CTE と JS 計算の等価性', () => {
  for (const vector of testVectors) {
    describe(vector.label, () => {
      const metrics = computeJsMetrics(vector)

      // ── 売上計算 ──

      it('売上納品 = 花売価 + 産直売価', () => {
        expect(metrics.deliverySalesPrice).toBe(
          vector.totalFlowersPrice + vector.totalDirectProducePrice,
        )
      })

      it('総仕入原価 = 仕入原価 + 花原価 + 産直原価 + 移動原価 + 消耗品', () => {
        expect(metrics.totalCost).toBe(
          vector.totalPurchaseCost +
            vector.totalFlowersCost +
            vector.totalDirectProduceCost +
            vector.totalTransferCost +
            vector.totalConsumable,
        )
      })

      it('在庫仕入原価 = 仕入原価 + 移動原価 + 消耗品（花・産直除外）', () => {
        expect(metrics.inventoryCost).toBe(
          vector.totalPurchaseCost + vector.totalTransferCost + vector.totalConsumable,
        )
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
        // 粗売上 = coreSales / (1 - discountRate)
        const grossSales =
          metrics.discountRate < 1
            ? vector.totalCoreSales / (1 - metrics.discountRate)
            : vector.totalCoreSales
        const expectedCogs = grossSales * (1 - metrics.coreMarkupRate) + vector.totalConsumable
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

      // ── 消耗品率 ──

      it('消耗品率 = 消耗品 / 売上（ゼロ除算→0）', () => {
        const expected = vector.totalSales > 0 ? vector.totalConsumable / vector.totalSales : 0
        expect(metrics.consumableRate).toBeCloseTo(expected, 10)
      })

      // ── 客数 ──

      it('日平均客数 = 客数 / 営業日数（ゼロ除算→0）', () => {
        const expected = vector.salesDays > 0 ? vector.totalCustomers / vector.salesDays : 0
        expect(metrics.avgCustomersPerDay).toBeCloseTo(expected, 10)
      })
    })
  }
})

describe('計算式の数学的不変条件', () => {
  for (const vector of testVectors) {
    describe(vector.label, () => {
      const metrics = computeJsMetrics(vector)

      it('在庫仕入原価 + 売上納品原価 = 総仕入原価', () => {
        // inventoryCost = totalCost - deliverySalesCost
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
