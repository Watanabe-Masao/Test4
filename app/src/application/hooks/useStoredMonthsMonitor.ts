/**
 * IndexedDB 保存月監視フック
 *
 * DataRepository から保存済み月一覧を取得し、変化を検知して
 * 親の useReducer にディスパッチする。
 * useDuckDB の composition root から呼び出される内部フック。
 */
import { useEffect } from 'react'
import type { Dispatch } from 'react'
import type { ImportedData } from '@/domain/models/storeTypes'
import type { DataRepository } from '@/domain/repositories'
import type { DuckDBAction } from './duckdbReducer'

export function useStoredMonthsMonitor(
  repo: DataRepository | null | undefined,
  data: ImportedData | undefined,
  year: number,
  month: number,
  dispatch: Dispatch<DuckDBAction>,
): void {
  useEffect(() => {
    if (!repo) {
      dispatch({ type: 'SET_STORED_MONTHS_KEY', key: '' })
      return
    }

    let cancelled = false

    const checkStoredMonths = async () => {
      try {
        const months = await repo.listStoredMonths()
        if (cancelled) return
        const key = months.map((m) => `${m.year}-${m.month}`).join(',')
        dispatch({ type: 'SET_STORED_MONTHS_KEY', key })
      } catch {
        // IndexedDB エラーは無視（マルチ月なしで動作継続）
      }
    }

    checkStoredMonths()
    return () => {
      cancelled = true
    }
  }, [repo, data, year, month, dispatch])
}
