/**
 * DuckDB ライフサイクル管理フック
 *
 * DuckDB エンジンの初期化と ImportedData のロードを管理する。
 * data / year / month が変わるたびにテーブルをリセットし再ロードする。
 *
 * 使い方:
 * ```
 * const { isReady, conn, dataVersion } = useDuckDB(data, year, month)
 * // isReady === true なら conn を使ってクエリ可能
 * // dataVersion を useMemo の依存配列に入れることでデータ変更時の再クエリをトリガー
 * ```
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ImportedData } from '@/domain/models'
import { getDuckDBEngine } from '@/infrastructure/duckdb/engine'
import type { DuckDBEngineState } from '@/infrastructure/duckdb/engine'
import { resetTables, loadMonth } from '@/infrastructure/duckdb/dataLoader'

export interface DuckDBHookResult {
  /** エンジン初期化済み + データロード完了 + エラーなし */
  readonly isReady: boolean
  /** エンジンの状態 */
  readonly engineState: DuckDBEngineState
  /** データロード中 */
  readonly isLoading: boolean
  /** エラーメッセージ */
  readonly error: string | null
  /** データロード成功ごとにインクリメント（useMemo 依存配列用） */
  readonly dataVersion: number
  /** DuckDB コネクション（isReady=true 時のみ非 null） */
  readonly conn: AsyncDuckDBConnection | null
  /** DuckDB インスタンス */
  readonly db: AsyncDuckDB | null
}

/**
 * ImportedData のフィンガープリント（変更検知用）。
 * レコード数ベースの軽量判定。
 */
function computeFingerprint(data: ImportedData, year: number, month: number): string {
  return [
    year,
    month,
    data.classifiedSales.records.length,
    data.prevYearClassifiedSales.records.length,
    data.categoryTimeSales.records.length,
    data.prevYearCategoryTimeSales.records.length,
    data.departmentKpi.records.length,
    Object.keys(data.purchase).length,
    Object.keys(data.flowers).length,
  ].join(':')
}

export function useDuckDB(
  data: ImportedData | undefined,
  year: number,
  month: number,
): DuckDBHookResult {
  const [engineState, setEngineState] = useState<DuckDBEngineState>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [conn, setConn] = useState<AsyncDuckDBConnection | null>(null)
  const [db, setDb] = useState<AsyncDuckDB | null>(null)

  const lastFingerprint = useRef<string>('')
  const isMounted = useRef(true)

  // マウント追跡
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // エンジン初期化
  useEffect(() => {
    const engine = getDuckDBEngine()

    const unsubscribe = engine.onStateChange((state) => {
      if (isMounted.current) {
        setEngineState(state)
      }
    })

    // 現在の状態を反映
    setEngineState(engine.state)

    if (engine.state === 'idle') {
      engine.initialize().then(
        async () => {
          if (!isMounted.current) return
          try {
            const c = await engine.getConnection()
            const d = engine.getDB()
            setConn(c)
            setDb(d)
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          }
        },
        (err: unknown) => {
          if (isMounted.current) {
            setError(err instanceof Error ? err.message : String(err))
          }
        },
      )
    } else if (engine.state === 'ready') {
      engine.getConnection().then(
        (c) => {
          if (isMounted.current) {
            setConn(c)
            setDb(engine.getDB())
          }
        },
        (err: unknown) => {
          if (isMounted.current) {
            setError(err instanceof Error ? err.message : String(err))
          }
        },
      )
    }

    return unsubscribe
  }, [])

  // データロード
  const loadData = useCallback(async () => {
    if (!conn || !db || !data) return

    const fingerprint = computeFingerprint(data, year, month)
    if (fingerprint === lastFingerprint.current) return

    setIsLoading(true)
    setError(null)

    try {
      await resetTables(conn)
      await loadMonth(conn, db, data, year, month)

      if (isMounted.current) {
        lastFingerprint.current = fingerprint
        setDataVersion((v) => v + 1)
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [conn, db, data, year, month])

  useEffect(() => {
    if (engineState === 'ready' && conn && db && data) {
      loadData()
    }
  }, [engineState, conn, db, data, loadData])

  const isReady = engineState === 'ready' && !isLoading && !error && dataVersion > 0

  return {
    isReady,
    engineState,
    isLoading,
    error,
    dataVersion,
    conn: isReady ? conn : null,
    db: isReady ? db : null,
  }
}
