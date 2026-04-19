/**
 * useDrilldownData — 純粋計算ロジック
 *
 * useMemo の純粋関数部分を抽出（C1: 1ファイル = 1変更理由）。
 */
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { HierarchyFilter } from '@/presentation/components/charts/categoryHierarchyHooks'
import {
  aggregateForDrill,
  COLORS,
  type DrillItem,
  type SortKey,
  type SortDir,
} from './drilldownUtils'

type DrillLevel = 'department' | 'line' | 'klass'

/** パンくずリストを構築する */
export function buildBreadcrumb(filter: HierarchyFilter): { label: string; f: HierarchyFilter }[] {
  const items: { label: string; f: HierarchyFilter }[] = [{ label: '全カテゴリ', f: {} }]
  if (filter.departmentCode) {
    items.push({
      label: filter.departmentName || filter.departmentCode,
      f: { departmentCode: filter.departmentCode, departmentName: filter.departmentName },
    })
  }
  if (filter.lineCode) {
    items.push({ label: filter.lineName || filter.lineCode, f: { ...filter } })
  }
  return items
}

/** 階層レベルに応じたカラーマップを構築する */
export function buildLevelColorMap(
  records: readonly CategoryLeafDailyEntry[],
  cumRecords: readonly CategoryLeafDailyEntry[],
  cumFiltered: readonly CategoryLeafDailyEntry[],
  dayFiltered: readonly CategoryLeafDailyEntry[],
  currentLevel: DrillLevel,
): Map<string, string> {
  const map = new Map<string, string>()
  if (currentLevel === 'department') {
    const base = cumRecords.length > 0 ? cumRecords : records
    const deptMap = aggregateForDrill(base, 'department')
    const sorted = [...deptMap.values()].sort((a, b) => b.amount - a.amount)
    sorted.forEach((d, i) => map.set(d.code, COLORS[i % COLORS.length]))
  } else {
    const cumMap = aggregateForDrill(cumFiltered, currentLevel)
    const cumSorted = [...cumMap.values()].sort((a, b) => b.amount - a.amount)
    cumSorted.forEach((it, i) => map.set(it.code, COLORS[i % COLORS.length]))
    const dayMap = aggregateForDrill(dayFiltered, currentLevel)
    for (const it of dayMap.values()) {
      if (!map.has(it.code)) map.set(it.code, COLORS[map.size % COLORS.length])
    }
  }
  return map
}

/** ドリルアイテムをソートする */
export function sortDrillItems(
  items: readonly DrillItem[],
  sortKey: SortKey,
  sortDir: SortDir,
  metric: string,
  primaryAmt: (it: DrillItem) => number,
  primaryQty: (it: DrillItem) => number,
): DrillItem[] {
  const arr = [...items]
  arr.sort((a, b) => {
    let d = 0
    switch (sortKey) {
      case 'amount':
        d = metric === 'amount' ? primaryAmt(a) - primaryAmt(b) : primaryQty(a) - primaryQty(b)
        break
      case 'quantity':
        d = primaryQty(a) - primaryQty(b)
        break
      case 'pct':
        d = a.pct - b.pct
        break
      case 'name':
        d = a.name.localeCompare(b.name, 'ja')
        break
      case 'yoyRatio':
        d = (a.yoyRatio ?? 0) - (b.yoyRatio ?? 0)
        break
    }
    return sortDir === 'desc' ? -d : d
  })
  return arr
}
