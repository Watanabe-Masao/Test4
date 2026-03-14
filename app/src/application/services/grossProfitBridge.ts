/**
 * grossProfit モード切替ディスパッチャ (Bridge)
 *
 * budgetAnalysisBridge / forecastBridge / factorDecompositionBridge と同一パターン。
 * 現時点では ts-only モードのみ。WASM 実装後に dual-run-compare を追加する。
 *
 * bridge の責務: mode dispatch, 入口統一
 * bridge に含めないもの: metrics, timings, cache, mode persistence
 *
 * 対象: 8 authoritative single-store core 関数
 * 対象外: safeDivide 等のユーティリティ、aggregation/divisor 系
 */
import {
  calculateInvMethod as calculateInvMethodTS,
  calculateEstMethod as calculateEstMethodTS,
  calculateCoreSales as calculateCoreSalesTS,
  calculateDiscountRate as calculateDiscountRateTS,
  calculateDiscountImpact as calculateDiscountImpactTS,
  calculateMarkupRates as calculateMarkupRatesTS,
  calculateTransferTotals as calculateTransferTotalsTS,
  calculateInventoryCost as calculateInventoryCostTS,
} from '@/domain/calculations/grossProfit'
import type {
  InvMethodInput,
  InvMethodResult,
  EstMethodInput,
  EstMethodResult,
  DiscountImpactInput,
  DiscountImpactResult,
  MarkupRateInput,
  MarkupRateResult,
  TransferTotalsInput,
  TransferTotalsResult,
} from '@/domain/calculations/grossProfit'

// Re-export types for consumer convenience
export type {
  InvMethodInput,
  InvMethodResult,
  EstMethodInput,
  EstMethodResult,
  DiscountImpactInput,
  DiscountImpactResult,
  MarkupRateInput,
  MarkupRateResult,
  TransferTotalsInput,
  TransferTotalsResult,
}

/* ── 公開関数（ts-only） ────────────────────────── */

/**
 * 在庫法粗利計算
 *
 * Bridge エントリポイント 1: COGS・粗利・粗利率
 */
export function calculateInvMethod(input: InvMethodInput): InvMethodResult {
  // TODO: Phase 7 で dual-run-compare / wasm-only を追加
  return calculateInvMethodTS(input)
}

/**
 * 推定法マージン計算
 *
 * Bridge エントリポイント 2: 推定売上原価・マージン・期末在庫
 */
export function calculateEstMethod(input: EstMethodInput): EstMethodResult {
  return calculateEstMethodTS(input)
}

/**
 * コア売上計算
 *
 * Bridge エントリポイント 3: 総売上から売上納品を除いたコア売上
 */
export function calculateCoreSales(
  totalSales: number,
  deliverySales: number,
  deliveryCost: number,
): ReturnType<typeof calculateCoreSalesTS> {
  return calculateCoreSalesTS(totalSales, deliverySales, deliveryCost)
}

/**
 * 売変率計算
 *
 * Bridge エントリポイント 4: 売変高 / (売上高 + 売変高)
 */
export function calculateDiscountRate(
  totalDiscountAmount: number,
  totalSales: number,
): number {
  return calculateDiscountRateTS(totalDiscountAmount, totalSales)
}

/**
 * 売変ロス原価計算
 *
 * Bridge エントリポイント 5: 売変影響額
 */
export function calculateDiscountImpact(input: DiscountImpactInput): DiscountImpactResult {
  return calculateDiscountImpactTS(input)
}

/**
 * 値入率計算
 *
 * Bridge エントリポイント 6: 全体値入率・コア値入率
 */
export function calculateMarkupRates(input: MarkupRateInput): MarkupRateResult {
  return calculateMarkupRatesTS(input)
}

/**
 * 移動合計計算
 *
 * Bridge エントリポイント 7: 4方向の売価・原価合計
 */
export function calculateTransferTotals(input: TransferTotalsInput): TransferTotalsResult {
  return calculateTransferTotalsTS(input)
}

/**
 * 在庫仕入原価計算
 *
 * Bridge エントリポイント 8: 総仕入原価 - 売上納品原価
 */
export function calculateInventoryCost(totalCost: number, deliverySalesCost: number): number {
  return calculateInventoryCostTS(totalCost, deliverySalesCost)
}
