import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import type { CategoryTimeSalesRecord } from '@/domain/models'

/** 階層ドリルダウンのフィルタ状態 */
export interface HierarchyFilter {
  departmentCode?: string
  departmentName?: string
  lineCode?: string
  lineName?: string
}

interface HierarchyContextValue {
  filter: HierarchyFilter
  setFilter: (filter: HierarchyFilter) => void
}

const HierarchyContext = createContext<HierarchyContextValue>({
  filter: {},
  setFilter: () => {},
})

export function CategoryHierarchyProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const value = useMemo(() => ({ filter, setFilter }), [filter])
  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>
}

export function useCategoryHierarchy() {
  return useContext(HierarchyContext)
}

/** レコードを現在の階層フィルタで絞り込む */
export function filterByHierarchy(
  records: readonly CategoryTimeSalesRecord[],
  filter: HierarchyFilter,
): readonly CategoryTimeSalesRecord[] {
  if (!filter.departmentCode && !filter.lineCode) return records
  return records.filter((r) => {
    if (filter.departmentCode && r.department.code !== filter.departmentCode) return false
    if (filter.lineCode && r.line.code !== filter.lineCode) return false
    return true
  })
}

/** 現在のドリルダウンレベルを返す */
export function getHierarchyLevel(filter: HierarchyFilter): 'department' | 'line' | 'klass' {
  if (filter.lineCode) return 'klass'
  if (filter.departmentCode) return 'line'
  return 'department'
}
