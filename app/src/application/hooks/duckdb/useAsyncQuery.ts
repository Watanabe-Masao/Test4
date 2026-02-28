/**
 * 汎用非同期 DuckDB クエリフック + 共通ヘルパー
 */
import { useState, useEffect, useRef } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { dateRangeToKeys } from '@/domain/models'
import type { DateRange } from '@/domain/models'

// ── 型定義 ──

export interface AsyncQueryResult<T> {
  readonly data: T | null
  readonly isLoading: boolean
  readonly error: string | null
}

// ── 汎用クエリフック ──

/**
 * 汎用非同期 DuckDB クエリフック。
 *
 * queryFn が変わるたびにクエリを再実行し、結果をステートに反映する。
 * conn が null の場合はクエリを実行せず { data: null } を返す。
 */
export function useAsyncQuery<T>(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  queryFn: ((conn: AsyncDuckDBConnection) => Promise<T>) | null,
): AsyncQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!conn || !queryFn || dataVersion === 0) {
      ++seqRef.current
      return
    }

    const seq = ++seqRef.current
    let cancelled = false

    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      setIsLoading(true)
      setError(null)
      try {
        const result = await queryFn(conn)
        if (!cancelled && seq === seqRef.current) {
          setData(result)
        }
      } catch (err: unknown) {
        if (!cancelled && seq === seqRef.current) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled && seq === seqRef.current) {
          setIsLoading(false)
        }
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [conn, dataVersion, queryFn])

  return { data, isLoading, error }
}

// ── 共通ヘルパー ──

/** DateRange → { dateFrom, dateTo } 文字列変換 */
export function toDateKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

/** Set<string> → string[] | undefined 変換 */
export function storeIdsToArray(storeIds: ReadonlySet<string>): readonly string[] | undefined {
  return storeIds.size > 0 ? [...storeIds] : undefined
}
