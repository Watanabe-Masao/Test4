/**
 * useCtsQuantity — 当年 CTS 販売点数の事前集計フック
 *
 * raw CTS レコードを Application 層で集計し、Presentation 層に
 * 事前集計済みの値のみを公開する。
 *
 * Presentation 層が raw CTS レコードに直接触れることを防ぎ、
 * 販売点数の唯一の取得口として機能する。
 *
 * @guard A3 Presentation は描画専用
 * @guard F7 View に raw 値を渡さない
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

/** 当年販売点数の事前集計結果 */
export interface CurrentCtsQuantity {
  /** 全店合計 */
  readonly total: number
  /** 店舗別合計 */
  readonly byStore: ReadonlyMap<string, number>
  /** 日別合計（key = day number） */
  readonly byDay: ReadonlyMap<number, number>
}

const EMPTY_CTS: CurrentCtsQuantity = {
  total: 0,
  byStore: new Map(),
  byDay: new Map(),
}

/** CTS レコードを effectiveDay・店舗でスコープし集計する純粋関数 */
export function aggregateCurrentCts(
  records: readonly CategoryTimeSalesRecord[],
  effectiveDay: number,
  selectedStoreIds: ReadonlySet<string>,
  isAllStores: boolean,
): CurrentCtsQuantity {
  if (records.length === 0) return EMPTY_CTS
  let total = 0
  const byStore = new Map<string, number>()
  const byDay = new Map<number, number>()
  for (const r of records) {
    if (r.day > effectiveDay || r.day <= 0) continue
    if (!isAllStores && !selectedStoreIds.has(r.storeId)) continue
    total += r.totalQuantity
    byStore.set(r.storeId, (byStore.get(r.storeId) ?? 0) + r.totalQuantity)
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.totalQuantity)
  }
  return { total, byStore, byDay }
}

/**
 * 当年 CTS 販売点数を事前集計するフック。
 *
 * Application 層で raw CTS レコードにアクセスし、
 * effectiveDay + 店舗フィルタ適用済みの集計結果を返す。
 */
export function useCtsQuantity(
  effectiveDay: number,
  selectedStoreIds: ReadonlySet<string>,
): CurrentCtsQuantity {
  const ctsRecords = useDataStore(
    (s) => s.currentMonthData?.categoryTimeSales.records ?? EMPTY_RECORDS,
  )
  const isAllStores = selectedStoreIds.size === 0

  return useMemo(
    () => aggregateCurrentCts(ctsRecords, effectiveDay, selectedStoreIds, isAllStores),
    [ctsRecords, effectiveDay, selectedStoreIds, isAllStores],
  )
}
