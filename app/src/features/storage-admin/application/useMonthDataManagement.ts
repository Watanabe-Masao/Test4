/**
 * useMonthDataManagement — StorageManagementTab のデータ管理状態
 *
 * useState 5 個 + 関連 useCallback を集約（G5: useState ≤ 8 準拠）。
 */
import { useState, useCallback, useEffect } from 'react'
import { useStorageAdmin } from '@/application/hooks/data'
import type { MonthEntry } from '../ui/StorageDataViewers.types'

export function useMonthDataManagement() {
  const { listMonths, getDataSummary, deleteMonth } = useStorageAdmin()

  const [months, setMonths] = useState<MonthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{ year: number; month: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const storedMonths = await listMonths()
      const entries: MonthEntry[] = []
      for (const { year, month } of storedMonths) {
        const summary = await getDataSummary(year, month)
        const totalRecords = summary.reduce((s, d) => s + d.recordCount, 0)
        const dataTypeCount = summary.filter((d) => d.recordCount > 0).length
        entries.push({ year, month, summary, totalRecords, dataTypeCount })
      }
      setMonths(entries)
    } catch {
      setMonths([])
    } finally {
      setLoading(false)
    }
  }, [listMonths, getDataSummary])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleExpand = useCallback((key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMonth(deleteTarget.year, deleteTarget.month)
      setDeleteTarget(null)
      await loadData()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadData, deleteMonth])

  return {
    months,
    loading,
    expandedMonths,
    deleteTarget,
    deleting,
    loadData,
    toggleExpand,
    setDeleteTarget,
    handleDelete,
  }
}
