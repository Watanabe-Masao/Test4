/**
 * 年月切替フック
 *
 * 現在のデータを IndexedDB に保存し、指定年月のデータをロードする。
 * targetYear / targetMonth の変更は計算結果・前年比較・予算分析など
 * アプリ全体に影響するため、切替処理を一箇所に集約する。
 */
import { useCallback, useState } from 'react'
import { useRepository } from '../context/useRepository'
import { useSettingsStore } from '../stores/settingsStore'
import { executeMonthSwitch } from '../services/monthSwitchSequence'

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
  const repo = useRepository()
  const [isSwitching, setIsSwitching] = useState(false)

  const switchMonth = useCallback(
    async (year: number, month: number) => {
      const settings = useSettingsStore.getState().settings
      // 同じ年月なら何もしない
      if (year === settings.targetYear && month === settings.targetMonth) return

      setIsSwitching(true)
      try {
        await executeMonthSwitch(repo, year, month)
        // useLoadComparisonData は ComparisonScope の変化を検知して自動的に前年データをロードする
      } finally {
        setIsSwitching(false)
      }
    },
    [repo],
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
