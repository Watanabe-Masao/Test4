/**
 * ピン止め区間計算フック
 *
 * presentation 層が domain/calculations/pinIntervals を直接呼ぶことを避け、
 * application 層でピン区間結果を提供する。
 */
import { useMemo } from 'react'
import { calculatePinIntervals } from '@/domain/calculations/pinIntervals'
import type { PinInterval } from '@/domain/calculations/pinIntervals'
import type { DailyRecord } from '@/domain/models/record'

export type { PinInterval }

/** ピン止め区間の在庫法粗利率を計算 */
export function usePinIntervals(
  daily: ReadonlyMap<number, DailyRecord>,
  openingInventory: number | null,
  pins: [number, number][],
): PinInterval[] {
  return useMemo(
    () => calculatePinIntervals(daily, openingInventory, pins),
    [daily, openingInventory, pins],
  )
}
