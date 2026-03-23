/**
 * useQueryWithHandler — QueryHandler 経由のクエリ実行フック
 *
 * Presentation 層が DuckDB hook を直接 import せずにクエリを実行するための
 * 標準経路 A（Query Access Architecture）。
 *
 * ## 使い方
 *
 * ```typescript
 * import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
 * import { dailyCumulativeHandler } from '@/application/queries'
 *
 * const { data, isLoading, error } = useQueryWithHandler(
 *   executor,
 *   dailyCumulativeHandler,
 *   input,   // BaseQueryInput & handler-specific fields
 * )
 * ```
 *
 * ## 設計意図
 *
 * - Presentation は DuckDB hook / QueryExecutor を直接呼ばない（Rule Q5）
 * - 個別 chart 専用の取得結果はこのフックで取得する（Rule Q2）
 * - loading / error の標準化、debounce、stale result の安全な破棄を統一する
 *
 * @see QueryHandler  — application/queries/QueryContract.ts
 * @see QueryExecutor — application/queries/QueryPort.ts
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import type { QueryHandler, AsyncQueryResult } from '@/application/queries/QueryContract'
import type { QueryExecutor } from '@/application/queries/QueryPort'

/** Debounce delay to prevent rapid re-querying on cascading state updates */
const QUERY_DEBOUNCE_MS = 50

/**
 * QueryHandler 経由でクエリを実行し、結果を React state で返す。
 *
 * @param executor  QueryExecutor（WidgetContext.queryExecutor 経由で取得）
 * @param handler   実行する QueryHandler
 * @param input     クエリ入力（null の場合はクエリを実行しない）
 */
export function useQueryWithHandler<TInput, TOutput>(
  executor: QueryExecutor | null,
  handler: QueryHandler<TInput, TOutput>,
  input: TInput | null,
): AsyncQueryResult<TOutput> {
  const [data, setData] = useState<TOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const seqRef = useRef(0)

  // input を JSON で安定化（依存配列で参照比較を避ける）
  const inputKey = useMemo(() => (input === null ? null : JSON.stringify(input)), [input])

  // handler と input を ref で保持し、effect の依存配列を安定化
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const inputRef = useRef(input)
  inputRef.current = input

  useEffect(() => {
    if (!executor?.isReady || inputKey === null) {
      ++seqRef.current
      return
    }

    const currentHandler = handlerRef.current
    const currentInput = inputRef.current
    if (currentInput === null) {
      ++seqRef.current
      return
    }

    const seq = ++seqRef.current
    let cancelled = false

    const timerId = setTimeout(() => {
      if (cancelled) return
      setIsLoading(true)
      setError(null)
      const run = async () => {
        try {
          const result = await executor.execute(currentHandler, currentInput)
          if (!cancelled && seq === seqRef.current) {
            setData(result)
          }
        } catch (err: unknown) {
          if (!cancelled && seq === seqRef.current) {
            setError(err instanceof Error ? err : new Error(String(err)))
          }
        } finally {
          if (!cancelled && seq === seqRef.current) {
            setIsLoading(false)
          }
        }
      }
      run()
    }, QUERY_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [executor, inputKey])

  return { data, isLoading, error }
}
