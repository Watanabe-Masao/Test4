/**
 * DuckDB ライフサイクル管理フック（Composition Root）
 *
 * DuckDB エンジンの初期化と ImportedData のロードを管理する。
 * data / year / month が変わるたびにテーブルをリセットし再ロードする。
 *
 * 責務分割:
 * - エンジン初期化 → useEngineLifecycle
 * - 保存月監視 → useStoredMonthsMonitor
 * - 変更検知 → computeFingerprint (duckdbFingerprint)
 * - ロード直列化 → acquireMutex (loadCoordinator)
 * - ロード統合 → 本ファイル（resetTables → loadMonth → materializeSummary）
 *
 * 使い方:
 * ```
 * const repo = useRepository()
 * const { isReady, conn, dataVersion } = useDuckDB(data, year, month, repo)
 * // isReady === true なら conn を使ってクエリ可能
 * // dataVersion を useMemo の依存配列に入れることでデータ変更時の再クエリをトリガー
 * ```
 */
import { useEffect, useRef, useCallback, useReducer } from 'react'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ImportedData } from '@/domain/models/storeTypes'
import type { DataRepository } from '@/domain/repositories'
import { resetTables, loadMonth } from '@/infrastructure/duckdb/dataLoader'
import { materializeSummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { acquireMutex } from '@/infrastructure/duckdb/loadCoordinator'
import { duckdbReducer, INITIAL_DUCKDB_STATE } from './duckdbReducer'
import { computeFingerprint } from './duckdbFingerprint'
import { useEngineLifecycle } from './useEngineLifecycle'
import { useStoredMonthsMonitor } from './useStoredMonthsMonitor'

export interface DuckDBHookResult {
  /** エンジン初期化済み + データロード完了 + エラーなし */
  readonly isReady: boolean
  /** エンジンの状態 */
  readonly engineState: import('@/infrastructure/duckdb/engine').DuckDBEngineState
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
  /** ロード済み月数（当月含む） */
  readonly loadedMonthCount: number
}

export function useDuckDB(
  data: ImportedData | undefined,
  year: number,
  month: number,
  repo?: DataRepository | null,
): DuckDBHookResult {
  const [state, dispatch] = useReducer(duckdbReducer, INITIAL_DUCKDB_STATE)

  const lastFingerprint = useRef<string>('')
  const isMounted = useRef(true)

  // 世代番号: loadData 呼び出しごとにインクリメントし、
  // 古い呼び出しは各 await 後にチェックして早期 return する。
  const loadSeqRef = useRef(0)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // サブフック: エンジン初期化・コネクション取得
  useEngineLifecycle(dispatch)

  // サブフック: IndexedDB 保存月監視
  useStoredMonthsMonitor(repo, data, year, month, dispatch)

  // データロード（当月 + 過去月）
  const loadData = useCallback(async () => {
    if (!state.conn || !state.db || !data) return

    const fingerprint = computeFingerprint(data, year, month, state.storedMonthsKey)
    if (fingerprint === lastFingerprint.current) return

    // 新しい世代番号を発行。先行の loadData は次の await 後にこの値を検出して bail out する。
    const seq = ++loadSeqRef.current

    // グローバルミューテックスで全インスタンスの loadData を直列化する。
    const releaseMutex = await acquireMutex()

    // 先行待ち中に更に新しい loadData が発行された場合は bail out
    if (loadSeqRef.current !== seq || !isMounted.current) {
      releaseMutex()
      return
    }

    dispatch({ type: 'LOAD_START' })

    try {
      await resetTables(state.conn)
      if (loadSeqRef.current !== seq || !isMounted.current) return

      // 1. 当月のインメモリデータをロード
      await loadMonth(state.conn, state.db, data, year, month)
      if (loadSeqRef.current !== seq || !isMounted.current) return

      let monthCount = 1

      // 2. IndexedDB から過去月データを追記ロード
      if (repo) {
        const storedMonths = await repo.listStoredMonths()
        for (const { year: y, month: m } of storedMonths) {
          if (loadSeqRef.current !== seq || !isMounted.current) return
          // 当月はインメモリデータで既にロード済み — スキップ
          if (y === year && m === month) continue

          try {
            const historicalData = await repo.loadMonthlyData(y, m)
            if (loadSeqRef.current !== seq || !isMounted.current) return
            if (historicalData) {
              await loadMonth(state.conn, state.db, historicalData, y, m)
              if (loadSeqRef.current !== seq || !isMounted.current) return
              monthCount += 1
            }
          } catch {
            // 個別の月のロード失敗は無視して続行
            console.warn(`DuckDB: ${y}-${m} のロードに失敗（スキップ）`)
          }
        }
      }

      // 全月ロード完了後、VIEW を物理テーブルに昇格（全後続クエリが高速化）
      await materializeSummary(state.conn)
      if (loadSeqRef.current !== seq || !isMounted.current) return

      if (isMounted.current && loadSeqRef.current === seq) {
        lastFingerprint.current = fingerprint
        dispatch({ type: 'LOAD_SUCCESS', monthCount })
      }
    } catch (err) {
      if (isMounted.current && loadSeqRef.current === seq) {
        dispatch({ type: 'LOAD_ERROR', error: err instanceof Error ? err.message : String(err) })
      }
    } finally {
      releaseMutex()
      if (isMounted.current && loadSeqRef.current === seq) {
        dispatch({ type: 'LOAD_END' })
      }
    }
  }, [state.conn, state.db, data, year, month, repo, state.storedMonthsKey])

  useEffect(() => {
    if (state.engineState === 'ready' && state.conn && state.db && data) {
      loadData()
    }
  }, [state.engineState, state.conn, state.db, data, loadData])

  const isReady =
    state.engineState === 'ready' && !state.isLoading && !state.error && state.dataVersion > 0

  return {
    isReady,
    engineState: state.engineState,
    isLoading: state.isLoading,
    error: state.error,
    dataVersion: state.dataVersion,
    conn: isReady ? state.conn : null,
    db: isReady ? state.db : null,
    loadedMonthCount: state.loadedMonthCount,
  }
}
