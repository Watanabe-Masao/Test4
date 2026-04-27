/**
 * useDrilldownRecords — フィルタ済みレコードとドリルアイテムの構築
 *
 * useDrilldownData から filtering + item building を分離。
 * 計算は pure builder に委譲し、useMemo は 3 個に集約。
 * @guard G5 useMemo 上限分離
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { HierarchyFilter } from '@/presentation/components/charts/categoryHierarchyHooks'
import type { DrillItem, MetricKey } from './drilldownUtils'
import {
  buildFilteredRecords,
  buildDrilldownItems,
  type DrilldownFilteredRecords,
} from './useDrilldownRecordsBuilders'
import { buildLevelColorMap } from './useDrilldownDataLogic'

type DrillLevel = 'department' | 'line' | 'klass'

interface DrilldownRecordsParams {
  readonly records: readonly CategoryLeafDailyEntry[]
  readonly prevRecords: readonly CategoryLeafDailyEntry[]
  readonly cumRecords: readonly CategoryLeafDailyEntry[]
  readonly cumPrevRecords: readonly CategoryLeafDailyEntry[]
  readonly wowRecords: readonly CategoryLeafDailyEntry[]
  readonly filter: HierarchyFilter
  readonly currentLevel: DrillLevel
  readonly metric: MetricKey
  readonly hasPrevYear: boolean
  readonly hasWoW: boolean
}

export interface DrilldownRecordsResult {
  readonly dayItemsYoY: DrillItem[]
  readonly cumItemsYoY: DrillItem[]
  readonly dayItemsWoW: DrillItem[]
  readonly wowItemMap: Map<string, DrillItem>
  readonly levelColorMap: Map<string, string>
}

export function useDrilldownRecords(params: DrilldownRecordsParams): DrilldownRecordsResult {
  const {
    records,
    prevRecords,
    cumRecords,
    cumPrevRecords,
    wowRecords,
    filter,
    currentLevel,
    metric,
    hasPrevYear,
    hasWoW,
  } = params

  /* ── フィルタ済みレコード（5→1 useMemo に集約） ── */

  const filtered: DrilldownFilteredRecords = useMemo(
    () =>
      buildFilteredRecords(
        { records, prevRecords, cumRecords, cumPrevRecords, wowRecords },
        filter,
        hasPrevYear,
        hasWoW,
      ),
    [records, prevRecords, cumRecords, cumPrevRecords, wowRecords, filter, hasPrevYear, hasWoW],
  )

  /* ── カラーマップ ── */

  const levelColorMap = useMemo(
    () =>
      buildLevelColorMap(
        records,
        cumRecords,
        filtered.cumFiltered,
        filtered.dayFiltered,
        currentLevel,
      ),
    [records, cumRecords, filtered.cumFiltered, filtered.dayFiltered, currentLevel],
  )

  /* ── ドリルアイテム（4→1 useMemo に集約） ── */

  const items = useMemo(
    () => buildDrilldownItems(filtered, currentLevel, metric, levelColorMap, hasPrevYear, hasWoW),
    [filtered, currentLevel, metric, levelColorMap, hasPrevYear, hasWoW],
  )

  return { ...items, levelColorMap }
}
