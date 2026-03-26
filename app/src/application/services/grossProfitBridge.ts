/**
 * grossProfit モード切替ディスパッチャ (Bridge)
 *
 * factorDecompositionBridge と同一パターン。
 * 3モードディスパッチ:
 *   - ts-only: TS 実装のみ
 *   - wasm-only: WASM のみ（初期化未完了時は TS フォールバック）
 *   - dual-run-compare: 両方実行→結果比較→差分ログ→TS 結果を返却
 *
 * bridge の責務: mode dispatch, fallback, dual-run compare, logging
 * bridge に含めないもの: metrics, timings, cache, mode persistence, error policy
 *
 * 対象: 8 authoritative single-store core 関数
 * 対象外: safeDivide 等のユーティリティ、aggregation/divisor 系
 */
import {
  calculateInvMethod as calculateInvMethodTS,
  calculateEstMethod as calculateEstMethodTS,
  calculateEstMethodWithStatus as calculateEstMethodWithStatusTS,
  calculateCoreSales as calculateCoreSalesTS,
  calculateDiscountRate as calculateDiscountRateTS,
  calculateDiscountImpact as calculateDiscountImpactTS,
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
import { getExecutionMode, getWasmModuleState, getGrossProfitWasmExports } from './wasmEngine'
import type { WasmState, ExecutionMode } from './wasmEngine'
import {
  calculateInvMethodWasm,
  calculateEstMethodWasm,
  calculateCoreSalesWasm,
  calculateDiscountRateWasm,
  calculateDiscountImpactWasm,
  calculateMarkupRatesWasm,
  calculateTransferTotalsWasm,
  calculateInventoryCostWasm,
} from './grossProfitWasm'
import { recordCall, recordMismatch, recordNullMismatch } from './dualRunObserver'

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

/* ── dual-run 差分ログフォーマット ────────────── */

type GrossProfitFnName =
  | 'calculateInvMethod'
  | 'calculateEstMethod'
  | 'calculateCoreSales'
  | 'calculateDiscountRate'
  | 'calculateDiscountImpact'
  | 'calculateMarkupRates'
  | 'calculateTransferTotals'
  | 'calculateInventoryCost'

export interface GrossProfitMismatchLog {
  readonly function: GrossProfitFnName
  readonly inputSummary: Record<string, number | null | undefined>
  readonly tsResult: Record<string, number | null>
  readonly wasmResult: Record<string, number | null>
  readonly diffs: Record<string, number>
  readonly maxAbsDiff: number
  readonly invariantTs: 'ok' | 'violated'
  readonly invariantWasm: 'ok' | 'violated'
  readonly wasmState: WasmState
  readonly executionMode: ExecutionMode
}

/* ── 内部ヘルパー ─────────────────────────────── */

function isWasmReady(): boolean {
  return getGrossProfitWasmExports() !== null
}

function isDualRun(): boolean {
  return import.meta.env.DEV && getExecutionMode() === 'dual-run-compare' && isWasmReady()
}

function compareNumericResults(
  fnName: GrossProfitFnName,
  tsFields: Record<string, number | null>,
  wasmFields: Record<string, number | null>,
  inputSummary: Record<string, number | null | undefined>,
  invariantChecker?: (fields: Record<string, number | null>) => 'ok' | 'violated',
): void {
  let hasNullMismatch = false
  const diffs: Record<string, number> = {}
  let maxAbsDiff = 0

  for (const key of Object.keys(tsFields)) {
    const tsVal = tsFields[key]
    const wasmVal = wasmFields[key]

    if (tsVal === null && wasmVal === null) {
      continue
    }
    if (tsVal === null || wasmVal === null) {
      hasNullMismatch = true
      continue
    }
    const diff = wasmVal - tsVal
    diffs[key] = diff
    maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff))
  }

  if (hasNullMismatch) {
    console.warn(`[grossProfit dual-run null mismatch] ${fnName}:`, {
      tsFields,
      wasmFields,
    })
    recordNullMismatch(fnName)
    return
  }

  const invariantTs = invariantChecker ? invariantChecker(tsFields) : 'ok'
  const invariantWasm = invariantChecker ? invariantChecker(wasmFields) : 'ok'

  if (maxAbsDiff > 1e-10 || invariantTs === 'violated' || invariantWasm === 'violated') {
    const log: GrossProfitMismatchLog = {
      function: fnName,
      inputSummary,
      tsResult: tsFields,
      wasmResult: wasmFields,
      diffs,
      maxAbsDiff,
      invariantTs,
      invariantWasm,
      wasmState: getWasmModuleState('grossProfit'),
      executionMode: getExecutionMode(),
    }
    console.warn('[grossProfit dual-run mismatch]', log)
    recordMismatch(
      fnName,
      maxAbsDiff,
      invariantTs,
      invariantWasm,
      inputSummary as Record<string, number | undefined>,
    )
  }
}

/* ── 公開関数 ─────────────────────────────────── */

/**
 * 在庫法粗利計算
 */
export function calculateInvMethod(input: InvMethodInput): InvMethodResult {
  if (import.meta.env.DEV) recordCall('calculateInvMethod')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateInvMethodTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateInvMethodWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateInvMethodTS(input)
  if (isDualRun()) {
    const wasmResult = calculateInvMethodWasm(input)
    compareNumericResults(
      'calculateInvMethod',
      {
        cogs: tsResult.cogs,
        grossProfit: tsResult.grossProfit,
        grossProfitRate: tsResult.grossProfitRate,
      },
      {
        cogs: wasmResult.cogs,
        grossProfit: wasmResult.grossProfit,
        grossProfitRate: wasmResult.grossProfitRate,
      },
      {
        openingInventory: input.openingInventory,
        closingInventory: input.closingInventory,
        totalSales: input.totalSales,
      },
    )
  }
  return tsResult
}

/**
 * 推定法マージン計算
 */
export function calculateEstMethod(input: EstMethodInput): EstMethodResult {
  if (import.meta.env.DEV) recordCall('calculateEstMethod')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateEstMethodTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateEstMethodWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateEstMethodTS(input)
  if (isDualRun()) {
    const wasmResult = calculateEstMethodWasm(input)
    compareNumericResults(
      'calculateEstMethod',
      {
        grossSales: tsResult.grossSales,
        cogs: tsResult.cogs,
        margin: tsResult.margin,
        marginRate: tsResult.marginRate,
        closingInventory: tsResult.closingInventory,
      },
      {
        grossSales: wasmResult.grossSales,
        cogs: wasmResult.cogs,
        margin: wasmResult.margin,
        marginRate: wasmResult.marginRate,
        closingInventory: wasmResult.closingInventory,
      },
      {
        coreSales: input.coreSales,
        discountRate: input.discountRate,
        markupRate: input.markupRate,
      },
    )
  }
  return tsResult
}

/**
 * コア売上計算
 */
export function calculateCoreSales(
  totalSales: number,
  deliverySales: number,
  deliveryCost: number,
): ReturnType<typeof calculateCoreSalesTS> {
  if (import.meta.env.DEV) recordCall('calculateCoreSales')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateCoreSalesTS(totalSales, deliverySales, deliveryCost)
  }

  if (mode === 'wasm-only') {
    return calculateCoreSalesWasm(totalSales, deliverySales, deliveryCost)
  }

  // dual-run-compare
  const tsResult = calculateCoreSalesTS(totalSales, deliverySales, deliveryCost)
  if (isDualRun()) {
    const wasmResult = calculateCoreSalesWasm(totalSales, deliverySales, deliveryCost)
    // boolean exact match check
    if (tsResult.isOverDelivery !== wasmResult.isOverDelivery) {
      console.warn('[grossProfit dual-run null mismatch] calculateCoreSales:', {
        tsIsOverDelivery: tsResult.isOverDelivery,
        wasmIsOverDelivery: wasmResult.isOverDelivery,
      })
      recordNullMismatch('calculateCoreSales')
    }
    compareNumericResults(
      'calculateCoreSales',
      { coreSales: tsResult.coreSales, overDeliveryAmount: tsResult.overDeliveryAmount },
      { coreSales: wasmResult.coreSales, overDeliveryAmount: wasmResult.overDeliveryAmount },
      { totalSales, deliverySales, deliveryCost },
    )
  }
  return tsResult
}

/**
 * 売変率計算
 */
export function calculateDiscountRate(totalDiscountAmount: number, totalSales: number): number {
  if (import.meta.env.DEV) recordCall('calculateDiscountRate')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateDiscountRateTS(totalDiscountAmount, totalSales)
  }

  if (mode === 'wasm-only') {
    return calculateDiscountRateWasm(totalDiscountAmount, totalSales)
  }

  // dual-run-compare
  const tsResult = calculateDiscountRateTS(totalDiscountAmount, totalSales)
  if (isDualRun()) {
    const wasmResult = calculateDiscountRateWasm(totalDiscountAmount, totalSales)
    compareNumericResults(
      'calculateDiscountRate',
      { rate: tsResult },
      { rate: wasmResult },
      { totalDiscountAmount, totalSales },
    )
  }
  return tsResult
}

/**
 * 売変ロス原価計算
 */
export function calculateDiscountImpact(input: DiscountImpactInput): DiscountImpactResult {
  if (import.meta.env.DEV) recordCall('calculateDiscountImpact')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateDiscountImpactTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateDiscountImpactWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateDiscountImpactTS(input)
  if (isDualRun()) {
    const wasmResult = calculateDiscountImpactWasm(input)
    compareNumericResults(
      'calculateDiscountImpact',
      { discountLossCost: tsResult.discountLossCost },
      { discountLossCost: wasmResult.discountLossCost },
      {
        coreSales: input.coreSales,
        markupRate: input.markupRate,
        discountRate: input.discountRate,
      },
    )
  }
  return tsResult
}

/**
 * 値入率計算
 */
export function calculateMarkupRates(input: MarkupRateInput): MarkupRateResult {
  if (import.meta.env.DEV) recordCall('calculateMarkupRates')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateMarkupRatesTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateMarkupRatesWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateMarkupRatesTS(input)
  if (isDualRun()) {
    const wasmResult = calculateMarkupRatesWasm(input)
    compareNumericResults(
      'calculateMarkupRates',
      { averageMarkupRate: tsResult.averageMarkupRate, coreMarkupRate: tsResult.coreMarkupRate },
      {
        averageMarkupRate: wasmResult.averageMarkupRate,
        coreMarkupRate: wasmResult.coreMarkupRate,
      },
      { purchasePrice: input.purchasePrice, purchaseCost: input.purchaseCost },
    )
  }
  return tsResult
}

/**
 * 移動合計計算
 */
export function calculateTransferTotals(input: TransferTotalsInput): TransferTotalsResult {
  if (import.meta.env.DEV) recordCall('calculateTransferTotals')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateTransferTotalsTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateTransferTotalsWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateTransferTotalsTS(input)
  if (isDualRun()) {
    const wasmResult = calculateTransferTotalsWasm(input)
    compareNumericResults(
      'calculateTransferTotals',
      { transferPrice: tsResult.transferPrice, transferCost: tsResult.transferCost },
      { transferPrice: wasmResult.transferPrice, transferCost: wasmResult.transferCost },
      { interStoreInPrice: input.interStoreInPrice, interStoreOutPrice: input.interStoreOutPrice },
    )
  }
  return tsResult
}

/**
 * 在庫仕入原価計算
 */
export function calculateInventoryCost(totalCost: number, deliverySalesCost: number): number {
  if (import.meta.env.DEV) recordCall('calculateInventoryCost')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateInventoryCostTS(totalCost, deliverySalesCost)
  }

  if (mode === 'wasm-only') {
    return calculateInventoryCostWasm(totalCost, deliverySalesCost)
  }

  // dual-run-compare
  const tsResult = calculateInventoryCostTS(totalCost, deliverySalesCost)
  if (isDualRun()) {
    const wasmResult = calculateInventoryCostWasm(totalCost, deliverySalesCost)
    compareNumericResults(
      'calculateInventoryCost',
      { inventoryCost: tsResult },
      { inventoryCost: wasmResult },
      { totalCost, deliverySalesCost },
    )
  }
  return tsResult
}

/* ── CalculationResult 版（TS authoritative — status/warnings の正本） ── */

/**
 * 推定法マージン計算（CalculationResult 版）
 *
 * Status/warnings は TS authoritative。WASM は数値検証のみ（dual-run 時）。
 */
export function calculateEstMethodWithStatus(
  input: EstMethodInput,
): CalculationResult<EstMethodResult> {
  if (import.meta.env.DEV) recordCall('calculateEstMethod')

  const tsStatusResult = calculateEstMethodWithStatusTS(input)

  // dual-run: 数値比較のみ（status/warnings は TS が権威）
  if (isDualRun() && tsStatusResult.value) {
    const wasmResult = calculateEstMethodWasm(input)
    compareNumericResults(
      'calculateEstMethod',
      {
        grossSales: tsStatusResult.value.grossSales,
        cogs: tsStatusResult.value.cogs,
        margin: tsStatusResult.value.margin,
        marginRate: tsStatusResult.value.marginRate,
        closingInventory: tsStatusResult.value.closingInventory,
      },
      {
        grossSales: wasmResult.grossSales,
        cogs: wasmResult.cogs,
        margin: wasmResult.margin,
        marginRate: wasmResult.marginRate,
        closingInventory: wasmResult.closingInventory,
      },
      {
        coreSales: input.coreSales,
        discountRate: input.discountRate,
        markupRate: input.markupRate,
      },
    )
  }

  return tsStatusResult
}

/**
 * 売変ロス原価計算（CalculationResult 版）
 *
 * Status/warnings は TS authoritative。WASM は数値検証のみ（dual-run 時）。
 */
export function calculateDiscountImpactWithStatus(
  input: DiscountImpactInput,
): CalculationResult<DiscountImpactResult> {
  if (import.meta.env.DEV) recordCall('calculateDiscountImpact')

  const tsStatusResult = calculateDiscountImpactWithStatusTS(input)

  // dual-run: 数値比較のみ（status/warnings は TS が権威）
  if (isDualRun() && tsStatusResult.value) {
    const wasmResult = calculateDiscountImpactWasm(input)
    compareNumericResults(
      'calculateDiscountImpact',
      { discountLossCost: tsStatusResult.value.discountLossCost },
      { discountLossCost: wasmResult.discountLossCost },
      {
        coreSales: input.coreSales,
        markupRate: input.markupRate,
        discountRate: input.discountRate,
      },
    )
  }

  return tsStatusResult
}
