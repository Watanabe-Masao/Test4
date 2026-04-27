/**
 * useDrilldownRecords の pure builder 関数群
 *
 * React hooks (useMemo) を使わない純粋関数。
 * useDrilldownRecords.ts から呼ばれ、フィルタリングとアイテム構築を担う。
 *
 * @responsibility R:unclassified
 */
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import {
  filterByHierarchy,
  type HierarchyFilter,
} from '@/presentation/components/charts/categoryHierarchyHooks'
import { buildDrillItems, type DrillItem, type MetricKey } from './drilldownUtils'

type DrillLevel = 'department' | 'line' | 'klass'

export interface DrilldownFilteredRecords {
  readonly dayFiltered: readonly CategoryLeafDailyEntry[]
  readonly dayFilteredYoYPrev: readonly CategoryLeafDailyEntry[]
  readonly dayFilteredWoWPrev: readonly CategoryLeafDailyEntry[]
  readonly cumFiltered: readonly CategoryLeafDailyEntry[]
  readonly cumFilteredYoYPrev: readonly CategoryLeafDailyEntry[]
}

interface RecordSets {
  readonly records: readonly CategoryLeafDailyEntry[]
  readonly prevRecords: readonly CategoryLeafDailyEntry[]
  readonly cumRecords: readonly CategoryLeafDailyEntry[]
  readonly cumPrevRecords: readonly CategoryLeafDailyEntry[]
  readonly wowRecords: readonly CategoryLeafDailyEntry[]
}

/** 5 種のフィルタリングを一括実行する pure 関数 */
export function buildFilteredRecords(
  sets: RecordSets,
  filter: HierarchyFilter,
  hasPrevYear: boolean,
  hasWoW: boolean,
): DrilldownFilteredRecords {
  return {
    dayFiltered: filterByHierarchy(sets.records, filter),
    dayFilteredYoYPrev: hasPrevYear ? filterByHierarchy(sets.prevRecords, filter) : [],
    dayFilteredWoWPrev: hasWoW ? filterByHierarchy(sets.wowRecords, filter) : [],
    cumFiltered: filterByHierarchy(sets.cumRecords, filter),
    cumFilteredYoYPrev: hasPrevYear ? filterByHierarchy(sets.cumPrevRecords, filter) : [],
  }
}

interface DrilldownItemsResult {
  readonly dayItemsYoY: DrillItem[]
  readonly cumItemsYoY: DrillItem[]
  readonly dayItemsWoW: DrillItem[]
  readonly wowItemMap: Map<string, DrillItem>
}

/** ドリルアイテムの構築 + wowItemMap 生成を一括実行する pure 関数 */
export function buildDrilldownItems(
  filtered: DrilldownFilteredRecords,
  currentLevel: DrillLevel,
  metric: MetricKey,
  levelColorMap: Map<string, string>,
  hasPrevYear: boolean,
  hasWoW: boolean,
): DrilldownItemsResult {
  const dayItemsYoY = buildDrillItems(
    filtered.dayFiltered,
    filtered.dayFilteredYoYPrev,
    currentLevel,
    metric,
    levelColorMap,
    hasPrevYear,
  )
  const cumItemsYoY = buildDrillItems(
    filtered.cumFiltered,
    filtered.cumFilteredYoYPrev,
    currentLevel,
    metric,
    levelColorMap,
    hasPrevYear,
  )
  const dayItemsWoW = hasWoW
    ? buildDrillItems(
        filtered.dayFiltered,
        filtered.dayFilteredWoWPrev,
        currentLevel,
        metric,
        levelColorMap,
        true,
      )
    : []

  const wowItemMap = new Map<string, DrillItem>()
  for (const it of dayItemsWoW) wowItemMap.set(it.code, it)

  return { dayItemsYoY, cumItemsYoY, dayItemsWoW, wowItemMap }
}
