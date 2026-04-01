/**
 * DuckDB ライフサイクル管理フック（Composition Root）
 *
 * DuckDB エンジンの初期化と ImportedData のロードを管理する。
 * data / year / month が変わるたびに差分ロードで必要な月のみ更新する。
 *
 * 責務分割:
 * - エンジン初期化 → useEngineLifecycle
 * - 保存月監視 → useStoredMonthsMonitor
 * - 変更検知 → computeFingerprint / computeMonthFingerprint (duckdbFingerprint)
 * - ロード直列化 → acquireMutex (loadCoordinator)
 * - ロード統合 → 本ファイル（差分: deleteMonth → loadMonth → materializeSummary）
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
import type { DataRepository } from '@/domain/repositories'
import { useDataStore } from '@/application/stores/dataStore'
import { resetTables, loadMonth } from '@/infrastructure/duckdb/dataLoader'
import { deleteMonth, deletePrevYearMonth } from '@/infrastructure/duckdb/deletePolicy'
import { materializeSummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { acquireMutex } from '@/infrastructure/duckdb/loadCoordinator'
import { toLegacyImportedData } from '@/domain/models/monthlyDataAdapter'
import { duckdbReducer, INITIAL_DUCKDB_STATE } from './duckdbReducer'
import { computeFingerprint, computeMonthFingerprint } from './duckdbFingerprint'
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

/** 月キー生成 */
function monthKey(y: number, m: number): string {
  return `${y}-${m}`
}

export function useDuckDB(
  year: number,
  month: number,
  repo?: DataRepository | null,
): DuckDBHookResult {
  const [state, dispatch] = useReducer(duckdbReducer, INITIAL_DUCKDB_STATE)
  const data = useDataStore((s) => s.data)
  const prevYear = useDataStore((s) => s.appData.prevYear)

  const lastFingerprint = useRef<string>('')
  const isMounted = useRef(true)

  // 世代番号: loadData 呼び出しごとにインクリメントし、
  // 古い呼び出しは各 await 後にチェックして早期 return する。
  const loadSeqRef = useRef(0)

  // 差分ロード用: ロード済み月と各月のフィンガープリント
  const loadedMonthsRef = useRef<Map<string, string>>(new Map())
  // 初回ロード済みフラグ（初回は resetTables → フルロード）
  const initialLoadDone = useRef(false)

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

  // データロード（当月 + 過去月 — 差分ロード対応）
  const loadData = useCallback(async () => {
    if (!state.conn || !state.db || !data) return

    const fingerprint = computeFingerprint(data, year, month, state.storedMonthsKey, prevYear)
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
      const isStale = () => loadSeqRef.current !== seq || !isMounted.current
      let anyChanged = false

      if (!initialLoadDone.current) {
        // ── 初回: 全テーブルリセット → フルロード ──
        await resetTables(state.conn)
        if (isStale()) return
        loadedMonthsRef.current.clear()
        anyChanged = true

        await loadMonth(state.conn, state.db, data, year, month)
        if (isStale()) return
        loadedMonthsRef.current.set(monthKey(year, month), computeMonthFingerprint(data))

        if (repo) {
          const storedMonths = await repo.listStoredMonths()
          for (const { year: y, month: m } of storedMonths) {
            if (isStale()) return
            if (y === year && m === month) continue
            try {
              const historicalData = await repo.loadMonthlyData(y, m)
              if (isStale()) return
              if (historicalData) {
                const legacyData = toLegacyImportedData({ current: historicalData, prevYear: null })
                await loadMonth(state.conn, state.db, legacyData, y, m)
                if (isStale()) return
                loadedMonthsRef.current.set(monthKey(y, m), computeMonthFingerprint(historicalData))
              }
            } catch {
              console.warn(`DuckDB: ${y}-${m} のロードに失敗（スキップ）`)
            }
          }
        }

        initialLoadDone.current = true
      } else {
        // ── 差分ロード: 変更された月のみ delete → insert ──
        const currentMonthFp = computeMonthFingerprint(data)
        const curKey = monthKey(year, month)

        // 当月: フィンガープリントが変わったら再ロード
        if (loadedMonthsRef.current.get(curKey) !== currentMonthFp) {
          await deleteMonth(state.conn, year, month)
          await deletePrevYearMonth(state.conn, year, month)
          if (isStale()) return
          await loadMonth(state.conn, state.db, data, year, month)
          if (isStale()) return
          loadedMonthsRef.current.set(curKey, currentMonthFp)
          anyChanged = true
        }

        // 過去月: 追加・変更があれば差分ロード
        if (repo) {
          const storedMonths = await repo.listStoredMonths()
          const desiredKeys = new Set(storedMonths.map(({ year: y, month: m }) => monthKey(y, m)))
          desiredKeys.add(curKey) // 当月は必ず維持

          // 不要になった月を削除
          for (const key of loadedMonthsRef.current.keys()) {
            if (!desiredKeys.has(key)) {
              const [y, m] = key.split('-').map(Number)
              await deleteMonth(state.conn, y, m)
              await deletePrevYearMonth(state.conn, y, m)
              if (isStale()) return
              loadedMonthsRef.current.delete(key)
              anyChanged = true
            }
          }

          // 新規・変更月をロード
          for (const { year: y, month: m } of storedMonths) {
            if (isStale()) return
            if (y === year && m === month) continue
            const key = monthKey(y, m)
            if (loadedMonthsRef.current.has(key)) continue // 変更なし → スキップ

            try {
              const historicalData = await repo.loadMonthlyData(y, m)
              if (isStale()) return
              if (historicalData) {
                const legacyData = toLegacyImportedData({ current: historicalData, prevYear: null })
                await loadMonth(state.conn, state.db, legacyData, y, m)
                if (isStale()) return
                loadedMonthsRef.current.set(key, computeMonthFingerprint(historicalData))
                anyChanged = true
              }
            } catch {
              console.warn(`DuckDB: ${y}-${m} のロードに失敗（スキップ）`)
            }
          }
        }
      }

      // ── VIEW 物理化: 変更があった場合のみ ──
      if (anyChanged) {
        await materializeSummary(state.conn)
        if (isStale()) return
      }

      if (isMounted.current && loadSeqRef.current === seq) {
        lastFingerprint.current = fingerprint
        dispatch({ type: 'LOAD_SUCCESS', monthCount: loadedMonthsRef.current.size })
      }
    } catch (err) {
      if (isMounted.current && loadSeqRef.current === seq) {
        dispatch({ type: 'LOAD_ERROR', error: err instanceof Error ? err.message : String(err) })
        // 差分ロード中のエラー → 次回は初回フルロードにフォールバック
        initialLoadDone.current = false
        loadedMonthsRef.current.clear()
      }
    } finally {
      releaseMutex()
      if (isMounted.current && loadSeqRef.current === seq) {
        dispatch({ type: 'LOAD_END' })
      }
    }
  }, [state.conn, state.db, data, year, month, repo, state.storedMonthsKey, prevYear])

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
