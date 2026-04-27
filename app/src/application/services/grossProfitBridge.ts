/**
 * grossProfit WASM business-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-001 (invMethod), BIZ-002 (estMethod), BIZ-005 (discountImpact), BIZ-006 (costAggregation)
 *
 * WASM が ready なら WASM 実装を使用し、未初期化時は TS にフォールバックする。
 * public API と import path は従来と同一。
 *
 * 対象: 8 business-authoritative single-store core 関数 + 2 CalculationResult 版
 *
 * 類型 C:
 *   - numeric core は WASM business-authoritative
 *   - calculateEstMethodWithStatus: status/warnings は TS business-authoritative
 *   - calculateDiscountImpact: CalculationResult は TS business-authoritative
 *
 * @see references/03-guides/contract-definition-policy.md — 契約定義ポリシー
 * @see references/01-principles/semantic-classification-policy.md — 意味分類ポリシー
 *
 * @responsibility R:unclassified
 */
import {
  calculateInvMethod as calculateInvMethodTS,
  calculateEstMethodWithStatus as calculateEstMethodWithStatusTS,
  calculateCoreSales as calculateCoreSalesTS,
  calculateDiscountRate as calculateDiscountRateTS,
  calculateDiscountImpactWithStatus as calculateDiscountImpactWithStatusTS,
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
import type { CalculationResult } from '@/domain/models/CalculationResult'
import { getGrossProfitWasmExports } from './wasmEngine'
import {
  calculateInvMethodWasm,
  calculateCoreSalesWasm,
  calculateDiscountRateWasm,
  calculateMarkupRatesWasm,
  calculateTransferTotalsWasm,
  calculateInventoryCostWasm,
} from './grossProfitWasm'

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

function isWasmReady(): boolean {
  return getGrossProfitWasmExports() !== null
}

/* ── numeric core: WASM authoritative ────────── */

export function calculateInvMethod(input: InvMethodInput): InvMethodResult {
  if (isWasmReady()) return calculateInvMethodWasm(input)
  return calculateInvMethodTS(input)
}

export function calculateCoreSales(
  totalSales: number,
  deliverySales: number,
  deliveryCost: number,
): ReturnType<typeof calculateCoreSalesTS> {
  if (isWasmReady()) return calculateCoreSalesWasm(totalSales, deliverySales, deliveryCost)
  return calculateCoreSalesTS(totalSales, deliverySales, deliveryCost)
}

export function calculateDiscountRate(totalDiscountAmount: number, totalSales: number): number {
  if (isWasmReady()) return calculateDiscountRateWasm(totalDiscountAmount, totalSales)
  return calculateDiscountRateTS(totalDiscountAmount, totalSales)
}

export function calculateMarkupRates(input: MarkupRateInput): MarkupRateResult {
  if (isWasmReady()) return calculateMarkupRatesWasm(input)
  return calculateMarkupRatesTS(input)
}

export function calculateTransferTotals(input: TransferTotalsInput): TransferTotalsResult {
  if (isWasmReady()) return calculateTransferTotalsWasm(input)
  return calculateTransferTotalsTS(input)
}

export function calculateInventoryCost(totalCost: number, deliverySalesCost: number): number {
  if (isWasmReady()) return calculateInventoryCostWasm(totalCost, deliverySalesCost)
  return calculateInventoryCostTS(totalCost, deliverySalesCost)
}

/* ── CalculationResult 版: status/warnings は TS authoritative ── */

/**
 * 推定法マージン計算（CalculationResult 版）
 *
 * Status/warnings は TS authoritative。WASM は numerics のみ。
 * TS が常に実行される。
 */
export function calculateEstMethodWithStatus(
  input: EstMethodInput,
): CalculationResult<EstMethodResult> {
  return calculateEstMethodWithStatusTS(input)
}

/**
 * 推定法マージン計算
 *
 * @deprecated calculateEstMethodWithStatus を使用してください
 * @expiresAt 2026-12-31
 * @sunsetCondition 全 caller が calculateEstMethodWithStatus 版に移行し、本関数の参照が 0 になった時
 * @reason 結果値のみ返す旧 API。WithStatus 版は status/issue 情報を含むため、エラー処理品質が向上する
 */
export function calculateEstMethod(input: EstMethodInput): EstMethodResult {
  const result = calculateEstMethodWithStatus(input)
  if (result.value != null) return result.value
  return { grossSales: 0, cogs: 0, margin: 0, marginRate: 0, closingInventory: null }
}

/**
 * 売変ロス原価計算（CalculationResult 版）
 *
 * Status/warnings は TS authoritative。
 */
export function calculateDiscountImpact(
  input: DiscountImpactInput,
): CalculationResult<DiscountImpactResult> {
  return calculateDiscountImpactWithStatusTS(input)
}

/**
 * 売変ロス原価計算（CalculationResult 版 — エイリアス）
 */
export function calculateDiscountImpactWithStatus(
  input: DiscountImpactInput,
): CalculationResult<DiscountImpactResult> {
  return calculateDiscountImpact(input)
}
