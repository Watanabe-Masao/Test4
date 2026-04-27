/**
 * DuckDB エンジン初期化・コネクション取得フック
 *
 * getDuckDBEngine() のシングルトンを購読し、エンジン状態の変化を
 * 親の useReducer にディスパッチする。
 * useDuckDB の composition root から呼び出される内部フック。
 *
 * @responsibility R:unclassified
 */
import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import { getDuckDBEngine } from '@/infrastructure/duckdb/engine'
import type { DuckDBAction } from '@/application/hooks/duckdbReducer'

export function useEngineLifecycle(dispatch: Dispatch<DuckDBAction>): void {
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

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
  }, [dispatch])
}
