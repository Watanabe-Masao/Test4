/**
 * useWeatherTriple — 3ヶ月天気データ取得（前月+当月+翌月）
 *
 * 天気ページの連続スクロール用。前後月のデータをプリロードし、
 * 結合した DailyWeatherSummary[] を返す。
 *
 * 月跨ぎ計算（month±1, year±1）は application 層に閉じる。
 * comparisonScopeGuard 対応 — presentation で year-1 を直接計算しない。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { useWeatherData } from './useWeather'

/** 前月の年月を返す */
function prevYearMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1]
}

/** 翌月の年月を返す */
function nextYearMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1]
}

export interface MonthBoundaries {
  /** 前月のデータ件数 */
  readonly prevCount: number
  /** 当月のデータ件数 */
  readonly curCount: number
  /** 翌月のデータ件数 */
  readonly nextCount: number
}

export interface WeatherTripleResult {
  /** 3ヶ月結合データ（前月+当月+翌月） */
  readonly combined: readonly DailyWeatherSummary[]
  /** 前年3ヶ月結合データ */
  readonly prevYearCombined: readonly DailyWeatherSummary[]
  /** 月区切り位置 */
  readonly boundaries: MonthBoundaries
  /** 当月データのみ */
  readonly currentMonthDaily: readonly DailyWeatherSummary[]
  /** いずれかがロード中 */
  readonly isLoading: boolean
  /** 再取得 */
  readonly reload: () => void
}

export function useWeatherTriple(
  year: number,
  month: number,
  storeId: string,
): WeatherTripleResult {
  const [py, pm] = prevYearMonth(year, month)
  const [ny, nm] = nextYearMonth(year, month)

  // 当年3ヶ月
  const prev = useWeatherData(py, pm, storeId)
  const cur = useWeatherData(year, month, storeId)
  const next = useWeatherData(ny, nm, storeId)

  // 前年3ヶ月
  const prevPY = useWeatherData(py - 1, pm, storeId)
  const curPY = useWeatherData(year - 1, month, storeId)
  const nextPY = useWeatherData(ny - 1, nm, storeId)

  const combined = useMemo(
    () => [...prev.daily, ...cur.daily, ...next.daily],
    [prev.daily, cur.daily, next.daily],
  )

  const prevYearCombined = useMemo(
    () => [...prevPY.daily, ...curPY.daily, ...nextPY.daily],
    [prevPY.daily, curPY.daily, nextPY.daily],
  )

  const boundaries = useMemo<MonthBoundaries>(
    () => ({
      prevCount: prev.daily.length,
      curCount: cur.daily.length,
      nextCount: next.daily.length,
    }),
    [prev.daily.length, cur.daily.length, next.daily.length],
  )

  const isLoading = prev.isLoading || cur.isLoading || next.isLoading

  return {
    combined,
    prevYearCombined,
    boundaries,
    currentMonthDaily: cur.daily,
    isLoading,
    reload: cur.reload,
  }
}
