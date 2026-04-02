/**
 * 天気 ETRN フォールバックフック
 *
 * DuckDB に天気データがない場合、ETRN API から取得→DuckDB 永続化→再クエリをトリガーする。
 * useTimeSlotData から分離（G5 useState ≤6 / 行数 ≤300 準拠）。
 *
 * @layer Application — データ取得 sub-hook
 */
import { useEffect, useRef } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { StoreLocation } from '@/domain/models/record'
import { splitDateRangeByMonth } from '@/domain/models/calendar'
import { loadEtrnHourlyForStore } from '@/application/usecases/weather/WeatherLoadService'
import type { WeatherPersister } from '@/application/queries/weather'
import { useWeatherAdapter } from '@/application/context/useWeatherAdapter'

/**
 * DuckDB 天気データが空の場合に ETRN フォールバックを実行する。
 *
 * @returns weatherRetry — ETRN 永続化成功時にインクリメントされるカウンタ。
 *          呼び出し元の input に含めることで再クエリをトリガーする。
 */
export function useWeatherFallback(params: {
  /** DuckDB クエリが完了し、データが空だったか（null = クエリ未完了） */
  readonly duckQueryEmpty: boolean | null
  readonly storeId: string
  readonly location: StoreLocation | undefined
  readonly dateRange: DateRange
  readonly dateFrom: string
  readonly dateTo: string
  /** 天気データ永続化コールバック（conn/db をクロージャで閉じたもの） */
  readonly persist?: WeatherPersister | null
  /** ETRN 永続化成功後に呼ばれるコールバック（再クエリトリガー用） */
  readonly onRetry: () => void
}): void {
  const weather = useWeatherAdapter()
  const { duckQueryEmpty, storeId, location, dateRange, dateFrom, dateTo, persist, onRetry } =
    params
  const fetchedKeyRef = useRef('')

  useEffect(() => {
    // duckQueryEmpty が null (クエリ未完了) または false (データあり) なら何もしない
    if (duckQueryEmpty !== true || !location || !storeId || !persist) return
    const fetchKey = `${storeId}|${dateFrom}|${dateTo}`
    if (fetchedKeyRef.current === fetchKey) return

    let cancelled = false
    const chunks = splitDateRangeByMonth(dateRange.from, dateRange.to)

    Promise.all(
      chunks.map((chunk) =>
        loadEtrnHourlyForStore(weather, storeId, location, chunk.year, chunk.month, chunk.days),
      ),
    )
      .then(async (results) => {
        if (cancelled) return
        const allHourly = results.flatMap((r) => r.hourly)
        if (allHourly.length === 0) return
        fetchedKeyRef.current = fetchKey

        try {
          await persist(allHourly, storeId)
          if (!cancelled) onRetry()
        } catch {
          // 永続化失敗は無視
        }
      })
      .catch((err: unknown) => {
        console.warn('[useWeatherFallback] ETRN fallback failed:', err)
      })

    return () => {
      cancelled = true
    }
  }, [weather, duckQueryEmpty, location, storeId, dateFrom, dateTo, dateRange, persist, onRetry])
}
