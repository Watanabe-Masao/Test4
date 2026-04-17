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
 * ## 共有キャッシュ + in-flight dedupe
 *
 * module-scope の WeakMap<QueryExecutor, Map<cacheKey, CacheEntry>> で結果を共有する。
 * 同一 executor + handler + input の組み合わせは、実行中 Promise を含め共有される。
 * executor 参照は dataVersion 変更時に新規生成されるため、
 * WeakMap のバケットが自然に GC されキャッシュが無効化される。
 *
 * ## Observability
 *
 * queryProfiler に handler 名・入力フィンガープリント・実行時間・stale discard を記録する。
 * DevTools の QueryProfilePanel から閲覧可能。
 *
 * @see QueryHandler  — application/queries/QueryContract.ts
 * @see QueryExecutor — application/queries/QueryPort.ts
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import type { QueryHandler, AsyncQueryResult } from '@/application/queries/QueryContract'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { queryProfiler } from '@/application/services/queryProfileService'
import { canonicalizeQueryInput } from '@/application/queries/queryInputCanonical'

/** Debounce delay to prevent rapid re-querying on cascading state updates */
const QUERY_DEBOUNCE_MS = 50

// ─── 共有キャッシュ（module-scope） ────────────────────────

interface CacheEntry {
  promise: Promise<unknown>
  result?: unknown
  error?: Error
  settled: boolean
}

/**
 * executor 参照をキーとした WeakMap。
 * dataVersion が変わると executor が新規生成されるため、
 * 旧バージョンのバケットは自動的に GC される。
 */
const queryCache = new WeakMap<QueryExecutor, Map<string, CacheEntry>>()

function getCacheBucket(executor: QueryExecutor): Map<string, CacheEntry> {
  let bucket = queryCache.get(executor)
  if (!bucket) {
    bucket = new Map()
    queryCache.set(executor, bucket)
  }
  return bucket
}

function buildCacheKey(handlerName: string, inputKey: string): string {
  return `${handlerName}:${inputKey}`
}

// ─── Hook ──────────────────────────────────────────────────

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

  // input を正規化 + JSON で安定化（INV-RUN-01: Semantic Determinism）
  const inputKey = useMemo(
    () => (input === null ? null : JSON.stringify(canonicalizeQueryInput(input))),
    [input],
  )

  // handler と input を ref で保持し、effect の依存配列を安定化
  const handlerRef = useRef(handler)
  const inputRef = useRef(input)
  useEffect(() => {
    handlerRef.current = handler
    inputRef.current = input
  })

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

    // ── キャッシュヒットチェック（debounce 前に即返却） ──
    const bucket = getCacheBucket(executor)
    const cacheKey = buildCacheKey(currentHandler.name, inputKey)
    const cached = bucket.get(cacheKey)

    if (cached?.settled && cached.result !== undefined) {
      // 完了済みキャッシュヒット → debounce せず即反映
      setData(cached.result as TOutput)
      setIsLoading(false)
      setError(null)
      return
    }

    const timerId = setTimeout(() => {
      if (cancelled) return
      setIsLoading(true)
      setError(null)

      // ── in-flight dedupe: 同一 Promise を共有 ──
      const existing = bucket.get(cacheKey)
      if (existing && !existing.settled) {
        // 実行中の Promise に相乗り
        existing.promise.then(
          (result) => {
            if (!cancelled && seq === seqRef.current) {
              setData(result as TOutput)
              setIsLoading(false)
            }
          },
          (err: unknown) => {
            if (!cancelled && seq === seqRef.current) {
              setError(err instanceof Error ? err : new Error(String(err)))
              setIsLoading(false)
            }
          },
        )
        return
      }

      if (existing?.settled && existing.result !== undefined) {
        // debounce 中にキャッシュが完了していた
        setData(existing.result as TOutput)
        setIsLoading(false)
        return
      }

      const profile = queryProfiler.start(
        `[${currentHandler.name}] ${inputKey}`,
        currentHandler.name,
      )

      const promise = executor.execute(currentHandler, currentInput)
      const entry: CacheEntry = { promise: promise as Promise<unknown>, settled: false }
      bucket.set(cacheKey, entry)

      promise.then(
        (result) => {
          entry.result = result
          entry.settled = true
          if (!cancelled && seq === seqRef.current) {
            setData(result)
            profile.end()
          } else {
            profile.discard()
          }
        },
        (err: unknown) => {
          entry.error = err instanceof Error ? err : new Error(String(err))
          entry.settled = true
          // エラー結果はキャッシュから除去（リトライ可能にする）
          bucket.delete(cacheKey)
          if (!cancelled && seq === seqRef.current) {
            setError(entry.error)
            profile.fail(err)
          } else {
            profile.discard()
          }
        },
      )

      promise.finally(() => {
        if (!cancelled && seq === seqRef.current) {
          setIsLoading(false)
        }
      })
    }, QUERY_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [executor, inputKey, executor?.dataVersion])

  return { data, isLoading, error }
}
