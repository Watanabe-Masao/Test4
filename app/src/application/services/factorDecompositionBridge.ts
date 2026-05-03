/**
 * factorDecomposition WASM business-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-004
 *
 * WASM が ready なら WASM 実装を使用し、未初期化時は TS にフォールバックする。
 * public API と import path は従来と同一。
 * 技法は Shapley（analytic）だが意味責任は business。
 *
 * @see references/03-implementation/contract-definition-policy.md — 契約定義ポリシー
 * @see references/01-foundation/semantic-classification-policy.md — 意味分類ポリシー
 *
 * @responsibility R:unclassified
 */
import {
  decompose2 as decompose2TS,
  decompose3 as decompose3TS,
  decompose5 as decompose5TS,
  decomposePriceMix as decomposePriceMixTS,
} from '@/domain/calculations/factorDecomposition'
import type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  PriceMixResult,
  CategoryQtyAmt,
} from '@/domain/calculations/factorDecomposition'
import { getWasmModuleState } from './wasmEngine'
import {
  decompose2Wasm,
  decompose3Wasm,
  decompose5Wasm,
  decomposePriceMixWasm,
} from './factorDecompositionWasm'

// Re-export types for consumer convenience
export type { TwoFactorResult, ThreeFactorResult, FiveFactorResult, PriceMixResult, CategoryQtyAmt }

function isWasmReady(): boolean {
  return getWasmModuleState('factorDecomposition') === 'ready'
}

export function decompose2(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
): TwoFactorResult {
  if (isWasmReady()) return decompose2Wasm(prevSales, curSales, prevCust, curCust)
  return decompose2TS(prevSales, curSales, prevCust, curCust)
}

export function decompose3(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
): ThreeFactorResult {
  if (isWasmReady())
    return decompose3Wasm(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  return decompose3TS(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
}

export function decomposePriceMix(
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): PriceMixResult | null {
  if (isWasmReady()) return decomposePriceMixWasm(curCategories, prevCategories)
  return decomposePriceMixTS(curCategories, prevCategories)
}

export function decompose5(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): FiveFactorResult | null {
  if (isWasmReady())
    return decompose5Wasm(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    )
  return decompose5TS(
    prevSales,
    curSales,
    prevCust,
    curCust,
    prevTotalQty,
    curTotalQty,
    curCategories,
    prevCategories,
  )
}
