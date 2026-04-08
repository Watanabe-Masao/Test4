/**
 * useWeatherDaySelection — 天気ページの日選択・ナビゲーション状態
 *
 * WeatherPage.tsx から抽出。selectedDays/selectedDows の状態管理と
 * 日選択・月ナビゲーションのハンドラを集約。
 *
 * @responsibility R:state-machine
 */
import { useState, useCallback, useMemo } from 'react'
import type { DailyWeatherSummary } from '@/domain/models/record'

export function useWeatherDaySelection(
  daily: readonly DailyWeatherSummary[],
  combined: readonly DailyWeatherSummary[],
  year: number,
  month: number,
  setYear: React.Dispatch<React.SetStateAction<number>>,
  setMonth: React.Dispatch<React.SetStateAction<number>>,
) {
  const [selectedDays, setSelectedDays] = useState<ReadonlySet<string>>(new Set())
  const [selectedDows, setSelectedDows] = useState<number[]>([])

  // 曜日フィルタ（plain function — useCallback 不要）
  const handleDowChange = (dows: number[]) => setSelectedDows(dows)

  // 曜日フィルタ適用済み daily
  const filteredDaily = useMemo(() => {
    if (selectedDows.length === 0) return daily
    return daily.filter((d) => {
      const dayNum = Number(d.dateKey.split('-')[2])
      const dow = new Date(year, month - 1, dayNum).getDay()
      return selectedDows.includes(dow)
    })
  }, [daily, selectedDows, year, month])

  // 月ナビ
  const goPrev = useCallback(() => {
    setSelectedDays(new Set())
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1)
        return 12
      }
      return m - 1
    })
  }, [setYear, setMonth])

  const goNext = useCallback(() => {
    setSelectedDays(new Set())
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1)
        return 1
      }
      return m + 1
    })
  }, [setYear, setMonth])

  const handleMonthScroll = useCallback(
    (direction: -1 | 1) => {
      setSelectedDays(new Set())
      if (direction === -1) goPrev()
      else goNext()
    },
    [goPrev, goNext],
  )

  // シングルクリック → トグル選択
  const handleChartDayClick = useCallback((dateKey: string) => {
    setSelectedDays((prev) => {
      if (prev.size === 1 && prev.has(dateKey)) return new Set()
      return new Set([dateKey])
    })
  }, [])

  // ドラッグ範囲選択
  const handleDayRangeSelect = useCallback(
    (startIdx: number, endIdx: number) => {
      const allDaily = combined.length > 0 ? combined : daily
      const next = new Set<string>()
      for (let i = startIdx; i <= endIdx && i < allDaily.length; i++) {
        next.add(allDaily[i].dateKey)
      }
      setSelectedDays(next)
    },
    [combined, daily],
  )

  // 選択日の日番号セット
  const selectedDayNumbers = useMemo(() => {
    const nums = new Set<number>()
    for (const dk of selectedDays) nums.add(Number(dk.split('-')[2]))
    return nums
  }, [selectedDays])

  return {
    selectedDays,
    setSelectedDays,
    selectedDows,
    handleDowChange,
    filteredDaily,
    goPrev,
    goNext,
    handleMonthScroll,
    handleChartDayClick,
    handleDayRangeSelect,
    selectedDayNumbers,
  }
}
