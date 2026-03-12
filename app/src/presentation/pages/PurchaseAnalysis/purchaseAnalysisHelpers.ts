/**
 * 仕入分析ページの共通ヘルパー
 */
import { useState, useCallback } from 'react'
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
} from '@/domain/models/PurchaseComparison'

// ── ソート ──

export type SortKey =
  | 'name'
  | 'currentCost'
  | 'prevCost'
  | 'costDiff'
  | 'costChangeRate'
  | 'currentCostShare'
  | 'costShareDiff'
  | 'currentMarkupRate'
export type SortDir = 'asc' | 'desc'

export function useSort(defaultKey: SortKey = 'currentCost') {
  const [sortKey, setSortKey] = useState<SortKey>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('desc')
      }
    },
    [sortKey],
  )

  return { sortKey, sortDir, handleSort }
}

export function sortIndicator(key: SortKey, sortKey: SortKey, sortDir: SortDir): string {
  if (key !== sortKey) return ''
  return sortDir === 'asc' ? ' ▲' : ' ▼'
}

export function sortRows<T extends SupplierComparisonRow | CategoryComparisonRow>(
  rows: readonly T[],
  key: SortKey,
  dir: SortDir,
): T[] {
  return [...rows].sort((a, b) => {
    let va: number | string
    let vb: number | string
    switch (key) {
      case 'name':
        va = 'category' in a ? a.category : 'supplierName' in a ? a.supplierName : ''
        vb = 'category' in b ? b.category : 'supplierName' in b ? b.supplierName : ''
        break
      case 'currentCost':
        va = a.currentCost
        vb = b.currentCost
        break
      case 'prevCost':
        va = a.prevCost
        vb = b.prevCost
        break
      case 'costDiff':
        va = a.costDiff
        vb = b.costDiff
        break
      case 'costChangeRate':
        va = a.costChangeRate
        vb = b.costChangeRate
        break
      case 'currentCostShare':
        va = a.currentCostShare
        vb = b.currentCostShare
        break
      case 'costShareDiff':
        va = a.costShareDiff
        vb = b.costShareDiff
        break
      case 'currentMarkupRate':
        va = a.currentMarkupRate
        vb = b.currentMarkupRate
        break
      default:
        return 0
    }
    if (typeof va === 'string' && typeof vb === 'string') {
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return dir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })
}

// ── 共通ヘルパー ──

export function diffColor(val: number): boolean | undefined {
  if (val === 0) return undefined
  return val > 0
}

export function periodLabel(range: {
  from: { year: number; month: number; day: number }
  to: { year: number; month: number; day: number }
}): string {
  const { from, to } = range
  if (from.year === to.year && from.month === to.month) {
    return `${from.year}/${from.month}/${from.day}〜${to.day}`
  }
  return `${from.year}/${from.month}/${from.day}〜${to.year}/${to.month}/${to.day}`
}

export const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
export const DOW_OPTIONS = DOW_LABELS.map((label, i) => ({ value: i, label }))
