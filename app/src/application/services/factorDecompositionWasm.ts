/**
 * factorDecomposition WASM wrapper
 *
 * WASM の Float64Array 戻り値を既存の型に変換する薄い adapter。
 * ロジック判断・比較・モード判断・フォールバックは一切含めない（bridge の責務）。
 */
import type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  PriceMixResult,
  CategoryQtyAmt,
} from '@/domain/calculations/factorDecomposition'
import { getWasmExports } from './wasmEngine'

/* ── CategoryQtyAmt[] → 並列配列変換 ─────────── */

function toParallelArrays(categories: readonly CategoryQtyAmt[]): {
  keys: string[]
  qtys: Float64Array
  amts: Float64Array
} {
  const len = categories.length
  const keys: string[] = new Array(len)
  const qtys = new Float64Array(len)
  const amts = new Float64Array(len)
  for (let i = 0; i < len; i++) {
    keys[i] = categories[i].key
    qtys[i] = categories[i].qty
    amts[i] = categories[i].amt
  }
  return { keys, qtys, amts }
}

/* ── WASM 呼び出し wrapper ────────────────────── */

export function decompose2Wasm(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
): TwoFactorResult {
  const wasm = getWasmExports()!
  const arr = wasm.decompose2(prevSales, curSales, prevCust, curCust)
  return {
    custEffect: arr[0],
    ticketEffect: arr[1],
  }
}

export function decompose3Wasm(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
): ThreeFactorResult {
  const wasm = getWasmExports()!
  const arr = wasm.decompose3(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  return {
    custEffect: arr[0],
    qtyEffect: arr[1],
    pricePerItemEffect: arr[2],
  }
}

export function decomposePriceMixWasm(
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): PriceMixResult | null {
  const wasm = getWasmExports()!
  const cur = toParallelArrays(curCategories)
  const prev = toParallelArrays(prevCategories)
  const arr = wasm.decompose_price_mix(
    cur.keys,
    cur.qtys,
    cur.amts,
    prev.keys,
    prev.qtys,
    prev.amts,
  )
  if (arr[0] === 1.0) return null // null sentinel
  return {
    priceEffect: arr[1],
    mixEffect: arr[2],
  }
}

export function decompose5Wasm(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): FiveFactorResult | null {
  const wasm = getWasmExports()!
  const cur = toParallelArrays(curCategories)
  const prev = toParallelArrays(prevCategories)
  const arr = wasm.decompose5(
    prevSales,
    curSales,
    prevCust,
    curCust,
    prevTotalQty,
    curTotalQty,
    cur.keys,
    cur.qtys,
    cur.amts,
    prev.keys,
    prev.qtys,
    prev.amts,
  )
  if (arr[0] === 1.0) return null // null sentinel
  return {
    custEffect: arr[1],
    qtyEffect: arr[2],
    priceEffect: arr[3],
    mixEffect: arr[4],
  }
}
