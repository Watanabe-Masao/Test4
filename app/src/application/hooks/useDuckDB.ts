/**
 * DuckDB ライフサイクル管理フック
 *
 * DuckDB エンジンの初期化と ImportedData のロードを管理する。
 * data / year / month が変わるたびにテーブルをリセットし再ロードする。
 *
 * マルチ月対応:
 * repo を渡すと IndexedDB に保存された過去月データも自動でロードする。
 * 全月のデータが同一テーブルに格納されるため、月跨ぎクエリが可能になる。
 *
 * 競合条件対策:
 * useAutoLoadPrevYear が prevYear データを設定すると data が変化し loadData が
 * 再生成される。先行の loadData がまだ実行中の場合、世代番号（loadSeqRef）で
 * 古い呼び出しを無効化し、最新データのみがロードされることを保証する。
 * これにより二重 INSERT（データ重複）を防ぐ。
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
import { getDuckDBEngine } from '@/infrastructure/duckdb/engine'
import { resetTables, loadMonth } from '@/infrastructure/duckdb/dataLoader'
import { materializeSummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { duckdbReducer, INITIAL_DUCKDB_STATE } from './duckdbReducer'

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

/**
 * ImportedData のフィンガープリント（変更検知用）。
 * レコード数ベースの軽量判定。storedMonthsKey で過去月の増減も検知する。
 */
function computeFingerprint(
  data: ImportedData,
  year: number,
  month: number,
  storedMonthsKey: string,
): string {
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
    data.stores.size,
    data.budget.size,
    data.settings.size,
    storedMonthsKey,
  ].join(':')
}

// グローバルミューテックス: 全 useDuckDB インスタンスの loadData を直列化する。
// 各インスタンスが同一の DuckDB コネクションを共有するため、
// インスタンスごとの mutex では resetTables/loadMonth のインターリーブを防げない。
let globalLoadMutex: Promise<void> = Promise.resolve()

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
  // これにより useAutoLoadPrevYear の data 変更で再トリガーされた新しい loadData が
  // 古い loadData の部分的 INSERT と競合しない。
  const loadSeqRef = useRef(0)

  // マウント追跡
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // IndexedDB の保存月一覧を監視（data/year/month 変更時に再チェック）
  useEffect(() => {
    if (!repo) {
      dispatch({ type: 'SET_STORED_MONTHS_KEY', key: '' })
      return
    }

    let cancelled = false

    const checkStoredMonths = async () => {
      try {
        const months = await repo.listStoredMonths()
        if (cancelled) return
        const key = months.map((m) => `${m.year}-${m.month}`).join(',')
        dispatch({ type: 'SET_STORED_MONTHS_KEY', key })
      } catch {
        // IndexedDB エラーは無視（マルチ月なしで動作継続）
      }
    }

    checkStoredMonths()
    return () => {
      cancelled = true
    }
  }, [repo, data, year, month])

  // エンジン初期化
  useEffect(() => {
    const engine = getDuckDBEngine()

    const unsubscribe = engine.onStateChange((engineState) => {
      if (isMounted.current) {
        dispatch({ type: 'SET_ENGINE_STATE', engineState })
      }
    })

    // 現在の状態を反映
    dispatch({ type: 'SET_ENGINE_STATE', engineState: engine.state })

    if (engine.state === 'idle') {
      engine.initialize().then(
        async () => {
          if (!isMounted.current) return
          try {
            const c = await engine.getConnection()
            const d = engine.getDB()
            dispatch({ type: 'SET_CONN_DB', conn: c, db: d })
          } catch (err) {
            dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) })
          }
        },
        (err: unknown) => {
          if (isMounted.current) {
            dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) })
          }
        },
      )
    } else if (engine.state === 'ready') {
      engine.getConnection().then(
        (c) => {
          if (isMounted.current) {
            dispatch({ type: 'SET_CONN_DB', conn: c, db: engine.getDB() })
          }
        },
        (err: unknown) => {
          if (isMounted.current) {
            dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) })
          }
        },
      )
    }

    return unsubscribe
  }, [])

  // データロード（当月 + 過去月）
  const loadData = useCallback(async () => {
    if (!state.conn || !state.db || !data) return

    const fingerprint = computeFingerprint(data, year, month, state.storedMonthsKey)
    if (fingerprint === lastFingerprint.current) return

    // 新しい世代番号を発行。先行の loadData は次の await 後にこの値を検出して bail out する。
    const seq = ++loadSeqRef.current

    // グローバルミューテックスで全インスタンスの loadData を直列化する。
    // 世代番号だけでは resetTables の DROP → CREATE 途中に別インスタンスの loadData が
    // 割り込むことを防げない（SQL がインターリーブする）。
    const prevLoad = globalLoadMutex
    let releaseMutex: () => void
    globalLoadMutex = new Promise<void>((resolve) => {
      releaseMutex = resolve
    })

    try {
      await prevLoad
    } catch {
      // 先行の loadData のエラーは無視（自身のロードに影響しない）
    }

    // 先行待ち中に更に新しい loadData が発行された場合は bail out
    if (loadSeqRef.current !== seq || !isMounted.current) {
      releaseMutex!()
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
      releaseMutex!()
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
