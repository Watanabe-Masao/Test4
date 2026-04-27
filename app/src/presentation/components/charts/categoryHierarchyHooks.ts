/**
 * CategoryHierarchy フック・ユーティリティ（Context から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（Provider）とフック・ユーティリティを別ファイルに分離。
 * @responsibility R:unclassified
 */
import { useContext } from 'react'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import { HierarchyContext } from './categoryHierarchyContextDef'
import type { HierarchyFilter } from './categoryHierarchyContextDef'

export type { HierarchyFilter } from './categoryHierarchyContextDef'

export function useCategoryHierarchy() {
  return useContext(HierarchyContext)
}

/** レコードを現在の階層フィルタで絞り込む */
export function filterByHierarchy(
  records: readonly CategoryLeafDailyEntry[],
  filter: HierarchyFilter,
): readonly CategoryLeafDailyEntry[] {
  if (!filter.departmentCode && !filter.lineCode) return records
  return records.filter((r) => {
    if (filter.departmentCode && r.deptCode !== filter.departmentCode) return false
    if (filter.lineCode && r.lineCode !== filter.lineCode) return false
    return true
  })
}

/** 現在のドリルダウンレベルを返す */
export function getHierarchyLevel(filter: HierarchyFilter): 'department' | 'line' | 'klass' {
  if (filter.lineCode) return 'klass'
  if (filter.departmentCode) return 'line'
  return 'department'
}
