/**
 * 在庫推定フック
 *
 * presentation 層が domain/calculations/inventoryCalc を直接呼ぶことを避け、
 * application 層で在庫推定結果を提供する。
 */
import { useMemo } from 'react'
import {
  computeEstimatedInventory,
  computeEstimatedInventoryDetails,
} from '@/domain/calculations/inventoryCalc'
import type { InventoryPoint, InventoryDetailRow } from '@/domain/calculations/inventoryCalc'
import type { DailyRecord } from '@/domain/models'

// Re-export types for presentation layer
export type { InventoryPoint, InventoryDetailRow }

/** 在庫推定ポイントを計算 */
export function useEstimatedInventory(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number | null,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
): InventoryPoint[] | null {
  return useMemo(() => {
    if (openingInventory == null) return null
    return computeEstimatedInventory(
      daily,
      daysInMonth,
      openingInventory,
      closingInventory,
      markupRate,
      discountRate,
    )
  }, [daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate])
}

/** 在庫推定詳細行を計算 */
export function useEstimatedInventoryDetails(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number | null,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
): InventoryDetailRow[] {
  return useMemo(() => {
    if (openingInventory == null) return []
    return computeEstimatedInventoryDetails(
      daily,
      daysInMonth,
      openingInventory,
      closingInventory,
      markupRate,
      discountRate,
    )
  }, [daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate])
}

// Non-hook re-exports for loop contexts (e.g. multi-store comparison useMemo)
export { computeEstimatedInventory, computeEstimatedInventoryDetails }
