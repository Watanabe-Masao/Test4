/**
 * 前年天気データフック
 *
 * 比較期間の天気データを取得する。同曜日比較で月跨ぎする場合、
 * from 月と to 月の両方を取得して結合する。
 *
 * useUnifiedWidgetContext から分離した天気サブシステム。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { useWeatherData } from '@/application/hooks/useWeather'

interface PrevYearWeatherParams {
  readonly prevYearDateRange: DateRange | undefined
  readonly targetYear: number
  readonly targetMonth: number
  readonly weatherStoreId: string
}

/**
 * 前年比較期間の天気データを取得する。
 *
 * 月跨ぎの場合（同曜日比較で from.month !== to.month）は
 * 2つの月のデータを結合して返す。
 */
export function usePrevYearWeather(params: PrevYearWeatherParams): readonly DailyWeatherSummary[] {
  const { prevYearDateRange, targetYear, targetMonth, weatherStoreId } = params

  // 前年期間の月情報を計算（月跨ぎ検出）
  const prevYearMonths = useMemo(() => {
    if (!prevYearDateRange) return null
    const from = { year: prevYearDateRange.from.year, month: prevYearDateRange.from.month }
    const to = { year: prevYearDateRange.to.year, month: prevYearDateRange.to.month }
    const spansTwoMonths = from.year !== to.year || from.month !== to.month
    return { from, to: spansTwoMonths ? to : null }
  }, [prevYearDateRange])

  // Hook は条件付き呼び出し不可のため、prevYearMonths が null なら当年月を渡す（結果は無視）
  const prevFromYear = prevYearMonths?.from.year ?? targetYear
  const prevFromMonth = prevYearMonths?.from.month ?? targetMonth
  const { daily: prevYearWeatherBase } = useWeatherData(prevFromYear, prevFromMonth, weatherStoreId)
  const overflowYear = prevYearMonths?.to?.year ?? prevFromYear
  const overflowMonth = prevYearMonths?.to?.month ?? prevFromMonth
  const { daily: prevYearWeatherOverflow } = useWeatherData(
    overflowYear,
    overflowMonth,
    weatherStoreId,
  )

  return useMemo(() => {
    if (!prevYearMonths) return [] as readonly DailyWeatherSummary[]
    return prevYearMonths.to
      ? ([...prevYearWeatherBase, ...prevYearWeatherOverflow] as const)
      : prevYearWeatherBase
  }, [prevYearWeatherBase, prevYearWeatherOverflow, prevYearMonths])
}
