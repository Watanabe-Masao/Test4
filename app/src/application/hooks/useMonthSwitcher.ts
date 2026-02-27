/**
 * 年月切替フック
 *
 * 現在のデータを IndexedDB に保存し、指定年月のデータをロードする。
 * targetYear / targetMonth の変更は計算結果・前年比較・予算分析など
 * アプリ全体に影響するため、切替処理を一箇所に集約する。
 */
import { useCallback, useState } from 'react'
import { useAppDispatch } from '../context/AppStateContext'
import { useRepository } from '../context/useRepository'
import { useSettingsStore } from '../stores/settingsStore'
import { useDataStore } from '../stores/dataStore'
import { useUiStore } from '../stores/uiStore'
import { calculationCache } from '../services/calculationCache'
import { createEmptyImportedData } from '@/domain/models'

export interface MonthSwitcherState {
  /** 切替処理中かどうか */
  readonly isSwitching: boolean
}

export interface MonthSwitcherActions {
  /** 指定年月に切り替える */
  switchMonth: (year: number, month: number) => Promise<void>
  /** 前月に切り替える */
  goToPrevMonth: () => Promise<void>
  /** 翌月に切り替える */
  goToNextMonth: () => Promise<void>
}

export function useMonthSwitcher(): MonthSwitcherState & MonthSwitcherActions {
  const dispatch = useAppDispatch()
  const repo = useRepository()
  const [isSwitching, setIsSwitching] = useState(false)

  const switchMonth = useCallback(
    async (year: number, month: number) => {
      const settings = useSettingsStore.getState().settings
      // 同じ年月なら何もしない
      if (year === settings.targetYear && month === settings.targetMonth) return

      setIsSwitching(true)
      try {
        // 1. 現在のデータを保存
        const currentData = useDataStore.getState().data
        const hasData =
          currentData.classifiedSales.records.length > 0 ||
          Object.keys(currentData.purchase).length > 0
        if (hasData && repo.isAvailable()) {
          await repo.saveMonthlyData(currentData, settings.targetYear, settings.targetMonth)
        }

        // 2. ステートをリセット（空データ）
        useDataStore.getState().setImportedData(createEmptyImportedData())
        useDataStore.getState().setStoreResults(new Map())
        useDataStore.getState().setValidationMessages([])
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()

        // 3. 設定を更新（targetYear / targetMonth）
        dispatch({ type: 'UPDATE_SETTINGS', payload: { targetYear: year, targetMonth: month } })

        // 4. 新しい年月のデータを IndexedDB からロード
        if (repo.isAvailable()) {
          const data = await repo.loadMonthlyData(year, month)
          if (data) {
            dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
          }
        }
        // useAutoLoadPrevYear は targetYear/targetMonth の変更を検知して自動的に前年データをロードする
      } finally {
        setIsSwitching(false)
      }
    },
    [dispatch, repo],
  )

  const goToPrevMonth = useCallback(async () => {
    const { targetYear, targetMonth } = useSettingsStore.getState().settings
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear
    await switchMonth(prevYear, prevMonth)
  }, [switchMonth])

  const goToNextMonth = useCallback(async () => {
    const { targetYear, targetMonth } = useSettingsStore.getState().settings
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1
    const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear
    await switchMonth(nextYear, nextMonth)
  }, [switchMonth])

  return { isSwitching, switchMonth, goToPrevMonth, goToNextMonth }
}
