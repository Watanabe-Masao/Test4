/**
 * factor-decomposition-wasm 型付きモック
 *
 * Rust WASM モジュールの API サーフェスを模倣する。
 * init() は resolve し、計算関数は TS ドメイン関数の結果を
 * Rust と同じ Float64Array 形式に変換して返す。
 *
 * wrapper（factorDecompositionWasm.ts）がこの Float64Array を TS 型に戻すので、
 * 結果は TS 直接呼出と同一になる。
 */
import {
  decompose2 as decompose2TS,
  decompose3 as decompose3TS,
  decompose5 as decompose5TS,
  decomposePriceMix as decomposePriceMixTS,
} from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'

export default function init(): Promise<void> {
  return Promise.resolve()
}

/** [custEffect, ticketEffect] */
export function decompose2(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
): Float64Array {
  const r = decompose2TS(prevSales, curSales, prevCust, curCust)
  return Float64Array.from([r.custEffect, r.ticketEffect])
}

/** [custEffect, qtyEffect, pricePerItemEffect] */
export function decompose3(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
): Float64Array {
  const r = decompose3TS(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  return Float64Array.from([r.custEffect, r.qtyEffect, r.pricePerItemEffect])
}

/** [isNull, priceEffect, mixEffect] — isNull: 0.0=valid, 1.0=null */
export function decompose_price_mix(
  curKeys: string[],
  curQtys: Float64Array,
  curAmts: Float64Array,
  prevKeys: string[],
  prevQtys: Float64Array,
  prevAmts: Float64Array,
): Float64Array {
  const curCats = rebuildCategories(curKeys, curQtys, curAmts)
  const prevCats = rebuildCategories(prevKeys, prevQtys, prevAmts)
  const r = decomposePriceMixTS(curCats, prevCats)
  if (r === null) {
    return Float64Array.from([1.0, 0.0, 0.0])
  }
  return Float64Array.from([0.0, r.priceEffect, r.mixEffect])
}

/** [isNull, custEffect, qtyEffect, priceEffect, mixEffect] */
export function decompose5(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
  curKeys: string[],
  curQtys: Float64Array,
  curAmts: Float64Array,
  prevKeys: string[],
  prevQtys: Float64Array,
  prevAmts: Float64Array,
): Float64Array {
  const curCats = rebuildCategories(curKeys, curQtys, curAmts)
  const prevCats = rebuildCategories(prevKeys, prevQtys, prevAmts)
  const r = decompose5TS(
    prevSales,
    curSales,
    prevCust,
    curCust,
    prevTotalQty,
    curTotalQty,
    curCats,
    prevCats,
  )
  if (r === null) {
    return Float64Array.from([1.0, 0.0, 0.0, 0.0, 0.0])
  }
  return Float64Array.from([0.0, r.custEffect, r.qtyEffect, r.priceEffect, r.mixEffect])
}

/* ── 並列配列 → CategoryQtyAmt[] 変換 ── */

function rebuildCategories(
  keys: string[],
  qtys: Float64Array,
  amts: Float64Array,
): CategoryQtyAmt[] {
  const len = Math.min(keys.length, qtys.length, amts.length)
  const result: CategoryQtyAmt[] = []
  for (let i = 0; i < len; i++) {
    result.push({ key: keys[i], qty: qtys[i], amt: amts[i] })
  }
  return result
}
