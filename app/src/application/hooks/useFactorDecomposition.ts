/**
 * 要因分解フック
 *
 * presentation 層が domain/calculations/factorDecomposition を直接呼ぶことを避け、
 * application 層で分解結果を提供する。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import {
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from '@/application/services/factorDecompositionBridge'
import type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  CategoryQtyAmt,
  PriceMixResult,
} from '@/domain/calculations/factorDecomposition'

// Re-export types for presentation layer
export type { TwoFactorResult, ThreeFactorResult, FiveFactorResult, CategoryQtyAmt, PriceMixResult }

/** 2要素シャープリー分解（客数×客単価） */
export function useDecompose2(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
): TwoFactorResult {
  return useMemo(
    () => decompose2(prevSales, curSales, prevCust, curCust),
    [prevSales, curSales, prevCust, curCust],
  )
}

/** 3要素シャープリー分解（客数×点数×単価） */
export function useDecompose3(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
): ThreeFactorResult {
  return useMemo(
    () => decompose3(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty),
    [prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty],
  )
}

/** 5要素分解（客数×点数×価格×構成比） */
export function useDecompose5(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): FiveFactorResult | null {
  return useMemo(
    () =>
      decompose5(
        prevSales,
        curSales,
        prevCust,
        curCust,
        prevTotalQty,
        curTotalQty,
        curCategories,
        prevCategories,
      ),
    [
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    ],
  )
}

/** 価格×構成比分解 */
export function useDecomposePriceMix(
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): PriceMixResult | null {
  return useMemo(
    () => decomposePriceMix(curCategories, prevCategories),
    [curCategories, prevCategories],
  )
}
