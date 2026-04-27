/**
 * 店舗日別仕入額クエリフック
 *
 * queryStoreDailyMarkupRate を application 層でラップし、
 * Presentation → Infrastructure の直接依存を解消する。
 *
 * 返すのは日別の原価/売価（額）。
 * 率の算出は domain/calculations に委譲する（@guard B3）。
 * @responsibility R:unclassified
 */
import { useState, useEffect, useRef } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import { dateRangeToKeys } from '@/domain/models/calendar'
import { queryStoreDailyMarkupRate } from '@/infrastructure/duckdb/queries/purchaseComparison'

/** 日別原価/売価マップ */
export type DailyMarkupCostPriceMap = ReadonlyMap<number, { totalCost: number; totalPrice: number }>

export interface StoreDailyMarkupRateQueryResult {
  readonly data: DailyMarkupCostPriceMap
  readonly queryStoreId: string | null
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * 指定店舗の日別仕入額を DuckDB から取得する。
 *
 * storeId が null の場合はクエリを実行しない。
 */
export function useStoreDailyMarkupRateQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | null,
  storeId: string | null,
): StoreDailyMarkupRateQueryResult {
  const [state, setState] = useState<{
    data: DailyMarkupCostPriceMap
    queryStoreId: string | null
  }>({ data: new Map(), queryStoreId: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!conn || !dateRange || !storeId || dataVersion === 0) {
      ++seqRef.current
      return
    }

    const seq = ++seqRef.current
    let cancelled = false
    const { fromKey, toKey } = dateRangeToKeys(dateRange)

    ;(async () => {
      setIsLoading(true)
      setError(undefined)
      try {
        const allRows = await queryStoreDailyMarkupRate(conn, fromKey, toKey, [storeId])
        if (cancelled || seq !== seqRef.current) return

        const byDay = new Map<number, { totalCost: number; totalPrice: number }>()
        for (const r of allRows) {
          const existing = byDay.get(r.day)
          if (existing) {
            existing.totalCost += r.totalCost
            existing.totalPrice += r.totalPrice
          } else {
            byDay.set(r.day, { totalCost: r.totalCost, totalPrice: r.totalPrice })
          }
        }
        setState({ data: byDay, queryStoreId: storeId })
        setIsLoading(false)
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.warn('[useStoreDailyMarkupRateQuery] DuckDB query failed:', err)
        if (!cancelled && seq === seqRef.current) {
          setError(err)
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [conn, dataVersion, dateRange, storeId])

  return { ...state, isLoading, error }
}
