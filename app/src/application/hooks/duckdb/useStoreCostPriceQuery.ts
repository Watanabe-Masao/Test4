/**
 * 前年店舗別仕入額クエリフック
 *
 * queryStoreCostPrice を application 層でラップし、
 * Presentation → Infrastructure の直接依存を解消する。
 * @responsibility R:query-exec
 */
import { useState, useEffect, useRef } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import { dateRangeToKeys } from '@/domain/models/calendar'
import { queryStoreCostPrice } from '@/infrastructure/duckdb/queries/purchaseComparison'

/** 店舗別原価/売価マップ */
export type StoreCostPriceMap = ReadonlyMap<string, { cost: number; price: number }>

export interface StoreCostPriceQueryResult {
  readonly data: StoreCostPriceMap | undefined
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * 前年店舗別仕入額を DuckDB から取得する。
 *
 * 額で保持し、率の算出は domain/calculations に委譲する（@guard B3）。
 */
export function useStoreCostPriceQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | null,
): StoreCostPriceQueryResult {
  const [data, setData] = useState<StoreCostPriceMap | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!conn || !dateRange || dataVersion === 0) {
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
        const rows = await queryStoreCostPrice(conn, fromKey, toKey)
        if (!cancelled && seq === seqRef.current) {
          const map = new Map<string, { cost: number; price: number }>()
          for (const r of rows) {
            map.set(r.storeId, { cost: r.totalCost, price: r.totalPrice })
          }
          setData(map)
          setIsLoading(false)
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.warn('[useStoreCostPriceQuery] DuckDB query failed:', err)
        if (!cancelled && seq === seqRef.current) {
          setError(err)
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [conn, dataVersion, dateRange])

  return { data, isLoading, error }
}
