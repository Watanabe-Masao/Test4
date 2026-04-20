/**
 * useHierarchyDropdown — 部門/ライン/クラス プルダウンフィルタ
 *
 * periodFilterHooks.ts から分離。階層プルダウンの state + 集計ロジック。
 *
 * @responsibility R:state-machine
 */
import { useState, useMemo, useCallback } from 'react'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'

interface HierarchyOption {
  code: string
  name: string
  total: number
}

export interface HierarchyFilterState {
  deptCode: string
  lineCode: string
  klassCode: string
}

export interface HierarchyFilterResult extends HierarchyFilterState {
  setDeptCode: (code: string) => void
  setLineCode: (code: string) => void
  setKlassCode: (code: string) => void
  departments: HierarchyOption[]
  lines: HierarchyOption[]
  klasses: HierarchyOption[]
  applyFilter: (records: readonly CategoryLeafDailyEntry[]) => readonly CategoryLeafDailyEntry[]
}

/** 部門/ライン/クラスの絞り込みプルダウン用 hook */
export function useHierarchyDropdown(
  records: readonly CategoryLeafDailyEntry[],
  selectedStoreIds: ReadonlySet<string>,
): HierarchyFilterResult {
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const storeFiltered = useMemo(
    () =>
      selectedStoreIds.size === 0
        ? records
        : records.filter((r) => selectedStoreIds.has(r.storeId)),
    [records, selectedStoreIds],
  )

  const departments = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of storeFiltered) {
      const ex = map.get(rec.deptCode)
      if (ex) {
        ex.total += rec.totalAmount
      } else {
        map.set(rec.deptCode, {
          name: rec.deptName || rec.deptCode,
          total: rec.totalAmount,
        })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered])

  const lines = useMemo(() => {
    const filtered = deptCode
      ? storeFiltered.filter((r) => r.deptCode === deptCode)
      : storeFiltered
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of filtered) {
      const ex = map.get(rec.lineCode)
      if (ex) {
        ex.total += rec.totalAmount
      } else {
        map.set(rec.lineCode, { name: rec.lineName || rec.lineCode, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered, deptCode])

  const klasses = useMemo(() => {
    let filtered = storeFiltered
    if (deptCode) filtered = filtered.filter((r) => r.deptCode === deptCode)
    if (lineCode) filtered = filtered.filter((r) => r.lineCode === lineCode)
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of filtered) {
      const ex = map.get(rec.klassCode)
      if (ex) {
        ex.total += rec.totalAmount
      } else {
        map.set(rec.klassCode, { name: rec.klassName || rec.klassCode, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered, deptCode, lineCode])

  const applyFilter = useCallback(
    (recs: readonly CategoryLeafDailyEntry[]) => {
      let result = recs
      if (deptCode) result = result.filter((r) => r.deptCode === deptCode)
      if (lineCode) result = result.filter((r) => r.lineCode === lineCode)
      if (klassCode) result = result.filter((r) => r.klassCode === klassCode)
      return result
    },
    [deptCode, lineCode, klassCode],
  )

  const wrappedSetDept = useCallback((code: string) => {
    setDeptCode(code)
    setLineCode('')
    setKlassCode('')
  }, [])
  const wrappedSetLine = useCallback((code: string) => {
    setLineCode(code)
    setKlassCode('')
  }, [])

  return {
    deptCode,
    lineCode,
    klassCode,
    setDeptCode: wrappedSetDept,
    setLineCode: wrappedSetLine,
    setKlassCode,
    departments,
    lines,
    klasses,
    applyFilter,
  }
}
