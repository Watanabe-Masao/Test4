/**
 * calculateGrossProfit — 粗利の唯一の計算正本
 *
 * 在庫法 / 推定法 × 原価算入費前 / 後 の4種を統一的に計算する。
 * 既存の invMethod.ts / estMethod.ts を内部利用する wrapper。
 *
 * @see references/01-principles/gross-profit-definition.md
 */
import { calculateInvMethod } from '@/domain/calculations/invMethod'
import { calculateEstMethodWithStatus } from '@/domain/calculations/estMethod'
import { safeDivide } from '@/domain/calculations/utils'
import {
  GrossProfitReadModel,
  type GrossProfitInput,
  type GrossProfitReadModel as GrossProfitReadModelType,
} from './GrossProfitTypes'

/**
 * 粗利の唯一の計算正本。
 *
 * method と inclusionMode に応じて適切な計算を行い、
 * Zod parse で runtime 検証する（fail fast）。
 */
export function calculateGrossProfit(input: GrossProfitInput): GrossProfitReadModelType {
  const { method, inclusionMode } = input

  let grossProfit: number
  let grossProfitRate: number
  let inclusionApplied: boolean

  if (method === 'inventory') {
    // 在庫法: 売上原価 = 期首在庫 + 総仕入原価 - 期末在庫
    const invResult = calculateInvMethod({
      openingInventory: input.openingInventory ?? null,
      closingInventory: input.closingInventory ?? null,
      totalPurchaseCost: input.purchaseCost,
      totalSales: input.sales,
    })

    if (invResult.grossProfit == null) {
      // 在庫データ不足 — ゼロを返す（フォールバックは呼び出し元の責務）
      grossProfit = 0
      grossProfitRate = 0
      inclusionApplied = false
    } else if (inclusionMode === 'after_cost_inclusion' && input.costInclusion != null) {
      // 在庫法・原価算入費後: 粗利から原価算入費を事後控除
      grossProfit = invResult.grossProfit - input.costInclusion
      grossProfitRate = safeDivide(grossProfit, input.sales, 0)
      inclusionApplied = true
    } else {
      // 在庫法・原価算入費前
      grossProfit = invResult.grossProfit
      grossProfitRate = invResult.grossProfitRate ?? 0
      inclusionApplied = false
    }
  } else {
    // 推定法: 推定原価 = 粗売上 × (1 - 値入率) + 原価算入費
    const estResult = calculateEstMethodWithStatus({
      coreSales: input.sales,
      discountRate: input.discountRate ?? 0,
      markupRate: input.markupRate ?? 0,
      costInclusionCost: input.costInclusion ?? 0,
      openingInventory: input.openingInventory ?? null,
      inventoryPurchaseCost: input.purchaseCost,
    })

    if (estResult.value != null) {
      grossProfit = estResult.value.margin
      grossProfitRate = estResult.value.marginRate
    } else {
      grossProfit = 0
      grossProfitRate = 0
    }
    // 推定法は COGS に原価算入費が内包済み → 追加控除不要
    // before/after は同値だが、inclusionApplied は常に true
    inclusionApplied = true
  }

  return GrossProfitReadModel.parse({
    grossProfit,
    grossProfitRate,
    method,
    inclusionMode,
    meta: {
      usedFallback: false,
      source: method,
      inclusionApplied,
      rounding: {
        amountMethod: 'round' as const,
        amountPrecision: 0 as const,
        rateMethod: 'raw' as const,
      },
    },
  })
}

/**
 * フォールバック付き粗利計算。
 *
 * 在庫法を試行し、在庫データ不足の場合は推定法にフォールバックする。
 * meta.usedFallback で実際に使用された方法を記録。
 */
export function calculateGrossProfitWithFallback(input: {
  readonly sales: number
  readonly totalPurchaseCost: number
  readonly inventoryPurchaseCost: number
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly costInclusion: number
  readonly inclusionMode: 'before_cost_inclusion' | 'after_cost_inclusion'
  readonly coreSales: number
  readonly discountRate: number
  readonly markupRate: number
}): GrossProfitReadModelType {
  // まず在庫法を試行
  if (input.openingInventory != null && input.closingInventory != null) {
    const result = calculateGrossProfit({
      sales: input.sales,
      purchaseCost: input.totalPurchaseCost,
      openingInventory: input.openingInventory,
      closingInventory: input.closingInventory,
      costInclusion: input.costInclusion,
      method: 'inventory',
      inclusionMode: input.inclusionMode,
    })

    if (result.grossProfit !== 0 || result.grossProfitRate !== 0) {
      return result
    }
  }

  // 在庫法が使えない → 推定法にフォールバック
  const fallbackResult = calculateGrossProfit({
    sales: input.coreSales,
    purchaseCost: input.inventoryPurchaseCost,
    openingInventory: input.openingInventory,
    costInclusion: input.costInclusion,
    method: 'estimated',
    inclusionMode: input.inclusionMode,
    discountRate: input.discountRate,
    markupRate: input.markupRate,
  })

  // meta を上書きしてフォールバック情報を記録
  return GrossProfitReadModel.parse({
    ...fallbackResult,
    meta: {
      ...fallbackResult.meta,
      usedFallback: true,
      source: 'estimated',
    },
  })
}

// ── StoreResult → 粗利正本のアダプター ──

/**
 * StoreResult から粗利を正本計算する。
 *
 * conditionSummaryUtils の4関数を置換するためのアダプター。
 * シグネチャ互換（StoreResult → number）を維持しつつ、内部を正本経由にする。
 */
export function grossProfitFromStoreResult(
  sr: {
    readonly totalSales: number
    readonly totalCost: number
    readonly inventoryCost: number
    readonly openingInventory: number | null
    readonly closingInventory: number | null
    readonly totalCostInclusion: number
    readonly totalCoreSales: number
    readonly discountRate: number
    readonly coreMarkupRate: number
  },
  inclusionMode: 'before_cost_inclusion' | 'after_cost_inclusion',
): GrossProfitReadModelType {
  return calculateGrossProfitWithFallback({
    sales: sr.totalSales,
    totalPurchaseCost: sr.totalCost,
    inventoryPurchaseCost: sr.inventoryCost,
    openingInventory: sr.openingInventory,
    closingInventory: sr.closingInventory,
    costInclusion: sr.totalCostInclusion,
    inclusionMode,
    coreSales: sr.totalCoreSales,
    discountRate: sr.discountRate,
    markupRate: sr.coreMarkupRate,
  })
}
