/**
 * useDrilldownRecords — フィルタ済みレコードとドリルアイテムの構築
 *
 * useDrilldownData から filtering + item building の 10 useMemo を分離。
 * @guard G5 useMemo 上限分離
 */
import { useMemo } from 'react'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import {
  filterByHierarchy,
  type HierarchyFilter,
} from '@/presentation/components/charts/categoryHierarchyHooks'
import { buildDrillItems, type DrillItem, type MetricKey } from './drilldownUtils'
import { buildLevelColorMap } from './useDrilldownDataLogic'

type DrillLevel = 'department' | 'line' | 'klass'

interface DrilldownRecordsParams {
  readonly records: readonly CategoryTimeSalesRecord[]
  readonly prevRecords: readonly CategoryTimeSalesRecord[]
  readonly cumRecords: readonly CategoryTimeSalesRecord[]
  readonly cumPrevRecords: readonly CategoryTimeSalesRecord[]
  readonly wowRecords: readonly CategoryTimeSalesRecord[]
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

  /* ── フィルタ済みレコード ────────────────── */

  const dayFiltered = useMemo(() => filterByHierarchy(records, filter), [records, filter])
  const dayFilteredYoYPrev = useMemo(
    () => (hasPrevYear ? filterByHierarchy(prevRecords, filter) : []),
    [hasPrevYear, prevRecords, filter],
  )
  const dayFilteredWoWPrev = useMemo(
    () => (hasWoW ? filterByHierarchy(wowRecords, filter) : []),
    [hasWoW, wowRecords, filter],
  )
  const cumFiltered = useMemo(() => filterByHierarchy(cumRecords, filter), [cumRecords, filter])
  const cumFilteredYoYPrev = useMemo(
    () => (hasPrevYear ? filterByHierarchy(cumPrevRecords, filter) : []),
    [hasPrevYear, cumPrevRecords, filter],
  )

  /* ── カラーマップ ────────────────────────── */

  const levelColorMap = useMemo(
    () => buildLevelColorMap(records, cumRecords, cumFiltered, dayFiltered, currentLevel),
    [records, cumRecords, cumFiltered, dayFiltered, currentLevel],
  )

  /* ── ドリルアイテム ──────────────────────── */

  const dayItemsYoY = useMemo(
    () =>
      buildDrillItems(
        dayFiltered,
        dayFilteredYoYPrev,
        currentLevel,
        metric,
        levelColorMap,
        hasPrevYear,
      ),
    [dayFiltered, dayFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  const cumItemsYoY = useMemo(
    () =>
      buildDrillItems(
        cumFiltered,
        cumFilteredYoYPrev,
        currentLevel,
        metric,
        levelColorMap,
        hasPrevYear,
      ),
    [cumFiltered, cumFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  const dayItemsWoW = useMemo(
    () =>
      hasWoW
        ? buildDrillItems(
            dayFiltered,
            dayFilteredWoWPrev,
            currentLevel,
            metric,
            levelColorMap,
            true,
          )
        : [],
    [dayFiltered, dayFilteredWoWPrev, currentLevel, metric, levelColorMap, hasWoW],
  )
  const wowItemMap = useMemo(() => {
    const map = new Map<string, DrillItem>()
    for (const it of dayItemsWoW) map.set(it.code, it)
    return map
  }, [dayItemsWoW])

  return { dayItemsYoY, cumItemsYoY, dayItemsWoW, wowItemMap, levelColorMap }
}
